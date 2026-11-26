import { AIArchetype, Difficulty, FactionId, MapMode } from './types';

export interface SavedFriend {
  friendCode: string;
  name: string;
  addedAt: number;
}

export interface PlayerPrefs {
  friendCode: string;
  playerName: string;
  tacticGuideEnabled: boolean;
  selectedTacticGuide: AIArchetype;
  selectedFaction: FactionId;
  mapMode: MapMode;
  difficulty: Difficulty;
  muted: boolean;
  friends: SavedFriend[];
}

const STORAGE_KEY = 'fogfront_player_prefs_v1';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const VALID_FACTIONS: FactionId[] = ['ironbound', 'dawn', 'swarm'];
const VALID_MAP_MODES: MapMode[] = ['standard', 'simple'];
const VALID_DIFFICULTIES: Difficulty[] = ['rookie', 'standard', 'commander'];
const VALID_TACTICS: AIArchetype[] = [
  'iron_rush',
  'iron_turtle',
  'iron_air_siege',
  'iron_mech',
  'iron_bio',
];

export function generateFriendCode(): string {
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

export function normalizeFriendCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function buildDefaultPrefs(): PlayerPrefs {
  return {
    friendCode: generateFriendCode(),
    playerName: `指揮官${Math.floor(10 + Math.random() * 89)}`,
    tacticGuideEnabled: true,
    selectedTacticGuide: 'iron_rush',
    selectedFaction: 'ironbound',
    mapMode: 'standard',
    difficulty: 'standard',
    muted: false,
    friends: [],
  };
}

export function loadPlayerPrefs(): PlayerPrefs {
  const defaults = buildDefaultPrefs();
  if (typeof window === 'undefined') return defaults;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw) as Partial<PlayerPrefs>;
    const friendCode =
      typeof parsed.friendCode === 'string' && normalizeFriendCode(parsed.friendCode).length === 6
        ? normalizeFriendCode(parsed.friendCode)
        : defaults.friendCode;
    const playerName =
      typeof parsed.playerName === 'string' && parsed.playerName.trim().length > 0
        ? parsed.playerName.trim().slice(0, 14)
        : defaults.playerName;
    const tacticGuideEnabled =
      typeof parsed.tacticGuideEnabled === 'boolean' ? parsed.tacticGuideEnabled : defaults.tacticGuideEnabled;
    const selectedTacticGuide =
      parsed.selectedTacticGuide && VALID_TACTICS.includes(parsed.selectedTacticGuide)
        ? parsed.selectedTacticGuide
        : defaults.selectedTacticGuide;
    const selectedFaction =
      parsed.selectedFaction && VALID_FACTIONS.includes(parsed.selectedFaction)
        ? parsed.selectedFaction
        : defaults.selectedFaction;
    const mapMode =
      parsed.mapMode && VALID_MAP_MODES.includes(parsed.mapMode) ? parsed.mapMode : defaults.mapMode;
    const difficulty =
      parsed.difficulty && VALID_DIFFICULTIES.includes(parsed.difficulty)
        ? parsed.difficulty
        : defaults.difficulty;
    const muted = typeof parsed.muted === 'boolean' ? parsed.muted : defaults.muted;

    const friends: SavedFriend[] = Array.isArray(parsed.friends)
      ? parsed.friends
          .filter(
            (f): f is SavedFriend =>
              Boolean(f) &&
              typeof f.friendCode === 'string' &&
              normalizeFriendCode(f.friendCode).length === 6 &&
              normalizeFriendCode(f.friendCode) !== friendCode
          )
          .slice(0, 50)
          .map((f) => ({
            friendCode: normalizeFriendCode(f.friendCode),
            name: typeof f.name === 'string' && f.name.trim().length > 0 ? f.name.trim().slice(0, 14) : '戰友',
            addedAt: typeof f.addedAt === 'number' ? f.addedAt : Date.now(),
          }))
      : [];

    const sanitized: PlayerPrefs = {
      friendCode,
      playerName,
      tacticGuideEnabled,
      selectedTacticGuide,
      selectedFaction,
      mapMode,
      difficulty,
      muted,
      friends,
    };

    // Ensure generated friendCode is persisted back if missing previously
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    return sanitized;
  } catch {
    return defaults;
  }
}

export function savePlayerPrefs(prefs: PlayerPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore quota or privacy mode errors
  }
}
