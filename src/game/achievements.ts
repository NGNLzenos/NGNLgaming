import { Difficulty, FactionId, GameSnapshot } from './types';

export type AchievementCategory = 'combat' | 'faction' | 'tactics' | 'economy';
export type AchievementTier = 'bronze' | 'silver' | 'gold';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  points: number;
  target: number;
  getProgress: (stats: AchievementCareerStats) => number;
}

export interface AchievementCareerStats {
  totalMatchesWon: number;
  soloWins: number;
  pvpWins: number;
  commanderDifficultyWins: number;
  tutorialCompleted: boolean;
  factionWins: Record<FactionId, number>;
  totalUnitsTrained: number;
  totalTowersBuilt: number;
  totalObjectivesClaimed: number;
  totalScansUsed: number;
  totalSkillsUsed: number;
  totalAmbushUsed: number;
  fastestWinSec: number | null;
  flawlessNexusWins: number;
  maxTechTierReached: 1 | 2 | 3;
}

export interface AchievementStore {
  stats: AchievementCareerStats;
  unlocked: Record<string, number>; // achievementId -> unlocked timestamp (ms)
}

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  combat: '戰鬥里程碑',
  faction: '種族大師',
  tactics: '戰術操作',
  economy: '經濟與野區',
};

export const ACHIEVEMENT_TIER_META: Record<
  AchievementTier,
  { label: string; textClass: string; borderClass: string; bgClass: string }
> = {
  bronze: {
    label: '銅牌',
    textClass: 'text-amber-300',
    borderClass: 'border-amber-500/45',
    bgClass: 'bg-amber-950/35',
  },
  silver: {
    label: '銀牌',
    textClass: 'text-slate-200',
    borderClass: 'border-slate-400/55',
    bgClass: 'bg-slate-800/45',
  },
  gold: {
    label: '金牌',
    textClass: 'text-yellow-300',
    borderClass: 'border-yellow-400/65',
    bgClass: 'bg-yellow-950/35',
  },
};

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // Combat Milestones
  {
    id: 'first_victory',
    title: '初試啼聲',
    description: '贏得任意一場單人 AI 或線上多人對戰（沙盒除外）。',
    category: 'combat',
    tier: 'bronze',
    points: 10,
    target: 1,
    getProgress: (s) => Math.min(1, s.totalMatchesWon),
  },
  {
    id: 'veteran_5_wins',
    title: '常勝指揮官',
    description: '累積贏得 5 場正規對戰勝利。',
    category: 'combat',
    tier: 'silver',
    points: 25,
    target: 5,
    getProgress: (s) => Math.min(5, s.totalMatchesWon),
  },
  {
    id: 'commander_slayer',
    title: '迷霧傳奇',
    description: '在「高級（精英指揮）」難度擊敗 AI 贏得勝利。',
    category: 'combat',
    tier: 'gold',
    points: 50,
    target: 1,
    getProgress: (s) => Math.min(1, s.commanderDifficultyWins),
  },
  {
    id: 'blitz_victory',
    title: '閃電奇襲',
    description: '在 6 分鐘（360 秒）內摧毀敵方主堡奪勝。',
    category: 'combat',
    tier: 'gold',
    points: 50,
    target: 1,
    getProgress: (s) => (s.fastestWinSec !== null && s.fastestWinSec <= 360 ? 1 : 0),
  },
  {
    id: 'flawless_nexus',
    title: '不動如山',
    description: '獲勝時我方主堡血量維持在 90% 以上。',
    category: 'combat',
    tier: 'silver',
    points: 25,
    target: 1,
    getProgress: (s) => Math.min(1, s.flawlessNexusWins),
  },
  {
    id: 'pvp_first_win',
    title: '線上破冰',
    description: '在線上多人對戰中擊敗對手贏得 1 場勝利。',
    category: 'combat',
    tier: 'silver',
    points: 30,
    target: 1,
    getProgress: (s) => Math.min(1, s.pvpWins),
  },

  // Faction Mastery
  {
    id: 'master_ironbound',
    title: '鐵砧統帥',
    description: '指揮「鐵砧聯邦」贏得 1 場對戰。',
    category: 'faction',
    tier: 'bronze',
    points: 15,
    target: 1,
    getProgress: (s) => Math.min(1, s.factionWins.ironbound),
  },
  {
    id: 'master_dawn',
    title: '晨曦執政官',
    description: '指揮「晨曦聖約」贏得 1 場對戰。',
    category: 'faction',
    tier: 'bronze',
    points: 15,
    target: 1,
    getProgress: (s) => Math.min(1, s.factionWins.dawn),
  },
  {
    id: 'master_swarm',
    title: '蟲巢主宰',
    description: '指揮「蝕骨蟲巢」贏得 1 場對戰。',
    category: 'faction',
    tier: 'bronze',
    points: 15,
    target: 1,
    getProgress: (s) => Math.min(1, s.factionWins.swarm),
  },
  {
    id: 'tri_faction_master',
    title: '三族全才',
    description: '使用全部三個種族各贏得至少 1 場勝利。',
    category: 'faction',
    tier: 'gold',
    points: 50,
    target: 3,
    getProgress: (s) =>
      (s.factionWins.ironbound > 0 ? 1 : 0) +
      (s.factionWins.dawn > 0 ? 1 : 0) +
      (s.factionWins.swarm > 0 ? 1 : 0),
  },

  // Tactical Operations
  {
    id: 'tutorial_graduate',
    title: '新兵結業',
    description: '完成「新手實戰教學」全部步驟。',
    category: 'tactics',
    tier: 'bronze',
    points: 10,
    target: 1,
    getProgress: (s) => (s.tutorialCompleted ? 1 : 0),
  },
  {
    id: 'scanner_pro',
    title: '全知之眼',
    description: '累計施放迷霧雷達掃描 [S] 達 10 次。',
    category: 'tactics',
    tier: 'bronze',
    points: 15,
    target: 10,
    getProgress: (s) => Math.min(10, s.totalScansUsed),
  },
  {
    id: 'ambush_tactician',
    title: '幽影側襲',
    description: '累計下達野區奇襲編隊指令 [X] 達 5 次。',
    category: 'tactics',
    tier: 'silver',
    points: 20,
    target: 5,
    getProgress: (s) => Math.min(5, s.totalAmbushUsed),
  },
  {
    id: 'skill_commander',
    title: '戰術主導',
    description: '累計施放種族終極技能 [F] 達 8 次。',
    category: 'tactics',
    tier: 'silver',
    points: 20,
    target: 8,
    getProgress: (s) => Math.min(8, s.totalSkillsUsed),
  },

  // Economy & Jungle
  {
    id: 'tier3_ascension',
    title: '終極科技',
    description: '在對戰中將主堡科技升級至 T3。',
    category: 'economy',
    tier: 'silver',
    points: 20,
    target: 3,
    getProgress: (s) => s.maxTechTierReached,
  },
  {
    id: 'fortress_architect',
    title: '銅牆鐵壁',
    description: '累計在戰場上建造防禦塔達 15 座。',
    category: 'economy',
    tier: 'silver',
    points: 20,
    target: 15,
    getProgress: (s) => Math.min(15, s.totalTowersBuilt),
  },
  {
    id: 'jungle_hunter',
    title: '野區獵手',
    description: '累計奪取野區據點或擊破野區首領／事件目標達 10 次。',
    category: 'economy',
    tier: 'silver',
    points: 25,
    target: 10,
    getProgress: (s) => Math.min(10, s.totalObjectivesClaimed),
  },
  {
    id: 'grand_army',
    title: '鋼鐵洪流',
    description: '累計徵召訓練各類部隊達 120 單位。',
    category: 'economy',
    tier: 'gold',
    points: 35,
    target: 120,
    getProgress: (s) => Math.min(120, s.totalUnitsTrained),
  },
];

