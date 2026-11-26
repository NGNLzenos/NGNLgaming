import { AttributeTag, TagBonusMapFp, WeaponAttackSpecFp } from './combatMath';

export type { AttributeTag, TagBonusMapFp, WeaponAttackSpecFp };

export type FactionId = 'ironbound' | 'dawn' | 'swarm';
export type EnemyFactionOption = 'random' | FactionId;
export type TeamId = 'player' | 'enemy' | 'neutral';
export type LaneId = 0 | 1 | 2;
export type MapMode = 'standard' | 'simple';
export type JungleZoneId = 'upper' | 'lower' | 'center';
export type LaneStance = 'push' | 'hold_tower' | 'defend_base' | 'all_in' | 'retreat';
export type TowerType = 'watchtower' | 'artillery' | 'disruptor' | 'tech_tower' | 'econ_tower';
export type TowerUpgradeMode = 'combat' | 'mining' | 'tech';
export type GameScreen = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
export type Difficulty = 'rookie' | 'standard' | 'commander';
export type TargetMode =
  | 'none'
  | 'scan'
  | 'faction_skill'
  | 'k_boost'
  | 'build_tower'
  | 'ambush_select'
  | 'ambush_target';
export type AIArchetype = 'iron_rush' | 'iron_turtle' | 'iron_air_siege' | 'iron_mech' | 'iron_bio';
export type AIArchetypeOption = 'random' | AIArchetype;

export type ArmorClass = 'light' | 'heavy' | 'siege' | 'structure';
export type UnitDomain = 'ground' | 'air';
export type CombatRangeType = 'melee' | 'ranged';
export type ArmoryTrackId = 'trackA' | 'trackB' | 'trackC' | 'trackD' | 'trackE' | 'trackF';
export type ArmoryBuildingKind = 'bio_lab' | 'mech_bay';
export type BarracksTier = 1 | 2 | 3;
export type CancellableBuildingKind = 'pad' | 'depot' | 'barracks' | 'armory' | 'extractor';
export type UnitArchetypeRole =
  | 'rapid_light'
  | 'anti_light_aoe'
  | 'anti_armored'
  | 'heavy_behemoth';

export type ResearchKind =
  | 'tech_tier'
  | 'econ'
  | 'armory_A'
  | 'armory_B'
  | 'armory_C'
  | 'armory_D'
  | 'armory_E'
  | 'armory_F'
  | 'special_tech_1'
  | 'special_tech_2'
  | 'nexus_repair';

export interface Vec2 {
  x: number;
  y: number;
}

export interface ArmoryTrackDef {
  id: ArmoryTrackId;
  hotkey: string;
  shortName: string;
  name: string;
  desc: string;
  costs: [number, number, number];
  gasCosts: [number, number, number];
  times: [number, number, number];
}

export interface SpecialTechDef {
  slot: 0 | 1;
  hotkey: string;
  tierReq: 2 | 3;
  name: string;
  shortName: string;
  desc: string;
  cost: number;
  gasCost: number;
  time: number;
  level2?: {
    tierReq: 3;
    name: string;
    shortName: string;
    desc: string;
    cost: number;
    gasCost: number;
    time: number;
  };
}

