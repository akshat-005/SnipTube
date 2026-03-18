import React, { useState } from 'react';
import { StyleSheet, View, Pressable, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useVideoStore } from '../store/useVideoStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { BookmarkModal } from './BookmarkModal';

export const ControlOverlay = () => {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isBookmarkModalVisible, setIsBookmarkModalVisible] = useState(false);

  const videoId = useVideoStore((state) => state.videoId);
  const segments = useVideoStore((state) => state.segments);
  const activeIndex = useVideoStore((state) => state.activeIndex);
  const isPlaying = useVideoStore((state) => state.isPlaying);
  const togglePlay = useVideoStore((state) => state.togglePlay);
  const playbackRate = useVideoStore((state) => state.playbackRate);
  const setPlaybackRate = useVideoStore((state) => state.setPlaybackRate);
  const showCaptions = useVideoStore((state) => state.showCaptions);
  const setShowCaptions = useVideoStore((state) => state.setShowCaptions);
  const seekRel = useVideoStore((state) => state.seekRel);
  const isMuted = useVideoStore((state) => state.isMuted);
  const toggleMute = useVideoStore((state) => state.toggleMute);

  // The cyclePlaybackRate function is replaced by the speed menu logic
  // const cyclePlaybackRate = () => {
  //   const rates = [1, 1.25, 1.5, 2, 0.5, 0.75];
  //   const currentIndex = rates.indexOf(playbackRate);
  //   const nextIndex = (currentIndex + 1) % rates.length;
  //   setPlaybackRate(rates[nextIndex]);
  // };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Top row: Captions & Bookmark */}
      <View style={styles.topRow}>
        <Pressable 
          style={styles.iconButton} 
          onPress={() => setIsBookmarkModalVisible(true)}
        >
          <MaterialCommunityIcons name="bookmark-outline" size={28} color="#fff" />
        </Pressable>
        
        <Pressable 
          style={[styles.iconButton, showCaptions && styles.activeButton]} 
          onPress={() => setShowCaptions(!showCaptions)}
        >
          <MaterialCommunityIcons 
            name={showCaptions ? "closed-caption" : "closed-caption-outline"} 
            size={28} 
            color="#fff" 
          />
        </Pressable>

        <Pressable style={styles.iconButton} onPress={toggleMute}>
          <MaterialCommunityIcons 
            name={isMuted ? "volume-off" : "volume-high"} 
            size={28} 
            color="#fff" 
          />
        </Pressable>
      </View>

      {/* Center: Play/Pause/Skip */}
      <View style={styles.centerRow} pointerEvents="box-none">
        <Pressable onPress={() => seekRel(-10)} style={styles.skipButton}>
          <MaterialCommunityIcons name="rewind-10" size={40} color="rgba(255,255,255,0.8)" />
        </Pressable>

        <Pressable onPress={togglePlay} style={styles.playButton}>
          <MaterialCommunityIcons 
            name={isPlaying ? "pause-circle" : "play-circle"} 
            size={80} 
            color="rgba(255,255,255,0.9)" 
          />
        </Pressable>

        <Pressable onPress={() => seekRel(10)} style={styles.skipButton}>
          <MaterialCommunityIcons name="fast-forward-10" size={40} color="rgba(255,255,255,0.8)" />
        </Pressable>
      </View>

      {/* Bottom: Playback Speed */}
      <View style={styles.bottomRow}>
        <Pressable style={styles.speedButton} onPress={() => setShowSpeedMenu(true)}>
          <Text style={styles.speedText}>{playbackRate}x</Text>
        </Pressable>
      </View>

       {/* Speed Selector Modal/Menu */}
      {showSpeedMenu && (
        <View style={styles.speedMenu}>
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
            <TouchableOpacity 
              key={rate} 
              onPress={() => {
                setPlaybackRate(rate);
                setShowSpeedMenu(false);
              }}
              style={[styles.speedOption, playbackRate === rate && styles.activeOption]}
            >
              <Text style={styles.speedText}>{rate}x</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Bookmark Modal */}
      {videoId && segments[activeIndex] && (
        <BookmarkModal
          visible={isBookmarkModalVisible}
          onClose={() => setIsBookmarkModalVisible(false)}
          videoId={videoId}
          segment={segments[activeIndex]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    zIndex: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centerRow: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  playButton: {
    padding: 10,
    marginHorizontal: 20,
  },
  skipButton: {
    padding: 10,
  },
  speedButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  speedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  speedMenu: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
    width: 100,
  },
  speedOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  activeOption: {
    backgroundColor: '#FF0000',
  },
});
