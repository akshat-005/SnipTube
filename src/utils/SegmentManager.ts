import Constants from 'expo-constants';
import { Segment } from '../store/useVideoStore';

export interface TranscriptItem {
  start: number;
  duration: number;
  text: string;
}

export class SegmentManager {
  /**
   * Generates segments intelligently by fetching the transcript and splitting on sentence boundaries.
   * If transcript fetching fails, it falls back to equal time intervals.
   */
  static async generateSmartSegments(videoId: string, totalDurationSeconds: number): Promise<Segment[]> {
    // Dynamically get the host IP from Expo Constants
    const hostUri = Constants.expoConfig?.hostUri || '';
    const hostIp = hostUri.split(':')[0] || '10.129.37.26';
    const BACKEND = `http://${hostIp}:3000`;

    console.log(`[APP] Using backend at ${BACKEND}`);

    // ── Step 1: Try fetching captions from our backend ──────────────────────
    try {
      console.log('[APP] Step 1: Requesting captions from backend...');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${BACKEND}/captions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const contentType = res.headers.get('content-type');
      if (res.ok && contentType?.includes('application/json')) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          console.log(`[APP] Got ${data.items.length} caption items! Segmenting...`);
          return this.splitByTranscript(data.items, totalDurationSeconds);
        }
      } else {
        const text = await res.text();
        console.log('[APP] Backend /captions returned:', res.status, text.substring(0, 50));
      }
    } catch (e: any) {
      console.log('[APP] /captions error:', e.message);
    }

    // ── Step 2: Try Whisper AI transcription (first 5 minutes only) ──────────
    // Only used for videos with no captions at all (niche, private content, etc.)
    // NOTE: This gives smart segmentation for the first 5 minutes.
    // The remainder of the video falls back to equal-duration segments.
    try {
      console.log('[APP] Step 2: No captions found. Requesting AI transcription (first 5 mins)...');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 120000); // 2min for AI

      const res = await fetch(`${BACKEND}/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        if (data.chunks && data.chunks.length > 0) {
          console.log('[APP] Got AI transcript! Segmenting...');
          const items: TranscriptItem[] = data.chunks.map((chunk: any) => ({
            start: chunk.timestamp[0] || 0,
            duration: (chunk.timestamp[1] || 300) - (chunk.timestamp[0] || 0),
            text: chunk.text.trim(),
          }));
          return this.splitByTranscript(items, totalDurationSeconds);
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') console.log('[APP] /transcribe timed out.');
      else console.log('[APP] /transcribe error:', e.message);
    }

    // ── Step 3: Basic equal-duration fallback ─────────────────────────────────
    console.log('[APP] Step 3: Falling back to basic equal-duration segments.');
    return this.generateBasicSegments(totalDurationSeconds);
  }

  private static async fetchTranscript(videoId: string): Promise<TranscriptItem[] | null> {
    try {
      // Use a realistic user agent to avoid bot detection during fetch
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      };

      const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, { headers });
      const text = await res.text();
      
      const match = text.match(/"captions":\s*(\{.*?\})\s*,\s*"videoDetails"/);
      if (!match) return null;
      
      const captions = JSON.parse(match[1]);
      const renderer = captions.playerCaptionsTracklistRenderer;
      if (!renderer) return null;

      const tracks = renderer.captionTracks || [];
      if (tracks.length === 0) return null;
      
      // Prefer English, then any native, then auto-generated (asr)
      const track = tracks.find((t: any) => t.languageCode === 'en' && !t.kind) || 
                    tracks.find((t: any) => t.languageCode === 'en') ||
                    tracks[0];

      let url = track.baseUrl;
      
      const xmlRes = await fetch(url, { headers });
      const xml = await xmlRes.text();
      
      // Parse XML using regex to avoid heavy DOM parsers on React Native
      const regex = /<text start="([^"]*)" dur="([^"]*)".*?>(.*?)<\/text>/g;
      const items: TranscriptItem[] = [];
      let match2;
      
      while ((match2 = regex.exec(xml)) !== null) {
        items.push({
          start: parseFloat(match2[1]),
          duration: parseFloat(match2[2]),
          text: match2[3]
            .replace(/&amp;/g, '&')
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/<[^>]*>/g, '') // Remove any HTML tags
            .trim()
        });
      }
      
      return items.length > 0 ? items : null;
    } catch (e) {
      console.log('[APP] Native transcript fetch error:', e);
      return null;
    }
  }

  private static splitByTranscript(items: TranscriptItem[], totalDuration: number): Segment[] {
    const TARGET_MIN = 15; // Lower minimum to allow more natural cuts
    const TARGET_MAX = 50;
    
    const segments: Segment[] = [];
    let currentSegment: Segment = { start: 0, end: 0 };
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        if (currentSegment.start === 0 && segments.length === 0) {
            currentSegment.start = Math.max(0, item.start);
        }

        const currentDuration = (item.start + item.duration) - currentSegment.start;
        currentSegment.end = item.start + item.duration;

        // Smart break detection
        const text = item.text.trim();
        const isEndOfSentence = /[.?!]$/.test(text);
        const nextItem = items[i + 1];
        
        // A long gap in speech is a great place to cut
        const isLongPause = nextItem ? (nextItem.start - currentSegment.end > 0.8) : true;
        
        if (currentDuration >= TARGET_MIN) {
            // Priority 1: Long pause or end of sentence
            if (isLongPause || isEndOfSentence) {
                segments.push({ ...currentSegment });
                if (nextItem) {
                    currentSegment = { start: nextItem.start, end: 0 };
                }
            } 
            // Priority 2: Force break if too long
            else if (currentDuration >= TARGET_MAX) {
                segments.push({ ...currentSegment });
                if (nextItem) {
                    currentSegment = { start: nextItem.start, end: 0 };
                }
            }
        }
    }
    
    // Push the last segment if it wasn't pushed
    if (currentSegment.end > 0 && currentSegment.start < totalDuration) {
        // If it's too short, merge with previous
        if (segments.length > 0 && (currentSegment.end - currentSegment.start) < 10) {
            segments[segments.length - 1].end = currentSegment.end;
        } else {
            segments.push(currentSegment);
        }
    }
    
    return segments;
  }

  /**
   * Fallback generation based purely on time intervals.
   */
  static generateBasicSegments(totalDurationSeconds: number): Segment[] {
    const TARGET_DURATION = 30; // target 30 seconds per segment
    const MIN_DURATION = 20;

    if (totalDurationSeconds <= MIN_DURATION) {
      return [{ start: 0, end: totalDurationSeconds }];
    }

    const segments: Segment[] = [];
    let currentTime = 0;

    while (currentTime < totalDurationSeconds) {
      let segmentLength = TARGET_DURATION;
      
      // If the remaining time is less than target, just append it
      if (totalDurationSeconds - currentTime < TARGET_DURATION) {
        segmentLength = totalDurationSeconds - currentTime;
      }

      segments.push({
        start: currentTime,
        end: currentTime + segmentLength,
      });

      currentTime += segmentLength;
    }

    // Heuristics: if last segment is too short, merge it with previous if it exists
    if (segments.length > 1) {
      const lastSegment = segments[segments.length - 1];
      const prevSegment = segments[segments.length - 2];
      
      if (lastSegment.end - lastSegment.start < MIN_DURATION) {
        // Merge the two
        prevSegment.end = lastSegment.end;
        segments.pop(); 
      }
    }

    return segments;
  }
}
