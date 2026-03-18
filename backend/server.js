// MUST BE AT THE VERY TOP
process.env.YTDL_NO_UPDATE = '1';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');
const { spawn } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

const HF_TOKEN = process.env['access-token'];

// Use the smaller, faster whisper model for reliability
const HF_MODEL_URL = 'https://api-inference.huggingface.co/models/openai/whisper-small';

// Realistic browser headers to avoid bot detection
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 1: /captions
// Fetches native YouTube captions (auto-generated or manual) for the full video.
// This covers the entire video duration — not just 5 minutes.
// ──────────────────────────────────────────────────────────────────────────────
app.post('/captions', async (req, res) => {
  try {
    const { videoId } = req.body;
    if (!videoId) return res.status(400).json({ error: 'videoId is required' });

    console.log(`\n--- CAPTIONS REQUEST: ${videoId} ---`);

    // 1. Get Video Title via yt-dlp
    let videoTitle = 'YouTube Video';
    try {
      const { stdout } = await execPromise(`yt-dlp --get-title https://www.youtube.com/watch?v=${videoId}`);
      videoTitle = stdout.trim();
    } catch (e) {
      console.log('[BACKEND] Could not get title, using default.');
    }

    // 2. Fetch video page to find caption tracks
    const pageRes = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: BROWSER_HEADERS,
    });
    const html = pageRes.data;

    // 3. Extract the captions object from page data
    const match = html.match(/"captions":\s*(\{.*?\})\s*,\s*"videoDetails"/);
    if (!match) {
      console.log('[BACKEND] No captions object found in HTML.');
      return res.status(404).json({ error: 'No captions found for this video.' });
    }

    const captions = JSON.parse(match[1]);
    const renderer = captions.playerCaptionsTracklistRenderer;
    const tracks = renderer?.captionTracks || [];

    if (!tracks.length) {
      console.log('[BACKEND] No caption tracks available.');
      return res.status(404).json({ error: 'No caption tracks available.' });
    }

    // 3. Robust English track selection (en, en-US, en-GB, etc.)
    const track =
      tracks.find((t) => t.languageCode?.startsWith('en') && t.kind === 'asr') ||
      tracks.find((t) => t.languageCode?.startsWith('en') && !t.kind) ||
      tracks.find((t) => t.languageCode?.startsWith('en')) ||
      tracks.find((t) => t.kind === 'asr') ||
      tracks[0];

    if (!track) {
      console.log('[BACKEND] No suitable caption track found.');
      return res.status(404).json({ error: 'No suitable caption tracks.' });
    }

    console.log(`[BACKEND] Selected track: ${track.languageCode} (kind: ${track.kind || 'manual'})`);

    // 4. Fetch captions in JSON3 format (more reliable than raw XML)
    const captionUrl = track.baseUrl + '&fmt=json3';
    const captionRes = await axios.get(captionUrl, { headers: BROWSER_HEADERS });
    const captionData = captionRes.data;

    // 5. Parse JSON3 format into transcript items
    const items = [];
    const events = captionData.events || [];
    for (const event of events) {
      if (!event.segs || !event.dDurationMs) continue;
      const text = event.segs.map((s) => s.utf8 || '').join('').replace(/\n/g, ' ').trim();
      if (!text || text === ' ') continue;
      items.push({
        start: (event.tStartMs || 0) / 1000,
        duration: (event.dDurationMs || 0) / 1000,
        text,
      });
    }

    console.log(`[BACKEND] Parsed ${items.length} caption items. Sending to app.`);
    res.json({ items, title: videoTitle });

  } catch (err) {
    const msg = err.response?.data || err.message;
    console.error('[BACKEND] Captions Error:', msg);
    res.status(500).json({ error: String(msg) });
  }
});


// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 2: /transcribe
// Used only when there are NO native captions.
// Downloads audio via yt-dlp and transcribes with Whisper AI.
// ──────────────────────────────────────────────────────────────────────────────
function downloadAudioBuffer(videoId) {
  return new Promise((resolve, reject) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const ytdlp = spawn('yt-dlp', [
      url,
      '-f', 'worstaudio',
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '9',
      '--download-sections', '*0-300',
      '--force-keyframes-at-cuts',
      '-o', '-',
      '--quiet',
      '--no-warnings',
    ]);

    const chunks = [];
    ytdlp.stdout.on('data', (data) => chunks.push(data));
    ytdlp.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('ERROR')) console.error('[yt-dlp]', msg.trim());
    });
    ytdlp.on('close', (code) => {
      if (code === 0 && chunks.length > 0) resolve(Buffer.concat(chunks));
      else reject(new Error(`yt-dlp exited with code ${code}.`));
    });
    ytdlp.on('error', (e) => reject(new Error(`yt-dlp not found: ${e.message}`)));
  });
}

async function transcribeWithHF(audioBuffer) {
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[BACKEND] HF attempt ${attempt}/${MAX_RETRIES} (${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB)...`);
      const response = await axios.post(HF_MODEL_URL, audioBuffer, {
        headers: { 'Authorization': `Bearer ${HF_TOKEN}`, 'Content-Type': 'audio/mpeg' },
        params: { return_timestamps: true },
        timeout: 120000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      return response.data;
    } catch (err) {
      const statusCode = err.response?.status;
      const errMsg = err.response?.data?.error || err.message;
      if (statusCode === 503 && String(errMsg).includes('loading')) {
        const wait = err.response?.data?.estimated_time ?? 20;
        console.log(`[BACKEND] Model loading, waiting ${wait}s...`);
        await new Promise(r => setTimeout(r, wait * 1000));
      } else if (err.code === 'ECONNRESET' || err.code === 'ECONNABORTED') {
        console.log(`[BACKEND] ECONNRESET on attempt ${attempt}, retrying in 15s...`);
        await new Promise(r => setTimeout(r, 15000));
      } else {
        throw new Error(errMsg);
      }
    }
  }
  throw new Error('Max retries exceeded for Hugging Face API.');
}

app.post('/transcribe', async (req, res) => {
  try {
    const { videoId } = req.body;
    if (!videoId) return res.status(400).json({ error: 'videoId is required' });
    console.log(`\n--- AI TRANSCRIPTION REQUEST: ${videoId} ---`);
    console.log('[BACKEND] Downloading audio via yt-dlp (first 5 mins, low quality)...');
    const audioBuffer = await downloadAudioBuffer(videoId);
    console.log(`[BACKEND] Download complete: ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    const transcript = await transcribeWithHF(audioBuffer);
    console.log('[BACKEND] SUCCESS: AI transcript received!');
    res.json(transcript);
  } catch (err) {
    console.error('[BACKEND] FATAL Error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  if (!HF_TOKEN) console.warn('WARNING: No access-token found in .env!');
});