export interface UnitDef {
  id: string;
  faction: FactionId;
  hotkey: string;
  name: string;
  archetypeRole: UnitArchetypeRole;
  roleLabel: string;
  counterNote: string;
  weakAgainstNote?: string;
  specialEffectNote?: string;
  tier: 1 | 2 | 3;
  requiresBarracksTier?: BarracksTier;
  requiresBarracksLevel?: 1 | 2 | 3 | 4;
  sharedCdWithId?: string;
  cost: number;
  gasCost: number;
  trainTime: number;
  supplyCost: number;
  squadSize: number;
  // Base stats (converted to Fixed-Point ×1000 in runtime engine)
  hp: number;
  shield: number;
  armor: number;
  armorPerLevel: number; // Flat +armor per defense upgrade level
  shieldArmor?: number;
  shieldArmorPerLevel?: number;
  attributes: AttributeTag[]; // Deterministic attribute tags (Light/Armored, Biological/Mechanical/Structure, Massive, Psionic)
  armorClass: ArmorClass; // Category grouping for Armory/UI badges
  domain: UnitDomain;
  combatRange: CombatRangeType;
  canHitAir: boolean;
  damage: number; // Base single-shot attack damage
  damagePerLevel: number; // Flat +damage per attack upgrade level
  attackCount: number; // Shots per attack cycle (each shot independently subtracts target armor!)
  attackIntervalMs: number; // Fixed integer ms per attack cycle
  attackRate: number; // Display helper (= 1000 / attackIntervalMs)
  range: number;
  speed: number;
  vision: number;
  splashRadius?: number;
  bonusVsTag?: Partial<Record<AttributeTag, number>>; // Flat +damage per matching target AttributeTag
  bonusPerLevelVsTag?: Partial<Record<AttributeTag, number>>; // Flat +bonus per attack upgrade level
  cloaked?: boolean;
  cloakDurationSec?: number; // Timed combat cloak (e.g. Valkyrie: 15s stealth upon engaging enemies, recovers out of combat)
  detector?: boolean;
  auraShield?: boolean;
  suicidal?: boolean;
  corrosive?: boolean;
  spawnerInterval?: number;
  shape:
    | 'rifle'
    | 'elite_rifle'
    | 'mech'
    | 'mortar'
    | 'flamer'
    | 'valkyrie'
    | 'recon'
    | 'gunship'
    | 'titan'
    | 'zealot'
    | 'archer'
    | 'stalker'
    | 'interceptor'
    | 'paladin'
    | 'colossus'
    | 'templar'
    | 'observer'
    | 'carrier'
    | 'swarmling'
    | 'spitter'
    | 'volatile'
    | 'mutalisk'
    | 'crusher'
    | 'leviathan'
    | 'lurker'
    | 'overseer'
    | 'broodlord'
    | 'golem';
}

export interface TowerDef {
  type: TowerType;
  name: string;
  shortLabel: string;
  shortDesc: string;
  strengths: string;
  cost: number;
  upgradeCostLv2: number;
  upgradeCostLv3: number;
  buildTime: number;
  upgradeTimeLv2: number;
  upgradeTimeLv3: number;
  attributes: AttributeTag[];
  hp: number;
  armor: number;
  armorPerLevel: number;
  damage: number;
  damagePerLevel: number;
  attackCount: number;
  attackIntervalMs: number;
  attackRate: number;
  bonusVsTag?: Partial<Record<AttributeTag, number>>;
  bonusPerLevelVsTag?: Partial<Record<AttributeTag, number>>;
  range: number;
  vision: number;
  detector: boolean;
  canHitAir: boolean;
  splashRadius?: number;
  slowFactor?: number;
  miningRateMult?: number;
  techCdBonus?: number; // Active & scan CD rate bonus per combat level
  techResearchBonus?: number; // Research speed bonus per combat level
}

export interface FactionDef {
  id: FactionId;
  name: string;
  subtitle: string;
  accentHex: string;
  accentLightHex: string;
  emblemPath: string;
  passiveName: string;
  passiveDesc: string;
  activeName: string;
  activeDesc: string;
  activeCooldown: number;
  activeCost: number;
  scanCooldown: number;
  scanRadius: number;
  scanDuration: number;
  towerTypes: TowerType[];
  armorySummary: string;
  armoryTrackOrder: ArmoryTrackId[];
  armoryTracks: Partial<Record<ArmoryTrackId, ArmoryTrackDef>>;
  specialTechs: [SpecialTechDef, SpecialTechDef];
  units: UnitDef[];
}

export interface ProductionOrder {
  id: number;
  unitIndex: number;
  unitName: string;
  lane: LaneId;
  remaining: number;
  total: number;
  multiplier?: 1 | 2 | 3 | 4;
}

export interface ResearchOrder {
  id: number;
  kind: ResearchKind;
  label: string;
  remaining: number;
  total: number;
}

export interface SupplyDepot {
  id: string;
  team: 'player' | 'enemy';
  lane?: LaneId;
  isForward?: boolean;
  x: number;
  y: number;
  built: boolean;
  building: boolean;
  buildRemaining: number;
  buildTotal: number;
  hp: number;
  maxHp: number;
  hpFp: number;
  maxHpFp: number;
  baseArmorFp: number;
  attributes: AttributeTag[];
  hitFlash: number;
  paidGold?: number;
}

