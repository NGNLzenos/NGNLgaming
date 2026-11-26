import {
  AIArchetype,
  ArmoryBuildingKind,
  ArmoryTrackId,
  AttributeTag,
  BarracksTier,
  Difficulty,
  FactionDef,
  FactionId,
  JungleZoneId,
  LaneId,
  MapMode,
  ObjectiveKind,
  TowerDef,
  TowerType,
  TowerUpgradeMode,
  UnitArchetypeRole,
  Vec2,
} from './types';
import {
  computeBaseDpsFp,
  FP_SCALE,
  scaleAttackIntervalMs,
  toFp,
} from './combatMath';

// Wider 1440x840 battlefield for pronounced 3-lane separation & rich central jungle fog
export const WORLD_WIDTH = 1440;
export const WORLD_HEIGHT = 840;

export const PLAYER_NEXUS_POS: Vec2 = { x: 108, y: 420 };
export const ENEMY_NEXUS_POS: Vec2 = { x: 1332, y: 420 };

// Deterministic Flat-Subtraction Nexus & Structure Baselines
// Nexus has Base HP + Extra Plating HP; losing extra plating penalizes home mining until upgraded/repaired!
export const NEXUS_BASE_HP = 1400;
export const NEXUS_PLATING_HP = 400;
export const NEXUS_MAX_HP = NEXUS_BASE_HP + NEXUS_PLATING_HP; // 1800 total
export const SIMPLE_NEXUS_BASE_HP = 1050;
export const SIMPLE_NEXUS_PLATING_HP = 300;
export const SIMPLE_NEXUS_MAX_HP = SIMPLE_NEXUS_BASE_HP + SIMPLE_NEXUS_PLATING_HP; // 1350 total
export const NEXUS_PLATING_BROKEN_MINE_EFF_PERMILLE = 650; // -35% home mining efficiency when Nexus extra HP is broken
export const NEXUS_REPAIR_COST = 110;
export const NEXUS_REPAIR_TIME = 12.0;
export const SIMPLE_ECON_PACE_MULT = 1.18; // +18% mining cadence for quicker tutorials & sessions
export const NEXUS_VISION = 175;
export const NEXUS_RANGE = 205;
export const NEXUS_ARMOR = 4;
export const NEXUS_DAMAGE = 14; // Single-target lowered damage: prevents AFK defending rushes while stopping base spawn-camp
export const NEXUS_ATTACK_COUNT = 1;
export const NEXUS_ATTACK_INTERVAL_MS = 1350;
export const NEXUS_ATTRIBUTES: AttributeTag[] = ['Armored', 'Mechanical', 'Structure'];
export const NEXUS_BONUS_VS_TAG: Partial<Record<AttributeTag, number>> = {
  Light: 3,
  Armored: 3,
};
export const NEXUS_GOLD_RESERVE = 4200; // Finite home mineral reserve (forces eventual expansion!)

// Slightly slower overall game tempo for clearer tactical micro & decision-making
export const BASE_SIM_SPEED = 0.85;
// Early-game neutral jungle creeps stay passive (unless provoked) so both sides can scout freely
export const EARLY_PASSIVE_CREEP_SEC = 210;
export const FIRED_REVEAL_DURATION = 2.6;

// Starting gold & gas (halved gold for tighter early-game decision making)
export const STARTING_GOLD_STANDARD = 120;
export const STARTING_GOLD_SIMPLE = 135;
export const STARTING_GAS_STANDARD = 0;
export const STARTING_GAS_SIMPLE = 20;
export const COMMANDER_BONUS_GOLD = 20;

// Opening cooldowns so early rushes & opening build orders cannot be trivially countered or scouted for free
export const FACTION_SKILL_INITIAL_COOLDOWN = 65;
export const SCAN_INITIAL_COOLDOWN = 75;

// Redesigned Mining & Harassment Constants (Zero-Worker Automated Mining + Expansion + Distance-Scaled Proximity Harassment)
export const MINE_HARASS_RADIUS = 180; // Enemy combat unit within 180px begins disrupting mine efficiency
export const MINE_HARASS_CLOSE_RADIUS = 45; // Point-blank <= 45px causes maximum disruption
export const MINE_HARASS_EDGE_EFF_PERMILLE = 800; // 80% efficiency at 180px edge (-20%)
export const MINE_HARASS_MIN_EFF_PERMILLE = 150; // 15% efficiency at <= 45px (-85%)
export const INNER_PAD_BASE_MINE_RATE = 3.4;
export const OUTER_PAD_BASE_MINE_RATE = 5.2;

/** Deterministic distance-based proximity harassment efficiency in permille (150..1000). */
export function computeHarassEffPermille(minEnemyDist: number): number {
  if (!Number.isFinite(minEnemyDist) || minEnemyDist > MINE_HARASS_RADIUS) return 1000;
  if (minEnemyDist <= MINE_HARASS_CLOSE_RADIUS) return MINE_HARASS_MIN_EFF_PERMILLE;
  const span = MINE_HARASS_RADIUS - MINE_HARASS_CLOSE_RADIUS; // 135px
  const closeness = (MINE_HARASS_RADIUS - minEnemyDist) / span; // 0..1
  const eff =
    MINE_HARASS_EDGE_EFF_PERMILLE -
    Math.round(closeness * (MINE_HARASS_EDGE_EFF_PERMILLE - MINE_HARASS_MIN_EFF_PERMILLE));
  return Math.max(MINE_HARASS_MIN_EFF_PERMILLE, Math.min(MINE_HARASS_EDGE_EFF_PERMILLE, eff));
}

export const MAP_MODE_META: Record<
  MapMode,
  {
    name: string;
    shortName: string;
    lanesLabel: string;
    desc: string;
    activeLanes: LaneId[];
  }
> = {
  standard: {
    name: '標準三線戰場',
    shortName: '三線標準',
    lanesLabel: '上 / 中 / 下三線 + 雙野區 + 6 種成長事件',
    desc: '經典三線大戰場與上下雙野區迷霧，含 6 種隨時間強化影響力的野區事件，完整戰術營運體驗。',
    activeLanes: [0, 1, 2],
  },
  simple: {
    name: '簡易雙線速戰',
    shortName: '雙線簡易',
    lanesLabel: '寬距上 / 下兩線 + 中央野區（精簡事件）',
    desc: '大幅拉開的上下兩路與中央單一野區，大幅減少野區事件頻率且僅保留「物資空投 / 迷霧巨像」兩種直覺事件，方便新手專注對線與奇襲！',
    activeLanes: [0, 2],
  },
};

// Supply Depot scaling: buildable inside base OR forward along roads; hard ceiling 100 supply
export const MAX_SUPPLY_LIMIT = 100;
export const SUPPLY_DEPOT_COST = 85;
export const SUPPLY_DEPOT_BUILD_TIME = 10.5;
export const SUPPLY_DEPOT_BONUS = 14;
export const SUPPLY_DEPOT_HP = 260;
export const SUPPLY_DEPOT_ARMOR = 1;
export const SUPPLY_DEPOT_VISION = 95;
export const SUPPLY_DEPOT_ATTRIBUTES: AttributeTag[] = ['Armored', 'Mechanical', 'Structure'];
export const SUPPLY_DEPOT_MAX_COUNT = 6;

// Ironbound [K] Tactical Boost Active Skill & Hawkeye Recon OOC Bio Heal
export const IRON_K_BOOST_RADIUS = 105;
export const IRON_K_BOOST_COOLDOWN = 28;
export const IRON_K_BOOST_DURATION = 3.0;
export const IRON_K_BIO_HP_COST_PERMILLE = 100; // 10% max HP cost on Bio stim (clamped >= 1 HP)
export const IRON_K_MECH_RANGE_PERMILLE = 1350; // +35% range while rooted in place
export const IRON_K_MECH_BONUS_DMG = 6; // +6 flat damage while rooted
export const IRON_K_LV2_BIO_MAX_HP_BONUS = 10; // [K] Lv.2 grants +10 Max HP to all Biological units
export const HAWKEYE_HEAL_RADIUS = 135;
export const HAWKEYE_HEAL_PER_SEC = 4; // Slow OOC bio heal when not detecting cloak

export const BARRICADE_HP = 620;
export const BARRICADE_ARMOR = 3;
export const BARRICADE_ATTRIBUTES: AttributeTag[] = ['Armored', 'Structure'];

export const JUNGLE_AMBUSH_COST = 0;
export const JUNGLE_AMBUSH_COOLDOWN = 0.1;
export const SQUAD_SELECT_RADIUS = 115;

// Unrestricted parallel research across all distinct tech tracks once tech-tree prerequisites are met
export const MAX_PARALLEL_RESEARCH = 10;

export const BARRACKS_TIERS: BarracksTier[] = [1, 2, 3];
export const BARRACKS_MAX_LEVEL = 4;
export const BARRACKS_ARMOR = 2;
export const BARRACKS_ATTRIBUTES: AttributeTag[] = ['Armored', 'Mechanical', 'Structure'];

export const BARRACKS_DEFS: Record<
  BarracksTier,
  {
    tier: BarracksTier;
    name: string;
    shortName: string;
    unitIndices: number[];
    hotkeysLabel: string;
    cost: number;
    buildTime: number;
    hp: number;
    lv2Cost: number;
    lv2Time: number;
    lv2Hp: number;
    lv3Cost: number;
    lv3Time: number;
    lv3Hp: number;
    lv4Cost: number;
    lv4Time: number;
    lv4Hp: number;
  }
> = {
  1: {
    tier: 1,
    name: '基礎兵營',
    shortName: 'T1營',
    unitIndices: [0, 1, 6], // Includes Ironbound Elite Rifle [Y] at index 6
    hotkeysLabel: 'Q/W/Y',
    cost: 110,
    buildTime: 10.0,
    hp: 280,
    lv2Cost: 135,
    lv2Time: 12.0,
    lv2Hp: 360,
    lv3Cost: 175,
    lv3Time: 15.0,
    lv3Hp: 450,
    lv4Cost: 230,
    lv4Time: 18.0,
    lv4Hp: 550,
  },
  2: {
    tier: 2,
    name: '進階兵營',
    shortName: 'T2營',
    unitIndices: [2, 3, 7], // Includes Ironbound Valkyrie [N] at index 7
    hotkeysLabel: 'E/R/N',
    cost: 140,
    buildTime: 12.0,
    hp: 320,
    lv2Cost: 175,
    lv2Time: 14.0,
    lv2Hp: 410,
    lv3Cost: 225,
    lv3Time: 17.0,
    lv3Hp: 510,
    lv4Cost: 290,
    lv4Time: 20.0,
    lv4Hp: 620,
  },
  3: {
    tier: 3,
    name: '精銳兵營',
    shortName: 'T3營',
    unitIndices: [4, 5, 8], // Includes Ironbound Gunship [M] at index 8
    hotkeysLabel: 'C/V/M',
    cost: 175,
    buildTime: 14.0,
    hp: 360,
    lv2Cost: 220,
    lv2Time: 16.0,
    lv2Hp: 460,
    lv3Cost: 280,
    lv3Time: 19.0,
    lv3Hp: 570,
    lv4Cost: 350,
    lv4Time: 22.0,
    lv4Hp: 690,
  },
};

export function getBarracksNextUpgrade(
  tier: BarracksTier,
  currentLevel: 0 | 1 | 2 | 3 | 4
): { nextLevel: 1 | 2 | 3 | 4; cost: number; time: number; targetHp: number; concurrentSlots: 1 | 2 | 3 | 4 } | null {
  const def = BARRACKS_DEFS[tier];
  if (currentLevel === 0) {
    return { nextLevel: 1, cost: def.cost, time: def.buildTime, targetHp: def.hp, concurrentSlots: 1 };
  }
  if (currentLevel === 1) {
    return { nextLevel: 2, cost: def.lv2Cost, time: def.lv2Time, targetHp: def.lv2Hp, concurrentSlots: 2 };
  }
  if (currentLevel === 2) {
    return { nextLevel: 3, cost: def.lv3Cost, time: def.lv3Time, targetHp: def.lv3Hp, concurrentSlots: 3 };
  }
  if (currentLevel === 3) {
    return { nextLevel: 4, cost: def.lv4Cost, time: def.lv4Time, targetHp: def.lv4Hp, concurrentSlots: 4 };
  }
  return null;
}

export function getBarracksHpForLevel(tier: BarracksTier, level: 0 | 1 | 2 | 3 | 4): number {
  const def = BARRACKS_DEFS[tier];
  if (level <= 0) return 0;
  if (level === 1) return def.hp;
  if (level === 2) return def.lv2Hp;
  if (level === 3) return def.lv3Hp;
  return def.lv4Hp;
}

/**
 * Armory Lv.2 / Lv.3 unlock rule (synchronized across all 3 factions):
 * - Ground / Core tracks (trackA/trackD/trackB/trackE):
 *   Lv.1: T1
 *   Lv.2: T2 OR T1 Barracks >= Lv.2
 *   Lv.3: T3 OR (T2 AND T1 Barracks >= Lv.3)
 * - Air tracks (trackC/trackF): standard T1 / T2 / T3
 */
export function isArmoryLevelUnlocked(
  _faction: FactionId,
  track: ArmoryTrackId,
  nextLevel: 1 | 2 | 3,
  techTier: 1 | 2 | 3,
  t1BarracksLevel: number
): { unlocked: boolean; requirementText: string } {
  if (nextLevel <= 1) return { unlocked: true, requirementText: 'T1' };
  const isGroundOrCore =
    track === 'trackA' || track === 'trackD' || track === 'trackB' || track === 'trackE';
  if (isGroundOrCore) {
    if (nextLevel === 2) {
      return {
        unlocked: techTier >= 2 || t1BarracksLevel >= 2,
        requirementText: 'T2或T1營2',
      };
    }
    return {
      unlocked: techTier >= 3 || (techTier >= 2 && t1BarracksLevel >= 3),
      requirementText: 'T3或T2+T1營3',
    };
  }
  const reqTier = ARMORY_TIER_REQ[nextLevel - 1] ?? 3;
  return {
    unlocked: techTier >= reqTier,
    requirementText: `T${reqTier}`,
  };
}

