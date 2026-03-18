import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useVideoStore } from '../store/useVideoStore';
import { SegmentManager } from '../utils/SegmentManager';

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

export const VideoController = () => {
  const playerRef = useRef(null);
  const videoId = useVideoStore((state) => state.videoId);
  const segments = useVideoStore((state) => state.segments);
  const setSegments = useVideoStore((state) => state.setSegments);
  const setVideoTitle = useVideoStore((state) => state.setVideoTitle);
  const activeIndex = useVideoStore((state) => state.activeIndex);
  const setPlayerReady = useVideoStore((state) => state.setPlayerReady);
  const isMuted = useVideoStore((state) => state.isMuted);
  const isPlaying = useVideoStore((state) => state.isPlaying);
  const playbackRate = useVideoStore((state) => state.playbackRate);
  const showCaptions = useVideoStore((state) => state.showCaptions);
  const seekOffset = useVideoStore((state) => state.seekOffset);
  const seekRel = useVideoStore((state) => state.seekRel);
  const orientation = useVideoStore((state) => state.orientation);

  const [hasDuration, setHasDuration] = useState(false);
  
  const isLandscape = orientation === 'LANDSCAPE';
  const playerWidth = isLandscape ? WINDOW_HEIGHT : WINDOW_WIDTH;
  const playerHeight = isLandscape ? WINDOW_WIDTH : (WINDOW_WIDTH * 9) / 16;

  // Handle relative seeks (skip 10s)
  useEffect(() => {
    if (seekOffset !== null && playerRef.current) {
      const performSeek = async () => {
        try {
          // @ts-ignore
          const currentTime = await playerRef.current.getCurrentTime();
          const targetTime = Math.max(0, currentTime + seekOffset);
          // @ts-ignore
          playerRef.current.seekTo(targetTime, true);
        } catch (e) {
          console.log('Error during relative seek:', e);
        } finally {
          seekRel(null); // Reset the offset
        }
      };
      performSeek();
    }
  }, [seekOffset]);

  // Seek when activeIndex changes
  useEffect(() => {
    if (segments.length > 0 && playerRef.current) {
      const targetTime = segments[activeIndex]?.start || 0;
      // @ts-ignore
      playerRef.current.seekTo(targetTime, true);
    }
  }, [activeIndex, segments]);

  // Keep track of time and loop
  useEffect(() => {
    let interval: any;
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
          // Silently ignore errors during interval
        }
      }, 250);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeIndex, segments, hasDuration]);

  const onReady = async () => {
    console.log('Player is ready!');
    
    if (!videoId) return;

    // Attempt to get the precise duration
    try {
      // @ts-ignore
      const duration = await playerRef.current?.getDuration();
      console.log('Got duration:', duration);
      
      if (duration && duration > 0 && !hasDuration) {
        setHasDuration(true);
        const { segments: generatedSegments, title } = await SegmentManager.generateSmartSegments(videoId, duration);
        setSegments(generatedSegments);
        setVideoTitle(title);
        setPlayerReady(true);
      }
    } catch (e) {
      console.log('Could not get duration immediately, defaulting to 60s fallback');
      if (!hasDuration) {
        setHasDuration(true);
        const { segments: generatedSegments, title } = await SegmentManager.generateSmartSegments(videoId, 60);
        setSegments(generatedSegments);
        setVideoTitle(title);
        setPlayerReady(true);
      }
    }
  };

  const onError = (e: string) => {
    console.log('YouTube iframe Error:', e);
  };

  const onStateChange = (state: string) => {
    console.log('State changed to:', state);
    if (state === 'playing') useVideoStore.getState().setIsPlaying(true);
    if (state === 'paused' || state === 'ended') useVideoStore.getState().setIsPlaying(false);
  };

  if (!videoId) return null;

  return (
    <View style={styles.container}>
      <View 
        style={[
          styles.playerWrapper, 
          { width: playerWidth, height: playerHeight }
        ]}
      >
        <YoutubePlayer
          ref={playerRef}
          height={playerHeight}
          width={playerWidth}
          videoId={videoId}
          play={isPlaying}
          mute={isMuted}
          playbackRate={playbackRate}
          onReady={onReady}
          onError={onError}
          onChangeState={onStateChange}
          initialPlayerParams={{
            controls: true,
            rel: false,
            preventFullScreen: false,
            modestbranding: true,
            iv_load_policy: showCaptions ? 1 : 3,
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerWrapper: {
    backgroundColor: '#000',
  },
});
