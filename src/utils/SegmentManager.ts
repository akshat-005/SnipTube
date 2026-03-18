import axios from 'axios';
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
  static async generateSmartSegments(videoId: string, totalDurationSeconds: number): Promise<{ segments: Segment[], title: string }> {
    const hostUri = Constants.expoConfig?.hostUri || '';
    const hostIp = hostUri.split(':')[0] || 'localhost';
    const BACKEND = `http://${hostIp}:3000`;

    console.log(`[APP] Using backend at ${BACKEND}`);

    // Try fetching captions from our backend
    try {
      console.log('[APP] Step 1: Requesting captions from backend...');
      const res = await axios.get(`${BACKEND}/captions?v=${videoId}`, { timeout: 15000 });
      
      if (res.data && res.data.items && res.data.items.length > 0) {
        console.log(`[APP] Got ${res.data.items.length} caption items! Segmenting...`);
        return {
          segments: this.splitByTranscript(res.data.items, totalDurationSeconds),
          title: res.data.title || 'YouTube Video'
        };
      }
    } catch (e: any) {
      console.log('[APP] Backend /captions failed or no items, trying /transcribe...');
    }

    // Try AI transcription fallback
    try {
      console.log('[APP] Step 2: Requesting transcription from backend...');
      const res = await axios.get(`${BACKEND}/transcribe?v=${videoId}`, { timeout: 60000 });
      
      if (res.data && res.data.transcript && res.data.transcript.length > 0) {
        console.log(`[APP] Got AI transcript! Segmenting...`);
        return {
          segments: this.splitByTranscript(res.data.transcript, totalDurationSeconds),
          title: res.data.title || 'YouTube Video'
        };
      }
    } catch (e: any) {
      console.log('[APP] Backend /transcribe failed.');
    }

    // Last fallback: Equal segments
    console.log('[APP] Step 3: Using fallback equal segments.');
    return {
      segments: this.generateBasicSegments(totalDurationSeconds),
      title: 'YouTube Video'
    };
  }

  private static splitByTranscript(items: TranscriptItem[], totalDuration: number): Segment[] {
    const segments: Segment[] = [];
    let currentStart = 0;
    
    // Config for "Smart" cuts
    const MIN_DURATION = 15;
    const MAX_DURATION = 50;
    const TARGET_DURATION = 35;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const durationSoFar = item.start + item.duration - currentStart;
      
      // Look for a good cut point if we are in the target window
      const isSentenceEnd = /[.!?]$/i.test(item.text);
      const nextItem = items[i + 1];
      const hasPause = nextItem ? (nextItem.start - (item.start + item.duration)) > 0.8 : true;

      if (durationSoFar >= MIN_DURATION) {
        if ((isSentenceEnd && hasPause && durationSoFar >= TARGET_DURATION) || durationSoFar >= MAX_DURATION) {
          segments.push({
            start: Math.floor(currentStart),
            end: Math.min(Math.ceil(item.start + item.duration), totalDuration)
          });
          currentStart = item.start + item.duration;
        }
      }
    }

    // Add final segment if needed
    if (totalDuration - currentStart > 5) {
      segments.push({
        start: Math.floor(currentStart),
        end: Math.ceil(totalDuration)
      });
    }

    return segments.length > 0 ? segments : this.generateBasicSegments(totalDuration);
  }

  static generateBasicSegments(totalDurationSeconds: number): Segment[] {
    const segments: Segment[] = [];
    const segmentDuration = 40;
    
    for (let i = 0; i < totalDurationSeconds; i += segmentDuration) {
      segments.push({
        start: i,
        end: Math.min(i + segmentDuration, totalDurationSeconds),
      });
    }
    return segments;
  }
}