// 3 destructible Base Barracks sockets in the INNER ring tightly hugging each Nexus (mirror-symmetric for PvP)
export const BARRACKS_COORDS: Array<{
  id: string;
  team: 'player' | 'enemy';
  tier: BarracksTier;
  x: number;
  y: number;
}> = [
  { id: 'bk_p_1', team: 'player', tier: 1, x: 148, y: 342 },
  { id: 'bk_p_2', team: 'player', tier: 2, x: 46, y: 420 },
  { id: 'bk_p_3', team: 'player', tier: 3, x: 148, y: 498 },
  { id: 'bk_e_1', team: 'enemy', tier: 1, x: 1292, y: 342 },
  { id: 'bk_e_2', team: 'enemy', tier: 2, x: 1394, y: 420 },
  { id: 'bk_e_3', team: 'enemy', tier: 3, x: 1292, y: 498 },
];

// Prerequisite Armory Buildings: Bio Lab (Biological upgrades) & Mech Bay (Ground Mech + Air Mech upgrades)
export const ARMORY_BUILDING_KINDS: ArmoryBuildingKind[] = ['bio_lab', 'mech_bay'];
export const ARMORY_BUILDING_ARMOR = 2;
export const ARMORY_BUILDING_ATTRIBUTES: AttributeTag[] = ['Armored', 'Mechanical', 'Structure'];
export const ARMORY_BUILDING_VISION = 105;

export const ARMORY_BUILDING_DEFS: Record<
  ArmoryBuildingKind,
  {
    kind: ArmoryBuildingKind;
    hotkey: string;
    name: string;
    shortName: string;
    cost: number;
    buildTime: number;
    hp: number;
    desc: string;
  }
> = {
  bio_lab: {
    kind: 'bio_lab',
    hotkey: '[',
    name: '生物研究所',
    shortName: '生研',
    cost: 100,
    buildTime: 30.0,
    hp: 300,
    desc: '攻防前置建築（30s）：完工後解鎖【生物攻／防】（鐵砧）、【地面攻／防】（晨曦）或【近戰／遠程攻防】（蟲巢）；建造中連點兩下可取消退費。',
  },
  mech_bay: {
    kind: 'mech_bay',
    hotkey: ']',
    name: '機械軍工廠',
    shortName: '機廠',
    cost: 120,
    buildTime: 32.0,
    hp: 340,
    desc: '攻防前置建築（32s）：完工後共用解鎖【機械／空軍攻防】（鐵砧）、【護盾／空軍攻防】（晨曦）或【飛翼攻／防】（蟲巢）；建造中連點兩下可取消退費。',
  },
};

export function getRequiredArmoryBuilding(faction: FactionId, track: ArmoryTrackId): ArmoryBuildingKind {
  if (faction === 'ironbound') {
    return track === 'trackA' || track === 'trackD' ? 'bio_lab' : 'mech_bay';
  }
  if (faction === 'dawn') {
    // dawn: ground atk/def -> bio_lab; shield cap/armor & air atk/def -> mech_bay
    return track === 'trackA' || track === 'trackD' ? 'bio_lab' : 'mech_bay';
  }
  // swarm: melee & ranged ground evolutions -> bio_lab; flyer air atk/def -> mech_bay
  return track === 'trackC' || track === 'trackF' ? 'mech_bay' : 'bio_lab';
}

export const ARMORY_BUILDING_COORDS: Array<{
  id: string;
  team: 'player' | 'enemy';
  kind: ArmoryBuildingKind;
  x: number;
  y: number;
}> = [
  { id: 'arm_p_bio', team: 'player', kind: 'bio_lab', x: 68, y: 300 },
  { id: 'arm_p_mech', team: 'player', kind: 'mech_bay', x: 68, y: 536 },
  { id: 'arm_e_bio', team: 'enemy', kind: 'bio_lab', x: 1372, y: 300 },
  { id: 'arm_e_mech', team: 'enemy', kind: 'mech_bay', x: 1372, y: 536 },
];

// Gas Extractor Buildings (placed behind Nexus & every Tower Pad; Gold-only build/upgrade; Lv.1..3)
export const GAS_EXTRACTOR_MAX_LEVEL = 3;
export const GAS_EXTRACTOR_ARMOR = 2;
export const GAS_EXTRACTOR_VISION = 95;
export const GAS_EXTRACTOR_ATTRIBUTES: AttributeTag[] = ['Armored', 'Mechanical', 'Structure'];
export const GAS_EXTRACTOR_LEVELS: Record<
  1 | 2 | 3,
  { cost: number; time: number; hp: number; ratePerSec: number }
> = {
  1: { cost: 75, time: 11.0, hp: 260, ratePerSec: 2.5 },
  2: { cost: 105, time: 15.0, hp: 350, ratePerSec: 4.4 },
  3: { cost: 145, time: 20.0, hp: 450, ratePerSec: 6.8 },
};
export const GAS_EXTRACTOR_COST = GAS_EXTRACTOR_LEVELS[1].cost;
export const GAS_EXTRACTOR_UPGRADE_COSTS: Record<1 | 2, number> = {
  1: GAS_EXTRACTOR_LEVELS[2].cost,
  2: GAS_EXTRACTOR_LEVELS[3].cost,
};

export function getGasExtractorNextUpgrade(
  currentLevel: 0 | 1 | 2 | 3
): { nextLevel: 1 | 2 | 3; cost: number; time: number; targetHp: number; ratePerSec: number } | null {
  if (currentLevel >= 3) return null;
  const nextLevel = (currentLevel + 1) as 1 | 2 | 3;
  const cfg = GAS_EXTRACTOR_LEVELS[nextLevel];
  return { nextLevel, cost: cfg.cost, time: cfg.time, targetHp: cfg.hp, ratePerSec: cfg.ratePerSec };
}

export function getGasExtractorHpForLevel(level: 0 | 1 | 2 | 3): number {
  if (level === 0) return 0;
  return GAS_EXTRACTOR_LEVELS[level].hp;
}

export const GAS_EXTRACTOR_COORDS: Array<{
  id: string;
  homeSide: 'player' | 'enemy';
  lane: LaneId | null;
  padId: string | null;
  x: number;
  y: number;
}> = [
  // Player Nexus + Behind every Player Tower Pad
  { id: 'ge_p_nexus', homeSide: 'player', lane: null, padId: null, x: 58, y: 364 },
  { id: 'ge_p_0_inner', homeSide: 'player', lane: 0, padId: 'p_0_inner', x: 256, y: 112 },
  { id: 'ge_p_0_outer', homeSide: 'player', lane: 0, padId: 'p_0_outer', x: 462, y: 66 },
  { id: 'ge_p_1_inner', homeSide: 'player', lane: 1, padId: 'p_1_inner', x: 276, y: 454 },
  { id: 'ge_p_1_outer', homeSide: 'player', lane: 1, padId: 'p_1_outer', x: 482, y: 456 },
  { id: 'ge_p_2_inner', homeSide: 'player', lane: 2, padId: 'p_2_inner', x: 256, y: 728 },
  { id: 'ge_p_2_outer', homeSide: 'player', lane: 2, padId: 'p_2_outer', x: 462, y: 774 },
  // Enemy Nexus + Behind every Enemy Tower Pad (mirror-symmetric x = 1440 - px)
  { id: 'ge_e_nexus', homeSide: 'enemy', lane: null, padId: null, x: 1382, y: 364 },
  { id: 'ge_e_0_inner', homeSide: 'enemy', lane: 0, padId: 'e_0_inner', x: 1184, y: 112 },
  { id: 'ge_e_0_outer', homeSide: 'enemy', lane: 0, padId: 'e_0_outer', x: 978, y: 66 },
  { id: 'ge_e_1_inner', homeSide: 'enemy', lane: 1, padId: 'e_1_inner', x: 1164, y: 454 },
  { id: 'ge_e_1_outer', homeSide: 'enemy', lane: 1, padId: 'e_1_outer', x: 958, y: 456 },
  { id: 'ge_e_2_inner', homeSide: 'enemy', lane: 2, padId: 'e_2_inner', x: 1184, y: 728 },
  { id: 'ge_e_2_outer', homeSide: 'enemy', lane: 2, padId: 'e_2_outer', x: 978, y: 774 },
];

export const LANE_NAMES: Record<LaneId, string> = {
  0: '上路高地',
  1: '中路要道',
  2: '下路幽谷',
};

export const LANE_SHORT_NAMES: Record<LaneId, string> = {
  0: '上路',
  1: '中路',
  2: '下路',
};

// Widely separated 3 lanes (y ≈ 92 / 420 / 748 -> 328px gap between lanes)
export const LANE_WAYPOINTS: Record<LaneId, Vec2[]> = {
  0: [
    { x: 138, y: 345 },
    { x: 245, y: 150 },
    { x: 430, y: 96 },
    { x: 720, y: 88 },
    { x: 1010, y: 96 },
    { x: 1195, y: 150 },
    { x: 1302, y: 345 },
  ],
  1: [
    { x: 162, y: 420 },
    { x: 340, y: 420 },
    { x: 530, y: 420 },
    { x: 720, y: 420 },
    { x: 910, y: 420 },
    { x: 1100, y: 420 },
    { x: 1278, y: 420 },
  ],
  2: [
    { x: 138, y: 495 },
    { x: 245, y: 690 },
    { x: 430, y: 744 },
    { x: 720, y: 752 },
    { x: 1010, y: 744 },
    { x: 1195, y: 690 },
    { x: 1302, y: 495 },
  ],
};

// 8 destructible Supply Depot / Forward Building sockets per side (4 base outer ring + 4 forward road pads, mirror-symmetric for PvP)
export const SUPPLY_DEPOT_COORDS: Array<{
  id: string;
  team: 'player' | 'enemy';
  lane?: LaneId;
  isForward?: boolean;
  x: number;
  y: number;
}> = [
  // Player Base Outer Perimeter
  { id: 'sd_p_0', team: 'player', x: 142, y: 242 },
  { id: 'sd_p_1', team: 'player', x: 224, y: 350 },
  { id: 'sd_p_2', team: 'player', x: 224, y: 490 },
  { id: 'sd_p_3', team: 'player', x: 142, y: 598 },
  // Player Forward Road Building Pads (can build Supply Depots forward along lanes!)
  { id: 'sd_p_4', team: 'player', lane: 0, isForward: true, x: 405, y: 145 },
  { id: 'sd_p_5', team: 'player', lane: 1, isForward: true, x: 425, y: 365 },
  { id: 'sd_p_6', team: 'player', lane: 1, isForward: true, x: 615, y: 470 },
  { id: 'sd_p_7', team: 'player', lane: 2, isForward: true, x: 405, y: 695 },
  // Enemy Base Outer Perimeter (mirrored x = 1440 - px)
  { id: 'sd_e_0', team: 'enemy', x: 1298, y: 242 },
  { id: 'sd_e_1', team: 'enemy', x: 1216, y: 350 },
  { id: 'sd_e_2', team: 'enemy', x: 1216, y: 490 },
  { id: 'sd_e_3', team: 'enemy', x: 1298, y: 598 },
  // Enemy Forward Road Building Pads (mirrored x = 1440 - px)
  { id: 'sd_e_4', team: 'enemy', lane: 0, isForward: true, x: 1035, y: 145 },
  { id: 'sd_e_5', team: 'enemy', lane: 1, isForward: true, x: 1015, y: 365 },
  { id: 'sd_e_6', team: 'enemy', lane: 1, isForward: true, x: 825, y: 470 },
  { id: 'sd_e_7', team: 'enemy', lane: 2, isForward: true, x: 1035, y: 695 },
];

// Finite Sector Gold Reserves (Inner 2200G, Outer 3600G) — must build a tower to start automated mining; contestable by either side!
export const TOWER_PAD_COORDS: Array<{
  id: string;
  homeSide: 'player' | 'enemy';
  lane: LaneId;
  slot: 'inner' | 'outer';
  x: number;
  y: number;
  goldReserveMax: number;
}> = [
  // Player Top
  { id: 'p_0_inner', homeSide: 'player', lane: 0, slot: 'inner', x: 295, y: 132, goldReserveMax: 2200 },
  { id: 'p_0_outer', homeSide: 'player', lane: 0, slot: 'outer', x: 505, y: 92, goldReserveMax: 3600 },
  // Player Mid
  { id: 'p_1_inner', homeSide: 'player', lane: 1, slot: 'inner', x: 320, y: 420, goldReserveMax: 2200 },
  { id: 'p_1_outer', homeSide: 'player', lane: 1, slot: 'outer', x: 525, y: 420, goldReserveMax: 3600 },
  // Player Bot
  { id: 'p_2_inner', homeSide: 'player', lane: 2, slot: 'inner', x: 295, y: 708, goldReserveMax: 2200 },
  { id: 'p_2_outer', homeSide: 'player', lane: 2, slot: 'outer', x: 505, y: 748, goldReserveMax: 3600 },
  // Enemy Top
  { id: 'e_0_inner', homeSide: 'enemy', lane: 0, slot: 'inner', x: 1145, y: 132, goldReserveMax: 2200 },
  { id: 'e_0_outer', homeSide: 'enemy', lane: 0, slot: 'outer', x: 935, y: 92, goldReserveMax: 3600 },
  // Enemy Mid
  { id: 'e_1_inner', homeSide: 'enemy', lane: 1, slot: 'inner', x: 1120, y: 420, goldReserveMax: 2200 },
  { id: 'e_1_outer', homeSide: 'enemy', lane: 1, slot: 'outer', x: 915, y: 420, goldReserveMax: 3600 },
  // Enemy Bot
  { id: 'e_2_inner', homeSide: 'enemy', lane: 2, slot: 'inner', x: 1145, y: 708, goldReserveMax: 2200 },
  { id: 'e_2_outer', homeSide: 'enemy', lane: 2, slot: 'outer', x: 935, y: 748, goldReserveMax: 3600 },
];

export const LANE_MID_COORDS: Record<LaneId, Vec2> = {
  0: { x: 720, y: 88 },
  1: { x: 720, y: 420 },
  2: { x: 720, y: 752 },
};

