import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Segment } from './useVideoStore';

export interface HistoryItem {
  videoId: string;
  title: string;
  thumbnail: string;
  segments: Segment[];
  lastWatchedIndex: number;
  lastWatchedAt: number; // timestamp
}

export interface BookmarkItem {
  id: string; // unique id for bookmark
  videoId: string;
  segment: Segment;
  note: string;
  createdAt: number;
}

interface HistoryState {
  history: Record<string, HistoryItem>;
  bookmarks: BookmarkItem[];
  
  // Actions
  saveHistory: (item: Omit<HistoryItem, 'lastWatchedAt'>) => void;
  updateLastWatched: (videoId: string, index: number) => void;
  addBookmark: (bookmark: Omit<BookmarkItem, 'id' | 'createdAt'>) => void;
  removeBookmark: (id: string) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      history: {},
      bookmarks: [],

      saveHistory: (item) => set((state) => ({
        history: {
          ...state.history,
          [item.videoId]: {
            ...item,
            lastWatchedAt: Date.now(),
          }
        }
      })),

      updateLastWatched: (videoId, index) => set((state) => {
        const item = state.history[videoId];
        if (!item) return state;
        return {
          history: {
            ...state.history,
            [videoId]: {
              ...item,
              lastWatchedIndex: index,
              lastWatchedAt: Date.now(),
            }
          }
        };
      }),

      addBookmark: (bookmark) => set((state) => ({
        bookmarks: [
          {
            ...bookmark,
            id: Math.random().toString(36).substring(7),
            createdAt: Date.now(),
          },
          ...state.bookmarks,
        ]
      })),

      removeBookmark: (id) => set((state) => ({
        bookmarks: state.bookmarks.filter((b) => b.id !== id)
      })),

      clearHistory: () => set({ history: {}, bookmarks: [] }),
    }),
    {
      name: 'reelify-history-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
