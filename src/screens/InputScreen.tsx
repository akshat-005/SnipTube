import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { useVideoStore } from '../store/useVideoStore';

export const InputScreen = () => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const setVideoUrl = useVideoStore((state) => state.setVideoUrl);

  const handleGenerate = () => {
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
    setVideoUrl(url);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <Text style={styles.title}>Reelify</Text>
        <Text style={styles.subtitle}>Turn long videos into short reels instantly.</Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder="Paste YouTube URL here..."
            placeholderTextColor="#888"
            value={url}
            onChangeText={(text) => {
              setUrl(text);
              if (error) setError('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <TouchableOpacity 
          style={styles.button} 
          activeOpacity={0.8}
          onPress={handleGenerate}
        >
          <Text style={styles.buttonText}>Generate Reels</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#1C1C1E',
    color: '#FFFFFF',
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  inputError: {
    borderColor: '#FF453A',
  },
  errorText: {
    color: '#FF453A',
    fontSize: 14,
    marginTop: 8,
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
  },
});