export const JUNGLE_CENTERS: Record<JungleZoneId, Vec2> = {
  upper: { x: 720, y: 254 },
  lower: { x: 720, y: 586 },
  center: { x: 720, y: 420 },
};

export const JUNGLE_NODE_COORDS: Array<{
  id: string;
  jungleZone: JungleZoneId;
  lane: LaneId;
  x: number;
  y: number;
  role: 'rich_vein' | 'beacon' | 'creep_west' | 'creep_east';
}> = [
  { id: 'jg_up_center', jungleZone: 'upper', lane: 0, x: 720, y: 254, role: 'rich_vein' },
  { id: 'jg_lo_center', jungleZone: 'lower', lane: 2, x: 720, y: 586, role: 'beacon' },
  { id: 'jg_up_west', jungleZone: 'upper', lane: 0, x: 540, y: 254, role: 'creep_west' },
  { id: 'jg_lo_east', jungleZone: 'lower', lane: 2, x: 900, y: 586, role: 'creep_east' },
];

// Single spacious Central Jungle for Simple 2-Lane Mode (mirror-symmetric for fair PvP & clear ambush corridors)
export const SIMPLE_JUNGLE_NODE_COORDS: Array<{
  id: string;
  jungleZone: JungleZoneId;
  lane: LaneId;
  x: number;
  y: number;
  role: 'rich_vein' | 'beacon' | 'creep_west' | 'creep_east';
}> = [
  { id: 'jg_mid_vein', jungleZone: 'center', lane: 0, x: 720, y: 348, role: 'rich_vein' },
  { id: 'jg_mid_beacon', jungleZone: 'center', lane: 2, x: 720, y: 492, role: 'beacon' },
  { id: 'jg_mid_west', jungleZone: 'center', lane: 0, x: 515, y: 420, role: 'creep_west' },
  { id: 'jg_mid_east', jungleZone: 'center', lane: 2, x: 925, y: 420, role: 'creep_east' },
];

export const OBJECTIVE_META: Record<ObjectiveKind, { name: string; desc: string }> = {
  crystal_vein: {
    name: '野區富晶礦脈',
    desc: '佔領後自動開採（基礎 8.5G/s × 採礦科技倍率，蘊含 4500G 巨量富礦），並計入控區解鎖補給站上限；敵軍靠近 180px 內會隨距離線性降低開採效率（-20% 至 -85%）',
  },
  barricade: {
    name: '遠古路障',
    desc: '封鎖該邊路地面通道（空軍可直接飛越），620HP / 3甲，帶 [重甲·建築] 標籤；擊毀獲得 +110G 並永久打通通道',
  },
  creep_camp: {
    name: '野區魔獸營地',
    desc: '清剿全營野怪獲得 +110G 與全軍 18 秒鼓舞（移速+15%、攻擊間隔縮短至86%、每發+2固定傷害）；清剿後 85 秒重生',
  },
  ancient_beacon: {
    name: '野區古塔遺跡',
    desc: '佔領後提供中央野區大範圍反隱視野（揭露潛行單位與野區奇襲動向），並計入控區解鎖補給站上限',
  },
};

// Pure integer permille scaling for tower HP, range & attack interval (damage & armor scale linearly!)
export const TOWER_LEVEL_SCALING = {
  1: { hpPermille: 1000, rangePermille: 1000, intervalPermille: 1000, visionBonus: 0 },
  2: { hpPermille: 1450, rangePermille: 1080, intervalPermille: 960, visionBonus: 20 },
  3: { hpPermille: 1950, rangePermille: 1160, intervalPermille: 900, visionBonus: 35 },
} as const;

export const TOWER_MINING_UPGRADE_BONUS = 0.45; // +45% mining rate per mining-path upgrade on any tower
export const TOWER_TECH_CD_RATE_BY_LV = [0, 0.18, 0.30] as const; // Active & scan CD rate bonus per tower 'tech' upgrade level
export const TOWER_TECH_LV2_BONUS_DMG = 8; // Flat bonus weapon damage when a tower reaches techLevel === 2
// T2 / T3 global tech-tier tower HP & weapon damage scaling
export const TOWER_TECH_TIER_HP_PERMILLE: Record<1 | 2 | 3, number> = { 1: 1000, 2: 1180, 3: 1380 };
export const TOWER_TECH_TIER_DMG_BONUS: Record<1 | 2 | 3, number> = { 1: 0, 2: 3, 3: 7 };
export const TECH_TOWER_CD_RATE_BY_LV = [0, 0.14, 0.24, 0.36] as const; // Cooldown speed bonus per standing tech tower
export const TECH_TOWER_RES_RATE_BY_LV = [0, 0.08, 0.14, 0.2] as const; // Research speed bonus per standing tech tower
export const TECH_TOWER_MAX_CD_BONUS = 1.0; // Max +100% cooldown rate (= -50% effective CD)
export const TECH_TOWER_MAX_RES_BONUS = 0.45; // Max +45% research speed
export const ECON_TOWER_MINING_MULT_BY_LV = [1.0, 1.65, 2.15, 2.75] as const;

export function getTowerUpgradeCostAndTime(
  type: TowerType,
  nextTotalLevel: 2 | 3,
  mode: TowerUpgradeMode
): { cost: number; time: number } {
  const def = TOWER_DEFS[type];
  const baseCost = nextTotalLevel === 2 ? def.upgradeCostLv2 : def.upgradeCostLv3;
  const baseTime = nextTotalLevel === 2 ? def.upgradeTimeLv2 : def.upgradeTimeLv3;
  if (mode === 'mining') {
    return {
      cost: Math.round(baseCost * 0.85),
      time: Number((baseTime * 0.85).toFixed(1)),
    };
  }
  if (mode === 'tech') {
    return {
      cost: Math.round(baseCost * 1.05),
      time: baseTime,
    };
  }
  return { cost: baseCost, time: baseTime };
}

export function getTowerLevelStats(type: TowerType, level: 1 | 2 | 3, techTier: 1 | 2 | 3 = 1) {
  const def = TOWER_DEFS[type];
  const sc = TOWER_LEVEL_SCALING[level];
  const tierHpPermille = TOWER_TECH_TIER_HP_PERMILLE[techTier];
  const tierDmgBonus = TOWER_TECH_TIER_DMG_BONUS[techTier];
  const lvBonus = level - 1;
  const hp = Math.round((((def.hp * sc.hpPermille) / 1000) * tierHpPermille) / 1000);
  const armor = def.armor + lvBonus * def.armorPerLevel;
  const damage = def.damage > 0 ? def.damage + tierDmgBonus + lvBonus * def.damagePerLevel : 0;
  const attackCount = def.attackCount;
  const attackIntervalMs =
    def.attackIntervalMs > 0
      ? scaleAttackIntervalMs(def.attackIntervalMs, sc.intervalPermille)
      : 0;
  const attackRate = attackIntervalMs > 0 ? Number((1000 / attackIntervalMs).toFixed(2)) : 0;
  const bonusVsTag: Partial<Record<AttributeTag, number>> = {};
  for (const [k, baseVal] of Object.entries(def.bonusVsTag ?? {})) {
    const tag = k as AttributeTag;
    if (baseVal !== undefined) {
      const perLv = def.bonusPerLevelVsTag?.[tag] ?? 0;
      bonusVsTag[tag] = baseVal + lvBonus * perLv;
    }
  }
  const dps =
    attackIntervalMs > 0 && damage > 0
      ? Number((computeBaseDpsFp(toFp(damage), attackCount, attackIntervalMs) / FP_SCALE).toFixed(1))
      : 0;
  return {
    hp,
    armor,
    damage,
    attackCount,
    attackIntervalMs,
    attackRate,
    bonusVsTag,
    dps,
    range: def.range > 0 ? Math.round((def.range * sc.rangePermille) / 1000) : 0,
    vision: def.vision + sc.visionBonus,
  };
}

export const TOWER_DEFS: Record<TowerType, TowerDef> = {
  watchtower: {
    type: 'watchtower',
    name: '瞭望哨塔',
    shortLabel: '哨塔',
    shortDesc: '廣域偵查 · 對輕甲 +5 · 對空 · 視野195',
    strengths:
      '全塔最廣視野（195）且可對空，Lv.1 基礎 6 傷（對 [輕甲] +5），升級後每級 +4 傷／+3 對輕甲加成；建造耗時 20s 且施工時雙防統一為 0（脆弱）。基礎不帶反隱，需透過【⚡科技】升級才獲得偵隱能力。',
    cost: 115,
    upgradeCostLv2: 145,
    upgradeCostLv3: 210,
    buildTime: 20.0,
    upgradeTimeLv2: 20.0,
    upgradeTimeLv3: 28.0,
    hp: 360,
    armor: 2,
    armorPerLevel: 1,
    attributes: ['Armored', 'Mechanical', 'Structure'],
    damage: 6,
    damagePerLevel: 4,
    attackCount: 1,
    attackIntervalMs: 900,
    attackRate: 1.11,
    bonusVsTag: { Light: 5 },
    bonusPerLevelVsTag: { Light: 3 },
    range: 162,
    vision: 195,
    detector: false,
    canHitAir: true,
  },
  artillery: {
    type: 'artillery',
    name: '重砲堡壘',
    shortLabel: '重砲',
    shortDesc: '僅對地 · 對輕甲 +10 · 60px重濺射',
    strengths:
      '超長射程（188）、3 基礎裝甲與 60px 大範圍濺射，Lv.1 基礎 14 傷（對 [輕甲] +10），升級後大幅提升（每級 +8 傷／+5 對輕甲）；施工耗時長達 24s 且施工期雙防為 0（脆弱）、無法對空（鐵砧專屬[L]可解鎖對空）。',
    cost: 155,
    upgradeCostLv2: 175,
    upgradeCostLv3: 245,
    buildTime: 24.0,
    upgradeTimeLv2: 24.0,
    upgradeTimeLv3: 32.0,
    hp: 480,
    armor: 3,
    armorPerLevel: 1,
    attributes: ['Armored', 'Mechanical', 'Structure'],
    damage: 14,
    damagePerLevel: 8,
    attackCount: 1,
    attackIntervalMs: 2050,
    attackRate: 0.49,
    bonusVsTag: { Light: 10 },
    bonusPerLevelVsTag: { Light: 5 },
    range: 188,
    vision: 120,
    detector: false,
    canHitAir: false,
    splashRadius: 60,
  },
  tech_tower: {
    type: 'tech_tower',
    name: '戰術科技塔',
    shortLabel: '科技',
    shortDesc: '減主動/掃描CD · 加速研發 · 輕自衛',
    strengths:
      '鐵砧玄武鐵龜核心！完工後每座提供主動技/掃描冷卻流速 +14%/24%/36%（上限-50%CD）與全科技研發加速 +8%/14%/20%（上限+45%），Lv.1 僅具輕量自衛雷射（5 基礎傷害），施工 22s 期間雙防為 0（脆弱）且暫停光環。',
    cost: 140,
    upgradeCostLv2: 160,
    upgradeCostLv3: 225,
    buildTime: 22.0,
    upgradeTimeLv2: 22.0,
    upgradeTimeLv3: 30.0,
    hp: 400,
    armor: 2,
    armorPerLevel: 1,
    attributes: ['Armored', 'Mechanical', 'Structure'],
    damage: 5,
    damagePerLevel: 4,
    attackCount: 1,
    attackIntervalMs: 1150,
    attackRate: 0.87,
    bonusVsTag: {},
    bonusPerLevelVsTag: {},
    range: 145,
    vision: 135,
    detector: false,
    canHitAir: true,
    techCdBonus: 0.14,
    techResearchBonus: 0.08,
  },
  econ_tower: {
    type: 'econ_tower',
    name: '資源採礦塔',
    shortLabel: '經濟',
    shortDesc: '無戰鬥傷害 · 挖礦速率 ×1.65~2.75',
    strengths:
      '零戰鬥攻擊與特效，但能將該塔區開採效率大幅拉升至 ×1.65（Lv.2 ×2.15 / Lv.3 ×2.75），配合升級「擴礦」更可極速掏金；施工需 21s 且期間雙防統一為 0（脆弱），無兵保護時極易被快攻或奇襲白拆！',
    cost: 125,
    upgradeCostLv2: 145,
    upgradeCostLv3: 205,
    buildTime: 21.0,
    upgradeTimeLv2: 20.0,
    upgradeTimeLv3: 28.0,
    hp: 380,
    armor: 2,
    armorPerLevel: 1,
    attributes: ['Armored', 'Mechanical', 'Structure'],
    damage: 0,
    damagePerLevel: 0,
    attackCount: 0,
    attackIntervalMs: 0,
    attackRate: 0,
    bonusVsTag: {},
    bonusPerLevelVsTag: {},
    range: 0,
    vision: 115,
    detector: false,
    canHitAir: false,
    miningRateMult: 1.65,
  },
  disruptor: {
    type: 'disruptor',
    name: '干擾力場塔',
    shortLabel: '干擾',
    shortDesc: '對空 · 緩速45% · 對靈能+6 / 重甲+4',
    strengths:
      '可同時鎖定陸空目標並施加強力緩速（移速 -45%、攻擊間隔 +35%），Lv.1 基礎 7 傷（對 [靈能] +6 / [重甲] +4），升級後火力明顯成長；施工 22s 期間雙防為 0（脆弱），擅長成型後壓制靈能護盾部隊與重裝突防。',
    cost: 135,
    upgradeCostLv2: 155,
    upgradeCostLv3: 220,
    buildTime: 22.0,
    upgradeTimeLv2: 21.0,
    upgradeTimeLv3: 29.0,
    hp: 420,
    armor: 2,
    armorPerLevel: 1,
    attributes: ['Armored', 'Mechanical', 'Structure'],
    damage: 7,
    damagePerLevel: 4,
    attackCount: 1,
    attackIntervalMs: 1250,
    attackRate: 0.8,
    bonusVsTag: { Psionic: 6, Armored: 4 },
    bonusPerLevelVsTag: { Psionic: 3, Armored: 3 },
    range: 170,
    vision: 128,
    detector: false,
    canHitAir: true,
    slowFactor: 0.52,
  },
};