export interface BarracksBuilding {
  id: string;
  team: 'player' | 'enemy';
  tier: BarracksTier;
  level: 0 | 1 | 2 | 3 | 4;
  x: number;
  y: number;
  built: boolean;
  building: boolean;
  buildRemaining: number;
  buildTotal: number;
  hp: number;
  maxHp: number;
  hpFp: number;
  maxHpFp: number;
  upgradeThresholdsFp: number[];
  baseArmorFp: number;
  attributes: AttributeTag[];
  hitFlash: number;
  paidGold?: number;
}

export interface BarracksStatusSummary {
  tier: BarracksTier;
  level: 0 | 1 | 2 | 3 | 4;
  built: boolean;
  building: boolean;
  buildRemaining: number;
  buildTotal: number;
}

export interface ArmoryBuilding {
  id: string;
  team: 'player' | 'enemy';
  kind: ArmoryBuildingKind;
  x: number;
  y: number;
  built: boolean;
  building: boolean;
  buildRemaining: number;
  buildTotal: number;
  hp: number;
  maxHp: number;
  hpFp: number;
  maxHpFp: number;
  baseArmorFp: number;
  attributes: AttributeTag[];
  hitFlash: number;
  paidGold?: number;
}

export interface ArmoryBuildingSummary {
  id: string;
  kind: ArmoryBuildingKind;
  built: boolean;
  building: boolean;
  buildRemaining: number;
  buildTotal: number;
}

export interface GasExtractor {
  id: string;
  homeSide: 'player' | 'enemy';
  team: 'player' | 'enemy' | null;
  lane: LaneId | null;
  padId: string | null; // null = Nexus sector gas extractor
  x: number;
  y: number;
  level: 0 | 1 | 2 | 3;
  built: boolean;
  building: boolean;
  upgrading: boolean;
  buildRemaining: number;
  buildTotal: number;
  harassState: 'ok' | 'harassed' | 'halted';
  harassEffPermille: number;
  hp: number;
  maxHp: number;
  hpFp: number;
  maxHpFp: number;
  upgradeThresholdsFp: number[];
  baseArmorFp: number;
  attributes: AttributeTag[];
  hitFlash: number;
  paidGold?: number;
}

export interface UnitEntity {
  id: number;
  defId: string;
  team: TeamId;
  faction: FactionId | 'neutral';
  lane: LaneId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  laneOffset: number;
  // Display-synced values (derived from integer Fixed-Point fields below)
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  armor: number;
  // Deterministic Fixed-Point (scale 1000) combat state
  hpFp: number;
  maxHpFp: number;
  shieldFp: number;
  maxShieldFp: number;
  baseArmorFp: number;
  armorUpgradeLevel: number;
  armorPerUpgradeFp: number;
  baseShieldArmorFp: number;
  shieldArmorUpgradeLevel: number;
  shieldArmorPerUpgradeFp: number;
  baseDamageFp: number;
  attackUpgradeLevel: number;
  damagePerUpgradeFp: number;
  attackCount: number;
  attackIntervalMs: number;
  attackCooldownMs: number;
  attackLockMs: number;
  attributes: AttributeTag[];
  bonusVsTagFp: TagBonusMapFp;
  bonusPerUpgradeVsTagFp: TagBonusMapFp;
  armorClass: ArmorClass;
  domain: UnitDomain;
  combatRange: CombatRangeType;
  canHitAir: boolean;
  damage: number;
  attackRate: number;
  range: number;
  speed: number;
  vision: number;
  splashRadius: number;
  shape: UnitDef['shape'];
  cloaked: boolean;
  cloakTimer: number;
  cloakMaxSec: number;
  detector: boolean;
  revealTimer: number;
  firedRevealTimer: number; // Visible to human eyes only when attacking from fog (units still cannot target!)
  provokedTimer?: number; // Neutral jungle creeps stay passive early until provoked by taking damage
  auraShield: boolean;
  suicidal: boolean;
  corrosive: boolean;
  spawnerInterval: number;
  spawnTimer: number;
  hitFlash: number;
  outOfCombatTimer: number;
  slowTimer: number;
  buffTimer: number;
  hasteTimer: number;
  stimTimer: number; // Ironbound [K] Bio morale stim (3s)
  siegeLockTimer: number; // Ironbound [K] Non-Bio rooted range+damage lock (3s)
  healingBioActive?: boolean; // Hawkeye Recon OOC non-detecting bio heal visual flag
  inAmbushSquad: boolean;
  squadDestination: Vec2 | null;
  jungleWaypoints: Vec2[];
  jungleTargetLane: LaneId | null;
  jungleMode?: 'hunt' | 'evade_creeps' | 'rush_ignore';
  scaleX: number;
  scaleY: number;
  radius: number;
  isBoss?: boolean;
  isJungleCreep?: boolean;
  homePos?: Vec2;
  bountyGold: number;
  targetId: number | null;
}