const STORAGE_KEY = 'fogfront_achievements_v1';

function buildDefaultStore(): AchievementStore {
  return {
    stats: {
      totalMatchesWon: 0,
      soloWins: 0,
      pvpWins: 0,
      commanderDifficultyWins: 0,
      tutorialCompleted: false,
      factionWins: { ironbound: 0, dawn: 0, swarm: 0 },
      totalUnitsTrained: 0,
      totalTowersBuilt: 0,
      totalObjectivesClaimed: 0,
      totalScansUsed: 0,
      totalSkillsUsed: 0,
      totalAmbushUsed: 0,
      fastestWinSec: null,
      flawlessNexusWins: 0,
      maxTechTierReached: 1,
    },
    unlocked: {},
  };
}

export function loadAchievementStore(): AchievementStore {
  const defaults = buildDefaultStore();
  if (typeof window === 'undefined') return defaults;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<AchievementStore>;
    const st = parsed.stats ?? ({} as Partial<AchievementCareerStats>);
    const fw = st.factionWins ?? ({} as Partial<Record<FactionId, number>>);

    return {
      stats: {
        totalMatchesWon: typeof st.totalMatchesWon === 'number' ? Math.max(0, st.totalMatchesWon) : 0,
        soloWins: typeof st.soloWins === 'number' ? Math.max(0, st.soloWins) : 0,
        pvpWins: typeof st.pvpWins === 'number' ? Math.max(0, st.pvpWins) : 0,
        commanderDifficultyWins:
          typeof st.commanderDifficultyWins === 'number' ? Math.max(0, st.commanderDifficultyWins) : 0,
        tutorialCompleted: Boolean(st.tutorialCompleted),
        factionWins: {
          ironbound: typeof fw.ironbound === 'number' ? Math.max(0, fw.ironbound) : 0,
          dawn: typeof fw.dawn === 'number' ? Math.max(0, fw.dawn) : 0,
          swarm: typeof fw.swarm === 'number' ? Math.max(0, fw.swarm) : 0,
        },
        totalUnitsTrained: typeof st.totalUnitsTrained === 'number' ? Math.max(0, st.totalUnitsTrained) : 0,
        totalTowersBuilt: typeof st.totalTowersBuilt === 'number' ? Math.max(0, st.totalTowersBuilt) : 0,
        totalObjectivesClaimed:
          typeof st.totalObjectivesClaimed === 'number' ? Math.max(0, st.totalObjectivesClaimed) : 0,
        totalScansUsed: typeof st.totalScansUsed === 'number' ? Math.max(0, st.totalScansUsed) : 0,
        totalSkillsUsed: typeof st.totalSkillsUsed === 'number' ? Math.max(0, st.totalSkillsUsed) : 0,
        totalAmbushUsed: typeof st.totalAmbushUsed === 'number' ? Math.max(0, st.totalAmbushUsed) : 0,
        fastestWinSec:
          typeof st.fastestWinSec === 'number' && st.fastestWinSec > 0 ? st.fastestWinSec : null,
        flawlessNexusWins: typeof st.flawlessNexusWins === 'number' ? Math.max(0, st.flawlessNexusWins) : 0,
        maxTechTierReached: st.maxTechTierReached === 3 ? 3 : st.maxTechTierReached === 2 ? 2 : 1,
      },
      unlocked: parsed.unlocked && typeof parsed.unlocked === 'object' ? { ...parsed.unlocked } : {},
    };
  } catch {
    return defaults;
  }
}

