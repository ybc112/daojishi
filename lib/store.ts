import { create } from 'zustand'

interface GameState {
  // Language
  language: 'zh' | 'en'
  setLanguage: (lang: 'zh' | 'en') => void
}

export const useGameStore = create<GameState>((set) => ({
  language: 'zh',
  setLanguage: (lang) => set({ language: lang }),
}))
