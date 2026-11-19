export type Language = 'ar' | 'en';

export type GraphicsQuality = 'low' | 'medium' | 'high';

export type GamePhase =
  | 'menu'
  | 'intro'
  | 'playing'
  | 'paused'
  | 'inventory'
  | 'phone_view'
  | 'puzzle_portraits'
  | 'puzzle_breaker'
  | 'note_view'
  | 'settings'
  | 'unity_export'
  | 'caught'
  | 'escaped';

export type InventoryCategory = 'key' | 'document' | 'photo' | 'tool' | 'battery' | 'clue';

export type InventoryItemId =
  | 'old_phone'
  | 'study_key'
  | 'battery_1'
  | 'battery_2'
  | 'secret_letter'
  | 'photo_clue'
  | 'front_door_key';

export interface InventoryItemDef {
  id: InventoryItemId;
  category: InventoryCategory;
  usable: boolean;
}

export interface MaryBehaviorMetrics {
  hideCount: number;
  flashlightOnSeconds: number;
  ignoredPhoneCount: number;
  cluesFoundCount: number;
  marySearchesHiding: boolean;
  maryDisruptsLights: boolean;
  maryAggressiveSpawn: boolean;
}

export interface SolvedPuzzles {
  phoneChecked: boolean;
  studyDoor: boolean;
  portraits: boolean;
  breaker: boolean;
  secretNote: boolean;
  frontDoor: boolean;
}

export interface GameSettings {
  volume: number; // 0 to 1
  sensitivity: number; // 0.3 to 2.0
  quality: GraphicsQuality;
  language: Language;
  showTouchControls: boolean;
  muted: boolean;
}

export interface SaveData {
  version: number;
  stage: number;
  playerPos: [number, number, number];
  playerYaw: number;
  battery: number;
  flashlightOn: boolean;
  inventory: InventoryItemId[];
  usedItems: InventoryItemId[];
  solvedPuzzles: SolvedPuzzles;
  portraitOrder: number[]; // indices 0,1,2; solved when [0,1,2]
  maryMetrics: MaryBehaviorMetrics;
  hasUnreadPhoneMessage: boolean;
  phoneMessagesRead: number;
  choices: {
    repliedToMary: boolean;
    ignoredMaryCount: number;
    readSecretLetter: boolean;
  };
  outfitColorIndex: number;
  timestamp: number;
}

export interface InteractablePrompt {
  id: string;
  labelKey: string;
  locked?: boolean;
  roomKey: string;
}

export type MaryAIState =
  | 'dormant'
  | 'stalking'
  | 'appearing'
  | 'hunting'
  | 'searching_hiding'
  | 'vanished';

export interface HUDStateSnapshot {
  battery: number;
  flashlightOn: boolean;
  isHidden: boolean;
  isCrouching: boolean;
  isSprinting: boolean;
  maryDistance: number;
  maryState: MaryAIState;
  nearbyInteractable: InteractablePrompt | null;
  currentRoomKey: string;
  objectiveKey: string;
  alertMessageKey: string | null;
}

export const INVENTORY_CATALOG: Record<InventoryItemId, InventoryItemDef> = {
  old_phone: { id: 'old_phone', category: 'tool', usable: true },
  study_key: { id: 'study_key', category: 'key', usable: false },
  battery_1: { id: 'battery_1', category: 'battery', usable: true },
  battery_2: { id: 'battery_2', category: 'battery', usable: true },
  secret_letter: { id: 'secret_letter', category: 'document', usable: true },
  photo_clue: { id: 'photo_clue', category: 'photo', usable: true },
  front_door_key: { id: 'front_door_key', category: 'key', usable: false },
};