// Smooth 8-level economy curve (0/0/0/1/2/3/4 towers) + deliberate research times + tower discount (-10%/tower, max -50%)
export const ECON_MAX_LEVEL = 8;
export const ECON_BASE_MINE_RATE = [0, 6.8, 8.8, 11.0, 13.5, 16.2, 19.2, 22.5, 26.0];
export const ECON_TOWER_BONUS_MULT = [0, 1.0, 1.2, 1.42, 1.66, 1.92, 2.2, 2.5, 2.85];
export const ECON_UPGRADE_COSTS = [0, 105, 155, 210, 270, 335, 405, 480];
export const ECON_UPGRADE_TIMES = [0, 13.0, 17.0, 21.0, 26.0, 31.0, 37.0, 44.0];
export const ECON_REQUIRED_TOWERS = [0, 0, 0, 0, 1, 2, 3, 4];
export const ECON_TOWER_DISCOUNT_PER_TOWER = 0.1;
export const ECON_TOWER_DISCOUNT_MAX = 0.5;

export function getEconUpgradeCost(
  currentLevel: number,
  standingTowers: number
): { cost: number; baseCost: number; discountPct: number } | null {
  if (currentLevel >= ECON_MAX_LEVEL) return null;
  const baseCost = ECON_UPGRADE_COSTS[currentLevel] ?? 480;
  const discount = Math.min(ECON_TOWER_DISCOUNT_MAX, Math.max(0, standingTowers) * ECON_TOWER_DISCOUNT_PER_TOWER);
  const cost = Math.round(baseCost * (1 - discount));
  return { cost, baseCost, discountPct: Math.round(discount * 100) };
}

// Tech tiers: T2 costs Gold only (0 Gas); T3 requires both Gold & Gas!
export const TECH_UPGRADE_COSTS: Record<1 | 2, number> = { 1: 280, 2: 480 };
export const TECH_UPGRADE_GAS_COSTS: Record<1 | 2, number> = { 1: 0, 2: 180 };
export const TECH_UPGRADE_TIMES: Record<1 | 2, number> = { 1: 36.0, 2: 56.0 };
export const TECH_SUPPLY_BY_TIER: Record<1 | 2 | 3, number> = { 1: 20, 2: 32, 3: 44 };

// Armory tech tree requirement: Lv.1 at T1, Lv.2 at T2, Lv.3 at T3 (players freely design T1/T2/T3 timing builds!)
export const ARMORY_TIER_REQ = [1, 2, 3] as const;

export const DIFFICULTY_ORDER: Difficulty[] = ['rookie', 'standard', 'commander'];

export const DIFFICULTY_META: Record<Difficulty, { name: string; shortName: string; desc: string }> = {
  rookie: {
    name: '初級（新手練習）',
    shortName: '初級',
    desc: '決策較慢（3.6s）、採礦略減（90%）、較少搶野區與抓空窗，適合熟悉五種戰術與練習反制。',
  },
  standard: {
    name: '中級（標準實戰）',
    shortName: '中級',
    desc: '完全公平資源（100%）、標準節奏（2.15s），完整執行五套鐵砧聯邦戰術流程、升級與戰術技。',
  },
  commander: {
    name: '高級（精英指揮）',
    shortName: '高級',
    desc: '高速應變（1.35s）、開局 +20G 與 112% 採礦，精準抓蓋塔空窗、軌道砲轟兵團與生化攻防 Timing 強推。',
  },
};

export const AI_ARCHETYPE_ORDER: AIArchetype[] = [
  'iron_rush',
  'iron_turtle',
  'iron_air_siege',
  'iron_mech',
  'iron_bio',
];

export const AI_ARCHETYPE_LABELS: Record<
  AIArchetype,
  { name: string; shortName: string; desc: string; counterHint: string }
> = {
  iron_rush: {
    name: '① 步槍快攻',
    shortName: '步槍快攻',
    desc: '前期跳過挖礦與跳本，直造大量步槍小隊＋T1 兵營雙倍產兵，專門懲罰無防備蓋塔、早升挖礦或速跳科技。',
    counterHint: '反制要點：開局先穩出步槍＋鐵壁盾衛（3甲直扣步槍單發傷害）掩護重砲塔成型，再以對輕甲濺射或 AOE 清場。',
  },
  iron_turtle: {
    name: '② 玄武鐵龜陣',
    shortName: '玄武鐵龜',
    desc: '放棄早期基本兵升級，快速鋪設哨塔／重砲塔／科技塔／經濟塔並升級，靠專屬[K][L]與高頻軌道支援拖入 T3 大後期。',
    counterHint: '反制要點：把握蓋塔與升級塔期間「零功用空窗」強拆，或早派生化部隊控野區＋攻城迫擊砲（對建築+24）遠程點拆。',
  },
  iron_air_siege: {
    name: '③ 空對地奇招流',
    shortName: '空對地奇招',
    desc: '前期極簡守家、最快速度直跳 T2 造女武神戰機（雙發連射）與少量迫擊砲，專打沒偵查、缺對空與無遠程解法的防線。',
    counterHint: '反制要點：用掃描[S]偵查對手跳本訊號，盡早於外圍補哨塔（對輕甲+7）並預留步槍／精銳小隊或防空雷達[L]反制空軍。',
  },
  iron_mech: {
    name: '④ 重甲推進流',
    shortName: '重甲推進',
    desc: '完全放棄輕甲單位與輕甲攻防，前期龜家升採礦與科技，專攻重甲攻防＋盾衛與泰坦機甲形成高甲巨牆平推。',
    counterHint: '反制要點：趁成型前快攻壓制，或以對 [重甲] +11 固定加成的精銳小隊[Y]、對重甲 +18 的天穹砲艇[C]突破高裝甲防線。',
  },
  iron_bio: {
    name: '⑤ 生化部隊陣',
    shortName: '生化部隊',
    desc: '以步槍＋精銳小隊為主力，前期小隊偵查並搶打野區事件兼升挖礦；T1 兵營升 Lv.2 分開冷卻後，每次輕甲攻防升完即打一波 Timing 壓境。',
    counterHint: '反制要點：提早佈置重砲塔（對輕甲+14濺射）／鐵壁盾衛／泰坦機甲，並留軌道火力支援[F]在對手攻防升完的 Timing 點精準清場。',
  },
};

export interface ArchetypeMatrixRow {
  role: UnitArchetypeRole;
  title: string;
  specRef: string;
  exampleUnits: string;
  attackProfile: string;
  damageStructure: string;
  tacticalLogic: string;
  numericalExample: string;
}

/** Exact Fixed-Point (×1000) reference templates for the 4 Classic RTS Archetypes */
export const CLASSIC_ARCHETYPE_PRESETS = {
  rapid_light: {
    id: 'preset_rapid_light',
    name: '高頻輕裝步兵（陸戰隊／步槍小隊）',
    attributes: ['Light', 'Biological'] as AttributeTag[],
    maxHpFp: 48_000,
    baseArmorFp: 0,
    armorPerUpgradeFp: 1_000,
    baseDamageFp: 6_000,
    damagePerUpgradeFp: 1_000,
    bonusVsTagFp: {} as Partial<Record<AttributeTag, number>>,
    attackCount: 1,
    attackIntervalMs: 800,
  },
  anti_light_aoe: {
    id: 'preset_anti_light_aoe',
    name: '反輕甲清場單位（噴火兵／巨像／迫擊砲）',
    attributes: ['Armored', 'Mechanical'] as AttributeTag[],
    maxHpFp: 125_000,
    baseArmorFp: 1_000,
    armorPerUpgradeFp: 1_000,
    baseDamageFp: 8_000,
    damagePerUpgradeFp: 1_000,
    bonusVsTagFp: { Light: 6_000 } as Partial<Record<AttributeTag, number>>,
    attackCount: 1,
    attackIntervalMs: 1_500,
  },
  anti_armored: {
    id: 'preset_anti_armored',
    name: '反重甲攻堅單位（掠奪者／不朽者／精銳小隊）',
    attributes: ['Armored'] as AttributeTag[],
    maxHpFp: 125_000,
    baseArmorFp: 1_000,
    armorPerUpgradeFp: 1_000,
    baseDamageFp: 10_000,
    damagePerUpgradeFp: 1_000,
    bonusVsTagFp: { Armored: 10_000 } as Partial<Record<AttributeTag, number>>,
    bonusPerUpgradeVsTagFp: { Armored: 1_000 } as Partial<Record<AttributeTag, number>>,
    attackCount: 1,
    attackIntervalMs: 1_400,
  },
  heavy_behemoth: {
    id: 'preset_heavy_behemoth',
    name: '高防重裝巨獸（雷獸／重型坦克／泰坦機甲）',
    attributes: ['Armored', 'Massive'] as AttributeTag[],
    maxHpFp: 520_000,
    baseArmorFp: 3_000,
    armorPerUpgradeFp: 1_000,
    baseDamageFp: 35_000,
    damagePerUpgradeFp: 3_000,
    bonusVsTagFp: {} as Partial<Record<AttributeTag, number>>,
    attackCount: 1,
    attackIntervalMs: 1_650,
  },
} as const;

export const CLASSIC_ARCHETYPE_MATRIX: ArchetypeMatrixRow[] = [
  {
    role: 'rapid_light',
    title: '① 高頻輕裝步兵',
    specRef: '如：陸戰隊',
    exampleUnits: '步槍小隊 [Q] · 光刃斥候 [Q] · 疾爪蟲群 [Q]',
    attackProfile: '高攻速、低單發傷害（0.72~0.85s）',
    damageStructure: '基礎傷: 6 · 加成: 無 · 裝甲: 0（輕甲／生物）',
    tacticalLogic:
      '靠數量與高 DPS 壓制無甲／低甲目標；面對高裝甲單位時傷害會被線性減法大幅削弱，極度依賴 +1~+3 攻防差臨界點（Breakpoint）。',
    numericalExample:
      '步槍(6攻)打 0甲步槍(48血)=8發擊殺，升+1攻(7攻)縮短為 7發；但打滿防 6甲泰坦 = max(0.5, 6-6) = 0.5 保底傷害！',
  },
  {
    role: 'anti_light_aoe',
    title: '② 反輕甲清場單位',
    specRef: '如：噴火兵／巨像',
    exampleUnits: '攻城迫擊砲 [E] · 女武神戰機 [R] · 聖陽巨像 [V] · 重砲堡壘',
    attackProfile: '範圍濺射（AOE）或雙發高輕甲加成',
    damageStructure: '基礎傷: 8~16 · 對 Light 加成: +6~+14 · 裝甲: 1（重甲／機械）',
    tacticalLogic:
      '專殺高密度、低血量的輕甲人海（如步槍海／蟲海），範圍內每個輕甲目標同時吃滿對 Light 固定加成；但對高甲重裝單位輸出效率極低。',
    numericalExample:
      '原型(8 + 6對輕甲 = 14)掃射 0甲輕甲群滿傷清場；對 3甲重裝僅 8-3 = 5 傷。雙發女武神(6+5輕)×2打0甲=22，打3甲=(6-3)×2=6！',
  },
  {
    role: 'anti_armored',
    title: '③ 反重甲攻堅單位',
    specRef: '如：掠奪者／不朽者',
    exampleUnits: '精銳小隊 [Y] · 天穹砲艇 [C] · 星輝射手 [W] · 酸液噴吐蟲 [W]',
    attackProfile: '低攻速、單體重擊（1.35~1.65s）',
    damageStructure: '基礎傷: 10 · 對 Armored 加成: +10 · 裝甲: 1（每級再 +1基礎 / +1對重甲）',
    tacticalLogic:
      '專拆高血量、高裝甲主力與建築（帶 Armored 標籤）；但面對大量輕甲雜兵時無法觸發加成，會因攻速慢與傷害溢出而吃虧。',
    numericalExample:
      '精銳小隊(10 + 10對重甲 = 20)打 3甲泰坦/盾衛 = 17.0/發（3人編隊一輪 51 傷）；打 0甲步槍僅 10.0/發且射速慢於步槍。',
  },
  {
    role: 'heavy_behemoth',
    title: '④ 高防重裝巨獸',
    specRef: '如：雷獸／重型坦克',
    exampleUnits: '泰坦重裝機甲 [V] · 鐵壁盾衛 [W] · 甲殼衝鋒獸 [C] · 輝光騎士 [C]',
    attackProfile: '高基礎裝甲（3~4甲）+ 範圍順劈或重砲',
    damageStructure: '基礎傷: 35（泰坦）· 基礎裝甲: 3（重甲／巨型，滿防升至 6 甲）',
    tacticalLogic:
      '免疫高頻低傷單位的集火（將 6 傷輕步兵壓制至 0.5 保底傷害），正面輾壓純輕甲海，逼迫對手必須轉型出「反重甲攻堅單位」。',
    numericalExample:
      '泰坦(35傷、3基礎甲)升滿+3重防達 6甲，0攻步槍單發剩 0.5 保底；必須靠精銳小隊(+10重甲)或天穹砲艇(+18重甲)貫穿！',
  },
];

