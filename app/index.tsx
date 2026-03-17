import React from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useVideoStore } from '../src/store/useVideoStore';
import { InputScreen } from '../src/screens/InputScreen';
import { ReelsScreen } from '../src/screens/ReelsScreen';

export default function Index() {
  const videoUrl = useVideoStore((state) => state.videoUrl);

  return (
    <GestureHandlerRootView style={styles.container}>
      {videoUrl ? <ReelsScreen /> : <InputScreen />}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
