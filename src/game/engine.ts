import { tacticalAudio } from './audio';
import { TutorialStepId } from './tutorial';
import {
  addTagBonusFp,
  cloneTagBonusFp,
  DefenseProfileFp,
  dtToFixedMs,
  FP_SCALE,
  resolveDeterministicAttackFp,
  scaleAttackIntervalMs,
  TagBonusMapFp,
  toFp,
  toTagBonusFp,
  WeaponAttackSpecFp,
} from './combatMath';
import {
  AI_ARCHETYPE_ORDER,
  ALL_UNITS_BY_ID,
  ARMORY_BUILDING_ARMOR,
  ARMORY_BUILDING_ATTRIBUTES,
  ARMORY_BUILDING_COORDS,
  ARMORY_BUILDING_DEFS,
  ARMORY_BUILDING_VISION,
  ARMORY_TIER_REQ,
  BARRACKS_ARMOR,
  BARRACKS_ATTRIBUTES,
  BARRACKS_COORDS,
  BARRACKS_DEFS,
  BARRACKS_MAX_LEVEL,
  BARRACKS_TIERS,
  BARRICADE_ARMOR,
  BARRICADE_ATTRIBUTES,
  BARRICADE_HP,
  BASE_SIM_SPEED,
  COMMANDER_BONUS_GOLD,
  computeHarassEffPermille,
  EARLY_PASSIVE_CREEP_SEC,
  ECON_BASE_MINE_RATE,
  ECON_MAX_LEVEL,
  ECON_REQUIRED_TOWERS,
  ECON_TOWER_BONUS_MULT,
  ECON_TOWER_MINING_MULT_BY_LV,
  ECON_UPGRADE_TIMES,
  ENEMY_NEXUS_POS,
  FACTION_ORDER,
  FACTION_SKILL_INITIAL_COOLDOWN,
  FACTIONS,
  FIRED_REVEAL_DURATION,
  GAS_EXTRACTOR_ARMOR,
  GAS_EXTRACTOR_ATTRIBUTES,
  GAS_EXTRACTOR_COORDS,
  GAS_EXTRACTOR_LEVELS,
  GAS_EXTRACTOR_MAX_LEVEL,
  GAS_EXTRACTOR_VISION,
  getBarracksHpForLevel,
  getBarracksNextUpgrade,
  getEconUpgradeCost,
  getGasExtractorHpForLevel,
  getGasExtractorNextUpgrade,
  getRequiredArmoryBuilding,
  getTowerUpgradeCostAndTime,
  HAWKEYE_HEAL_PER_SEC,
  HAWKEYE_HEAL_RADIUS,
  INNER_PAD_BASE_MINE_RATE,
  IRON_K_BIO_HP_COST_PERMILLE,
  IRON_K_BOOST_COOLDOWN,
  IRON_K_BOOST_DURATION,
  IRON_K_BOOST_RADIUS,
  IRON_K_LV2_BIO_MAX_HP_BONUS,
  IRON_K_MECH_BONUS_DMG,
  IRON_K_MECH_RANGE_PERMILLE,
  isArmoryLevelUnlocked,
  JUNGLE_AMBUSH_COOLDOWN,
  JUNGLE_AMBUSH_COST,
  JUNGLE_CENTERS,
  JUNGLE_NODE_COORDS,
  LANE_MID_COORDS,
  LANE_SHORT_NAMES,
  LANE_WAYPOINTS,
  MAP_MODE_META,
  MAX_SUPPLY_LIMIT,
  NEXUS_ARMOR,
  NEXUS_ATTACK_COUNT,
  NEXUS_ATTACK_INTERVAL_MS,
  NEXUS_ATTRIBUTES,
  NEXUS_BASE_HP,
  NEXUS_BONUS_VS_TAG,
  NEXUS_DAMAGE,
  NEXUS_GOLD_RESERVE,
  NEXUS_MAX_HP,
  NEXUS_PLATING_BROKEN_MINE_EFF_PERMILLE,
  NEXUS_PLATING_HP,
  NEXUS_RANGE,
  NEXUS_REPAIR_COST,
  NEXUS_REPAIR_TIME,
  NEXUS_VISION,
  OBJECTIVE_META,
  OUTER_PAD_BASE_MINE_RATE,
  PLAYER_NEXUS_POS,
  SCAN_INITIAL_COOLDOWN,
  SIMPLE_ECON_PACE_MULT,
  SIMPLE_JUNGLE_NODE_COORDS,
  SIMPLE_NEXUS_BASE_HP,
  SIMPLE_NEXUS_MAX_HP,
  SIMPLE_NEXUS_PLATING_HP,
  SQUAD_SELECT_RADIUS,
  STARTING_GAS_SIMPLE,
  STARTING_GAS_STANDARD,
  STARTING_GOLD_SIMPLE,
  STARTING_GOLD_STANDARD,
  SUPPLY_DEPOT_ARMOR,
  SUPPLY_DEPOT_ATTRIBUTES,
  SUPPLY_DEPOT_BONUS,
  SUPPLY_DEPOT_BUILD_TIME,
  SUPPLY_DEPOT_COORDS,
  SUPPLY_DEPOT_COST,
  SUPPLY_DEPOT_HP,
  SUPPLY_DEPOT_MAX_COUNT,
  SUPPLY_DEPOT_VISION,
  TECH_SUPPLY_BY_TIER,
  TECH_TOWER_CD_RATE_BY_LV,
  TECH_TOWER_MAX_CD_BONUS,
  TECH_TOWER_MAX_RES_BONUS,
  TECH_TOWER_RES_RATE_BY_LV,
  TECH_UPGRADE_COSTS,
  TECH_UPGRADE_GAS_COSTS,
  TECH_UPGRADE_TIMES,
  TOWER_DEFS,
  TOWER_LEVEL_SCALING,
  TOWER_MINING_UPGRADE_BONUS,
  TOWER_PAD_COORDS,
  TOWER_TECH_CD_RATE_BY_LV,
  TOWER_TECH_LV2_BONUS_DMG,
  TOWER_TECH_TIER_DMG_BONUS,
  TOWER_TECH_TIER_HP_PERMILLE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './data';
import {
  ActiveDynamicEvent,
  AIArchetype,
  AIArchetypeOption,
  ArmoryBuilding,
  ArmoryBuildingKind,
  ArmoryBuildingSummary,
  ArmoryTrackId,
  ArtilleryStrike,
  BarracksBuilding,
  BarracksStatusSummary,
  BarracksTier,
  CancellableBuildingKind,
  Difficulty,
  DynamicEventKind,
  EnemyFactionOption,
  FactionId,
  FloatingText,
  GameScreen,
  GameSnapshot,
  GasExtractor,
  GhostIntel,
  IntelReport,
  JungleZoneId,
  LaneId,
  LaneStance,
  MapMode,
  NeutralObjective,
  Particle,
  Projectile,
  ResearchKind,
  ScanPulse,
  SporeDrop,
  SupplyDepot,
  TargetMode,
  TeamId,
  TeamState,
  TowerPad,
  TowerType,
  TowerUpgradeMode,
  UnitDef,
  UnitEntity,
  Vec2,
} from './types';
import { PvpWorldState, SpectatorTeamSummary, SpectatorViewMode } from './pvpTypes';

interface TeamAiState {
  enabled: boolean;
  difficulty: Difficulty;
  archetype: AIArchetype;
  primaryLane: LaneId;
  secondaryLane: LaneId;
  decisionTimer: number;
  scanTimer: number;
  activeTimer: number;
  ambushTimer: number;
  bioTimingTimer: number;
  lastBioArmorySum: number;
  stanceCooldown: number;
}

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function pointOnLane(lane: LaneId, progress: number): Vec2 {
  const pts = LANE_WAYPOINTS[lane];
  const clamped = clamp(progress, 0, 1);
  const scaled = clamped * (pts.length - 1);
  const idx = Math.min(Math.floor(scaled), pts.length - 2);
  const frac = scaled - idx;
  return {
    x: pts[idx].x + (pts[idx + 1].x - pts[idx].x) * frac,
    y: pts[idx].y + (pts[idx + 1].y - pts[idx].y) * frac,
  };
}

export function closestLaneToPoint(x: number, y: number, activeLanes: LaneId[] = [0, 1, 2]): LaneId {
  let bestLane: LaneId = activeLanes[0] ?? 1;
  let bestD = Infinity;
  for (const lane of activeLanes) {
    for (let i = 0; i <= 14; i++) {
      const p = pointOnLane(lane, i / 14);
      const d = distSq(x, y, p.x, p.y);
      if (d < bestD) {
        bestD = d;
        bestLane = lane;
      }
    }
  }
  return bestLane;
}

export class BattleEngine {
  public screen: GameScreen = 'TITLE';
  public mapMode: MapMode = 'standard';
  public elapsed = 0;
  public speedMultiplier: 1 | 1.5 = 1;
  public difficulty: Difficulty = 'standard';

  public player!: TeamState;
  public enemy!: TeamState;

  public units: UnitEntity[] = [];
  public pads: TowerPad[] = [];
  public depots: SupplyDepot[] = [];
  public barracks: BarracksBuilding[] = [];
  public armories: ArmoryBuilding[] = [];
  public extractors: GasExtractor[] = [];
  public objectives: NeutralObjective[] = [];
  private lastConstructClick: { kind: CancellableBuildingKind; id: string; atMs: number } | null = null;
  public projectiles: Projectile[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  public scans: ScanPulse[] = [];
  public strikes: ArtilleryStrike[] = [];
  public sporeDrops: SporeDrop[] = [];
  public ghosts: GhostIntel[] = [];
  public intelReports: IntelReport[] = [];

  public selectedLane: LaneId = 1;
  public squadSelected = false;
  public pendingAmbushUnitIds: number[] = [];
  public selectedTowerType: TowerType = 'watchtower';
  public towerUpgradeMode: TowerUpgradeMode = 'combat';
  public targetMode: TargetMode = 'none';
  public hoveredWorld: Vec2 | null = null;
  public hoveredPadId: string | null = null;

  public activeEvent: ActiveDynamicEvent | null = null;
  public nextEventCountdown = 80;
  public winner: 'player' | 'enemy' | null = null;

  public pvpMode = false;
  public isRemoteClient = false;
  public observerView: 'none' | SpectatorViewMode = 'none';
  private lastRemoteSnapshot: GameSnapshot | null = null;
  private remoteTargetPos = new Map<number, { x: number; y: number }>();
  private hasAppliedRemoteOnce = false;
  private prevRemoteProjIds = new Set<number>();
  private prevRemotePadState = new Map<string, string>();
  private prevRemoteBuiltDepots = new Set<string>();
  private prevRemoteBuiltBarracks = new Set<string>();
  private prevRemoteTechSig = '';
  private prevRemoteEventId: number | null = null;
  private prevRemoteLaneAlerts: [boolean, boolean, boolean] = [false, false, false];
  private prevRemotePlayerNexusHp = 0;

  public aiArchetype: AIArchetype = 'iron_bio';
  private aiControl: Record<'player' | 'enemy', TeamAiState> = {
    player: {
      enabled: false,
      difficulty: 'standard',
      archetype: 'iron_bio',
      primaryLane: 1,
      secondaryLane: 0,
      decisionTimer: 2.2,
      scanTimer: 28,
      activeTimer: 44,
      ambushTimer: 46,
      bioTimingTimer: 0,
      lastBioArmorySum: 0,
      stanceCooldown: 0,
    },
    enemy: {
      enabled: true,
      difficulty: 'standard',
      archetype: 'iron_bio',
      primaryLane: 1,
      secondaryLane: 0,
      decisionTimer: 2.2,
      scanTimer: 28,
      activeTimer: 44,
      ambushTimer: 46,
      bioTimingTimer: 0,
      lastBioArmorySum: 0,
      stanceCooldown: 0,
    },
  };

  public enemyNexusHpKnown: number | null = null;
  public enemyTechTierKnown: number | null = null;
  private lastKnownEnemyUnitIds = new Set<number>();
  private lastEnemyTowerSeen = new Set<string>();
  private laneAlertTimers: Record<LaneId, number> = { 0: 0, 1: 0, 2: 0 };
  private warnedNexusDepleted = false;

  // Symmetric Seat 2 (enemy) Fog-of-War & Intel tracking for authoritative PvP
  public enemyIntelReports: IntelReport[] = [];
  public enemyGhosts: GhostIntel[] = [];
  public playerNexusHpKnownByEnemy: number | null = null;
  public playerTechTierKnownByEnemy: number | null = null;
  private lastKnownPlayerUnitIds = new Set<number>();
  private lastPlayerTowerSeen = new Set<string>();
  private enemyLaneAlertTimers: Record<LaneId, number> = { 0: 0, 1: 0, 2: 0 };
  private enemyWarnedNexusDepleted = false;

  public hitstopTimer = 0;
  public shakeTime = 0;
  public shakeMagnitude = 0;

  // Sandbox Mode (1 player controls both sides with infinite gold & full features)
  public sandboxMode = false;
  public sandboxActiveTeam: 'player' | 'enemy' = 'player';
  public sandboxInstantMode = false;

  // Interactive New-Player Tutorial Mode
  public tutorialMode = false;
  public tutorialStepId: TutorialStepId | null = null;

  private nextId = 1;
  private nextIntelId = 1;
  private nextEventId = 1;
  private snapshotTimer = 0;
  private onSnapshot?: (snap: GameSnapshot) => void;

  public mapVersion = 0;

  constructor(onSnapshot?: (snap: GameSnapshot) => void) {
    this.onSnapshot = onSnapshot;
    this.initMatch('ironbound', 'standard', true);
  }

  public getControlledTeam(): 'player' | 'enemy' {
    return this.sandboxMode ? this.sandboxActiveTeam : 'player';
  }

  private isLocalControlled(team: 'player' | 'enemy'): boolean {
    return !this.pvpMode && team === this.getControlledTeam();
  }

  public getActiveLanes(): LaneId[] {
    return MAP_MODE_META[this.mapMode].activeLanes;
  }

  private sanitizeLane(lane: LaneId): LaneId {
    const active = this.getActiveLanes();
    return active.includes(lane) ? lane : active[0];
  }

  private createTeamState(faction: FactionId, mapMode: MapMode = 'standard'): TeamState {
    const isSimple = mapMode === 'simple';
    const baseHp = isSimple ? SIMPLE_NEXUS_BASE_HP : NEXUS_BASE_HP;
    const platingHp = isSimple ? SIMPLE_NEXUS_PLATING_HP : NEXUS_PLATING_HP;
    const maxHp = isSimple ? SIMPLE_NEXUS_MAX_HP : NEXUS_MAX_HP;
    return {
      faction,
      gold: isSimple ? STARTING_GOLD_SIMPLE : STARTING_GOLD_STANDARD,
      gas: isSimple ? STARTING_GAS_SIMPLE : STARTING_GAS_STANDARD,
      nexusGoldReserve: NEXUS_GOLD_RESERVE,
      nexusGoldMax: NEXUS_GOLD_RESERVE,
      nexusHarassTimer: 0,
      nexusHarassState: 'ok',
      nexusHarassEffPermille: 1000,
      econLevel: 1,
      techTier: 1,
      armoryLevels: { trackA: 0, trackB: 0, trackC: 0, trackD: 0, trackE: 0, trackF: 0 },
      specialTechsDone: [false, false],
      specialTechLevels: [0, 0],
      globalAttackBuffTimer: 0,
      nexusHp: maxHp,
      nexusMaxHp: maxHp,
      nexusBaseHp: baseHp,
      nexusPlatingHp: platingHp,
      nexusPlatingBroken: false,
      nexusPlatingThresholdFp: toFp(baseHp),
      nexusHpFp: toFp(maxHp),
      nexusMaxHpFp: toFp(maxHp),
      nexusAttackCooldownMs: 0,
      nexusHitFlash: 0,
      scanCooldown: SCAN_INITIAL_COOLDOWN,
      activeCooldown: FACTION_SKILL_INITIAL_COOLDOWN,
      kActiveCooldown: 0,
      ambushCooldown: 0,
      squadActive: false,
      squadStance: 'push',
      squadTarget: null,
      laneStances: { 0: 'hold_tower', 1: 'hold_tower', 2: 'hold_tower' },
      laneBuffTimer: { 0: 0, 1: 0, 2: 0 },
      trainingQueue: [],
      activeResearches: [],
      unitsTrained: 0,
      unitsLost: 0,
      objectivesClaimed: 0,
      scansUsed: 0,
      ambushesLaunched: 0,
    };
  }

  public initMatch(
    playerFaction: FactionId,
    difficulty: Difficulty,
    stayOnTitle = false,
    enemyFactionOption: EnemyFactionOption = 'random',
    mapMode: MapMode = 'standard',
    enemyArchetypeOption: AIArchetypeOption = 'random'
  ) {
    this.mapMode = mapMode;
    const isSimple = mapMode === 'simple';
    this.pvpMode = false;
    this.sandboxMode = false;
    this.sandboxActiveTeam = 'player';
    this.sandboxInstantMode = false;
    this.tutorialMode = false;
    this.tutorialStepId = null;
    this.isRemoteClient = false;
    this.lastRemoteSnapshot = null;
    this.remoteTargetPos.clear();
    this.hasAppliedRemoteOnce = false;
    this.prevRemoteProjIds.clear();
    this.prevRemotePadState.clear();
    this.prevRemoteBuiltDepots.clear();
    this.prevRemoteBuiltBarracks.clear();
    this.prevRemoteTechSig = '';
    this.prevRemoteEventId = null;
    this.prevRemoteLaneAlerts = [false, false, false];
    this.prevRemotePlayerNexusHp = 0;
    this.difficulty = difficulty;
    let enemyFaction: FactionId;
    if (enemyFactionOption === 'random') {
      const others = FACTION_ORDER.filter((f) => f !== playerFaction);
      enemyFaction = others[Math.floor(Math.random() * others.length)];
    } else {
      enemyFaction = enemyFactionOption;
    }

    this.player = this.createTeamState(playerFaction, mapMode);
    this.enemy = this.createTeamState(enemyFaction, mapMode);
    if (difficulty === 'commander') {
      this.enemy.gold += COMMANDER_BONUS_GOLD;
    }

    this.elapsed = 0;
    this.speedMultiplier = 1;
    this.units = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.scans = [];
    this.strikes = [];
    this.sporeDrops = [];
    this.ghosts = [];
    this.intelReports = [];
    this.enemyIntelReports = [];
    this.enemyGhosts = [];
    this.activeEvent = null;
    this.nextEventCountdown = isSimple ? 105 : 68;
    this.winner = null;
    this.selectedLane = isSimple ? 0 : 1;
    this.squadSelected = false;
    this.pendingAmbushUnitIds = [];
    this.selectedTowerType = 'watchtower';
    this.towerUpgradeMode = 'combat';
    this.targetMode = 'none';
    this.enemyNexusHpKnown = null;
    this.enemyTechTierKnown = null;
    this.lastKnownEnemyUnitIds.clear();
    this.lastEnemyTowerSeen.clear();
    this.laneAlertTimers = { 0: 0, 1: 0, 2: 0 };
    this.warnedNexusDepleted = false;
    this.playerNexusHpKnownByEnemy = null;
    this.playerTechTierKnownByEnemy = null;
    this.lastKnownPlayerUnitIds.clear();
    this.lastPlayerTowerSeen.clear();
    this.enemyLaneAlertTimers = { 0: 0, 1: 0, 2: 0 };
    this.enemyWarnedNexusDepleted = false;
    this.hitstopTimer = 0;
    this.shakeTime = 0;
    this.shakeMagnitude = 0;
    this.mapVersion++;

    this.observerView = 'none';
    this.aiControl = {
      player: this.createAiState(false, 'standard', mapMode, 'random'),
      enemy: this.createAiState(true, difficulty, mapMode, enemyArchetypeOption),
    };
    this.aiArchetype = this.aiControl.enemy.archetype;

    // Setup tower pads (8 pads on Top/Bot for Simple Mode, 12 pads across 3 lanes for Standard Mode)
    const padCoords = isSimple ? TOWER_PAD_COORDS.filter((c) => c.lane !== 1) : TOWER_PAD_COORDS;
    this.pads = padCoords.map((c) => ({
      ...c,
      team: null,
      towerType: null,
      level: 0,
      combatLevel: 0,
      miningLevel: 0,
      techLevel: 0,
      upgradeStack: [],
      building: false,
      upgrading: false,
      pendingTowerType: null,
      pendingUpgradeMode: null,
      buildRemaining: 0,
      buildTotal: 0,
      goldReserve: c.goldReserveMax,
      harassTimer: 0,
      harassState: 'ok' as const,
      harassEffPermille: 1000,
      hp: 0,
      maxHp: 0,
      hpFp: 0,
      maxHpFp: 0,
      armor: 0,
      baseArmorFp: 0,
      armorUpgradeLevel: 0,
      armorPerUpgradeFp: toFp(1),
      attributes: ['Armored', 'Mechanical', 'Structure'],
      attackCooldownMs: 0,
      hitFlash: 0,
      range: 0,
      vision: 0,
      detector: false,
      canHitAir: false,
      damage: 0,
      baseDamageFp: 0,
      attackUpgradeLevel: 0,
      damagePerUpgradeFp: 0,
      attackCount: 1,
      attackIntervalMs: 0,
      attackRate: 0,
      bonusVsTagFp: {},
      bonusPerUpgradeVsTagFp: {},
      splashRadius: 0,
      slowFactor: 0,
    }));

    // Setup destructible Supply Depot sockets (base + forward lane expansion slots)
    const activeLanes = this.getActiveLanes();
    this.depots = SUPPLY_DEPOT_COORDS.filter((c) => c.lane === undefined || activeLanes.includes(c.lane)).map((c) => ({
      ...c,
      built: false,
      building: false,
      buildRemaining: 0,
      buildTotal: SUPPLY_DEPOT_BUILD_TIME,
      hp: 0,
      maxHp: SUPPLY_DEPOT_HP,
      hpFp: 0,
      maxHpFp: toFp(SUPPLY_DEPOT_HP),
      baseArmorFp: toFp(SUPPLY_DEPOT_ARMOR),
      attributes: [...SUPPLY_DEPOT_ATTRIBUTES],
      hitFlash: 0,
    }));

    // Setup destructible Base Barracks sockets around both bases (T1 Q/W/Y, T2 E/R, T3 C/V -> 2x batch production!)
    this.barracks = BARRACKS_COORDS.map((c) => {
      const def = BARRACKS_DEFS[c.tier];
      return {
        ...c,
        built: false,
        building: false,
        level: 0,
        buildRemaining: 0,
        buildTotal: def.buildTime,
        hp: 0,
        maxHp: def.hp,
        hpFp: 0,
        maxHpFp: toFp(def.hp),
        upgradeThresholdsFp: [],
        baseArmorFp: toFp(BARRACKS_ARMOR),
        attributes: [...BARRACKS_ATTRIBUTES],
        hitFlash: 0,
      };
    });

    // Setup prerequisite Armory Buildings (Bio Lab for Bio upgrades; Mech Bay shared by Ground Mech & Air Mech upgrades)
    this.armories = ARMORY_BUILDING_COORDS.map((c) => {
      const def = ARMORY_BUILDING_DEFS[c.kind];
      return {
        ...c,
        built: false,
        building: false,
        buildRemaining: 0,
        buildTotal: def.buildTime,
        hp: 0,
        maxHp: def.hp,
        hpFp: 0,
        maxHpFp: toFp(def.hp),
        baseArmorFp: toFp(ARMORY_BUILDING_ARMOR),
        attributes: [...ARMORY_BUILDING_ATTRIBUTES],
        hitFlash: 0,
      };
    });

    // Setup Gas Extractor sockets behind Nexus & every active Tower Pad
    this.extractors = GAS_EXTRACTOR_COORDS.filter(
      (c) => c.lane === null || activeLanes.includes(c.lane)
    ).map((c) => ({
      ...c,
      team: null,
      level: 0,
      built: false,
      building: false,
      upgrading: false,
      buildRemaining: 0,
      buildTotal: GAS_EXTRACTOR_LEVELS[1].time,
      harassState: 'ok' as const,
      harassEffPermille: 1000,
      hp: 0,
      maxHp: GAS_EXTRACTOR_LEVELS[1].hp,
      hpFp: 0,
      maxHpFp: toFp(GAS_EXTRACTOR_LEVELS[1].hp),
      upgradeThresholdsFp: [],
      baseArmorFp: toFp(GAS_EXTRACTOR_ARMOR),
      attributes: [...GAS_EXTRACTOR_ATTRIBUTES],
      hitFlash: 0,
    }));
    this.lastConstructClick = null;

    // No free starting towers: both sides open with only their Nexus and choose where & when to expand/fortify!

    // Setup Neutral Objectives in Wild Jungle Fog
    const swapJungle = Math.random() < 0.5;
    this.objectives = [];
    const jungleNodes = isSimple ? SIMPLE_JUNGLE_NODE_COORDS : JUNGLE_NODE_COORDS;

    for (const jn of jungleNodes) {
      if (jn.role === 'rich_vein' || jn.role === 'beacon') {
        const isVein = (jn.role === 'rich_vein') !== swapJungle;
        const kind = isVein ? 'crystal_vein' : 'ancient_beacon';
        this.objectives.push({
          id: jn.id,
          zone: 'jungle',
          lane: jn.lane,
          jungleZone: jn.jungleZone,
          kind,
          name: OBJECTIVE_META[kind].name,
          x: jn.x,
          y: jn.y,
          owner: 'neutral',
          captureProgress: 0,
        hp: 0,
        maxHp: 0,
        hpFp: 0,
        maxHpFp: 0,
        baseArmorFp: 0,
        attributes: [],
        goldReserve: isVein ? 4500 : 0,
        goldReserveMax: isVein ? 4500 : 0,
        cleared: false,
        respawnTimer: 0,
        hitFlash: 0,
      });
      } else {
        this.objectives.push({
          id: jn.id,
          zone: 'jungle',
          lane: jn.lane,
          jungleZone: jn.jungleZone,
          kind: 'creep_camp',
          name: OBJECTIVE_META.creep_camp.name,
          x: jn.x,
          y: jn.y,
          owner: 'neutral',
          captureProgress: 0,
          hp: 0,
          maxHp: 0,
          hpFp: 0,
          maxHpFp: 0,
          baseArmorFp: 0,
          attributes: [],
          goldReserve: 0,
          goldReserveMax: 0,
          cleared: false,
          respawnTimer: 0,
          hitFlash: 0,
        });
        this.spawnNeutralCreeps(jn.lane, jn.x, jn.y, true);
      }
    }

    // 2) Standard 3-Lane Mode places an Ancient Barricade on one random side lane; Simple Mode keeps both lanes clear
    if (!isSimple) {
      const barLane: LaneId = Math.random() < 0.5 ? 0 : 2;
      const barPos = LANE_MID_COORDS[barLane];
      this.objectives.push({
        id: `lane_bar_${barLane}`,
        zone: 'lane',
        lane: barLane,
        kind: 'barricade',
        name: OBJECTIVE_META.barricade.name,
        x: barPos.x,
        y: barPos.y,
        owner: 'neutral',
        captureProgress: 0,
        hp: BARRICADE_HP,
        maxHp: BARRICADE_HP,
        hpFp: toFp(BARRICADE_HP),
        maxHpFp: toFp(BARRICADE_HP),
        baseArmorFp: toFp(BARRICADE_ARMOR),
        attributes: [...BARRICADE_ATTRIBUTES],
        goldReserve: 0,
        goldReserveMax: 0,
        cleared: false,
        respawnTimer: 0,
        hitFlash: 0,
      });

      const starterUnit = FACTIONS[playerFaction].units[0];
      this.spawnUnitSquad('player', starterUnit, 1, true);
      const enemyStarter = FACTIONS[enemyFaction].units[0];
      this.spawnUnitSquad('enemy', enemyStarter, 1, true);

      this.pushIntelBoth(
        `戰場展開：${LANE_SHORT_NAMES[barLane]}有遠古路障；上下野區迷霧蘊藏富礦與魔獸營地，主動出擊以掌握優勢！`,
        `戰場展開：${LANE_SHORT_NAMES[barLane]}有遠古路障；上下野區迷霧蘊藏富礦與魔獸營地，主動出擊以掌握優勢！`,
        'info',
        'info'
      );
    } else {
      const starterUnit = FACTIONS[playerFaction].units[0];
      this.spawnUnitSquad('player', starterUnit, 0, true);
      const enemyStarter = FACTIONS[enemyFaction].units[0];
      this.spawnUnitSquad('enemy', enemyStarter, 0, true);

      this.pushIntelBoth(
        '簡易雙線速戰展開：上下兩路寬距分離，中央野區蘊藏富礦與魔獸營地；可專攻一路猛推，或用 [X] 穿越中央奇襲！',
        '簡易雙線速戰展開：上下兩路寬距分離，中央野區蘊藏富礦與魔獸營地；可專攻一路猛推，或用 [X] 穿越中央奇襲！',
        'info',
        'info'
      );
    }

    this.screen = stayOnTitle ? 'TITLE' : 'PLAYING';
    this.emitSnapshot();
  }

  private createAiState(
    enabled: boolean,
    difficulty: Difficulty,
    mapMode: MapMode = 'standard',
    archetypeOption: AIArchetypeOption = 'random'
  ): TeamAiState {
    const lanes: LaneId[] = mapMode === 'simple' ? [0, 2] : [0, 1, 2];
    const primaryLane = lanes[Math.floor(Math.random() * lanes.length)];
    const otherLanes = lanes.filter((l) => l !== primaryLane);
    const secondaryLane = otherLanes[Math.floor(Math.random() * otherLanes.length)] ?? primaryLane;
    const archetype: AIArchetype =
      archetypeOption === 'random'
        ? AI_ARCHETYPE_ORDER[Math.floor(Math.random() * AI_ARCHETYPE_ORDER.length)]
        : archetypeOption;
    const diffDecisionBase = difficulty === 'commander' ? 1.35 : difficulty === 'rookie' ? 3.4 : 2.1;
    const diffSkillPad = difficulty === 'rookie' ? 14 : difficulty === 'commander' ? -6 : 0;
    return {
      enabled,
      difficulty,
      archetype,
      primaryLane,
      secondaryLane,
      decisionTimer: diffDecisionBase + Math.random() * 0.5,
      scanTimer: Math.max(12, 24 + diffSkillPad + Math.random() * 6),
      activeTimer: Math.max(20, 36 + diffSkillPad + Math.random() * 8),
      ambushTimer: Math.max(18, (archetype === 'iron_bio' ? 24 : mapMode === 'simple' ? 30 : 38) + diffSkillPad + Math.random() * 8),
      bioTimingTimer: 0,
      lastBioArmorySum: 0,
      stanceCooldown: 0,
    };
  }

  public initPvpMatch(leftFaction: FactionId, rightFaction: FactionId, mapMode: MapMode = 'standard') {
    this.initCustomMatch(leftFaction, rightFaction, null, null, mapMode);
  }

  public initCustomMatch(
    leftFaction: FactionId,
    rightFaction: FactionId,
    leftAi: Difficulty | null,
    rightAi: Difficulty | null,
    mapMode: MapMode = 'standard',
    leftAiArchetype: AIArchetypeOption = 'random',
    rightAiArchetype: AIArchetypeOption = 'random'
  ) {
    this.initMatch(leftFaction, 'standard', false, rightFaction, mapMode, rightAiArchetype);
    this.pvpMode = true;
    this.isRemoteClient = false;
    this.observerView = 'none';
    this.speedMultiplier = 1;
    this.aiControl = {
      player: this.createAiState(leftAi !== null, leftAi ?? 'standard', mapMode, leftAiArchetype),
      enemy: this.createAiState(rightAi !== null, rightAi ?? 'standard', mapMode, rightAiArchetype),
    };
    this.aiArchetype = this.aiControl.enemy.archetype;
    const cmdGold = mapMode === 'simple' ? 320 : 290;
    if (leftAi === 'commander') {
      this.player.gold = cmdGold;
    }
    if (rightAi === 'commander') {
      this.enemy.gold = cmdGold;
    }
    this.emitSnapshot();
  }

  public surrender(team: 'player' | 'enemy') {
    if (this.screen !== 'PLAYING' && this.screen !== 'PAUSED') return;
    const victor: 'player' | 'enemy' = team === 'player' ? 'enemy' : 'player';
    this.winner = victor;
    this.screen = 'GAME_OVER';
    this.pushIntelFor(team, '我方已宣告投降。', 'warn');
    this.pushIntelFor(victor, '對手已投降，我軍獲得勝利！', 'info');
    if (!this.pvpMode) tacticalAudio.playVictory(victor === 'player');
    this.emitSnapshot();
  }

  public startMatch(
    playerFaction: FactionId,
    difficulty: Difficulty,
    enemyFactionOption: EnemyFactionOption = 'random',
    mapMode: MapMode = 'standard',
    enemyArchetypeOption: AIArchetypeOption = 'random'
  ) {
    tacticalAudio.playClick();
    this.initMatch(playerFaction, difficulty, false, enemyFactionOption, mapMode, enemyArchetypeOption);
  }

  public startSandboxMatch(
    leftFaction: FactionId,
    rightFaction: FactionId,
    mapMode: MapMode = 'standard'
  ) {
    tacticalAudio.playClick();
    this.initMatch(leftFaction, 'standard', false, rightFaction, mapMode, 'random');
    this.sandboxMode = true;
    this.sandboxActiveTeam = 'player';
    this.sandboxInstantMode = false;
    this.aiControl.player.enabled = false;
    this.aiControl.enemy.enabled = false;
    this.player.gold = 99999;
    this.enemy.gold = 99999;
    this.player.scanCooldown = 0;
    this.enemy.scanCooldown = 0;
    this.player.activeCooldown = 0;
    this.enemy.activeCooldown = 0;
    this.pushIntelFor('player', '沙盒模式啟動：雙邊無限金錢、全視野！按 [Tab] 切換藍方(左) / 紅方(右) 操作', 'info');
    this.emitSnapshot();
  }

  public startTutorialMatch() {
    tacticalAudio.playClick();
    this.initMatch('ironbound', 'rookie', false, 'ironbound', 'simple', 'random');
    this.tutorialMode = true;
    this.tutorialStepId = 'train_unit';
    this.selectedLane = 0;
    this.aiControl.player.enabled = false;
    this.aiControl.enemy.enabled = false;
    this.player.gold = 380;
    this.player.gas = 40;
    this.player.scanCooldown = 0;
    this.player.activeCooldown = 0;
    this.player.ambushCooldown = 0;
    this.enemy.gold = 180;
    this.enemy.gas = 0;
    this.enemy.laneStances[0] = 'hold_tower';
    this.enemy.laneStances[2] = 'hold_tower';
    this.nextEventCountdown = 9999; // Keep jungle events quiet during tutorial basics
    this.pushIntelFor('player', '新手實戰教學展開：依照上方指引完成步驟，每步皆贈送金礦與瓦斯補給！', 'info');
    this.emitSnapshot();
  }

  public advanceTutorialStep(
    nextStepId: TutorialStepId | null,
    rewardGold: number,
    rewardGas: number,
    wakeEnemy = false
  ) {
    if (!this.tutorialMode) return;
    this.tutorialStepId = nextStepId;
    if (rewardGold > 0) this.player.gold += rewardGold;
    if (rewardGas > 0) this.player.gas += rewardGas;
    if (rewardGold > 0 || rewardGas > 0) {
      const parts: string[] = [];
      if (rewardGold > 0) parts.push(`+${rewardGold}G`);
      if (rewardGas > 0) parts.push(`+${rewardGas}氣`);
      this.floatingTexts.push({
        x: PLAYER_NEXUS_POS.x + 12,
        y: PLAYER_NEXUS_POS.y - 44,
        text: `教學獎勵 ${parts.join(' ')}`,
        color: '#34D399',
        life: 1.8,
        maxLife: 1.8,
      });
    }

    if (nextStepId === 'use_scan') {
      this.player.scanCooldown = 0;
      // Ensure an enemy patrol is present in upper-right fog for a rewarding scan
      const enemyOnTop = this.units.filter((u) => u.team === 'enemy' && u.lane === 0 && u.hp > 0).length;
      if (enemyOnTop < 2) {
        const marine = FACTIONS.ironbound.units[0];
        this.spawnUnitSquad('enemy', marine, 0, true);
      }
    } else if (nextStepId === 'use_ambush') {
      this.player.ambushCooldown = 0;
      const myUnits = this.units.filter((u) => u.team === 'player' && u.hp > 0).length;
      if (myUnits < 2) {
        const marine = FACTIONS.ironbound.units[0];
        this.spawnUnitSquad('player', marine, this.selectedLane, true);
      }
    } else if (nextStepId === 'final_push' || wakeEnemy) {
      this.player.activeCooldown = 0;
      this.player.scanCooldown = 0;
      this.aiControl.enemy.enabled = true;
      this.enemy.laneStances[0] = 'hold_tower';
      this.enemy.laneStances[2] = 'hold_tower';
      // Give the enemy a modest defense wave so [F] Orbital Artillery feels impactful
      const enemyCount = this.units.filter((u) => u.team === 'enemy' && u.hp > 0).length;
      if (enemyCount < 4) {
        this.spawnUnitSquad('enemy', FACTIONS.ironbound.units[0], 0, true);
        this.spawnUnitSquad('enemy', FACTIONS.ironbound.units[1], 2, true);
      }
      this.pushIntelFor('player', '最終試煉：軌道砲擊 [F] 已充能完畢，轟炸敵陣並摧毀右側敵方主堡！', 'warn');
    }

    tacticalAudio.playBuildDone();
    this.emitSnapshot();
  }

  public exitTutorialGuide() {
    if (!this.tutorialMode) return;
    this.tutorialMode = false;
    this.tutorialStepId = null;
    this.aiControl.enemy.enabled = true;
    this.pushIntelFor('player', '已切換為自由對戰模式（敵方新兵 AI 已啟動）。', 'info');
    this.emitSnapshot();
  }

  public getTutorialBeacon(): { x: number; y: number; radius: number; label: string; color: string } | null {
    if (!this.tutorialMode || !this.tutorialStepId || this.screen !== 'PLAYING') return null;

    switch (this.tutorialStepId) {
      case 'build_tower': {
        const pad =
          this.pads.find((p) => p.homeSide === 'player' && p.lane === this.selectedLane && !p.towerType && !p.building) ??
          this.pads.find((p) => p.homeSide === 'player' && !p.towerType && !p.building);
        if (pad) return { x: pad.x, y: pad.y, radius: 34, label: '點此建塔 [T]', color: '#38BDF8' };
        return null;
      }
      case 'build_econ_infra': {
        const hasDepot = this.depots.some((d) => d.team === 'player' && (d.built || d.building));
        if (!hasDepot) {
          const dep = this.depots.find((d) => d.team === 'player' && !d.built && !d.building);
          if (dep) return { x: dep.x, y: dep.y, radius: 28, label: '補給站 [B]', color: '#22D3EE' };
        }
        const hasExt = this.extractors.some((e) => e.team === 'player' && (e.built || e.building));
        if (!hasExt) {
          const ext = this.extractors.find((e) => !e.built && !e.building && this.isExtractorEligibleForTeam(e, 'player'));
          if (ext) return { x: ext.x, y: ext.y, radius: 28, label: '瓦斯挖掘場 [P]', color: '#2DD4BF' };
        }
        return null;
      }
      case 'build_barracks': {
        const t1 = this.barracks.find((b) => b.team === 'player' && b.tier === 1 && !b.built && !b.building);
        if (t1) return { x: t1.x, y: t1.y, radius: 30, label: 'T1 兵營 [,]', color: '#FBBF24' };
        return null;
      }
      case 'armory_upgrade': {
        const hasAny = this.armories.some((a) => a.team === 'player' && (a.built || a.building));
        if (!hasAny) {
          const bio = this.armories.find((a) => a.team === 'player' && a.kind === 'bio_lab');
          if (bio) return { x: bio.x, y: bio.y, radius: 28, label: '生物研究所 [[]', color: '#34D399' };
        }
        return null;
      }
      case 'use_scan': {
        return { x: 1150, y: 175, radius: 74, label: '按 [S] 點此掃描迷霧', color: '#38BDF8' };
      }
      case 'use_ambush': {
        if (this.targetMode === 'ambush_target') {
          return { x: 800, y: 450, radius: 48, label: '點擊此處派兵奇襲', color: '#22D3EE' };
        }
        const u = this.units.find((unit) => unit.team === 'player' && unit.hp > 0);
        if (u) {
          return { x: u.x, y: u.y, radius: 44, label: '按 [X] 後點此框選部隊', color: '#22D3EE' };
        }
        return null;
      }
      case 'final_push': {
        return {
          x: ENEMY_NEXUS_POS.x,
          y: ENEMY_NEXUS_POS.y,
          radius: 68,
          label: '按 [F] 轟炸並摧毀敵主堡',
          color: '#F59E0B',
        };
      }
      default:
        return null;
    }
  }

  public getControlledTeamState(): TeamState {
    if (this.isRemoteClient) return this.lastRemoteSnapshot?.player ?? this.player;
    return this.getControlledTeam() === 'player' ? this.player : this.enemy;
  }

  public switchSandboxTeam(team: 'player' | 'enemy') {
    if (!this.sandboxMode) return;
    this.sandboxActiveTeam = team;
    this.targetMode = 'none';
    this.pendingAmbushUnitIds = [];
    this.squadSelected = false;
    tacticalAudio.playClick();
    this.emitSnapshot();
  }

  public toggleSandboxInstantMode() {
    if (!this.sandboxMode) return;
    this.sandboxInstantMode = !this.sandboxInstantMode;
    tacticalAudio.playClick();
    this.emitSnapshot();
  }

  public sandboxMaxOutTeam(target: 'player' | 'enemy' | 'both') {
    if (!this.sandboxMode) return;
    const teams: Array<'player' | 'enemy'> = target === 'both' ? ['player', 'enemy'] : [target];
    for (const tm of teams) {
      const st = tm === 'player' ? this.player : this.enemy;
      st.gold = 99999;
      st.gas = 99999;
      st.techTier = 3;
      st.econLevel = ECON_MAX_LEVEL;
      const fDef = FACTIONS[st.faction];
      for (const tr of fDef.armoryTrackOrder) {
        st.armoryLevels[tr] = 3;
      }
      st.specialTechLevels = [fDef.specialTechs[0].level2 ? 2 : 1, fDef.specialTechs[1].level2 ? 2 : 1];
      st.specialTechsDone = [true, true];
      st.scanCooldown = 0;
      st.activeCooldown = 0;
      st.kActiveCooldown = 0;
      st.ambushCooldown = 0;
      st.activeResearches = [];

      // Max all 3 Barracks to Lv.4
      for (const bk of this.barracks) {
        if (bk.team !== tm) continue;
        const lv4Hp = getBarracksHpForLevel(bk.tier, 4);
        bk.built = true;
        bk.building = false;
        bk.level = 4;
        bk.buildRemaining = 0;
        bk.maxHp = lv4Hp;
        bk.maxHpFp = toFp(lv4Hp);
        bk.hp = lv4Hp;
        bk.hpFp = toFp(lv4Hp);
        bk.upgradeThresholdsFp = [
          toFp(getBarracksHpForLevel(bk.tier, 1)),
          toFp(getBarracksHpForLevel(bk.tier, 2)),
          toFp(getBarracksHpForLevel(bk.tier, 3)),
        ];
      }

      // Build both prerequisite Armory Buildings (Bio Lab + Mech Bay)
      for (const arm of this.armories) {
        if (arm.team !== tm) continue;
        const def = ARMORY_BUILDING_DEFS[arm.kind];
        arm.built = true;
        arm.building = false;
        arm.buildRemaining = 0;
        arm.maxHp = def.hp;
        arm.maxHpFp = toFp(def.hp);
        arm.hp = def.hp;
        arm.hpFp = toFp(def.hp);
      }

      // Max Nexus Gas Extractor to Lv.3
      for (const ext of this.extractors) {
        if (ext.homeSide !== tm || ext.padId !== null) continue;
        const lv3Hp = getGasExtractorHpForLevel(3);
        ext.team = tm;
        ext.built = true;
        ext.building = false;
        ext.upgrading = false;
        ext.level = 3;
        ext.buildRemaining = 0;
        ext.maxHp = lv3Hp;
        ext.maxHpFp = toFp(lv3Hp);
        ext.hp = lv3Hp;
        ext.hpFp = toFp(lv3Hp);
        ext.upgradeThresholdsFp = [toFp(getGasExtractorHpForLevel(1)), toFp(getGasExtractorHpForLevel(2))];
      }

      // Build base Supply Depots to reach 100 supply cap
      let builtCount = this.depots.filter((d) => d.team === tm && d.built).length;
      for (const dep of this.depots) {
        if (dep.team !== tm || dep.built || dep.isForward) continue;
        if (builtCount >= 4) break;
        dep.built = true;
        dep.building = false;
        dep.buildRemaining = 0;
        dep.maxHp = SUPPLY_DEPOT_HP;
        dep.maxHpFp = toFp(SUPPLY_DEPOT_HP);
        dep.hp = SUPPLY_DEPOT_HP;
        dep.hpFp = toFp(SUPPLY_DEPOT_HP);
        builtCount++;
      }

      this.refreshTeamUnits(tm);
      for (const pad of this.pads) {
        if (pad.team === tm && pad.towerType && !pad.building && pad.combatLevel >= 1) {
          this.applyTowerStats(pad, pad.towerType, pad.combatLevel as 1 | 2 | 3, pad.miningLevel, pad.techLevel);
        }
      }
      const pos = tm === 'player' ? PLAYER_NEXUS_POS : ENEMY_NEXUS_POS;
      this.spawnRingParticle(pos.x, pos.y, tm === 'player' ? '#38BDF8' : '#FB7185', 110);
      this.addFloatingText(pos.x, pos.y - 52, '滿科 T3 · +3/+3 · 營Lv.4 · 雙研究所!', '#FDE047');
    }
    tacticalAudio.playEventHorn();
    this.emitSnapshot();
  }

  public sandboxClearUnits() {
    if (!this.sandboxMode) return;
    this.units = this.units.filter((u) => u.team === 'neutral');
    this.projectiles = [];
    this.strikes = [];
    this.sporeDrops = [];
    this.player.trainingQueue = [];
    this.enemy.trainingQueue = [];
    this.player.squadActive = false;
    this.player.squadTarget = null;
    this.enemy.squadActive = false;
    this.enemy.squadTarget = null;
    this.squadSelected = false;
    this.pendingAmbushUnitIds = [];
    tacticalAudio.playClick();
    this.emitSnapshot();
  }

  public setScreen(screen: GameScreen) {
    this.screen = screen;
    this.emitSnapshot();
  }

  public togglePause() {
    if (this.screen === 'PLAYING') this.screen = 'PAUSED';
    else if (this.screen === 'PAUSED') this.screen = 'PLAYING';
    this.emitSnapshot();
  }

  public toggleSpeed() {
    this.speedMultiplier = this.speedMultiplier === 1 ? 1.5 : 1;
    tacticalAudio.playClick();
    this.emitSnapshot();
  }

  public selectLane(lane: LaneId) {
    this.selectedLane = this.sanitizeLane(lane);
    this.squadSelected = false;
    tacticalAudio.playLaneSelect(this.selectedLane);
    this.emitSnapshot();
  }

  public selectSquad() {
    const active = this.isRemoteClient
      ? Boolean(this.lastRemoteSnapshot?.player.squadActive)
      : (this.getControlledTeam() === 'player' ? this.player.squadActive : this.enemy.squadActive);
    if (!active) return;
    this.squadSelected = true;
    this.targetMode = 'none';
    this.pendingAmbushUnitIds = [];
    tacticalAudio.playClick();
    this.emitSnapshot();
  }

  private triggerRetreatAbort(team: 'player' | 'enemy', lane: LaneId) {
    let frontUnit: UnitEntity | null = null;
    for (const u of this.units) {
      if (u.team !== team || u.hp <= 0 || u.inAmbushSquad) continue;
      if (u.lane !== lane && u.jungleTargetLane !== lane) continue;
      if (u.jungleWaypoints.length > 0) {
        u.jungleWaypoints = [];
        u.jungleTargetLane = null;
        u.lane = lane;
      }
      if (!frontUnit || (team === 'player' ? u.x > frontUnit.x : u.x < frontUnit.x)) {
        frontUnit = u;
      }
    }
    if (frontUnit) {
      this.addFloatingText(frontUnit.x, frontUnit.y - 20, '撤退反擊！', '#FB7185');
      this.spawnRingParticle(frontUnit.x, frontUnit.y, '#FB7185', 44);
    }
  }

  public setLaneStance(lane: LaneId, stance: LaneStance) {
    this.setTeamLaneStance(this.getControlledTeam(), lane, stance);
  }

  public setTeamLaneStance(team: 'player' | 'enemy', lane: LaneId, stance: LaneStance) {
    const st = team === 'player' ? this.player : this.enemy;
    const safeLane = this.sanitizeLane(lane);
    const prev = st.laneStances[safeLane];
    st.laneStances[safeLane] = stance;
    if (stance === 'retreat' && prev !== 'retreat') {
      this.triggerRetreatAbort(team, safeLane);
    }
    if (this.isLocalControlled(team)) {
      tacticalAudio.playStance(stance);
      this.emitSnapshot();
    }
  }

  public setSquadStance(stance: LaneStance) {
    this.setTeamSquadStance(this.getControlledTeam(), stance);
  }

  public setTeamSquadStance(team: 'player' | 'enemy', stance: LaneStance) {
    const st = team === 'player' ? this.player : this.enemy;
    if (!st.squadActive) return;
    const prev = st.squadStance;
    st.squadStance = stance;
    // Clear pending rally destination so squad units IMMEDIATELY obey the new stance command!
    for (const u of this.units) {
      if (u.team === team && u.inAmbushSquad && u.hpFp > 0) {
        u.squadDestination = null;
      }
    }
    if (stance === 'retreat' && prev !== 'retreat') {
      const lead = this.units.find((u) => u.team === team && u.inAmbushSquad && u.hpFp > 0);
      if (lead) {
        this.addFloatingText(lead.x, lead.y - 20, '編隊撤退！', '#FB7185');
        this.spawnRingParticle(lead.x, lead.y, '#FB7185', 44);
      }
    }
    if (this.isLocalControlled(team)) {
      tacticalAudio.playStance(stance);
      this.emitSnapshot();
    }
  }

  public setTargetMode(mode: TargetMode) {
    const ctrl = this.getControlledTeam();
    const ctrlState = this.isRemoteClient
      ? this.lastRemoteSnapshot?.player ?? this.player
      : ctrl === 'player'
      ? this.player
      : this.enemy;
    if (this.targetMode === mode) {
      this.targetMode = 'none';
      this.pendingAmbushUnitIds = [];
    } else {
      if (mode === 'scan' && ctrlState.scanCooldown > 0) {
        tacticalAudio.playDenied();
        return;
      }
      if (mode === 'faction_skill') {
        const f = FACTIONS[ctrlState.faction];
        if (ctrlState.activeCooldown > 0 || ctrlState.gold < f.activeCost) {
          tacticalAudio.playDenied();
          return;
        }
      }
      if (mode === 'k_boost') {
        const kLv = ctrlState.specialTechLevels?.[0] ?? (ctrlState.specialTechsDone[0] ? 1 : 0);
        if (kLv < 1 || (ctrlState.kActiveCooldown ?? 0) > 0) {
          tacticalAudio.playDenied();
          return;
        }
      }
      if (mode === 'ambush_select') {
        if (ctrlState.ambushCooldown > 0 || ctrlState.gold < JUNGLE_AMBUSH_COST) {
          tacticalAudio.playDenied();
          return;
        }
        this.pendingAmbushUnitIds = [];
      }
      this.targetMode = mode;
    }
    tacticalAudio.playClick();
    this.emitSnapshot();
  }

  public cancelAmbushTargeting() {
    this.targetMode = 'none';
    this.pendingAmbushUnitIds = [];
    tacticalAudio.playClick();
    this.emitSnapshot();
  }

  public selectTowerType(type: TowerType) {
    this.selectedTowerType = type;
    this.targetMode = 'build_tower';
    tacticalAudio.playClick();
    this.emitSnapshot();
  }

  public setTowerUpgradeMode(mode: TowerUpgradeMode) {
    this.towerUpgradeMode = mode;
    tacticalAudio.playClick();
    this.emitSnapshot();
  }

  private pushIntel(text: string, severity: 'info' | 'warn' | 'critical' = 'info') {
    this.pushIntelFor('player', text, severity);
  }

  private pushIntelFor(team: 'player' | 'enemy', text: string, severity: 'info' | 'warn' | 'critical' = 'info') {
    const list = team === 'player' ? this.intelReports : this.enemyIntelReports;
    list.unshift({
      id: this.nextIntelId++,
      time: this.elapsed,
      text,
      severity,
    });
    if (list.length > 6) list.pop();
  }

  private pushIntelBoth(
    playerText: string,
    enemyText: string,
    playerSev: 'info' | 'warn' | 'critical' = 'info',
    enemySev: 'info' | 'warn' | 'critical' = 'info'
  ) {
    this.pushIntelFor('player', playerText, playerSev);
    this.pushIntelFor('enemy', enemyText, enemySev);
  }

  private addFloatingText(x: number, y: number, text: string, color: string) {
    this.floatingTexts.push({ x, y, text, color, life: 1.4, maxLife: 1.4 });
  }

  private addShake(magnitude: number, duration = 0.22) {
    this.shakeMagnitude = Math.max(this.shakeMagnitude, magnitude);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  private spawnParticles(x: number, y: number, color: string, count: number, speed = 85, size = 3.2) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = speed * (0.35 + Math.random() * 0.85);
      const life = 0.25 + Math.random() * 0.35;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: size * (0.7 + Math.random() * 0.6),
        color,
        alpha: 1,
        life,
        maxLife: life,
      });
    }
  }

  private spawnRingParticle(x: number, y: number, color: string, size: number) {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      size,
      color,
      alpha: 0.9,
      life: 0.38,
      maxLife: 0.38,
      ring: true,
    });
  }

  public getStandingTowerCount(team: 'player' | 'enemy'): number {
    return this.pads.filter((p) => p.team === team && p.towerType !== null && !p.building && p.hp > 0).length;
  }

  public getControlledSectorCount(team: 'player' | 'enemy'): number {
    const towers = this.getStandingTowerCount(team);
    const jungleNodes = this.objectives.filter(
      (o) => o.zone === 'jungle' && (o.kind === 'crystal_vein' || o.kind === 'ancient_beacon') && o.owner === team
    ).length;
    return towers + jungleNodes;
  }

  public getMaxDepotsAllowed(team: 'player' | 'enemy'): number {
    const controlled = this.getControlledSectorCount(team);
    // 1 base + controlled sectors (start with 1 mid tower -> 2 allowed, 2 sectors -> 3, 3+ sectors -> 4 max)
    return clamp(1 + controlled, 2, SUPPLY_DEPOT_MAX_COUNT);
  }

  public getSupplyCap(team: 'player' | 'enemy'): number {
    const state = team === 'player' ? this.player : this.enemy;
    const baseCap = TECH_SUPPLY_BY_TIER[state.techTier];
    const builtDepots = this.depots.filter((d) => d.team === team && d.built && d.hp > 0).length;
    return Math.min(MAX_SUPPLY_LIMIT, baseCap + builtDepots * SUPPLY_DEPOT_BONUS);
  }

  public getSupplyUsed(team: 'player' | 'enemy'): number {
    const state = team === 'player' ? this.player : this.enemy;
    const liveUnits = this.units.filter((u) => u.team === team && u.hp > 0);
    let used = 0;
    for (const u of liveUnits) {
      const def = ALL_UNITS_BY_ID[u.defId];
      used += def ? def.supplyCost / def.squadSize : 2;
    }
    const f = FACTIONS[state.faction];
    for (const ord of state.trainingQueue) {
      used += (f.units[ord.unitIndex]?.supplyCost ?? 2) * (ord.multiplier ?? 1);
    }
    return Math.ceil(used);
  }

  public getBarracksBatchCapForUnit(team: 'player' | 'enemy', unitIndex: number): 1 | 2 | 3 | 4 {
    const bk = this.barracks.find(
      (b) => b.team === team && b.built && b.hp > 0 && BARRACKS_DEFS[b.tier].unitIndices.includes(unitIndex)
    );
    if (!bk || bk.level <= 1) return 1;
    return clamp(bk.level, 1, 4) as 1 | 2 | 3 | 4;
  }

  public hasStandingBarracksForUnit(team: 'player' | 'enemy', unitIndex: number): boolean {
    return this.getBarracksBatchCapForUnit(team, unitIndex) >= 2;
  }

  public getArmorySummaries(team: 'player' | 'enemy'): ArmoryBuildingSummary[] {
    return this.armories
      .filter((a) => a.team === team)
      .map((a) => ({
        id: a.id,
        kind: a.kind,
        built: a.built,
        building: a.building,
        buildRemaining: a.buildRemaining,
        buildTotal: a.buildTotal,
      }));
  }

  public hasArmoryBuilding(team: 'player' | 'enemy', kind: ArmoryBuildingKind): boolean {
    return this.armories.some((a) => a.team === team && a.kind === kind && a.built && a.hp > 0);
  }

  public isExtractorEligibleForTeam(ext: GasExtractor, team: 'player' | 'enemy'): boolean {
    if (ext.padId === null) {
      return ext.homeSide === team;
    }
    const pad = this.pads.find((p) => p.id === ext.padId);
    return Boolean(pad && pad.team === team && pad.towerType !== null && !pad.building && pad.hp > 0);
  }

  public getTeamGasUpgradeCount(team: 'player' | 'enemy'): number {
    let total = 0;
    for (const ext of this.extractors) {
      if (ext.team === team && ext.built && ext.hp > 0 && ext.level > 1) {
        total += ext.level - 1;
      }
    }
    return total;
  }

  public getGasIncomePerSec(team: 'player' | 'enemy'): number {
    const paceMult = this.mapMode === 'simple' ? SIMPLE_ECON_PACE_MULT : 1.0;
    const diffMult = this.getAiMiningMultiplier(team) * paceMult;
    let total = 0;
    for (const ext of this.extractors) {
      if (ext.team === team && ext.built && ext.hp > 0 && ext.level >= 1) {
        const eff = ext.harassEffPermille / 1000;
        total += GAS_EXTRACTOR_LEVELS[ext.level as 1 | 2 | 3].ratePerSec * eff * diffMult;
      }
    }
    return Number(total.toFixed(1));
  }

  public getIronArtilleryWaves(team: 'player' | 'enemy'): number {
    const state = team === 'player' ? this.player : this.enemy;
    const goldUpgrades = Math.max(0, state.econLevel - 1);
    const gasUpgrades = this.getTeamGasUpgradeCount(team);
    return 6 + goldUpgrades + gasUpgrades;
  }

  public getTechTowerBonuses(team: 'player' | 'enemy'): { cdRateBonus: number; researchRateBonus: number } {
    let cdRateBonus = 0;
    let researchRateBonus = 0;
    for (const pad of this.pads) {
      if (pad.team === team && pad.towerType !== null && !pad.building && !pad.upgrading && pad.hp > 0) {
        if (pad.towerType === 'tech_tower' && pad.combatLevel >= 1) {
          cdRateBonus += TECH_TOWER_CD_RATE_BY_LV[pad.combatLevel] ?? 0;
          researchRateBonus += TECH_TOWER_RES_RATE_BY_LV[pad.combatLevel] ?? 0;
        }
        if (pad.techLevel >= 1) {
          cdRateBonus += TOWER_TECH_CD_RATE_BY_LV[pad.techLevel] ?? 0;
        }
      }
    }
    return {
      cdRateBonus: Math.min(TECH_TOWER_MAX_CD_BONUS, cdRateBonus),
      researchRateBonus: Math.min(TECH_TOWER_MAX_RES_BONUS, researchRateBonus),
    };
  }

  public getBarracksSummaries(team: 'player' | 'enemy'): BarracksStatusSummary[] {
    return BARRACKS_TIERS.map((tier) => {
      const b = this.barracks.find((x) => x.team === team && x.tier === tier);
      return {
        tier,
        built: Boolean(b?.built),
        building: Boolean(b?.building),
        level: b ? b.level : 0,
        buildRemaining: b ? b.buildRemaining : 0,
        buildTotal: b ? b.buildTotal : BARRACKS_DEFS[tier].buildTime,
      };
    });
  }

  private evaluateMineHarass(
    owner: 'player' | 'enemy',
    x: number,
    y: number
  ): { state: 'ok' | 'harassed'; effPermille: number } {
    const enemyTeam: 'player' | 'enemy' = owner === 'player' ? 'enemy' : 'player';
    let minD = Infinity;
    for (const u of this.units) {
      if (u.team !== enemyTeam || u.hpFp <= 0) continue;
      const d = dist(u.x, u.y, x, y);
      if (d < minD) minD = d;
    }
    const effPermille = computeHarassEffPermille(minD);
    return { state: effPermille < 1000 ? 'harassed' : 'ok', effPermille };
  }

  private countHarassedMines(team: 'player' | 'enemy'): number {
    const state = team === 'player' ? this.player : this.enemy;
    let count = 0;
    if (state.nexusGoldReserve > 0 && state.nexusHarassState !== 'ok') count++;
    for (const pad of this.pads) {
      if (pad.team === team && pad.towerType !== null && !pad.building && pad.hp > 0 && pad.goldReserve > 0 && pad.harassState !== 'ok') {
        count++;
      }
    }
    for (const obj of this.objectives) {
      if (obj.kind === 'crystal_vein' && obj.owner === team && obj.goldReserve > 0 && obj.harassState && obj.harassState !== 'ok') {
        count++;
      }
    }
    return count;
  }

  public getIncomePerSec(team: 'player' | 'enemy'): number {
    const state = team === 'player' ? this.player : this.enemy;
    let total = 0;

    if (state.nexusGoldReserve > 0) {
      const harassEff = (state.nexusHarassEffPermille ?? 1000) / 1000;
      const platingEff = state.nexusPlatingBroken ? NEXUS_PLATING_BROKEN_MINE_EFF_PERMILLE / 1000 : 1;
      total += (ECON_BASE_MINE_RATE[state.econLevel] ?? 6.8) * harassEff * platingEff;
    } else {
      total += 2.0;
    }

    const towerMult = ECON_TOWER_BONUS_MULT[state.econLevel] ?? 1;
    for (const pad of this.pads) {
      if (pad.team === team && pad.towerType !== null && !pad.building && pad.hp > 0 && pad.goldReserve > 0) {
        const basePadRate = pad.slot === 'outer' ? OUTER_PAD_BASE_MINE_RATE : INNER_PAD_BASE_MINE_RATE;
        const econTowerBase =
          pad.towerType === 'econ_tower' ? (ECON_TOWER_MINING_MULT_BY_LV[pad.combatLevel] ?? 1.0) : 1.0;
        const padMiningBonus = 1 + pad.miningLevel * TOWER_MINING_UPGRADE_BONUS;
        const eff = (pad.harassEffPermille ?? 1000) / 1000;
        total += basePadRate * econTowerBase * padMiningBonus * towerMult * eff;
      }
    }

    const jungleTechScale = 0.85 + state.econLevel * 0.08;
    for (const obj of this.objectives) {
      if (obj.kind === 'crystal_vein' && obj.owner === team && obj.goldReserve > 0) {
        const eff = (obj.harassEffPermille ?? 1000) / 1000;
        total += 8.5 * jungleTechScale * eff;
      }
    }

    total *= this.getAiMiningMultiplier(team);
    if (this.mapMode === 'simple') {
      total *= SIMPLE_ECON_PACE_MULT;
    }
    return Math.round(total);
  }

  private getAiMiningMultiplier(team: 'player' | 'enemy'): number {
    const isAi = (!this.pvpMode && team === 'enemy') || (this.pvpMode && this.aiControl[team].enabled);
    if (!isAi) return 1.0;
    const diff = !this.pvpMode && team === 'enemy' ? this.difficulty : this.aiControl[team].difficulty;
    if (diff === 'commander') return 1.12;
    if (diff === 'rookie') return 0.9;
    return 1.0;
  }

  public trainUnit(unitIndex: number, lane?: LaneId, team: 'player' | 'enemy' = 'player'): boolean {
    const state = team === 'player' ? this.player : this.enemy;
    const f = FACTIONS[state.faction];
    const def = f.units[unitIndex];
    if (!def) return false;

    if (def.requiresBarracksTier) {
      const reqLv = def.requiresBarracksLevel ?? 1;
      const reqBk = this.barracks.find(
        (b) => b.team === team && b.tier === def.requiresBarracksTier && b.built && b.hp > 0 && b.level >= reqLv
      );
      if (!reqBk) {
        const bkLabel = reqLv > 1
          ? `${BARRACKS_DEFS[def.requiresBarracksTier].name} Lv.${reqLv}`
          : BARRACKS_DEFS[def.requiresBarracksTier].name;
        this.pushIntelFor(team, `訓練【${def.name}】需先建造／升級至 ${bkLabel}！`, 'warn');
        if (this.isLocalControlled(team)) {
          tacticalAudio.playDenied();
          this.emitSnapshot();
        }
        return false;
      }
    }

    const maxConcurrent = this.getBarracksBatchCapForUnit(team, unitIndex);
    const activeSameUnitCount = state.trainingQueue.filter((o) => o.unitIndex === unitIndex).length;
    if (state.techTier < def.tier || activeSameUnitCount >= maxConcurrent) {
      if (this.isLocalControlled(team)) tacticalAudio.playDenied();
      return false;
    }

    const supplyUsed = this.getSupplyUsed(team);
    const supplyCap = this.getSupplyCap(team);
    const totalCost = def.cost;
    const totalGasCost = def.gasCost ?? 0;
    const totalSupply = def.supplyCost;

    if (state.gold < totalCost) {
      if (this.isLocalControlled(team)) tacticalAudio.playDenied();
      return false;
    }

    if (totalGasCost > 0 && state.gas < totalGasCost) {
      this.pushIntelFor(
        team,
        `瓦斯不足 (${Math.floor(state.gas)}/${totalGasCost})！請按 [P] 在主堡或防禦塔後方建造／升級瓦斯挖掘場`,
        'warn'
      );
      if (this.isLocalControlled(team)) {
        tacticalAudio.playDenied();
        this.emitSnapshot();
      }
      return false;
    }

    if (supplyUsed + totalSupply > supplyCap) {
      this.pushIntelFor(team, `人口上限不足 (${supplyUsed}/${supplyCap})！請建造補給站 [B] 或升級科技階級`, 'warn');
      if (this.isLocalControlled(team)) {
        tacticalAudio.playDenied();
        this.emitSnapshot();
      }
      return false;
    }

    const defaultLane = this.getActiveLanes()[0];
    const targetLane = this.sanitizeLane(lane ?? (team === this.getControlledTeam() ? this.selectedLane : defaultLane));
    state.gold -= totalCost;
    state.gas -= totalGasCost;
    state.trainingQueue.push({
      id: this.nextId++,
      unitIndex,
      unitName: def.name,
      lane: targetLane,
      remaining: def.trainTime,
      total: def.trainTime,
      multiplier: 1,
    });

    if (this.isLocalControlled(team)) {
      tacticalAudio.playRecruit();
      this.emitSnapshot();
    }
    return true;
  }

  private computeUnitStats(state: TeamState, def: UnitDef) {
    let attackUpgradeLevel = 0;
    let armorUpgradeLevel = 0;
    let shieldArmorUpgradeLevel = 0;
    let maxHpPermille = 1000;
    let maxShieldPermille = 1000;
    let speedPermille = state.faction === 'dawn' ? 1120 : 1000;
    let rangePermille = 1000;
    let intervalPermille = 1000;
    let vision = def.vision;

    const bonusVsTagFp: TagBonusMapFp = toTagBonusFp(def.bonusVsTag);
    const bonusPerUpgradeVsTagFp: TagBonusMapFp = toTagBonusFp(def.bonusPerLevelVsTag);

    const lvA = state.armoryLevels.trackA ?? 0;
    const lvB = state.armoryLevels.trackB ?? 0;
    const lvC = state.armoryLevels.trackC ?? 0;
    const lvD = state.armoryLevels.trackD ?? 0;
    const lvE = state.armoryLevels.trackE ?? 0;
    const lvF = state.armoryLevels.trackF ?? 0;

    if (state.faction === 'ironbound') {
      if (def.domain === 'air') {
        attackUpgradeLevel = lvC;
        armorUpgradeLevel = lvF;
        shieldArmorUpgradeLevel = lvF;
        rangePermille += lvC * 50;
      } else if (def.attributes.includes('Biological')) {
        attackUpgradeLevel = lvA;
        armorUpgradeLevel = lvD;
        shieldArmorUpgradeLevel = lvD;
      } else if (def.attributes.includes('Mechanical')) {
        attackUpgradeLevel = lvB;
        armorUpgradeLevel = lvE;
        shieldArmorUpgradeLevel = lvE;
      }
    } else if (state.faction === 'dawn') {
      // 6-track Dawn Armory: trackA/D = Ground Atk/Def, trackB/E = Shield Cap/Armor, trackC/F = Air Atk/Def
      maxShieldPermille += lvB * 180;
      shieldArmorUpgradeLevel = lvE;
      if (def.domain === 'air') {
        attackUpgradeLevel = lvC;
        armorUpgradeLevel = lvF;
        shieldArmorUpgradeLevel += lvF;
        rangePermille += lvC * 50;
      } else {
        attackUpgradeLevel = lvA;
        armorUpgradeLevel = lvD;
      }
    } else if (state.faction === 'swarm') {
      // 6-track Swarm Armory: trackA/D = Melee Atk/Def, trackB/E = Ranged Ground Atk/Def, trackC/F = Air Atk/Def
      if (def.domain === 'air') {
        attackUpgradeLevel = lvC;
        armorUpgradeLevel = lvF;
        speedPermille += lvC * 60;
      } else if (def.combatRange === 'melee') {
        attackUpgradeLevel = lvA;
        armorUpgradeLevel = lvD;
      } else {
        attackUpgradeLevel = lvB;
        armorUpgradeLevel = lvE;
      }
    }

    const specLv0 = state.specialTechLevels?.[0] ?? (state.specialTechsDone[0] ? 1 : 0);
    const specLv1 = state.specialTechLevels?.[1] ?? (state.specialTechsDone[1] ? 1 : 0);
    let flatBonusHp = 0;
    if (specLv0 >= 1) {
      if (state.faction === 'ironbound') {
        if (specLv0 >= 2 && def.attributes.includes('Biological')) {
          flatBonusHp += IRON_K_LV2_BIO_MAX_HP_BONUS;
        }
      } else if (state.faction === 'dawn') {
        if (specLv0 >= 2) {
          maxShieldPermille += 250;
          shieldArmorUpgradeLevel += 1;
        }
      } else if (state.faction === 'swarm') {
        speedPermille = Math.round((speedPermille * (specLv0 >= 2 ? 1180 : 1100)) / 1000);
        intervalPermille = Math.round((intervalPermille * (specLv0 >= 2 ? 820 : 900)) / 1000);
        if (specLv0 >= 2 && def.attributes.includes('Biological')) {
          flatBonusHp += IRON_K_LV2_BIO_MAX_HP_BONUS;
        }
      }
    }
    if (specLv1 >= 1) {
      if (state.faction === 'dawn') {
        intervalPermille = Math.round((intervalPermille * (specLv1 >= 2 ? 850 : 920)) / 1000);
        const dawnBonus = specLv1 >= 2 ? 4 : 2;
        addTagBonusFp(bonusVsTagFp, 'Armored', toFp(dawnBonus));
        addTagBonusFp(bonusVsTagFp, 'Structure', toFp(dawnBonus));
      }
    }

    const maxHpInt = Math.round((def.hp * maxHpPermille) / 1000) + flatBonusHp;
    const maxShieldInt = Math.round((def.shield * maxShieldPermille) / 1000);
    const baseArmorFp = toFp(def.armor);
    const armorPerUpgradeFp = toFp(def.armorPerLevel);
    const baseShieldArmorFp = toFp(def.shieldArmor ?? 0);
    const shieldArmorPerUpgradeFp = toFp(def.shieldArmorPerLevel ?? 1);
    const baseDamageFp = toFp(def.damage);
    const damagePerUpgradeFp = toFp(def.damagePerLevel);
    const attackIntervalMs = scaleAttackIntervalMs(def.attackIntervalMs, intervalPermille);

    const effectiveArmor = Math.round((baseArmorFp + armorUpgradeLevel * armorPerUpgradeFp) / FP_SCALE);
    const effectiveDamage = Math.round((baseDamageFp + attackUpgradeLevel * damagePerUpgradeFp) / FP_SCALE);

    return {
      maxHp: maxHpInt,
      maxHpFp: toFp(maxHpInt),
      maxShield: maxShieldInt,
      maxShieldFp: toFp(maxShieldInt),
      armor: effectiveArmor,
      baseArmorFp,
      armorUpgradeLevel,
      armorPerUpgradeFp,
      baseShieldArmorFp,
      shieldArmorUpgradeLevel,
      shieldArmorPerUpgradeFp,
      damage: effectiveDamage,
      baseDamageFp,
      attackUpgradeLevel,
      damagePerUpgradeFp,
      attackCount: def.attackCount,
      attackIntervalMs,
      attackRate: Number((1000 / attackIntervalMs).toFixed(2)),
      attributes: [...def.attributes],
      bonusVsTagFp,
      bonusPerUpgradeVsTagFp,
      range: Math.round((def.range * rangePermille) / 1000),
      speed: (def.speed * speedPermille) / 1000,
      vision,
    };
  }

  private refreshTeamUnits(team: 'player' | 'enemy') {
    const state = team === 'player' ? this.player : this.enemy;
    for (const u of this.units) {
      if (u.team !== team || u.hpFp <= 0) continue;
      const def = ALL_UNITS_BY_ID[u.defId];
      if (!def) continue;
      const prevMaxHpFp = u.maxHpFp;
      const prevMaxShieldFp = u.maxShieldFp;
      const s = this.computeUnitStats(state, def);
      u.maxHpFp = s.maxHpFp;
      u.maxHp = s.maxHp;
      if (s.maxHpFp > prevMaxHpFp) {
        u.hpFp = Math.min(u.maxHpFp, u.hpFp + (s.maxHpFp - prevMaxHpFp));
        u.hp = Math.ceil(u.hpFp / FP_SCALE);
      }
      u.maxShieldFp = s.maxShieldFp;
      u.maxShield = s.maxShield;
      if (s.maxShieldFp > prevMaxShieldFp) {
        u.shieldFp = Math.min(u.maxShieldFp, u.shieldFp + (s.maxShieldFp - prevMaxShieldFp));
        u.shield = Math.ceil(u.shieldFp / FP_SCALE);
      }
      u.armor = s.armor;
      u.baseArmorFp = s.baseArmorFp;
      u.armorUpgradeLevel = s.armorUpgradeLevel;
      u.armorPerUpgradeFp = s.armorPerUpgradeFp;
      u.baseShieldArmorFp = s.baseShieldArmorFp;
      u.shieldArmorUpgradeLevel = s.shieldArmorUpgradeLevel;
      u.shieldArmorPerUpgradeFp = s.shieldArmorPerUpgradeFp;
      u.damage = s.damage;
      u.baseDamageFp = s.baseDamageFp;
      u.attackUpgradeLevel = s.attackUpgradeLevel;
      u.damagePerUpgradeFp = s.damagePerUpgradeFp;
      u.attackCount = s.attackCount;
      u.attackIntervalMs = s.attackIntervalMs;
      u.attackRate = s.attackRate;
      u.attributes = s.attributes;
      u.bonusVsTagFp = s.bonusVsTagFp;
      u.bonusPerUpgradeVsTagFp = s.bonusPerUpgradeVsTagFp;
      u.range = s.range;
      u.speed = s.speed;
      u.vision = s.vision;
    }
  }

  private createUnitFromDef(
    team: 'player' | 'enemy',
    def: UnitDef,
    lane: LaneId,
    x: number,
    y: number,
    laneOffset: number
  ): UnitEntity {
    const state = team === 'player' ? this.player : this.enemy;
    const s = this.computeUnitStats(state, def);

    return {
      id: this.nextId++,
      defId: def.id,
      team,
      faction: def.faction,
      lane,
      x: clamp(x, 45, WORLD_WIDTH - 45),
      y: clamp(y, 45, WORLD_HEIGHT - 45),
      vx: 0,
      vy: 0,
      laneOffset,
      hp: s.maxHp,
      maxHp: s.maxHp,
      shield: s.maxShield,
      maxShield: s.maxShield,
      hpFp: s.maxHpFp,
      maxHpFp: s.maxHpFp,
      shieldFp: s.maxShieldFp,
      maxShieldFp: s.maxShieldFp,
      armor: s.armor,
      baseArmorFp: s.baseArmorFp,
      armorUpgradeLevel: s.armorUpgradeLevel,
      armorPerUpgradeFp: s.armorPerUpgradeFp,
      baseShieldArmorFp: s.baseShieldArmorFp,
      shieldArmorUpgradeLevel: s.shieldArmorUpgradeLevel,
      shieldArmorPerUpgradeFp: s.shieldArmorPerUpgradeFp,
      attributes: s.attributes,
      armorClass: def.armorClass,
      domain: def.domain,
      combatRange: def.combatRange,
      canHitAir: def.canHitAir,
      damage: s.damage,
      baseDamageFp: s.baseDamageFp,
      attackUpgradeLevel: s.attackUpgradeLevel,
      damagePerUpgradeFp: s.damagePerUpgradeFp,
      attackCount: s.attackCount,
      attackIntervalMs: s.attackIntervalMs,
      attackRate: s.attackRate,
      bonusVsTagFp: s.bonusVsTagFp,
      bonusPerUpgradeVsTagFp: s.bonusPerUpgradeVsTagFp,
      range: s.range,
      speed: s.speed,
      vision: s.vision,
      splashRadius: def.splashRadius ?? 0,
      shape: def.shape,
      cloaked: Boolean(def.cloaked),
      cloakTimer: def.cloakDurationSec ?? 0,
      cloakMaxSec: def.cloakDurationSec ?? 0,
      detector: Boolean(def.detector),
      revealTimer: 0,
      firedRevealTimer: 0,
      auraShield: Boolean(def.auraShield),
      suicidal: Boolean(def.suicidal),
      corrosive: Boolean(def.corrosive),
      spawnerInterval: def.spawnerInterval ?? 0,
      spawnTimer: def.spawnerInterval ? def.spawnerInterval * 0.6 : 0,
      attackCooldownMs: 150,
      attackLockMs: 0,
      hitFlash: 0,
      outOfCombatTimer: 4,
      slowTimer: 0,
      buffTimer: 0,
      hasteTimer: 0,
      stimTimer: 0,
      siegeLockTimer: 0,
      inAmbushSquad: false,
      squadDestination: null,
      jungleWaypoints: [],
      jungleTargetLane: null,
      scaleX: 1,
      scaleY: 1,
      radius: def.tier === 3 ? 18.5 : def.armorClass === 'heavy' ? 14 : def.squadSize >= 4 ? 8 : 9.5,
      bountyGold: 0, // Killing enemy units gives 0G unless killer is Swarm!
      targetId: null,
    };
  }

  private spawnUnitSquad(team: 'player' | 'enemy', def: UnitDef, lane: LaneId, free: boolean, batchIndex = 0) {
    const state = team === 'player' ? this.player : this.enemy;
    const startPt = pointOnLane(lane, team === 'player' ? 0.04 : 0.96);
    const count = def.squadSize;
    const batchShiftX = (team === 'player' ? -1 : 1) * batchIndex * 22;
    const batchShiftY = batchIndex > 0 ? (batchIndex % 2 === 1 ? 10 : -10) : 0;

    for (let i = 0; i < count; i++) {
      const spread = count === 1 ? 0 : (i - (count - 1) / 2) * (count >= 4 ? 14 : 18);
      const offsetX = (team === 'player' ? -1 : 1) * (i % 2) * 11 + batchShiftX;
      const unit = this.createUnitFromDef(
        team,
        def,
        lane,
        startPt.x + offsetX,
        startPt.y + spread + batchShiftY,
        spread
      );
      this.units.push(unit);
      if (!free) state.unitsTrained++;
    }
  }

  private spawnNeutralCreeps(lane: LaneId, x: number, y: number, isJungle: boolean) {
    const offsets = [
      { dx: -16, dy: -14 },
      { dx: 16, dy: 14 },
      { dx: 0, dy: 0 },
    ];
    offsets.forEach((off, idx) => {
      const isAlpha = idx === 2;
      const hp = isAlpha ? 180 : 100;
      const armor = isAlpha ? 2 : 0;
      const dmg = isAlpha ? 11 : 7;
      const intervalMs = isAlpha ? 1100 : 1050;
      this.units.push({
        id: this.nextId++,
        defId: 'neutral_creep',
        team: 'neutral',
        faction: 'neutral',
        lane,
        x: x + off.dx,
        y: y + off.dy,
        vx: 0,
        vy: 0,
        laneOffset: off.dy,
        hp,
        maxHp: hp,
        shield: 0,
        maxShield: 0,
        hpFp: toFp(hp),
        maxHpFp: toFp(hp),
        shieldFp: 0,
        maxShieldFp: 0,
        armor,
        baseArmorFp: toFp(armor),
        armorUpgradeLevel: 0,
        armorPerUpgradeFp: 0,
        baseShieldArmorFp: 0,
        shieldArmorUpgradeLevel: 0,
        shieldArmorPerUpgradeFp: 0,
        attributes: isAlpha ? ['Armored', 'Biological'] : ['Light', 'Biological'],
        armorClass: isAlpha ? 'heavy' : 'light',
        domain: 'ground',
        combatRange: 'melee',
        canHitAir: true,
        damage: dmg,
        baseDamageFp: toFp(dmg),
        attackUpgradeLevel: 0,
        damagePerUpgradeFp: 0,
        attackCount: 1,
        attackIntervalMs: intervalMs,
        attackRate: Number((1000 / intervalMs).toFixed(2)),
        bonusVsTagFp: {},
        bonusPerUpgradeVsTagFp: {},
        range: 46,
        speed: 36,
        vision: 95,
        splashRadius: 0,
        shape: 'golem',
        cloaked: false,
        cloakTimer: 0,
        cloakMaxSec: 0,
        detector: false,
        revealTimer: 0,
        firedRevealTimer: 0,
        provokedTimer: 0,
        auraShield: false,
        suicidal: false,
        corrosive: false,
        spawnerInterval: 0,
        spawnTimer: 0,
        attackCooldownMs: 300,
        attackLockMs: 0,
        hitFlash: 0,
        outOfCombatTimer: 5,
        slowTimer: 0,
        buffTimer: 0,
        hasteTimer: 0,
        stimTimer: 0,
        siegeLockTimer: 0,
        inAmbushSquad: false,
        squadDestination: null,
        jungleWaypoints: [],
        jungleTargetLane: null,
        scaleX: 1,
        scaleY: 1,
        radius: isAlpha ? 14 : 10,
        isJungleCreep: isJungle,
        homePos: { x, y },
        bountyGold: isAlpha ? 22 : 12,
        targetId: null,
      });
    });
  }

  private getEventScale(): number {
    const minutes = this.elapsed / 60;
    if (this.mapMode === 'simple') {
      return Number(clamp(1.0 + minutes * 0.12, 1.0, 1.85).toFixed(2));
    }
    const raw =
      minutes < 3
        ? 1.0 + minutes * 0.1
        : minutes < 6
        ? 1.3 + (minutes - 3) * 0.2
        : 1.9 + (minutes - 6) * 0.22;
    return Number(clamp(raw, 1.0, 3.0).toFixed(2));
  }

  private getNextEventCooldown(): number {
    return this.mapMode === 'simple' ? 125 : 60;
  }

  private spawnBossColossus(jungleZone: JungleZoneId, scale: number): number {
    const pos = JUNGLE_CENTERS[jungleZone];
    const lane: LaneId =
      jungleZone === 'upper' ? 0 : jungleZone === 'lower' ? 2 : Math.random() < 0.5 ? 0 : 2;
    const id = this.nextId++;
    const hp = Math.round(920 * scale);
    const shield = Math.round(140 * scale);
    const armor = 3 + Math.floor((scale - 1) * 1.5);
    const dmg = Math.round(24 * scale);
    const bounty = Math.round(280 * scale);
    this.units.push({
      id,
      defId: 'mist_boss',
      team: 'neutral',
      faction: 'neutral',
      lane,
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      laneOffset: 0,
      hp,
      maxHp: hp,
      shield,
      maxShield: shield,
      hpFp: toFp(hp),
      maxHpFp: toFp(hp),
      shieldFp: toFp(shield),
      maxShieldFp: toFp(shield),
      armor,
      baseArmorFp: toFp(armor),
      armorUpgradeLevel: 0,
      armorPerUpgradeFp: 0,
      baseShieldArmorFp: toFp(1),
      shieldArmorUpgradeLevel: 0,
      shieldArmorPerUpgradeFp: 0,
      attributes: ['Armored', 'Biological', 'Massive'],
      armorClass: 'heavy',
      domain: 'ground',
      combatRange: 'ranged',
      canHitAir: true,
      damage: dmg,
      baseDamageFp: toFp(dmg),
      attackUpgradeLevel: 0,
      damagePerUpgradeFp: 0,
      attackCount: 1,
      attackIntervalMs: 1350,
      attackRate: 0.74,
      bonusVsTagFp: toTagBonusFp({ Light: 8, Armored: 10 }),
      bonusPerUpgradeVsTagFp: {},
      range: 95,
      speed: 23,
      vision: 120,
      splashRadius: 54,
      shape: 'golem',
      cloaked: false,
      cloakTimer: 0,
      cloakMaxSec: 0,
      detector: false,
      revealTimer: 0,
      firedRevealTimer: 0,
      auraShield: false,
      suicidal: false,
      corrosive: false,
      spawnerInterval: 0,
      spawnTimer: 0,
      attackCooldownMs: 500,
      attackLockMs: 0,
      hitFlash: 0,
      outOfCombatTimer: 5,
      slowTimer: 0,
      buffTimer: 0,
      hasteTimer: 0,
      stimTimer: 0,
      siegeLockTimer: 0,
      inAmbushSquad: false,
      squadDestination: null,
      jungleWaypoints: [],
      jungleTargetLane: null,
      scaleX: 1,
      scaleY: 1,
      radius: 22,
      isBoss: true,
      isJungleCreep: true,
      homePos: { x: pos.x, y: pos.y },
      bountyGold: bounty,
      targetId: null,
    });
    return id;
  }

  private spawnMercGuardian(jungleZone: JungleZoneId, x: number, y: number, scale: number): number {
    const lane: LaneId =
      jungleZone === 'upper' ? 0 : jungleZone === 'lower' ? 2 : Math.random() < 0.5 ? 0 : 2;
    const id = this.nextId++;
    const hp = Math.round(540 * scale);
    const shield = Math.round(90 * scale);
    const armor = 3 + Math.floor((scale - 1) * 1.2);
    const dmg = Math.round(18 * scale);
    const bounty = Math.round(180 * scale);
    this.units.push({
      id,
      defId: 'merc_guardian',
      team: 'neutral',
      faction: 'neutral',
      lane,
      x,
      y,
      vx: 0,
      vy: 0,
      laneOffset: 0,
      hp,
      maxHp: hp,
      shield,
      maxShield: shield,
      hpFp: toFp(hp),
      maxHpFp: toFp(hp),
      shieldFp: toFp(shield),
      maxShieldFp: toFp(shield),
      armor,
      baseArmorFp: toFp(armor),
      armorUpgradeLevel: 0,
      armorPerUpgradeFp: 0,
      baseShieldArmorFp: toFp(1),
      shieldArmorUpgradeLevel: 0,
      shieldArmorPerUpgradeFp: 0,
      attributes: ['Armored', 'Mechanical'],
      armorClass: 'heavy',
      domain: 'ground',
      combatRange: 'ranged',
      canHitAir: true,
      damage: dmg,
      baseDamageFp: toFp(dmg),
      attackUpgradeLevel: 0,
      damagePerUpgradeFp: 0,
      attackCount: 1,
      attackIntervalMs: 1200,
      attackRate: 0.83,
      bonusVsTagFp: toTagBonusFp({ Light: 6, Armored: 6 }),
      bonusPerUpgradeVsTagFp: {},
      range: 105,
      speed: 26,
      vision: 120,
      splashRadius: 34,
      shape: 'titan',
      cloaked: false,
      cloakTimer: 0,
      cloakMaxSec: 0,
      detector: false,
      revealTimer: 0,
      firedRevealTimer: 0,
      auraShield: false,
      suicidal: false,
      corrosive: false,
      spawnerInterval: 0,
      spawnTimer: 0,
      attackCooldownMs: 400,
      attackLockMs: 0,
      hitFlash: 0,
      outOfCombatTimer: 5,
      slowTimer: 0,
      buffTimer: 0,
      hasteTimer: 0,
      stimTimer: 0,
      siegeLockTimer: 0,
      inAmbushSquad: false,
      squadDestination: null,
      jungleWaypoints: [],
      jungleTargetLane: null,
      scaleX: 1,
      scaleY: 1,
      radius: 19,
      isJungleCreep: true,
      homePos: { x, y },
      bountyGold: bounty,
      targetId: null,
    });
    return id;
  }

  private spawnMercReinforcement(team: 'player' | 'enemy', lane: LaneId, x: number, y: number, scale: number) {
    const state = team === 'player' ? this.player : this.enemy;
    const f = FACTIONS[state.faction];
    const pickIndices = scale >= 1.9 ? [4, 3, 2] : scale >= 1.4 ? [4, 3] : [1, 3];
    let spawned = 0;
    for (let i = 0; i < pickIndices.length; i++) {
      const def = f.units[pickIndices[i]];
      if (!def) continue;
      const offsetY = (i - (pickIndices.length - 1) / 2) * 20;
      const u = this.createUnitFromDef(team, def, lane, x + (i - 1) * 14, y + offsetY, offsetY);
      u.hasteTimer = 6.0;
      this.units.push(u);
      spawned++;
    }
    this.spawnRingParticle(x, y, '#F59E0B', 82);
    this.addFloatingText(x, y - 24, `精銳傭兵支援 ×${spawned}！`, '#FCD34D');
  }

  private spawnCapturedVanguard(team: 'player' | 'enemy', lane: LaneId, x: number, y: number, scale = 1.0) {
    const hp = Math.round(760 * scale);
    const shield = Math.round(120 * scale);
    const armor = 4 + Math.floor((scale - 1) * 1.5);
    const dmg = Math.round(28 * scale);
    this.units.push({
      id: this.nextId++,
      defId: 'vanguard_golem',
      team,
      faction: team === 'player' ? this.player.faction : this.enemy.faction,
      lane,
      x,
      y,
      vx: 0,
      vy: 0,
      laneOffset: 0,
      hp,
      maxHp: hp,
      shield,
      maxShield: shield,
      hpFp: toFp(hp),
      maxHpFp: toFp(hp),
      shieldFp: toFp(shield),
      maxShieldFp: toFp(shield),
      armor,
      baseArmorFp: toFp(armor),
      armorUpgradeLevel: 0,
      armorPerUpgradeFp: 0,
      baseShieldArmorFp: toFp(1),
      shieldArmorUpgradeLevel: 0,
      shieldArmorPerUpgradeFp: 0,
      attributes: ['Armored', 'Mechanical', 'Massive'],
      armorClass: 'heavy',
      domain: 'ground',
      combatRange: 'melee',
      canHitAir: false,
      damage: dmg,
      baseDamageFp: toFp(dmg),
      attackUpgradeLevel: 0,
      damagePerUpgradeFp: 0,
      attackCount: 1,
      attackIntervalMs: 1250,
      attackRate: 0.8,
      bonusVsTagFp: toTagBonusFp({ Structure: 24, Light: 10 }),
      bonusPerUpgradeVsTagFp: {},
      range: 56,
      speed: 36,
      vision: 135,
      splashRadius: 52,
      shape: 'golem',
      cloaked: false,
      cloakTimer: 0,
      cloakMaxSec: 0,
      detector: false,
      revealTimer: 0,
      firedRevealTimer: 0,
      auraShield: false,
      suicidal: false,
      corrosive: false,
      spawnerInterval: 0,
      spawnTimer: 0,
      attackCooldownMs: 300,
      attackLockMs: 0,
      hitFlash: 0,
      outOfCombatTimer: 5,
      slowTimer: 0,
      buffTimer: 0,
      hasteTimer: 0,
      stimTimer: 0,
      siegeLockTimer: 0,
      inAmbushSquad: false,
      squadDestination: null,
      jungleWaypoints: [],
      jungleTargetLane: null,
      scaleX: 1,
      scaleY: 1,
      radius: 20,
      bountyGold: 0,
      targetId: null,
    });
  }

  // --- RESEARCH & MACRO ACTIONS (Unrestricted parallel research once tech-tree prerequisites are satisfied!) ---

  private canStartResearch(state: TeamState, kind: ResearchKind): boolean {
    return !state.activeResearches.some((r) => r.kind === kind);
  }

  public buildBarracks(tier: BarracksTier, team: 'player' | 'enemy' = 'player'): boolean {
    const state = team === 'player' ? this.player : this.enemy;
    const def = BARRACKS_DEFS[tier];
    if (!def) return false;
    if (state.techTier < tier) {
      this.pushIntelFor(team, `建造【${def.name}】需先完成科技 T${tier}！`, 'warn');
      if (team === 'player' && !this.pvpMode) {
        tacticalAudio.playDenied();
        this.emitSnapshot();
      }
      return false;
    }
    const slot = this.barracks.find((b) => b.team === team && b.tier === tier);
    if (!slot || slot.building || slot.level >= BARRACKS_MAX_LEVEL) {
      if (team === 'player' && !this.pvpMode) tacticalAudio.playDenied();
      return false;
    }

    const nextUp = getBarracksNextUpgrade(tier, slot.level);
    if (!nextUp || state.gold < nextUp.cost) {
      if (team === 'player' && !this.pvpMode) tacticalAudio.playDenied();
      return false;
    }

    state.gold -= nextUp.cost;
    slot.building = true;
    slot.buildTotal = nextUp.time;
    slot.buildRemaining = nextUp.time;
    slot.paidGold = nextUp.cost;

    if (!slot.built) {
      slot.maxHp = nextUp.targetHp;
      slot.maxHpFp = toFp(nextUp.targetHp);
      slot.hpFp = Math.round((slot.maxHpFp * 250) / 1000);
      slot.hp = Math.ceil(slot.hpFp / FP_SCALE);
      slot.upgradeThresholdsFp = [];
      this.addFloatingText(slot.x, slot.y - 20, `建造${def.name}...`, '#FCD34D');
    } else {
      this.addFloatingText(
        slot.x,
        slot.y - 22,
        `升級 ${def.shortName} Lv.${nextUp.nextLevel} (同時${nextUp.concurrentSlots}組)...`,
        '#FDE047'
      );
    }

    if (this.isLocalControlled(team)) {
      tacticalAudio.playBuildStart();
      this.emitSnapshot();
    }
    return true;
  }

  public buildArmoryBuilding(kind: ArmoryBuildingKind, team: 'player' | 'enemy' = 'player'): boolean {
    const state = team === 'player' ? this.player : this.enemy;
    const def = ARMORY_BUILDING_DEFS[kind];
    if (!def) return false;
    const slot = this.armories.find((a) => a.team === team && a.kind === kind);
    if (!slot || slot.built || slot.building) {
      if (this.isLocalControlled(team)) tacticalAudio.playDenied();
      return false;
    }
    if (state.gold < def.cost) {
      if (this.isLocalControlled(team)) tacticalAudio.playDenied();
      return false;
    }

    state.gold -= def.cost;
    slot.building = true;
    slot.buildTotal = def.buildTime;
    slot.buildRemaining = def.buildTime;
    slot.paidGold = def.cost;
    slot.maxHp = def.hp;
    slot.maxHpFp = toFp(def.hp);
    slot.hpFp = Math.round((slot.maxHpFp * 250) / 1000);
    slot.hp = Math.ceil(slot.hpFp / FP_SCALE);

    this.addFloatingText(slot.x, slot.y - 22, `動工${def.name}...`, kind === 'bio_lab' ? '#6EE7B7' : '#FCD34D');
    if (this.isLocalControlled(team)) {
      tacticalAudio.playBuildStart();
      this.emitSnapshot();
    }
    return true;
  }

  public buildOrUpgradeExtractor(team: 'player' | 'enemy' = 'player', preferredId?: string): boolean {
    const state = team === 'player' ? this.player : this.enemy;
    let slot: GasExtractor | undefined;

    if (preferredId) {
      slot = this.extractors.find((g) => g.id === preferredId);
    } else {
      // Priority: 1) Home Nexus unbuilt, 2) Unbuilt on selected lane, 3) Any eligible unbuilt,
      // 4) Lowest-level built eligible extractor (< Lv.3), favoring Nexus & selected lane
      const eligible = this.extractors.filter(
        (g) =>
          !g.building &&
          !g.upgrading &&
          g.level < GAS_EXTRACTOR_MAX_LEVEL &&
          ((!g.built && this.isExtractorEligibleForTeam(g, team)) || (g.built && g.team === team))
      );
      if (eligible.length > 0) {
        const ctrlLane = team === this.getControlledTeam() ? this.selectedLane : this.getActiveLanes()[0];
        eligible.sort((a, b) => {
          const score = (g: GasExtractor) => {
            if (!g.built && g.padId === null) return 0;
            if (!g.built && g.lane === ctrlLane) return 1;
            if (!g.built) return 2;
            return 10 + g.level * 3 + (g.padId === null ? 0 : g.lane === ctrlLane ? 1 : 2);
          };
          return score(a) - score(b);
        });
        slot = eligible[0];
      }
    }

    if (!slot || slot.building || slot.upgrading || slot.level >= GAS_EXTRACTOR_MAX_LEVEL) {
      if (this.isLocalControlled(team)) tacticalAudio.playDenied();
      return false;
    }

    if (!slot.built) {
      if (!this.isExtractorEligibleForTeam(slot, team)) {
        if (this.isLocalControlled(team)) {
          tacticalAudio.playDenied();
          this.pushIntel('此塔區需先建好防禦塔，才能在其後方建造瓦斯挖掘場！', 'warn');
          this.emitSnapshot();
        }
        return false;
      }
    } else if (slot.team !== team) {
      if (this.isLocalControlled(team)) tacticalAudio.playDenied();
      return false;
    }

    const nextUp = getGasExtractorNextUpgrade(slot.level);
    if (!nextUp || state.gold < nextUp.cost) {
      if (this.isLocalControlled(team)) tacticalAudio.playDenied();
      return false;
    }

    state.gold -= nextUp.cost;
    slot.team = team;
    slot.buildTotal = nextUp.time;
    slot.buildRemaining = nextUp.time;
    slot.paidGold = nextUp.cost;

    if (!slot.built) {
      slot.building = true;
      slot.maxHp = nextUp.targetHp;
      slot.maxHpFp = toFp(nextUp.targetHp);
      slot.hpFp = Math.round((slot.maxHpFp * 250) / 1000);
      slot.hp = Math.ceil(slot.hpFp / FP_SCALE);
      slot.upgradeThresholdsFp = [];
      this.addFloatingText(slot.x, slot.y - 20, '建造瓦斯場...', '#2DD4BF');
    } else {
      slot.upgrading = true;
      this.addFloatingText(slot.x, slot.y - 20, `升級瓦斯場 Lv.${nextUp.nextLevel}...`, '#5EEAD4');
    }

    if (this.isLocalControlled(team)) {
      tacticalAudio.playBuildStart();
      this.emitSnapshot();
    }
    return true;
  }

  public cancelBuilding(team: 'player' | 'enemy', kind: CancellableBuildingKind, id: string): boolean {
    const state = team === 'player' ? this.player : this.enemy;
    let refund = 0;
    let fx = 0;
    let fy = 0;
    let label = '';

    if (kind === 'pad') {
      const pad = this.pads.find((p) => p.id === id && p.team === team);
      if (!pad || (!pad.building && !pad.upgrading)) return false;
      fx = pad.x;
      fy = pad.y;
      if (pad.building) {
        const fallback = pad.pendingTowerType ? TOWER_DEFS[pad.pendingTowerType].cost : 115;
        refund = pad.paidGold ?? fallback;
        pad.building = false;
        pad.pendingTowerType = null;
        pad.pendingUpgradeMode = null;
        pad.team = null;
        pad.towerType = null;
        pad.level = 0;
        pad.combatLevel = 0;
        pad.miningLevel = 0;
        pad.techLevel = 0;
        pad.upgradeStack = [];
        pad.buildRemaining = 0;
        pad.buildTotal = 0;
        pad.hp = 0;
        pad.maxHp = 0;
        pad.hpFp = 0;
        pad.maxHpFp = 0;
        pad.paidGold = 0;
        label = '取消建塔';
      } else {
        const nextLv = Math.min(3, pad.level + 1) as 2 | 3;
        const fallback =
          pad.towerType && pad.pendingUpgradeMode
            ? getTowerUpgradeCostAndTime(pad.towerType, nextLv, pad.pendingUpgradeMode).cost
            : 145;
        refund = pad.paidGold ?? fallback;
        pad.upgrading = false;
        pad.pendingUpgradeMode = null;
        pad.buildRemaining = 0;
        pad.buildTotal = 0;
        pad.paidGold = 0;
        label = '取消升塔';
      }
    } else if (kind === 'depot') {
      const dep = this.depots.find((d) => d.id === id && d.team === team && d.building);
      if (!dep) return false;
      fx = dep.x;
      fy = dep.y;
      refund = dep.paidGold ?? SUPPLY_DEPOT_COST;
      dep.building = false;
      dep.built = false;
      dep.buildRemaining = 0;
      dep.hp = 0;
      dep.hpFp = 0;
      dep.paidGold = 0;
      label = '取消補給站';
    } else if (kind === 'barracks') {
      const bk = this.barracks.find((b) => b.id === id && b.team === team && b.building);
      if (!bk) return false;
      fx = bk.x;
      fy = bk.y;
      const fallback = getBarracksNextUpgrade(bk.tier, bk.level)?.cost ?? BARRACKS_DEFS[bk.tier].cost;
      refund = bk.paidGold ?? fallback;
      bk.building = false;
      bk.buildRemaining = 0;
      bk.paidGold = 0;
      if (!bk.built) {
        bk.hp = 0;
        bk.hpFp = 0;
      }
      label = bk.built ? '取消升營' : '取消建營';
    } else if (kind === 'armory') {
      const arm = this.armories.find((a) => a.id === id && a.team === team && a.building);
      if (!arm) return false;
      fx = arm.x;
      fy = arm.y;
      refund = arm.paidGold ?? ARMORY_BUILDING_DEFS[arm.kind].cost;
      arm.building = false;
      arm.built = false;
      arm.buildRemaining = 0;
      arm.hp = 0;
      arm.hpFp = 0;
      arm.paidGold = 0;
      label = `取消${ARMORY_BUILDING_DEFS[arm.kind].shortName}`;
    } else if (kind === 'extractor') {
      const ext = this.extractors.find((g) => g.id === id && g.team === team && (g.building || g.upgrading));
      if (!ext) return false;
      fx = ext.x;
      fy = ext.y;
      const fallback = getGasExtractorNextUpgrade(ext.level)?.cost ?? GAS_EXTRACTOR_LEVELS[1].cost;
      refund = ext.paidGold ?? fallback;
      ext.paidGold = 0;
      ext.buildRemaining = 0;
      if (ext.building && !ext.built) {
        ext.building = false;
        ext.team = null;
        ext.hp = 0;
        ext.hpFp = 0;
        label = '取消瓦斯場';
      } else {
        ext.upgrading = false;
        label = '取消升瓦斯場';
      }
    }

    if (refund > 0) {
      state.gold += refund;
    }
    this.spawnRingParticle(fx, fy, '#FBBF24', 36);
    this.addFloatingText(fx, fy - 24, `${label} +${refund}G`, '#FDE047');
    if (this.isLocalControlled(team)) {
      tacticalAudio.playClick();
      this.emitSnapshot();
    }
    return true;
  }

  public buildSupplyDepot(team: 'player' | 'enemy' = 'player', preferredDepotId?: string): boolean {
    const state = team === 'player' ? this.player : this.enemy;
    const allowed = this.getMaxDepotsAllowed(team);
    const currentCount = this.depots.filter((d) => d.team === team && (d.built || d.building)).length;
    if (currentCount >= allowed) {
      this.pushIntelFor(
        team,
        `補給站達控區上限 (${currentCount}/${allowed})！請建造更多防禦塔或佔領野區據點以擴充上限`,
        'warn'
      );
      if (this.isLocalControlled(team)) {
        tacticalAudio.playDenied();
        this.emitSnapshot();
      }
      return false;
    }
    if (state.gold < SUPPLY_DEPOT_COST) {
      if (this.isLocalControlled(team)) tacticalAudio.playDenied();
      return false;
    }
    const slot =
      (preferredDepotId
        ? this.depots.find((d) => d.id === preferredDepotId && d.team === team && !d.built && !d.building)
        : undefined) ?? this.depots.find((d) => d.team === team && !d.built && !d.building);
    if (!slot) {
      if (this.isLocalControlled(team)) tacticalAudio.playDenied();
      return false;
    }

    state.gold -= SUPPLY_DEPOT_COST;
    slot.building = true;
    slot.buildTotal = SUPPLY_DEPOT_BUILD_TIME;
    slot.buildRemaining = SUPPLY_DEPOT_BUILD_TIME;
    slot.paidGold = SUPPLY_DEPOT_COST;
    slot.maxHp = SUPPLY_DEPOT_HP;
    slot.maxHpFp = toFp(SUPPLY_DEPOT_HP);
    slot.hpFp = Math.round((slot.maxHpFp * 250) / 1000);
    slot.hp = Math.ceil(slot.hpFp / FP_SCALE);

    this.addFloatingText(slot.x, slot.y - 20, '建造補給站...', '#93C5FD');
    if (this.isLocalControlled(team)) {
      tacticalAudio.playBuildStart();
      this.emitSnapshot();
    }
    return true;
  }

  public upgradeEconomy(team: 'player' | 'enemy' = 'player'): boolean {
    const state = team === 'player' ? this.player : this.enemy;
    if (state.econLevel >= ECON_MAX_LEVEL || !this.canStartResearch(state, 'econ')) {
      if (team === 'player' && !this.pvpMode) tacticalAudio.playDenied();
      return false;
    }
    const reqTowers = ECON_REQUIRED_TOWERS[state.econLevel] ?? 0;
    const standingTowers = this.getStandingTowerCount(team);
    if (standingTowers < reqTowers) {
      this.pushIntelFor(team, `採礦 Lv.${state.econLevel + 1} 需要至少 ${reqTowers} 座完工防禦塔！`, 'warn');
      if (team === 'player' && !this.pvpMode) {
        tacticalAudio.playDenied();
        this.emitSnapshot();
      }
      return false;
    }
    const costInfo = getEconUpgradeCost(state.econLevel, standingTowers);
    if (!costInfo || state.gold < costInfo.cost) {
      if (team === 'player' && !this.pvpMode) tacticalAudio.playDenied();
      return false;
    }

    state.gold -= costInfo.cost;
    const time = ECON_UPGRADE_TIMES[state.econLevel] ?? 6.0;
    state.activeResearches.push({
      id: this.nextId++,
      kind: 'econ',
      label: `採礦 Lv.${state.econLevel + 1}`,
      remaining: time,
      total: time,
    });
    if (team === 'player' && !this.pvpMode) {
      tacticalAudio.playResearchStart();
      this.emitSnapshot();
    }
    return true;
  }

  public upgradeTech(team: 'player' | 'enemy' = 'player'): boolean {
    const state = team === 'player' ? this.player : this.enemy;
    if (state.techTier >= 3 || !this.canStartResearch(state, 'tech_tier')) {
      if (this.isLocalControlled(team)) tacticalAudio.playDenied();
      return false;
    }
    const cost = TECH_UPGRADE_COSTS[state.techTier as 1 | 2];
    const gasCost = TECH_UPGRADE_GAS_COSTS[state.techTier as 1 | 2];
    if (state.gold < cost || state.gas < gasCost) {
      if (this.isLocalControlled(team)) {
        tacticalAudio.playDenied();
        if (state.gold >= cost && state.gas < gasCost) {
          this.pushIntel(`晉升科技 T${state.techTier + 1} 需要 ${gasCost} 瓦斯（目前 ${Math.floor(state.gas)} 氣）！`, 'warn');
          this.emitSnapshot();
        }
      }
      return false;
    }

    state.gold -= cost;
    state.gas -= gasCost;
    const time = TECH_UPGRADE_TIMES[state.techTier as 1 | 2];
    state.activeResearches.push({
      id: this.nextId++,
      kind: 'tech_tier',
      label: `晉升科技 T${state.techTier + 1}`,
      remaining: time,
      total: time,
    });
    if (this.isLocalControlled(team)) {
      tacticalAudio.playResearchStart();
      this.emitSnapshot();
    }
    return true;
  }

  public upgradeArmoryTrack(track: ArmoryTrackId, team: 'player' | 'enemy' = 'player'): boolean {
    const state = team === 'player' ? this.player : this.enemy;
    const def = FACTIONS[state.faction].armoryTracks[track];
    if (!def) return false;
    const curLv = state.armoryLevels[track] ?? 0;
    if (curLv >= 3) return false;
    // Prerequisite Armory Building Check (Bio Lab / Mech Bay)
    const reqBldKind = getRequiredArmoryBuilding(state.faction, track);
    if (!this.hasArmoryBuilding(team, reqBldKind)) {
      const bDef = ARMORY_BUILDING_DEFS[reqBldKind];
      if (this.isLocalControlled(team)) {
        tacticalAudio.playDenied();
        this.pushIntel(`研發【${def.name}】需先建造前置建築【${bDef.name} [${bDef.hotkey}]】（${bDef.cost}G · ${bDef.buildTime}s）！`, 'warn');
        this.emitSnapshot();
      }
      return false;
    }
    const nextLv = (curLv + 1) as 1 | 2 | 3;
    const t1Bk = this.barracks.find((b) => b.team === team && b.tier === 1 && b.built && b.hp > 0);
    const t1BkLevel = t1Bk ? t1Bk.level : 0;
    const unlockInfo = isArmoryLevelUnlocked(state.faction, track, nextLv, state.techTier, t1BkLevel);
    if (!unlockInfo.unlocked) {
      if (this.isLocalControlled(team)) {
        tacticalAudio.playDenied();
        const isGroundOrCore =
          track === 'trackA' || track === 'trackD' || track === 'trackB' || track === 'trackE';
        const msg = isGroundOrCore
          ? nextLv === 2
            ? '此攻防 Lv.2 需先完成科技 T2 或 T1 營二級！'
            : '此攻防 Lv.3 需先完成科技 T3 或（T2 且 T1 營三級）！'
          : `此空軍攻防升級需先完成科技 T${ARMORY_TIER_REQ[curLv]} 才能研發！`;
        this.pushIntel(msg, 'warn');
        this.emitSnapshot();
      }
      return false;
    }
    const trackKindMap: Record<ArmoryTrackId, ResearchKind> = {
      trackA: 'armory_A',
      trackB: 'armory_B',
      trackC: 'armory_C',
      trackD: 'armory_D',
      trackE: 'armory_E',
      trackF: 'armory_F',
    };
    const kind = trackKindMap[track];
    if (!this.canStartResearch(state, kind)) {
      if (this.isLocalControlled(team)) tacticalAudio.playDenied();
      return false;
    }

    const cost = def.costs[curLv];
    const gasCost = def.gasCosts[curLv] ?? 0;
    if (state.gold < cost || state.gas < gasCost) {
      if (this.isLocalControlled(team)) {
        tacticalAudio.playDenied();
        if (state.gold >= cost && state.gas < gasCost) {
          this.pushIntel(`研發【${def.shortName} +${nextLv}】需要 ${gasCost} 瓦斯（目前 ${Math.floor(state.gas)} 氣）！`, 'warn');
          this.emitSnapshot();
        }
      }
      return false;
    }

    state.gold -= cost;
    state.gas -= gasCost;
    const time = def.times[curLv];
    state.activeResearches.push({
      id: this.nextId++,
      kind,
      label: `${def.shortName} +${curLv + 1}`,
      remaining: time,
      total: time,
    });
    if (this.isLocalControlled(team)) {
      tacticalAudio.playResearchStart();
      this.emitSnapshot();
    }
    return true;
  }

  public researchSpecialTech(slot: 0 | 1, team: 'player' | 'enemy' = 'player'): boolean {
    const state = team === 'player' ? this.player : this.enemy;
    const spec = FACTIONS[state.faction].specialTechs[slot];
    const curLv = state.specialTechLevels?.[slot] ?? (state.specialTechsDone[slot] ? 1 : 0);
    const maxLv = spec.level2 ? 2 : 1;
    if (curLv >= maxLv) return false;

    const stage = curLv === 0 ? spec : spec.level2!;
    if (state.techTier < stage.tierReq) {
      if (this.isLocalControlled(team)) {
        tacticalAudio.playDenied();
        this.pushIntel(`專屬科技【${stage.name}】需先晉升科技 T${stage.tierReq}！`, 'warn');
        this.emitSnapshot();
      }
      return false;
    }
    const kind: ResearchKind = slot === 0 ? 'special_tech_1' : 'special_tech_2';
    if (!this.canStartResearch(state, kind)) {
      if (this.isLocalControlled(team)) tacticalAudio.playDenied();
      return false;
    }
    const gasCost = stage.gasCost ?? 0;
    if (state.gold < stage.cost || state.gas < gasCost) {
      if (this.isLocalControlled(team)) {
        tacticalAudio.playDenied();
        if (state.gold >= stage.cost && state.gas < gasCost) {
          this.pushIntel(`專屬科技【${stage.name}】需要 ${gasCost} 瓦斯（目前 ${Math.floor(state.gas)} 氣）！`, 'warn');
          this.emitSnapshot();
        }
      }
      return false;
    }

    state.gold -= stage.cost;
    state.gas -= gasCost;
    state.activeResearches.push({
      id: this.nextId++,
      kind,
      label: stage.name,
      remaining: stage.time,
      total: stage.time,
    });
    if (this.isLocalControlled(team)) {
      tacticalAudio.playResearchStart();
      this.emitSnapshot();
    }
    return true;
  }

  public repairNexusPlating(team: 'player' | 'enemy' = 'player'): boolean {
    const state = team === 'player' ? this.player : this.enemy;
    if (!state.nexusPlatingBroken) return false;
    if (!this.canStartResearch(state, 'nexus_repair')) {
      if (team === 'player' && !this.pvpMode) tacticalAudio.playDenied();
      return false;
    }
    if (state.gold < NEXUS_REPAIR_COST) {
      if (team === 'player' && !this.pvpMode) tacticalAudio.playDenied();
      return false;
    }
    state.gold -= NEXUS_REPAIR_COST;
    state.activeResearches.push({
      id: this.nextId++,
      kind: 'nexus_repair',
      label: '修復主堡外甲',
      remaining: NEXUS_REPAIR_TIME,
      total: NEXUS_REPAIR_TIME,
    });
    const nexusPos = team === 'player' ? PLAYER_NEXUS_POS : ENEMY_NEXUS_POS;
    if (team === 'player' && !this.pvpMode) {
      tacticalAudio.playBuildStart();
      this.addFloatingText(nexusPos.x, nexusPos.y - 46, '開始修復主堡外甲...', '#38BDF8');
      this.emitSnapshot();
    }
    return true;
  }

  public canUseTowerTechUpgrade(team: 'player' | 'enemy'): boolean {
    const state = team === 'player' ? this.player : this.enemy;
    const lLv = state.specialTechLevels?.[1] ?? (state.specialTechsDone[1] ? 1 : 0);
    return lLv >= 1;
  }

  private applyTowerStats(
    pad: TowerPad,
    towerType: TowerType,
    combatLevel: 1 | 2 | 3,
    miningLevel: 0 | 1 | 2 = 0,
    techLevel: 0 | 1 | 2 = 0
  ) {
    const owner = pad.team ?? pad.homeSide;
    const state = owner === 'player' ? this.player : this.enemy;
    const def = TOWER_DEFS[towerType];
    const totalLevel = clamp(combatLevel + miningLevel + techLevel, 1, 3) as 1 | 2 | 3;
    const combatSc = TOWER_LEVEL_SCALING[combatLevel];
    const totalSc = TOWER_LEVEL_SCALING[totalLevel];
    const lvBonus = combatLevel - 1;
    const isIronbound = state.faction === 'ironbound';
    const radarLv = state.specialTechLevels?.[1] ?? (state.specialTechsDone[1] ? 1 : 0);

    // All factions' [L] Special Tech grants +6%/+12% tower range, +14/+26 vision, +1/+2 armor, and AA unlock
    const radarRangePermille = radarLv >= 2 ? 1120 : radarLv === 1 ? 1060 : 1000;
    const factionRangePermille = isIronbound ? 1150 : 1000;
    const totalRangePermille = Math.round(
      (((combatSc.rangePermille * factionRangePermille) / 1000) * radarRangePermille) / 1000
    );
    const radarVisionBonus = radarLv >= 2 ? 26 : radarLv === 1 ? 14 : 0;
    const visionBonus = combatSc.visionBonus + (isIronbound ? 20 : 0) + radarVisionBonus;

    // Global Tech Tier (T2/T3) scales tower max HP and armed weapon damage!
    const tierHpPermille = TOWER_TECH_TIER_HP_PERMILLE[state.techTier];
    const tierDmgBonus = TOWER_TECH_TIER_DMG_BONUS[state.techTier];

    // Extra HP scales with total upgrade level AND global tech tier!
    const maxHpInt = Math.round((((def.hp * totalSc.hpPermille) / 1000) * tierHpPermille) / 1000);
    const radarArmorBonus = radarLv >= 2 ? 2 : radarLv === 1 ? 1 : 0;
    const baseArmorInt = def.armor + radarArmorBonus;
    const baseArmorFp = toFp(baseArmorInt);
    const armorPerUpgradeFp = toFp(def.armorPerLevel);
    const effectiveArmor = baseArmorInt + lvBonus * def.armorPerLevel;

    // Armed towers gain global T2/T3 bonus damage AND techLevel >= 2 bonus damage (+8)!
    const techDmgBonus = techLevel >= 2 && def.damage > 0 ? TOWER_TECH_LV2_BONUS_DMG : 0;
    const baseDamageInt = def.damage > 0 ? def.damage + tierDmgBonus + techDmgBonus : 0;
    const baseDamageFp = toFp(baseDamageInt);
    const damagePerUpgradeFp = toFp(def.damagePerLevel);
    const effectiveDamage = baseDamageInt > 0 ? baseDamageInt + lvBonus * def.damagePerLevel : 0;
    const attackIntervalMs =
      def.attackIntervalMs > 0
        ? scaleAttackIntervalMs(def.attackIntervalMs, combatSc.intervalPermille)
        : 0;

    pad.towerType = towerType;
    pad.combatLevel = combatLevel;
    pad.miningLevel = miningLevel;
    pad.techLevel = techLevel;
    pad.level = totalLevel;
    pad.maxHp = maxHpInt;
    pad.maxHpFp = toFp(maxHpInt);
    pad.armor = effectiveArmor;
    pad.baseArmorFp = baseArmorFp;
    pad.armorUpgradeLevel = lvBonus;
    pad.armorPerUpgradeFp = armorPerUpgradeFp;
    pad.attributes = [...def.attributes];
    pad.damage = effectiveDamage;
    pad.baseDamageFp = baseDamageFp;
    pad.attackUpgradeLevel = lvBonus;
    pad.damagePerUpgradeFp = damagePerUpgradeFp;
    pad.attackCount = def.attackCount;
    pad.attackIntervalMs = attackIntervalMs;
    pad.attackRate = attackIntervalMs > 0 ? Number((1000 / attackIntervalMs).toFixed(2)) : 0;
    pad.bonusVsTagFp = toTagBonusFp(def.bonusVsTag);
    pad.bonusPerUpgradeVsTagFp = toTagBonusFp(def.bonusPerLevelVsTag);
    pad.range = def.range > 0 ? Math.round((def.range * totalRangePermille) / 1000) : 0;
    pad.vision = def.vision + visionBonus;
    pad.detector = def.detector || techLevel >= 1;
    pad.canHitAir = def.canHitAir || (radarLv >= 1 && def.damage > 0);
    pad.splashRadius = def.splashRadius ?? 0;
    pad.slowFactor = def.slowFactor ?? 0;
  }

  public canBuilderInteractWithPad(
    pad: TowerPad,
    builder: 'player' | 'enemy',
    vision?: Array<{ x: number; y: number; r: number; detector: boolean }>
  ): boolean {
    if (pad.building || pad.upgrading) return false;
    if (pad.towerType === null) {
      if (pad.homeSide === builder) return true;
      return this.isPointVisibleTo(builder, pad.x, pad.y, vision);
    }
    return pad.team === builder && pad.level < 3;
  }

  public startTowerOnPad(
    padId: string,
    towerType: TowerType,
    builder: 'player' | 'enemy' = 'player',
    upgradeMode: TowerUpgradeMode = 'combat'
  ): boolean {
    const pad = this.pads.find((p) => p.id === padId);
    if (!pad || pad.building || pad.upgrading) return false;
    const state = builder === 'player' ? this.player : this.enemy;
    const allowedTowers = FACTIONS[state.faction].towerTypes;
    const safeType: TowerType = allowedTowers.includes(towerType) ? towerType : allowedTowers[0];
    const def = TOWER_DEFS[safeType];

    if (pad.towerType === null) {
      if (pad.homeSide !== builder && !this.isPointVisibleTo(builder, pad.x, pad.y)) {
        if (builder === 'player') {
          this.pushIntel('需先將視野推進至敵方空塔基，才能在敵區建塔奪礦！', 'warn');
          this.emitSnapshot();
        }
        return false;
      }
      if (state.gold < def.cost) return false;
      state.gold -= def.cost;
      pad.team = builder;
      pad.building = true;
      pad.pendingTowerType = safeType;
      pad.pendingUpgradeMode = null;
      pad.upgradeStack = [];
      pad.techLevel = 0;
      pad.buildTotal = def.buildTime;
      pad.buildRemaining = def.buildTime;
      pad.paidGold = def.cost;
      const tierHp = Math.round((def.hp * TOWER_TECH_TIER_HP_PERMILLE[state.techTier]) / 1000);
      pad.maxHp = tierHp;
      pad.maxHpFp = toFp(tierHp);
      pad.hpFp = Math.round((pad.maxHpFp * 250) / 1000);
      pad.hp = Math.ceil(pad.hpFp / FP_SCALE);
      // Constructing towers have unified fragile defenses (0 armor / 0 shield armor, +25% damage taken)
      pad.armor = 0;
      pad.baseArmorFp = 0;
      pad.armorUpgradeLevel = 0;
      pad.armorPerUpgradeFp = toFp(1);
      pad.attributes = [...def.attributes];
      pad.vision = 0;
      pad.detector = false;
      pad.damage = 0;
      pad.baseDamageFp = 0;
      pad.attackIntervalMs = 0;
      pad.attackRate = 0;
      const isCrossTerritory = pad.homeSide !== builder;
      const defender: 'player' | 'enemy' = builder === 'player' ? 'enemy' : 'player';
      this.addFloatingText(
        pad.x,
        pad.y - 24,
        isCrossTerritory ? `奪取敵區動工 ${def.name}...` : `動工 ${def.name}...`,
        isCrossTerritory ? '#5EEAD4' : '#93C5FD'
      );
      if (isCrossTerritory) {
        this.pushIntelFor(
          builder,
          `前線擴張：我軍在敵方${LANE_SHORT_NAMES[pad.lane]}空塔基動工建塔，準備開採敵區金礦！`,
          'info'
        );
        this.pushIntelFor(
          defender,
          `警報：敵軍正在我方${LANE_SHORT_NAMES[pad.lane]}空塔基偷建防禦塔搶佔礦區！`,
          'critical'
        );
      }
      if (builder === 'player' && !this.pvpMode) {
        tacticalAudio.playBuildStart();
        this.targetMode = 'none';
        this.emitSnapshot();
      }
      return true;
    }

    if (pad.team !== builder) return false;

    let effectiveMode: TowerUpgradeMode = upgradeMode;
    if (pad.towerType === 'econ_tower' && effectiveMode === 'mining') {
      effectiveMode = 'combat';
    }
    if (effectiveMode === 'tech' && !this.canUseTowerTechUpgrade(builder)) {
      if (this.isLocalControlled(builder)) {
        tacticalAudio.playDenied();
        const lSpec = FACTIONS[state.faction].specialTechs[1];
        this.pushIntel(`防禦塔【⚡科技升級】需先研發專屬科技 [L] ${lSpec.name}！`, 'warn');
        this.emitSnapshot();
      }
      return false;
    }

    if (pad.level === 1 || pad.level === 2) {
      const nextLv = (pad.level + 1) as 2 | 3;
      if (nextLv === 3 && state.techTier < 2) {
        if (builder === 'player' && !this.pvpMode) {
          tacticalAudio.playDenied();
          this.pushIntel('防禦塔升至 Lv.3 要塞需先完成科技 T2！', 'warn');
          this.emitSnapshot();
        }
        return false;
      }
      const upInfo = getTowerUpgradeCostAndTime(pad.towerType, nextLv, effectiveMode);
      if (state.gold < upInfo.cost) return false;
      state.gold -= upInfo.cost;
      pad.upgrading = true;
      pad.pendingUpgradeMode = effectiveMode;
      pad.buildTotal = upInfo.time;
      pad.buildRemaining = upInfo.time;
      pad.paidGold = upInfo.cost;
      if (builder === 'player' && !this.pvpMode) {
        tacticalAudio.playBuildStart();
        const tag =
          effectiveMode === 'mining'
            ? `⛏擴礦改裝 Lv.${nextLv}...`
            : effectiveMode === 'tech'
            ? `⚡科技改裝 Lv.${nextLv}...`
            : `⚔強化 Lv.${nextLv}...`;
        const col = effectiveMode === 'mining' ? '#FBBF24' : effectiveMode === 'tech' ? '#C084FC' : '#60A5FA';
        this.addFloatingText(pad.x, pad.y - 24, tag, col);
        this.targetMode = 'none';
        this.emitSnapshot();
      }
      return true;
    }
    return false;
  }

  public quickBuildTowerForTeam(
    team: 'player' | 'enemy',
    lane: LaneId,
    towerType: TowerType,
    upgradeMode: TowerUpgradeMode = 'combat'
  ): boolean {
    const safeLane = this.sanitizeLane(lane);
    const state = team === 'player' ? this.player : this.enemy;
    const oppSide: 'player' | 'enemy' = team === 'player' ? 'enemy' : 'player';
    const teamVision = this.getVisionCircles(team);
    const lanePads = this.pads.filter((p) => p.lane === safeLane);

    const emptyHomeOuter = lanePads.find(
      (p) => p.homeSide === team && p.towerType === null && !p.building && p.slot === 'outer'
    );
    const emptyHomeInner = lanePads.find(
      (p) => p.homeSide === team && p.towerType === null && !p.building && p.slot === 'inner'
    );
    const emptyEnemyOuter = lanePads.find(
      (p) =>
        p.homeSide === oppSide &&
        p.towerType === null &&
        !p.building &&
        p.slot === 'outer' &&
        this.isPointVisibleTo(team, p.x, p.y, teamVision)
    );
    const emptyEnemyInner = lanePads.find(
      (p) =>
        p.homeSide === oppSide &&
        p.towerType === null &&
        !p.building &&
        p.slot === 'inner' &&
        this.isPointVisibleTo(team, p.x, p.y, teamVision)
    );
    const upLv1 = lanePads.find(
      (p) => p.team === team && p.towerType !== null && !p.building && !p.upgrading && p.level === 1
    );
    const upLv2 =
      state.techTier >= 2
        ? lanePads.find(
            (p) => p.team === team && p.towerType !== null && !p.building && !p.upgrading && p.level === 2
          )
        : undefined;
    const target = emptyHomeOuter ?? emptyHomeInner ?? emptyEnemyOuter ?? emptyEnemyInner ?? upLv1 ?? upLv2;
    if (!target) return false;
    return this.startTowerOnPad(target.id, towerType, team, upgradeMode);
  }

  public quickBuildTowerOnSelectedLane(): boolean {
    return this.quickBuildTowerForTeam(
      this.getControlledTeam(),
      this.selectedLane,
      this.selectedTowerType,
      this.towerUpgradeMode
    );
  }

  // --- 4TH-LANE CUSTOM AMBUSH SQUAD SYSTEM (Zero stat buffs; unlimited area selection; full 5-stance control) ---
  public selectUnitsForAmbush(worldX: number, worldY: number): number {
    const ctrl = this.getControlledTeam();
    const picked = this.units.filter(
      (u) =>
        u.team === ctrl &&
        u.hp > 0 &&
        u.defId !== 'supply_crate' &&
        u.defId !== 'overdrive_core' &&
        dist(u.x, u.y, worldX, worldY) <= SQUAD_SELECT_RADIUS
    );
    if (picked.length === 0) {
      if (!this.pvpMode) {
        tacticalAudio.playDenied();
        this.addFloatingText(worldX, worldY - 18, '範圍內無友軍單位', '#F87171');
        this.emitSnapshot();
      }
      return 0;
    }
    this.pendingAmbushUnitIds = picked.map((u) => u.id);
    this.targetMode = 'ambush_target';
    this.spawnRingParticle(worldX, worldY, '#2DD4BF', SQUAD_SELECT_RADIUS);
    this.addFloatingText(worldX, worldY - 22, `已選取 ${picked.length} 名單位，點選目的地`, '#5EEAD4');
    if (!this.pvpMode) {
      tacticalAudio.playClick();
      this.emitSnapshot();
    }
    return picked.length;
  }

  public formSquad(team: 'player' | 'enemy', unitIds: number[], targetX: number, targetY: number): boolean {
    const state = team === 'player' ? this.player : this.enemy;
    if (state.ambushCooldown > 0 || state.gold < JUNGLE_AMBUSH_COST) return false;
    const idSet = new Set(unitIds);
    const chosen = this.units.filter(
      (u) =>
        u.team === team &&
        u.hp > 0 &&
        u.defId !== 'supply_crate' &&
        u.defId !== 'overdrive_core' &&
        idSet.has(u.id)
    );
    if (chosen.length === 0) {
      if (this.isLocalControlled(team)) {
        this.pendingAmbushUnitIds = [];
        this.targetMode = 'none';
        this.emitSnapshot();
      }
      return false;
    }

    // Release any previous squad members of this team back to their nearest lane
    const activeLanes = this.getActiveLanes();
    for (const u of this.units) {
      if (u.team === team && u.inAmbushSquad && !idSet.has(u.id)) {
        u.inAmbushSquad = false;
        u.squadDestination = null;
        u.jungleWaypoints = [];
        u.jungleTargetLane = null;
        u.lane = closestLaneToPoint(u.x, u.y, activeLanes);
      }
    }

    const cx = clamp(targetX, 60, WORLD_WIDTH - 60);
    const cy = clamp(targetY, 50, WORLD_HEIGHT - 50);
    state.gold -= JUNGLE_AMBUSH_COST;
    state.ambushesLaunched++;
    state.squadActive = true;
    state.squadTarget = { x: cx, y: cy };
    state.squadStance = 'push';

    for (let i = 0; i < chosen.length; i++) {
      const u = chosen[i];
      const angle = (i / Math.max(1, chosen.length)) * Math.PI * 2;
      const spreadR = chosen.length === 1 ? 0 : Math.min(26, 8 + Math.floor(i / 6) * 8);
      u.inAmbushSquad = true;
      u.squadDestination = {
        x: clamp(cx + Math.cos(angle) * spreadR, 55, WORLD_WIDTH - 55),
        y: clamp(cy + Math.sin(angle) * spreadR, 50, WORLD_HEIGHT - 50),
      };
      u.jungleWaypoints = [];
      u.jungleTargetLane = null;
      u.jungleMode = undefined;
    }

    this.spawnRingParticle(cx, cy, '#2DD4BF', 75);
    this.addFloatingText(cx, cy - 22, `編隊集結 (${chosen.length}人 · 第四路)`, '#5EEAD4');
    if (team === this.getControlledTeam()) {
      this.pendingAmbushUnitIds = [];
      this.targetMode = 'none';
      this.squadSelected = true;
      if (!this.pvpMode) {
        tacticalAudio.playAmbush();
        this.emitSnapshot();
      }
    }
    return true;
  }

  public disbandSquad(team: 'player' | 'enemy' = 'player'): boolean {
    const state = team === 'player' ? this.player : this.enemy;
    const activeLanes = this.getActiveLanes();
    let count = 0;
    let avgX = 0;
    let avgY = 0;
    for (const u of this.units) {
      if (u.team === team && u.inAmbushSquad && u.hp > 0) {
        u.inAmbushSquad = false;
        u.squadDestination = null;
        u.jungleWaypoints = [];
        u.jungleTargetLane = null;
        u.lane = closestLaneToPoint(u.x, u.y, activeLanes);
        avgX += u.x;
        avgY += u.y;
        count++;
      }
    }
    const wasActive = state.squadActive || count > 0;
    state.squadActive = false;
    state.squadTarget = null;
    if (wasActive) {
      state.ambushCooldown = JUNGLE_AMBUSH_COOLDOWN; // 0.1s cooldown after disbanding!
    }
    if (count > 0) {
      this.addFloatingText(avgX / count, avgY / count - 20, `解除編隊 (${count}人歸併最近路線)`, '#94A3B8');
    }
    if (team === this.getControlledTeam()) {
      this.squadSelected = false;
      this.pendingAmbushUnitIds = [];
      if (this.targetMode === 'ambush_select' || this.targetMode === 'ambush_target') {
        this.targetMode = 'none';
      }
      if (!this.pvpMode) {
        tacticalAudio.playClick();
        this.emitSnapshot();
      }
    }
    return wasActive;
  }

  private launchAiSquadRaid(team: 'player' | 'enemy', targetX: number, targetY: number): boolean {
    const state = team === 'player' ? this.player : this.enemy;
    if (state.ambushCooldown > 0) return false;
    const candidates = this.units
      .filter((u) => u.team === team && u.hp > 0 && u.defId !== 'supply_crate' && u.defId !== 'overdrive_core')
      .sort((a, b) => distSq(a.x, a.y, targetX, targetY) - distSq(b.x, b.y, targetX, targetY));
    if (candidates.length === 0) return false;
    const picked = candidates.slice(0, Math.min(8, candidates.length)).map((u) => u.id);
    return this.formSquad(team, picked, targetX, targetY);
  }

  public castScan(team: 'player' | 'enemy', x: number, y: number): boolean {
    const state = team === 'player' ? this.player : this.enemy;
    if (state.scanCooldown > 0) return false;
    const f = FACTIONS[state.faction];
    state.scanCooldown = f.scanCooldown;
    state.scansUsed++;

    const cx = clamp(x, 60, WORLD_WIDTH - 60);
    const cy = clamp(y, 60, WORLD_HEIGHT - 60);
    const scanRadius = f.scanRadius;
    const scanDuration = f.scanDuration;

    this.scans.push({
      id: this.nextId++,
      team,
      x: cx,
      y: cy,
      radius: scanRadius,
      timeRemaining: scanDuration,
      duration: scanDuration,
    });

    this.evaluateIntelFromArea(team, cx, cy, scanRadius);
    const oppTeam: 'player' | 'enemy' = team === 'player' ? 'enemy' : 'player';
    const nearOppHalf = oppTeam === 'player' ? cx < WORLD_WIDTH * 0.58 : cx > WORLD_WIDTH * 0.42;
    if (nearOppHalf) {
      this.pushIntelFor(oppTeam, '警報：偵測到敵軍雷達正在掃描我方戰線與野區！', 'warn');
    }

    if (team === 'player' && !this.pvpMode) {
      tacticalAudio.playScan();
      this.targetMode = 'none';
      this.spawnRingParticle(cx, cy, '#38BDF8', scanRadius);
      this.emitSnapshot();
    }
    return true;
  }

  public castFactionSkill(team: 'player' | 'enemy', x: number, y: number): boolean {
    const state = team === 'player' ? this.player : this.enemy;
    const f = FACTIONS[state.faction];
    if (state.activeCooldown > 0 || state.gold < f.activeCost) return false;

    state.gold -= f.activeCost;
    state.activeCooldown = f.activeCooldown;

    if (state.faction === 'ironbound') {
      // Base 6 waves + 1 extra wave per Gold Mining upgrade and per Gas Extractor upgrade; per-wave damage unchanged (+ buffs apply!)
      const waves = this.getIronArtilleryWaves(team);
      const buffBonusFp = state.globalAttackBuffTimer > 0 ? toFp(2) : 0;
      this.strikes.push({
        id: this.nextId++,
        team,
        x: clamp(x, 80, WORLD_WIDTH - 80),
        y: clamp(y, 70, WORLD_HEIGHT - 70),
        radius: 72,
        wavesLeft: waves,
        waveTimer: 0.45,
        damageFp: toFp(6) + buffBonusFp,
        bonusVsTagFp: toTagBonusFp({ Light: 4, Structure: 5 }),
      });
      if (this.isLocalControlled(team)) {
        tacticalAudio.playSkill();
        this.addFloatingText(x, y - 30, `軌道砲擊鎖定 (${waves}波)！`, '#60A5FA');
        this.targetMode = 'none';
        this.emitSnapshot();
      }
    } else if (state.faction === 'dawn') {
      const cx = clamp(x, 75, WORLD_WIDTH - 75);
      const cy = clamp(y, 65, WORLD_HEIGHT - 65);
      const econGasUps = Math.max(0, state.econLevel - 1) + this.getTeamGasUpgradeCount(team);
      const buffBonusFp = state.globalAttackBuffTimer > 0 ? toFp(2) : 0;
      const blastRadius = 75;
      const blastSpec: WeaponAttackSpecFp = {
        baseDamageFp: toFp(14) + buffBonusFp,
        attackUpgradeLevel: 0,
        damagePerUpgradeFp: 0,
        attackCount: 1,
        bonusVsTagFp: toTagBonusFp({ Light: 6, Structure: 8 }),
        bonusPerUpgradeVsTagFp: {},
      };
      // Core Solar Overload Pulse — DEALS FRIENDLY FIRE to ALL units inside 75px!
      for (const u of this.units) {
        if (u.hpFp > 0 && dist(u.x, u.y, cx, cy) <= blastRadius) {
          this.applyDamageToUnit(u, blastSpec, team, 0);
        }
      }
      const enemyTeam = team === 'player' ? 'enemy' : 'player';
      for (const pad of this.pads) {
        if (pad.team === enemyTeam && (pad.towerType || pad.building) && pad.hpFp > 0 && dist(pad.x, pad.y, cx, cy) <= blastRadius) {
          this.applyDamageToPad(pad, blastSpec, team);
        }
      }
      for (const obj of this.objectives) {
        if (obj.kind === 'barricade' && !obj.cleared && dist(obj.x, obj.y, cx, cy) <= blastRadius) {
          this.damageBarricade(obj, blastSpec, team);
        }
      }

      let boosted = 0;
      const hasteDuration = Number((5.5 + econGasUps * 0.4).toFixed(1));
      const bonusShieldVal = 45 + econGasUps * 5;
      const bonusShieldFp = toFp(bonusShieldVal);
      for (const u of this.units) {
        if (u.team === team && u.hpFp > 0 && dist(u.x, u.y, cx, cy) <= 120) {
          u.hasteTimer = Math.max(u.hasteTimer, hasteDuration);
          u.shieldFp = Math.min(u.maxShieldFp + bonusShieldFp, u.shieldFp + bonusShieldFp);
          u.maxShieldFp = Math.max(u.maxShieldFp, u.shieldFp);
          u.shield = Math.ceil(u.shieldFp / FP_SCALE);
          u.maxShield = Math.round(u.maxShieldFp / FP_SCALE);
          boosted++;
        }
      }
      this.spawnRingParticle(cx, cy, '#FB923C', blastRadius);
      this.spawnRingParticle(cx, cy, '#FBBF24', 120);
      this.spawnParticles(cx, cy, '#FDE68A', 22, 110, 4.0);
      this.addShake(4.2, 0.16);
      this.addFloatingText(
        cx,
        cy - 28,
        boosted > 0 ? `聖光裁決 (+${bonusShieldVal}盾·${hasteDuration}s)` : '聖光裁決衝擊！',
        '#FCD34D'
      );
      if (this.isLocalControlled(team)) {
        tacticalAudio.playSkill();
        this.targetMode = 'none';
        this.emitSnapshot();
      }
    } else {
      const cx = clamp(x, 75, WORLD_WIDTH - 75);
      const cy = clamp(y, 65, WORLD_HEIGHT - 65);
      const lane = closestLaneToPoint(cx, cy, this.getActiveLanes());
      this.sporeDrops.push({
        id: this.nextId++,
        team,
        x: cx,
        y: cy,
        lane,
        radius: 72,
        timeRemaining: 0.85,
        duration: 0.85,
      });
      const econGasUps = Math.max(0, state.econLevel - 1) + this.getTeamGasUpgradeCount(team);
      const lingCount = Math.min(8, 3 + Math.floor(econGasUps / 2));
      this.addFloatingText(cx, cy - 28, `孢子伏擊空投 (×${lingCount})！`, '#6EE7B7');
      const oppTeam: 'player' | 'enemy' = team === 'player' ? 'enemy' : 'player';
      const nearOpp = oppTeam === 'player' ? cx < WORLD_WIDTH * 0.65 : cx > WORLD_WIDTH * 0.35;
      if (nearOpp) {
        this.pushIntelFor(oppTeam, `警報：敵方蟲巢在${LANE_SHORT_NAMES[lane]}附近投下孢子空投囊！`, 'warn');
      }
      if (this.isLocalControlled(team)) {
        tacticalAudio.playSkill();
        this.targetMode = 'none';
        this.emitSnapshot();
      }
    }
    return true;
  }

  public castKBoost(team: 'player' | 'enemy', x: number, y: number): boolean {
    const state = team === 'player' ? this.player : this.enemy;
    const kLv = state.specialTechLevels?.[0] ?? (state.specialTechsDone[0] ? 1 : 0);
    if (kLv < 1 || state.kActiveCooldown > 0) return false;

    const cx = clamp(x, 60, WORLD_WIDTH - 60);
    const cy = clamp(y, 50, WORLD_HEIGHT - 50);
    let bioCount = 0;
    let mechCount = 0;

    for (const u of this.units) {
      if (u.team !== team || u.hpFp <= 0) continue;
      if (u.defId === 'supply_crate' || u.defId === 'overdrive_core') continue;
      if (dist(u.x, u.y, cx, cy) > IRON_K_BOOST_RADIUS) continue;

      if (state.faction === 'dawn') {
        const shieldAddFp = toFp(35);
        if (u.maxShieldFp > 0) {
          u.shieldFp = Math.min(u.maxShieldFp, u.shieldFp + shieldAddFp);
          u.shield = Math.ceil(u.shieldFp / FP_SCALE);
        }
        if (u.attributes.includes('Biological') || u.attributes.includes('Psionic')) {
          u.stimTimer = IRON_K_BOOST_DURATION;
          bioCount++;
        } else {
          u.siegeLockTimer = IRON_K_BOOST_DURATION;
          mechCount++;
        }
      } else if (state.faction === 'swarm') {
        const hpCostFp = Math.trunc((u.maxHpFp * IRON_K_BIO_HP_COST_PERMILLE) / 1000);
        u.hpFp = Math.max(FP_SCALE, u.hpFp - hpCostFp);
        u.hp = Math.ceil(u.hpFp / FP_SCALE);
        u.stimTimer = IRON_K_BOOST_DURATION;
        bioCount++;
      } else {
        if (u.attributes.includes('Biological')) {
          const hpCostFp = Math.trunc((u.maxHpFp * IRON_K_BIO_HP_COST_PERMILLE) / 1000);
          u.hpFp = Math.max(FP_SCALE, u.hpFp - hpCostFp);
          u.hp = Math.ceil(u.hpFp / FP_SCALE);
          u.stimTimer = IRON_K_BOOST_DURATION;
          bioCount++;
        } else {
          u.siegeLockTimer = IRON_K_BOOST_DURATION;
          mechCount++;
        }
      }
    }

    if (bioCount === 0 && mechCount === 0) {
      if (this.isLocalControlled(team)) {
        tacticalAudio.playDenied();
        this.addFloatingText(cx, cy - 18, '範圍內無友軍單位', '#F87171');
        this.emitSnapshot();
      }
      return false;
    }

    state.kActiveCooldown = IRON_K_BOOST_COOLDOWN;
    const ringCol =
      state.faction === 'dawn'
        ? '#FBBF24'
        : state.faction === 'swarm'
        ? '#10B981'
        : bioCount >= mechCount
        ? '#34D399'
        : '#F59E0B';
    this.spawnRingParticle(cx, cy, ringCol, IRON_K_BOOST_RADIUS);
    this.spawnParticles(cx, cy, state.faction === 'swarm' ? '#6EE7B7' : '#FDE68A', 16, 85, 3.2);
    const msg =
      state.faction === 'dawn'
        ? bioCount > 0 && mechCount > 0
          ? `護盾超載！激勵×${bioCount} · 架設×${mechCount}`
          : bioCount > 0
          ? `護盾超載 +35盾 · 靈能激勵 ×${bioCount}`
          : `護盾超載 +35盾 · 架設鎖定 ×${mechCount}`
        : state.faction === 'swarm'
        ? `蟲巢狂熱 ×${bioCount} (3s)`
        : bioCount > 0 && mechCount > 0
        ? `鼓舞×${bioCount} · 架設鎖定×${mechCount} (3s)`
        : bioCount > 0
        ? `士氣鼓舞 ×${bioCount} (3s)`
        : `原地火力鎖定 ×${mechCount} (3s)`;
    this.addFloatingText(cx, cy - 26, msg, ringCol);

    if (this.isLocalControlled(team)) {
      tacticalAudio.playSkill();
      this.targetMode = 'none';
      this.emitSnapshot();
    }
    return true;
  }

  public handleCanvasClick(worldX: number, worldY: number, isRightClick = false, touchTolerance = false) {
    if (this.screen !== 'PLAYING') return;
    const ctrl = this.getControlledTeam();
    const ctrlState = ctrl === 'player' ? this.player : this.enemy;
    const ctrlNexusPos = ctrl === 'player' ? PLAYER_NEXUS_POS : ENEMY_NEXUS_POS;

    if (isRightClick) {
      if (this.targetMode !== 'none') {
        this.pendingAmbushUnitIds = [];
        this.targetMode = 'none';
        tacticalAudio.playClick();
        this.emitSnapshot();
      }
      return;
    }

    if (this.targetMode === 'scan') {
      this.castScan(ctrl, worldX, worldY);
      return;
    }

    if (this.targetMode === 'faction_skill') {
      this.castFactionSkill(ctrl, worldX, worldY);
      return;
    }

    if (this.targetMode === 'k_boost') {
      this.castKBoost(ctrl, worldX, worldY);
      return;
    }

    if (this.targetMode === 'ambush_select') {
      this.selectUnitsForAmbush(worldX, worldY);
      return;
    }

    if (this.targetMode === 'ambush_target') {
      this.formSquad(ctrl, this.pendingAmbushUnitIds, worldX, worldY);
      return;
    }

    const depotHitRadius = touchTolerance ? 36 : 22;
    const padHitRadius = touchTolerance ? 42 : 28;

    // Double-click ANY under-construction or upgrading friendly building to cancel & refund 100% Gold!
    const findConstructingHit = (): { kind: CancellableBuildingKind; id: string; x: number; y: number; refund: number } | null => {
      const cPad = this.pads.find(
        (p) => p.team === ctrl && (p.building || p.upgrading) && dist(p.x, p.y, worldX, worldY) <= padHitRadius
      );
      if (cPad) return { kind: 'pad', id: cPad.id, x: cPad.x, y: cPad.y, refund: cPad.paidGold ?? 0 };
      const cArm = this.armories.find(
        (a) => a.team === ctrl && a.building && dist(a.x, a.y, worldX, worldY) <= depotHitRadius + 4
      );
      if (cArm) return { kind: 'armory', id: cArm.id, x: cArm.x, y: cArm.y, refund: cArm.paidGold ?? ARMORY_BUILDING_DEFS[cArm.kind].cost };
      const cExt = this.extractors.find(
        (g) => g.team === ctrl && (g.building || g.upgrading) && dist(g.x, g.y, worldX, worldY) <= depotHitRadius + 2
      );
      if (cExt) return { kind: 'extractor', id: cExt.id, x: cExt.x, y: cExt.y, refund: cExt.paidGold ?? 0 };
      const cBk = this.barracks.find(
        (b) => b.team === ctrl && b.building && dist(b.x, b.y, worldX, worldY) <= depotHitRadius + 4
      );
      if (cBk) return { kind: 'barracks', id: cBk.id, x: cBk.x, y: cBk.y, refund: cBk.paidGold ?? 0 };
      const cDep = this.depots.find(
        (d) => d.team === ctrl && d.building && dist(d.x, d.y, worldX, worldY) <= depotHitRadius
      );
      if (cDep) return { kind: 'depot', id: cDep.id, x: cDep.x, y: cDep.y, refund: cDep.paidGold ?? SUPPLY_DEPOT_COST };
      return null;
    };

    const constructingHit = findConstructingHit();
    if (constructingHit) {
      const now = Date.now();
      if (
        this.lastConstructClick &&
        this.lastConstructClick.kind === constructingHit.kind &&
        this.lastConstructClick.id === constructingHit.id &&
        now - this.lastConstructClick.atMs <= 600
      ) {
        this.lastConstructClick = null;
        this.cancelBuilding(ctrl, constructingHit.kind, constructingHit.id);
      } else {
        this.lastConstructClick = { kind: constructingHit.kind, id: constructingHit.id, atMs: now };
        this.addFloatingText(
          constructingHit.x,
          constructingHit.y - 26,
          constructingHit.refund > 0 ? `再點一次取消 (+${constructingHit.refund}G)` : '再點一次取消建造',
          '#FDE047'
        );
        tacticalAudio.playClick();
      }
      return;
    }
    this.lastConstructClick = null;

    // Clicking own Nexus when plating is broken triggers Nexus plating repair!
    if (
      ctrlState.nexusPlatingBroken &&
      dist(ctrlNexusPos.x, ctrlNexusPos.y, worldX, worldY) <= (touchTolerance ? 48 : 38)
    ) {
      this.repairNexusPlating(ctrl);
      return;
    }

    // Check if clicked on an unbuilt Armory prerequisite building (Bio Lab / Mech Bay)
    const clickedArmory = this.armories.find(
      (a) => a.team === ctrl && !a.built && !a.building && dist(a.x, a.y, worldX, worldY) <= depotHitRadius + 4
    );
    if (clickedArmory) {
      this.buildArmoryBuilding(clickedArmory.kind, ctrl);
      return;
    }

    // Check if clicked on an eligible Gas Extractor socket (build Lv.1 or upgrade Lv.2..3)
    const clickedExtractor = this.extractors.find(
      (g) =>
        !g.building &&
        !g.upgrading &&
        g.level < GAS_EXTRACTOR_MAX_LEVEL &&
        ((!g.built && this.isExtractorEligibleForTeam(g, ctrl)) || (g.built && g.team === ctrl)) &&
        dist(g.x, g.y, worldX, worldY) <= depotHitRadius + 2
    );
    if (clickedExtractor) {
      this.buildOrUpgradeExtractor(ctrl, clickedExtractor.id);
      return;
    }

    // Check if clicked on an unbuilt controlled Supply Depot socket (builds on that exact chosen slot!)
    const clickedDepot = this.depots.find(
      (d) => d.team === ctrl && !d.built && !d.building && dist(d.x, d.y, worldX, worldY) <= depotHitRadius
    );
    if (clickedDepot) {
      this.buildSupplyDepot(ctrl, clickedDepot.id);
      return;
    }

    // Check if clicked on an upgradeable controlled Base Barracks socket (Lv.0 -> Lv.1 -> Lv.2 -> Lv.3 -> Lv.4!)
    const clickedBarracks = this.barracks.find(
      (b) =>
        b.team === ctrl &&
        !b.building &&
        b.level < BARRACKS_MAX_LEVEL &&
        dist(b.x, b.y, worldX, worldY) <= depotHitRadius + 4
    );
    if (clickedBarracks) {
      this.buildBarracks(clickedBarracks.tier, ctrl);
      return;
    }

    // Check if clicked on ANY interactable tower pad (own towers, own empty pads, or visible empty enemy pads!)
    const ctrlVision = this.getVisionCircles(ctrl);
    const clickedPad = this.pads.find(
      (p) =>
        dist(p.x, p.y, worldX, worldY) <= padHitRadius &&
        (p.team === ctrl ||
          (p.towerType === null &&
            !p.building &&
            (this.sandboxMode || p.homeSide === ctrl || this.isPointVisibleTo(ctrl, p.x, p.y, ctrlVision))))
    );
    if (clickedPad) {
      this.selectedLane = clickedPad.lane;
      this.squadSelected = false;
      const started = this.startTowerOnPad(clickedPad.id, this.selectedTowerType, ctrl, this.towerUpgradeMode);
      if (!started) tacticalAudio.playDenied();
      this.emitSnapshot();
      return;
    }

    if (this.targetMode === 'build_tower') {
      this.targetMode = 'none';
    }

    const lane = closestLaneToPoint(worldX, worldY, this.getActiveLanes());
    if (lane !== this.selectedLane || this.squadSelected) {
      this.selectedLane = lane;
      this.squadSelected = false;
      tacticalAudio.playLaneSelect(lane);
      this.emitSnapshot();
    }
  }

  public handleCanvasHover(worldX: number | null, worldY: number | null) {
    if (worldX === null || worldY === null) {
      this.hoveredWorld = null;
      this.hoveredPadId = null;
      return;
    }
    this.hoveredWorld = { x: worldX, y: worldY };
    const ctrl = this.getControlledTeam();
    const opp: 'player' | 'enemy' = ctrl === 'player' ? 'enemy' : 'player';
    const pad = this.pads.find(
      (p) =>
        dist(p.x, p.y, worldX, worldY) <= 28 &&
        (this.sandboxMode ||
          p.team === ctrl ||
          (p.towerType === null && !p.building && (p.homeSide === ctrl || this.isPointVisibleTo(ctrl, p.x, p.y))) ||
          (p.team === opp && (p.towerType !== null || p.building) && this.isPointVisibleTo(ctrl, p.x, p.y)))
    );
    this.hoveredPadId = pad ? pad.id : null;
  }

  public getVisionCircles(team: 'player' | 'enemy'): Array<{ x: number; y: number; r: number; detector: boolean }> {
    const circles: Array<{ x: number; y: number; r: number; detector: boolean }> = [];
    const nexusPos = team === 'player' ? PLAYER_NEXUS_POS : ENEMY_NEXUS_POS;
    const stormZone = this.activeEvent?.kind === 'fog_storm' ? this.activeEvent.jungleZone : null;

    // Scarce detection: Nexus does NOT innately detect cloaked units!
    circles.push({ x: nexusPos.x, y: nexusPos.y, r: NEXUS_VISION, detector: false });

    for (const dep of this.depots) {
      if (dep.team === team && dep.built && dep.hp > 0) {
        circles.push({ x: dep.x, y: dep.y, r: SUPPLY_DEPOT_VISION, detector: false });
      }
    }

    for (const arm of this.armories) {
      if (arm.team === team && arm.built && arm.hp > 0) {
        circles.push({ x: arm.x, y: arm.y, r: ARMORY_BUILDING_VISION, detector: false });
      }
    }

    for (const ext of this.extractors) {
      if (ext.team === team && ext.built && ext.hp > 0) {
        circles.push({ x: ext.x, y: ext.y, r: GAS_EXTRACTOR_VISION, detector: false });
      }
    }

    for (const pad of this.pads) {
      if (pad.team === team && pad.towerType !== null && !pad.building && pad.hp > 0) {
        const inStorm =
          stormZone === 'upper'
            ? pad.y < 420
            : stormZone === 'lower'
            ? pad.y > 420
            : stormZone === 'center'
            ? pad.x > 250 && pad.x < WORLD_WIDTH - 250
            : false;
        const mult = inStorm ? 0.65 : 1;
        circles.push({ x: pad.x, y: pad.y, r: pad.vision * mult, detector: pad.detector });
      }
    }

    for (const u of this.units) {
      if (u.team === team && u.hp > 0) {
        const inStorm =
          stormZone === 'upper'
            ? u.y < 420
            : stormZone === 'lower'
            ? u.y > 420
            : stormZone === 'center'
            ? u.x > 250 && u.x < WORLD_WIDTH - 250
            : false;
        const mult = inStorm ? 0.65 : 1;
        circles.push({ x: u.x, y: u.y, r: u.vision * mult, detector: Boolean(u.detector) });
      }
    }

    for (const obj of this.objectives) {
      if (obj.kind === 'ancient_beacon' && obj.owner === team) {
        circles.push({ x: obj.x, y: obj.y, r: 235, detector: true });
      }
    }

    for (const scan of this.scans) {
      if (scan.team === team && scan.timeRemaining > 0) {
        circles.push({ x: scan.x, y: scan.y, r: scan.radius, detector: true });
      }
    }

    return circles;
  }

  public isPointVisibleTo(
    team: 'player' | 'enemy',
    x: number,
    y: number,
    circles?: Array<{ x: number; y: number; r: number; detector: boolean }>
  ): boolean {
    const list = circles ?? this.getVisionCircles(team);
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (distSq(x, y, c.x, c.y) <= c.r * c.r) return true;
    }
    return false;
  }

  public isPointDetectedBy(
    team: 'player' | 'enemy',
    x: number,
    y: number,
    circles?: Array<{ x: number; y: number; r: number; detector: boolean }>
  ): boolean {
    const list = circles ?? this.getVisionCircles(team);
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c.detector && distSq(x, y, c.x, c.y) <= c.r * c.r) return true;
    }
    return false;
  }

  public isUnitVisibleTo(
    viewer: 'player' | 'enemy',
    unit: UnitEntity,
    circles?: Array<{ x: number; y: number; r: number; detector: boolean }>
  ): boolean {
    if (unit.team === viewer) return true;
    const list = circles ?? this.getVisionCircles(viewer);
    if (!this.isPointVisibleTo(viewer, unit.x, unit.y, list)) return false;
    if (unit.cloaked && unit.revealTimer <= 0) {
      return this.isPointDetectedBy(viewer, unit.x, unit.y, list);
    }
    return true;
  }

  /**
   * Human-eye visibility: includes non-cloaked enemy units that recently attacked from outside vision!
   * Unit AI combat targeting still uses `isUnitVisibleTo` so friendly units CANNOT shoot into fog.
   */
  public isUnitVisibleToHumanEye(
    viewer: 'player' | 'enemy',
    unit: UnitEntity,
    circles?: Array<{ x: number; y: number; r: number; detector: boolean }>
  ): boolean {
    if (this.isUnitVisibleTo(viewer, unit, circles)) return true;
    if (!unit.cloaked && (unit.firedRevealTimer ?? 0) > 0) return true;
    return false;
  }

  private evaluateIntelFromArea(scanner: 'player' | 'enemy', x: number, y: number, radius: number) {
    const oppTeam: 'player' | 'enemy' = scanner === 'player' ? 'enemy' : 'player';
    const oppState = oppTeam === 'player' ? this.player : this.enemy;
    const oppNexusPos = oppTeam === 'player' ? PLAYER_NEXUS_POS : ENEMY_NEXUS_POS;

    if (dist(x, y, oppNexusPos.x, oppNexusPos.y) <= radius + 45) {
      if (scanner === 'player') {
        this.enemyNexusHpKnown = Math.ceil(oppState.nexusHp);
        if (this.enemyTechTierKnown !== oppState.techTier) {
          this.enemyTechTierKnown = oppState.techTier;
          this.pushIntelFor(
            'player',
            `雷達情報：敵方主堡 T${oppState.techTier}，主堡剩餘礦脈 ${Math.ceil(oppState.nexusGoldReserve)}G`,
            'info'
          );
        }
      } else {
        this.playerNexusHpKnownByEnemy = Math.ceil(oppState.nexusHp);
        if (this.playerTechTierKnownByEnemy !== oppState.techTier) {
          this.playerTechTierKnownByEnemy = oppState.techTier;
          this.pushIntelFor(
            'enemy',
            `雷達情報：敵方主堡 T${oppState.techTier}，主堡剩餘礦脈 ${Math.ceil(oppState.nexusGoldReserve)}G`,
            'info'
          );
        }
      }
    }

    let stealthFound = 0;
    let jungleRaiders = 0;
    for (const u of this.units) {
      if (u.team === oppTeam && dist(x, y, u.x, u.y) <= radius) {
        if (u.cloaked) stealthFound++;
        if (u.jungleWaypoints.length > 0) jungleRaiders++;
      }
    }
    if (stealthFound > 0) {
      this.pushIntelFor(scanner, `反隱警報：掃描揭露了 ${stealthFound} 名敵方潛行單位！`, 'critical');
    } else if (jungleRaiders > 0) {
      this.pushIntelFor(scanner, `奇襲警報：掃描發現 ${jungleRaiders} 名敵軍正穿越野區密道！`, 'critical');
    }
  }

  public update(rawDt: number) {
    if (this.isRemoteClient) {
      if (this.screen === 'PLAYING' || this.screen === 'PAUSED') {
        this.interpolateRemote(Math.min(rawDt, 0.05));
      }
      return;
    }

    if (this.screen !== 'PLAYING') return;

    const clampedDt = Math.min(rawDt, 0.05) * BASE_SIM_SPEED * (this.pvpMode ? 1 : this.speedMultiplier);

    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - clampedDt);
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - rawDt);
      this.updateParticlesAndText(clampedDt * 0.35);
      return;
    }

    this.elapsed += clampedDt;

    if (this.sandboxMode) {
      this.player.gold = 99999;
      this.enemy.gold = 99999;
      this.player.gas = 99999;
      this.enemy.gas = 99999;
      if (this.sandboxInstantMode) {
        for (const tm of ['player', 'enemy'] as const) {
          const st = tm === 'player' ? this.player : this.enemy;
          for (const q of st.trainingQueue) q.remaining = Math.min(q.remaining, 0.05);
          for (const r of st.activeResearches) r.remaining = Math.min(r.remaining, 0.05);
        }
        for (const pad of this.pads) {
          if (pad.building || pad.upgrading) pad.buildRemaining = Math.min(pad.buildRemaining, 0.05);
        }
        for (const dep of this.depots) {
          if (dep.building) dep.buildRemaining = Math.min(dep.buildRemaining, 0.05);
        }
        for (const bk of this.barracks) {
          if (bk.building) bk.buildRemaining = Math.min(bk.buildRemaining, 0.05);
        }
        for (const arm of this.armories) {
          if (arm.building) arm.buildRemaining = Math.min(arm.buildRemaining, 0.05);
        }
        for (const ext of this.extractors) {
          if (ext.building || ext.upgrading) ext.buildRemaining = Math.min(ext.buildRemaining, 0.05);
        }
      }
    }

    // 1. Finite Mineral Extraction (Home Nexus + Standing Towers + Jungle Rich Veins)
    this.updateResourceMining(clampedDt, 'player');
    this.updateResourceMining(clampedDt, 'enemy');

    // 2. Queues & Timers (Training, Research, Tower Construction, Supply Depot Construction)
    // Tutorial Mode accelerates player build/research speed by 2.4x so lessons flow smoothly without long waits
    const playerQueueDt = this.tutorialMode ? clampedDt * 2.4 : clampedDt;
    this.updateTeamQueues(playerQueueDt, 'player');
    this.updateTeamQueues(clampedDt, 'enemy');
    this.updateConstruction(this.tutorialMode ? clampedDt * 2.4 : clampedDt);

    // 3. Cooldowns & Buffs (Completed Tech Towers accelerate Scan, Faction Skill & [K] CDs!)
    for (const tm of ['player', 'enemy'] as const) {
      const st = tm === 'player' ? this.player : this.enemy;
      const { cdRateBonus } = this.getTechTowerBonuses(tm);
      const cdDt = clampedDt * (1 + cdRateBonus);
      st.scanCooldown = Math.max(0, st.scanCooldown - cdDt);
      st.activeCooldown = Math.max(0, st.activeCooldown - cdDt);
      st.kActiveCooldown = Math.max(0, st.kActiveCooldown - cdDt);
      st.ambushCooldown = Math.max(0, st.ambushCooldown - clampedDt);
      st.nexusHitFlash = Math.max(0, st.nexusHitFlash - clampedDt * 4);
      st.globalAttackBuffTimer = Math.max(0, st.globalAttackBuffTimer - clampedDt);
      for (const lane of [0, 1, 2] as LaneId[]) {
        st.laneBuffTimer[lane] = Math.max(0, st.laneBuffTimer[lane] - clampedDt);
      }
    }
    for (const lane of [0, 1, 2] as LaneId[]) {
      this.laneAlertTimers[lane] = Math.max(0, this.laneAlertTimers[lane] - clampedDt);
      this.enemyLaneAlertTimers[lane] = Math.max(0, this.enemyLaneAlertTimers[lane] - clampedDt);
    }

    // 4. Scans, Strikes, Spore Drops
    for (let i = this.scans.length - 1; i >= 0; i--) {
      this.scans[i].timeRemaining -= clampedDt;
      if (this.scans[i].timeRemaining <= 0) this.scans.splice(i, 1);
    }
    this.updateArtilleryStrikes(clampedDt);
    this.updateSporeDrops(clampedDt);

    // 5. Dynamic Jungle Events
    this.updateDynamicEvents(clampedDt);

    // 6. Vision Circles
    const playerVision = this.getVisionCircles('player');
    const enemyVision = this.getVisionCircles('enemy');

    // 7. AI Opponents (Solo mode enemy AI, or Custom Online Room AI bots on either/both seats; disabled in Sandbox)
    if (this.sandboxMode) {
      // Sandbox: human controls both sides
    } else if (!this.pvpMode) {
      this.updateAIForTeam('enemy', clampedDt, enemyVision);
    } else {
      if (this.aiControl.player.enabled) {
        this.updateAIForTeam('player', clampedDt, playerVision);
      }
      if (this.aiControl.enemy.enabled) {
        this.updateAIForTeam('enemy', clampedDt, enemyVision);
      }
    }

    // 8. Combat & Movement
    this.updateUnits(clampedDt, playerVision, enemyVision);
    // Auto-disband 4th-lane squad if all members perished
    for (const tm of ['player', 'enemy'] as const) {
      const st = tm === 'player' ? this.player : this.enemy;
      if (st.squadActive && !this.units.some((u) => u.team === tm && u.inAmbushSquad && u.hp > 0)) {
        st.squadActive = false;
        st.squadTarget = null;
        if (tm === this.getControlledTeam()) this.squadSelected = false;
      }
    }
    this.updateTowersAndNexuses(clampedDt, playerVision, enemyVision);
    this.updateProjectiles(clampedDt);
    this.updateObjectives(clampedDt);
    this.updateFogIntelTrackingForSeat('player', clampedDt, playerVision);
    if (this.pvpMode) {
      this.updateFogIntelTrackingForSeat('enemy', clampedDt, enemyVision);
    }
    this.updateParticlesAndText(clampedDt);

    // 9. Victory Check
    if (this.enemy.nexusHp <= 0) {
      this.enemy.nexusHp = 0;
      this.winner = 'player';
      this.screen = 'GAME_OVER';
      if (!this.pvpMode) tacticalAudio.playVictory(true);
      this.emitSnapshot();
      return;
    }
    if (this.player.nexusHp <= 0) {
      this.player.nexusHp = 0;
      this.winner = 'enemy';
      this.screen = 'GAME_OVER';
      if (!this.pvpMode) tacticalAudio.playVictory(false);
      this.emitSnapshot();
      return;
    }

    this.snapshotTimer += rawDt;
    if (this.snapshotTimer >= 0.1) {
      this.snapshotTimer = 0;
      this.emitSnapshot();
    }
  }

  private updateResourceMining(dt: number, team: 'player' | 'enemy') {
    const state = team === 'player' ? this.player : this.enemy;
    const nexusPos = team === 'player' ? PLAYER_NEXUS_POS : ENEMY_NEXUS_POS;
    const paceMult = this.mapMode === 'simple' ? SIMPLE_ECON_PACE_MULT : 1.0;
    const diffMult = this.getAiMiningMultiplier(team) * paceMult;

    // Home Nexus finite mineral reserve (distance-scaled enemy harassment + Nexus extra-plating penalty if broken!)
    state.nexusHarassTimer = Math.max(0, state.nexusHarassTimer - dt);
    const nxHarass = this.evaluateMineHarass(team, nexusPos.x, nexusPos.y);
    state.nexusHarassState = nxHarass.state;
    state.nexusHarassEffPermille = nxHarass.effPermille;
    if (state.nexusGoldReserve > 0) {
      const harassEff = nxHarass.effPermille / 1000;
      const platingEff = state.nexusPlatingBroken ? NEXUS_PLATING_BROKEN_MINE_EFF_PERMILLE / 1000 : 1;
      const rate = (ECON_BASE_MINE_RATE[state.econLevel] ?? 6.8) * harassEff * platingEff * diffMult;
      const mined = Math.min(state.nexusGoldReserve, rate * dt);
      state.nexusGoldReserve -= mined;
      state.gold += mined;
      if (state.nexusGoldReserve <= 0) {
        if (team === 'player' && !this.warnedNexusDepleted) {
          this.warnedNexusDepleted = true;
          this.pushIntelFor('player', '資源枯竭：主堡金礦脈已採盡！請靠外拓防禦塔礦區與野區富礦維持經濟！', 'critical');
        } else if (team === 'enemy' && !this.enemyWarnedNexusDepleted) {
          this.enemyWarnedNexusDepleted = true;
          this.pushIntelFor('enemy', '資源枯竭：主堡金礦脈已採盡！請靠外拓防禦塔礦區與野區富礦維持經濟！', 'critical');
        }
      }
    } else {
      state.gold += 2.0 * dt * diffMult;
    }

    // Standing completed towers mine their own finite Sector Gold Vein
    // Mining CONTINUES NORMALLY while upgrading (only paused during initial construction), scaled linearly by enemy proximity!
    const towerMult = (ECON_TOWER_BONUS_MULT[state.econLevel] ?? 1) * diffMult;
    for (const pad of this.pads) {
      if (pad.team !== team) continue;
      pad.harassTimer = Math.max(0, pad.harassTimer - dt);
      if (pad.towerType !== null && !pad.building && pad.hp > 0 && pad.goldReserve > 0) {
        const padHarass = this.evaluateMineHarass(team, pad.x, pad.y);
        pad.harassState = padHarass.state;
        pad.harassEffPermille = padHarass.effPermille;
        const eff = padHarass.effPermille / 1000;
        if (eff > 0) {
          const basePadRate = pad.slot === 'outer' ? OUTER_PAD_BASE_MINE_RATE : INNER_PAD_BASE_MINE_RATE;
          const econTowerBase =
            pad.towerType === 'econ_tower' ? (ECON_TOWER_MINING_MULT_BY_LV[pad.combatLevel] ?? 1.0) : 1.0;
          const padMiningBonus = 1 + pad.miningLevel * TOWER_MINING_UPGRADE_BONUS;
          const mined = Math.min(pad.goldReserve, basePadRate * econTowerBase * padMiningBonus * towerMult * eff * dt);
          pad.goldReserve -= mined;
          state.gold += mined;
        }
      } else {
        pad.harassState = 'ok';
        pad.harassEffPermille = 1000;
      }
    }

    // Built Gas Extractors continuously extract gas (uninterrupted during Lv.2-3 upgrades, scaled by enemy proximity harassment)
    for (const ext of this.extractors) {
      if (ext.team !== team) continue;
      if (ext.built && ext.hp > 0 && ext.level >= 1) {
        const extHarass = this.evaluateMineHarass(team, ext.x, ext.y);
        ext.harassState = extHarass.state;
        ext.harassEffPermille = extHarass.effPermille;
        const eff = extHarass.effPermille / 1000;
        const baseRate = GAS_EXTRACTOR_LEVELS[ext.level as 1 | 2 | 3].ratePerSec;
        state.gas += baseRate * eff * diffMult * dt;
      } else {
        ext.harassState = 'ok';
        ext.harassEffPermille = 1000;
      }
    }

    // Jungle Rich Crystal Vein (scales with Mining Tech & distance-scaled enemy harassment!)
    const jungleTechScale = 0.85 + state.econLevel * 0.08;
    for (const obj of this.objectives) {
      if (obj.kind === 'crystal_vein' && obj.owner === team && obj.goldReserve > 0) {
        const veinHarass = this.evaluateMineHarass(team, obj.x, obj.y);
        obj.harassState = veinHarass.state;
        obj.harassEffPermille = veinHarass.effPermille;
        const eff = veinHarass.effPermille / 1000;
        const mined = Math.min(obj.goldReserve, 8.5 * jungleTechScale * eff * diffMult * dt);
        obj.goldReserve -= mined;
        state.gold += mined;
      } else if (obj.kind === 'crystal_vein' && obj.owner === 'neutral') {
        obj.harassState = 'ok';
        obj.harassEffPermille = 1000;
      }
    }
  }

  private updateTeamQueues(dt: number, team: 'player' | 'enemy') {
    const state = team === 'player' ? this.player : this.enemy;
    const nexusPos = team === 'player' ? PLAYER_NEXUS_POS : ENEMY_NEXUS_POS;

    // 1. Parallel per-unit training cooldowns (each unit type ticks down independently!)
    for (let i = state.trainingQueue.length - 1; i >= 0; i--) {
      const ord = state.trainingQueue[i];
      ord.remaining -= dt;
      if (ord.remaining <= 0) {
        state.trainingQueue.splice(i, 1);
        const def = FACTIONS[state.faction].units[ord.unitIndex];
        if (def) {
          const batches = ord.multiplier ?? 1;
          for (let b = 0; b < batches; b++) {
            this.spawnUnitSquad(team, def, ord.lane, false, b);
          }
          if (team === 'player' && batches >= 2) {
            this.addFloatingText(nexusPos.x + 28, nexusPos.y - 34, `${def.name} ×${batches} 批次出擊！`, '#FDE047');
          }
        }
      }
    }

    // 2. Parallel Active Researches (Completed Tech Towers boost research speed!)
    const { researchRateBonus } = this.getTechTowerBonuses(team);
    const resDt = dt * (1 + researchRateBonus);
    for (let i = state.activeResearches.length - 1; i >= 0; i--) {
      const res = state.activeResearches[i];
      res.remaining -= resDt;
      if (res.remaining <= 0) {
        state.activeResearches.splice(i, 1);

        if (res.kind === 'econ') {
          state.econLevel++;
          if (team === 'player') {
            if (!this.pvpMode) tacticalAudio.playResearchDone();
            this.addFloatingText(nexusPos.x, nexusPos.y - 52, `採礦 Lv.${state.econLevel} 完成`, '#FBBF24');
          }
        } else if (res.kind === 'tech_tier') {
          state.techTier = Math.min(3, state.techTier + 1) as 2 | 3;
          // Global Tech Tier (T2/T3) boosts all standing towers' HP and weapon damage!
          for (const pad of this.pads) {
            if (pad.team === team && pad.towerType && !pad.building && pad.combatLevel >= 1) {
              const prevMaxFp = Math.max(1, pad.maxHpFp);
              this.applyTowerStats(pad, pad.towerType, pad.combatLevel as 1 | 2 | 3, pad.miningLevel, pad.techLevel);
              const hpGainFp = Math.max(0, pad.maxHpFp - prevMaxFp);
              pad.hpFp = Math.min(pad.maxHpFp, pad.hpFp + hpGainFp);
              pad.hp = Math.ceil(pad.hpFp / FP_SCALE);
              if (pad.upgradeStack.length > 0 && pad.maxHpFp > prevMaxFp) {
                for (const entry of pad.upgradeStack) {
                  entry.thresholdHpFp = Math.round((entry.thresholdHpFp * pad.maxHpFp) / prevMaxFp);
                }
              }
            }
          }
          if (team === 'player') {
            if (!this.pvpMode) tacticalAudio.playResearchDone();
            this.spawnRingParticle(nexusPos.x, nexusPos.y, '#60A5FA', 95);
            this.addFloatingText(nexusPos.x, nexusPos.y - 58, `科技 T${state.techTier} 完成 (全塔血量/傷害強化)`, '#60A5FA');
          }
        } else if (res.kind === 'nexus_repair') {
          const baseHpFp = toFp(state.nexusBaseHp);
          const platingFp = toFp(state.nexusPlatingHp);
          state.nexusPlatingThresholdFp = Math.min(baseHpFp, Math.max(1, state.nexusHpFp));
          state.nexusHpFp = Math.min(state.nexusMaxHpFp, state.nexusHpFp + platingFp);
          state.nexusHp = Math.ceil(state.nexusHpFp / FP_SCALE);
          state.nexusPlatingBroken = false;
          this.spawnRingParticle(nexusPos.x, nexusPos.y, '#38BDF8', 88);
          this.addFloatingText(nexusPos.x, nexusPos.y - 52, `主堡外甲修復 (+${state.nexusPlatingHp}HP · 主礦100%)`, '#38BDF8');
          if (team === 'player' && !this.pvpMode) tacticalAudio.playBuildDone();
        } else if (
          res.kind === 'armory_A' ||
          res.kind === 'armory_B' ||
          res.kind === 'armory_C' ||
          res.kind === 'armory_D' ||
          res.kind === 'armory_E' ||
          res.kind === 'armory_F'
        ) {
          const trackMap: Record<string, ArmoryTrackId> = {
            armory_A: 'trackA',
            armory_B: 'trackB',
            armory_C: 'trackC',
            armory_D: 'trackD',
            armory_E: 'trackE',
            armory_F: 'trackF',
          };
          const track = trackMap[res.kind];
          state.armoryLevels[track] = (state.armoryLevels[track] ?? 0) + 1;
          this.refreshTeamUnits(team);
          if (team === 'player') {
            if (!this.pvpMode) tacticalAudio.playResearchDone();
            this.addFloatingText(nexusPos.x, nexusPos.y - 54, `${res.label} 完成`, '#34D399');
          }
        } else if (res.kind === 'special_tech_1' || res.kind === 'special_tech_2') {
          const slot = res.kind === 'special_tech_1' ? 0 : 1;
          state.specialTechLevels[slot] = (state.specialTechLevels[slot] ?? 0) + 1;
          state.specialTechsDone[slot] = state.specialTechLevels[slot] >= 1;
          this.refreshTeamUnits(team);
          if (slot === 1) {
            for (const pad of this.pads) {
              if (pad.team === team && pad.towerType && !pad.building && pad.combatLevel >= 1) {
                this.applyTowerStats(pad, pad.towerType, pad.combatLevel as 1 | 2 | 3, pad.miningLevel, pad.techLevel);
              }
            }
          }
          if (this.isLocalControlled(team)) {
            tacticalAudio.playEventHorn();
            this.spawnRingParticle(nexusPos.x, nexusPos.y, '#34D399', 110);
            const label =
              slot === 0
                ? state.specialTechLevels[0] >= 2
                  ? state.faction === 'dawn'
                    ? '折躍護盾超載 II：盾甲+1 · 護盾+25%！'
                    : '強化 II 完成：全生物最大生命 +10！'
                  : `主動技 [K] ${FACTIONS[state.faction].specialTechs[0].shortName} 解鎖！`
                : `專屬科技：${res.label}`;
            this.addFloatingText(nexusPos.x, nexusPos.y - 60, label, '#6EE7B7');
          }
        }
        if (this.isLocalControlled(team)) this.emitSnapshot();
      }
    }
  }

  private updateConstruction(dt: number) {
    const dtMs = dtToFixedMs(dt);
    for (const pad of this.pads) {
      if (pad.building && pad.pendingTowerType) {
        const def = TOWER_DEFS[pad.pendingTowerType];
        pad.buildRemaining -= dt;
        const totalMs = Math.max(100, Math.round(pad.buildTotal * 1000));
        const hpGainFp = Math.trunc((pad.maxHpFp * 750 * dtMs) / (1000 * totalMs));
        pad.hpFp = Math.min(pad.maxHpFp, pad.hpFp + hpGainFp);
        pad.hp = Math.ceil(pad.hpFp / FP_SCALE);
        if (pad.buildRemaining <= 0) {
          const tType = pad.pendingTowerType;
          pad.pendingTowerType = null;
          pad.building = false;
          pad.upgradeStack = [];
          this.applyTowerStats(pad, tType, 1, 0, 0);
          const minDoneHpFp = Math.round((pad.maxHpFp * 850) / 1000);
          pad.hpFp = Math.min(pad.maxHpFp, Math.max(pad.hpFp, minDoneHpFp));
          pad.hp = Math.ceil(pad.hpFp / FP_SCALE);
          pad.attackCooldownMs = 200;
          if (pad.team) {
            const capturedEnemy = pad.homeSide !== pad.team;
            const oppTeam: 'player' | 'enemy' = pad.team === 'player' ? 'enemy' : 'player';
            this.spawnRingParticle(pad.x, pad.y, capturedEnemy ? '#2DD4BF' : '#60A5FA', capturedEnemy ? 58 : 48);
            this.addFloatingText(
              pad.x,
              pad.y - 24,
              capturedEnemy ? `佔領敵區！${def.name}開採敵礦` : `${def.name} 完工`,
              capturedEnemy ? '#5EEAD4' : '#93C5FD'
            );
            if (capturedEnemy) {
              this.pushIntelFor(
                pad.team,
                `戰區佔領：成功奪取敵方${LANE_SHORT_NAMES[pad.lane]}塔基，開始開採其剩餘金礦！`,
                'info'
              );
              this.pushIntelFor(
                oppTeam,
                `警報：敵軍已佔領我方${LANE_SHORT_NAMES[pad.lane]}塔基並正在吸取我方礦脈！`,
                'critical'
              );
            }
            if (pad.team === 'player' && !this.pvpMode) tacticalAudio.playBuildDone();
          }
        }
      } else if (pad.upgrading && pad.towerType) {
        pad.buildRemaining -= dt;
        if (pad.buildRemaining <= 0) {
          const mode = pad.pendingUpgradeMode ?? 'combat';
          pad.pendingUpgradeMode = null;
          pad.upgrading = false;
          const prevMaxFp = pad.maxHpFp;
          const thresholdHpFp = Math.min(prevMaxFp, Math.max(1, pad.hpFp));
          const nextCombat = (
            mode === 'combat' ? Math.min(3, Math.max(1, pad.combatLevel) + 1) : Math.max(1, pad.combatLevel)
          ) as 1 | 2 | 3;
          const nextMining = (
            mode === 'mining' ? Math.min(2, pad.miningLevel + 1) : pad.miningLevel
          ) as 0 | 1 | 2;
          const nextTech = (
            mode === 'tech' ? Math.min(2, pad.techLevel + 1) : pad.techLevel
          ) as 0 | 1 | 2;
          pad.upgradeStack.push({ mode, thresholdHpFp });
          this.applyTowerStats(pad, pad.towerType, nextCombat, nextMining, nextTech);
          pad.hpFp = Math.min(pad.maxHpFp, pad.hpFp + Math.max(0, pad.maxHpFp - prevMaxFp));
          pad.hp = Math.ceil(pad.hpFp / FP_SCALE);
          if (pad.team === 'player') {
            if (!this.pvpMode) tacticalAudio.playBuildDone();
            const col = mode === 'mining' ? '#FBBF24' : mode === 'tech' ? '#C084FC' : '#FCD34D';
            this.spawnRingParticle(pad.x, pad.y, col, pad.level === 3 ? 64 : 52);
            const txt =
              mode === 'mining'
                ? `${TOWER_DEFS[pad.towerType].shortLabel} 擴礦+${pad.miningLevel * 45}%`
                : mode === 'tech'
                ? nextTech === 1
                  ? `${TOWER_DEFS[pad.towerType].shortLabel} 科技(反隱+CD減免)`
                  : `${TOWER_DEFS[pad.towerType].shortLabel} 科技II(+8傷+CD)`
                : `${TOWER_DEFS[pad.towerType].name} 戰Lv.${nextCombat}`;
            this.addFloatingText(pad.x, pad.y - 24, txt, col);
          }
        }
      }
    }

    for (const d of this.depots) {
      d.hitFlash = Math.max(0, d.hitFlash - dt * 4.5);
      if (d.building) {
        d.buildRemaining -= dt;
        const totalMs = Math.max(100, Math.round(d.buildTotal * 1000));
        const hpGainFp = Math.trunc((d.maxHpFp * 750 * dtMs) / (1000 * totalMs));
        d.hpFp = Math.min(d.maxHpFp, d.hpFp + hpGainFp);
        d.hp = Math.ceil(d.hpFp / FP_SCALE);
        if (d.buildRemaining <= 0) {
          d.building = false;
          d.built = true;
          d.hpFp = d.maxHpFp;
          d.hp = d.maxHp;
          if (d.team === 'player') {
            if (!this.pvpMode) tacticalAudio.playBuildDone();
            this.spawnRingParticle(d.x, d.y, '#34D399', 42);
            this.addFloatingText(d.x, d.y - 22, `補給站完工 (+${SUPPLY_DEPOT_BONUS}人口)`, '#6EE7B7');
          }
        }
      }
    }

    for (const bk of this.barracks) {
      bk.hitFlash = Math.max(0, bk.hitFlash - dt * 4.5);
      if (bk.building) {
        bk.buildRemaining -= dt;
        // Only ramp HP 25%->100% during initial construction (Lv.0->1); upgrades grant extra HP upon completion (matching Towers)
        if (!bk.built) {
          const totalMs = Math.max(100, Math.round(bk.buildTotal * 1000));
          const hpGainFp = Math.trunc((bk.maxHpFp * 750 * dtMs) / (1000 * totalMs));
          bk.hpFp = Math.min(bk.maxHpFp, bk.hpFp + hpGainFp);
          bk.hp = Math.ceil(bk.hpFp / FP_SCALE);
        }
        if (bk.buildRemaining <= 0) {
          bk.building = false;
          bk.paidGold = 0;
          const def = BARRACKS_DEFS[bk.tier];
          const next = getBarracksNextUpgrade(bk.tier, bk.level);
          if (next) {
            const wasBuilt = bk.built;
            const prevMaxFp = bk.maxHpFp;
            bk.built = true;
            bk.level = next.nextLevel;
            bk.maxHp = next.targetHp;
            bk.maxHpFp = toFp(next.targetHp);
            if (!wasBuilt) {
              bk.upgradeThresholdsFp = [];
              bk.hpFp = bk.maxHpFp;
            } else {
              const thresholdHpFp = Math.min(prevMaxFp, Math.max(1, bk.hpFp));
              bk.upgradeThresholdsFp.push(thresholdHpFp);
              bk.hpFp = Math.min(bk.maxHpFp, bk.hpFp + Math.max(0, bk.maxHpFp - prevMaxFp));
            }
            bk.hp = Math.ceil(bk.hpFp / FP_SCALE);
            if (bk.team === 'player') {
              if (!this.pvpMode) tacticalAudio.playBuildDone();
              const col =
                bk.level >= 4 ? '#F472B6' : bk.level === 3 ? '#38BDF8' : bk.level === 2 ? '#FBBF24' : '#FDE68A';
              this.spawnRingParticle(bk.x, bk.y, col, 40 + bk.level * 7);
              const unlockedUnit = FACTIONS[this.player.faction].units.find(
                (u) => u.requiresBarracksTier === bk.tier && (u.requiresBarracksLevel ?? 1) === bk.level
              );
              const unlockTag = unlockedUnit
                ? `（解鎖${unlockedUnit.name}[${unlockedUnit.hotkey}]${bk.level >= 2 ? `·同時${next.concurrentSlots}組` : ''}）`
                : bk.level === 1
                ? `（T${bk.tier}營完工）`
                : `（${def.hotkeysLabel} 同時${next.concurrentSlots}組）`;
              this.addFloatingText(bk.x, bk.y - 24, `${def.shortName} Lv.${bk.level}${unlockTag}`, col);
              this.pushIntelFor(
                'player',
                bk.level === 1
                  ? `【${def.name} Lv.1】完工！續升 Lv.2–4 可同時重複產 2/3/4 組兵！`
                  : `【${def.name} Lv.${bk.level}】完工！${def.hotkeysLabel} 每兵種可同時重複並行生產 ${next.concurrentSlots} 組！`,
                'info'
              );
              this.emitSnapshot();
            }
          }
        }
      }
    }

    // Armory Prerequisite Buildings (Bio Lab 30s / Mech Bay 32s; tutorial accelerates slightly for smooth lesson flow)
    const armoryDt = this.tutorialMode ? dt * 1.45 : dt;
    const armoryDtMs = dtToFixedMs(armoryDt);
    for (const arm of this.armories) {
      arm.hitFlash = Math.max(0, arm.hitFlash - dt * 4.5);
      if (arm.building) {
        arm.buildRemaining -= armoryDt;
        const totalMs = Math.max(100, Math.round(arm.buildTotal * 1000));
        const hpGainFp = Math.trunc((arm.maxHpFp * 750 * armoryDtMs) / (1000 * totalMs));
        arm.hpFp = Math.min(arm.maxHpFp, arm.hpFp + hpGainFp);
        arm.hp = Math.ceil(arm.hpFp / FP_SCALE);
        if (arm.buildRemaining <= 0) {
          arm.building = false;
          arm.built = true;
          arm.paidGold = 0;
          arm.hpFp = arm.maxHpFp;
          arm.hp = arm.maxHp;
          const def = ARMORY_BUILDING_DEFS[arm.kind];
          if (this.isLocalControlled(arm.team)) {
            tacticalAudio.playBuildDone();
            this.spawnRingParticle(arm.x, arm.y, arm.kind === 'bio_lab' ? '#34D399' : '#F59E0B', 44);
            this.addFloatingText(arm.x, arm.y - 24, `${def.name}完工！`, arm.kind === 'bio_lab' ? '#6EE7B7' : '#FCD34D');
            this.pushIntelFor(arm.team, `【${def.name}】完工！已解鎖對應軍械攻防升級！`, 'info');
            this.emitSnapshot();
          }
        }
      }
    }

    // Gas Extractors (Lv.1..3)
    for (const ext of this.extractors) {
      ext.hitFlash = Math.max(0, ext.hitFlash - dt * 4.5);
      if (ext.building || ext.upgrading) {
        ext.buildRemaining -= dt;
        if (ext.building && !ext.built) {
          const totalMs = Math.max(100, Math.round(ext.buildTotal * 1000));
          const hpGainFp = Math.trunc((ext.maxHpFp * 750 * dtMs) / (1000 * totalMs));
          ext.hpFp = Math.min(ext.maxHpFp, ext.hpFp + hpGainFp);
          ext.hp = Math.ceil(ext.hpFp / FP_SCALE);
        }
        if (ext.buildRemaining <= 0) {
          const wasBuilt = ext.built;
          ext.building = false;
          ext.upgrading = false;
          ext.paidGold = 0;
          const next = getGasExtractorNextUpgrade(ext.level);
          if (next) {
            const prevMaxFp = ext.maxHpFp;
            ext.built = true;
            ext.level = next.nextLevel;
            ext.maxHp = next.targetHp;
            ext.maxHpFp = toFp(next.targetHp);
            if (!wasBuilt) {
              ext.upgradeThresholdsFp = [];
              ext.hpFp = ext.maxHpFp;
            } else {
              const thresholdHpFp = Math.min(prevMaxFp, Math.max(1, ext.hpFp));
              ext.upgradeThresholdsFp.push(thresholdHpFp);
              ext.hpFp = Math.min(ext.maxHpFp, ext.hpFp + Math.max(0, ext.maxHpFp - prevMaxFp));
            }
            ext.hp = Math.ceil(ext.hpFp / FP_SCALE);
            if (ext.team && this.isLocalControlled(ext.team)) {
              tacticalAudio.playBuildDone();
              this.spawnRingParticle(ext.x, ext.y, '#2DD4BF', 38 + ext.level * 6);
              this.addFloatingText(
                ext.x,
                ext.y - 22,
                `瓦斯場 Lv.${ext.level} (+${next.ratePerSec}氣/s)`,
                '#5EEAD4'
              );
              this.emitSnapshot();
            }
          }
        }
      }
    }
  }

  private updateArtilleryStrikes(dt: number) {
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const s = this.strikes[i];
      s.waveTimer -= dt;
      if (s.waveTimer <= 0) {
        s.wavesLeft--;
        s.waveTimer = 0.55;
        const ox = s.x + (Math.random() - 0.5) * 24;
        const oy = s.y + (Math.random() - 0.5) * 24;

        this.spawnRingParticle(ox, oy, '#FB923C', s.radius);
        this.spawnParticles(ox, oy, '#FDBA74', 15, 110, 3.8);
        this.addShake(5.0, 0.18);
        if (!this.pvpMode && this.isPointVisibleTo('player', ox, oy)) {
          tacticalAudio.playExplosion();
        }

        const strikeSpec: WeaponAttackSpecFp = {
          baseDamageFp: s.damageFp,
          attackUpgradeLevel: 0,
          damagePerUpgradeFp: 0,
          attackCount: 1,
          bonusVsTagFp: s.bonusVsTagFp,
          bonusPerUpgradeVsTagFp: {},
        };

        const enemyTeam = s.team === 'player' ? 'enemy' : 'player';
        // [F] Orbital Artillery deals FRIENDLY FIRE to ALL units inside blast radius!
        for (const u of this.units) {
          if (u.hpFp > 0 && dist(u.x, u.y, ox, oy) <= s.radius) {
            this.applyDamageToUnit(u, strikeSpec, s.team, 0);
          }
        }
        for (const pad of this.pads) {
          if (pad.team === enemyTeam && (pad.towerType || pad.building) && pad.hpFp > 0 && dist(pad.x, pad.y, ox, oy) <= s.radius) {
            this.applyDamageToPad(pad, strikeSpec, s.team);
          }
        }
        for (const bk of this.barracks) {
          if (bk.team === enemyTeam && (bk.built || bk.building) && bk.hpFp > 0 && dist(bk.x, bk.y, ox, oy) <= s.radius) {
            this.applyDamageToBarracks(bk, strikeSpec, s.team);
          }
        }
        for (const arm of this.armories) {
          if (arm.team === enemyTeam && (arm.built || arm.building) && arm.hpFp > 0 && dist(arm.x, arm.y, ox, oy) <= s.radius) {
            this.applyDamageToArmory(arm, strikeSpec, s.team);
          }
        }
        for (const ext of this.extractors) {
          if (ext.team === enemyTeam && (ext.built || ext.building) && ext.hpFp > 0 && dist(ext.x, ext.y, ox, oy) <= s.radius) {
            this.applyDamageToExtractor(ext, strikeSpec, s.team);
          }
        }
        for (const obj of this.objectives) {
          if (obj.kind === 'barricade' && !obj.cleared && dist(obj.x, obj.y, ox, oy) <= s.radius) {
            this.damageBarricade(obj, strikeSpec, s.team);
          }
        }

        if (s.wavesLeft <= 0) this.strikes.splice(i, 1);
      }
    }
  }

  private updateSporeDrops(dt: number) {
    for (let i = this.sporeDrops.length - 1; i >= 0; i--) {
      const drop = this.sporeDrops[i];
      drop.timeRemaining -= dt;
      if (drop.timeRemaining <= 0) {
        this.sporeDrops.splice(i, 1);

        this.spawnRingParticle(drop.x, drop.y, '#10B981', drop.radius);
        this.spawnParticles(drop.x, drop.y, '#6EE7B7', 16, 100, 3.6);
        this.addShake(4.2, 0.16);
        if (this.isPointVisibleTo('player', drop.x, drop.y) || drop.team === 'player') {
          tacticalAudio.playExplosion();
        }

        const teamState = drop.team === 'player' ? this.player : this.enemy;
        const buffBonusFp = teamState.globalAttackBuffTimer > 0 ? toFp(2) : 0;
        const sporeSpec: WeaponAttackSpecFp = {
          baseDamageFp: toFp(14) + buffBonusFp,
          attackUpgradeLevel: 0,
          damagePerUpgradeFp: 0,
          attackCount: 1,
          bonusVsTagFp: toTagBonusFp({ Light: 8 }),
          bonusPerUpgradeVsTagFp: {},
        };

        // [F] Spore Drop landing impact deals FRIENDLY FIRE to ALL units inside blast radius!
        for (const u of this.units) {
          if (u.hpFp > 0 && dist(u.x, u.y, drop.x, drop.y) <= drop.radius) {
            this.applyDamageToUnit(u, sporeSpec, drop.team, 0.35);
          }
        }

        const lingDef = ALL_UNITS_BY_ID['swarm_ling'];
        const econGasUps = Math.max(0, teamState.econLevel - 1) + this.getTeamGasUpgradeCount(drop.team);
        const lingCount = Math.min(8, 3 + Math.floor(econGasUps / 2));
        if (lingDef) {
          for (let k = 0; k < lingCount; k++) {
            const ang = (Math.PI * 2 * k) / lingCount;
            const dx = Math.cos(ang) * 16;
            const dy = Math.sin(ang) * 15;
            this.units.push(
              this.createUnitFromDef(drop.team, lingDef, drop.lane, drop.x + dx, drop.y + dy, dy * 0.7)
            );
            teamState.unitsTrained++;
          }
        }
      }
    }
  }

  // Dynamic Jungle Events:
  // • Standard Mode: 6 diverse events whose values & strategic impact escalate smoothly with match time (1.0× → 3.0×)!
  // • Simple Mode: Beginner-friendly cadence (much rarer) & ONLY 2 intuitive events (Supply Drop / Boss Colossus).
  private updateDynamicEvents(dt: number) {
    if (this.activeEvent) {
      this.activeEvent.timeRemaining -= dt;
      if (
        (this.activeEvent.kind === 'boss_colossus' ||
          this.activeEvent.kind === 'supply_drop' ||
          this.activeEvent.kind === 'vein_overdrive' ||
          this.activeEvent.kind === 'merc_convoy') &&
        this.activeEvent.entityId
      ) {
        const stillAlive = this.units.some((u) => u.id === this.activeEvent?.entityId);
        if (!stillAlive) {
          this.activeEvent = null;
          this.nextEventCountdown = this.getNextEventCooldown();
          return;
        }
      }
      if (this.activeEvent.kind === 'aether_rift') {
        const ev = this.activeEvent;
        const capturer = this.units.find(
          (u) => (u.team === 'player' || u.team === 'enemy') && u.hp > 0 && dist(u.x, u.y, ev.x, ev.y) <= 60
        );
        if (capturer && (capturer.team === 'player' || capturer.team === 'enemy')) {
          const st = capturer.team === 'player' ? this.player : this.enemy;
          const oppTeam: 'player' | 'enemy' = capturer.team === 'player' ? 'enemy' : 'player';
          const scale = ev.powerScale ?? this.getEventScale();
          const goldGain = Math.round(145 * scale);
          const buffDur = Math.round(22 + 9 * (scale - 1));
          st.globalAttackBuffTimer = Math.max(st.globalAttackBuffTimer, buffDur);
          st.gold += goldGain;
          st.objectivesClaimed++;
          // Escalating healing/shield surge for all friendly units on the battlefield!
          const healPermille = Math.min(350, Math.round(160 * scale));
          const healPct = healPermille / 1000;
          for (const u of this.units) {
            if (u.team === capturer.team && u.hpFp > 0) {
              u.hpFp = Math.min(u.maxHpFp, u.hpFp + Math.trunc((u.maxHpFp * healPermille) / 1000));
              u.hp = Math.ceil(u.hpFp / FP_SCALE);
              if (u.maxShieldFp > 0) {
                u.shieldFp = Math.min(u.maxShieldFp, u.shieldFp + Math.trunc((u.maxShieldFp * healPermille) / 1000));
                u.shield = Math.ceil(u.shieldFp / FP_SCALE);
              }
            }
          }
          this.spawnRingParticle(ev.x, ev.y, '#2DD4BF', 130);
          if (!this.pvpMode) tacticalAudio.playEventHorn();
          this.pushIntelFor(
            capturer.team,
            `奪取能量裂隙 (×${scale.toFixed(1)})！+${goldGain}G、全軍回血 ${Math.round(healPct * 100)}% 並獲 ${buffDur} 秒強化！`,
            'info'
          );
          this.pushIntelFor(oppTeam, `警報：敵軍搶先奪取野區能量裂隙，敵方全軍大幅強化！`, 'critical');
          this.activeEvent = null;
          this.nextEventCountdown = this.getNextEventCooldown();
          return;
        }
      }
      if (this.activeEvent.timeRemaining <= 0) {
        if (this.activeEvent.kind === 'fog_storm') {
          // Reward whoever holds a central jungle objective during the storm!
          const scale = this.activeEvent.powerScale ?? 1.0;
          const bonusGold = Math.round(115 * scale);
          const holder = this.objectives.find(
            (o) =>
              o.zone === 'jungle' &&
              (o.kind === 'crystal_vein' || o.kind === 'ancient_beacon') &&
              (o.owner === 'player' || o.owner === 'enemy')
          )?.owner;
          if (holder === 'player' || holder === 'enemy') {
            const st = holder === 'player' ? this.player : this.enemy;
            st.gold += bonusGold;
            this.pushIntelFor(holder, `迷霧磁暴結算：因掌控野區據點額外獲 +${bonusGold}G 戰術紅利！`, 'info');
          }
        }
        this.activeEvent = null;
        this.nextEventCountdown = this.getNextEventCooldown();
      }
      return;
    }

    this.nextEventCountdown -= dt;
    if (this.nextEventCountdown <= 0) {
      const isSimple = this.mapMode === 'simple';
      const scale = this.getEventScale();
      const scaleTag = `×${scale.toFixed(1)}`;
      const isEarlyPhase = this.elapsed < (isSimple ? 210 : 165);

      let kinds: DynamicEventKind[];
      if (isSimple) {
        // Simple Mode: ONLY 2 easy-to-understand events for beginners!
        kinds = isEarlyPhase ? ['supply_drop'] : ['supply_drop', 'boss_colossus'];
      } else {
        // Standard Mode: Rich 6-event pool that unlocks Boss & Mercenaries as match escalates!
        kinds = isEarlyPhase
          ? ['supply_drop', 'aether_rift', 'vein_overdrive', 'fog_storm']
          : ['boss_colossus', 'supply_drop', 'aether_rift', 'vein_overdrive', 'merc_convoy', 'fog_storm'];
      }

      const chosenKind = kinds[Math.floor(Math.random() * kinds.length)];
      const jungleZone: JungleZoneId = isSimple ? 'center' : Math.random() < 0.5 ? 'upper' : 'lower';
      const zoneLabel =
        jungleZone === 'center' ? '中央野區' : jungleZone === 'upper' ? '上側野區' : '下側野區';
      const pos = JUNGLE_CENTERS[jungleZone];
      const spawnX = pos.x + (Math.random() - 0.5) * 140;
      const spawnY = pos.y + (Math.random() - 0.5) * (isSimple ? 90 : 40);

      if (!this.pvpMode) tacticalAudio.playEventHorn();

      if (chosenKind === 'boss_colossus') {
        const bossId = this.spawnBossColossus(jungleZone, scale);
        const bounty = Math.round(280 * scale);
        this.activeEvent = {
          id: this.nextEventId++,
          kind: chosenKind,
          jungleZone,
          x: pos.x,
          y: pos.y,
          title: `${zoneLabel}：迷霧巨像 [${scaleTag}]`,
          detail: `擊殺獲 +${bounty}G 並召喚 ${scaleTag} 強化先鋒巨像破塔`,
          timeRemaining: 80,
          duration: 80,
          entityId: bossId,
          isEarlyPhase: false,
          powerScale: scale,
        };
        this.pushIntelBoth(
          `野區事件：迷霧巨像 [${scaleTag}] 現身於【${zoneLabel}】（+${bounty}G＋先鋒巨像）！`,
          `野區事件：迷霧巨像 [${scaleTag}] 現身於【${zoneLabel}】（+${bounty}G＋先鋒巨像）！`,
          'critical',
          'critical'
        );
      } else if (chosenKind === 'merc_convoy') {
        const mercId = this.spawnMercGuardian(jungleZone, spawnX, spawnY, scale);
        const bounty = Math.round(180 * scale);
        const count = scale >= 1.9 ? 3 : 2;
        this.activeEvent = {
          id: this.nextEventId++,
          kind: chosenKind,
          jungleZone,
          x: spawnX,
          y: spawnY,
          title: `${zoneLabel}：精銳傭兵裂隙 [${scaleTag}]`,
          detail: `擊敗守衛獲 +${bounty}G 並立即徵召 ${count} 支高階傭兵投入該線`,
          timeRemaining: 70,
          duration: 70,
          entityId: mercId,
          isEarlyPhase: false,
          powerScale: scale,
        };
        this.pushIntelBoth(
          `野區事件：【${zoneLabel}】出現精銳傭兵裂隙 [${scaleTag}]，擊破可即刻增援 ${count} 支精銳！`,
          `野區事件：【${zoneLabel}】出現精銳傭兵裂隙 [${scaleTag}]，擊破可即刻增援 ${count} 支精銳！`,
          'critical',
          'critical'
        );
      } else if (chosenKind === 'vein_overdrive') {
        const coreId = this.nextId++;
        const coreGold = Math.round(195 * scale);
        const refill = Math.round(650 * scale);
        const coreHp = Math.round(210 * scale);
        const coreShield = Math.round(60 * scale);
        const coreArmor = 2 + Math.floor(scale - 1);
        this.units.push({
          id: coreId,
          defId: 'overdrive_core',
          team: 'neutral',
          faction: 'neutral',
          lane: jungleZone === 'upper' ? 0 : jungleZone === 'lower' ? 2 : Math.random() < 0.5 ? 0 : 2,
          x: spawnX,
          y: spawnY,
          vx: 0,
          vy: 0,
          laneOffset: 0,
          hp: coreHp,
          maxHp: coreHp,
          shield: coreShield,
          maxShield: coreShield,
          hpFp: toFp(coreHp),
          maxHpFp: toFp(coreHp),
          shieldFp: toFp(coreShield),
          maxShieldFp: toFp(coreShield),
          armor: coreArmor,
          baseArmorFp: toFp(coreArmor),
          armorUpgradeLevel: 0,
          armorPerUpgradeFp: 0,
          baseShieldArmorFp: 0,
          shieldArmorUpgradeLevel: 0,
          shieldArmorPerUpgradeFp: 0,
          attributes: ['Armored', 'Structure'],
          armorClass: 'structure',
          domain: 'ground',
          combatRange: 'melee',
          canHitAir: false,
          damage: 0,
          baseDamageFp: 0,
          attackUpgradeLevel: 0,
          damagePerUpgradeFp: 0,
          attackCount: 1,
          attackIntervalMs: 99000,
          attackRate: 0,
          bonusVsTagFp: {},
          bonusPerUpgradeVsTagFp: {},
          range: 0,
          speed: 0,
          vision: 30,
          splashRadius: 0,
          shape: 'golem',
          cloaked: false,
          cloakTimer: 0,
          cloakMaxSec: 0,
          detector: false,
          revealTimer: 0,
          auraShield: false,
          suicidal: false,
          corrosive: false,
          spawnerInterval: 0,
          spawnTimer: 0,
          attackCooldownMs: 99000,
          attackLockMs: 0,
          hitFlash: 0,
          outOfCombatTimer: 99,
          slowTimer: 0,
          buffTimer: 0,
          hasteTimer: 0,
          stimTimer: 0,
          siegeLockTimer: 0,
          inAmbushSquad: false,
          squadDestination: null,
          jungleWaypoints: [],
          jungleTargetLane: null,
          scaleX: 1,
          scaleY: 1,
          radius: 17,
          isJungleCreep: true,
          firedRevealTimer: 0,
          provokedTimer: 0,
          bountyGold: coreGold,
          targetId: null,
        });
        this.activeEvent = {
          id: this.nextEventId++,
          kind: chosenKind,
          jungleZone,
          x: spawnX,
          y: spawnY,
          title: `${zoneLabel}：星脈黃金湧流 [${scaleTag}]`,
          detail: `擊破獲 +${coreGold}G 並為全軍礦脈補充 +${refill}G 儲量`,
          timeRemaining: 62,
          duration: 62,
          entityId: coreId,
          isEarlyPhase,
          powerScale: scale,
        };
        this.pushIntelBoth(
          `野區事件：【${zoneLabel}】星脈黃金湧流 [${scaleTag}] 爆發（+${coreGold}G 與全礦補充）！`,
          `野區事件：【${zoneLabel}】星脈黃金湧流 [${scaleTag}] 爆發（+${coreGold}G 與全礦補充）！`,
          'info',
          'info'
        );
      } else if (chosenKind === 'aether_rift') {
        const rewardGold = Math.round(145 * scale);
        const dur = Math.round(22 + 9 * (scale - 1));
        this.activeEvent = {
          id: this.nextEventId++,
          kind: chosenKind,
          jungleZone,
          x: spawnX,
          y: spawnY,
          title: `${zoneLabel}：上古能量裂隙 [${scaleTag}]`,
          detail: `率先佔領獲 +${rewardGold}G、全軍回血與 ${dur} 秒強化`,
          timeRemaining: 54,
          duration: 54,
          isEarlyPhase,
          powerScale: scale,
        };
        this.pushIntelBoth(
          `野區事件：【${zoneLabel}】出現能量裂隙 [${scaleTag}]（+${rewardGold}G＋全軍強化）！`,
          `野區事件：【${zoneLabel}】出現能量裂隙 [${scaleTag}]（+${rewardGold}G＋全軍強化）！`,
          'info',
          'info'
        );
      } else if (chosenKind === 'fog_storm') {
        const stormDur = Math.round(34 + 6 * (scale - 1));
        const bonusGold = Math.round(115 * scale);
        this.activeEvent = {
          id: this.nextEventId++,
          kind: chosenKind,
          jungleZone,
          x: pos.x,
          y: pos.y,
          title: `${zoneLabel}：迷霧磁暴 [${scaleTag}]`,
          detail: `該半場視野大幅縮減；結束時野區控點方獲 +${bonusGold}G`,
          timeRemaining: stormDur,
          duration: stormDur,
          isEarlyPhase,
          powerScale: scale,
        };
        this.pushIntelBoth(
          `野區事件：【${zoneLabel}】爆發迷霧磁暴 [${scaleTag}]，適合奇襲並爭奪結算 +${bonusGold}G！`,
          `野區事件：【${zoneLabel}】爆發迷霧磁暴 [${scaleTag}]，適合奇襲並爭奪結算 +${bonusGold}G！`,
          'warn',
          'warn'
        );
      } else {
        const crateId = this.nextId++;
        const crateGold = Math.round(170 * scale);
        const crateHp = Math.round(150 * scale);
        const crateArmor = 1 + Math.floor(scale - 1);
        this.units.push({
          id: crateId,
          defId: 'supply_crate',
          team: 'neutral',
          faction: 'neutral',
          lane: jungleZone === 'upper' ? 0 : jungleZone === 'lower' ? 2 : Math.random() < 0.5 ? 0 : 2,
          x: spawnX,
          y: spawnY,
          vx: 0,
          vy: 0,
          laneOffset: 0,
          hp: crateHp,
          maxHp: crateHp,
          shield: 0,
          maxShield: 0,
          hpFp: toFp(crateHp),
          maxHpFp: toFp(crateHp),
          shieldFp: 0,
          maxShieldFp: 0,
          armor: crateArmor,
          baseArmorFp: toFp(crateArmor),
          armorUpgradeLevel: 0,
          armorPerUpgradeFp: 0,
          baseShieldArmorFp: 0,
          shieldArmorUpgradeLevel: 0,
          shieldArmorPerUpgradeFp: 0,
          attributes: ['Armored', 'Structure'],
          armorClass: 'structure',
          domain: 'ground',
          combatRange: 'melee',
          canHitAir: false,
          damage: 0,
          baseDamageFp: 0,
          attackUpgradeLevel: 0,
          damagePerUpgradeFp: 0,
          attackCount: 1,
          attackIntervalMs: 99000,
          attackRate: 0,
          bonusVsTagFp: {},
          bonusPerUpgradeVsTagFp: {},
          range: 0,
          speed: 0,
          vision: 30,
          splashRadius: 0,
          shape: 'golem',
          cloaked: false,
          cloakTimer: 0,
          cloakMaxSec: 0,
          detector: false,
          revealTimer: 0,
          auraShield: false,
          suicidal: false,
          corrosive: false,
          spawnerInterval: 0,
          spawnTimer: 0,
          attackCooldownMs: 99000,
          attackLockMs: 0,
          hitFlash: 0,
          outOfCombatTimer: 99,
          slowTimer: 0,
          buffTimer: 0,
          hasteTimer: 0,
          stimTimer: 0,
          siegeLockTimer: 0,
          inAmbushSquad: false,
          squadDestination: null,
          jungleWaypoints: [],
          jungleTargetLane: null,
          scaleX: 1,
          scaleY: 1,
          radius: 15,
          isJungleCreep: true,
          firedRevealTimer: 0,
          provokedTimer: 0,
          bountyGold: crateGold,
          targetId: null,
        });
        this.activeEvent = {
          id: this.nextEventId++,
          kind: chosenKind,
          jungleZone,
          x: spawnX,
          y: spawnY,
          title: `${zoneLabel}：高能戰備空投 [${scaleTag}]`,
          detail: `擊破獲 +${crateGold}G 與 10 秒全軍士氣鼓舞`,
          timeRemaining: 58,
          duration: 58,
          entityId: crateId,
          isEarlyPhase,
          powerScale: scale,
        };
        this.pushIntelBoth(
          `野區事件：高能空投物資 [${scaleTag}] 墜落於【${zoneLabel}】（+${crateGold}G）！`,
          `野區事件：高能空投物資 [${scaleTag}] 墜落於【${zoneLabel}】（+${crateGold}G）！`,
          'info',
          'info'
        );
      }
      this.emitSnapshot();
    }
  }

  private findBestOrbitalCluster(
    team: 'player' | 'enemy',
    oppTeam: 'player' | 'enemy',
    myVision: Array<{ x: number; y: number; r: number; detector: boolean }>,
    minUnits: number
  ): { x: number; y: number; score: number } | null {
    const visibleOpps = this.units.filter(
      (u) => u.team === oppTeam && u.hp > 0 && u.domain === 'ground' && this.isUnitVisibleTo(team, u, myVision)
    );
    const myAllies = this.units.filter((u) => u.team === team && u.hp > 0);
    let best: { x: number; y: number; score: number } | null = null;
    for (const anchor of visibleOpps) {
      let count = 0;
      let score = 0;
      for (const other of visibleOpps) {
        if (dist(anchor.x, anchor.y, other.x, other.y) <= 95) {
          count++;
          score += other.armorClass === 'light' ? 1.35 : other.armorClass === 'siege' ? 1.5 : 1.0;
        }
      }
      // Friendly-fire safety check: avoid bombing clusters with own troops!
      let friendlyInBlast = 0;
      for (const ally of myAllies) {
        if (dist(anchor.x, anchor.y, ally.x, ally.y) <= 84) {
          friendlyInBlast++;
          score -= 1.8;
        }
      }
      if (count >= minUnits && friendlyInBlast <= 1 && score > 0.8 && (!best || score > best.score)) {
        best = { x: anchor.x, y: anchor.y, score };
      }
    }
    if (best) return best;

    // Fallback: strike a visible enemy completed tower (Artillery / Econ / Tech) if under pressure or pushing
    const visibleOppTowers = this.pads.filter(
      (p) =>
        p.team === oppTeam &&
        p.towerType !== null &&
        p.hp > 0 &&
        this.isPointVisibleTo(team, p.x, p.y, myVision)
    );
    if (visibleOppTowers.length > 0 && minUnits <= 2) {
      const prio =
        visibleOppTowers.find((p) => p.towerType === 'artillery' || p.towerType === 'econ_tower') ??
        visibleOppTowers[0];
      return { x: prio.x, y: prio.y, score: 2.5 };
    }
    return null;
  }

  private updateAIForTeam(
    team: 'player' | 'enemy',
    dt: number,
    myVision: Array<{ x: number; y: number; r: number; detector: boolean }>
  ) {
    const ai = this.aiControl[team];
    const myState = team === 'player' ? this.player : this.enemy;
    const oppTeam: 'player' | 'enemy' = team === 'player' ? 'enemy' : 'player';

    ai.decisionTimer -= dt;
    ai.scanTimer -= dt;
    ai.activeTimer -= dt;
    ai.ambushTimer -= dt;
    ai.stanceCooldown = Math.max(0, ai.stanceCooldown - dt);
    ai.bioTimingTimer = Math.max(0, ai.bioTimingTimer - dt);

    const activeLanes = this.getActiveLanes();
    const isSimple = this.mapMode === 'simple';
    const isRookie = ai.difficulty === 'rookie';
    const isCommander = ai.difficulty === 'commander';
    const isIronbound = myState.faction === 'ironbound';
    const paceScale = isSimple ? 0.78 : 1.0;

    // Detect Ironbound Bio Timing Window: every time Light Atk (trackA) or Light Def (trackD) finishes!
    if (isIronbound && ai.archetype === 'iron_bio') {
      const bioSum = (myState.armoryLevels.trackA ?? 0) + (myState.armoryLevels.trackD ?? 0);
      if (bioSum > ai.lastBioArmorySum) {
        ai.lastBioArmorySum = bioSum;
        ai.bioTimingTimer = isCommander ? 26 : isRookie ? 14 : 22;
        ai.ambushTimer = Math.min(ai.ambushTimer, 1.5);
      }
    }

    // --- 1. Periodic AI Tactical Scan [S] ---
    if (ai.scanTimer <= 0 && myState.scanCooldown <= 0) {
      const scanBase =
        ai.archetype === 'iron_turtle' || ai.archetype === 'iron_air_siege'
          ? isCommander
            ? 20
            : isRookie
            ? 36
            : 26
          : isCommander
          ? 24
          : isRookie
          ? 42
          : 31;
      ai.scanTimer = scanBase + Math.random() * 7;

      // Air/Siege & Turtle scan enemy lanes/outer pads to find weak anti-air or incoming pushes
      if (ai.archetype === 'iron_air_siege' && Math.random() < 0.75) {
        const scanLane = activeLanes[Math.floor(Math.random() * activeLanes.length)];
        const pt = pointOnLane(scanLane, team === 'player' ? 0.68 : 0.32);
        this.castScan(team, pt.x, pt.y);
      } else if (ai.archetype === 'iron_bio' && Math.random() < 0.65) {
        const jz = isSimple
          ? JUNGLE_CENTERS.center
          : Math.random() < 0.5
          ? JUNGLE_CENTERS.upper
          : JUNGLE_CENTERS.lower;
        this.castScan(team, jz.x, jz.y);
      } else if (Math.random() < 0.45) {
        const jz = isSimple
          ? JUNGLE_CENTERS.center
          : Math.random() < 0.5
          ? JUNGLE_CENTERS.upper
          : JUNGLE_CENTERS.lower;
        this.castScan(team, jz.x, jz.y);
      } else {
        const scanLane = activeLanes[Math.floor(Math.random() * activeLanes.length)];
        const progress = team === 'player' ? 0.48 + Math.random() * 0.25 : 0.27 + Math.random() * 0.25;
        const pt = pointOnLane(scanLane, progress);
        this.castScan(team, pt.x, pt.y);
      }
    }

    // --- 2. Periodic AI 4th-Lane Squad Raid [X] ---
    if (ai.ambushTimer <= 0 && myState.ambushCooldown <= 0 && myState.gold >= JUNGLE_AMBUSH_COST + (isRookie ? 85 : 35)) {
      const myMobileUnits = this.units.filter((u) => u.team === team && u.hp > 0);
      const minSquad = ai.archetype === 'iron_bio' ? 3 : 4;
      const shouldAmbush =
        ai.archetype !== 'iron_turtle' &&
        (ai.archetype !== 'iron_mech' || this.elapsed > 150) &&
        (!isRookie || Math.random() < 0.45);

      if (shouldAmbush && myMobileUnits.length >= minSquad) {
        if (this.activeEvent) {
          if (ai.archetype === 'iron_bio' || isCommander || Math.random() < 0.65) {
            this.launchAiSquadRaid(team, this.activeEvent.x, this.activeEvent.y);
            ai.ambushTimer = isCommander ? 26 : 36;
          } else {
            ai.ambushTimer = 16;
          }
        } else if (ai.archetype === 'iron_bio') {
          if (ai.bioTimingTimer > 0) {
            const flankPt = pointOnLane(ai.secondaryLane, team === 'player' ? 0.58 : 0.42);
            this.launchAiSquadRaid(team, flankPt.x, flankPt.y);
            ai.ambushTimer = isCommander ? 24 : 32;
          } else {
            const unownedObj = this.objectives.find(
              (o) => !o.cleared && (o.kind === 'crystal_vein' || o.kind === 'ancient_beacon' || o.kind === 'creep_camp') && o.owner !== team
            );
            const targetPt = unownedObj
              ? { x: unownedObj.x, y: unownedObj.y }
              : isSimple
              ? JUNGLE_CENTERS.center
              : Math.random() < 0.5
              ? JUNGLE_CENTERS.upper
              : JUNGLE_CENTERS.lower;
            this.launchAiSquadRaid(team, targetPt.x, targetPt.y);
            ai.ambushTimer = isCommander ? 28 : 38;
          }
        } else if (ai.archetype === 'iron_rush') {
          const blockedByArtillery = this.pads.some(
            (p) =>
              p.team === oppTeam &&
              p.lane === ai.primaryLane &&
              p.towerType === 'artillery' &&
              !p.building &&
              this.isPointVisibleTo(team, p.x, p.y, myVision)
          );
          if (blockedByArtillery && !isRookie) {
            const flankPt = pointOnLane(ai.secondaryLane, team === 'player' ? 0.64 : 0.36);
            this.launchAiSquadRaid(team, flankPt.x, flankPt.y);
            ai.ambushTimer = 34;
          } else {
            ai.ambushTimer = 16;
          }
        } else if (ai.archetype === 'iron_air_siege' && Math.random() < 0.55) {
          const jz = isSimple ? JUNGLE_CENTERS.center : JUNGLE_CENTERS.upper;
          this.launchAiSquadRaid(team, jz.x, jz.y);
          ai.ambushTimer = 42;
        } else {
          ai.ambushTimer = 22;
        }
      }
    }

    // --- 3. Periodic AI Faction Skill [F] (Orbital Strike for Ironbound!) ---
    if (ai.activeTimer <= 0 && myState.activeCooldown <= 0) {
      const f = FACTIONS[myState.faction];
      const reserveGold = ai.archetype === 'iron_turtle' ? 15 : isRookie ? 80 : 40;
      if (myState.gold >= f.activeCost + reserveGold) {
        if (isIronbound) {
          const minCluster = ai.archetype === 'iron_turtle' ? (isCommander ? 2 : 3) : isCommander ? 3 : 4;
          const cluster = this.findBestOrbitalCluster(team, oppTeam, myVision, minCluster);
          if (cluster) {
            this.castFactionSkill(team, cluster.x, cluster.y);
            // Turtle checks activeCooldown much faster thanks to Tech Towers!
            ai.activeTimer = ai.archetype === 'iron_turtle' ? 12 : isCommander ? 18 : isRookie ? 44 : 28;
          } else {
            ai.activeTimer = 6;
          }
        } else if (myState.faction === 'dawn') {
          // Dawn [F] has a friendly-fire core blast (75px) + outer buff (120px) — cast on enemy clusters near frontline!
          const cluster = this.findBestOrbitalCluster(team, oppTeam, myVision, isCommander ? 2 : 3);
          if (cluster) {
            this.castFactionSkill(team, cluster.x, cluster.y);
            ai.activeTimer = isRookie ? 50 : 32;
          } else {
            ai.activeTimer = 8;
          }
        } else {
          // Swarm [F] deals friendly fire on landing — aim at enemy cluster or flank away from own army!
          const cluster = this.findBestOrbitalCluster(team, oppTeam, myVision, 2);
          const targetPt = cluster
            ? { x: cluster.x, y: cluster.y }
            : this.activeEvent
            ? { x: this.activeEvent.x, y: this.activeEvent.y }
            : pointOnLane(ai.secondaryLane, team === 'player' ? 0.62 : 0.38);
          this.castFactionSkill(team, targetPt.x, targetPt.y);
          ai.activeTimer = isRookie ? 50 : 34;
        }
      }
    }

    if (ai.decisionTimer > 0) return;
    ai.decisionTimer = isCommander ? 1.35 : isRookie ? 3.55 : 2.15;

    // --- 4. Battlefield Assessment (Strictly Fog-of-War Fair!) ---
    const laneThreat: Record<LaneId, number> = { 0: 0, 1: 0, 2: 0 };
    const laneMyForce: Record<LaneId, number> = { 0: 0, 1: 0, 2: 0 };
    const laneVisibleOppAA: Record<LaneId, number> = { 0: 0, 1: 0, 2: 0 };
    const laneOppBuildingTower: Record<LaneId, boolean> = { 0: false, 1: false, 2: false };
    let oppAirCount = 0;
    let oppHeavyCount = 0;
    let myTotalUnits = 0;
    let myHeavyUnits = 0;
    let myMortarCount = 0;
    let myValkyrieCount = 0;
    let myT3Count = 0;

    for (const u of this.units) {
      if (u.hp <= 0) continue;
      if (u.team === oppTeam && this.isUnitVisibleTo(team, u, myVision)) {
        const inMyHalf = team === 'player' ? u.x < WORLD_WIDTH * 0.5 : u.x > WORLD_WIDTH * 0.5;
        laneThreat[u.lane] += (u.maxHp / 80) * (inMyHalf ? 2.15 : 1.0);
        if (u.domain === 'air') oppAirCount++;
        if (u.armorClass === 'heavy') oppHeavyCount++;
        if (u.canHitAir) laneVisibleOppAA[u.lane] += 1;
      } else if (u.team === team) {
        myTotalUnits++;
        laneMyForce[u.lane] += u.maxHp / 80;
        if (u.armorClass === 'heavy') myHeavyUnits++;
        if (u.defId === 'iron_mortar') myMortarCount++;
        if (u.defId === 'iron_valkyrie') myValkyrieCount++;
        if (u.defId === 'iron_titan' || u.defId === 'iron_gunship') myT3Count++;
      }
    }

    for (const pad of this.pads) {
      if (pad.team === oppTeam && this.isPointVisibleTo(team, pad.x, pad.y, myVision)) {
        if (pad.building) laneOppBuildingTower[pad.lane] = true;
        if (pad.towerType === 'watchtower' && !pad.building) laneVisibleOppAA[pad.lane] += 2.2;
      }
    }

    let mostThreatenedLane: LaneId = ai.primaryLane;
    let maxThreat = 0;
    for (const lane of activeLanes) {
      if (laneThreat[lane] > maxThreat) {
        maxThreat = laneThreat[lane];
        mostThreatenedLane = lane;
      }
    }

    // Air/Siege dynamically picks the lane with weakest visible Anti-Air!
    if (isIronbound && ai.archetype === 'iron_air_siege' && !isRookie && myState.techTier >= 2) {
      let bestAirLane = ai.primaryLane;
      let lowestAA = laneVisibleOppAA[ai.primaryLane];
      for (const lane of activeLanes) {
        if (laneVisibleOppAA[lane] + 0.5 < lowestAA) {
          lowestAA = laneVisibleOppAA[lane];
          bestAirLane = lane;
        }
      }
      if (bestAirLane !== ai.primaryLane) {
        ai.secondaryLane = ai.primaryLane;
        ai.primaryLane = bestAirLane;
      }
    }

    // --- 5. Strategic Lane Stance Control ---
    if (ai.stanceCooldown <= 0) {
      ai.stanceCooldown = isCommander ? 2.5 : 4.5;
      for (const lane of activeLanes) {
        let desired: LaneStance = 'push';
        if (isIronbound) {
          if (ai.archetype === 'iron_rush') {
            if (lane === ai.primaryLane) {
              const punishWindow = !isRookie && laneOppBuildingTower[lane] && laneMyForce[lane] >= 1.8;
              desired = punishWindow || (isCommander && laneMyForce[lane] >= 4.2) ? 'all_in' : 'push';
            } else {
              desired = laneThreat[lane] > 1.8 ? 'hold_tower' : 'push';
            }
          } else if (ai.archetype === 'iron_turtle') {
            const lateCounterPush = (this.elapsed > 235 * paceScale && myT3Count >= 2) || myT3Count >= 4;
            desired = lateCounterPush && lane === ai.primaryLane ? 'push' : 'hold_tower';
          } else if (ai.archetype === 'iron_air_siege') {
            if (myState.techTier < 2) {
              desired = 'hold_tower';
            } else if (lane === ai.primaryLane && (myValkyrieCount >= 1 || myMortarCount >= 1 || myT3Count >= 1)) {
              desired = 'push';
            } else {
              desired = 'hold_tower';
            }
          } else if (ai.archetype === 'iron_mech') {
            const heavyArmorySum = (myState.armoryLevels.trackB ?? 0) + (myState.armoryLevels.trackE ?? 0);
            const mechReady =
              myHeavyUnits >= (isCommander ? 4 : 5) ||
              myT3Count >= 2 ||
              (myHeavyUnits >= 3 && heavyArmorySum >= 2);
            if (!mechReady) {
              desired = maxThreat > 3.5 && lane === mostThreatenedLane ? 'defend_base' : 'hold_tower';
            } else if (lane === ai.primaryLane) {
              desired = myHeavyUnits >= 7 && !isRookie ? 'all_in' : 'push';
            } else {
              desired = 'hold_tower';
            }
          } else if (ai.archetype === 'iron_bio') {
            if (ai.bioTimingTimer > 0 && lane === ai.primaryLane) {
              desired = isRookie ? 'push' : 'all_in';
            } else if (lane === ai.primaryLane || lane === ai.secondaryLane) {
              desired = 'push';
            } else {
              desired = laneThreat[lane] > 2.4 ? 'hold_tower' : 'push';
            }
          }
        } else {
          // Graceful generic stances for Dawn / Swarm until their dedicated balance pass
          desired =
            ai.archetype === 'iron_turtle' && this.elapsed < 180 * paceScale
              ? 'hold_tower'
              : ai.archetype === 'iron_rush' && lane === ai.primaryLane && !isRookie && laneMyForce[lane] >= 3.5
              ? 'all_in'
              : 'push';
        }
        myState.laneStances[lane] = desired;
      }
    }

    // --- 6. Supply Depot & Nexus Plating Repair Management ---
    if (myState.nexusPlatingBroken && myState.gold >= NEXUS_REPAIR_COST + (isRookie ? 80 : 25)) {
      if (this.repairNexusPlating(team)) return;
    }
    const supplyMargin = ai.archetype === 'iron_bio' || ai.archetype === 'iron_rush' ? 4 : 3;
    if (this.getSupplyUsed(team) >= this.getSupplyCap(team) - supplyMargin) {
      if (this.buildSupplyDepot(team)) return;
    }

    // --- 6b. Gas Extractor Construction & Upgrades (Dual-Resource Economy) ---
    const builtExts = this.extractors.filter((e) => e.team === team && e.built && e.hp > 0);
    const busyExts = this.extractors.filter((e) => e.team === team && (e.building || e.upgrading));
    if (busyExts.length === 0) {
      if (builtExts.length === 0 && this.elapsed > 14 * paceScale && myState.gold >= GAS_EXTRACTOR_LEVELS[1].cost + (isRookie ? 55 : 15)) {
        if (this.buildOrUpgradeExtractor(team)) return;
      } else if (
        this.elapsed > 68 * paceScale &&
        (myState.gas < 45 || myState.techTier >= 2) &&
        myState.gold >= 165 + (isRookie ? 65 : 20) &&
        Math.random() < (myState.gas < 30 ? 0.55 : 0.25)
      ) {
        if (this.buildOrUpgradeExtractor(team)) return;
      }
    }

    // --- 7. Strategy-Specific Execution for Ironbound Federation (鐵砧聯邦) ---
    const standing = this.getStandingTowerCount(team);
    const myBuiltPads = this.pads.filter((p) => p.team === team && p.towerType !== null && !p.building);
    const countTowerType = (t: TowerType) => myBuiltPads.filter((p) => p.towerType === t).length;
    const fDef = FACTIONS[myState.faction];

    const canTrainIdx = (idx: number): boolean => {
      const u = fDef.units[idx];
      if (!u || u.tier > myState.techTier || u.cost > myState.gold || u.gasCost > myState.gas) return false;
      if (u.requiresBarracksTier) {
        const reqLv = u.requiresBarracksLevel ?? 1;
        return this.barracks.some(
          (b) => b.team === team && b.tier === u.requiresBarracksTier && b.built && b.hp > 0 && b.level >= reqLv
        );
      }
      return true;
    };

    const getBarracksSlot = (tier: BarracksTier) =>
      this.barracks.find((b) => b.team === team && b.tier === tier) ?? null;

    if (isIronbound) {
      // === A. TOWER BUILDING & UPGRADING ===
      const targetTowerCount =
        ai.archetype === 'iron_turtle'
          ? isSimple
            ? 4
            : 6
          : ai.archetype === 'iron_rush'
          ? this.elapsed < 95 * paceScale
            ? 0
            : 2
          : ai.archetype === 'iron_air_siege'
          ? myState.techTier < 2
            ? 2
            : 3
          : ai.archetype === 'iron_mech'
          ? 3
          : 3; // iron_bio

      const allowEmergencyDefenseTower =
        maxThreat > (ai.archetype === 'iron_rush' ? 3.8 : 2.1) && laneMyForce[mostThreatenedLane] < maxThreat * 0.9;
      const allowAntiAirTower = oppAirCount >= 2 && countTowerType('watchtower') < 2;
      const allowPlannedTower =
        standing < targetTowerCount &&
        (ai.archetype === 'iron_turtle'
          ? this.elapsed > 4
          : ai.archetype === 'iron_mech'
          ? this.elapsed > 14
          : ai.archetype === 'iron_air_siege'
          ? this.elapsed > 16
          : ai.archetype === 'iron_bio'
          ? this.elapsed > 28
          : this.elapsed > 95 * paceScale);

      const wantUpgradeExistingTower =
        ai.archetype === 'iron_turtle'
          ? standing >= 2 && myState.gold >= 165
          : standing >= 2 && this.elapsed > 110 * paceScale && myState.gold >= 210 && !isRookie;

      if ((allowPlannedTower || allowEmergencyDefenseTower || allowAntiAirTower || wantUpgradeExistingTower) && myState.gold >= 135) {
        let targetPad: TowerPad | undefined;
        let chosenTower: TowerType = 'watchtower';
        let upgradeMode: TowerUpgradeMode = 'combat';

        if (allowAntiAirTower) {
          targetPad =
            this.pads.find((p) => p.homeSide === team && p.lane === mostThreatenedLane && !p.towerType && !p.building) ??
            this.pads.find((p) => p.homeSide === team && p.slot === 'outer' && !p.towerType && !p.building);
          chosenTower = 'watchtower';
        } else if (ai.archetype === 'iron_turtle') {
          // Turtle priority: outer watchtower/artillery -> inner tech_tower -> inner econ_tower -> upgrade existing!
          const hasWatch = countTowerType('watchtower');
          const hasArty = countTowerType('artillery');
          const hasTech = countTowerType('tech_tower');
          const hasEcon = countTowerType('econ_tower');

          const emptyOuterThreat = this.pads.find(
            (p) => p.homeSide === team && p.lane === mostThreatenedLane && p.slot === 'outer' && !p.towerType && !p.building
          );
          const emptyOuter =
            emptyOuterThreat ??
            this.pads.find((p) => p.homeSide === team && p.slot === 'outer' && !p.towerType && !p.building);
          const emptyInner = this.pads.find(
            (p) => p.homeSide === team && p.slot === 'inner' && !p.towerType && !p.building
          );

          if (hasArty < 2 && (emptyOuter || emptyInner)) {
            targetPad = emptyOuter ?? emptyInner;
            chosenTower = 'artillery';
          } else if (hasWatch < 1 && emptyOuter) {
            targetPad = emptyOuter;
            chosenTower = 'watchtower';
          } else if (hasTech < 1 && emptyInner) {
            targetPad = emptyInner;
            chosenTower = 'tech_tower';
          } else if (hasEcon < 1 && emptyInner) {
            targetPad = emptyInner;
            chosenTower = 'econ_tower';
          } else if (standing < targetTowerCount && (emptyOuter || emptyInner)) {
            const nextPad = emptyOuter ?? emptyInner;
            if (nextPad) {
              targetPad = nextPad;
              chosenTower =
                nextPad.slot === 'outer'
                  ? hasWatch < 2
                    ? 'watchtower'
                    : 'artillery'
                  : hasTech < 2
                  ? 'tech_tower'
                  : 'econ_tower';
            }
          } else if (!isRookie || Math.random() < 0.5) {
            // Upgrade front combat towers with 'combat', inner econ/safe towers with 'mining'
            const maxLv = myState.techTier >= 2 ? 3 : 2;
            const upgradable = this.pads.find(
              (p) => p.team === team && p.towerType && !p.building && !p.upgrading && p.level < maxLv
            );
            if (upgradable) {
              targetPad = upgradable;
              chosenTower = upgradable.towerType!;
              if (this.canUseTowerTechUpgrade(team) && upgradable.techLevel === 0 && upgradable.slot === 'outer') {
                upgradeMode = 'tech';
              } else {
                upgradeMode =
                  upgradable.towerType === 'econ_tower' || (upgradable.slot === 'inner' && maxThreat < 2.2 && upgradable.towerType !== 'tech_tower')
                    ? 'mining'
                    : 'combat';
              }
            }
          }
        } else if (allowEmergencyDefenseTower) {
          targetPad =
            this.pads.find((p) => p.homeSide === team && p.lane === mostThreatenedLane && !p.towerType && !p.building) ??
            this.pads.find((p) => p.homeSide === team && !p.towerType && !p.building);
          chosenTower = oppAirCount >= 1 ? 'watchtower' : 'artillery';
        } else if (allowPlannedTower) {
          if (ai.archetype === 'iron_bio') {
            // Bio builds 1 watchtower for vision, then econ_tower on safe inner pad!
            const emptyInner = this.pads.find((p) => p.homeSide === team && p.slot === 'inner' && !p.towerType && !p.building);
            const emptyOuter = this.pads.find((p) => p.homeSide === team && p.slot === 'outer' && !p.towerType && !p.building);
            if (countTowerType('econ_tower') < 1 && emptyInner) {
              targetPad = emptyInner;
              chosenTower = 'econ_tower';
            } else {
              targetPad = emptyOuter ?? emptyInner;
              chosenTower = countTowerType('watchtower') < 1 ? 'watchtower' : 'artillery';
            }
          } else if (ai.archetype === 'iron_mech') {
            // Mech builds defensive artillery + watchtower + inner econ_tower to fuel heavy army
            const emptyOuter = this.pads.find((p) => p.homeSide === team && p.slot === 'outer' && !p.towerType && !p.building);
            const emptyInner = this.pads.find((p) => p.homeSide === team && p.slot === 'inner' && !p.towerType && !p.building);
            if (countTowerType('artillery') < 1 && (emptyOuter ?? emptyInner)) {
              targetPad = emptyOuter ?? emptyInner;
              chosenTower = 'artillery';
            } else if (countTowerType('watchtower') < 1 && emptyOuter) {
              targetPad = emptyOuter;
              chosenTower = 'watchtower';
            } else if (emptyInner) {
              targetPad = emptyInner;
              chosenTower = 'econ_tower';
            }
          } else {
            // Air/Siege or late Rush
            const emptyOuter = this.pads.find((p) => p.homeSide === team && p.slot === 'outer' && !p.towerType && !p.building);
            const emptyInner = this.pads.find((p) => p.homeSide === team && p.slot === 'inner' && !p.towerType && !p.building);
            targetPad = emptyOuter ?? emptyInner;
            chosenTower = countTowerType('watchtower') < 1 ? 'watchtower' : 'artillery';
          }
        } else if (wantUpgradeExistingTower) {
          const maxLv = myState.techTier >= 2 ? 3 : 2;
          const upgradable = this.pads.find(
            (p) => p.team === team && p.towerType && !p.building && !p.upgrading && p.level < maxLv
          );
          if (upgradable) {
            targetPad = upgradable;
            chosenTower = upgradable.towerType!;
            upgradeMode =
              ai.archetype === 'iron_bio' || upgradable.towerType === 'econ_tower' ? 'mining' : 'combat';
          }
        }

        if (targetPad && this.startTowerOnPad(targetPad.id, chosenTower, team, upgradeMode)) {
          return;
        }
      }

      // === B. ECONOMY (MINING) UPGRADES ===
      const aiEconInfo = getEconUpgradeCost(myState.econLevel, standing);
      const allowEconNow =
        aiEconInfo !== null &&
        standing >= (ECON_REQUIRED_TOWERS[myState.econLevel] ?? 0) &&
        (ai.archetype === 'iron_rush'
          ? this.elapsed > 115 * paceScale // Rush skips early mining!
          : ai.archetype === 'iron_air_siege'
          ? myState.techTier >= 2 || myState.econLevel < 2 // Air/Siege saves for T2 first!
          : true);

      if (allowEconNow && aiEconInfo && myState.gold >= aiEconInfo.cost + (isRookie ? 70 : 25)) {
        this.upgradeEconomy(team);
      }

      // === C. TECH TIER PROGRESSION ===
      const techT1Time =
        (ai.archetype === 'iron_air_siege'
          ? 38
          : ai.archetype === 'iron_turtle'
          ? 52
          : ai.archetype === 'iron_mech'
          ? 58
          : ai.archetype === 'iron_bio'
          ? 85
          : 135) * paceScale; // iron_rush stays T1 long!

      const techT2Time =
        (ai.archetype === 'iron_mech'
          ? 135
          : ai.archetype === 'iron_turtle'
          ? 145
          : ai.archetype === 'iron_air_siege'
          ? 155
          : ai.archetype === 'iron_bio'
          ? 195
          : 235) * paceScale;

      if (
        (myState.techTier === 1 && this.elapsed > techT1Time) ||
        (myState.techTier === 2 && this.elapsed > techT2Time)
      ) {
        this.upgradeTech(team);
      }

      // === D. SPECIAL TECHS [K] (Incendiary/Orbital) & [L] (Anti-Air Radar) ===
      if (myState.techTier >= 2) {
        const kLv = myState.specialTechLevels?.[0] ?? 0;
        const lLv = myState.specialTechLevels?.[1] ?? 0;
        const turtlePriority = ai.archetype === 'iron_turtle';
        const needAntiAirRadar = oppAirCount >= 2 || turtlePriority || ai.archetype === 'iron_mech';

        if (needAntiAirRadar) {
          if (lLv === 0 && myState.gold >= fDef.specialTechs[1].cost + (turtlePriority ? 10 : 40)) {
            this.researchSpecialTech(1, team);
          } else if (
            lLv === 1 &&
            myState.techTier >= 3 &&
            fDef.specialTechs[1].level2 &&
            myState.gold >= fDef.specialTechs[1].level2.cost + (turtlePriority ? 20 : 60)
          ) {
            this.researchSpecialTech(1, team);
          }
        }
        if (turtlePriority || (!isRookie && myState.gold >= fDef.specialTechs[0].cost + 60)) {
          if (kLv === 0 && myState.gold >= fDef.specialTechs[0].cost + (turtlePriority ? 15 : 60)) {
            this.researchSpecialTech(0, team);
          } else if (
            kLv === 1 &&
            myState.techTier >= 3 &&
            fDef.specialTechs[0].level2 &&
            myState.gold >= fDef.specialTechs[0].level2.cost + (turtlePriority ? 25 : 70)
          ) {
            this.researchSpecialTech(0, team);
          }
        }
      }

      // === E. BARRACKS CONSTRUCTION (Lv.1 Unlock -> Lv.2/3/4 Repeatable Parallel 2/3/4 Slots!) ===
      const t1Bk = getBarracksSlot(1);
      const t2Bk = getBarracksSlot(2);
      const t3Bk = getBarracksSlot(3);
      const tryUpgradeBk = (tier: BarracksTier, bk: BarracksBuilding | null, maxLv: 1 | 2 | 3 | 4, goldBuf: number) => {
        if (!bk || bk.building || bk.level >= maxLv) return;
        const next = getBarracksNextUpgrade(tier, bk.level);
        if (next && myState.gold >= next.cost + goldBuf) {
          this.buildBarracks(tier, team);
        }
      };

      if (ai.archetype === 'iron_rush') {
        if (this.elapsed > 22 * paceScale) {
          tryUpgradeBk(1, t1Bk, isRookie ? 2 : this.elapsed > 180 * paceScale ? 4 : this.elapsed > 110 * paceScale ? 3 : 2, 18);
        }
      } else if (ai.archetype === 'iron_bio') {
        if (this.elapsed > 20 * paceScale) {
          tryUpgradeBk(1, t1Bk, isRookie ? 2 : this.elapsed > 175 * paceScale ? 4 : this.elapsed > 105 * paceScale ? 3 : 2, 18);
        }
        if (myState.techTier >= 2 && this.elapsed > 105 * paceScale) {
          tryUpgradeBk(2, t2Bk, 2, 35);
        }
      } else if (ai.archetype === 'iron_air_siege') {
        // Air/Siege MUST build T2 Barracks immediately at T2 to unlock Valkyrie [N] (idx 7)!
        if (myState.techTier >= 2) {
          tryUpgradeBk(2, t2Bk, isRookie ? 1 : this.elapsed > 150 * paceScale ? 3 : 2, 18);
        }
        if (myState.techTier >= 3) {
          tryUpgradeBk(3, t3Bk, 2, 35);
        }
      } else if (ai.archetype === 'iron_mech') {
        if (this.elapsed > 40 * paceScale) {
          tryUpgradeBk(1, t1Bk, isRookie ? 2 : 3, 30);
        }
        if (myState.techTier >= 3) {
          tryUpgradeBk(3, t3Bk, isRookie ? 2 : 3, 35);
        }
      } else if (ai.archetype === 'iron_turtle') {
        if (myState.techTier >= 3) {
          tryUpgradeBk(3, t3Bk, isRookie ? 2 : 3, 40);
        }
      }

      // === F. 6-TRACK ARMORY UPGRADES (Bio / Mech / Air) ===
      let preferredTracks: ArmoryTrackId[] = [];
      let armoryMinGold = 155;
      if (ai.archetype === 'iron_rush') {
        preferredTracks = this.elapsed > 46 * paceScale ? ['trackA', 'trackD'] : [];
        armoryMinGold = 175;
      } else if (ai.archetype === 'iron_turtle') {
        preferredTracks = myState.techTier >= 2 && this.elapsed > 150 * paceScale ? ['trackB', 'trackE', 'trackC', 'trackF'] : [];
        armoryMinGold = 210;
      } else if (ai.archetype === 'iron_air_siege') {
        preferredTracks = myState.techTier >= 2 ? ['trackC', 'trackF', 'trackB'] : [];
        armoryMinGold = 155;
      } else if (ai.archetype === 'iron_mech') {
        preferredTracks = this.elapsed > 32 * paceScale ? ['trackB', 'trackE'] : [];
        armoryMinGold = 145;
      } else if (ai.archetype === 'iron_bio') {
        preferredTracks = this.elapsed > 30 * paceScale ? ['trackA', 'trackD'] : [];
        armoryMinGold = 140;
      }

      if (preferredTracks.length > 0 && myState.gold >= armoryMinGold) {
        const t1BkLv = t1Bk?.built && t1Bk.hp > 0 ? t1Bk.level : 0;
        const eligible = preferredTracks
          .filter((tr) => {
            const curLv = myState.armoryLevels[tr] ?? 0;
            if (curLv >= 3) return false;
            return isArmoryLevelUnlocked(myState.faction, tr, (curLv + 1) as 1 | 2 | 3, myState.techTier, t1BkLv)
              .unlocked;
          })
          .sort((a, b) => (myState.armoryLevels[a] ?? 0) - (myState.armoryLevels[b] ?? 0));
        if (eligible.length > 0) {
          const bestTrack = eligible[0];
          const reqBld = getRequiredArmoryBuilding(myState.faction, bestTrack);
          if (!this.hasArmoryBuilding(team, reqBld)) {
            this.buildArmoryBuilding(reqBld, team);
          } else {
            this.upgradeArmoryTrack(bestTrack, team);
          }
        }
      }

      // Ironbound AI active [K] Tactical Boost usage when engaging enemy units
      const aiKLv = myState.specialTechLevels?.[0] ?? 0;
      if (aiKLv >= 1 && myState.kActiveCooldown <= 0 && !isRookie) {
        const fightingUnit = this.units.find(
          (u) => u.team === team && u.hpFp > 0 && u.outOfCombatTimer < 1.0 && u.defId !== 'iron_recon'
        );
        if (fightingUnit) {
          this.castKBoost(team, fightingUnit.x, fightingUnit.y);
        }
      }

      // === G. UNIT PRODUCTION (Ironbound 9-unit roster: 0:Rifle, 1:Mech, 2:Mortar, 3:Demolisher, 4:Recon, 5:Titan, 6:Elite, 7:Valkyrie, 8:Gunship) ===
      let chosenLane: LaneId = ai.primaryLane;
      if (maxThreat > 2.4 && laneMyForce[mostThreatenedLane] < maxThreat * 0.92) {
        chosenLane = mostThreatenedLane;
      } else if (ai.archetype === 'iron_bio' && ai.bioTimingTimer <= 0 && Math.random() < 0.42) {
        chosenLane = ai.secondaryLane;
      } else if (ai.archetype !== 'iron_rush' && Math.random() < 0.25) {
        chosenLane = ai.secondaryLane;
      }

      const tryTrainList = (indices: number[], maxCalls = 1) => {
        let trained = 0;
        const effectiveMax = isCommander ? maxCalls + 1 : maxCalls;
        for (let pass = 0; pass < 2 && trained < effectiveMax; pass++) {
          for (const idx of indices) {
            if (trained >= effectiveMax) break;
            if (canTrainIdx(idx) && this.trainUnit(idx, chosenLane, team)) {
              trained++;
            }
          }
        }
      };

      if (ai.archetype === 'iron_rush') {
        const wantElite = oppHeavyCount >= 1 || (t1Bk?.built && myState.gold >= 180);
        const list = wantElite ? [6, 0] : [0, 6];
        if (myState.techTier >= 2 && this.elapsed > 145 * paceScale) {
          list.push(3, 2);
        }
        tryTrainList(list, isCommander ? 2 : 1);
      } else if (ai.archetype === 'iron_turtle') {
        const underPressure = maxThreat > 1.8 || myTotalUnits < 3;
        if (myState.techTier >= 3) {
          const list = oppAirCount >= 2 ? [8, 5, 4, 2] : [5, 8, 4, 2];
          tryTrainList(list, isCommander ? 2 : 1);
        } else if (myState.techTier >= 2) {
          const list = oppAirCount >= 2 ? [7, 2, 1] : myMortarCount < 2 ? [2, 1, 3] : [1, 7, 3];
          if (underPressure || myState.gold >= 240) {
            tryTrainList(list, 1);
          }
        } else if (underPressure && myState.gold >= 165) {
          tryTrainList(oppAirCount >= 1 ? [0] : [1, 0], 1);
        }
      } else if (ai.archetype === 'iron_air_siege') {
        if (myState.techTier >= 3) {
          const list = myMortarCount < 2 ? [8, 7, 2, 4] : [8, 7, 4, 2];
          tryTrainList(list, isCommander ? 2 : 1);
        } else if (myState.techTier >= 2) {
          // Core Air/Siege mix: Cloaked Valkyries [N] (7) + Siege Mortars [E] (2)
          const list = myMortarCount < 2 && myValkyrieCount >= 1 ? [2, 7] : [7, 2];
          tryTrainList(list, isCommander ? 2 : 1);
        } else {
          if (myTotalUnits < 2 || maxThreat > 1.8) {
            tryTrainList([0], 1);
          }
        }
      } else if (ai.archetype === 'iron_mech') {
        // Mechanical ground + heavy air: Shield Mech [W](1), Flamer [R](3), Mortar [E](2), Titan [V](5), Gunship [M](8)
        if (myState.techTier >= 3) {
          const list = oppAirCount >= 2 ? [8, 5, 1, 3] : [5, 1, 3, 8];
          tryTrainList(list, isCommander ? 2 : 1);
        } else {
          const shouldSaveForTech =
            myState.techTier === 1 &&
            this.elapsed > 44 * paceScale &&
            myState.gold < TECH_UPGRADE_COSTS[1] &&
            maxThreat < 2.2 &&
            myHeavyUnits >= 2;
          if (!shouldSaveForTech) {
            tryTrainList(myState.techTier >= 2 ? (myMortarCount < 2 ? [1, 3, 2] : [1, 3]) : [1], 1);
          }
        }
      } else if (ai.archetype === 'iron_bio') {
        // Core Biological army: Rifle [Q](0) + Elite [Y](6), optionally splashing T2 Flamer [R](3) vs enemy light swarms
        const list =
          myState.techTier >= 2 && Math.random() < 0.25
            ? [3, 6, 0]
            : oppHeavyCount >= 1
            ? [6, 0]
            : [0, 6];
        tryTrainList(list, t1Bk?.built ? 2 : 1);
      }

      return;
    }

    // --- 8. Synchronized Full-Feature AI for Dawn & Swarm (4 Towers, 6-Track Gas Armory, Active [K], 9 Units) ---
    const needTowerForEcon = standing < 4 && this.elapsed > 20 && myState.gold >= 145;
    const needTowerForDef = maxThreat > 2.2 && laneMyForce[mostThreatenedLane] < maxThreat;
    if ((needTowerForEcon || needTowerForDef) && myState.gold >= 145) {
      const targetPad =
        this.pads.find((p) => p.homeSide === team && p.lane === mostThreatenedLane && !p.towerType && !p.building) ??
        this.pads.find((p) => p.homeSide === team && !p.towerType && !p.building && p.goldReserve > 150) ??
        this.pads.find(
          (p) =>
            p.team === team &&
            p.towerType &&
            !p.building &&
            !p.upgrading &&
            p.level < (myState.techTier >= 2 ? 3 : 2)
        );
      if (targetPad) {
        const extraTower: TowerType = myState.faction === 'dawn' ? 'tech_tower' : 'econ_tower';
        const chosen: TowerType =
          targetPad.slot === 'outer'
            ? 'watchtower'
            : countTowerType(extraTower) < 1 && !needTowerForDef
            ? extraTower
            : Math.random() < 0.5
            ? 'artillery'
            : 'disruptor';
        if (this.startTowerOnPad(targetPad.id, chosen, team, 'combat')) return;
      }
    }

    const aiEconInfo = getEconUpgradeCost(myState.econLevel, standing);
    if (
      aiEconInfo &&
      standing >= (ECON_REQUIRED_TOWERS[myState.econLevel] ?? 0) &&
      myState.gold >= aiEconInfo.cost + 35
    ) {
      this.upgradeEconomy(team);
    }

    const techT1 = (ai.archetype === 'iron_turtle' ? 68 : ai.archetype === 'iron_rush' ? 125 : 95) * paceScale;
    const techT2 = (ai.archetype === 'iron_turtle' ? 165 : 225) * paceScale;
    if ((myState.techTier === 1 && this.elapsed > techT1) || (myState.techTier === 2 && this.elapsed > techT2)) {
      this.upgradeTech(team);
    }

    if (myState.techTier >= 2 && myState.gold >= 210) {
      const kLv = myState.specialTechLevels?.[0] ?? 0;
      const lLv = myState.specialTechLevels?.[1] ?? 0;
      if (kLv === 0) this.researchSpecialTech(0, team);
      else if (kLv === 1 && myState.techTier >= 3) this.researchSpecialTech(0, team);
      if (lLv === 0) this.researchSpecialTech(1, team);
      else if (lLv === 1 && myState.techTier >= 3) this.researchSpecialTech(1, team);
    }

    // Active [K] usage for Dawn & Swarm AI when engaging enemies
    const aiNonIronKLv = myState.specialTechLevels?.[0] ?? 0;
    if (aiNonIronKLv >= 1 && myState.kActiveCooldown <= 0 && !isRookie) {
      const fightingUnit = this.units.find(
        (u) => u.team === team && u.hpFp > 0 && u.outOfCombatTimer < 1.0 && !u.detector
      );
      if (fightingUnit) {
        this.castKBoost(team, fightingUnit.x, fightingUnit.y);
      }
    }

    const t1BkFallback = getBarracksSlot(1);
    if (myState.techTier >= 1 && myState.gold >= 130) {
      const t1BkLv = t1BkFallback?.built && t1BkFallback.hp > 0 ? t1BkFallback.level : 0;
      const tracks = fDef.armoryTrackOrder.filter((tr) => {
        const curLv = myState.armoryLevels[tr] ?? 0;
        if (curLv >= 3) return false;
        return isArmoryLevelUnlocked(myState.faction, tr, (curLv + 1) as 1 | 2 | 3, myState.techTier, t1BkLv).unlocked;
      });
      if (tracks.length > 0) {
        tracks.sort((a, b) => (myState.armoryLevels[a] ?? 0) - (myState.armoryLevels[b] ?? 0));
        const chosenTrack = tracks[0];
        const reqBld = getRequiredArmoryBuilding(myState.faction, chosenTrack);
        if (!this.hasArmoryBuilding(team, reqBld)) {
          this.buildArmoryBuilding(reqBld, team);
        } else {
          this.upgradeArmoryTrack(chosenTrack, team);
        }
      }
    }

    if (this.elapsed > 36 * paceScale && myState.gold >= 145) {
      const t2BkFallback = getBarracksSlot(2);
      const t3BkFallback = getBarracksSlot(3);
      if (t1BkFallback && !t1BkFallback.building && t1BkFallback.level < 2) {
        this.buildBarracks(1, team);
      } else if (myState.techTier >= 2 && t2BkFallback && !t2BkFallback.building && t2BkFallback.level < 1) {
        this.buildBarracks(2, team);
      } else if (myState.techTier >= 3 && t3BkFallback && !t3BkFallback.building && t3BkFallback.level < 1) {
        this.buildBarracks(3, team);
      }
    }

    let chosenLane: LaneId = ai.primaryLane;
    if (maxThreat > 2.6 && laneMyForce[mostThreatenedLane] < maxThreat * 0.9) {
      chosenLane = mostThreatenedLane;
    } else if (Math.random() < 0.35) {
      chosenLane = ai.secondaryLane;
    }

    let pickIdx = 0;
    if (oppAirCount >= 2 && myState.gold >= 85) {
      const aaCandidates = fDef.units
        .map((u, idx) => ({ u, idx }))
        .filter((x) => x.u.canHitAir && canTrainIdx(x.idx));
      if (aaCandidates.length > 0) {
        pickIdx = aaCandidates[Math.floor(Math.random() * aaCandidates.length)].idx;
      }
    } else if (myState.techTier >= 3 && Math.random() < 0.55) {
      const t3Pool = fDef.units.map((u, idx) => ({ u, idx })).filter((x) => x.u.tier === 3 && canTrainIdx(x.idx));
      if (t3Pool.length > 0) {
        pickIdx = t3Pool[Math.floor(Math.random() * t3Pool.length)].idx;
      }
    } else if (myState.techTier >= 2 && Math.random() < 0.55) {
      const t2Pool = fDef.units.map((u, idx) => ({ u, idx })).filter((x) => x.u.tier === 2 && canTrainIdx(x.idx));
      if (t2Pool.length > 0) {
        pickIdx = t2Pool[Math.floor(Math.random() * t2Pool.length)].idx;
      }
    } else {
      const t1Pool = fDef.units.map((u, idx) => ({ u, idx })).filter((x) => x.u.tier === 1 && canTrainIdx(x.idx));
      if (t1Pool.length > 0) {
        pickIdx = t1Pool[Math.floor(Math.random() * t1Pool.length)].idx;
      }
    }

    this.trainUnit(pickIdx, chosenLane, team);
  }

  private getUnitLaneProgress(u: UnitEntity): number {
    let bestT = 0.5;
    let bestD = Infinity;
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const p = pointOnLane(u.lane, t);
      const d = distSq(u.x, u.y, p.x, p.y);
      if (d < bestD) {
        bestD = d;
        bestT = t;
      }
    }
    return bestT;
  }

  private updateUnits(
    dt: number,
    playerVision: Array<{ x: number; y: number; r: number; detector: boolean }>,
    enemyVision: Array<{ x: number; y: number; r: number; detector: boolean }>
  ) {
    const dtMs = dtToFixedMs(dt);

    // Aura shield pulse from Solaris Colossus (integer Fixed-Point shield gain)
    for (const u of this.units) {
      if (u.auraShield && u.hpFp > 0) {
        const auraShieldGainFp = Math.trunc((toFp(8) * dtMs) / 1000);
        const minAuraCapFp = toFp(40);
        for (const ally of this.units) {
          if (ally.team === u.team && ally.id !== u.id && dist(u.x, u.y, ally.x, ally.y) <= 135) {
            if (ally.maxShieldFp < minAuraCapFp) {
              ally.maxShieldFp = minAuraCapFp;
              ally.maxShield = Math.round(ally.maxShieldFp / FP_SCALE);
            }
            ally.shieldFp = Math.min(ally.maxShieldFp, ally.shieldFp + auraShieldGainFp);
            ally.shield = Math.ceil(ally.shieldFp / FP_SCALE);
          }
        }
      }
    }

    // Recon / Overseer / Observer passive OOC Support Aura (ONLY when out of combat >= 3s AND NOT detecting cloaked enemies!)
    const healedByReconIds = new Set<number>();
    const reconHealFp = Math.trunc((HAWKEYE_HEAL_PER_SEC * FP_SCALE * dtMs) / 1000);
    const observerShieldFp = Math.trunc((5 * FP_SCALE * dtMs) / 1000);
    for (const u of this.units) {
      const isBioHealer = u.defId === 'iron_recon' || u.defId === 'swarm_overseer';
      const isShieldCharger = u.defId === 'dawn_observer';
      if (!isBioHealer && !isShieldCharger) {
        if (u.healingBioActive) u.healingBioActive = false;
        continue;
      }
      if (u.hpFp <= 0 || (u.team !== 'player' && u.team !== 'enemy')) {
        u.healingBioActive = false;
        continue;
      }
      const oppTm: 'player' | 'enemy' = u.team === 'player' ? 'enemy' : 'player';
      let isDetectingCloak = false;
      if (u.outOfCombatTimer >= 3.0) {
        for (const other of this.units) {
          if (
            other.team === oppTm &&
            other.hpFp > 0 &&
            other.cloaked &&
            dist(u.x, u.y, other.x, other.y) <= u.vision
          ) {
            isDetectingCloak = true;
            break;
          }
        }
      }
      const canSupport = u.outOfCombatTimer >= 3.0 && !isDetectingCloak;
      u.healingBioActive = canSupport;
      if (canSupport) {
        for (const ally of this.units) {
          if (
            ally.team === u.team &&
            ally.id !== u.id &&
            ally.hpFp > 0 &&
            !healedByReconIds.has(ally.id) &&
            dist(u.x, u.y, ally.x, ally.y) <= HAWKEYE_HEAL_RADIUS
          ) {
            if (isBioHealer && reconHealFp > 0 && ally.hpFp < ally.maxHpFp && ally.attributes.includes('Biological')) {
              ally.hpFp = Math.min(ally.maxHpFp, ally.hpFp + reconHealFp);
              ally.hp = Math.ceil(ally.hpFp / FP_SCALE);
              healedByReconIds.add(ally.id);
            } else if (isShieldCharger && observerShieldFp > 0 && ally.maxShieldFp > 0 && ally.shieldFp < ally.maxShieldFp) {
              ally.shieldFp = Math.min(ally.maxShieldFp, ally.shieldFp + observerShieldFp);
              ally.shield = Math.ceil(ally.shieldFp / FP_SCALE);
              healedByReconIds.add(ally.id);
            }
          }
        }
      }
    }

    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      if (u.hpFp <= 0 || u.hp <= 0) {
        this.units.splice(i, 1);
        continue;
      }

      u.hitFlash = Math.max(0, u.hitFlash - dt * 5);
      u.revealTimer = Math.max(0, u.revealTimer - dt);
      u.firedRevealTimer = Math.max(0, (u.firedRevealTimer ?? 0) - dt);
      if (u.provokedTimer && u.provokedTimer > 0) {
        u.provokedTimer = Math.max(0, u.provokedTimer - dt);
      }
      u.slowTimer = Math.max(0, u.slowTimer - dt);
      u.buffTimer = Math.max(0, u.buffTimer - dt);
      u.hasteTimer = Math.max(0, u.hasteTimer - dt);
      u.stimTimer = Math.max(0, (u.stimTimer ?? 0) - dt);
      u.siegeLockTimer = Math.max(0, (u.siegeLockTimer ?? 0) - dt);
      u.outOfCombatTimer += dt;
      u.attackCooldownMs = Math.max(0, u.attackCooldownMs - dtMs);
      if (u.attackLockMs > 0) {
        u.attackLockMs = Math.max(0, u.attackLockMs - dtMs);
      }
      u.scaleX += (1 - u.scaleX) * Math.min(1, dt * 12);
      u.scaleY += (1 - u.scaleY) * Math.min(1, dt * 12);

      const teamState = u.team === 'player' ? this.player : u.team === 'enemy' ? this.enemy : null;

      // Timed Combat Cloak (e.g. Valkyrie: 15s stealth upon encountering enemies, recovers out of combat!)
      if (u.cloakMaxSec > 0 && (u.team === 'player' || u.team === 'enemy')) {
        const oppTm: 'player' | 'enemy' = u.team === 'player' ? 'enemy' : 'player';
        const oppNxPos = oppTm === 'player' ? PLAYER_NEXUS_POS : ENEMY_NEXUS_POS;
        let encounteringEnemy = u.outOfCombatTimer < 1.2 || dist(u.x, u.y, oppNxPos.x, oppNxPos.y) <= 210;
        if (!encounteringEnemy) {
          for (const other of this.units) {
            if (other.team === oppTm && other.hpFp > 0 && dist(u.x, u.y, other.x, other.y) <= 185) {
              encounteringEnemy = true;
              break;
            }
          }
        }
        if (!encounteringEnemy) {
          for (const pad of this.pads) {
            if (pad.team === oppTm && (pad.towerType || pad.building) && pad.hpFp > 0 && dist(u.x, u.y, pad.x, pad.y) <= 195) {
              encounteringEnemy = true;
              break;
            }
          }
        }
        if (encounteringEnemy) {
          if (u.cloakTimer > 0) {
            u.cloakTimer = Math.max(0, u.cloakTimer - dt);
            if (u.cloakTimer <= 0 && u.cloaked) {
              u.cloaked = false;
              this.addFloatingText(u.x, u.y - 16, '隱形結束', '#94A3B8');
            }
          }
        } else if (u.outOfCombatTimer >= 4.0) {
          if (!u.cloaked || u.cloakTimer < u.cloakMaxSec) {
            u.cloakTimer = u.cloakMaxSec;
            u.cloaked = true;
          }
        }
      }

      // Dawn passive shield regeneration (pure integer Fixed-Point!)
      if (u.faction === 'dawn' && u.maxShieldFp > 0 && u.outOfCombatTimer > 3.0 && u.shieldFp < u.maxShieldFp) {
        const shieldArmory = teamState ? teamState.armoryLevels.trackB : 0;
        const basePermillePerSec = 140 + shieldArmory * 40;
        const dawnKLv = teamState ? (teamState.specialTechLevels?.[0] ?? (teamState.specialTechsDone[0] ? 1 : 0)) : 0;
        const regenPermillePerSec =
          dawnKLv >= 2 ? basePermillePerSec * 2 : dawnKLv === 1 ? Math.round(basePermillePerSec * 1.5) : basePermillePerSec;
        const regenFp = Math.trunc((u.maxShieldFp * regenPermillePerSec * dtMs) / 1000000);
        if (regenFp > 0) {
          u.shieldFp = Math.min(u.maxShieldFp, u.shieldFp + regenFp);
          u.shield = Math.ceil(u.shieldFp / FP_SCALE);
        }
      }

      // Swarm passive bio-regeneration (pure integer Fixed-Point!)
      if (u.faction === 'swarm' && u.hpFp < u.maxHpFp) {
        const permillePerSec = u.outOfCombatTimer > 2.5 ? 45 : 16;
        const regenFp = Math.trunc((u.maxHpFp * permillePerSec * dtMs) / 1000000);
        if (regenFp > 0) {
          u.hpFp = Math.min(u.maxHpFp, u.hpFp + regenFp);
          u.hp = Math.ceil(u.hpFp / FP_SCALE);
        }
      }

      // Leviathan broodling hatch
      if (u.spawnerInterval > 0 && (u.team === 'player' || u.team === 'enemy')) {
        u.spawnTimer -= dt;
        if (u.spawnTimer <= 0) {
          u.spawnTimer = u.spawnerInterval;
          const lingDef = ALL_UNITS_BY_ID['swarm_ling'];
          if (lingDef && this.getSupplyUsed(u.team) < this.getSupplyCap(u.team) + 4) {
            const dy = (Math.random() - 0.5) * 24;
            this.units.push(
              this.createUnitFromDef(u.team, lingDef, u.lane, u.x + (u.team === 'player' ? 14 : -14), u.y + dy, dy)
            );
            this.spawnParticles(u.x, u.y, '#6EE7B7', 6, 45, 2.5);
          }
        }
      }

      if (u.defId === 'supply_crate' || u.defId === 'overdrive_core') continue;

      const stance: LaneStance = teamState
        ? u.inAmbushSquad
          ? teamState.squadStance
          : teamState.laneStances[u.lane]
        : 'push';
      const targetLaneStance: LaneStance =
        u.jungleTargetLane !== null && teamState ? teamState.laneStances[u.jungleTargetLane] : stance;
      const inJungleTransit = u.jungleWaypoints.length > 0;
      const isRushIgnore =
        inJungleTransit &&
        u.jungleMode !== 'hunt' &&
        (stance === 'all_in' || targetLaneStance === 'all_in' || u.jungleMode === 'rush_ignore');
      const isEvadeCreeps =
        inJungleTransit &&
        !isRushIgnore &&
        u.jungleMode !== 'hunt' &&
        (u.jungleMode === 'evade_creeps' || stance === 'hold_tower' || stance === 'defend_base');

      const hasLaneBuff = teamState ? teamState.laneBuffTimer[u.lane] > 0 : false;
      const hasGlobalBuff = teamState ? teamState.globalAttackBuffTimer > 0 : false;
      const isStimActive = u.stimTimer > 0;
      const isSiegeLocked = u.siegeLockTimer > 0;

      // Zero ambush stat buffs! Apply transparent stance/morale/[K] modifiers.
      let speedMult = 1;
      if (u.slowTimer > 0) speedMult *= 0.55;
      if (u.hasteTimer > 0) speedMult *= 1.35;
      if (isStimActive) speedMult *= 1.28;
      if (hasGlobalBuff) speedMult *= 1.15;
      if (stance === 'all_in' || isRushIgnore) speedMult *= 1.15;
      if (stance === 'defend_base') speedMult *= 1.12;
      if (isSiegeLocked) speedMult = 0;

      // Pure integer permille attack interval scaling (lower = faster attack cadence)
      let atkIntervalPermille = 1000;
      if (u.slowTimer > 0) atkIntervalPermille = Math.round((atkIntervalPermille * 1350) / 1000);
      if (u.hasteTimer > 0) atkIntervalPermille = Math.round((atkIntervalPermille * 740) / 1000);
      if (isStimActive) atkIntervalPermille = Math.round((atkIntervalPermille * 740) / 1000);
      if (hasLaneBuff) atkIntervalPermille = Math.round((atkIntervalPermille * 820) / 1000);
      if (hasGlobalBuff) atkIntervalPermille = Math.round((atkIntervalPermille * 860) / 1000);
      const effectiveIntervalMs = scaleAttackIntervalMs(u.attackIntervalMs, atkIntervalPermille);

      // Transparent linear flat damage bonus
      let extraFlatDamageFp = 0;
      if (hasGlobalBuff) extraFlatDamageFp += toFp(2);
      if (isStimActive) extraFlatDamageFp += toFp(2);
      if (isSiegeLocked) extraFlatDamageFp += toFp(IRON_K_MECH_BONUS_DMG);

      const effRange = isSiegeLocked ? Math.round((u.range * IRON_K_MECH_RANGE_PERMILLE) / 1000) : u.range;

      const myVision = u.team === 'player' ? playerVision : u.team === 'enemy' ? enemyVision : undefined;
      const enemyTeam: TeamId | null = u.team === 'player' ? 'enemy' : u.team === 'enemy' ? 'player' : null;
      const aggroRadius = Math.max(effRange + 75, 145);

      let targetUnit: UnitEntity | null = null;
      let bestUnitScore = Infinity;
      const isPassiveEarlyCreep =
        u.team === 'neutral' &&
        u.isJungleCreep &&
        !u.isBoss &&
        (u.provokedTimer ?? 0) <= 0 &&
        this.elapsed < EARLY_PASSIVE_CREEP_SEC;

      if (!isRushIgnore && !isPassiveEarlyCreep) {
        for (const other of this.units) {
          if (other.hpFp <= 0 || other.id === u.id) continue;
          // Air/Ground targeting filter: ground-only units cannot target flying air units!
          if (other.domain === 'air' && !u.canHitAir) continue;

          if (u.team === 'neutral') {
            if (other.team === 'neutral') continue;
            if (other.cloaked && other.revealTimer <= 0) continue;
            if (other.jungleWaypoints.length > 0 && other.jungleMode !== 'hunt') {
              if (dist(u.x, u.y, other.x, other.y) > 58) continue;
            }
          } else {
            if (other.team === u.team) continue;
            // ALL_IN (強攻) MUST ignore neutral creeps/monsters and push straight toward the enemy!
            const ignoreNeutrals =
              isEvadeCreeps || (stance === 'all_in' && !(inJungleTransit && u.jungleMode === 'hunt'));
            if (ignoreNeutrals && other.team === 'neutral') continue;
            // Early-game passive jungle creeps: scouts won't accidentally aggro them unless explicitly hunting/targeting camp!
            if (
              other.team === 'neutral' &&
              other.isJungleCreep &&
              !other.isBoss &&
              other.defId === 'neutral_creep' &&
              (other.provokedTimer ?? 0) <= 0 &&
              this.elapsed < EARLY_PASSIVE_CREEP_SEC
            ) {
              const explicitlyTargetingCamp =
                u.jungleMode === 'hunt' ||
                (u.inAmbushSquad &&
                  u.squadDestination !== null &&
                  dist(u.squadDestination.x, u.squadDestination.y, other.x, other.y) <= 85);
              if (!explicitlyTargetingCamp) continue;
            }
            if (other.team === enemyTeam && myVision && !this.isUnitVisibleTo(u.team as 'player' | 'enemy', other, myVision)) {
              continue;
            }
          }
          const d = dist(u.x, u.y, other.x, other.y);
          if (d <= aggroRadius && d < bestUnitScore) {
            bestUnitScore = d;
            targetUnit = other;
          }
        }
      }

      // Check barricade in lane (AIR UNITS FLY STRAIGHT OVER BARRICADES!)
      const barricadeTarget =
        !isRushIgnore && u.team !== 'neutral' && u.domain === 'ground'
          ? this.objectives.find(
              (o) =>
                o.kind === 'barricade' &&
                !o.cleared &&
                o.lane === u.lane &&
                dist(u.x, u.y, o.x, o.y) <= Math.max(effRange + 55, 130)
            ) ?? null
          : null;

      // Check enemy towers, supply depots, base barracks, armory buildings & gas extractors
      let targetPad: TowerPad | null = null;
      let targetDepot: SupplyDepot | null = null;
      let targetBarracks: BarracksBuilding | null = null;
      let targetArmory: ArmoryBuilding | null = null;
      let targetExtractor: GasExtractor | null = null;
      if (enemyTeam && !isRushIgnore) {
        let bestPadDist = Infinity;
        for (const pad of this.pads) {
          if (pad.team === enemyTeam && (pad.towerType || pad.building) && pad.hpFp > 0) {
            const d = dist(u.x, u.y, pad.x, pad.y);
            if (d <= Math.max(effRange + 65, 150) && d < bestPadDist) {
              bestPadDist = d;
              targetPad = pad;
            }
          }
        }
        let bestDepotDist = Infinity;
        for (const dep of this.depots) {
          if (dep.team === enemyTeam && (dep.built || dep.building) && dep.hpFp > 0) {
            const d = dist(u.x, u.y, dep.x, dep.y);
            if (d <= Math.max(effRange + 55, 135) && d < bestDepotDist) {
              bestDepotDist = d;
              targetDepot = dep;
            }
          }
        }
        let bestBkDist = Infinity;
        for (const bk of this.barracks) {
          if (bk.team === enemyTeam && (bk.built || bk.building) && bk.hpFp > 0) {
            const d = dist(u.x, u.y, bk.x, bk.y);
            if (d <= Math.max(effRange + 55, 135) && d < bestBkDist) {
              bestBkDist = d;
              targetBarracks = bk;
            }
          }
        }
        let bestArmDist = Infinity;
        for (const arm of this.armories) {
          if (arm.team === enemyTeam && (arm.built || arm.building) && arm.hpFp > 0) {
            const d = dist(u.x, u.y, arm.x, arm.y);
            if (d <= Math.max(effRange + 55, 135) && d < bestArmDist) {
              bestArmDist = d;
              targetArmory = arm;
            }
          }
        }
        let bestExtDist = Infinity;
        for (const ext of this.extractors) {
          if (ext.team === enemyTeam && (ext.built || ext.building) && ext.hpFp > 0) {
            const d = dist(u.x, u.y, ext.x, ext.y);
            if (d <= Math.max(effRange + 55, 135) && d < bestExtDist) {
              bestExtDist = d;
              targetExtractor = ext;
            }
          }
        }
      }

      const enemyNexusPos = u.team === 'player' ? ENEMY_NEXUS_POS : u.team === 'enemy' ? PLAYER_NEXUS_POS : null;
      const distToNexus = enemyNexusPos ? dist(u.x, u.y, enemyNexusPos.x, enemyNexusPos.y) : Infinity;

      // Neutral leash behavior (tight 95px leash + peaceful early camps unless provoked!)
      if (u.team === 'neutral') {
        const home = u.homePos ?? LANE_MID_COORDS[u.lane];
        const homeDist = dist(u.x, u.y, home.x, home.y);
        if (targetUnit && homeDist < 95) {
          const d = dist(u.x, u.y, targetUnit.x, targetUnit.y);
          if (d <= effRange + targetUnit.radius) {
            if (u.attackCooldownMs <= 0) {
              this.fireUnitAttack(u, targetUnit, null, null, null, null, extraFlatDamageFp);
              u.attackCooldownMs = effectiveIntervalMs;
            }
          } else {
            this.moveToward(u, targetUnit.x, targetUnit.y, u.speed * speedMult, dt);
          }
        } else if (homeDist > 16) {
          this.moveToward(u, home.x, home.y, u.speed, dt);
        }
        continue;
      }

      // TACTICAL FIGHTING-RETREAT stance: normal stats, abort jungle ambushes (on source OR target lane!), pull back to home Nexus.
      // Units can still return fire at pursuers within actual attack range, subject to normal attack windup & recovery!
      if (stance === 'retreat' || (inJungleTransit && targetLaneStance === 'retreat')) {
        if (u.jungleWaypoints.length > 0) {
          if (targetLaneStance === 'retreat' && u.jungleTargetLane !== null) {
            u.lane = u.jungleTargetLane;
          }
          u.jungleWaypoints = [];
          u.jungleTargetLane = null;
        }
        if (u.attackLockMs > 0) {
          continue;
        }
        if (targetUnit && dist(u.x, u.y, targetUnit.x, targetUnit.y) <= effRange + targetUnit.radius && u.attackCooldownMs <= 0) {
          this.fireUnitAttack(u, targetUnit, null, null, null, null, extraFlatDamageFp);
          u.attackCooldownMs = effectiveIntervalMs;
          u.attackLockMs = clamp(Math.round((effectiveIntervalMs * 360) / 1000), 220, 520);
          continue;
        }
        const myNexus = u.team === 'player' ? PLAYER_NEXUS_POS : ENEMY_NEXUS_POS;
        const shelterX = u.team === 'player' ? myNexus.x + 76 : myNexus.x - 76;
        const shelterY = myNexus.y + (u.lane === 0 ? -64 : u.lane === 2 ? 64 : 0) + u.laneOffset * 0.5;
        if (dist(u.x, u.y, shelterX, shelterY) > 16) {
          this.moveToward(u, shelterX, shelterY, u.speed * speedMult, dt);
        }
        continue;
      }

      // DEFEND BASE stance: pull back near home Nexus & Supply Depots unless engaging nearby threats!
      if (stance === 'defend_base' && u.jungleWaypoints.length === 0) {
        const myNexus = u.team === 'player' ? PLAYER_NEXUS_POS : ENEMY_NEXUS_POS;
        const guardX = u.team === 'player' ? myNexus.x + 115 : myNexus.x - 115;
        const guardY = myNexus.y + (u.lane === 0 ? -82 : u.lane === 2 ? 82 : 0) + u.laneOffset * 0.6;
        const distFromHome = dist(u.x, u.y, myNexus.x, myNexus.y);

        if (targetUnit && distFromHome <= 270) {
          const d = dist(u.x, u.y, targetUnit.x, targetUnit.y);
          if (d <= effRange + targetUnit.radius) {
            if (u.attackCooldownMs <= 0) {
              this.fireUnitAttack(u, targetUnit, null, null, null, null, extraFlatDamageFp);
              u.attackCooldownMs = effectiveIntervalMs;
            }
          } else {
            this.moveToward(u, targetUnit.x, targetUnit.y, u.speed * speedMult, dt);
          }
          continue;
        }
        if (dist(u.x, u.y, guardX, guardY) > 18) {
          this.moveToward(u, guardX, guardY, u.speed * speedMult, dt);
        }
        continue;
      }

      const preferStructure = stance === 'all_in';

      // ALL_IN (強攻 · 破塔): prioritize Nexus, Towers, Depots & Barracks BEFORE fighting enemy units!
      if (preferStructure) {
        if (enemyNexusPos && distToNexus <= effRange + 38) {
          if (u.attackCooldownMs <= 0) {
            this.fireUnitAttack(u, null, null, null, enemyTeam as 'player' | 'enemy', null, extraFlatDamageFp);
            u.attackCooldownMs = effectiveIntervalMs;
          }
          continue;
        }
        if (targetPad && dist(u.x, u.y, targetPad.x, targetPad.y) <= effRange + 24) {
          if (u.attackCooldownMs <= 0) {
            this.fireUnitAttack(u, null, targetPad, null, null, null, extraFlatDamageFp);
            u.attackCooldownMs = effectiveIntervalMs;
          }
          continue;
        }
        if (targetDepot && dist(u.x, u.y, targetDepot.x, targetDepot.y) <= effRange + 22) {
          if (u.attackCooldownMs <= 0) {
            this.fireUnitAttack(u, null, null, targetDepot, null, null, extraFlatDamageFp);
            u.attackCooldownMs = effectiveIntervalMs;
          }
          continue;
        }
        if (targetBarracks && dist(u.x, u.y, targetBarracks.x, targetBarracks.y) <= effRange + 22) {
          if (u.attackCooldownMs <= 0) {
            this.fireUnitAttack(u, null, null, null, null, null, extraFlatDamageFp, targetBarracks);
            u.attackCooldownMs = effectiveIntervalMs;
          }
          continue;
        }
        if (targetArmory && dist(u.x, u.y, targetArmory.x, targetArmory.y) <= effRange + 22) {
          if (u.attackCooldownMs <= 0) {
            this.fireUnitAttack(u, null, null, null, null, null, extraFlatDamageFp, null, targetArmory);
            u.attackCooldownMs = effectiveIntervalMs;
          }
          continue;
        }
        if (targetExtractor && dist(u.x, u.y, targetExtractor.x, targetExtractor.y) <= effRange + 22) {
          if (u.attackCooldownMs <= 0) {
            this.fireUnitAttack(u, null, null, null, null, null, extraFlatDamageFp, null, null, targetExtractor);
            u.attackCooldownMs = effectiveIntervalMs;
          }
          continue;
        }
      }

      if (barricadeTarget && dist(u.x, u.y, barricadeTarget.x, barricadeTarget.y) <= effRange + 30) {
        if (u.attackCooldownMs <= 0) {
          this.fireUnitAttack(u, null, null, null, null, barricadeTarget, extraFlatDamageFp);
          u.attackCooldownMs = effectiveIntervalMs;
        }
        continue;
      }

      // PUSH (推進 · 先殺人) & HOLD_TOWER: prioritize engaging & killing enemy UNITS first!
      if (targetUnit) {
        const d = dist(u.x, u.y, targetUnit.x, targetUnit.y);
        if (d <= effRange + targetUnit.radius) {
          if (u.attackCooldownMs <= 0) {
            this.fireUnitAttack(u, targetUnit, null, null, null, null, extraFlatDamageFp);
            u.attackCooldownMs = effectiveIntervalMs;
          }
          continue;
        }
        if (stance !== 'hold_tower' || d <= effRange + 65 || u.jungleWaypoints.length > 0) {
          this.moveToward(u, targetUnit.x, targetUnit.y, u.speed * speedMult, dt);
          continue;
        }
      }

      if (enemyNexusPos && distToNexus <= effRange + 38) {
        if (u.attackCooldownMs <= 0) {
          this.fireUnitAttack(u, null, null, null, enemyTeam as 'player' | 'enemy', null, extraFlatDamageFp);
          u.attackCooldownMs = effectiveIntervalMs;
        }
        continue;
      }

      if (targetDepot && dist(u.x, u.y, targetDepot.x, targetDepot.y) <= effRange + 22) {
        if (u.attackCooldownMs <= 0) {
          this.fireUnitAttack(u, null, null, targetDepot, null, null, extraFlatDamageFp);
          u.attackCooldownMs = effectiveIntervalMs;
        }
        continue;
      }

      if (targetBarracks && dist(u.x, u.y, targetBarracks.x, targetBarracks.y) <= effRange + 22) {
        if (u.attackCooldownMs <= 0) {
          this.fireUnitAttack(u, null, null, null, null, null, extraFlatDamageFp, targetBarracks);
          u.attackCooldownMs = effectiveIntervalMs;
        }
        continue;
      }

      if (targetArmory && dist(u.x, u.y, targetArmory.x, targetArmory.y) <= effRange + 22) {
        if (u.attackCooldownMs <= 0) {
          this.fireUnitAttack(u, null, null, null, null, null, extraFlatDamageFp, null, targetArmory);
          u.attackCooldownMs = effectiveIntervalMs;
        }
        continue;
      }

      if (targetExtractor && dist(u.x, u.y, targetExtractor.x, targetExtractor.y) <= effRange + 22) {
        if (u.attackCooldownMs <= 0) {
          this.fireUnitAttack(u, null, null, null, null, null, extraFlatDamageFp, null, null, targetExtractor);
          u.attackCooldownMs = effectiveIntervalMs;
        }
        continue;
      }

      if (targetPad) {
        const d = dist(u.x, u.y, targetPad.x, targetPad.y);
        if (d <= effRange + 24) {
          if (u.attackCooldownMs <= 0) {
            this.fireUnitAttack(u, null, targetPad, null, null, null, extraFlatDamageFp);
            u.attackCooldownMs = effectiveIntervalMs;
          }
          continue;
        }
        if (stance !== 'hold_tower') {
          this.moveToward(u, targetPad.x, targetPad.y, u.speed * speedMult, dt);
          continue;
        }
      }

      // 4th-Lane Custom Squad Movement (Zero stat buffs; marches to designated destination & strictly obeys all 5 stances!)
      if (u.inAmbushSquad) {
        if (u.squadDestination) {
          const distToDest = dist(u.x, u.y, u.squadDestination.x, u.squadDestination.y);
          if (distToDest > 24) {
            this.moveToward(u, u.squadDestination.x, u.squadDestination.y, u.speed * speedMult, dt);
            continue;
          }
          // Arrived at squad rally destination -> clear it so stance governs movement cleanly!
          u.squadDestination = null;
        }
        const activeLanes = this.getActiveLanes();
        const nearestLane = closestLaneToPoint(u.x, u.y, activeLanes);
        if (stance === 'hold_tower') {
          const laneFriendlyPads = this.pads.filter(
            (p) => p.team === u.team && p.lane === nearestLane && (p.towerType !== null || p.building) && p.hpFp > 0
          );
          laneFriendlyPads.sort((a, b) => (u.team === 'player' ? b.x - a.x : a.x - b.x));
          const outerTower = laneFriendlyPads[0];
          let hx: number;
          let hy: number;
          if (outerTower) {
            hx = outerTower.x + (u.team === 'player' ? 32 : -32);
            hy = outerTower.y + u.laneOffset * 0.7;
          } else {
            const homeInner = this.pads.find(
              (p) => p.homeSide === u.team && p.lane === nearestLane && p.slot === 'inner'
            );
            if (homeInner) {
              hx = homeInner.x + (u.team === 'player' ? 24 : -24);
              hy = homeInner.y + u.laneOffset * 0.7;
            } else {
              const fallbackPt = pointOnLane(nearestLane, u.team === 'player' ? 0.22 : 0.78);
              hx = fallbackPt.x;
              hy = fallbackPt.y + u.laneOffset;
            }
          }
          if (dist(u.x, u.y, hx, hy) > 18) {
            this.moveToward(u, hx, hy, u.speed * speedMult, dt);
          }
          continue;
        }
        if (enemyNexusPos && (stance === 'push' || stance === 'all_in')) {
          const oppTeamId: 'player' | 'enemy' = u.team === 'player' ? 'enemy' : 'player';
          const enemyLanePads = this.pads
            .filter((p) => p.team === oppTeamId && p.lane === nearestLane && (p.towerType || p.building) && p.hpFp > 0)
            .sort((a, b) => distSq(u.x, u.y, a.x, a.y) - distSq(u.x, u.y, b.x, b.y));
          const goal = enemyLanePads[0] ? { x: enemyLanePads[0].x, y: enemyLanePads[0].y } : enemyNexusPos;
          this.moveToward(u, goal.x, goal.y, u.speed * speedMult, dt);
        }
        continue;
      }

      // Follow Jungle Ambush / Lane-Transfer Waypoints
      if (u.jungleWaypoints.length > 0) {
        const nextWp = u.jungleWaypoints[0];
        if (dist(u.x, u.y, nextWp.x, nextWp.y) <= 26) {
          u.jungleWaypoints.shift();
          if (u.jungleWaypoints.length === 0) {
            if (u.jungleTargetLane !== null) {
              u.lane = u.jungleTargetLane;
              u.jungleTargetLane = null;
            }
            u.jungleMode = undefined;
          }
        } else {
          this.moveToward(u, nextWp.x, nextWp.y, u.speed * speedMult, dt);
          continue;
        }
      }

      // Standard Lane Movement
      const curT = this.getUnitLaneProgress(u);

      // HOLD_TOWER stance (Opening Default): rally around furthest-forward friendly tower on this lane,
      // or guard the home inner tower pad when 0 towers are built yet!
      if (stance === 'hold_tower') {
        const laneFriendlyPads = this.pads.filter(
          (p) => p.team === u.team && p.lane === u.lane && (p.towerType !== null || p.building) && p.hpFp > 0
        );
        laneFriendlyPads.sort((a, b) => (u.team === 'player' ? b.x - a.x : a.x - b.x));
        const outerTower = laneFriendlyPads[0];
        let hx: number;
        let hy: number;
        if (outerTower) {
          hx = outerTower.x + (u.team === 'player' ? 32 : -32);
          hy = outerTower.y + u.laneOffset * 0.8;
        } else {
          const homeInner = this.pads.find(
            (p) => p.homeSide === u.team && p.lane === u.lane && p.slot === 'inner'
          );
          if (homeInner) {
            hx = homeInner.x + (u.team === 'player' ? 24 : -24);
            hy = homeInner.y + u.laneOffset * 0.8;
          } else {
            const fallbackPt = pointOnLane(u.lane, u.team === 'player' ? 0.22 : 0.78);
            hx = fallbackPt.x;
            hy = fallbackPt.y + u.laneOffset;
          }
        }
        if (dist(u.x, u.y, hx, hy) > 18) {
          this.moveToward(u, hx, hy, u.speed * speedMult, dt);
        }
        continue;
      }

      if (barricadeTarget && dist(u.x, u.y, barricadeTarget.x, barricadeTarget.y) < effRange + 24) {
        continue;
      }

      const nextT = u.team === 'player' ? Math.min(1, curT + 0.09) : Math.max(0, curT - 0.09);
      const wp = pointOnLane(u.lane, nextT);
      const goalX = wp.x;
      const goalY = wp.y + u.laneOffset * (nextT > 0.1 && nextT < 0.9 ? 1 : 0.3);
      this.moveToward(u, goalX, goalY, u.speed * speedMult, dt);
    }

    // Soft separation (ground separates from ground, air separates from air; rooted siege-locked units stay fixed!)
    for (let i = 0; i < this.units.length; i++) {
      const a = this.units[i];
      if (a.defId === 'supply_crate' || a.defId === 'overdrive_core' || a.siegeLockTimer > 0) continue;
      for (let j = i + 1; j < this.units.length; j++) {
        const b = this.units[j];
        if (
          b.defId === 'supply_crate' ||
          b.defId === 'overdrive_core' ||
          a.domain !== b.domain ||
          b.siegeLockTimer > 0
        ) {
          continue;
        }
        const minDist = (a.radius + b.radius) * 0.9;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.01 && d2 < minDist * minDist) {
          const d = Math.sqrt(d2);
          const push = (minDist - d) * 0.32;
          const nx = dx / d;
          const ny = dy / d;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }
  }

  private moveToward(u: UnitEntity, tx: number, ty: number, speed: number, dt: number) {
    if (speed <= 0.01) {
      u.vx = 0;
      u.vy = 0;
      return;
    }
    const dx = tx - u.x;
    const dy = ty - u.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    const step = Math.min(d, speed * dt);
    u.vx = (dx / d) * speed;
    u.vy = (dy / d) * speed;
    u.x = clamp(u.x + (dx / d) * step, 40, WORLD_WIDTH - 40);
    u.y = clamp(u.y + (dy / d) * step, 40, WORLD_HEIGHT - 40);
  }

  private buildUnitWeaponSpec(u: UnitEntity, extraFlatDamageFp = 0): WeaponAttackSpecFp {
    return {
      baseDamageFp: u.baseDamageFp + extraFlatDamageFp,
      attackUpgradeLevel: u.attackUpgradeLevel,
      damagePerUpgradeFp: u.damagePerUpgradeFp,
      attackCount: u.attackCount,
      bonusVsTagFp: cloneTagBonusFp(u.bonusVsTagFp),
      bonusPerUpgradeVsTagFp: cloneTagBonusFp(u.bonusPerUpgradeVsTagFp),
    };
  }

  private fireUnitAttack(
    u: UnitEntity,
    targetUnit: UnitEntity | null,
    targetPad: TowerPad | null,
    targetDepot: SupplyDepot | null,
    targetNexusTeam: 'player' | 'enemy' | null,
    targetObj: NeutralObjective | null,
    extraFlatDamageFp: number,
    targetBarracks: BarracksBuilding | null = null,
    targetArmory: ArmoryBuilding | null = null,
    targetExtractor: GasExtractor | null = null
  ) {
    u.outOfCombatTimer = 0;
    u.scaleX = 1.2;
    u.scaleY = 0.86;
    const oppTeam: 'player' | 'enemy' | null =
      u.team === 'player' ? 'enemy' : u.team === 'enemy' ? 'player' : null;
    const attackingOpponent =
      oppTeam !== null &&
      Boolean(
        (targetUnit && targetUnit.team === oppTeam) ||
          (targetPad && targetPad.team === oppTeam) ||
          (targetDepot && targetDepot.team === oppTeam) ||
          (targetBarracks && targetBarracks.team === oppTeam) ||
          (targetArmory && targetArmory.team === oppTeam) ||
          (targetExtractor && targetExtractor.team === oppTeam) ||
          targetNexusTeam === oppTeam
      );

    if (u.cloaked) {
      const teamState = u.team === 'player' ? this.player : u.team === 'enemy' ? this.enemy : null;
      u.revealTimer = teamState?.specialTechsDone[0] ? 1.2 : 2.4;
    } else if (attackingOpponent) {
      // Non-cloaked attacker becomes visible to opposing HUMAN EYES only when firing at opposing player assets
      // (never leak "開火暴露" when demolishing barricades or fighting neutral jungle creeps/events).
      u.firedRevealTimer = FIRED_REVEAL_DURATION;
    }

    const weaponSpec = this.buildUnitWeaponSpec(u, extraFlatDamageFp);
    const tx = targetUnit
      ? targetUnit.x
      : targetPad
      ? targetPad.x
      : targetDepot
      ? targetDepot.x
      : targetBarracks
      ? targetBarracks.x
      : targetArmory
      ? targetArmory.x
      : targetExtractor
      ? targetExtractor.x
      : targetObj
      ? targetObj.x
      : targetNexusTeam === 'enemy'
      ? ENEMY_NEXUS_POS.x
      : PLAYER_NEXUS_POS.x;
    const ty = targetUnit
      ? targetUnit.y
      : targetPad
      ? targetPad.y
      : targetDepot
      ? targetDepot.y
      : targetBarracks
      ? targetBarracks.y
      : targetArmory
      ? targetArmory.y
      : targetExtractor
      ? targetExtractor.y
      : targetObj
      ? targetObj.y
      : targetNexusTeam === 'enemy'
      ? ENEMY_NEXUS_POS.y
      : PLAYER_NEXUS_POS.y;

    // Enforce normal attack backswing lock (ms) on every attack so instant stance-swapping cannot skip recovery
    u.attackLockMs = Math.max(u.attackLockMs, clamp(Math.round((u.attackIntervalMs * 340) / 1000), 200, 480));

    // Suicidal acid detonation (Baneling Volatile)
    if (u.suicidal) {
      const blastR = Math.max(u.splashRadius, 72);
      const visible = this.isPointVisibleTo('player', u.x, u.y);
      if (visible) {
        this.spawnRingParticle(u.x, u.y, '#34D399', blastR);
        this.spawnParticles(u.x, u.y, '#6EE7B7', 20, 125, 3.8);
        this.addShake(4.5, 0.16);
        if (!this.pvpMode) tacticalAudio.playExplosion();
      }
      for (const other of this.units) {
        if (other.team === u.team || other.hpFp <= 0 || other.domain === 'air') continue;
        if (dist(u.x, u.y, other.x, other.y) <= blastR + other.radius) {
          this.applyDamageToUnit(other, weaponSpec, u.team, 0.4);
        }
      }
      if (targetPad && targetPad.hpFp > 0) this.applyDamageToPad(targetPad, weaponSpec, u.team);
      if (targetDepot && targetDepot.hpFp > 0) this.applyDamageToDepot(targetDepot, weaponSpec, u.team);
      if (targetBarracks && targetBarracks.hpFp > 0) this.applyDamageToBarracks(targetBarracks, weaponSpec, u.team);
      if (targetArmory && targetArmory.hpFp > 0) this.applyDamageToArmory(targetArmory, weaponSpec, u.team);
      if (targetExtractor && targetExtractor.hpFp > 0) this.applyDamageToExtractor(targetExtractor, weaponSpec, u.team);
      if (targetObj && !targetObj.cleared) this.damageBarricade(targetObj, weaponSpec, u.team);
      if (targetNexusTeam) this.applyDamageToNexus(targetNexusTeam, weaponSpec);
      u.hpFp = 0;
      u.hp = 0;
      const myState = u.team === 'player' ? this.player : u.team === 'enemy' ? this.enemy : null;
      if (myState) myState.unitsLost++;
      return;
    }

    const isMelee = u.combatRange === 'melee';
    if (isMelee) {
      if (!this.pvpMode && this.isPointVisibleTo('player', u.x, u.y)) {
        tacticalAudio.playAttack('melee');
      }
      const isFlamer = u.shape === 'flamer';
      const sparkColor = isFlamer
        ? '#F97316'
        : u.faction === 'dawn'
        ? '#FCD34D'
        : u.faction === 'swarm'
        ? '#6EE7B7'
        : '#93C5FD';
      if (isFlamer) {
        // Roaring mid-close flame jet from nozzle to target impact
        this.spawnParticles(u.x + (tx - u.x) * 0.35, u.y + (ty - u.y) * 0.35, '#FDE047', 6, 75, 3.0);
        this.spawnParticles(u.x + (tx - u.x) * 0.72, u.y + (ty - u.y) * 0.72, '#F97316', 10, 95, 3.6);
        this.spawnParticles(tx, ty, '#EF4444', 8, 85, 3.2);
      } else {
        this.spawnParticles((u.x + tx) * 0.5, (u.y + ty) * 0.5, sparkColor, u.splashRadius > 0 ? 10 : 5, 65, 2.8);
      }
      if (u.splashRadius > 0) {
        this.spawnRingParticle(tx, ty, isFlamer ? '#FB923C' : sparkColor, u.splashRadius);
        for (const other of this.units) {
          if (other.team === u.team || other.hpFp <= 0) continue;
          if (other.domain === 'air' && !u.canHitAir) continue;
          const dSplash = dist(tx, ty, other.x, other.y);
          if (dSplash <= u.splashRadius + other.radius) {
            const isDirect = targetUnit !== null && other.id === targetUnit.id;
            const falloffPermille =
              isDirect || dSplash <= u.splashRadius * 0.42
                ? 1000
                : dSplash <= u.splashRadius * 0.75
                ? 680
                : 380;
            this.applyDamageToUnit(
              other,
              { ...weaponSpec, splashFalloffPermille: falloffPermille },
              u.team,
              0
            );
          }
        }
        if (targetPad) this.applyDamageToPad(targetPad, weaponSpec, u.team);
        else if (targetDepot) this.applyDamageToDepot(targetDepot, weaponSpec, u.team);
        else if (targetBarracks) this.applyDamageToBarracks(targetBarracks, weaponSpec, u.team);
        else if (targetArmory) this.applyDamageToArmory(targetArmory, weaponSpec, u.team);
        else if (targetExtractor) this.applyDamageToExtractor(targetExtractor, weaponSpec, u.team);
        else if (targetObj) this.damageBarricade(targetObj, weaponSpec, u.team);
        else if (targetNexusTeam) this.applyDamageToNexus(targetNexusTeam, weaponSpec);
      } else if (targetUnit) {
        this.applyDamageToUnit(targetUnit, weaponSpec, u.team, 0);
      } else if (targetPad) {
        this.applyDamageToPad(targetPad, weaponSpec, u.team);
      } else if (targetDepot) {
        this.applyDamageToDepot(targetDepot, weaponSpec, u.team);
      } else if (targetBarracks) {
        this.applyDamageToBarracks(targetBarracks, weaponSpec, u.team);
      } else if (targetArmory) {
        this.applyDamageToArmory(targetArmory, weaponSpec, u.team);
      } else if (targetExtractor) {
        this.applyDamageToExtractor(targetExtractor, weaponSpec, u.team);
      } else if (targetObj) {
        this.damageBarricade(targetObj, weaponSpec, u.team);
      } else if (targetNexusTeam) {
        this.applyDamageToNexus(targetNexusTeam, weaponSpec);
      }
      return;
    }

    const color =
      u.team === 'neutral'
        ? '#2DD4BF'
        : u.faction === 'swarm'
        ? '#34D399'
        : u.faction === 'ironbound'
        ? u.shape === 'mortar'
          ? '#FB923C'
          : '#60A5FA'
        : '#FBBF24';

    const kind: Projectile['kind'] =
      u.shape === 'mortar'
        ? 'shell'
        : u.shape === 'spitter' || u.shape === 'mutalisk' || u.shape === 'leviathan'
        ? 'orb'
        : u.shape === 'colossus'
        ? 'beam'
        : u.shape === 'titan' || u.shape === 'gunship' || u.shape === 'valkyrie' || u.shape === 'interceptor'
        ? 'laser'
        : u.shape === 'archer'
        ? 'arrow'
        : 'bullet';

    if (!this.pvpMode && this.isPointVisibleTo('player', u.x, u.y)) {
      tacticalAudio.playAttack(kind);
    }

    this.projectiles.push({
      id: this.nextId++,
      team: u.team,
      x: u.x,
      y: u.y,
      targetX: tx,
      targetY: ty,
      targetUnitId: targetUnit?.id ?? null,
      targetPadId: targetPad?.id ?? null,
      targetDepotId: targetDepot?.id ?? null,
      targetBarracksId: targetBarracks?.id ?? null,
      targetArmoryId: targetArmory?.id ?? null,
      targetExtractorId: targetExtractor?.id ?? null,
      targetNexusTeam,
      targetObjectiveId: targetObj?.id ?? null,
      speed: kind === 'shell' ? 275 : kind === 'orb' ? 350 : kind === 'beam' ? 560 : 430,
      weaponSpec,
      canHitAir: u.canHitAir,
      splashRadius: u.splashRadius,
      slowFactor: u.corrosive ? 0.45 : 0,
      color,
      kind,
    });
  }

  private updateTowersAndNexuses(
    dt: number,
    playerVision: Array<{ x: number; y: number; r: number; detector: boolean }>,
    enemyVision: Array<{ x: number; y: number; r: number; detector: boolean }>
  ) {
    const dtMs = dtToFixedMs(dt);

    for (const pad of this.pads) {
      pad.hitFlash = Math.max(0, pad.hitFlash - dt * 4.5);
      // Towers CANNOT fire while under initial construction, during upgrade retrofitting, or if non-combat (Econ Tower)!
      if (
        !pad.towerType ||
        !pad.team ||
        pad.building ||
        pad.upgrading ||
        pad.hpFp <= 0 ||
        pad.baseDamageFp <= 0 ||
        pad.attackIntervalMs <= 0
      ) {
        continue;
      }
      pad.attackCooldownMs = Math.max(0, pad.attackCooldownMs - dtMs);
      if (pad.attackCooldownMs > 0) continue;

      const enemyTeam = pad.team === 'player' ? 'enemy' : 'player';
      const vision = pad.team === 'player' ? playerVision : enemyVision;
      let bestTarget: UnitEntity | null = null;
      let bestDist = Infinity;

      for (const u of this.units) {
        if (u.team !== enemyTeam || u.hpFp <= 0) continue;
        if (u.domain === 'air' && !pad.canHitAir) continue;
        const d = dist(pad.x, pad.y, u.x, u.y);
        if (d <= pad.range && d < bestDist && this.isUnitVisibleTo(pad.team, u, vision)) {
          bestDist = d;
          bestTarget = u;
        }
      }

      if (bestTarget) {
        pad.attackCooldownMs = pad.attackIntervalMs;
        const projKind: Projectile['kind'] =
          pad.towerType === 'artillery' ? 'shell' : pad.towerType === 'disruptor' ? 'orb' : 'laser';
        if (!this.pvpMode && (pad.team === 'player' || this.isPointVisibleTo('player', pad.x, pad.y, playerVision))) {
          tacticalAudio.playAttack(projKind);
        }
        const color =
          pad.towerType === 'artillery'
            ? '#FB923C'
            : pad.towerType === 'disruptor'
            ? '#38BDF8'
            : pad.towerType === 'tech_tower'
            ? '#C084FC'
            : pad.team === 'player'
            ? '#93C5FD'
            : '#FCD34D';

        const ownerState = pad.team === 'player' ? this.player : this.enemy;
        const radarLv = ownerState.specialTechLevels?.[1] ?? (ownerState.specialTechsDone[1] ? 1 : 0);

        // Ironbound [L] Stage 1 gives Artillery an explicit lighter AA flak weapon profile (12 + 3/lv, +6 Light); Stage 2 uses full cannon!
        const isArtilleryFlakLv1 = pad.towerType === 'artillery' && bestTarget.domain === 'air' && radarLv === 1;
        const towerWeaponSpec: WeaponAttackSpecFp = isArtilleryFlakLv1
          ? {
              baseDamageFp: toFp(12),
              attackUpgradeLevel: pad.attackUpgradeLevel,
              damagePerUpgradeFp: toFp(3),
              attackCount: 1,
              bonusVsTagFp: toTagBonusFp({ Light: 6 }),
              bonusPerUpgradeVsTagFp: toTagBonusFp({ Light: 2 }),
            }
          : {
              baseDamageFp: pad.baseDamageFp,
              attackUpgradeLevel: pad.attackUpgradeLevel,
              damagePerUpgradeFp: pad.damagePerUpgradeFp,
              attackCount: pad.attackCount,
              bonusVsTagFp: cloneTagBonusFp(pad.bonusVsTagFp),
              bonusPerUpgradeVsTagFp: cloneTagBonusFp(pad.bonusPerUpgradeVsTagFp),
            };

        this.projectiles.push({
          id: this.nextId++,
          team: pad.team,
          x: pad.x,
          y: pad.y - 6,
          targetX: bestTarget.x,
          targetY: bestTarget.y,
          targetUnitId: bestTarget.id,
          targetPadId: null,
          targetDepotId: null,
          targetNexusTeam: null,
          targetObjectiveId: null,
          speed: pad.towerType === 'artillery' ? 310 : 460,
          weaponSpec: towerWeaponSpec,
          canHitAir: pad.canHitAir,
          splashRadius: pad.splashRadius,
          slowFactor: pad.slowFactor,
          color,
          kind: projKind,
        });
      }
    }

    const nexuses: Array<{ team: 'player' | 'enemy'; state: TeamState; pos: Vec2; vision: typeof playerVision }> = [
      { team: 'player', state: this.player, pos: PLAYER_NEXUS_POS, vision: playerVision },
      { team: 'enemy', state: this.enemy, pos: ENEMY_NEXUS_POS, vision: enemyVision },
    ];
    for (const nx of nexuses) {
      nx.state.nexusAttackCooldownMs = Math.max(0, nx.state.nexusAttackCooldownMs - dtMs);
      if (nx.state.nexusAttackCooldownMs > 0) continue;
      const enemyTeam = nx.team === 'player' ? 'enemy' : 'player';
      let target: UnitEntity | null = null;
      let bestD = Infinity;
      for (const u of this.units) {
        if (u.team !== enemyTeam || u.hpFp <= 0) continue;
        const d = dist(nx.pos.x, nx.pos.y, u.x, u.y);
        if (d <= NEXUS_RANGE && d < bestD && this.isUnitVisibleTo(nx.team, u, nx.vision)) {
          bestD = d;
          target = u;
        }
      }
      if (target) {
        nx.state.nexusAttackCooldownMs = NEXUS_ATTACK_INTERVAL_MS;
        if (!this.pvpMode && (nx.team === 'player' || this.isPointVisibleTo('player', nx.pos.x, nx.pos.y, playerVision))) {
          tacticalAudio.playAttack('laser');
        }
        const nexusSpec: WeaponAttackSpecFp = {
          baseDamageFp: toFp(NEXUS_DAMAGE),
          attackUpgradeLevel: 0,
          damagePerUpgradeFp: 0,
          attackCount: NEXUS_ATTACK_COUNT,
          bonusVsTagFp: toTagBonusFp(NEXUS_BONUS_VS_TAG),
          bonusPerUpgradeVsTagFp: {},
        };
        this.projectiles.push({
          id: this.nextId++,
          team: nx.team,
          x: nx.pos.x,
          y: nx.pos.y - 10,
          targetX: target.x,
          targetY: target.y,
          targetUnitId: target.id,
          targetPadId: null,
          targetDepotId: null,
          targetNexusTeam: null,
          targetObjectiveId: null,
          speed: 480,
          weaponSpec: nexusSpec,
          canHitAir: true,
          splashRadius: 0,
          slowFactor: 0,
          color: FACTIONS[nx.state.faction].accentLightHex,
          kind: 'laser',
        });
      }
    }
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.targetUnitId !== null) {
        const u = this.units.find((unit) => unit.id === p.targetUnitId);
        if (u && u.hpFp > 0) {
          p.targetX = u.x;
          p.targetY = u.y;
        }
      }

      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.speed * dt;

      if (d <= step + 6) {
        this.resolveProjectileImpact(p);
        this.projectiles.splice(i, 1);
      } else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
    }
  }

  private resolveProjectileImpact(p: Projectile) {
    const visibleToPlayer = this.isPointVisibleTo('player', p.targetX, p.targetY);
    if (visibleToPlayer) {
      if (p.splashRadius > 0) {
        this.spawnRingParticle(p.targetX, p.targetY, p.color, p.splashRadius);
        this.spawnParticles(p.targetX, p.targetY, p.color, 10, 95, 3.2);
        if (!this.pvpMode) tacticalAudio.playImpact(p.splashRadius >= 40 || p.kind === 'shell');
      } else {
        this.spawnParticles(p.targetX, p.targetY, p.color, 4, 55, 2.4);
        if (!this.pvpMode && (p.targetPadId || p.targetNexusTeam)) {
          tacticalAudio.playImpact(false);
        }
      }
    }

    if (p.splashRadius > 0) {
      for (const u of this.units) {
        if (u.team === p.team || u.hpFp <= 0) continue;
        if (u.domain === 'air' && !p.canHitAir) continue;
        const dSplash = dist(u.x, u.y, p.targetX, p.targetY);
        if (dSplash <= p.splashRadius + u.radius) {
          // Pure integer permille splash falloff: 1000 (100%) core, 680 (68%) mid-ring, 380 (38%) outer edge!
          const isDirect = p.targetUnitId !== null && u.id === p.targetUnitId;
          const falloffPermille =
            isDirect || dSplash <= p.splashRadius * 0.42
              ? 1000
              : dSplash <= p.splashRadius * 0.75
              ? 680
              : 380;
          this.applyDamageToUnit(
            u,
            { ...p.weaponSpec, splashFalloffPermille: falloffPermille },
            p.team,
            p.slowFactor
          );
        }
      }
    } else if (p.targetUnitId !== null) {
      const target = this.units.find((u) => u.id === p.targetUnitId);
      if (target && target.hpFp > 0) {
        this.applyDamageToUnit(target, p.weaponSpec, p.team, p.slowFactor);
      }
    }

    if (p.targetPadId) {
      const pad = this.pads.find((tp) => tp.id === p.targetPadId);
      if (pad && (pad.towerType || pad.building) && pad.hpFp > 0) {
        this.applyDamageToPad(pad, p.weaponSpec, p.team);
      }
    } else if (p.targetDepotId) {
      const dep = this.depots.find((d) => d.id === p.targetDepotId);
      if (dep && (dep.built || dep.building) && dep.hpFp > 0) {
        this.applyDamageToDepot(dep, p.weaponSpec, p.team);
      }
    } else if (p.targetBarracksId) {
      const bk = this.barracks.find((b) => b.id === p.targetBarracksId);
      if (bk && (bk.built || bk.building) && bk.hpFp > 0) {
        this.applyDamageToBarracks(bk, p.weaponSpec, p.team);
      }
    } else if (p.targetArmoryId) {
      const arm = this.armories.find((a) => a.id === p.targetArmoryId);
      if (arm && (arm.built || arm.building) && arm.hpFp > 0) {
        this.applyDamageToArmory(arm, p.weaponSpec, p.team);
      }
    } else if (p.targetExtractorId) {
      const ext = this.extractors.find((e) => e.id === p.targetExtractorId);
      if (ext && (ext.built || ext.building) && ext.hpFp > 0) {
        this.applyDamageToExtractor(ext, p.weaponSpec, p.team);
      }
    } else if (p.targetObjectiveId) {
      const obj = this.objectives.find((o) => o.id === p.targetObjectiveId);
      if (obj && !obj.cleared) {
        this.damageBarricade(obj, p.weaponSpec, p.team);
      }
    } else if (p.targetNexusTeam) {
      this.applyDamageToNexus(p.targetNexusTeam, p.weaponSpec);
    }
  }

  private applyDamageToUnit(
    target: UnitEntity,
    weaponSpec: WeaponAttackSpecFp,
    attackerTeam: TeamId,
    slowFactor = 0
  ) {
    if (target.hpFp <= 0) return;

    const attackerState = attackerTeam === 'player' ? this.player : attackerTeam === 'enemy' ? this.enemy : null;
    const defenderState = target.team === 'player' ? this.player : target.team === 'enemy' ? this.enemy : null;

    // Pure Deterministic Fixed-Point Flat-Subtraction Resolution!
    // Handles: Attribute Tag flat bonuses, Multi-Hit independent armor subtraction, Shield Armor + Overflow, and 0.5 (500) floor!
    const defense: DefenseProfileFp = {
      hpFp: target.hpFp,
      shieldFp: target.shieldFp,
      baseArmorFp: target.baseArmorFp,
      armorUpgradeLevel: target.armorUpgradeLevel,
      armorPerUpgradeFp: target.armorPerUpgradeFp,
      baseShieldArmorFp: target.baseShieldArmorFp,
      shieldArmorUpgradeLevel: target.shieldArmorUpgradeLevel,
      shieldArmorPerUpgradeFp: target.shieldArmorPerUpgradeFp,
      attributes: target.attributes,
    };
    const res = resolveDeterministicAttackFp(weaponSpec, defense);

    target.shieldFp = res.remainingShieldFp;
    target.hpFp = res.remainingHpFp;
    target.shield = Math.ceil(target.shieldFp / FP_SCALE);
    target.hp = Math.ceil(target.hpFp / FP_SCALE);

    if (slowFactor > 0) {
      target.slowTimer = 2.2;
    }

    target.outOfCombatTimer = 0;
    target.hitFlash = 1;

    // Provoke passive early-game jungle camp only when actually attacked!
    if (target.team === 'neutral' && target.isJungleCreep) {
      target.provokedTimer = 14;
      for (const sibling of this.units) {
        if (sibling.team === 'neutral' && sibling.isJungleCreep && sibling.hpFp > 0 && dist(sibling.x, sibling.y, target.x, target.y) <= 140) {
          sibling.provokedTimer = 14;
        }
      }
    }

    if (target.team === 'player') {
      if (this.laneAlertTimers[target.lane] <= 0.1 && !this.pvpMode) {
        tacticalAudio.playAlert(false);
      }
      this.laneAlertTimers[target.lane] = 3.5;
    } else if (target.team === 'enemy') {
      this.enemyLaneAlertTimers[target.lane] = 3.5;
    }

    if (target.hpFp <= 0) {
      target.hpFp = 0;
      target.hp = 0;
      if (defenderState) defenderState.unitsLost++;

      const visible = this.isPointVisibleTo('player', target.x, target.y);
      if (visible) {
        if (!this.pvpMode && !target.isBoss) {
          tacticalAudio.playImpact(target.armorClass === 'heavy');
        }
        this.spawnParticles(
          target.x,
          target.y,
          target.team === 'neutral'
            ? '#2DD4BF'
            : target.faction === 'dawn'
            ? '#FBBF24'
            : target.faction === 'swarm'
            ? '#34D399'
            : '#60A5FA',
          target.isBoss ? 26 : 10,
          target.isBoss ? 140 : 80,
          target.isBoss ? 4.5 : 3
        );
      }

      // Swarm [L] Special Tech ("酸蝕孢子防空網 I/II"): Acid death splash around fallen Swarm units!
      const swarmLLv = defenderState
        ? (defenderState.specialTechLevels?.[1] ?? (defenderState.specialTechsDone[1] ? 1 : 0))
        : 0;
      if (defenderState && defenderState.faction === 'swarm' && swarmLLv >= 1 && !target.suicidal) {
        const acidRadius = swarmLLv >= 2 ? 58 : 48;
        if (visible) this.spawnRingParticle(target.x, target.y, '#10B981', acidRadius);
        const acidSpec: WeaponAttackSpecFp = {
          baseDamageFp: toFp(swarmLLv >= 2 ? 11 : 7),
          attackUpgradeLevel: 0,
          damagePerUpgradeFp: 0,
          attackCount: 1,
          bonusVsTagFp: toTagBonusFp({ Light: swarmLLv >= 2 ? 9 : 5 }),
          bonusPerUpgradeVsTagFp: {},
        };
        for (const near of this.units) {
          if (near.team !== target.team && near.hpFp > 0 && dist(target.x, target.y, near.x, near.y) <= acidRadius) {
            this.applyDamageToUnit(near, acidSpec, target.team, 0.35);
          }
        }
      }

      // Killing enemy units gives 0G unless killer is Swarm (passive biomass harvest scaled by unit supply) or target is Neutral!
      // Guard against friendly-fire kills granting Swarm biomass gold!
      if (attackerState) {
        const isNeutralTarget = target.team === 'neutral';
        let swarmBiomass = 0;
        if (attackerState.faction === 'swarm' && !isNeutralTarget && target.team !== attackerTeam) {
          const killedDef = ALL_UNITS_BY_ID[target.defId];
          const unitSupply = killedDef ? killedDef.supplyCost / killedDef.squadSize : 1;
          const attackerLLv = attackerState.specialTechLevels?.[1] ?? (attackerState.specialTechsDone[1] ? 1 : 0);
          const ratePerSupply = attackerLLv >= 2 ? 6 : 4;
          swarmBiomass = Math.max(3, Math.round(unitSupply * ratePerSupply));
        }
        const totalBounty = (isNeutralTarget ? target.bountyGold : 0) + swarmBiomass;
        if (totalBounty > 0) {
          attackerState.gold += totalBounty;
          if (attackerTeam === 'player' && visible) {
            this.addFloatingText(
              target.x,
              target.y - 12,
              `+${totalBounty}G`,
              swarmBiomass > 0 && !isNeutralTarget ? '#6EE7B7' : '#FCD34D'
            );
          }
        }
      }

      if (target.isBoss && (attackerTeam === 'player' || attackerTeam === 'enemy')) {
        this.hitstopTimer = 0.06;
        this.addShake(9, 0.35);
        if (!this.pvpMode) tacticalAudio.playExplosion();
        const killerState = attackerTeam === 'player' ? this.player : this.enemy;
        const scale = this.activeEvent?.entityId === target.id ? this.activeEvent.powerScale ?? this.getEventScale() : this.getEventScale();
        killerState.objectivesClaimed++;
        this.spawnCapturedVanguard(attackerTeam, target.lane, target.x, target.y, scale);
        this.pushIntelFor(
          attackerTeam,
          `野區大捷：擊殺迷霧巨像 [${scale.toFixed(1)}×]！強化先鋒巨像已投入${LANE_SHORT_NAMES[target.lane]}推進！`,
          'info'
        );
        // No global buff granted -> do NOT leak fog-of-war capture to opponent
        if (this.activeEvent?.entityId === target.id) {
          this.activeEvent = null;
          this.nextEventCountdown = this.getNextEventCooldown();
        }
      }

      if (target.defId === 'merc_guardian' && (attackerTeam === 'player' || attackerTeam === 'enemy')) {
        this.addShake(6, 0.25);
        if (!this.pvpMode) tacticalAudio.playEventHorn();
        const killerState = attackerTeam === 'player' ? this.player : this.enemy;
        const scale = this.activeEvent?.entityId === target.id ? this.activeEvent.powerScale ?? this.getEventScale() : this.getEventScale();
        killerState.objectivesClaimed++;
        this.spawnMercReinforcement(attackerTeam, target.lane, target.x, target.y, scale);
        this.pushIntelFor(
          attackerTeam,
          `傭兵招募完成：擊破精銳傭兵裂隙 (+${target.bountyGold}G)，精銳增援已投入${LANE_SHORT_NAMES[target.lane]}！`,
          'info'
        );
        // No global buff granted -> do NOT leak fog-of-war capture to opponent
        if (this.activeEvent?.entityId === target.id) {
          this.activeEvent = null;
          this.nextEventCountdown = this.getNextEventCooldown();
        }
      }

      if (target.defId === 'overdrive_core' && (attackerTeam === 'player' || attackerTeam === 'enemy')) {
        if (!this.pvpMode) tacticalAudio.playEventHorn();
        const killerState = attackerTeam === 'player' ? this.player : this.enemy;
        const oppTeam: 'player' | 'enemy' = attackerTeam === 'player' ? 'enemy' : 'player';
        const scale = this.activeEvent?.entityId === target.id ? this.activeEvent.powerScale ?? this.getEventScale() : this.getEventScale();
        const refill = Math.round(650 * scale);
        killerState.objectivesClaimed++;
        killerState.nexusGoldReserve = Math.min(NEXUS_GOLD_RESERVE, killerState.nexusGoldReserve + refill);
        for (const pad of this.pads) {
          if (pad.team === attackerTeam && pad.towerType && !pad.building) {
            pad.goldReserve = Math.min(pad.goldReserveMax, pad.goldReserve + refill);
          }
        }
        killerState.globalAttackBuffTimer = Math.max(killerState.globalAttackBuffTimer, 14);
        this.spawnRingParticle(target.x, target.y, '#FBBF24', 110);
        this.addFloatingText(target.x, target.y - 20, `礦脈湧流 +${refill}G 儲量!`, '#FDE047');
        this.pushIntelFor(
          attackerTeam,
          `奪取星脈黃金湧流！+${target.bountyGold}G 且全軍強化 14 秒、全礦補充 +${refill}G！`,
          'info'
        );
        // Global team-wide buff granted -> alert opponent
        this.pushIntelFor(oppTeam, `警報：敵軍奪取星脈黃金湧流，敵方全軍獲得 14 秒強化增益！`, 'warn');
        if (this.activeEvent?.entityId === target.id) {
          this.activeEvent = null;
          this.nextEventCountdown = this.getNextEventCooldown();
        }
      }

      if (target.defId === 'supply_crate' && (attackerTeam === 'player' || attackerTeam === 'enemy')) {
        const killerState = attackerTeam === 'player' ? this.player : this.enemy;
        const oppTeam: 'player' | 'enemy' = attackerTeam === 'player' ? 'enemy' : 'player';
        killerState.objectivesClaimed++;
        killerState.globalAttackBuffTimer = Math.max(killerState.globalAttackBuffTimer, 10);
        this.pushIntelFor(attackerTeam, `奪取高能空投物資！獲得 +${target.bountyGold}G 與全軍 10 秒士氣鼓舞`, 'info');
        // Global team-wide buff granted -> alert opponent
        this.pushIntelFor(oppTeam, `警報：敵軍奪取野區物資，敵方全軍獲得 10 秒士氣強化！`, 'warn');
        if (this.activeEvent?.entityId === target.id) {
          this.activeEvent = null;
          this.nextEventCountdown = this.getNextEventCooldown();
        }
      }

      if (target.defId === 'neutral_creep' && target.homePos && (attackerTeam === 'player' || attackerTeam === 'enemy')) {
        const camp = this.objectives.find(
          (o) => o.kind === 'creep_camp' && !o.cleared && dist(o.x, o.y, target.homePos!.x, target.homePos!.y) < 40
        );
        if (camp) {
          const remaining = this.units.filter(
            (u) => u.defId === 'neutral_creep' && u.hpFp > 0 && u.homePos && dist(u.homePos.x, u.homePos.y, camp.x, camp.y) < 40
          );
          if (remaining.length === 0) {
            camp.cleared = true;
            camp.owner = attackerTeam;
            camp.respawnTimer = 85;
            const st = attackerTeam === 'player' ? this.player : this.enemy;
            const oppTeam: 'player' | 'enemy' = attackerTeam === 'player' ? 'enemy' : 'player';
            st.gold += 110;
            st.globalAttackBuffTimer = Math.max(st.globalAttackBuffTimer, 18);
            st.objectivesClaimed++;
            this.addFloatingText(camp.x, camp.y - 18, '+110G 全軍鼓舞!', '#34D399');
            this.pushIntelFor(attackerTeam, `清剿野區魔獸營地！+110G 且全軍獲得 18 秒強化！`, 'info');
            // Global team-wide buff granted -> alert opponent
            this.pushIntelFor(oppTeam, `警報：敵軍清剿野區營地，敵方全軍獲得 18 秒強化增益！`, 'warn');
            if (attackerTeam === 'player' && !this.pvpMode) tacticalAudio.playEventHorn();
          }
        }
      }
    }
  }

  private applyDamageToPad(pad: TowerPad, weaponSpec: WeaponAttackSpecFp, attackerTeam: TeamId) {
    if (pad.hpFp <= 0) return;
    // Towers under construction have unified fragile defenses: 0/0 armor & +25% damage taken from all sources
    const isFragileConstruction = pad.building;
    const res = resolveDeterministicAttackFp(weaponSpec, {
      hpFp: pad.hpFp,
      shieldFp: 0,
      baseArmorFp: isFragileConstruction ? 0 : pad.baseArmorFp,
      armorUpgradeLevel: isFragileConstruction ? 0 : pad.armorUpgradeLevel,
      armorPerUpgradeFp: isFragileConstruction ? 0 : pad.armorPerUpgradeFp,
      baseShieldArmorFp: 0,
      shieldArmorUpgradeLevel: 0,
      shieldArmorPerUpgradeFp: 0,
      attributes: pad.attributes,
    });
    const finalHpFp = isFragileConstruction
      ? Math.max(0, pad.hpFp - Math.round((res.hpDamageFp * 1250) / 1000))
      : res.remainingHpFp;
    pad.hpFp = finalHpFp;
    pad.hp = Math.ceil(pad.hpFp / FP_SCALE);
    pad.hitFlash = 1;
    if (pad.team === 'player') {
      if (this.laneAlertTimers[pad.lane] <= 0.1 && !this.pvpMode) {
        tacticalAudio.playAlert(false);
      }
      this.laneAlertTimers[pad.lane] = 4.0;
    } else if (pad.team === 'enemy') {
      this.enemyLaneAlertTimers[pad.lane] = 4.0;
    }
    if (pad.hpFp <= 0) {
      this.destroyTower(pad, attackerTeam);
      return;
    }

    // Tower Downgrade Mechanic: losing extra HP granted by upgrades pops upgrade(s) & reverts stats/traits!
    if (pad.towerType && !pad.building && pad.upgradeStack.length > 0) {
      let nextCombat = Math.max(1, pad.combatLevel) as 1 | 2 | 3;
      let nextMining = pad.miningLevel;
      let nextTech = pad.techLevel;
      const lostModes: TowerUpgradeMode[] = [];

      while (
        pad.upgradeStack.length > 0 &&
        pad.hpFp <= pad.upgradeStack[pad.upgradeStack.length - 1].thresholdHpFp
      ) {
        const popped = pad.upgradeStack.pop()!;
        lostModes.push(popped.mode);
        if (popped.mode === 'combat' && nextCombat > 1) {
          nextCombat = (nextCombat - 1) as 1 | 2 | 3;
        } else if (popped.mode === 'mining' && nextMining > 0) {
          nextMining = (nextMining - 1) as 0 | 1 | 2;
        } else if (popped.mode === 'tech' && nextTech > 0) {
          nextTech = (nextTech - 1) as 0 | 1 | 2;
        }
      }

      if (lostModes.length > 0) {
        this.applyTowerStats(pad, pad.towerType, nextCombat, nextMining, nextTech);
        pad.hpFp = Math.min(pad.maxHpFp, pad.hpFp);
        pad.hp = Math.ceil(pad.hpFp / FP_SCALE);
        const modeNames = lostModes
          .map((m) => (m === 'mining' ? '擴礦' : m === 'tech' ? '科技' : '強化'))
          .join('+');
        this.addFloatingText(pad.x, pad.y - 26, `防禦塔降級！失去${modeNames}`, '#FB7185');
        if (pad.team) {
          this.pushIntelFor(
            pad.team,
            `警報：${LANE_SHORT_NAMES[pad.lane]}${TOWER_DEFS[pad.towerType].name}額外裝甲遭擊破，降級並失去【${modeNames}】特性！`,
            'warn'
          );
        }
      }
    }
  }

  private destroyTower(pad: TowerPad, attackerTeam: TeamId) {
    const oldName = pad.towerType
      ? TOWER_DEFS[pad.towerType].name
      : pad.pendingTowerType
      ? `${TOWER_DEFS[pad.pendingTowerType].name}(建造中)`
      : '防禦塔';
    pad.hp = 0;
    pad.maxHp = 0;
    pad.hpFp = 0;
    pad.maxHpFp = 0;
    pad.team = null;
    pad.towerType = null;
    pad.pendingTowerType = null;
    pad.pendingUpgradeMode = null;
    pad.building = false;
    pad.upgrading = false;
    pad.level = 0;
    pad.combatLevel = 0;
    pad.miningLevel = 0;
    pad.techLevel = 0;
    pad.upgradeStack = [];
    pad.harassTimer = 0;
    pad.harassState = 'ok';
    pad.harassEffPermille = 1000;
    pad.armor = 0;
    pad.baseArmorFp = 0;
    pad.armorUpgradeLevel = 0;
    pad.damage = 0;
    pad.baseDamageFp = 0;
    pad.attackUpgradeLevel = 0;
    pad.attackIntervalMs = 0;
    pad.attackRate = 0;
    pad.attackCooldownMs = 0;
    pad.vision = 0;
    pad.detector = false;
    pad.canHitAir = false;

    this.hitstopTimer = 0.045;
    this.addShake(7, 0.25);
    this.spawnRingParticle(pad.x, pad.y, '#F97316', 65);
    this.spawnParticles(pad.x, pad.y, '#FDBA74', 20, 120, 4);
    if (!this.pvpMode) tacticalAudio.playExplosion();

    // Destroying enemy buildings grants ZERO gold bounty — reward is denying opponent's mine & territory!
    if (attackerTeam === 'player' || attackerTeam === 'enemy') {
      const oppTeam: 'player' | 'enemy' = attackerTeam === 'player' ? 'enemy' : 'player';
      this.addFloatingText(pad.x, pad.y - 20, '摧毀敵塔 · 斷礦！', '#FB923C');
      this.pushIntelFor(attackerTeam, `摧毀了${LANE_SHORT_NAMES[pad.lane]}敵方${oldName}，成功切斷其區塊採礦！`, 'info');
      this.pushIntelFor(oppTeam, `警報：我方${LANE_SHORT_NAMES[pad.lane]}${oldName}被摧毀，該區塊金礦開採中斷！`, 'critical');
    }
  }

  private applyDamageToDepot(depot: SupplyDepot, weaponSpec: WeaponAttackSpecFp, attackerTeam: TeamId) {
    if (depot.hpFp <= 0) return;
    const res = resolveDeterministicAttackFp(weaponSpec, {
      hpFp: depot.hpFp,
      shieldFp: 0,
      baseArmorFp: depot.baseArmorFp,
      armorUpgradeLevel: 0,
      armorPerUpgradeFp: 0,
      baseShieldArmorFp: 0,
      shieldArmorUpgradeLevel: 0,
      shieldArmorPerUpgradeFp: 0,
      attributes: depot.attributes,
    });
    depot.hpFp = res.remainingHpFp;
    depot.hp = Math.ceil(depot.hpFp / FP_SCALE);
    depot.hitFlash = 1;
    if (depot.hpFp <= 0) {
      depot.hpFp = 0;
      depot.hp = 0;
      depot.built = false;
      depot.building = false;
      this.spawnRingParticle(depot.x, depot.y, '#F97316', 45);
      this.spawnParticles(depot.x, depot.y, '#FDBA74', 14, 95, 3.5);
      if (!this.pvpMode) tacticalAudio.playExplosion();
      this.pushIntelFor(depot.team, '警報：一座我方補給站遭摧毀，人口上限下降！', 'critical');
      if (attackerTeam === 'player' || attackerTeam === 'enemy') {
        this.addFloatingText(depot.x, depot.y - 18, '摧毀敵方補給站', '#FB923C');
      }
    }
  }

  private applyDamageToBarracks(bk: BarracksBuilding, weaponSpec: WeaponAttackSpecFp, attackerTeam: TeamId) {
    if (bk.hpFp <= 0) return;
    const res = resolveDeterministicAttackFp(weaponSpec, {
      hpFp: bk.hpFp,
      shieldFp: 0,
      baseArmorFp: bk.baseArmorFp,
      armorUpgradeLevel: 0,
      armorPerUpgradeFp: 0,
      baseShieldArmorFp: 0,
      shieldArmorUpgradeLevel: 0,
      shieldArmorPerUpgradeFp: 0,
      attributes: bk.attributes,
    });
    bk.hpFp = res.remainingHpFp;
    bk.hp = Math.ceil(bk.hpFp / FP_SCALE);
    bk.hitFlash = 1;
    const def = BARRACKS_DEFS[bk.tier];
    if (bk.hpFp <= 0) {
      bk.hpFp = 0;
      bk.hp = 0;
      bk.built = false;
      bk.building = false;
      bk.level = 0;
      bk.upgradeThresholdsFp = [];
      this.spawnRingParticle(bk.x, bk.y, '#F97316', 50);
      this.spawnParticles(bk.x, bk.y, '#FDBA74', 16, 100, 3.8);
      if (!this.pvpMode) tacticalAudio.playExplosion();
      this.pushIntelFor(bk.team, `警報：我方【${def.name}】遭摧毀，${def.hotkeysLabel} 並行產兵與專屬兵解鎖中斷！`, 'critical');
      if (attackerTeam === 'player' || attackerTeam === 'enemy') {
        this.addFloatingText(bk.x, bk.y - 18, `摧毀敵方${def.name}`, '#FB923C');
      }
      if (!this.pvpMode) this.emitSnapshot();
      return;
    }

    // Barracks Downgrade Mechanic: losing extra HP granted by Lv.2–4 upgrades knocks off level(s) first!
    if (bk.built && bk.level > 1) {
      let droppedLevels = 0;
      while (bk.level > 1) {
        const fallbackThresholdFp = toFp(getBarracksHpForLevel(bk.tier, (bk.level - 1) as 1 | 2 | 3));
        const topThresholdFp =
          bk.upgradeThresholdsFp.length > 0
            ? bk.upgradeThresholdsFp[bk.upgradeThresholdsFp.length - 1]
            : fallbackThresholdFp;
        if (bk.hpFp > topThresholdFp) break;
        if (bk.upgradeThresholdsFp.length > 0) bk.upgradeThresholdsFp.pop();
        bk.level = (bk.level - 1) as 1 | 2 | 3;
        droppedLevels++;
      }

      if (droppedLevels > 0) {
        const newMaxHp = getBarracksHpForLevel(bk.tier, bk.level);
        bk.maxHp = newMaxHp;
        bk.maxHpFp = toFp(newMaxHp);
        bk.hpFp = Math.min(bk.maxHpFp, bk.hpFp);
        bk.hp = Math.ceil(bk.hpFp / FP_SCALE);
        this.spawnRingParticle(bk.x, bk.y, '#FB7185', 42);
        this.addFloatingText(bk.x, bk.y - 26, `${def.shortName}降級至 Lv.${bk.level}！`, '#FB7185');
        this.pushIntelFor(
          bk.team,
          `警報：我方【${def.name}】額外血量遭擊破，降級至 Lv.${bk.level}（並行產兵上限降至 ${bk.level} 組），需重新升級！`,
          'warn'
        );
        if (attackerTeam === 'player' || attackerTeam === 'enemy') {
          this.pushIntelFor(
            attackerTeam,
            `成功擊破敵方【${def.name}】升級裝甲，使其降級至 Lv.${bk.level}！`,
            'info'
          );
        }
        if (!this.pvpMode) this.emitSnapshot();
      }
    }
  }

  private applyDamageToArmory(arm: ArmoryBuilding, weaponSpec: WeaponAttackSpecFp, attackerTeam: TeamId) {
    if (arm.hpFp <= 0) return;
    const res = resolveDeterministicAttackFp(weaponSpec, {
      hpFp: arm.hpFp,
      shieldFp: 0,
      baseArmorFp: arm.baseArmorFp,
      armorUpgradeLevel: 0,
      armorPerUpgradeFp: 0,
      baseShieldArmorFp: 0,
      shieldArmorUpgradeLevel: 0,
      shieldArmorPerUpgradeFp: 0,
      attributes: arm.attributes,
    });
    arm.hpFp = res.remainingHpFp;
    arm.hp = Math.ceil(arm.hpFp / FP_SCALE);
    arm.hitFlash = 1;
    const def = ARMORY_BUILDING_DEFS[arm.kind];
    if (arm.hpFp <= 0) {
      arm.hpFp = 0;
      arm.hp = 0;
      arm.built = false;
      arm.building = false;
      arm.paidGold = 0;
      this.spawnRingParticle(arm.x, arm.y, '#F97316', 46);
      this.spawnParticles(arm.x, arm.y, '#FDBA74', 15, 95, 3.5);
      if (!this.pvpMode) tacticalAudio.playExplosion();
      this.pushIntelFor(arm.team, `警報：我方【${def.name}】遭摧毀，相關攻防研發需重建前置建築！`, 'critical');
      if (attackerTeam === 'player' || attackerTeam === 'enemy') {
        this.addFloatingText(arm.x, arm.y - 18, `摧毀敵方${def.shortName}`, '#FB923C');
      }
      if (!this.pvpMode) this.emitSnapshot();
    }
  }

  private applyDamageToExtractor(ext: GasExtractor, weaponSpec: WeaponAttackSpecFp, attackerTeam: TeamId) {
    if (ext.hpFp <= 0) return;
    const res = resolveDeterministicAttackFp(weaponSpec, {
      hpFp: ext.hpFp,
      shieldFp: 0,
      baseArmorFp: ext.baseArmorFp,
      armorUpgradeLevel: 0,
      armorPerUpgradeFp: 0,
      baseShieldArmorFp: 0,
      shieldArmorUpgradeLevel: 0,
      shieldArmorPerUpgradeFp: 0,
      attributes: ext.attributes,
    });
    ext.hpFp = res.remainingHpFp;
    ext.hp = Math.ceil(ext.hpFp / FP_SCALE);
    ext.hitFlash = 1;
    if (ext.hpFp <= 0) {
      const oldTeam = ext.team;
      ext.hpFp = 0;
      ext.hp = 0;
      ext.team = null;
      ext.built = false;
      ext.building = false;
      ext.upgrading = false;
      ext.level = 0;
      ext.upgradeThresholdsFp = [];
      ext.paidGold = 0;
      this.spawnRingParticle(ext.x, ext.y, '#14B8A6', 46);
      this.spawnParticles(ext.x, ext.y, '#5EEAD4', 15, 95, 3.5);
      if (!this.pvpMode) tacticalAudio.playExplosion();
      if (oldTeam) {
        this.pushIntelFor(oldTeam, '警報：一座我方瓦斯挖掘場遭摧毀，瓦斯開採受損！', 'critical');
      }
      if (attackerTeam === 'player' || attackerTeam === 'enemy') {
        this.addFloatingText(ext.x, ext.y - 18, '摧毀敵方瓦斯場', '#2DD4BF');
      }
      if (!this.pvpMode) this.emitSnapshot();
      return;
    }

    // Extractor Downgrade Mechanic: losing extra HP knocks off upgrade level first!
    if (ext.built && ext.level > 1) {
      let droppedLevels = 0;
      while (ext.level > 1) {
        const prevLv = (ext.level - 1) as 1 | 2;
        const fallbackThresholdFp = toFp(getGasExtractorHpForLevel(prevLv));
        const topThresholdFp =
          ext.upgradeThresholdsFp.length > 0
            ? ext.upgradeThresholdsFp[ext.upgradeThresholdsFp.length - 1]
            : fallbackThresholdFp;
        if (ext.hpFp > topThresholdFp) break;
        if (ext.upgradeThresholdsFp.length > 0) ext.upgradeThresholdsFp.pop();
        ext.level = prevLv;
        droppedLevels++;
      }
      if (droppedLevels > 0) {
        const newMaxHp = getGasExtractorHpForLevel(ext.level as 1 | 2);
        ext.maxHp = newMaxHp;
        ext.maxHpFp = toFp(newMaxHp);
        ext.hpFp = Math.min(ext.maxHpFp, ext.hpFp);
        ext.hp = Math.ceil(ext.hpFp / FP_SCALE);
        this.spawnRingParticle(ext.x, ext.y, '#FB7185', 38);
        this.addFloatingText(ext.x, ext.y - 24, `瓦斯場降級至 Lv.${ext.level}！`, '#FB7185');
        if (ext.team) {
          this.pushIntelFor(ext.team, `警報：我方瓦斯挖掘場降級至 Lv.${ext.level}，採氣效率降低！`, 'warn');
        }
        if (!this.pvpMode) this.emitSnapshot();
      }
    }
  }

  private damageBarricade(obj: NeutralObjective, weaponSpec: WeaponAttackSpecFp, attackerTeam: TeamId) {
    if (obj.cleared || obj.hpFp <= 0) return;
    const res = resolveDeterministicAttackFp(weaponSpec, {
      hpFp: obj.hpFp,
      shieldFp: 0,
      baseArmorFp: obj.baseArmorFp,
      armorUpgradeLevel: 0,
      armorPerUpgradeFp: 0,
      baseShieldArmorFp: 0,
      shieldArmorUpgradeLevel: 0,
      shieldArmorPerUpgradeFp: 0,
      attributes: obj.attributes,
    });
    obj.hpFp = res.remainingHpFp;
    obj.hp = Math.ceil(obj.hpFp / FP_SCALE);
    obj.hitFlash = 1;
    if (obj.hpFp <= 0) {
      obj.hpFp = 0;
      obj.hp = 0;
      obj.cleared = true;
      obj.owner = attackerTeam;
      this.hitstopTimer = 0.05;
      this.addShake(8, 0.3);
      this.spawnRingParticle(obj.x, obj.y, '#94A3B8', 75);
      this.spawnParticles(obj.x, obj.y, '#CBD5E1', 24, 130, 4.2);
      if (!this.pvpMode) tacticalAudio.playExplosion();

      if (attackerTeam === 'player' || attackerTeam === 'enemy') {
        const attState = attackerTeam === 'player' ? this.player : this.enemy;
        attState.gold += 110;
        attState.objectivesClaimed++;
        this.addFloatingText(obj.x, obj.y - 22, '突破路障 +110G', '#34D399');
        this.pushIntelFor(attackerTeam, `${LANE_SHORT_NAMES[obj.lane]}遠古路障已被我軍轟開！`, 'info');
        // Barricade demolition is NOT reported to the opponent (preserves Fog-of-War secrecy)
      }
    }
  }

  private applyDamageToNexus(targetTeam: 'player' | 'enemy', weaponSpec: WeaponAttackSpecFp) {
    const state = targetTeam === 'player' ? this.player : this.enemy;
    if (state.nexusHpFp <= 0) return;
    const res = resolveDeterministicAttackFp(weaponSpec, {
      hpFp: state.nexusHpFp,
      shieldFp: 0,
      baseArmorFp: toFp(NEXUS_ARMOR),
      armorUpgradeLevel: 0,
      armorPerUpgradeFp: 0,
      baseShieldArmorFp: 0,
      shieldArmorUpgradeLevel: 0,
      shieldArmorPerUpgradeFp: 0,
      attributes: NEXUS_ATTRIBUTES,
    });
    state.nexusHpFp = res.remainingHpFp;
    state.nexusHp = Math.ceil(state.nexusHpFp / FP_SCALE);
    state.nexusHitFlash = 1;
    // Nexus Extra Plating Break: losing extra HP drops home mining efficiency until repaired!
    if (!state.nexusPlatingBroken && state.nexusHpFp > 0 && state.nexusHpFp <= state.nexusPlatingThresholdFp) {
      state.nexusPlatingBroken = true;
      const nxPos = targetTeam === 'player' ? PLAYER_NEXUS_POS : ENEMY_NEXUS_POS;
      this.addFloatingText(nxPos.x, nxPos.y - 38, '主堡外甲破損！主礦-35%', '#FB7185');
      this.pushIntelFor(
        targetTeam,
        '警報：主堡額外血量已遭擊破！主礦開採效率降至 65%，需升級【修復主堡外甲】恢復！',
        'critical'
      );
    }
    if (targetTeam === 'enemy') {
      this.enemyNexusHpKnown = state.nexusHp;
      this.enemyLaneAlertTimers[1] = 4;
    } else {
      this.playerNexusHpKnownByEnemy = state.nexusHp;
      this.laneAlertTimers[1] = 4;
      if (!this.pvpMode) tacticalAudio.playAlert(true);
    }
  }

  private updateObjectives(dt: number) {
    for (const obj of this.objectives) {
      obj.hitFlash = Math.max(0, obj.hitFlash - dt * 5);

      if (obj.kind === 'creep_camp' && obj.cleared) {
        obj.respawnTimer -= dt;
        if (obj.respawnTimer <= 0) {
          obj.cleared = false;
          obj.owner = 'neutral';
          this.spawnNeutralCreeps(obj.lane, obj.x, obj.y, obj.zone === 'jungle');
        }
        continue;
      }

      if (obj.kind === 'crystal_vein' || obj.kind === 'ancient_beacon') {
        let playerNear = 0;
        let enemyNear = 0;
        for (const u of this.units) {
          if (u.hp <= 0 || u.team === 'neutral') continue;
          if (dist(u.x, u.y, obj.x, obj.y) <= 82) {
            if (u.team === 'player') playerNear++;
            else enemyNear++;
          }
        }
        if (playerNear > 0 && enemyNear === 0) {
          obj.captureProgress = Math.min(100, obj.captureProgress + 24 * dt);
          if (obj.captureProgress >= 100 && obj.owner !== 'player') {
            const wasEnemy = obj.owner === 'enemy';
            obj.owner = 'player';
            this.player.objectivesClaimed++;
            if (!this.pvpMode) tacticalAudio.playBuild();
            this.spawnRingParticle(obj.x, obj.y, '#14B8A6', 75);
            this.addFloatingText(obj.x, obj.y - 24, `佔領 ${obj.name}`, '#2DD4BF');
            this.pushIntelFor('player', `我軍佔領野區【${obj.name}】！主動出擊取得控圖紅利！`, 'info');
            if (wasEnemy) {
              this.pushIntelFor('enemy', `警報：野區【${obj.name}】遭敵軍奪取！`, 'warn');
            }
          }
        } else if (enemyNear > 0 && playerNear === 0) {
          obj.captureProgress = Math.max(-100, obj.captureProgress - 24 * dt);
          if (obj.captureProgress <= -100 && obj.owner !== 'enemy') {
            const wasPlayer = obj.owner === 'player';
            obj.owner = 'enemy';
            this.enemy.objectivesClaimed++;
            this.spawnRingParticle(obj.x, obj.y, '#14B8A6', 75);
            this.addFloatingText(obj.x, obj.y - 24, `佔領 ${obj.name}`, '#2DD4BF');
            this.pushIntelFor('enemy', `我軍佔領野區【${obj.name}】！主動出擊取得控圖紅利！`, 'info');
            if (wasPlayer) {
              this.pushIntelFor('player', `警報：野區【${obj.name}】遭敵軍奪取！`, 'warn');
            }
          }
        }
      }
    }
  }

  private updateFogIntelTrackingForSeat(
    seat: 'player' | 'enemy',
    dt: number,
    vision: Array<{ x: number; y: number; r: number; detector: boolean }>
  ) {
    const oppTeam: 'player' | 'enemy' = seat === 'player' ? 'enemy' : 'player';
    const oppState = oppTeam === 'player' ? this.player : this.enemy;
    const oppNexusPos = oppTeam === 'player' ? PLAYER_NEXUS_POS : ENEMY_NEXUS_POS;
    const ghosts = seat === 'player' ? this.ghosts : this.enemyGhosts;
    const lastSeenUnits = seat === 'player' ? this.lastKnownEnemyUnitIds : this.lastKnownPlayerUnitIds;
    const lastSeenTowers = seat === 'player' ? this.lastEnemyTowerSeen : this.lastPlayerTowerSeen;

    for (let i = ghosts.length - 1; i >= 0; i--) {
      ghosts[i].timeRemaining -= dt;
      if (ghosts[i].timeRemaining <= 0) ghosts.splice(i, 1);
    }

    if (this.isPointVisibleTo(seat, oppNexusPos.x, oppNexusPos.y, vision)) {
      if (seat === 'player') {
        this.enemyNexusHpKnown = Math.ceil(oppState.nexusHp);
        if (this.enemyTechTierKnown !== oppState.techTier) {
          this.enemyTechTierKnown = oppState.techTier;
          this.pushIntelFor('player', `偵察情報：敵方主堡已晉升 T${oppState.techTier} 科技`, 'warn');
        }
      } else {
        this.playerNexusHpKnownByEnemy = Math.ceil(oppState.nexusHp);
        if (this.playerTechTierKnownByEnemy !== oppState.techTier) {
          this.playerTechTierKnownByEnemy = oppState.techTier;
          this.pushIntelFor('enemy', `偵察情報：敵方主堡已晉升 T${oppState.techTier} 科技`, 'warn');
        }
      }
    }

    const currentlyVisible = new Set<number>();
    for (const u of this.units) {
      if (u.team !== oppTeam) continue;
      if (this.isUnitVisibleTo(seat, u, vision)) {
        currentlyVisible.add(u.id);
        const def = ALL_UNITS_BY_ID[u.defId];
        const knownTier = seat === 'player' ? this.enemyTechTierKnown : this.playerTechTierKnownByEnemy;
        if (def && def.tier > (knownTier ?? 1)) {
          if (seat === 'player') this.enemyTechTierKnown = def.tier;
          else this.playerTechTierKnownByEnemy = def.tier;
          this.pushIntelFor(seat, `目擊敵方 T${def.tier} 單位【${def.name}】！`, 'warn');
        }
      } else if (lastSeenUnits.has(u.id)) {
        ghosts.push({
          id: this.nextId++,
          x: u.x,
          y: u.y,
          label: ALL_UNITS_BY_ID[u.defId]?.name ?? '敵軍',
          kind: 'unit',
          timeRemaining: 5.0,
          maxTime: 5.0,
        });
      }
    }
    if (seat === 'player') this.lastKnownEnemyUnitIds = currentlyVisible;
    else this.lastKnownPlayerUnitIds = currentlyVisible;

    for (const pad of this.pads) {
      if (pad.team !== oppTeam || !pad.towerType) continue;
      if (this.isPointVisibleTo(seat, pad.x, pad.y, vision)) {
        if (!lastSeenTowers.has(pad.id)) {
          lastSeenTowers.add(pad.id);
          this.pushIntelFor(
            seat,
            `偵察發現：敵軍在${LANE_SHORT_NAMES[pad.lane]}架設了【${TOWER_DEFS[pad.towerType].name}】`,
            'info'
          );
        }
      }
    }
  }

  private updateParticlesAndText(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.alpha = p.life / p.maxLife;
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y -= 24 * dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  // --- SERVER-AUTHORITATIVE PVP PERSPECTIVE SERIALIZATION (STRICT FOG-OF-WAR + SEAT 2 MIRRORING) ---
  public getPerspectiveState(
    seat: 'player' | 'enemy',
    selectedLane: LaneId,
    selectedTowerType: TowerType,
    targetMode: TargetMode,
    opponentName: string,
    opponentConnected: boolean
  ): PvpWorldState {
    const isMirrored = seat === 'enemy';
    const oppTeam: 'player' | 'enemy' = isMirrored ? 'player' : 'enemy';
    const myState = isMirrored ? this.enemy : this.player;
    const oppState = isMirrored ? this.player : this.enemy;
    const myVision = this.getVisionCircles(seat);

    const mx = (x: number) => (isMirrored ? WORLD_WIDTH - x : x);
    const flipTeam = <T extends string | null>(t: T): T => {
      if (!isMirrored || t === null) return t;
      if (t === 'player') return 'enemy' as T;
      if (t === 'enemy') return 'player' as T;
      return t;
    };
    const flipPadId = (id: string) => {
      if (!isMirrored) return id;
      if (id.startsWith('p_')) return 'e_' + id.slice(2);
      if (id.startsWith('e_')) return 'p_' + id.slice(2);
      if (id.startsWith('sd_p_')) return 'sd_e_' + id.slice(5);
      if (id.startsWith('sd_e_')) return 'sd_p_' + id.slice(5);
      if (id.startsWith('bk_p_')) return 'bk_e_' + id.slice(5);
      if (id.startsWith('bk_e_')) return 'bk_p_' + id.slice(5);
      if (id.startsWith('arm_p_')) return 'arm_e_' + id.slice(6);
      if (id.startsWith('arm_e_')) return 'arm_p_' + id.slice(6);
      if (id.startsWith('ge_p_')) return 'ge_e_' + id.slice(5);
      if (id.startsWith('ge_e_')) return 'ge_p_' + id.slice(5);
      return id;
    };

    const visibleUnits: UnitEntity[] = [];
    for (const u of this.units) {
      if (!this.isUnitVisibleToHumanEye(seat, u, myVision)) continue;
      visibleUnits.push({
        ...u,
        x: mx(u.x),
        vx: isMirrored ? -u.vx : u.vx,
        team: flipTeam(u.team),
        attributes: [...u.attributes],
        bonusVsTagFp: cloneTagBonusFp(u.bonusVsTagFp),
        bonusPerUpgradeVsTagFp: cloneTagBonusFp(u.bonusPerUpgradeVsTagFp),
        squadDestination: u.squadDestination ? { x: mx(u.squadDestination.x), y: u.squadDestination.y } : null,
        jungleWaypoints: u.jungleWaypoints.map((wp) => ({ x: mx(wp.x), y: wp.y })),
        homePos: u.homePos ? { x: mx(u.homePos.x), y: u.homePos.y } : undefined,
      });
    }

    const filteredPads: TowerPad[] = this.pads.map((p) => {
      const revealed = p.team === seat || p.homeSide === seat || this.isPointVisibleTo(seat, p.x, p.y, myVision);
      if (revealed) {
        return {
          ...p,
          id: flipPadId(p.id),
          x: mx(p.x),
          homeSide: flipTeam(p.homeSide),
          team: flipTeam(p.team),
          upgradeStack: p.upgradeStack.map((e) => ({ ...e })),
          attributes: [...p.attributes],
          bonusVsTagFp: cloneTagBonusFp(p.bonusVsTagFp),
          bonusPerUpgradeVsTagFp: cloneTagBonusFp(p.bonusPerUpgradeVsTagFp),
        };
      }
      // Hide unseen opponent tower/construction details under Fog of War!
      return {
        ...p,
        id: flipPadId(p.id),
        x: mx(p.x),
        homeSide: flipTeam(p.homeSide),
        team: null,
        towerType: null,
        level: 0,
        combatLevel: 0,
        miningLevel: 0,
        techLevel: 0,
        upgradeStack: [],
        building: false,
        upgrading: false,
        pendingTowerType: null,
        pendingUpgradeMode: null,
        buildRemaining: 0,
        buildTotal: 0,
        harassTimer: 0,
        harassState: 'ok' as const,
        harassEffPermille: 1000,
        hp: 0,
        maxHp: 0,
        hpFp: 0,
        maxHpFp: 0,
        armor: 0,
        baseArmorFp: 0,
        armorUpgradeLevel: 0,
        armorPerUpgradeFp: 0,
        attributes: ['Armored', 'Mechanical', 'Structure'],
        attackCooldownMs: 0,
        hitFlash: 0,
        range: 0,
        vision: 0,
        detector: false,
        canHitAir: false,
        damage: 0,
        baseDamageFp: 0,
        attackUpgradeLevel: 0,
        damagePerUpgradeFp: 0,
        attackCount: 1,
        attackIntervalMs: 0,
        attackRate: 0,
        bonusVsTagFp: {},
        bonusPerUpgradeVsTagFp: {},
        splashRadius: 0,
        slowFactor: 0,
      };
    });

    const filteredDepots: SupplyDepot[] = this.depots
      .filter((d) => d.team === seat || this.isPointVisibleTo(seat, d.x, d.y, myVision))
      .map((d) => ({
        ...d,
        id: flipPadId(d.id),
        x: mx(d.x),
        team: flipTeam(d.team),
      }));

    const filteredBarracks: BarracksBuilding[] = this.barracks
      .filter((b) => b.team === seat || this.isPointVisibleTo(seat, b.x, b.y, myVision))
      .map((b) => ({
        ...b,
        id: flipPadId(b.id),
        x: mx(b.x),
        team: flipTeam(b.team),
        upgradeThresholdsFp: [...(b.upgradeThresholdsFp ?? [])],
      }));

    const filteredArmories: ArmoryBuilding[] = this.armories
      .filter((a) => a.team === seat || this.isPointVisibleTo(seat, a.x, a.y, myVision))
      .map((a) => ({
        ...a,
        id: flipPadId(a.id),
        x: mx(a.x),
        team: flipTeam(a.team),
      }));

    const filteredExtractors: GasExtractor[] = this.extractors
      .filter((e) => e.team === seat || e.homeSide === seat || this.isPointVisibleTo(seat, e.x, e.y, myVision))
      .map((e) => ({
        ...e,
        id: flipPadId(e.id),
        padId: e.padId ? flipPadId(e.padId) : null,
        x: mx(e.x),
        homeSide: flipTeam(e.homeSide),
        team: flipTeam(e.team),
        upgradeThresholdsFp: [...(e.upgradeThresholdsFp ?? [])],
      }));

    const mappedObjectives: NeutralObjective[] = this.objectives.map((o) => {
      const visible = o.owner === seat || this.isPointVisibleTo(seat, o.x, o.y, myVision);
      if (visible) {
        return {
          ...o,
          x: mx(o.x),
          owner: flipTeam(o.owner),
          captureProgress: isMirrored ? -o.captureProgress : o.captureProgress,
        };
      }
      // Under Fog of War: never leak active enemy damage, hitFlash, or capture progress on barricades & neutral objectives!
      return {
        ...o,
        x: mx(o.x),
        owner: o.kind === 'barricade' ? 'neutral' : flipTeam(o.owner),
        hp: o.kind === 'barricade' ? (o.cleared ? 0 : o.maxHp) : o.hp,
        hpFp: o.kind === 'barricade' ? (o.cleared ? 0 : o.maxHpFp) : o.hpFp,
        hitFlash: 0,
        captureProgress: 0,
      };
    });

    const filteredProjectiles: Projectile[] = this.projectiles
      .filter((p) => p.team === seat || this.isPointVisibleTo(seat, p.x, p.y, myVision))
      .map((p) => ({
        ...p,
        x: mx(p.x),
        targetX: mx(p.targetX),
        team: flipTeam(p.team),
        targetPadId: p.targetPadId ? flipPadId(p.targetPadId) : null,
        targetNexusTeam: flipTeam(p.targetNexusTeam),
      }));

    const filteredStrikes: ArtilleryStrike[] = this.strikes
      .filter((s) => s.team === seat || this.isPointVisibleTo(seat, s.x, s.y, myVision))
      .map((s) => ({ ...s, x: mx(s.x), team: flipTeam(s.team) }));

    const filteredSporeDrops: SporeDrop[] = this.sporeDrops
      .filter((sd) => sd.team === seat || this.isPointVisibleTo(seat, sd.x, sd.y, myVision))
      .map((sd) => ({ ...sd, x: mx(sd.x), team: flipTeam(sd.team) }));

    const filteredScans: ScanPulse[] = this.scans
      .filter(
        (sc) =>
          sc.team === seat ||
          this.isPointVisibleTo(seat, sc.x, sc.y, myVision) ||
          (seat === 'player' ? sc.x < WORLD_WIDTH * 0.62 : sc.x > WORLD_WIDTH * 0.38)
      )
      .map((sc) => ({ ...sc, x: mx(sc.x), team: flipTeam(sc.team) }));

    const rawGhosts = isMirrored ? this.enemyGhosts : this.ghosts;
    const mappedGhosts: GhostIntel[] = rawGhosts.map((g) => ({ ...g, x: mx(g.x) }));

    const filteredFloatingTexts: FloatingText[] = this.floatingTexts
      .filter((ft) => this.isPointVisibleTo(seat, ft.x, ft.y, myVision))
      .map((ft) => ({ ...ft, x: mx(ft.x) }));

    const mappedEvent = this.activeEvent ? { ...this.activeEvent, x: mx(this.activeEvent.x) } : null;

    const myAlerts = isMirrored ? this.enemyLaneAlertTimers : this.laneAlertTimers;
    const myIntels = isMirrored ? this.enemyIntelReports : this.intelReports;
    const mySectorGoldTotal = Math.ceil(
      this.pads
        .filter((p) => p.team === seat || (p.homeSide === seat && p.team === null))
        .reduce((acc, p) => acc + p.goldReserve, 0)
    );
    const mySquadCount = this.units.filter((u) => u.team === seat && u.inAmbushSquad && u.hp > 0).length;

    const oppNexusVisible = this.isPointVisibleTo(
      seat,
      oppTeam === 'player' ? PLAYER_NEXUS_POS.x : ENEMY_NEXUS_POS.x,
      oppTeam === 'player' ? PLAYER_NEXUS_POS.y : ENEMY_NEXUS_POS.y,
      myVision
    );
    const knownOppHp = isMirrored ? this.playerNexusHpKnownByEnemy : this.enemyNexusHpKnown;
    const knownOppTier = isMirrored ? this.playerTechTierKnownByEnemy : this.enemyTechTierKnown;

    const snapshot: GameSnapshot = {
      screen: this.screen,
      mapMode: this.mapMode,
      activeLanes: this.getActiveLanes(),
      elapsed: this.elapsed,
      speedMultiplier: 1,
      player: {
        ...myState,
        squadTarget: myState.squadTarget ? { x: mx(myState.squadTarget.x), y: myState.squadTarget.y } : null,
        armoryLevels: { ...myState.armoryLevels },
        specialTechsDone: [myState.specialTechsDone[0], myState.specialTechsDone[1]],
        specialTechLevels: [myState.specialTechLevels[0], myState.specialTechLevels[1]],
        laneStances: { ...myState.laneStances },
        laneBuffTimer: { ...myState.laneBuffTimer },
        trainingQueue: myState.trainingQueue.map((q) => ({ ...q })),
        activeResearches: myState.activeResearches.map((r) => ({ ...r })),
      },
      enemyNexusHpKnown: knownOppHp,
      enemyNexusMaxHp: oppState.nexusMaxHp,
      enemyTechTierKnown: knownOppTier,
      selectedLane,
      squadSelected: false,
      playerSquadCount: mySquadCount,
      pendingAmbushCount: 0,
      selectedTowerType,
      towerUpgradeMode: this.towerUpgradeMode,
      targetMode,
      laneUnderAttack: {
        0: myAlerts[0] > 0,
        1: myAlerts[1] > 0,
        2: myAlerts[2] > 0,
      },
      activeEvent: mappedEvent,
      nextEventCountdown: Math.max(0, Math.ceil(this.nextEventCountdown)),
      intelReports: myIntels.slice(0, 4),
      playerIncomePerSec: this.getIncomePerSec(seat),
      playerGasIncomePerSec: this.getGasIncomePerSec(seat),
      playerGasUpgrades: this.getTeamGasUpgradeCount(seat),
      playerExtractorsBuilt: this.extractors.filter((e) => e.team === seat && e.built).length,
      playerExtractorsTotal: this.extractors.filter((e) => this.isExtractorEligibleForTeam(e, seat) || (e.team === seat && (e.built || e.building))).length,
      playerExtractorsUpgrading: this.extractors.filter((e) => e.team === seat && (e.building || e.upgrading)).length,
      playerSupplyUsed: this.getSupplyUsed(seat),
      playerSupplyCap: this.getSupplyCap(seat),
      playerMaxSupplyLimit: MAX_SUPPLY_LIMIT,
      playerStandingTowers: this.getStandingTowerCount(seat),
      playerTowersBuilding: this.pads.filter((p) => p.team === seat && (p.building || p.upgrading)).length,
      playerControlledSectors: this.getControlledSectorCount(seat),
      playerDepotsBuilt: this.depots.filter((d) => d.team === seat && d.built).length,
      playerDepotsBuilding: this.depots.filter((d) => d.team === seat && d.building).length,
      playerMaxDepotsAllowed: this.getMaxDepotsAllowed(seat),
      playerBarracks: this.getBarracksSummaries(seat),
      playerArmories: this.getArmorySummaries(seat),
      ironArtilleryWaves: this.getIronArtilleryWaves(seat),
      playerSectorGoldTotal: mySectorGoldTotal,
      playerHarassedMines: this.countHarassedMines(seat),
      winner: flipTeam(this.winner),
      aiArchetype: this.aiControl[seat === 'player' ? 'enemy' : 'player'].archetype,
      tutorialMode: false,
      sandboxMode: false,
      sandboxActiveTeam: 'player',
      sandboxInstantMode: false,
      sandboxLeftFaction: this.player.faction,
      sandboxRightFaction: this.enemy.faction,
      // Only reveal opponent's full stats after match ends!
      enemyFinalStats:
        this.screen === 'GAME_OVER'
          ? {
              faction: oppState.faction,
              techTier: oppState.techTier,
              econLevel: oppState.econLevel,
              unitsTrained: oppState.unitsTrained,
              objectivesClaimed: oppState.objectivesClaimed,
            }
          : {
              faction: oppState.faction,
              techTier: knownOppTier ?? 1,
              econLevel: 0,
              unitsTrained: 0,
              objectivesClaimed: 0,
            },
    };

    return {
      serverTime: Date.now(),
      mapVersion: this.mapVersion,
      mapMode: this.mapMode,
      snapshot,
      units: visibleUnits,
      pads: filteredPads,
      depots: filteredDepots,
      barracks: filteredBarracks,
      armories: filteredArmories,
      extractors: filteredExtractors,
      objectives: mappedObjectives,
      projectiles: filteredProjectiles,
      strikes: filteredStrikes,
      sporeDrops: filteredSporeDrops,
      scans: filteredScans,
      ghosts: mappedGhosts,
      floatingTexts: filteredFloatingTexts,
      activeEvent: mappedEvent,
      enemyFaction: oppState.faction,
      enemyNexusHp: oppNexusVisible || this.screen === 'GAME_OVER' ? oppState.nexusHp : knownOppHp ?? oppState.nexusMaxHp,
      enemyNexusMaxHp: oppState.nexusMaxHp,
      enemyTechTier: oppNexusVisible || this.screen === 'GAME_OVER' ? oppState.techTier : ((knownOppTier ?? 1) as 1 | 2 | 3),
      enemyNexusHitFlash: oppNexusVisible ? oppState.nexusHitFlash : 0,
      opponentName,
      opponentConnected,
    };
  }

  private buildSpectatorTeamSummary(
    seat: 'player' | 'enemy',
    info: { name: string; isAi: boolean; aiDifficulty?: Difficulty; aiArchetype?: AIArchetypeOption; connected: boolean }
  ): SpectatorTeamSummary {
    const st = seat === 'player' ? this.player : this.enemy;
    return {
      seat,
      name: info.name,
      isAi: info.isAi,
      aiDifficulty: info.aiDifficulty,
      aiArchetype: info.isAi ? this.aiControl[seat].archetype : undefined,
      connected: info.connected,
      faction: st.faction,
      gold: Math.floor(st.gold),
      gas: Math.floor(st.gas),
      incomePerSec: this.getIncomePerSec(seat),
      gasIncomePerSec: this.getGasIncomePerSec(seat),
      nexusHp: Math.ceil(st.nexusHp),
      nexusMaxHp: st.nexusMaxHp,
      nexusGoldReserve: Math.ceil(st.nexusGoldReserve),
      techTier: st.techTier,
      econLevel: st.econLevel,
      supplyUsed: this.getSupplyUsed(seat),
      supplyCap: this.getSupplyCap(seat),
      standingTowers: this.getStandingTowerCount(seat),
      controlledSectors: this.getControlledSectorCount(seat),
      armoryLevels: { ...st.armoryLevels },
      specialTechsDone: [st.specialTechsDone[0], st.specialTechsDone[1]],
      specialTechLevels: [st.specialTechLevels[0], st.specialTechLevels[1]],
      unitsTrained: st.unitsTrained,
      unitsLost: st.unitsLost,
      objectivesClaimed: st.objectivesClaimed,
      ambushesLaunched: st.ambushesLaunched,
      scansUsed: st.scansUsed,
    };
  }

  public getSpectatorState(
    view: SpectatorViewMode,
    leftInfo: { name: string; isAi: boolean; aiDifficulty?: Difficulty; aiArchetype?: AIArchetypeOption; connected: boolean },
    rightInfo: { name: string; isAi: boolean; aiDifficulty?: Difficulty; aiArchetype?: AIArchetypeOption; connected: boolean }
  ): PvpWorldState {
    const fogSeat = view === 'all' ? null : view;
    const vision = fogSeat ? this.getVisionCircles(fogSeat) : null;

    const units: UnitEntity[] = [];
    for (const u of this.units) {
      if (fogSeat && vision && !this.isUnitVisibleToHumanEye(fogSeat, u, vision)) continue;
      units.push({
        ...u,
        attributes: [...u.attributes],
        bonusVsTagFp: cloneTagBonusFp(u.bonusVsTagFp),
        bonusPerUpgradeVsTagFp: cloneTagBonusFp(u.bonusPerUpgradeVsTagFp),
        jungleWaypoints: u.jungleWaypoints.map((wp) => ({ ...wp })),
        homePos: u.homePos ? { ...u.homePos } : undefined,
      });
    }

    const pads: TowerPad[] = this.pads.map((p) => {
      const revealed =
        !fogSeat ||
        !vision ||
        p.team === fogSeat ||
        p.homeSide === fogSeat ||
        this.isPointVisibleTo(fogSeat, p.x, p.y, vision);
      if (revealed) {
        return {
          ...p,
          attributes: [...p.attributes],
          bonusVsTagFp: cloneTagBonusFp(p.bonusVsTagFp),
          bonusPerUpgradeVsTagFp: cloneTagBonusFp(p.bonusPerUpgradeVsTagFp),
        };
      }
      return {
        ...p,
        team: null,
        towerType: null,
        level: 0,
        combatLevel: 0,
        miningLevel: 0,
        techLevel: 0,
        upgradeStack: [],
        building: false,
        upgrading: false,
        pendingTowerType: null,
        pendingUpgradeMode: null,
        buildRemaining: 0,
        buildTotal: 0,
        harassEffPermille: 1000,
        hp: 0,
        maxHp: 0,
        hpFp: 0,
        maxHpFp: 0,
        armor: 0,
        baseArmorFp: 0,
        armorUpgradeLevel: 0,
        armorPerUpgradeFp: 0,
        attributes: ['Armored', 'Mechanical', 'Structure'],
        attackCooldownMs: 0,
        hitFlash: 0,
        range: 0,
        vision: 0,
        detector: false,
        canHitAir: false,
        damage: 0,
        baseDamageFp: 0,
        attackUpgradeLevel: 0,
        damagePerUpgradeFp: 0,
        attackCount: 1,
        attackIntervalMs: 0,
        attackRate: 0,
        bonusVsTagFp: {},
        bonusPerUpgradeVsTagFp: {},
        splashRadius: 0,
        slowFactor: 0,
      };
    });

    const depots: SupplyDepot[] = this.depots
      .filter((d) => !fogSeat || !vision || d.team === fogSeat || this.isPointVisibleTo(fogSeat, d.x, d.y, vision))
      .map((d) => ({ ...d }));

    const barracks: BarracksBuilding[] = this.barracks
      .filter((b) => !fogSeat || !vision || b.team === fogSeat || this.isPointVisibleTo(fogSeat, b.x, b.y, vision))
      .map((b) => ({ ...b, upgradeThresholdsFp: [...(b.upgradeThresholdsFp ?? [])] }));

    const armories: ArmoryBuilding[] = this.armories
      .filter((a) => !fogSeat || !vision || a.team === fogSeat || this.isPointVisibleTo(fogSeat, a.x, a.y, vision))
      .map((a) => ({ ...a }));

    const extractors: GasExtractor[] = this.extractors
      .filter((e) => !fogSeat || !vision || e.team === fogSeat || e.homeSide === fogSeat || this.isPointVisibleTo(fogSeat, e.x, e.y, vision))
      .map((e) => ({ ...e, upgradeThresholdsFp: [...(e.upgradeThresholdsFp ?? [])] }));

    const objectives: NeutralObjective[] = this.objectives.map((o) => ({ ...o }));

    const projectiles: Projectile[] = this.projectiles
      .filter((p) => !fogSeat || !vision || p.team === fogSeat || this.isPointVisibleTo(fogSeat, p.x, p.y, vision))
      .map((p) => ({ ...p }));

    const strikes: ArtilleryStrike[] = this.strikes
      .filter((s) => !fogSeat || !vision || s.team === fogSeat || this.isPointVisibleTo(fogSeat, s.x, s.y, vision))
      .map((s) => ({ ...s }));

    const sporeDrops: SporeDrop[] = this.sporeDrops
      .filter((sd) => !fogSeat || !vision || sd.team === fogSeat || this.isPointVisibleTo(fogSeat, sd.x, sd.y, vision))
      .map((sd) => ({ ...sd }));

    const scans: ScanPulse[] = this.scans
      .filter((sc) => !fogSeat || !vision || sc.team === fogSeat || this.isPointVisibleTo(fogSeat, sc.x, sc.y, vision))
      .map((sc) => ({ ...sc }));

    const ghosts: GhostIntel[] =
      fogSeat === 'player'
        ? this.ghosts.map((g) => ({ ...g }))
        : fogSeat === 'enemy'
        ? this.enemyGhosts.map((g) => ({ ...g }))
        : [];

    const floatingTexts: FloatingText[] = this.floatingTexts
      .filter((ft) => !fogSeat || !vision || this.isPointVisibleTo(fogSeat, ft.x, ft.y, vision))
      .map((ft) => ({ ...ft }));

    const activeEvent = this.activeEvent ? { ...this.activeEvent } : null;
    const intelSource = fogSeat === 'enemy' ? this.enemyIntelReports : this.intelReports;
    const leftSummary = this.buildSpectatorTeamSummary('player', leftInfo);
    const rightSummary = this.buildSpectatorTeamSummary('enemy', rightInfo);

    const snapshot: GameSnapshot = {
      screen: this.screen,
      mapMode: this.mapMode,
      activeLanes: this.getActiveLanes(),
      elapsed: this.elapsed,
      speedMultiplier: 1,
      player: {
        ...this.player,
        armoryLevels: { ...this.player.armoryLevels },
        specialTechsDone: [this.player.specialTechsDone[0], this.player.specialTechsDone[1]],
        specialTechLevels: [this.player.specialTechLevels[0], this.player.specialTechLevels[1]],
        laneStances: { ...this.player.laneStances },
        laneBuffTimer: { ...this.player.laneBuffTimer },
        trainingQueue: this.player.trainingQueue.map((q) => ({ ...q })),
        activeResearches: this.player.activeResearches.map((r) => ({ ...r })),
      },
      enemyNexusHpKnown: Math.ceil(this.enemy.nexusHp),
      enemyNexusMaxHp: this.enemy.nexusMaxHp,
      enemyTechTierKnown: this.enemy.techTier,
      selectedLane: this.getActiveLanes().includes(1) ? 1 : this.getActiveLanes()[0],
      squadSelected: false,
      playerSquadCount: this.units.filter((u) => u.team === 'player' && u.inAmbushSquad && u.hp > 0).length,
      pendingAmbushCount: 0,
      selectedTowerType: 'watchtower',
      towerUpgradeMode: 'combat',
      targetMode: 'none',
      laneUnderAttack: { 0: false, 1: false, 2: false },
      activeEvent,
      nextEventCountdown: Math.max(0, Math.ceil(this.nextEventCountdown)),
      intelReports: intelSource.slice(0, 4),
      playerIncomePerSec: leftSummary.incomePerSec,
      playerGasIncomePerSec: leftSummary.gasIncomePerSec,
      playerGasUpgrades: this.getTeamGasUpgradeCount('player'),
      playerExtractorsBuilt: this.extractors.filter((e) => e.team === 'player' && e.built).length,
      playerExtractorsTotal: this.extractors.filter((e) => this.isExtractorEligibleForTeam(e, 'player') || (e.team === 'player' && (e.built || e.building))).length,
      playerExtractorsUpgrading: this.extractors.filter((e) => e.team === 'player' && (e.building || e.upgrading)).length,
      playerSupplyUsed: leftSummary.supplyUsed,
      playerSupplyCap: leftSummary.supplyCap,
      playerMaxSupplyLimit: MAX_SUPPLY_LIMIT,
      playerStandingTowers: leftSummary.standingTowers,
      playerTowersBuilding: this.pads.filter((p) => p.team === 'player' && (p.building || p.upgrading)).length,
      playerControlledSectors: leftSummary.controlledSectors,
      playerDepotsBuilt: this.depots.filter((d) => d.team === 'player' && d.built).length,
      playerDepotsBuilding: this.depots.filter((d) => d.team === 'player' && d.building).length,
      playerMaxDepotsAllowed: this.getMaxDepotsAllowed('player'),
      playerBarracks: this.getBarracksSummaries('player'),
      playerArmories: this.getArmorySummaries('player'),
      ironArtilleryWaves: this.getIronArtilleryWaves('player'),
      playerSectorGoldTotal: Math.ceil(
        this.pads
          .filter((p) => p.team === 'player' || (p.homeSide === 'player' && p.team === null))
          .reduce((acc, p) => acc + p.goldReserve, 0)
      ),
      playerHarassedMines: this.countHarassedMines('player'),
      winner: this.winner,
      aiArchetype: this.aiArchetype,
      tutorialMode: false,
      sandboxMode: false,
      sandboxActiveTeam: 'player',
      sandboxInstantMode: false,
      sandboxLeftFaction: this.player.faction,
      sandboxRightFaction: this.enemy.faction,
      enemyFinalStats: {
        faction: this.enemy.faction,
        techTier: this.enemy.techTier,
        econLevel: this.enemy.econLevel,
        unitsTrained: this.enemy.unitsTrained,
        objectivesClaimed: this.enemy.objectivesClaimed,
      },
    };

    return {
      serverTime: Date.now(),
      mapVersion: this.mapVersion,
      mapMode: this.mapMode,
      snapshot,
      units,
      pads,
      depots,
      barracks,
      armories,
      extractors,
      objectives,
      projectiles,
      strikes,
      sporeDrops,
      scans,
      ghosts,
      floatingTexts,
      activeEvent,
      enemyFaction: this.enemy.faction,
      enemyNexusHp: this.enemy.nexusHp,
      enemyNexusMaxHp: this.enemy.nexusMaxHp,
      enemyTechTier: this.enemy.techTier,
      enemyNexusHitFlash: this.enemy.nexusHitFlash,
      opponentName: rightInfo.name,
      opponentConnected: rightInfo.connected,
      spectatorView: view,
      spectatorTeams: [leftSummary, rightSummary],
    };
  }

  public applyRemoteState(state: PvpWorldState) {
    const prevScreen = this.screen;
    const isFreshMatch =
      !this.hasAppliedRemoteOnce ||
      (prevScreen !== 'PLAYING' && state.snapshot.screen === 'PLAYING') ||
      state.snapshot.elapsed < this.elapsed - 2;

    this.pvpMode = true;
    this.isRemoteClient = true;
    this.mapMode = state.mapMode ?? state.snapshot.mapMode ?? 'standard';
    this.selectedLane = this.sanitizeLane(this.selectedLane);
    this.observerView = state.spectatorView ?? 'none';
    this.screen = state.snapshot.screen;
    this.elapsed = state.snapshot.elapsed;
    this.speedMultiplier = 1;
    this.winner = state.snapshot.winner;
    this.mapVersion = state.mapVersion;

    this.player = state.snapshot.player;
    this.enemy = {
      ...this.enemy,
      faction: state.enemyFaction,
      nexusHp: state.enemyNexusHp,
      nexusMaxHp: state.enemyNexusMaxHp,
      techTier: state.enemyTechTier,
      nexusHitFlash: state.enemyNexusHitFlash,
    };
    this.enemyNexusHpKnown = state.snapshot.enemyNexusHpKnown;
    this.enemyTechTierKnown = state.snapshot.enemyTechTierKnown;

    // Smooth unit position interpolation reconciliation
    const prevUnitsById = new Map<number, UnitEntity>();
    for (const u of this.units) prevUnitsById.set(u.id, u);
    const nextTargets = new Map<number, { x: number; y: number }>();

    this.units = state.units.map((su) => {
      const prev = prevUnitsById.get(su.id);
      nextTargets.set(su.id, { x: su.x, y: su.y });
      if (prev && dist(prev.x, prev.y, su.x, su.y) < 95) {
        return { ...su, x: prev.x, y: prev.y };
      }
      return { ...su };
    });
    this.remoteTargetPos = nextTargets;

    this.pads = state.pads;
    this.depots = state.depots;
    this.barracks = state.barracks ?? [];
    this.armories = state.armories ?? [];
    this.extractors = state.extractors ?? [];
    this.objectives = state.objectives;
    this.projectiles = state.projectiles;
    this.strikes = state.strikes;
    this.sporeDrops = state.sporeDrops;
    this.scans = state.scans;
    this.ghosts = state.ghosts;
    this.floatingTexts = state.floatingTexts;
    this.activeEvent = state.activeEvent;
    this.nextEventCountdown = state.snapshot.nextEventCountdown;
    this.intelReports = state.snapshot.intelReports;
    this.lastRemoteSnapshot = state.snapshot;

    // Lightweight diff-based combat & tactical audio feedback for Online PvP / Spectator clients
    const nextProjIds = new Set<number>();
    let spawnedProjKind: Projectile['kind'] | null = null;
    for (const p of state.projectiles) {
      nextProjIds.add(p.id);
      if (!isFreshMatch && !this.prevRemoteProjIds.has(p.id)) {
        if (!spawnedProjKind || p.kind === 'shell' || p.kind === 'beam') {
          spawnedProjKind = p.kind;
        }
      }
    }

    const nextPadState = new Map<string, string>();
    let playerBuildDone = false;
    let anyTowerDestroyed = false;
    for (const pad of state.pads) {
      const sig = `${pad.team ?? 'none'}:${pad.towerType ?? 'none'}:${pad.level}:${pad.building ? 1 : 0}:${pad.upgrading ? 1 : 0}`;
      nextPadState.set(pad.id, sig);
      if (!isFreshMatch) {
        const prevSig = this.prevRemotePadState.get(pad.id);
        if (prevSig && prevSig !== sig) {
          if (pad.team === 'player' && pad.towerType && !pad.building && !pad.upgrading) {
            playerBuildDone = true;
          } else if (pad.towerType === null && !pad.building && prevSig.indexOf(':none:') === -1) {
            anyTowerDestroyed = true;
          }
        }
      }
    }

    const nextBuiltDepots = new Set<string>();
    for (const d of state.depots) {
      if (d.built) {
        nextBuiltDepots.add(d.id);
        if (!isFreshMatch && d.team === 'player' && !this.prevRemoteBuiltDepots.has(d.id)) {
          playerBuildDone = true;
        }
      }
    }

    const nextBuiltBarracks = new Set<string>();
    for (const b of state.barracks ?? []) {
      if (b.built) {
        nextBuiltBarracks.add(b.id);
        if (!isFreshMatch && b.team === 'player' && !this.prevRemoteBuiltBarracks.has(b.id)) {
          playerBuildDone = true;
        }
      }
    }

    const p = state.snapshot.player;
    const nextTechSig = `${p.econLevel}:${p.techTier}:${p.armoryLevels.trackA}:${p.armoryLevels.trackB}:${p.armoryLevels.trackC}:${p.armoryLevels.trackD ?? 0}:${p.armoryLevels.trackE ?? 0}:${p.armoryLevels.trackF ?? 0}:${p.specialTechLevels?.[0] ?? (p.specialTechsDone[0] ? 1 : 0)}:${p.specialTechLevels?.[1] ?? (p.specialTechsDone[1] ? 1 : 0)}`;
    const techUpgraded = !isFreshMatch && this.prevRemoteTechSig !== '' && nextTechSig !== this.prevRemoteTechSig;

    const nextEventId = state.activeEvent?.id ?? null;
    const newEventSpawned = !isFreshMatch && nextEventId !== null && nextEventId !== this.prevRemoteEventId;

    const nextAlerts = state.snapshot.laneUnderAttack;
    const laneAlertList: [boolean, boolean, boolean] = [
      Boolean(nextAlerts[0]),
      Boolean(nextAlerts[1]),
      Boolean(nextAlerts[2]),
    ];
    const newLaneAlert =
      !isFreshMatch &&
      this.observerView === 'none' &&
      laneAlertList.some((active, idx) => active && !this.prevRemoteLaneAlerts[idx]);
    const nexusHit =
      !isFreshMatch && this.observerView === 'none' && p.nexusHp < this.prevRemotePlayerNexusHp - 1;

    if (!isFreshMatch && this.screen === 'PLAYING') {
      if (anyTowerDestroyed) {
        tacticalAudio.playExplosion();
      } else if (spawnedProjKind) {
        tacticalAudio.playAttack(spawnedProjKind);
      } else if (state.units.some((u) => u.hitFlash > 0.85)) {
        tacticalAudio.playAttack('melee');
      }

      if (this.observerView === 'none') {
        if (techUpgraded) tacticalAudio.playResearchDone();
        else if (playerBuildDone) tacticalAudio.playBuildDone();
        if (nexusHit) tacticalAudio.playAlert(true);
        else if (newLaneAlert) tacticalAudio.playAlert(false);
      }
      if (newEventSpawned) {
        tacticalAudio.playEventHorn();
      }
    }

    this.hasAppliedRemoteOnce = true;
    this.prevRemoteProjIds = nextProjIds;
    this.prevRemotePadState = nextPadState;
    this.prevRemoteBuiltDepots = nextBuiltDepots;
    this.prevRemoteBuiltBarracks = nextBuiltBarracks;
    this.prevRemoteTechSig = nextTechSig;
    this.prevRemoteEventId = nextEventId;
    this.prevRemoteLaneAlerts = laneAlertList;
    this.prevRemotePlayerNexusHp = p.nexusHp;

    if (prevScreen !== 'GAME_OVER' && this.screen === 'GAME_OVER') {
      tacticalAudio.playVictory(this.observerView !== 'none' ? true : this.winner === 'player');
    }

    this.emitSnapshot();
  }

  private interpolateRemote(dt: number) {
    const lerpFactor = Math.min(1, dt * 16);
    for (const u of this.units) {
      const target = this.remoteTargetPos.get(u.id);
      if (target) {
        u.x += (target.x - u.x) * lerpFactor;
        u.y += (target.y - u.y) * lerpFactor;
      }
      u.scaleX += (1 - u.scaleX) * Math.min(1, dt * 10);
      u.scaleY += (1 - u.scaleY) * Math.min(1, dt * 10);
      u.hitFlash = Math.max(0, u.hitFlash - dt * 5);
    }
    for (const p of this.projectiles) {
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 4) {
        const step = Math.min(d - 2, p.speed * dt);
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
    }
    this.updateParticlesAndText(dt);
  }

  public getSnapshot(): GameSnapshot {
    if (this.isRemoteClient && this.lastRemoteSnapshot) {
      return {
        ...this.lastRemoteSnapshot,
        screen: this.screen,
        selectedLane: this.selectedLane,
        squadSelected: this.squadSelected && Boolean(this.lastRemoteSnapshot.player.squadActive),
        pendingAmbushCount: this.pendingAmbushUnitIds.length,
        selectedTowerType: this.selectedTowerType,
        towerUpgradeMode: this.towerUpgradeMode,
        targetMode: this.targetMode,
      };
    }

    const ctrl = this.getControlledTeam();
    const opp: 'player' | 'enemy' = ctrl === 'player' ? 'enemy' : 'player';
    const ctrlState = ctrl === 'player' ? this.player : this.enemy;
    const oppState = opp === 'player' ? this.player : this.enemy;

    const playerSectorGoldTotal = Math.ceil(
      this.pads
        .filter((p) => p.team === ctrl || (p.homeSide === ctrl && p.team === null))
        .reduce((acc, p) => acc + p.goldReserve, 0)
    );
    const playerSquadCount = this.units.filter((u) => u.team === ctrl && u.inAmbushSquad && u.hp > 0).length;
    const alerts = ctrl === 'player' ? this.laneAlertTimers : this.enemyLaneAlertTimers;
    const intels = ctrl === 'player' ? this.intelReports : this.enemyIntelReports;

    return {
      screen: this.screen,
      mapMode: this.mapMode,
      activeLanes: this.getActiveLanes(),
      elapsed: this.elapsed,
      speedMultiplier: this.speedMultiplier,
      player: {
        ...ctrlState,
        squadTarget: ctrlState.squadTarget ? { ...ctrlState.squadTarget } : null,
        armoryLevels: { ...ctrlState.armoryLevels },
        specialTechsDone: [ctrlState.specialTechsDone[0], ctrlState.specialTechsDone[1]],
        specialTechLevels: [ctrlState.specialTechLevels[0], ctrlState.specialTechLevels[1]],
        laneStances: { ...ctrlState.laneStances },
        laneBuffTimer: { ...ctrlState.laneBuffTimer },
        trainingQueue: ctrlState.trainingQueue.map((q) => ({ ...q })),
        activeResearches: ctrlState.activeResearches.map((r) => ({ ...r })),
      },
      enemyNexusHpKnown: this.sandboxMode ? Math.ceil(oppState.nexusHp) : this.enemyNexusHpKnown,
      enemyNexusMaxHp: oppState.nexusMaxHp,
      enemyTechTierKnown: this.sandboxMode ? oppState.techTier : this.enemyTechTierKnown,
      selectedLane: this.selectedLane,
      squadSelected: this.squadSelected && ctrlState.squadActive,
      playerSquadCount,
      pendingAmbushCount: this.pendingAmbushUnitIds.length,
      selectedTowerType: this.selectedTowerType,
      towerUpgradeMode: this.towerUpgradeMode,
      targetMode: this.targetMode,
      laneUnderAttack: {
        0: alerts[0] > 0,
        1: alerts[1] > 0,
        2: alerts[2] > 0,
      },
      activeEvent: this.activeEvent ? { ...this.activeEvent } : null,
      nextEventCountdown: Math.max(0, Math.ceil(this.nextEventCountdown)),
      intelReports: intels.slice(0, 4),
      playerIncomePerSec: this.getIncomePerSec(ctrl),
      playerGasIncomePerSec: this.getGasIncomePerSec(ctrl),
      playerGasUpgrades: this.getTeamGasUpgradeCount(ctrl),
      playerExtractorsBuilt: this.extractors.filter((e) => e.team === ctrl && e.built).length,
      playerExtractorsTotal: this.extractors.filter((e) => this.isExtractorEligibleForTeam(e, ctrl) || (e.team === ctrl && (e.built || e.building))).length,
      playerExtractorsUpgrading: this.extractors.filter((e) => e.team === ctrl && (e.building || e.upgrading)).length,
      playerSupplyUsed: this.getSupplyUsed(ctrl),
      playerSupplyCap: this.getSupplyCap(ctrl),
      playerMaxSupplyLimit: MAX_SUPPLY_LIMIT,
      playerStandingTowers: this.getStandingTowerCount(ctrl),
      playerTowersBuilding: this.pads.filter((p) => p.team === ctrl && (p.building || p.upgrading)).length,
      playerControlledSectors: this.getControlledSectorCount(ctrl),
      playerDepotsBuilt: this.depots.filter((d) => d.team === ctrl && d.built).length,
      playerDepotsBuilding: this.depots.filter((d) => d.team === ctrl && d.building).length,
      playerMaxDepotsAllowed: this.getMaxDepotsAllowed(ctrl),
      playerBarracks: this.getBarracksSummaries(ctrl),
      playerArmories: this.getArmorySummaries(ctrl),
      ironArtilleryWaves: this.getIronArtilleryWaves(ctrl),
      playerSectorGoldTotal,
      playerHarassedMines: this.countHarassedMines(ctrl),
      winner: this.winner,
      aiArchetype: this.aiArchetype,
      tutorialMode: this.tutorialMode,
      sandboxMode: this.sandboxMode,
      sandboxActiveTeam: this.sandboxActiveTeam,
      sandboxInstantMode: this.sandboxInstantMode,
      sandboxLeftFaction: this.player.faction,
      sandboxRightFaction: this.enemy.faction,
      enemyFinalStats: {
        faction: oppState.faction,
        techTier: oppState.techTier,
        econLevel: oppState.econLevel,
        unitsTrained: oppState.unitsTrained,
        objectivesClaimed: oppState.objectivesClaimed,
      },
    };
  }

  public emitSnapshot() {
    this.onSnapshot?.(this.getSnapshot());
  }
}
