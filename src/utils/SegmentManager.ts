import { Segment } from '../store/useVideoStore';

export class SegmentManager {
  /**
   * Generates sequential segments given a total duration.
   * Target segment duration is ~30-45 seconds for MVP.
   */
  static generateSegments(totalDurationSeconds: number): Segment[] {
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
