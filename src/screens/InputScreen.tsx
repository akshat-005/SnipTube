import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useVideoStore } from '../store/useVideoStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const InputScreen = () => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setVideoUrl = useVideoStore((state) => state.setVideoUrl);
  const setSegments = useVideoStore((state) => state.setSegments);
  const setVideoTitle = useVideoStore((state) => state.setVideoTitle);
  const setActiveIndex = useVideoStore((state) => state.setActiveIndex);
  const setPlayerReady = useVideoStore((state) => state.setPlayerReady);
  
  const history = useHistoryStore((state) => state.history);
  const bookmarks = useHistoryStore((state) => state.bookmarks);
  const historyItems = Object.values(history).sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);

  const handleProcess = async () => {
    if (!url.trim()) {
      setError('Please enter a valid YouTube URL');
      return;
    }
    
    // Basic validation
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    if (!regex.test(url)) {
      setError('Invalid YouTube URL');
      return;
    }

    setError('');
    setLoading(true);
    try {
      setVideoUrl(url);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resumeVideo = (item: any) => {
    setVideoUrl(`https://www.youtube.com/watch?v=${item.videoId}`);
    setVideoTitle(item.title);
    setSegments(item.segments);
    setActiveIndex(item.lastWatchedIndex);
    setPlayerReady(true);
  };

  const jumpToBookmark = (bookmark: any) => {
    const videoData = history[bookmark.videoId];
    if (!videoData) return;

    setVideoUrl(`https://www.youtube.com/watch?v=${bookmark.videoId}`);
    setVideoTitle(videoData.title);
    setSegments(videoData.segments);
    
    // Find index of the bookmarked segment
    const segmentIndex = videoData.segments.findIndex(
      (s: any) => s.start === bookmark.segment.start && s.end === bookmark.segment.end
    );
    setActiveIndex(segmentIndex !== -1 ? segmentIndex : 0);
    setPlayerReady(true);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={['#000000', '#1A1A1A']}
        style={styles.gradientBackground}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Reelify</Text>
          <Text style={styles.subtitle}>Turn long videos into short reels instantly.</Text>
          
          <View style={styles.inputCard}>
            <Text style={styles.label}>Enter YouTube Link</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="logo-youtube" size={24} color="#FF0000" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                placeholder="https://youtube.com/..."
                placeholderTextColor="#666"
                value={url}
                onChangeText={(text) => {
                  setUrl(text);
                  if (error) setError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity 
              style={styles.button} 
              onPress={handleProcess}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Convert to Reels</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Created Section */}
          {historyItems.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Continue Watching</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyList}>
                {historyItems.map((item) => (
                  <TouchableOpacity key={item.videoId} style={styles.historyCard} onPress={() => resumeVideo(item)}>
                    <Image source={{ uri: item.thumbnail }} style={styles.historyThumb} />
                    <View style={styles.historyOverlay}>
                      <Text style={styles.historyTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.historyProgress}>
                        Reel {item.lastWatchedIndex + 1} / {item.segments.length}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

        {/* Bookmarks Section */}
        {bookmarks.length > 0 && (
          <View style={[styles.historySection, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>Your Bookmarks</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyList}>
              {bookmarks.map((bookmark) => (
                <TouchableOpacity key={bookmark.id} style={styles.historyCard} onPress={() => jumpToBookmark(bookmark)}>
                  <Image source={{ uri: `https://img.youtube.com/vi/${bookmark.videoId}/maxresdefault.jpg` }} style={styles.historyThumb} />
                   <View style={styles.historyOverlay}>
                    <Text style={styles.bookmarkNote} numberOfLines={2}>"{bookmark.note}"</Text>
                    <Text style={styles.historyProgress}>
                      Reel at {bookmark.segment.start}s
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: '#AAAAAA',
    marginBottom: 48,
  },
  inputCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  label: {
    color: '#E0E0E0',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#333333',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#FF453A',
  },
  errorText: {
    color: '#FF453A',
    fontSize: 14,
    marginTop: -8,
    marginBottom: 16,
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#FF0000',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  historySection: {
    width: '100%',
    marginTop: 32,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  historyList: {
    paddingBottom: 20,
  },
  historyCard: {
    width: 240,
    height: 140,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
  },
  historyThumb: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  historyOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 12,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  historyTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyProgress: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  bookmarkNote: {
    color: '#FFD700', // Gold color for bookmarks
    fontSize: 14,
    fontWeight: 'bold',
    fontStyle: 'italic',
    marginBottom: 4,
  },
});
