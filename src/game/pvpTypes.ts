import {
  ActiveDynamicEvent,
  AIArchetypeOption,
  ArmoryBuilding,
  ArmoryBuildingKind,
  ArmoryTrackId,
  ArtilleryStrike,
  BarracksBuilding,
  BarracksTier,
  CancellableBuildingKind,
  Difficulty,
  FactionId,
  FloatingText,
  GameSnapshot,
  GasExtractor,
  GhostIntel,
  LaneId,
  LaneStance,
  MapMode,
  NeutralObjective,
  Projectile,
  ScanPulse,
  SporeDrop,
  SupplyDepot,
  TowerPad,
  TowerType,
  TowerUpgradeMode,
  UnitEntity,
} from './types';

export type PvpSeat = 'player' | 'enemy';
export type PvpRoomRole = 'player' | 'spectator';
export type SpectatorViewMode = 'all' | 'player' | 'enemy';

export interface PvpPlayerSlot {
  seat: PvpSeat;
  name: string;
  friendCode?: string;
  faction: FactionId;
  ready: boolean;
  connected: boolean;
  isAi: boolean;
  aiDifficulty?: Difficulty;
  aiArchetype?: AIArchetypeOption;
}

export interface PvpSpectatorSlot {
  id: string;
  name: string;
  friendCode?: string;
  isHost: boolean;
}

export interface FriendOnlineStatus {
  friendCode: string;
  name: string;
  online: boolean;
  roomCode: string | null;
  roomPhase: 'lobby' | 'playing' | 'ended' | null;
}

export interface FriendInviteEvent {
  id: string;
  fromFriendCode: string;
  fromName: string;
  roomCode: string;
  mapMode: MapMode;
  timestamp: number;
}

export interface RoomChatMessage {
  id: string;
  senderName: string;
  senderRole: PvpRoomRole | 'system';
  senderSeat: PvpSeat | null;
  text: string;
  timestamp: number;
}

export interface PvpRoomInfo {
  code: string;
  phase: 'lobby' | 'playing' | 'ended';
  mapMode: MapMode;
  yourRole: PvpRoomRole;
  yourSeat: PvpSeat | null;
  isHost: boolean;
  players: PvpPlayerSlot[];
  spectators: PvpSpectatorSlot[];
  rematchVotes: PvpSeat[];
  countdownSeconds?: number | null;
}

export interface SpectatorTeamSummary {
  seat: PvpSeat;
  name: string;
  faction: FactionId;
  isAi: boolean;
  aiDifficulty?: Difficulty;
  aiArchetype?: AIArchetypeOption;
  connected: boolean;
  gold: number;
  gas: number;
  incomePerSec: number;
  gasIncomePerSec: number;
  nexusHp: number;
  nexusMaxHp: number;
  nexusGoldReserve: number;
  techTier: 1 | 2 | 3;
  econLevel: number;
  supplyUsed: number;
  supplyCap: number;
  standingTowers: number;
  controlledSectors: number;
  armoryLevels: Record<ArmoryTrackId, number>;
  specialTechsDone: [boolean, boolean];
  specialTechLevels: [number, number];
  unitsTrained: number;
  unitsLost: number;
  objectivesClaimed: number;
  ambushesLaunched: number;
  scansUsed: number;
}

export type PvpCommand =
  | { type: 'select_lane'; lane: LaneId }
  | { type: 'set_stance'; lane: LaneId; stance: LaneStance }
  | { type: 'train_unit'; unitIndex: number; lane: LaneId }
  | { type: 'start_tower'; padId: string; towerType: TowerType; upgradeMode?: TowerUpgradeMode }
  | { type: 'quick_tower'; lane: LaneId; towerType: TowerType; upgradeMode?: TowerUpgradeMode }
  | { type: 'build_depot'; depotId?: string }
  | { type: 'build_barracks'; tier: BarracksTier }
  | { type: 'build_armory'; kind: ArmoryBuildingKind }
  | { type: 'build_extractor'; extractorId?: string }
  | { type: 'cancel_building'; kind: CancellableBuildingKind; id: string }
  | { type: 'upgrade_econ' }
  | { type: 'upgrade_tech' }
  | { type: 'upgrade_armory'; track: ArmoryTrackId }
  | { type: 'research_special'; slot: 0 | 1 }
  | { type: 'select_squad' }
  | { type: 'set_squad_stance'; stance: LaneStance }
  | { type: 'form_squad'; unitIds: number[]; targetX: number; targetY: number }
  | { type: 'disband_squad' }
  | { type: 'repair_nexus' }
  | { type: 'scan'; x: number; y: number }
  | { type: 'faction_skill'; x: number; y: number }
  | { type: 'k_boost'; x: number; y: number }
  | { type: 'surrender' };

