import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useVideoStore, Segment } from '../store/useVideoStore';
import { VideoController } from '../components/VideoController';
import { ReelItem } from '../components/ReelItem';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ReelsScreen = () => {
  const resetSession = useVideoStore((state) => state.resetSession);
  const segments = useVideoStore((state) => state.segments);
  const activeIndex = useVideoStore((state) => state.activeIndex);
  const setActiveIndex = useVideoStore((state) => state.setActiveIndex);
  const playerReady = useVideoStore((state) => state.playerReady);
  const toggleMute = useVideoStore((state) => state.toggleMute);
  const isMuted = useVideoStore((state) => state.isMuted);
  
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
    onMomentumEnd: (event) => {
      const index = Math.round(event.contentOffset.y / SCREEN_HEIGHT);
      if (index !== activeIndex) {
        // We defer state update for the next tick to ensure smooth scrolling finish
        // but react-native-reanimated handles it natively
      }
    },
  });

  const handleMomentumScrollEnd = (e: any) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / SCREEN_HEIGHT);
    if (index !== activeIndex && index >= 0 && index < segments.length) {
      setActiveIndex(index);
    }
  };

  return (
    <View style={styles.container}>
      {/* 
        VideoController is positioned absolutely in the background.
        It plays the video while the foreground UI masks the transitions.
      */}
      <VideoController />

      {!playerReady || segments.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading Video...</Text>
        </View>
      ) : (
        <Animated.FlatList
          data={segments}
          keyExtractor={(_, index) => `reel-${index}`}
          renderItem={({ item, index }) => (
            <ReelItem 
              segment={item} 
              index={index} 
              isActive={index === activeIndex} 
            />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          style={styles.feed}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews={false} // essential to keep mask elements mounted
        />
      )}

      {/* Floating Header UI */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={resetSession}>
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Floating Side Action UI */}
      <View style={styles.sideActions}>
        <TouchableOpacity style={styles.actionButton} onPress={toggleMute}>
          <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={28} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 10,
  },
  loadingText: {
    color: '#FFF',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  feed: {
    flex: 1,
    zIndex: 5,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideActions: {
    position: 'absolute',
    right: 16,
    bottom: 120,
    zIndex: 20,
    alignItems: 'center',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
});
