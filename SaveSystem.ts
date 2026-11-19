import { GameSettings, SaveData } from '../types/game';

const SAVE_KEY = 'mary_forgotten_city_save_v1';
const SETTINGS_KEY = 'mary_forgotten_city_settings_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  volume: 0.75,
  sensitivity: 1.0,
  quality: 'high',
  language: 'ar',
  showTouchControls:
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 1024),
  muted: false,
};

export function createInitialSaveData(): SaveData {
  return {
    version: 1,
    stage: 1,
    playerPos: [-5.5, 0, -4.5], // Bedroom start beside bed & phone
    playerYaw: 0,
    battery: 100,
    flashlightOn: true,
    inventory: [],
    usedItems: [],
    solvedPuzzles: {
      phoneChecked: false,
      studyDoor: false,
      portraits: false,
      breaker: false,
      secretNote: false,
      frontDoor: false,
    },
    portraitOrder: [2, 0, 1],
    maryMetrics: {
      hideCount: 0,
      flashlightOnSeconds: 0,
      ignoredPhoneCount: 0,
      cluesFoundCount: 0,
      marySearchesHiding: false,
      maryDisruptsLights: false,
      maryAggressiveSpawn: false,
    },
    hasUnreadPhoneMessage: true,
    phoneMessagesRead: 0,
    choices: {
      repliedToMary: false,
      ignoredMaryCount: 0,
      readSecretLetter: false,
    },
    outfitColorIndex: 0,
    timestamp: Date.now(),
  };
}

export class SaveSystem {
  static saveGame(data: SaveData): void {
    try {
      const payload: SaveData = { ...data, timestamp: Date.now() };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors in restricted sandboxes
    }
  }

  static loadGame(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SaveData;
      if (!parsed || parsed.version !== 1) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  static hasSave(): boolean {
    return this.loadGame() !== null;
  }

  static clearSave(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // Ignore
    }
  }

  static saveSettings(settings: GameSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore
    }
  }

  static loadSettings(): GameSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw) as Partial<GameSettings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }
}