export type ClientWsMessage =
  | { type: 'ping'; ts: number }
  | { type: 'presence:register'; friendCode: string; name: string; friendCodes: string[] }
  | { type: 'friend:invite'; targetFriendCode: string; roomCode: string }
  | { type: 'room:create'; name: string; faction: FactionId; mapMode?: MapMode; sessionToken?: string }
  | { type: 'room:join'; code: string; name: string; faction: FactionId; asSpectator?: boolean; sessionToken?: string }
  | { type: 'room:rejoin'; code: string; sessionToken: string }
  | { type: 'room:quickmatch'; name: string; faction: FactionId; sessionToken?: string }
  | { type: 'room:cancel_queue' }
  | { type: 'room:faction'; faction: FactionId }
  | { type: 'room:ready'; ready: boolean }
  | { type: 'room:config_map'; mapMode: MapMode }
  | {
      type: 'room:add_ai';
      seat: PvpSeat;
      faction?: FactionId;
      difficulty?: Difficulty;
      aiArchetype?: AIArchetypeOption;
    }
  | { type: 'room:remove_ai'; seat: PvpSeat }
  | {
      type: 'room:config_ai';
      seat: PvpSeat;
      faction?: FactionId;
      difficulty?: Difficulty;
      aiArchetype?: AIArchetypeOption;
    }
  | { type: 'room:switch_role'; target: PvpSeat | 'spectator' }
  | { type: 'room:start_match' }
  | { type: 'room:rematch' }
  | { type: 'room:leave' }
  | { type: 'spectator:view'; view: SpectatorViewMode }
  | { type: 'chat:send'; text: string }
  | { type: 'game:cmd'; cmd: PvpCommand };

export interface PvpWorldState {
  serverTime: number;
  mapVersion: number;
  mapMode: MapMode;
  snapshot: GameSnapshot;
  units: UnitEntity[];
  pads: TowerPad[];
  depots: SupplyDepot[];
  barracks: BarracksBuilding[];
  armories: ArmoryBuilding[];
  extractors: GasExtractor[];
  objectives: NeutralObjective[];
  projectiles: Projectile[];
  strikes: ArtilleryStrike[];
  sporeDrops: SporeDrop[];
  scans: ScanPulse[];
  ghosts: GhostIntel[];
  floatingTexts: FloatingText[];
  activeEvent: ActiveDynamicEvent | null;
  enemyFaction: FactionId;
  enemyNexusHp: number;
  enemyNexusMaxHp: number;
  enemyTechTier: 1 | 2 | 3;
  enemyNexusHitFlash: number;
  opponentName: string;
  opponentConnected: boolean;
  spectatorView?: SpectatorViewMode;
  spectatorTeams?: [SpectatorTeamSummary, SpectatorTeamSummary];
}

export type ServerWsMessage =
  | { type: 'hello'; clientId: string; onlineCount: number }
  | { type: 'pong'; ts: number }
  | { type: 'friends:status'; statuses: FriendOnlineStatus[] }
  | { type: 'friend:invited'; invite: FriendInviteEvent }
  | { type: 'friend:invite_result'; ok: boolean; message: string }
  | { type: 'queue:waiting'; queueSize: number }
  | { type: 'queue:cancelled' }
  | { type: 'room:state'; room: PvpRoomInfo }
  | { type: 'room:error'; message: string }
  | { type: 'room:rejoin_failed'; reason: string }
  | { type: 'room:left' }
  | { type: 'match:countdown'; seconds: number | null; reason?: string }
  | { type: 'match:start'; room: PvpRoomInfo; state: PvpWorldState; isRejoin?: boolean }
  | { type: 'match:state'; state: PvpWorldState }
  | { type: 'match:notice'; text: string; severity: 'info' | 'warn' | 'critical' }
  | { type: 'chat:history'; messages: RoomChatMessage[] }
  | { type: 'chat:message'; message: RoomChatMessage };