export interface TowerPad {
  id: string;
  homeSide: 'player' | 'enemy';
  team: 'player' | 'enemy' | null;
  lane: LaneId;
  slot: 'inner' | 'outer';
  x: number;
  y: number;
  towerType: TowerType | null;
  level: 0 | 1 | 2 | 3;
  combatLevel: 0 | 1 | 2 | 3;
  miningLevel: 0 | 1 | 2;
  techLevel: 0 | 1 | 2;
  upgradeStack: Array<{ mode: TowerUpgradeMode; thresholdHpFp: number }>;
  building: boolean;
  upgrading: boolean;
  pendingTowerType: TowerType | null;
  pendingUpgradeMode: TowerUpgradeMode | null;
  buildRemaining: number;
  buildTotal: number;
  goldReserve: number;
  goldReserveMax: number;
  harassTimer: number;
  harassState: 'ok' | 'harassed' | 'halted';
  harassEffPermille: number;
  hp: number;
  maxHp: number;
  armor: number;
  hpFp: number;
  maxHpFp: number;
  baseArmorFp: number;
  armorUpgradeLevel: number;
  armorPerUpgradeFp: number;
  baseDamageFp: number;
  attackUpgradeLevel: number;
  damagePerUpgradeFp: number;
  attackCount: number;
  attackIntervalMs: number;
  attackCooldownMs: number;
  bonusVsTagFp: TagBonusMapFp;
  bonusPerUpgradeVsTagFp: TagBonusMapFp;
  attributes: AttributeTag[];
  hitFlash: number;
  range: number;
  vision: number;
  detector: boolean;
  canHitAir: boolean;
  damage: number;
  attackRate: number;
  splashRadius: number;
  slowFactor: number;
  paidGold?: number;
}

export type ObjectiveKind = 'crystal_vein' | 'barricade' | 'creep_camp' | 'ancient_beacon';

export interface NeutralObjective {
  id: string;
  zone: 'lane' | 'jungle';
  lane: LaneId;
  jungleZone?: JungleZoneId;
  kind: ObjectiveKind;
  name: string;
  x: number;
  y: number;
  owner: TeamId;
  captureProgress: number;
  hp: number;
  maxHp: number;
  hpFp: number;
  maxHpFp: number;
  baseArmorFp: number;
  attributes: AttributeTag[];
  goldReserve: number;
  goldReserveMax: number;
  harassState?: 'ok' | 'harassed' | 'halted';
  harassEffPermille?: number;
  cleared: boolean;
  respawnTimer: number;
  hitFlash: number;
}

export type DynamicEventKind =
  | 'boss_colossus'
  | 'aether_rift'
  | 'fog_storm'
  | 'supply_drop'
  | 'vein_overdrive'
  | 'merc_convoy';

export interface ActiveDynamicEvent {
  id: number;
  kind: DynamicEventKind;
  jungleZone: JungleZoneId;
  x: number;
  y: number;
  title: string;
  detail: string;
  timeRemaining: number;
  duration: number;
  entityId?: number;
  isEarlyPhase?: boolean;
  powerScale?: number;
}

export interface ScanPulse {
  id: number;
  team: 'player' | 'enemy';
  x: number;
  y: number;
  radius: number;
  timeRemaining: number;
  duration: number;
}

export interface ArtilleryStrike {
  id: number;
  team: 'player' | 'enemy';
  x: number;
  y: number;
  radius: number;
  wavesLeft: number;
  waveTimer: number;
  damageFp: number;
  bonusVsTagFp: TagBonusMapFp;
}

export interface SporeDrop {
  id: number;
  team: 'player' | 'enemy';
  x: number;
  y: number;
  lane: LaneId;
  radius: number;
  timeRemaining: number;
  duration: number;
}

export interface GhostIntel {
  id: number;
  x: number;
  y: number;
  label: string;
  kind: 'unit' | 'tower' | 'boss';
  timeRemaining: number;
  maxTime: number;
}

