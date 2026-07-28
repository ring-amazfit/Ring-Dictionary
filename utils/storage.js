import { localStorage } from '@zos/storage'

const KEYS = {
  HISTORY: 'dict_history_v2',
  FAVORITES: 'dict_favorites_v2',
  SETTINGS: 'dict_settings_v2',
  THEME: 'dict_theme'
}

const DEFAULT_SETTINGS = {
  theme: 'dark',
  autoComplete: true,
  maxHistory: 50,
  maxFavorites: 100,
  debugInfo: false,
  gaokaoCountdown: false,
  gaokaoLastNoticeDate: ''
}

function readJson(key, fallback) {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : fallback
  } catch (e) {
    return fallback
  }
}

export const storage = {
  getHistory() {
    return readJson(KEYS.HISTORY, [])
  },

  addHistory(word) {
    try {
      const maxHistory = this.getSettings().maxHistory || DEFAULT_SETTINGS.maxHistory
      let history = this.getHistory()
      history = history.filter(w => w !== word)
      history.unshift(word)
      if (history.length > maxHistory) history = history.slice(0, maxHistory)
      localStorage.setItem(KEYS.HISTORY, JSON.stringify(history))
    } catch (e) {
      console.log('add history error:', e)
    }
  },

  removeHistory(word) {
    try {
      var history = this.getHistory().filter(function(item) { return item !== word })
      localStorage.setItem(KEYS.HISTORY, JSON.stringify(history))
    } catch (e) {
      console.log('remove history error:', e)
    }
  },

  clearHistory() {
    localStorage.removeItem(KEYS.HISTORY)
  },

  getFavorites() {
    return readJson(KEYS.FAVORITES, [])
  },

  addFavorite(word, definition) {
    try {
      const maxFavorites = this.getSettings().maxFavorites || DEFAULT_SETTINGS.maxFavorites
      let favs = this.getFavorites()
      if (!favs.find(f => f.word === word)) {
        favs.unshift({ word, definition, addedAt: Date.now() })
        if (favs.length > maxFavorites) favs = favs.slice(0, maxFavorites)
        localStorage.setItem(KEYS.FAVORITES, JSON.stringify(favs))
      }
    } catch (e) {
      console.log('add favorite error:', e)
    }
  },

  removeFavorite(word) {
    try {
      const favs = this.getFavorites().filter(f => f.word !== word)
      localStorage.setItem(KEYS.FAVORITES, JSON.stringify(favs))
    } catch (e) {
      console.log('remove favorite error:', e)
    }
  },

  isFavorite(word) {
    return this.getFavorites().some(f => f.word === word)
  },

  getKeyboardType() {
    return 'qwerty'
  },

  getSettings() {
    const settings = readJson(KEYS.SETTINGS, null)
    return Object.assign({}, DEFAULT_SETTINGS, settings || {})
  },

  saveSettings(settings) {
    try {
      const merged = Object.assign({}, DEFAULT_SETTINGS, settings || {})
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(merged))
    } catch (e) {
      console.log('save settings error:', e)
    }
  },

  getTheme() {
    return localStorage.getItem(KEYS.THEME) || this.getSettings().theme || DEFAULT_SETTINGS.theme
  },

  setTheme(theme) {
    localStorage.setItem(KEYS.THEME, theme)
  }
}
