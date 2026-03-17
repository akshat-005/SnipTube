import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useVideoStore } from '../store/useVideoStore';
import { SegmentManager } from '../utils/SegmentManager';

export const VideoController = () => {
  const playerRef = useRef(null);
  const videoId = useVideoStore((state) => state.videoId);
  const segments = useVideoStore((state) => state.segments);
  const setSegments = useVideoStore((state) => state.setSegments);
  const activeIndex = useVideoStore((state) => state.activeIndex);
  const setPlayerReady = useVideoStore((state) => state.setPlayerReady);
  const isMuted = useVideoStore((state) => state.isMuted);

  const [hasDuration, setHasDuration] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Seek when activeIndex changes
  useEffect(() => {
    if (segments.length > 0 && playerRef.current) {
      const targetTime = segments[activeIndex]?.start || 0;
      // @ts-ignore
      playerRef.current.seekTo(targetTime, true);
      setIsPlaying(true);
    }
  }, [activeIndex, segments]);

  // Keep track of time and loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (hasDuration && playerRef.current) {
      interval = setInterval(async () => {
        try {
          // @ts-ignore
          const currentTime = await playerRef.current.getCurrentTime();
          const currentSegment = segments[activeIndex];
          
          if (currentSegment && currentTime >= currentSegment.end) {
            // Reached the end of the segment, loop back to start
            // @ts-ignore
            playerRef.current.seekTo(currentSegment.start, true);
          }
        } catch (error) {
          console.log('Error getting time', error);
        }
      }, 250);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeIndex, segments, hasDuration]);

  const onReady = async () => {
    console.log('Player is ready!');
    setIsPlaying(true);
    
    // Attempt to get the precise duration
    try {
      // @ts-ignore
      const duration = await playerRef.current?.getDuration();
      console.log('Got duration:', duration);
      
      if (duration && duration > 0 && !hasDuration) {
        setHasDuration(true);
        const generatedSegments = SegmentManager.generateSegments(duration);
        setSegments(generatedSegments);
        setPlayerReady(true);
      }
    } catch (e) {
      console.log('Could not get duration immediately, defaulting to 60s fallback');
      if (!hasDuration) {
        setHasDuration(true);
        const generatedSegments = SegmentManager.generateSegments(60);
        setSegments(generatedSegments);
        setPlayerReady(true);
      }
    }
  };

  const onError = (e: string) => {
    console.log('YouTube iframe Error:', e);
  };

  const onStateChange = (state: string) => {
    console.log('State changed to:', state);
  };

  if (!videoId) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <YoutubePlayer
        ref={playerRef}
        height={'100%'}
        width={'100%'}
        videoId={videoId}
        play={isPlaying}
        mute={isMuted}
        onReady={onReady}
        onError={onError}
        onChangeState={onStateChange}
        initialPlayerParams={{
          controls: false,
          rel: false,
          preventFullScreen: true,
          modestbranding: true,
          iv_load_policy: 3,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 1, // Behind the feed
  },
});