export function saveAchievementStore(store: AchievementStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function evaluateAndUnlockAchievements(
  store: AchievementStore
): { nextStore: AchievementStore; newlyUnlocked: AchievementDef[] } {
  const now = Date.now();
  const newlyUnlocked: AchievementDef[] = [];
  let nextUnlocked = store.unlocked;

  for (const def of ACHIEVEMENT_DEFS) {
    if (nextUnlocked[def.id]) continue;
    if (def.getProgress(store.stats) >= def.target) {
      if (nextUnlocked === store.unlocked) {
        nextUnlocked = { ...store.unlocked };
      }
      nextUnlocked[def.id] = now;
      newlyUnlocked.push(def);
    }
  }

  const nextStore: AchievementStore =
    nextUnlocked === store.unlocked ? store : { ...store, unlocked: nextUnlocked };
  return { nextStore, newlyUnlocked };
}

export function applyMatchVictoryToAchievements(
  store: AchievementStore,
  snapshot: GameSnapshot,
  isPvp: boolean,
  difficulty: Difficulty
): { nextStore: AchievementStore; newlyUnlocked: AchievementDef[] } {
  if (snapshot.sandboxMode || snapshot.tutorialMode) {
    return { nextStore: store, newlyUnlocked: [] };
  }
  const f = snapshot.player.faction;
  const elapsedSec = Math.max(1, Math.round(snapshot.elapsed));
  const nexusRatio = snapshot.player.nexusMaxHp > 0 ? snapshot.player.nexusHp / snapshot.player.nexusMaxHp : 0;

  const nextStats: AchievementCareerStats = {
    ...store.stats,
    totalMatchesWon: store.stats.totalMatchesWon + 1,
    soloWins: store.stats.soloWins + (isPvp ? 0 : 1),
    pvpWins: store.stats.pvpWins + (isPvp ? 1 : 0),
    commanderDifficultyWins:
      store.stats.commanderDifficultyWins + (!isPvp && difficulty === 'commander' ? 1 : 0),
    factionWins: {
      ...store.stats.factionWins,
      [f]: (store.stats.factionWins[f] ?? 0) + 1,
    },
    fastestWinSec:
      store.stats.fastestWinSec === null ? elapsedSec : Math.min(store.stats.fastestWinSec, elapsedSec),
    flawlessNexusWins: store.stats.flawlessNexusWins + (nexusRatio >= 0.9 ? 1 : 0),
    maxTechTierReached: Math.max(store.stats.maxTechTierReached, snapshot.player.techTier) as 1 | 2 | 3,
  };

  return evaluateAndUnlockAchievements({ ...store, stats: nextStats });
}

export function getAchievementSummary(store: AchievementStore): {
  unlockedCount: number;
  totalCount: number;
  points: number;
  maxPoints: number;
} {
  let unlockedCount = 0;
  let points = 0;
  let maxPoints = 0;
  for (const def of ACHIEVEMENT_DEFS) {
    maxPoints += def.points;
    if (store.unlocked[def.id]) {
      unlockedCount++;
      points += def.points;
    }
  }
  return { unlockedCount, totalCount: ACHIEVEMENT_DEFS.length, points, maxPoints };
}
