import { create } from 'zustand';

export type Segment = {
  start: number;
  end: number;
};

interface VideoState {
  videoUrl: string;
  videoId: string | null;
  segments: Segment[];
  activeIndex: number;
  playerReady: boolean;
  isMuted: boolean;
  
  // Actions
  setVideoUrl: (url: string) => void;
  setSegments: (segments: Segment[]) => void;
  setActiveIndex: (index: number) => void;
  setPlayerReady: (ready: boolean) => void;
  toggleMute: () => void;
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
  segments: [],
  activeIndex: 0,
  playerReady: false,
  isMuted: false,

  setVideoUrl: (url) => set({ 
    videoUrl: url, 
    videoId: extractVideoId(url),
    activeIndex: 0 
  }),
  setSegments: (segments) => set({ segments }),
  setActiveIndex: (index) => set({ activeIndex: index }),
  setPlayerReady: (ready) => set({ playerReady: ready }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  resetSession: () => set({
    videoUrl: '',
    videoId: null,
    segments: [],
    activeIndex: 0,
    playerReady: false,
  })
}));