export const FACTIONS: Record<FactionId, FactionDef> = {
  ironbound: {
    id: 'ironbound',
    name: '鐵砧聯邦',
    subtitle: '基準戰術 · 四塔三線升級 · 六系線性攻防',
    accentHex: '#3B82F6',
    accentLightHex: '#93C5FD',
    emblemPath: '/src/assets/images/emblem_ironbound_1795427354498.jpg',
    passiveName: '堅壁雷達',
    passiveDesc: '戰鬥防禦塔射程 +15%、視野 +20；戰術掃描冷卻縮短至 40 秒（精準小範圍 128px 偵查，基準節奏）。',
    activeName: '軌道火力支援',
    activeDesc:
      '開局 65s 冷卻，消耗 95G 對 72px 區域發動基礎 6 波軌道砲擊（每波 0.55s，6 基礎傷 +4 對[輕甲] +5 對[建築]，增傷照算；每升級 1 次金礦或瓦斯場額外 +1 波）。⚠ 注意：砲擊會誤傷範圍內友軍！',
    activeCooldown: 55,
    activeCost: 95,
    scanCooldown: 40,
    scanRadius: 128,
    scanDuration: 8.5,
    towerTypes: ['watchtower', 'artillery', 'tech_tower', 'econ_tower'],
    armorySummary: '生物／機械／空軍三大系 · 攻防分開線性升級（共六項，皆耗金與瓦斯）',
    armoryTrackOrder: ['trackA', 'trackD', 'trackB', 'trackE', 'trackC', 'trackF'],
    armoryTracks: {
      trackA: {
        id: 'trackA',
        hotkey: 'G',
        shortName: '生物攻',
        name: '生物武器強化（攻）',
        desc: '地面生物單位（步槍小隊／鐵壁盾衛／精銳小隊）武器等級 +1：Lv.2 需 T2 或 T1 營二級，Lv.3 需 T3 或 T2+T1 營三級',
        costs: [115, 195, 290],
        gasCosts: [75, 130, 200],
        times: [21.0, 31.0, 42.0],
      },
      trackD: {
        id: 'trackD',
        hotkey: 'U',
        shortName: '生物防',
        name: '生物護甲強化（防）',
        desc: '地面生物單位（步槍小隊／鐵壁盾衛／精銳小隊）裝甲等級 +1：Lv.2 需 T2 或 T1 營二級，Lv.3 需 T3 或 T2+T1 營三級',
        costs: [115, 195, 290],
        gasCosts: [75, 130, 200],
        times: [21.0, 31.0, 42.0],
      },
      trackB: {
        id: 'trackB',
        hotkey: 'H',
        shortName: '機械攻',
        name: '機械火砲強化（攻）',
        desc: '地面機械單位（火焰兵／攻城迫擊砲／泰坦機甲）武器等級 +1：Lv.2 需 T2 或 T1 營二級，Lv.3 需 T3 或 T2+T1 營三級',
        costs: [125, 210, 310],
        gasCosts: [90, 155, 235],
        times: [22.0, 33.0, 44.0],
      },
      trackE: {
        id: 'trackE',
        hotkey: 'I',
        shortName: '機械防',
        name: '機械裝甲強化（防）',
        desc: '地面機械單位（火焰兵／攻城迫擊砲／泰坦機甲）裝甲等級 +1：Lv.2 需 T2 或 T1 營二級，Lv.3 需 T3 或 T2+T1 營三級',
        costs: [125, 210, 310],
        gasCosts: [90, 155, 235],
        times: [22.0, 33.0, 44.0],
      },
      trackC: {
        id: 'trackC',
        hotkey: 'J',
        shortName: '空軍攻',
        name: '空軍航電火控（攻）',
        desc: '空中單位（鷹眼偵察機／女武神戰機／天穹砲艇）武器等級 +1：每級線性提升基礎攻與標籤加成（射程 +5%）',
        costs: [120, 205, 305],
        gasCosts: [90, 155, 235],
        times: [22.0, 32.0, 43.0],
      },
      trackF: {
        id: 'trackF',
        hotkey: 'O',
        shortName: '空軍防',
        name: '空軍複合機體（防）',
        desc: '空中單位（鷹眼偵察機／女武神戰機／天穹砲艇）裝甲等級 +1：每級 +1 本體裝甲與 +1 護盾裝甲',
        costs: [120, 205, 305],
        gasCosts: [90, 155, 235],
        times: [22.0, 32.0, 43.0],
      },
    },
    specialTechs: [
      {
        slot: 0,
        hotkey: 'K',
        tierReq: 2,
        name: '戰術激勵模組 I',
        shortName: '激勵I',
        desc: 'T2可研：解鎖主動技 [K]（免費，28s CD，科技塔加速）。對 105px 內友軍施放：[生物]扣 10% 生命換取 3s 士氣鼓舞（移速 +28%、攻速 +35%、+2 傷害）；[機械/空軍]原地架設無法移動 3s，射程 +35%、傷害 +6。',
        cost: 200,
        gasCost: 90,
        time: 32.0,
        level2: {
          tierReq: 3,
          name: '生物體質強化 II',
          shortName: '激勵II',
          desc: 'T3可研（於 [K] 冷卻中再次點擊 K 升級）：所有我方[生物]單位最大生命永久 +10（場上與新產皆生效）。',
          cost: 260,
          gasCost: 140,
          time: 38.0,
        },
      },
      {
        slot: 1,
        hotkey: 'L',
        tierReq: 2,
        name: '堡壘防空與科技網 I',
        shortName: '防空科技I',
        desc: 'T2可研：解鎖全塔對空（重砲獲高砲 12+3/級、+6對輕甲）與防禦塔【⚡科技】升級路線；全塔視野 +14、射程 +6%、護甲 +1（T3可續升II階）。',
        cost: 225,
        gasCost: 100,
        time: 38.0,
        level2: {
          tierReq: 3,
          name: '堡壘防空與科技網 II',
          shortName: '防空科技II',
          desc: '重砲對空改用完整主砲火力；全塔視野累計 +26、射程累計 +12%、護甲累計 +2，全面封鎖敵軍空襲。',
          cost: 320,
          gasCost: 160,
          time: 54.0,
        },
      },
    ],
    units: [
      {
        id: 'iron_rifle',
        faction: 'ironbound',
        hotkey: 'Q',
        name: '步槍小隊',
        archetypeRole: 'rapid_light',
        roleLabel: '高頻輕裝步兵 ×3',
        counterNote: '0.80s 高頻連射（6攻/0甲）· 陸空兼顧 · 快攻與生化主力',
        weakAgainstNote: '6 基礎傷遇高甲重裝輸出大幅削減；懼怕火焰兵與迫擊砲濺射',
        specialEffectNote: '【輕甲·生物】吃生物攻/防，受 [K] 士氣鼓舞 (+10血) 與鷹眼非戰回血',
        tier: 1,
        cost: 60,
        gasCost: 0,
        trainTime: 5.2,
        supplyCost: 3,
        squadSize: 3,
        hp: 48,
        shield: 0,
        armor: 0,
        armorPerLevel: 1,
        attributes: ['Light', 'Biological'],
        armorClass: 'light',
        domain: 'ground',
        combatRange: 'ranged',
        canHitAir: true,
        damage: 6,
        damagePerLevel: 1,
        attackCount: 1,
        attackIntervalMs: 800,
        attackRate: 1.25,
        bonusVsTag: {},
        bonusPerLevelVsTag: {},
        range: 122,
        speed: 27,
        vision: 152,
        shape: 'rifle',
      },
      {
        id: 'iron_mech',
        faction: 'ironbound',
        hotkey: 'W',
        name: '鐵壁盾衛',
        archetypeRole: 'heavy_behemoth',
        roleLabel: '重甲生物前鋒 ×1',
        counterNote: '3 基礎裝甲抗線 · 對[輕甲] +6 · 生物體系核心重甲前排',
        weakAgainstNote: '無法對空；懼怕反重甲標籤加成武器（精銳小隊 +8、天穹砲艇 +18）',
        specialEffectNote: '【重甲·生物】吃生物攻／生物防！受 [K] 士氣鼓舞 (+10血) 與鷹眼非戰回血',
        tier: 1,
        cost: 85,
        gasCost: 15,
        trainTime: 7.0,
        supplyCost: 3,
        squadSize: 1,
        hp: 230,
        shield: 0,
        armor: 3,
        armorPerLevel: 1,
        attributes: ['Armored', 'Biological'],
        armorClass: 'heavy',
        domain: 'ground',
        combatRange: 'melee',
        canHitAir: false,
        damage: 14,
        damagePerLevel: 2,
        attackCount: 1,
        attackIntervalMs: 1350,
        attackRate: 0.74,
        bonusVsTag: { Light: 6 },
        bonusPerLevelVsTag: { Light: 1 },
        range: 44,
        speed: 23,
        vision: 120,
        shape: 'mech',
      },
      {
        id: 'iron_mortar',
        faction: 'ironbound',
        hotkey: 'E',
        name: '攻城迫擊砲',
        archetypeRole: 'anti_light_aoe',
        roleLabel: '重甲濺射機械 ×1',
        counterNote: '對[輕甲] +11 · 對[建築] +18 · 240超長射程（[K]原地架設可再 +35% 射程 / +6傷）',
        weakAgainstNote: '具【重甲】標籤會受反重甲加成克制；2.55s 長裝填怕突臉與空軍',
        specialEffectNote: '【重甲·機械】吃機械攻／機械防升級！64px 距離衰減大濺射，受 [K] 原地增程增傷',
        tier: 2,
        cost: 115,
        gasCost: 65,
        trainTime: 10.5,
        supplyCost: 4,
        squadSize: 1,
        hp: 125,
        shield: 0,
        armor: 1,
        armorPerLevel: 1,
        attributes: ['Armored', 'Mechanical'],
        armorClass: 'heavy',
        domain: 'ground',
        combatRange: 'ranged',
        canHitAir: false,
        damage: 15,
        damagePerLevel: 2,
        attackCount: 1,
        attackIntervalMs: 2550,
        attackRate: 0.39,
        bonusVsTag: { Light: 11, Structure: 18 },
        bonusPerLevelVsTag: { Light: 2, Structure: 2 },
        range: 240,
        speed: 19,
        vision: 124,
        splashRadius: 64,
        shape: 'mortar',
      },
      {
        id: 'iron_flamer',
        faction: 'ironbound',
        hotkey: 'R',
        name: '火焰兵',
        archetypeRole: 'anti_light_aoe',
        roleLabel: '輕甲機械火焰 ×2',
        counterNote: '68px 中近戰 42px 烈焰 AOE · 對[輕甲] +5（每級+1）· 專燒輕甲人海',
        weakAgainstNote: '無法對空；自身為【輕甲·機械】，懼怕遠程風箏與重甲前排硬頂',
        specialEffectNote: '【輕甲·機械】中近戰火焰清場，吃機械攻／機械防，受 [K] 原地增程增傷',
        tier: 2,
        cost: 95,
        gasCost: 35,
        trainTime: 8.2,
        supplyCost: 4,
        squadSize: 2,
        hp: 115,
        shield: 0,
        armor: 1,
        armorPerLevel: 1,
        attributes: ['Light', 'Mechanical'],
        armorClass: 'light',
        domain: 'ground',
        combatRange: 'melee',
        canHitAir: false,
        damage: 10,
        damagePerLevel: 1,
        attackCount: 1,
        attackIntervalMs: 1150,
        attackRate: 0.87,
        bonusVsTag: { Light: 5 },
        bonusPerLevelVsTag: { Light: 1 },
        range: 68,
        speed: 28,
        vision: 135,
        splashRadius: 42,
        shape: 'flamer',
      },
      {
        id: 'iron_recon',
        faction: 'ironbound',
        hotkey: 'C',
        name: '鷹眼偵察機',
        archetypeRole: 'rapid_light',
        roleLabel: '反隱醫療空軍 ×1',
        counterNote: '稀缺機動【反隱偵測】· 225 超廣視野 · 非戰鬥且未偵隱時緩慢治療 135px 內生物友軍',
        weakAgainstNote: '【輕甲·機械】正面火力不如重型砲艇，需配合主力護航',
        specialEffectNote: '【輕甲·機械·偵隱醫療】吃空軍攻防！脫戰 3s 且視野內無敵方隱形單位時自動治療生物友軍 (4HP/s)',
        tier: 3,
        cost: 110,
        gasCost: 75,
        trainTime: 10.5,
        supplyCost: 4,
        squadSize: 1,
        hp: 195,
        shield: 40,
        armor: 1,
        armorPerLevel: 1,
        shieldArmor: 1,
        shieldArmorPerLevel: 1,
        attributes: ['Light', 'Mechanical'],
        armorClass: 'light',
        domain: 'air',
        combatRange: 'ranged',
        canHitAir: true,
        detector: true,
        damage: 11,
        damagePerLevel: 2,
        attackCount: 1,
        attackIntervalMs: 1050,
        attackRate: 0.95,
        bonusVsTag: { Light: 6, Psionic: 8 },
        bonusPerLevelVsTag: { Light: 1, Psionic: 2 },
        range: 152,
        speed: 33,
        vision: 225,
        shape: 'recon',
      },
      {
        id: 'iron_titan',
        faction: 'ironbound',
        hotkey: 'V',
        name: '泰坦重裝機甲',
        archetypeRole: 'heavy_behemoth',
        roleLabel: '高防重裝巨獸 ×1',
        counterNote: '基礎傷 35 範圍重砲 · 基礎裝甲 3 · 受 [K] 原地架設大幅延伸射程與重砲傷害',
        weakAgainstNote: '移速慢且 1.65s 射擊間隔，逼迫對手轉型精銳小隊(+8重甲)或天穹砲艇(+18重甲)反制',
        specialEffectNote: '【重甲·機械·巨型】80 獨立護盾（1護盾甲）+ 48px 陸空範圍重砲；吃機械攻／防與 [K] 架設',
        tier: 3,
        cost: 200,
        gasCost: 140,
        trainTime: 15.8,
        supplyCost: 7,
        squadSize: 1,
        hp: 520,
        shield: 80,
        armor: 3,
        armorPerLevel: 1,
        shieldArmor: 1,
        shieldArmorPerLevel: 1,
        attributes: ['Armored', 'Mechanical', 'Massive'],
        armorClass: 'heavy',
        domain: 'ground',
        combatRange: 'ranged',
        canHitAir: true,
        damage: 35,
        damagePerLevel: 3,
        attackCount: 1,
        attackIntervalMs: 1650,
        attackRate: 0.61,
        bonusVsTag: {},
        bonusPerLevelVsTag: {},
        range: 158,
        speed: 20,
        vision: 150,
        splashRadius: 48,
        shape: 'titan',
      },
      {
        id: 'iron_elite_rifle',
        faction: 'ironbound',
        hotkey: 'Y',
        name: '精銳小隊',
        archetypeRole: 'anti_armored',
        roleLabel: '反重甲攻堅步兵 ×3',
        counterNote: '基礎 10 + 對[重甲] +8（每級再 +1/+1）· 專破盾衛、迫擊砲、泰坦與建築',
        weakAgainstNote: '攻速慢對輕甲海容易溢出，且自身為【輕甲·生物】懼怕重砲塔與火焰兵烈焰濺射',
        specialEffectNote: '【輕甲·生物】需建【T1基礎兵營 Lv.2】解鎖！1基礎甲，吃生物攻／防、[K] 鼓舞(+10血)與鷹眼回血',
        tier: 1,
        requiresBarracksTier: 1,
        requiresBarracksLevel: 2,
        cost: 100,
        gasCost: 35,
        trainTime: 7.4,
        supplyCost: 4,
        squadSize: 3,
        hp: 76,
        shield: 0,
        armor: 1,
        armorPerLevel: 1,
        attributes: ['Light', 'Biological'],
        armorClass: 'light',
        domain: 'ground',
        combatRange: 'ranged',
        canHitAir: true,
        damage: 10,
        damagePerLevel: 1,
        attackCount: 1,
        attackIntervalMs: 1400,
        attackRate: 0.71,
        bonusVsTag: { Armored: 8 },
        bonusPerLevelVsTag: { Armored: 1 },
        range: 134,
        speed: 28,
        vision: 162,
        shape: 'elite_rifle',
      },
      {
        id: 'iron_valkyrie',
        faction: 'ironbound',
        hotkey: 'N',
        name: '女武神戰機',
        archetypeRole: 'anti_light_aoe',
        roleLabel: '隱形雙發反輕甲空軍 ×2',
        counterNote: '遭遇敵軍開啟【15秒隱形】且脫戰4s回復！雙發武器（×2）· 對[輕甲] +5（單輪 22 傷）· 飛越路障奇襲',
        weakAgainstNote: '雙發每發獨立扣裝甲，遇高甲重裝輸出銳減；若被偵隱揭露或15秒隱形耗盡懼怕哨塔與步槍群',
        specialEffectNote: '【輕甲·機械·15s隱形】需建【T2進階兵營】解鎖；吃空軍攻防與 [K] 原地增程增傷',
        tier: 2,
        requiresBarracksTier: 2,
        cost: 100,
        gasCost: 60,
        trainTime: 8.8,
        supplyCost: 4,
        squadSize: 2,
        hp: 95,
        shield: 0,
        armor: 0,
        armorPerLevel: 1,
        attributes: ['Light', 'Mechanical'],
        armorClass: 'light',
        domain: 'air',
        combatRange: 'ranged',
        canHitAir: true,
        cloaked: true,
        cloakDurationSec: 15,
        damage: 6,
        damagePerLevel: 1,
        attackCount: 2,
        attackIntervalMs: 1150,
        attackRate: 0.87,
        bonusVsTag: { Light: 5 },
        bonusPerLevelVsTag: { Light: 1 },
        range: 136,
        speed: 36,
        vision: 168,
        shape: 'valkyrie',
      },
      {
        id: 'iron_gunship',
        faction: 'ironbound',
        hotkey: 'M',
        name: '天穹砲艇',
        archetypeRole: 'anti_armored',
        roleLabel: '反重甲空中堡壘 ×1',
        counterNote: '對[重甲] +18 · 對[建築] +12 · 空中制裁重甲推進流',
        weakAgainstNote: '造價昂貴、移速較慢；怕多數對空單位圍攻與防空網[L]',
        specialEffectNote: '【重甲·機械·巨型】需建【T3精銳兵營】解鎖；60護盾+38px濺射，吃空軍攻防與 [K] 原地架設',
        tier: 3,
        requiresBarracksTier: 3,
        cost: 165,
        gasCost: 125,
        trainTime: 14.0,
        supplyCost: 6,
        squadSize: 1,
        hp: 360,
        shield: 60,
        armor: 3,
        armorPerLevel: 1,
        shieldArmor: 1,
        shieldArmorPerLevel: 1,
        attributes: ['Armored', 'Mechanical', 'Massive'],
        armorClass: 'heavy',
        domain: 'air',
        combatRange: 'ranged',
        canHitAir: true,
        damage: 24,
        damagePerLevel: 3,
        attackCount: 1,
        attackIntervalMs: 1650,
        attackRate: 0.61,
        bonusVsTag: { Armored: 18, Structure: 12 },
        bonusPerLevelVsTag: { Armored: 2, Structure: 2 },
        range: 166,
        speed: 26,
        vision: 166,
        splashRadius: 38,
        shape: 'gunship',
      },
    ],
  },
  dawn: {
    id: 'dawn',
    name: '晨曦聖約',
    subtitle: '獨立護盾裝甲 · 靈能奇襲 · 地面／護盾／空軍六系攻防',
    accentHex: '#F59E0B',
    accentLightHex: '#FCD34D',
    emblemPath: '/src/assets/images/emblem_dawn_1795427353091.jpg',
    passiveName: '迅雷聖盾',
    passiveDesc: '全軍移速 +12%，脫戰 3 秒後持續回復獨立護盾（護盾未破前獨立計算護盾裝甲）。',
    activeName: '聖光裁決矩陣',
    activeDesc:
      '開局 65s 冷卻，消耗 115G 引爆 75px 核心等離子衝擊波（14 基礎傷 +6 對[輕甲] +8 對[建築]），同時為 120px 內存活友軍施加基礎 +45 護盾與 5.5s 加速（每升級 1 次金礦或瓦斯場額外 +0.4s 加速與 +5 護盾）。⚠ 注意：核心衝擊波會誤傷範圍內友軍！',
    activeCooldown: 52,
    activeCost: 115,
    scanCooldown: 46,
    scanRadius: 150,
    scanDuration: 9.0,
    towerTypes: ['watchtower', 'artillery', 'disruptor', 'tech_tower'],
    armorySummary: '地面／護盾／空軍三大系 · 攻防分開線性升級（共六項，皆耗金與瓦斯）',
    armoryTrackOrder: ['trackA', 'trackD', 'trackB', 'trackE', 'trackC', 'trackF'],
    armoryTracks: {
      trackA: {
        id: 'trackA',
        hotkey: 'G',
        shortName: '地面攻',
        name: '星能地面武器（攻）',
        desc: '地面單位（斥候／射手／刺客／騎士／巨像／執行官）武器等級 +1：Lv.2 需 T2 或 T1 營二級，Lv.3 需 T3 或 T2+T1 營三級',
        costs: [115, 195, 290],
        gasCosts: [80, 140, 215],
        times: [21.0, 31.0, 42.0],
      },
      trackD: {
        id: 'trackD',
        hotkey: 'U',
        shortName: '地面防',
        name: '聖鍛地面裝甲（防）',
        desc: '地面單位本體裝甲等級 +1（每級 +1 本體裝甲）：Lv.2 需 T2 或 T1 營二級，Lv.3 需 T3 或 T2+T1 營三級',
        costs: [115, 195, 290],
        gasCosts: [80, 140, 215],
        times: [21.0, 31.0, 42.0],
      },
      trackB: {
        id: 'trackB',
        hotkey: 'H',
        shortName: '護盾容',
        name: '等離子護盾擴容',
        desc: '全軍最大護盾 +18% 且脫戰回盾加速：Lv.2 需 T2 或 T1 營二級，Lv.3 需 T3 或 T2+T1 營三級',
        costs: [120, 200, 300],
        gasCosts: [85, 150, 225],
        times: [22.0, 32.0, 43.0],
      },
      trackE: {
        id: 'trackE',
        hotkey: 'I',
        shortName: '護盾甲',
        name: '等離子護盾裝甲',
        desc: '全軍護盾裝甲 +1（線性減傷所有命中護盾的傷害）：Lv.2 需 T2 或 T1 營二級，Lv.3 需 T3 或 T2+T1 營三級',
        costs: [120, 200, 300],
        gasCosts: [85, 150, 225],
        times: [22.0, 32.0, 43.0],
      },
      trackC: {
        id: 'trackC',
        hotkey: 'J',
        shortName: '空軍攻',
        name: '星艦光束火控（攻）',
        desc: '空中單位（追獵艇／星瞳偵察艦／審判艦）武器等級 +1 且射程 +5%',
        costs: [120, 205, 305],
        gasCosts: [90, 155, 235],
        times: [22.0, 32.0, 43.0],
      },
      trackF: {
        id: 'trackF',
        hotkey: 'O',
        shortName: '空軍防',
        name: '星艦聖盾機體（防）',
        desc: '空中單位（追獵艇／星瞳偵察艦／審判艦）每級 +1 本體裝甲與 +1 護盾裝甲',
        costs: [120, 205, 305],
        gasCosts: [90, 155, 235],
        times: [22.0, 32.0, 43.0],
      },
    },
    specialTechs: [
      {
        slot: 0,
        hotkey: 'K',
        tierReq: 2,
        name: '折躍護盾超載 I',
        shortName: '盾超載I',
        desc: 'T2可研：被動回盾 +50%；解鎖主動技 [K]（免費，28s CD）。對 105px 內友軍施放：立即回復 +35 護盾，[生物/靈能]獲 3s 靈能激勵（移速+28%、攻速+35%、+2傷），[純機械/空軍]原地架設 3s（射程+35%、+6傷）。',
        cost: 205,
        gasCost: 95,
        time: 32.0,
        level2: {
          tierReq: 3,
          name: '折躍護盾超載 II',
          shortName: '盾超載II',
          desc: 'T3可研（於 [K] 冷卻中再次點擊 K 升級）：全軍護盾裝甲永久 +1、最大護盾額外 +25% 且回盾速度翻倍。',
          cost: 270,
          gasCost: 145,
          time: 38.0,
        },
      },
      {
        slot: 1,
        hotkey: 'L',
        tierReq: 2,
        name: '星辰共鳴防空網 I',
        shortName: '星共鳴I',
        desc: 'T2可研：全軍攻擊間隔縮短 8%、對[重甲]/[建築] +2；解鎖全塔對空與防禦塔【⚡科技】升級，全塔視野 +14、射程 +6%、護甲 +1（T3可續升II階）。',
        cost: 225,
        gasCost: 100,
        time: 38.0,
        level2: {
          tierReq: 3,
          name: '星辰共鳴防空網 II',
          shortName: '星共鳴II',
          desc: '全軍攻擊間隔累計縮短 15%、對[重甲]/[建築]累計 +4；重砲對空改用完整主砲，全塔視野累計 +26、射程 +12%、護甲 +2。',
          cost: 315,
          gasCost: 160,
          time: 52.0,
        },
      },
    ],
    units: [
      {
        id: 'dawn_zealot',
        faction: 'dawn',
        hotkey: 'Q',
        name: '光刃斥候',
        archetypeRole: 'rapid_light',
        roleLabel: '雙刃輕甲近戰 ×2',
        counterNote: '雙刃連斬（×2）· 獨立護盾 · 廣視野偵查',
        weakAgainstNote: '雙發近戰每擊扣甲，撞上高甲重裝效率下降',
        specialEffectNote: '【輕甲·生物·靈能】吃地面攻/防與護盾科技，受 [K] 靈能激勵與星瞳充能',
        tier: 1,
        cost: 70,
        gasCost: 0,
        trainTime: 5.2,
        supplyCost: 3,
        squadSize: 2,
        hp: 65,
        shield: 35,
        armor: 1,
        armorPerLevel: 1,
        shieldArmor: 0,
        shieldArmorPerLevel: 1,
        attributes: ['Light', 'Biological', 'Psionic'],
        armorClass: 'light',
        domain: 'ground',
        combatRange: 'melee',
        canHitAir: false,
        damage: 7,
        damagePerLevel: 1,
        attackCount: 2,
        attackIntervalMs: 1150,
        attackRate: 0.87,
        bonusVsTag: { Light: 3 },
        bonusPerLevelVsTag: { Light: 1 },
        range: 34,
        speed: 31,
        vision: 162,
        shape: 'zealot',
      },
      {
        id: 'dawn_archer',
        faction: 'dawn',
        hotkey: 'W',
        name: '星輝射手',
        archetypeRole: 'anti_armored',
        roleLabel: '反重甲防空射手 ×2',
        counterNote: '對[重甲] +10 · 遠程對空 · 獨立護盾',
        weakAgainstNote: '輕甲身板懼怕範圍濺射與高速近戰貼臉',
        specialEffectNote: '【輕甲·機械】吃地面攻/防與護盾科技，受 [K] 原地增程增傷',
        tier: 1,
        cost: 75,
        gasCost: 20,
        trainTime: 6.2,
        supplyCost: 3,
        squadSize: 2,
        hp: 55,
        shield: 40,
        armor: 0,
        armorPerLevel: 1,
        shieldArmor: 0,
        shieldArmorPerLevel: 1,
        attributes: ['Light', 'Mechanical'],
        armorClass: 'light',
        domain: 'ground',
        combatRange: 'ranged',
        canHitAir: true,
        damage: 10,
        damagePerLevel: 1,
        attackCount: 1,
        attackIntervalMs: 1350,
        attackRate: 0.74,
        bonusVsTag: { Armored: 10 },
        bonusPerLevelVsTag: { Armored: 2 },
        range: 142,
        speed: 28,
        vision: 146,
        shape: 'archer',
      },
      {
        id: 'dawn_stalker',
        faction: 'dawn',
        hotkey: 'E',
        name: '幽影刺客',
        archetypeRole: 'anti_armored',
        roleLabel: '潛行靈能刺客 ×2',
        counterNote: '永久迷霧潛行 · 對[機械]+14 / [建築]+14',
        weakAgainstNote: '被哨塔／掃描反隱後輕甲身板極脆',
        specialEffectNote: '【輕甲·生物·靈能】吃地面攻/防與護盾科技，受 [K] 補盾加速突襲',
        tier: 2,
        cost: 100,
        gasCost: 60,
        trainTime: 9.2,
        supplyCost: 4,
        squadSize: 2,
        hp: 75,
        shield: 50,
        armor: 1,
        armorPerLevel: 1,
        shieldArmor: 0,
        shieldArmorPerLevel: 1,
        attributes: ['Light', 'Biological', 'Psionic'],
        armorClass: 'light',
        domain: 'ground',
        combatRange: 'melee',
        canHitAir: false,
        damage: 24,
        damagePerLevel: 3,
        attackCount: 1,
        attackIntervalMs: 1350,
        attackRate: 0.74,
        bonusVsTag: { Mechanical: 14, Structure: 14 },
        bonusPerLevelVsTag: { Mechanical: 2, Structure: 2 },
        range: 52,
        speed: 35,
        vision: 154,
        cloaked: true,
        shape: 'stalker',
      },
      {
        id: 'dawn_interceptor',
        faction: 'dawn',
        hotkey: 'R',
        name: '聖殿追獵艇',
        archetypeRole: 'anti_armored',
        roleLabel: '雙發護盾空軍 ×2',
        counterNote: '雙發雷射（×2）· 對[重甲]+6 · 飛越路障',
        weakAgainstNote: '雙發受高裝甲重複扣減，怕大量對空哨塔',
        specialEffectNote: '【重甲·機械】吃空軍攻/防與護盾科技，受 [K] 原地增程增傷',
        tier: 2,
        cost: 115,
        gasCost: 65,
        trainTime: 9.6,
        supplyCost: 4,
        squadSize: 2,
        hp: 95,
        shield: 65,
        armor: 2,
        armorPerLevel: 1,
        shieldArmor: 1,
        shieldArmorPerLevel: 1,
        attributes: ['Armored', 'Mechanical'],
        armorClass: 'heavy',
        domain: 'air',
        combatRange: 'ranged',
        canHitAir: true,
        damage: 7,
        damagePerLevel: 1,
        attackCount: 2,
        attackIntervalMs: 1200,
        attackRate: 0.83,
        bonusVsTag: { Armored: 6 },
        bonusPerLevelVsTag: { Armored: 1 },
        range: 140,
        speed: 33,
        vision: 164,
        shape: 'interceptor',
      },
      {
        id: 'dawn_paladin',
        faction: 'dawn',
        hotkey: 'C',
        name: '輝光重裝騎士',
        archetypeRole: 'heavy_behemoth',
        roleLabel: '高甲聖盾近戰 ×1',
        counterNote: '3本體甲 + 1護盾甲 · 對[輕甲]+12 · 34px順劈',
        weakAgainstNote: '無法對空，怕反重甲遠程集火',
        specialEffectNote: '【重甲·機械·靈能】吃地面攻/防與護盾科技，受 [K] 靈能激勵',
        tier: 2,
        cost: 125,
        gasCost: 60,
        trainTime: 9.8,
        supplyCost: 4,
        squadSize: 1,
        hp: 210,
        shield: 120,
        armor: 3,
        armorPerLevel: 1,
        shieldArmor: 1,
        shieldArmorPerLevel: 1,
        attributes: ['Armored', 'Mechanical', 'Psionic'],
        armorClass: 'heavy',
        domain: 'ground',
        combatRange: 'melee',
        canHitAir: false,
        damage: 18,
        damagePerLevel: 2,
        attackCount: 1,
        attackIntervalMs: 1400,
        attackRate: 0.71,
        bonusVsTag: { Light: 12 },
        bonusPerLevelVsTag: { Light: 2 },
        range: 46,
        speed: 26,
        vision: 142,
        splashRadius: 34,
        shape: 'paladin',
      },
      {
        id: 'dawn_colossus',
        faction: 'dawn',
        hotkey: 'V',
        name: '聖陽巨像',
        archetypeRole: 'anti_light_aoe',
        roleLabel: '雙光束濺射巨像 ×1',
        counterNote: '雙重掃射（×2）· 對[輕甲]+12 · 68px超大濺射',
        weakAgainstNote: '單束基礎傷受高重甲扣兩次，且身為巨型目標易被反重甲集火',
        specialEffectNote: '【重甲·機械·巨型】護盾光環 + 雙光束清場，吃地面攻/防與護盾科技',
        tier: 3,
        cost: 190,
        gasCost: 135,
        trainTime: 14.8,
        supplyCost: 7,
        squadSize: 1,
        hp: 340,
        shield: 180,
        armor: 2,
        armorPerLevel: 1,
        shieldArmor: 1,
        shieldArmorPerLevel: 1,
        attributes: ['Armored', 'Mechanical', 'Massive'],
        armorClass: 'heavy',
        domain: 'ground',
        combatRange: 'ranged',
        canHitAir: true,
        damage: 13,
        damagePerLevel: 2,
        attackCount: 2,
        attackIntervalMs: 1550,
        attackRate: 0.65,
        bonusVsTag: { Light: 12, Structure: 8 },
        bonusPerLevelVsTag: { Light: 2, Structure: 1 },
        range: 174,
        speed: 25,
        vision: 162,
        splashRadius: 68,
        auraShield: true,
        shape: 'colossus',
      },
      {
        id: 'dawn_templar',
        faction: 'dawn',
        hotkey: 'Y',
        name: '聖殿執行官',
        archetypeRole: 'anti_light_aoe',
        roleLabel: '靈能濺射精銳 ×2',
        counterNote: '118 中程 38px 靈能震盪 · 對[輕甲]+6 / [生物]+4 · 可對空',
        weakAgainstNote: '【輕甲·生物·靈能】懼怕高爆發狙殺與重甲近戰硬切',
        specialEffectNote: '【輕甲·生物·靈能】需建【T1基礎兵營 Lv.2】解鎖！吃地面攻/防與護盾科技，受 [K] 靈能激勵',
        tier: 1,
        requiresBarracksTier: 1,
        requiresBarracksLevel: 2,
        cost: 95,
        gasCost: 40,
        trainTime: 7.4,
        supplyCost: 4,
        squadSize: 2,
        hp: 65,
        shield: 55,
        armor: 1,
        armorPerLevel: 1,
        shieldArmor: 1,
        shieldArmorPerLevel: 1,
        attributes: ['Light', 'Biological', 'Psionic'],
        armorClass: 'light',
        domain: 'ground',
        combatRange: 'ranged',
        canHitAir: true,
        damage: 11,
        damagePerLevel: 2,
        attackCount: 1,
        attackIntervalMs: 1380,
        attackRate: 0.72,
        bonusVsTag: { Light: 6, Biological: 4 },
        bonusPerLevelVsTag: { Light: 1, Biological: 1 },
        range: 118,
        speed: 28,
        vision: 158,
        splashRadius: 38,
        shape: 'templar',
      },
      {
        id: 'dawn_observer',
        faction: 'dawn',
        hotkey: 'N',
        name: '星瞳偵察艦',
        archetypeRole: 'rapid_light',
        roleLabel: '反隱充能空軍 ×1',
        counterNote: '機動【反隱偵測】· 225 超廣視野 · 非戰且未偵隱時為 135px 內友軍緩慢充能護盾 (5/s)',
        weakAgainstNote: '【輕甲·機械·靈能】正面火力有限，需主力護航',
        specialEffectNote: '【輕甲·機械·靈能·偵隱充能】需建【T2進階兵營】解鎖！吃空軍攻/防與護盾科技',
        tier: 2,
        requiresBarracksTier: 2,
        cost: 105,
        gasCost: 65,
        trainTime: 9.8,
        supplyCost: 4,
        squadSize: 1,
        hp: 110,
        shield: 95,
        armor: 1,
        armorPerLevel: 1,
        shieldArmor: 1,
        shieldArmorPerLevel: 1,
        attributes: ['Light', 'Mechanical', 'Psionic'],
        armorClass: 'light',
        domain: 'air',
        combatRange: 'ranged',
        canHitAir: true,
        detector: true,
        damage: 10,
        damagePerLevel: 2,
        attackCount: 1,
        attackIntervalMs: 1100,
        attackRate: 0.91,
        bonusVsTag: { Light: 5, Psionic: 7 },
        bonusPerLevelVsTag: { Light: 1, Psionic: 2 },
        range: 152,
        speed: 34,
        vision: 225,
        shape: 'observer',
      },
      {
        id: 'dawn_carrier',
        faction: 'dawn',
        hotkey: 'M',
        name: '聖輝審判艦',
        archetypeRole: 'anti_armored',
        roleLabel: '反重甲星艦旗艦 ×1',
        counterNote: '對[重甲]+16 / [建築]+12 · 38px 聖光濺射 · 雙層高防空優旗艦',
        weakAgainstNote: '造價高昂、移速較慢，懼怕大群防空集火與干擾緩速',
        specialEffectNote: '【重甲·機械·巨型·靈能】需建【T3精銳兵營】解鎖！吃空軍攻/防與護盾科技',
        tier: 3,
        requiresBarracksTier: 3,
        cost: 175,
        gasCost: 130,
        trainTime: 14.2,
        supplyCost: 6,
        squadSize: 1,
        hp: 260,
        shield: 160,
        armor: 3,
        armorPerLevel: 1,
        shieldArmor: 2,
        shieldArmorPerLevel: 1,
        attributes: ['Armored', 'Mechanical', 'Massive', 'Psionic'],
        armorClass: 'heavy',
        domain: 'air',
        combatRange: 'ranged',
        canHitAir: true,
        damage: 22,
        damagePerLevel: 3,
        attackCount: 1,
        attackIntervalMs: 1620,
        attackRate: 0.62,
        bonusVsTag: { Armored: 16, Structure: 12 },
        bonusPerLevelVsTag: { Armored: 2, Structure: 2 },
        range: 168,
        speed: 26,
        vision: 172,
        splashRadius: 38,
        shape: 'carrier',
      },
    ],
  },
  swarm: {
    id: 'swarm',
    name: '蝕骨蟲巢',
    subtitle: '蟲海吞噬 · 殺敵回收金幣 · 近戰／遠程／飛翼六系演化',
    accentHex: '#10B981',
    accentLightHex: '#6EE7B7',
    emblemPath: '/src/assets/images/emblem_swarm_1795431872896.jpg',
    passiveName: '血肉吞噬再生',
    passiveDesc: '蟲巢單位持續再生生命；唯一能從擊殺敵軍依人口回收 +4G/人口 生物質的文明！',
    activeName: '孢子伏擊空投',
    activeDesc:
      '開局 65s 冷卻，消耗 125G 於 72px 區域空投孢子囊，落地造成 14 (+8對[輕甲]) 濺射與緩速並孵化基礎 3 隻疾爪蟲突襲（每累計升級 2 次金礦或瓦斯場額外 +1 隻，最多 8 隻）。⚠ 注意：落地衝擊波會誤傷範圍內友軍！',
    activeCooldown: 52,
    activeCost: 125,
    scanCooldown: 46,
    scanRadius: 150,
    scanDuration: 9.0,
    towerTypes: ['watchtower', 'artillery', 'disruptor', 'econ_tower'],
    armorySummary: '近戰／遠程／飛翼三大系 · 攻防分開線性演化（共六項，皆耗金與瓦斯）',
    armoryTrackOrder: ['trackA', 'trackD', 'trackB', 'trackE', 'trackC', 'trackF'],
    armoryTracks: {
      trackA: {
        id: 'trackA',
        hotkey: 'G',
        shortName: '近戰攻',
        name: '利爪近戰演化（攻）',
        desc: '所有近戰蟲群（疾爪蟲／自爆毒囊／甲殼衝鋒獸）武器等級 +1：Lv.2 需 T2 或 T1 營二級，Lv.3 需 T3 或 T2+T1 營三級',
        costs: [115, 195, 290],
        gasCosts: [75, 130, 200],
        times: [21.0, 31.0, 42.0],
      },
      trackD: {
        id: 'trackD',
        hotkey: 'U',
        shortName: '近戰防',
        name: '硬殼近戰演化（防）',
        desc: '所有近戰蟲群裝甲等級 +1（每級 +1 本體裝甲）：Lv.2 需 T2 或 T1 營二級，Lv.3 需 T3 或 T2+T1 營三級',
        costs: [115, 195, 290],
        gasCosts: [75, 130, 200],
        times: [21.0, 31.0, 42.0],
      },
      trackB: {
        id: 'trackB',
        hotkey: 'H',
        shortName: '遠程攻',
        name: '酸液遠程演化（攻）',
        desc: '地面遠程蟲群（酸液噴吐蟲／穿甲刺蛇）武器等級 +1：Lv.2 需 T2 或 T1 營二級，Lv.3 需 T3 或 T2+T1 營三級',
        costs: [120, 200, 300],
        gasCosts: [85, 145, 220],
        times: [22.0, 32.0, 43.0],
      },
      trackE: {
        id: 'trackE',
        hotkey: 'I',
        shortName: '遠程防',
        name: '甲膜遠程演化（防）',
        desc: '地面遠程蟲群（酸液噴吐蟲／穿甲刺蛇）裝甲等級 +1：Lv.2 需 T2 或 T1 營二級，Lv.3 需 T3 或 T2+T1 營三級',
        costs: [120, 200, 300],
        gasCosts: [85, 145, 220],
        times: [22.0, 32.0, 43.0],
      },
      trackC: {
        id: 'trackC',
        hotkey: 'J',
        shortName: '飛翼攻',
        name: '飛翼尖刺演化（攻）',
        desc: '空中蟲群（尖嘯飛龍／靈眼監視蟲／腐蝕飛龍王／利維坦）武器等級 +1 且移速 +6%',
        costs: [120, 205, 305],
        gasCosts: [90, 155, 235],
        times: [22.0, 32.0, 43.0],
      },
      trackF: {
        id: 'trackF',
        hotkey: 'O',
        shortName: '飛翼防',
        name: '飛翼甲殼演化（防）',
        desc: '空中蟲群裝甲等級 +1（每級 +1 裝甲）',
        costs: [120, 205, 305],
        gasCosts: [90, 155, 235],
        times: [22.0, 32.0, 43.0],
      },
    },
    specialTechs: [
      {
        slot: 0,
        hotkey: 'K',
        tierReq: 2,
        name: '狂暴腎上腺素 I',
        shortName: '腎上腺I',
        desc: 'T2可研：被動全蟲群移速 +10%、攻擊間隔縮短 10%；解鎖主動技 [K]（免費，28s CD）。對 105px 內友軍施放：消耗 10% 生命觸發 3s 蟲巢狂熱（移速 +28%、攻速 +35%、+2 傷害）。',
        cost: 200,
        gasCost: 90,
        time: 31.0,
        level2: {
          tierReq: 3,
          name: '狂暴腎上腺素 II',
          shortName: '腎上腺II',
          desc: 'T3可研（於 [K] 冷卻中再次點擊 K 升級）：全蟲群被動移速累計 +18%、攻擊間隔累計縮短 18%，且全生物單位最大生命永久 +10。',
          cost: 265,
          gasCost: 140,
          time: 38.0,
        },
      },
      {
        slot: 1,
        hotkey: 'L',
        tierReq: 2,
        name: '酸蝕孢子防空網 I',
        shortName: '酸蝕網I',
        desc: 'T2可研：蟲群陣亡時引爆腐蝕酸霧（7 傷 +5 對輕甲）；解鎖全塔對空與防禦塔【⚡科技】升級，全塔視野 +14、射程 +6%、護甲 +1（T3可續升II階）。',
        cost: 220,
        gasCost: 100,
        time: 37.0,
        level2: {
          tierReq: 3,
          name: '酸蝕孢子防空網 II',
          shortName: '酸蝕網II',
          desc: '陣亡酸霧強化至 11 傷 +9 對輕甲，擊殺敵軍生物質回收提升至 +6G/人口；重砲對空改用完整主砲，全塔視野累計 +26、射程 +12%、護甲 +2。',
          cost: 305,
          gasCost: 155,
          time: 52.0,
        },
      },
    ],
    units: [
      {
        id: 'swarm_ling',
        faction: 'swarm',
        hotkey: 'Q',
        name: '疾爪蟲群',
        archetypeRole: 'rapid_light',
        roleLabel: '高頻極速輕蟲 ×4',
        counterNote: '0.72s 極速撕咬 · 廉價鋪線 · 切機械後排',
        weakAgainstNote: '單發 6 傷撞上 3~4 裝甲重裝幾乎只剩保底，極怕濺射',
        specialEffectNote: '【輕甲·生物】吃近戰攻/防，受 [K] 蟲巢狂熱 (+10血) 與監視蟲非戰回血',
        tier: 1,
        cost: 55,
        gasCost: 0,
        trainTime: 4.6,
        supplyCost: 3,
        squadSize: 4,
        hp: 40,
        shield: 0,
        armor: 0,
        armorPerLevel: 1,
        attributes: ['Light', 'Biological'],
        armorClass: 'light',
        domain: 'ground',
        combatRange: 'melee',
        canHitAir: false,
        damage: 6,
        damagePerLevel: 1,
        attackCount: 1,
        attackIntervalMs: 720,
        attackRate: 1.39,
        bonusVsTag: { Mechanical: 2 },
        bonusPerLevelVsTag: { Mechanical: 1 },
        range: 28,
        speed: 37,
        vision: 152,
        shape: 'swarmling',
      },
      {
        id: 'swarm_spitter',
        faction: 'swarm',
        hotkey: 'W',
        name: '酸液噴吐蟲',
        archetypeRole: 'anti_armored',
        roleLabel: '反重甲對空蟲 ×2',
        counterNote: '對[重甲] +12 · 陸空雙打 · 專融重甲前排與巨獸',
        weakAgainstNote: '輕甲身板懼怕重砲塔與大範圍濺射',
        specialEffectNote: '【輕甲·生物】吃遠程攻/防，受 [K] 蟲巢狂熱 (+10血) 與監視蟲非戰回血',
        tier: 1,
        cost: 70,
        gasCost: 20,
        trainTime: 6.0,
        supplyCost: 3,
        squadSize: 2,
        hp: 70,
        shield: 0,
        armor: 0,
        armorPerLevel: 1,
        attributes: ['Light', 'Biological'],
        armorClass: 'light',
        domain: 'ground',
        combatRange: 'ranged',
        canHitAir: true,
        damage: 10,
        damagePerLevel: 1,
        attackCount: 1,
        attackIntervalMs: 1300,
        attackRate: 0.77,
        bonusVsTag: { Armored: 12 },
        bonusPerLevelVsTag: { Armored: 2 },
        range: 136,
        speed: 26,
        vision: 144,
        corrosive: true,
        shape: 'spitter',
      },
      {
        id: 'swarm_volatile',
        faction: 'swarm',
        hotkey: 'E',
        name: '自爆毒囊蟲',
        archetypeRole: 'anti_light_aoe',
        roleLabel: '輕甲自爆濺射 ×2',
        counterNote: '接觸劇爆 80px · 對[輕甲]+24 / [建築]+32',
        weakAgainstNote: '衝鋒前易被遠程點殺，對重甲單體性價比低',
        specialEffectNote: '【輕甲·生物】吃近戰攻/防，受 [K] 蟲巢狂熱加速衝鋒引爆',
        tier: 2,
        cost: 85,
        gasCost: 40,
        trainTime: 8.2,
        supplyCost: 3,
        squadSize: 2,
        hp: 65,
        shield: 0,
        armor: 0,
        armorPerLevel: 1,
        attributes: ['Light', 'Biological'],
        armorClass: 'light',
        domain: 'ground',
        combatRange: 'melee',
        canHitAir: false,
        damage: 24,
        damagePerLevel: 4,
        attackCount: 1,
        attackIntervalMs: 1000,
        attackRate: 1.0,
        bonusVsTag: { Light: 24, Structure: 32 },
        bonusPerLevelVsTag: { Light: 4, Structure: 5 },
        range: 34,
        speed: 36,
        vision: 130,
        splashRadius: 80,
        suicidal: true,
        shape: 'volatile',
      },
      {
        id: 'swarm_mutalisk',
        faction: 'swarm',
        hotkey: 'R',
        name: '尖嘯飛龍',
        archetypeRole: 'anti_light_aoe',
        roleLabel: '雙發高速空軍 ×2',
        counterNote: '雙發刃蟲（×2）· 對[輕甲]+4 / [生物]+3 · 飛越路障',
        weakAgainstNote: '雙發武器每擊獨立扣甲，懼怕高裝甲與哨塔防空',
        specialEffectNote: '【輕甲·生物】吃飛翼攻/防，受 [K] 蟲巢狂熱高速奇襲',
        tier: 2,
        cost: 95,
        gasCost: 55,
        trainTime: 8.8,
        supplyCost: 4,
        squadSize: 2,
        hp: 90,
        shield: 0,
        armor: 0,
        armorPerLevel: 1,
        attributes: ['Light', 'Biological'],
        armorClass: 'light',
        domain: 'air',
        combatRange: 'ranged',
        canHitAir: true,
        damage: 6,
        damagePerLevel: 1,
        attackCount: 2,
        attackIntervalMs: 1150,
        attackRate: 0.87,
        bonusVsTag: { Light: 4, Biological: 3 },
        bonusPerLevelVsTag: { Light: 1, Biological: 1 },
        range: 122,
        speed: 37,
        vision: 164,
        shape: 'mutalisk',
      },
      {
        id: 'swarm_crusher',
        faction: 'swarm',
        hotkey: 'C',
        name: '甲殼衝鋒獸',
        archetypeRole: 'heavy_behemoth',
        roleLabel: '高甲巨型破陣 ×1',
        counterNote: '4 超高裝甲 · 38px順劈 · 對[輕甲]+12 / [建築]+10',
        weakAgainstNote: '無法對空，懼怕反重甲射手與空中堡壘',
        specialEffectNote: '【重甲·生物·巨型】吃近戰攻/防，受 [K] 蟲巢狂熱與監視蟲回血',
        tier: 2,
        cost: 120,
        gasCost: 60,
        trainTime: 9.6,
        supplyCost: 4,
        squadSize: 1,
        hp: 360,
        shield: 0,
        armor: 4,
        armorPerLevel: 1,
        attributes: ['Armored', 'Biological', 'Massive'],
        armorClass: 'heavy',
        domain: 'ground',
        combatRange: 'melee',
        canHitAir: false,
        damage: 19,
        damagePerLevel: 3,
        attackCount: 1,
        attackIntervalMs: 1350,
        attackRate: 0.74,
        bonusVsTag: { Light: 12, Structure: 10 },
        bonusPerLevelVsTag: { Light: 2, Structure: 2 },
        range: 46,
        speed: 27,
        vision: 140,
        splashRadius: 38,
        shape: 'crusher',
      },
      {
        id: 'swarm_leviathan',
        faction: 'swarm',
        hotkey: 'V',
        name: '利維坦巨獸',
        archetypeRole: 'heavy_behemoth',
        roleLabel: '雙發空母巨獸 ×1',
        counterNote: '雙發酸液砲（×2）· 對[重甲]+10 / [建築]+14 · 孵化幼蟲',
        weakAgainstNote: '移速慢且目標龐大，懼怕反重甲防空集火',
        specialEffectNote: '【重甲·生物·巨型】吃飛翼攻/防，60px 陸空濺射並週期性孵化疾爪蟲',
        tier: 3,
        cost: 185,
        gasCost: 130,
        trainTime: 14.8,
        supplyCost: 7,
        squadSize: 1,
        hp: 500,
        shield: 0,
        armor: 3,
        armorPerLevel: 1,
        attributes: ['Armored', 'Biological', 'Massive'],
        armorClass: 'heavy',
        domain: 'air',
        combatRange: 'ranged',
        canHitAir: true,
        damage: 16,
        damagePerLevel: 2,
        attackCount: 2,
        attackIntervalMs: 1650,
        attackRate: 0.61,
        bonusVsTag: { Armored: 10, Structure: 14 },
        bonusPerLevelVsTag: { Armored: 2, Structure: 2 },
        range: 118,
        speed: 23,
        vision: 166,
        splashRadius: 60,
        spawnerInterval: 11.5,
        shape: 'leviathan',
      },
      {
        id: 'swarm_lurker',
        faction: 'swarm',
        hotkey: 'Y',
        name: '穿甲刺蛇',
        archetypeRole: 'anti_armored',
        roleLabel: '地刺濺射穿甲蟲 ×2',
        counterNote: '126 中程 36px 尖刺濺射 · 對[重甲]+9 / [輕甲]+4 · 雙通破陣',
        weakAgainstNote: '無法對空，懼怕空中單位白嫖與超遠程迫擊砲',
        specialEffectNote: '【輕甲·生物】需建【T1基礎兵營 Lv.2】解鎖！吃遠程攻/防與 [K] 蟲巢狂熱',
        tier: 1,
        requiresBarracksTier: 1,
        requiresBarracksLevel: 2,
        cost: 95,
        gasCost: 35,
        trainTime: 7.4,
        supplyCost: 4,
        squadSize: 2,
        hp: 95,
        shield: 0,
        armor: 1,
        armorPerLevel: 1,
        attributes: ['Light', 'Biological'],
        armorClass: 'light',
        domain: 'ground',
        combatRange: 'ranged',
        canHitAir: false,
        damage: 12,
        damagePerLevel: 2,
        attackCount: 1,
        attackIntervalMs: 1420,
        attackRate: 0.7,
        bonusVsTag: { Armored: 9, Light: 4 },
        bonusPerLevelVsTag: { Armored: 1, Light: 1 },
        range: 126,
        speed: 26,
        vision: 152,
        splashRadius: 36,
        shape: 'lurker',
      },
      {
        id: 'swarm_overseer',
        faction: 'swarm',
        hotkey: 'N',
        name: '靈眼監視蟲',
        archetypeRole: 'rapid_light',
        roleLabel: '反隱醫療空軍 ×1',
        counterNote: '機動【反隱偵測】· 225 超廣視野 · 非戰且未偵隱時治療 135px 內生物友軍 (4HP/s)',
        weakAgainstNote: '【輕甲·生物】火力偏輔助，需隨主力推進避免單飛被點殺',
        specialEffectNote: '【輕甲·生物·偵隱醫療】需建【T2進階兵營】解鎖！吃飛翼攻/防與 [K] 蟲巢狂熱',
        tier: 2,
        requiresBarracksTier: 2,
        cost: 95,
        gasCost: 60,
        trainTime: 9.6,
        supplyCost: 4,
        squadSize: 1,
        hp: 215,
        shield: 0,
        armor: 1,
        armorPerLevel: 1,
        attributes: ['Light', 'Biological'],
        armorClass: 'light',
        domain: 'air',
        combatRange: 'ranged',
        canHitAir: true,
        detector: true,
        damage: 10,
        damagePerLevel: 2,
        attackCount: 1,
        attackIntervalMs: 1080,
        attackRate: 0.93,
        bonusVsTag: { Light: 5, Psionic: 7 },
        bonusPerLevelVsTag: { Light: 1, Psionic: 2 },
        range: 148,
        speed: 33,
        vision: 225,
        shape: 'overseer',
      },
      {
        id: 'swarm_broodlord',
        faction: 'swarm',
        hotkey: 'M',
        name: '腐蝕飛龍王',
        archetypeRole: 'anti_armored',
        roleLabel: '空中攻城巨獸 ×1',
        counterNote: '172 超長射程 · 對[重甲]+16 / [建築]+16 · 42px 腐蝕濺射',
        weakAgainstNote: '移速較慢且無法有效獨自應付大量高速防空戰機',
        specialEffectNote: '【重甲·生物·巨型】需建【T3精銳兵營】解鎖！吃飛翼攻/防與監視蟲回血',
        tier: 3,
        requiresBarracksTier: 3,
        cost: 170,
        gasCost: 125,
        trainTime: 14.0,
        supplyCost: 6,
        squadSize: 1,
        hp: 340,
        shield: 0,
        armor: 3,
        armorPerLevel: 1,
        attributes: ['Armored', 'Biological', 'Massive'],
        armorClass: 'heavy',
        domain: 'air',
        combatRange: 'ranged',
        canHitAir: true,
        damage: 23,
        damagePerLevel: 3,
        attackCount: 1,
        attackIntervalMs: 1680,
        attackRate: 0.6,
        bonusVsTag: { Armored: 16, Structure: 16 },
        bonusPerLevelVsTag: { Armored: 2, Structure: 2 },
        range: 172,
        speed: 25,
        vision: 170,
        splashRadius: 42,
        corrosive: true,
        shape: 'broodlord',
      },
    ],
  },
};

export const FACTION_ORDER: FactionId[] = ['ironbound', 'dawn', 'swarm'];

export const ALL_UNITS_BY_ID: Record<string, (typeof FACTIONS.ironbound.units)[number]> = {};
for (const faction of Object.values(FACTIONS)) {
  for (const unit of faction.units) {
    ALL_UNITS_BY_ID[unit.id] = unit;
  }
}
