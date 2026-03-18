import React, { useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useVideoStore } from '../store/useVideoStore';
import { BookmarkModal } from './BookmarkModal';

export const ControlOverlay = () => {
  const [isBookmarkModalVisible, setIsBookmarkModalVisible] = useState(false);

  const videoId = useVideoStore((state) => state.videoId);
  const segments = useVideoStore((state) => state.segments);
  const activeIndex = useVideoStore((state) => state.activeIndex);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Top row: Bookmark only */}
      <View style={styles.topRow}>
        <Pressable 
          style={styles.iconButton} 
          onPress={() => setIsBookmarkModalVisible(true)}
        >
          <MaterialCommunityIcons name="bookmark-outline" size={32} color="#fff" />
        </Pressable>
      </View>

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
    padding: 20,
    paddingTop: 50,
    zIndex: 2,
    justifyContent: 'flex-start',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  iconButton: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 12,
    borderRadius: 30,
  },
});