export interface Projectile {
  id: number;
  team: TeamId;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  targetUnitId: number | null;
  targetPadId: string | null;
  targetDepotId: string | null;
  targetBarracksId?: string | null;
  targetArmoryId?: string | null;
  targetExtractorId?: string | null;
  targetNexusTeam: 'player' | 'enemy' | null;
  targetObjectiveId: string | null;
  speed: number;
  weaponSpec: WeaponAttackSpecFp;
  canHitAir: boolean;
  splashRadius: number;
  slowFactor: number;
  color: string;
  kind: 'bullet' | 'shell' | 'laser' | 'arrow' | 'beam' | 'orb';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  ring?: boolean;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface IntelReport {
  id: number;
  time: number;
  text: string;
  severity: 'info' | 'warn' | 'critical';
}

export interface TeamState {
  faction: FactionId;
  gold: number;
  gas: number;
  nexusGoldReserve: number;
  nexusGoldMax: number;
  nexusHarassTimer: number;
  nexusHarassState: 'ok' | 'harassed' | 'halted';
  nexusHarassEffPermille: number;
  econLevel: number; // 1..8
  techTier: 1 | 2 | 3;
  armoryLevels: Record<ArmoryTrackId, number>; // each 0..3
  specialTechsDone: [boolean, boolean]; // true when level >= 1
  specialTechLevels: [number, number]; // each 0..2
  globalAttackBuffTimer: number;
  nexusHp: number;
  nexusMaxHp: number;
  nexusBaseHp: number;
  nexusPlatingHp: number;
  nexusPlatingBroken: boolean;
  nexusPlatingThresholdFp: number;
  nexusHpFp: number;
  nexusMaxHpFp: number;
  nexusAttackCooldownMs: number;
  nexusHitFlash: number;
  scanCooldown: number;
  activeCooldown: number;
  kActiveCooldown: number;
  ambushCooldown: number;
  squadActive: boolean;
  squadStance: LaneStance;
  squadTarget: Vec2 | null;
  laneStances: Record<LaneId, LaneStance>;
  laneBuffTimer: Record<LaneId, number>;
  trainingQueue: ProductionOrder[];
  activeResearches: ResearchOrder[];
  unitsTrained: number;
  unitsLost: number;
  objectivesClaimed: number;
  scansUsed: number;
  ambushesLaunched: number;
}

export interface GameSnapshot {
  screen: GameScreen;
  mapMode: MapMode;
  activeLanes: LaneId[];
  elapsed: number;
  speedMultiplier: 1 | 1.5;
  player: TeamState;
  enemyNexusHpKnown: number | null;
  enemyNexusMaxHp: number;
  enemyTechTierKnown: number | null;
  selectedLane: LaneId;
  squadSelected: boolean;
  playerSquadCount: number;
  pendingAmbushCount: number;
  selectedTowerType: TowerType;
  towerUpgradeMode: TowerUpgradeMode;
  targetMode: TargetMode;
  laneUnderAttack: Record<LaneId, boolean>;
  activeEvent: ActiveDynamicEvent | null;
  nextEventCountdown: number;
  intelReports: IntelReport[];
  playerIncomePerSec: number;
  playerGasIncomePerSec: number;
  playerGasUpgrades: number;
  playerExtractorsBuilt: number;
  playerExtractorsTotal: number;
  playerExtractorsUpgrading: number;
  playerArmories: ArmoryBuildingSummary[];
  ironArtilleryWaves: number;
  playerSupplyUsed: number;
  playerSupplyCap: number;
  playerMaxSupplyLimit: number;
  playerStandingTowers: number;
  playerTowersBuilding: number;
  playerControlledSectors: number;
  playerDepotsBuilt: number;
  playerDepotsBuilding: number;
  playerMaxDepotsAllowed: number;
  playerBarracks: BarracksStatusSummary[];
  playerSectorGoldTotal: number;
  playerHarassedMines: number;
  winner: 'player' | 'enemy' | null;
  aiArchetype: AIArchetype;
  tutorialMode: boolean;
  sandboxMode: boolean;
  sandboxActiveTeam: 'player' | 'enemy';
  sandboxInstantMode: boolean;
  sandboxLeftFaction: FactionId;
  sandboxRightFaction: FactionId;
  enemyFinalStats: {
    faction: FactionId;
    techTier: number;
    econLevel: number;
    unitsTrained: number;
    objectivesClaimed: number;
  };
}
