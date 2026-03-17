import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withTiming, 
  useSharedValue, 
  withDelay
} from 'react-native-reanimated';
import { Segment, useVideoStore } from '../store/useVideoStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ReelItemProps {
  segment: Segment;
  index: number;
  isActive: boolean;
}

export const ReelItem: React.FC<ReelItemProps> = ({ segment, index, isActive }) => {
  const segments = useVideoStore((state) => state.segments);
  const opacity = useSharedValue(1);

  // Masking effect: when this item becomes active, we briefly show a black mask
  // to hide the buffering/seeking of the underlying video player, then fade it out.
  useEffect(() => {
    if (isActive) {
      // Show mask briefly during seek, then fade out
      opacity.value = 1;
      opacity.value = withDelay(250, withTiming(0, { duration: 300 }));
    } else {
      // Re-apply mask when not active so it covers the background video playing other segments
      opacity.value = 1; 
    }
  }, [isActive]);

  const maskStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Render dummy overlay info
  return (
    <View style={styles.container}>
      {/* 
        This animated view covers the background video while not active,
        or fades out smoothly when active to reveal the video perfectly aligned.
      */}
      <Animated.View style={[styles.mask, maskStyle]} />

      <View style={styles.overlay}>
        <View style={styles.contentContainer}>
          <Text style={styles.segmentCount}>Part {index + 1} / {segments.length}</Text>
          <Text style={styles.durationInfo}>
            {segment.start}s - {segment.end}s
          </Text>
        </View>

        {/* Basic Progress bar visualization for the current segment could go here */}
        <View style={styles.progressBarContainer}>
           <View style={[styles.progressBar, { width: isActive ? '100%' : '0%' }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: SCREEN_HEIGHT,
    width: '100%',
    justifyContent: 'flex-end',
  },
  mask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  overlay: {
    padding: 16,
    paddingBottom: 48, // space for bottom navigation/actions
    zIndex: 10,
  },
  contentContainer: {
    marginBottom: 16,
  },
  segmentCount: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  },
  durationInfo: {
    color: '#CCC',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFF',
  }
});
