import { create } from 'zustand';

export type Segment = {
  start: number;
  end: number;
};

interface VideoState {
  videoUrl: string;
  videoId: string | null;
  videoTitle: string;
  segments: Segment[];
  activeIndex: number;
  playerReady: boolean;
  isMuted: boolean;
  isPlaying: boolean;
  playbackRate: number;
  showCaptions: boolean;
  seekOffset: number | null; // Used to trigger relative seeks
  orientation: 'PORTRAIT' | 'LANDSCAPE';
  
  // Actions
  setVideoUrl: (url: string) => void;
  setVideoTitle: (title: string) => void;
  setSegments: (segments: Segment[]) => void;
  setActiveIndex: (index: number) => void;
  setPlayerReady: (ready: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setShowCaptions: (show: boolean) => void;
  setOrientation: (orientation: 'PORTRAIT' | 'LANDSCAPE') => void;
  seekRel: (offset: number | null) => void;
  toggleMute: () => void;
  togglePlay: () => void;
  resetSession: () => void;
}

const extractVideoId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  return match ? match[1] : null;
};

export const useVideoStore = create<VideoState>((set) => ({
  videoUrl: '',
  videoId: null,
  videoTitle: 'YouTube Video',
  segments: [],
  activeIndex: 0,
  playerReady: false,
  isMuted: false,
  isPlaying: true,
  playbackRate: 1,
  showCaptions: false,
  seekOffset: null,
  orientation: 'PORTRAIT',

  setVideoUrl: (url) => set({ 
    videoUrl: url, 
    videoId: extractVideoId(url),
    videoTitle: 'YouTube Video',
    activeIndex: 0 
  }),
  setVideoTitle: (title) => set({ videoTitle: title }),
  setSegments: (segments) => set({ segments }),
  setActiveIndex: (index) => set({ activeIndex: index }),
  setPlayerReady: (ready) => set({ playerReady: ready }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  setShowCaptions: (show) => set({ showCaptions: show }),
  setOrientation: (orientation) => set({ orientation }),
  seekRel: (offset) => set({ seekOffset: offset }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  resetSession: () => set({
    videoUrl: '',
    videoId: null,
    segments: [],
    activeIndex: 0,
    playerReady: false,
    isPlaying: true,
    playbackRate: 1,
    showCaptions: false,
    seekOffset: null,
    orientation: 'PORTRAIT',
  })
}));
