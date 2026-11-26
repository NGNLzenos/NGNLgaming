import crypto from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import {
  AI_ARCHETYPE_LABELS,
  DIFFICULTY_META,
  TOWER_PAD_COORDS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './src/game/data';
import { BattleEngine } from './src/game/engine';
import {
  ClientWsMessage,
  FriendOnlineStatus,
  PvpCommand,
  PvpPlayerSlot,
  PvpRoomInfo,
  PvpRoomRole,
  PvpSeat,
  PvpSpectatorSlot,
  RoomChatMessage,
  ServerWsMessage,
  SpectatorViewMode,
} from './src/game/pvpTypes';
import {
  AIArchetypeOption,
  ArmoryTrackId,
  Difficulty,
  FactionId,
  LaneId,
  LaneStance,
  MapMode,
  TowerType,
} from './src/game/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const MAX_ROOMS = 100;
const MAX_SPECTATORS_PER_ROOM = 8;
const MAX_CHAT_HISTORY = 40;
const MAX_CHAT_TEXT_LEN = 120;
const CHAT_RATE_WINDOW_MS = 4000;
const CHAT_RATE_MAX_MSGS = 5;
const MAX_MSGS_PER_SEC = 45;
const SIM_TICK_MS = 50; // 20Hz authoritative server simulation
const STATE_PUSH_MS = 80; // ~12.5Hz Fog-of-War filtered broadcasts (proxy-friendly bandwidth)
const MIN_CMD_PUSH_GAP_MS = 35; // Prevent burst-flooding proxies on rapid clicks
const MAX_WS_BUFFERED_BYTES = 256 * 1024; // Drop stale state frames if socket backpressured
const CLIENT_IDLE_TIMEOUT_MS = 45_000; // Terminate only after 45s of total silence (app msgs + pong)
const DISCONNECT_FORFEIT_MS = 45_000; // 45s grace window for automatic seamless reconnect
const VALID_PAD_IDS = new Set(TOWER_PAD_COORDS.map((p) => p.id));
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

interface ConnectedClient {
  id: string;
  sessionToken: string;
  friendCode: string | null;
  watchedFriends: Set<string>;
  ws: WebSocket;
  name: string;
  faction: FactionId;
  roomCode: string | null;
  role: PvpRoomRole | null;
  seat: PvpSeat | null;
  alive: boolean;
  lastSeen: number;
  msgWindowStart: number;
  msgCount: number;
  chatTimestamps: number[];
}

interface RoomSlot {
  clientId: string;
  sessionToken: string;
  seat: PvpSeat;
  name: string;
  faction: FactionId;
  ready: boolean;
  connected: boolean;
  isAi: boolean;
  aiDifficulty?: Difficulty;
  aiArchetype?: AIArchetypeOption;
  selectedLane: LaneId;
  selectedTowerType: TowerType;
}

interface RoomSpectator {
  clientId: string;
  sessionToken: string;
  name: string;
  view: SpectatorViewMode;
  connected: boolean;
}

interface PvpRoom {
  code: string;
  hostClientId: string;
  phase: 'lobby' | 'playing' | 'ended';
  mapMode: MapMode;
  slots: Record<PvpSeat, RoomSlot | null>;
  spectators: Map<string, RoomSpectator>;
  chatHistory: RoomChatMessage[];
  engine: BattleEngine | null;
  rematchVotes: Set<PvpSeat>;
  disconnectTimers: Partial<Record<PvpSeat, ReturnType<typeof setTimeout>>>;
  emptyRoomTimer: ReturnType<typeof setTimeout> | null;
  countdownSeconds: number | null;
  countdownTimer: ReturnType<typeof setInterval> | null;
  pendingStatePush: boolean;
  lastPushAt: number;
  createdAt: number;
}

const clients = new Map<string, ConnectedClient>();
const rooms = new Map<string, PvpRoom>();
const quickMatchQueue: string[] = [];

// --- Strict Runtime Validation Helpers ---
function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return '指揮官';
  const cleaned = raw.replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, 14);
  return cleaned.length > 0 ? cleaned : '指揮官';
}

function sanitizeFriendCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  return cleaned.length === 6 ? cleaned : null;
}

function getFriendStatusForCode(code: string): FriendOnlineStatus {
  let matched: ConnectedClient | null = null;
  for (const c of clients.values()) {
    if (c.friendCode === code && c.ws.readyState === WebSocket.OPEN) {
      matched = c;
      if (c.roomCode) break;
    }
  }
  if (!matched) {
    return { friendCode: code, name: '', online: false, roomCode: null, roomPhase: null };
  }
  const room = matched.roomCode ? rooms.get(matched.roomCode) : null;
  return {
    friendCode: code,
    name: matched.name,
    online: true,
    roomCode: room ? room.code : null,
    roomPhase: room ? room.phase : null,
  };
}

function sendFriendStatusesTo(client: ConnectedClient) {
  if (client.watchedFriends.size === 0) return;
  const statuses: FriendOnlineStatus[] = [];
  for (const code of client.watchedFriends) {
    statuses.push(getFriendStatusForCode(code));
  }
  sendMsg(client, { type: 'friends:status', statuses });
}

function notifyWatchersOfFriendCode(code: string | null) {
  if (!code) return;
  const status = getFriendStatusForCode(code);
  for (const other of clients.values()) {
    if (other.watchedFriends.has(code)) {
      sendMsg(other, { type: 'friends:status', statuses: [status] });
    }
  }
}

function sanitizeChatText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CHAT_TEXT_LEN);
  return cleaned.length > 0 ? cleaned : null;
}

function isValidFaction(v: unknown): v is FactionId {
  return v === 'ironbound' || v === 'dawn' || v === 'swarm';
}

function isValidDifficulty(v: unknown): v is Difficulty {
  return v === 'rookie' || v === 'standard' || v === 'commander';
}

function isValidAiArchetypeOption(v: unknown): v is AIArchetypeOption {
  return (
    v === 'random' ||
    v === 'iron_rush' ||
    v === 'iron_turtle' ||
    v === 'iron_air_siege' ||
    v === 'iron_mech' ||
    v === 'iron_bio'
  );
}

function isValidMapMode(v: unknown): v is MapMode {
  return v === 'standard' || v === 'simple';
}

function isValidSeat(v: unknown): v is PvpSeat {
  return v === 'player' || v === 'enemy';
}

function isValidSpectatorView(v: unknown): v is SpectatorViewMode {
  return v === 'all' || v === 'player' || v === 'enemy';
}

function isValidLane(v: unknown): v is LaneId {
  return v === 0 || v === 1 || v === 2;
}

function isValidStance(v: unknown): v is LaneStance {
  return v === 'push' || v === 'hold_tower' || v === 'defend_base' || v === 'all_in' || v === 'retreat';
}

function isValidTowerType(v: unknown): v is TowerType {
  return (
    v === 'watchtower' ||
    v === 'artillery' ||
    v === 'disruptor' ||
    v === 'tech_tower' ||
    v === 'econ_tower'
  );
}

function isValidArmoryTrack(v: unknown): v is ArmoryTrackId {
  return (
    v === 'trackA' ||
    v === 'trackB' ||
    v === 'trackC' ||
    v === 'trackD' ||
    v === 'trackE' ||
    v === 'trackF'
  );
}

function isValidCoord(x: unknown, y: unknown): boolean {
  return (
    typeof x === 'number' &&
    typeof y === 'number' &&
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    x >= 0 &&
    x <= WORLD_WIDTH &&
    y >= 0 &&
    y <= WORLD_HEIGHT
  );
}

function sanitizeRoomCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  return /^[A-Z0-9]{4}$/.test(code) ? code : null;
}

function sanitizeSessionToken(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.trim().slice(0, 64);
  return /^[a-zA-Z0-9_-]{8,64}$/.test(cleaned) ? cleaned : fallback;
}

function flipPadIdForSeat2(id: string): string {
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
}

function generateRoomCode(): string {
  for (let attempt = 0; attempt < 40; attempt++) {
    let code = '';
    const bytes = crypto.randomBytes(4);
    for (let i = 0; i < 4; i++) {
      code += ROOM_ALPHABET[bytes[i] % ROOM_ALPHABET.length];
    }
    if (!rooms.has(code)) return code;
  }
  return crypto.randomBytes(2).toString('hex').toUpperCase();
}

function formatAiDisplayName(difficulty: Difficulty, archetype: AIArchetypeOption = 'random'): string {
  const diffLabel = DIFFICULTY_META[difficulty]?.shortName ?? '中級';
  if (archetype === 'random') return `AI ${diffLabel} · 隨機戰術`;
  const archLabel = AI_ARCHETYPE_LABELS[archetype]?.shortName ?? '戰術';
  return `AI ${diffLabel} · ${archLabel}`;
}

function createAiSlot(
  seat: PvpSeat,
  faction: FactionId,
  difficulty: Difficulty,
  aiArchetype: AIArchetypeOption = 'random'
): RoomSlot {
  return {
    clientId: `ai_${seat}`,
    sessionToken: `ai_${seat}`,
    seat,
    name: formatAiDisplayName(difficulty, aiArchetype),
    faction,
    ready: true,
    connected: true,
    isAi: true,
    aiDifficulty: difficulty,
    aiArchetype,
    selectedLane: 1,
    selectedTowerType: 'watchtower',
  };
}

function sendMsg(client: ConnectedClient | undefined, msg: ServerWsMessage) {
  if (!client || client.ws.readyState !== WebSocket.OPEN) return;
  // Backpressure guard: skip stale world-state frames if the client's TCP send buffer is backed up
  if (msg.type === 'match:state' && client.ws.bufferedAmount > MAX_WS_BUFFERED_BYTES) {
    return;
  }
  try {
    client.ws.send(JSON.stringify(msg));
  } catch {
    // Ignore transient send errors; close handler will manage detach
  }
}

function getHumanMemberIds(room: PvpRoom): string[] {
  const ids: string[] = [];
  for (const seat of ['player', 'enemy'] as PvpSeat[]) {
    const slot = room.slots[seat];
    if (slot && !slot.isAi && slot.connected) {
      ids.push(slot.clientId);
    }
  }
  for (const spec of room.spectators.values()) {
    if (spec.connected) {
      ids.push(spec.clientId);
    }
  }
  return ids;
}

function ensureValidHost(room: PvpRoom) {
  const members = getHumanMemberIds(room);
  if (members.length === 0) return;
  if (!members.includes(room.hostClientId)) {
    room.hostClientId = members[0];
  }
}

function buildRoomInfo(
  room: PvpRoom,
  viewerClientId: string,
  yourRole: PvpRoomRole,
  yourSeat: PvpSeat | null
): PvpRoomInfo {
  const players: PvpPlayerSlot[] = [];
  for (const s of ['player', 'enemy'] as PvpSeat[]) {
    const slot = room.slots[s];
    if (slot) {
      const slotClient = !slot.isAi ? clients.get(slot.clientId) : undefined;
      players.push({
        seat: slot.seat,
        name: slot.name,
        friendCode: slotClient?.friendCode ?? undefined,
        faction: slot.faction,
        ready: slot.ready,
        connected: slot.connected,
        isAi: slot.isAi,
        aiDifficulty: slot.aiDifficulty,
        aiArchetype: slot.aiArchetype,
      });
    }
  }

  const spectators: PvpSpectatorSlot[] = [];
  for (const spec of room.spectators.values()) {
    if (!spec.connected) continue;
    const specClient = clients.get(spec.clientId);
    spectators.push({
      id: spec.clientId,
      name: spec.name,
      friendCode: specClient?.friendCode ?? undefined,
      isHost: spec.clientId === room.hostClientId,
    });
  }

  return {
    code: room.code,
    phase: room.phase,
    mapMode: room.mapMode,
    yourRole,
    yourSeat,
    isHost: room.hostClientId === viewerClientId,
    players,
    spectators,
    rematchVotes: Array.from(room.rematchVotes),
    countdownSeconds: room.countdownSeconds,
  };
}

function broadcastRoomState(room: PvpRoom) {
  ensureValidHost(room);
  for (const seat of ['player', 'enemy'] as PvpSeat[]) {
    const slot = room.slots[seat];
    if (!slot || slot.isAi || !slot.connected) continue;
    const client = clients.get(slot.clientId);
    sendMsg(client, { type: 'room:state', room: buildRoomInfo(room, slot.clientId, 'player', seat) });
    if (client?.friendCode) notifyWatchersOfFriendCode(client.friendCode);
  }
  for (const spec of room.spectators.values()) {
    if (!spec.connected) continue;
    const client = clients.get(spec.clientId);
    sendMsg(client, { type: 'room:state', room: buildRoomInfo(room, spec.clientId, 'spectator', null) });
    if (client?.friendCode) notifyWatchersOfFriendCode(client.friendCode);
  }
}

function sendNoticeToRoom(room: PvpRoom, text: string, severity: 'info' | 'warn' | 'critical' = 'info') {
  for (const memberId of getHumanMemberIds(room)) {
    sendMsg(clients.get(memberId), { type: 'match:notice', text, severity });
  }
}

function pushRoomChat(
  room: PvpRoom,
  senderName: string,
  senderRole: PvpRoomRole | 'system',
  senderSeat: PvpSeat | null,
  text: string
) {
  const message: RoomChatMessage = {
    id: crypto.randomUUID(),
    senderName,
    senderRole,
    senderSeat,
    text,
    timestamp: Date.now(),
  };
  room.chatHistory.push(message);
  if (room.chatHistory.length > MAX_CHAT_HISTORY) {
    room.chatHistory.splice(0, room.chatHistory.length - MAX_CHAT_HISTORY);
  }
  for (const memberId of getHumanMemberIds(room)) {
    sendMsg(clients.get(memberId), { type: 'chat:message', message });
  }
}

function sendChatHistory(client: ConnectedClient, room: PvpRoom) {
  sendMsg(client, { type: 'chat:history', messages: room.chatHistory });
}

function removeFromQueue(clientId: string) {
  const idx = quickMatchQueue.indexOf(clientId);
  if (idx !== -1) quickMatchQueue.splice(idx, 1);
}

function clearRoomTimers(room: PvpRoom) {
  for (const seat of ['player', 'enemy'] as PvpSeat[]) {
    const t = room.disconnectTimers[seat];
    if (t) {
      clearTimeout(t);
      delete room.disconnectTimers[seat];
    }
  }
  if (room.emptyRoomTimer) {
    clearTimeout(room.emptyRoomTimer);
    room.emptyRoomTimer = null;
  }
  if (room.countdownTimer) {
    clearInterval(room.countdownTimer);
    room.countdownTimer = null;
  }
  room.countdownSeconds = null;
}

function sendCountdownToRoom(room: PvpRoom, seconds: number | null, reason?: string) {
  for (const memberId of getHumanMemberIds(room)) {
    sendMsg(clients.get(memberId), { type: 'match:countdown', seconds, reason });
  }
}

function cancelRoomCountdown(room: PvpRoom, reason?: string) {
  if (room.countdownTimer) {
    clearInterval(room.countdownTimer);
    room.countdownTimer = null;
  }
  if (room.countdownSeconds !== null) {
    room.countdownSeconds = null;
    sendCountdownToRoom(room, null, reason);
    if (reason) {
      sendNoticeToRoom(room, reason, 'warn');
    }
  }
}

function beginMatchCountdown(room: PvpRoom, seconds = 3) {
  if (room.countdownTimer) {
    clearInterval(room.countdownTimer);
    room.countdownTimer = null;
  }
  const p = room.slots.player;
  const e = room.slots.enemy;
  if (!p || !e || !p.connected || !e.connected) return;

  room.countdownSeconds = seconds;
  broadcastRoomState(room);
  sendCountdownToRoom(room, seconds);
  sendNoticeToRoom(room, `雙方已就緒！${seconds} 秒後正式開戰…`, 'info');
  pushRoomChat(room, '系統', 'system', null, `雙方準備完成，${seconds} 秒後開始對戰！`);

  room.countdownTimer = setInterval(() => {
    const pNow = room.slots.player;
    const eNow = room.slots.enemy;
    if (!pNow || !eNow || !pNow.connected || !eNow.connected) {
      cancelRoomCountdown(room, '有玩家離席，開戰倒數已取消。');
      broadcastRoomState(room);
      return;
    }
    if (room.countdownSeconds === null) {
      if (room.countdownTimer) {
        clearInterval(room.countdownTimer);
        room.countdownTimer = null;
      }
      return;
    }
    room.countdownSeconds -= 1;
    if (room.countdownSeconds > 0) {
      broadcastRoomState(room);
      sendCountdownToRoom(room, room.countdownSeconds);
    } else {
      if (room.countdownTimer) {
        clearInterval(room.countdownTimer);
        room.countdownTimer = null;
      }
      room.countdownSeconds = null;
      sendCountdownToRoom(room, 0);
      startRoomMatch(room);
    }
  }, 1000);
}

function cleanupRoomIfEmpty(room: PvpRoom, immediate = false) {
  const anyHuman = getHumanMemberIds(room).length > 0;
  if (anyHuman) {
    if (room.emptyRoomTimer) {
      clearTimeout(room.emptyRoomTimer);
      room.emptyRoomTimer = null;
    }
    return;
  }
  // If a live match suffers a momentary proxy hiccup dropping both sockets, keep room alive for 45s to allow auto-rejoin!
  if (!immediate && room.phase === 'playing') {
    if (!room.emptyRoomTimer) {
      room.emptyRoomTimer = setTimeout(() => {
        room.emptyRoomTimer = null;
        if (getHumanMemberIds(room).length === 0) {
          clearRoomTimers(room);
          rooms.delete(room.code);
        }
      }, DISCONNECT_FORFEIT_MS);
    }
    return;
  }
  clearRoomTimers(room);
  rooms.delete(room.code);
}

function getSlotMetaForSpectator(room: PvpRoom, seat: PvpSeat) {
  const slot = room.slots[seat];
  return {
    name: slot?.name ?? (seat === 'player' ? '藍方' : '紅方'),
    isAi: Boolean(slot?.isAi),
    aiDifficulty: slot?.aiDifficulty,
    aiArchetype: slot?.aiArchetype,
    connected: Boolean(slot?.connected),
  };
}

function startRoomMatch(room: PvpRoom) {
  const pSlot = room.slots.player;
  const eSlot = room.slots.enemy;
  if (!pSlot || !eSlot) return;

  clearRoomTimers(room);

  const engine = new BattleEngine();
  engine.initCustomMatch(
    pSlot.faction,
    eSlot.faction,
    pSlot.isAi ? (pSlot.aiDifficulty ?? 'standard') : null,
    eSlot.isAi ? (eSlot.aiDifficulty ?? 'standard') : null,
    room.mapMode,
    pSlot.isAi ? (pSlot.aiArchetype ?? 'random') : 'random',
    eSlot.isAi ? (eSlot.aiArchetype ?? 'random') : 'random'
  );
  room.engine = engine;
  room.phase = 'playing';
  room.rematchVotes.clear();
  room.lastPushAt = Date.now();
  const initialLane: LaneId = room.mapMode === 'simple' ? 0 : 1;
  pSlot.selectedLane = initialLane;
  eSlot.selectedLane = initialLane;
  pSlot.selectedTowerType = 'watchtower';
  eSlot.selectedTowerType = 'watchtower';

  for (const seat of ['player', 'enemy'] as PvpSeat[]) {
    const mySlot = room.slots[seat]!;
    if (mySlot.isAi || !mySlot.connected) continue;
    const oppSlot = room.slots[seat === 'player' ? 'enemy' : 'player']!;
    const client = clients.get(mySlot.clientId);
    const state = engine.getPerspectiveState(
      seat,
      mySlot.selectedLane,
      mySlot.selectedTowerType,
      'none',
      oppSlot.name,
      oppSlot.connected
    );
    sendMsg(client, {
      type: 'match:start',
      room: buildRoomInfo(room, mySlot.clientId, 'player', seat),
      state,
    });
  }

  const leftInfo = getSlotMetaForSpectator(room, 'player');
  const rightInfo = getSlotMetaForSpectator(room, 'enemy');
  for (const spec of room.spectators.values()) {
    const client = clients.get(spec.clientId);
    const state = engine.getSpectatorState(spec.view, leftInfo, rightInfo);
    sendMsg(client, {
      type: 'match:start',
      room: buildRoomInfo(room, spec.clientId, 'spectator', null),
      state,
    });
  }
}

function pushMatchStateToRoom(room: PvpRoom) {
  const engine = room.engine;
  if (!engine) return;
  room.pendingStatePush = false;
  room.lastPushAt = Date.now();

  for (const seat of ['player', 'enemy'] as PvpSeat[]) {
    const mySlot = room.slots[seat];
    const oppSlot = room.slots[seat === 'player' ? 'enemy' : 'player'];
    if (!mySlot || mySlot.isAi || !mySlot.connected) continue;
    const client = clients.get(mySlot.clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) continue;
    if (client.ws.bufferedAmount > MAX_WS_BUFFERED_BYTES) continue;
    const state = engine.getPerspectiveState(
      seat,
      mySlot.selectedLane,
      mySlot.selectedTowerType,
      'none',
      oppSlot ? oppSlot.name : '對手',
      Boolean(oppSlot?.connected)
    );
    sendMsg(client, { type: 'match:state', state });
  }

  if (room.spectators.size > 0) {
    const leftInfo = getSlotMetaForSpectator(room, 'player');
    const rightInfo = getSlotMetaForSpectator(room, 'enemy');
    const cachedByView = new Map<SpectatorViewMode, ReturnType<BattleEngine['getSpectatorState']>>();
    for (const spec of room.spectators.values()) {
      if (!spec.connected) continue;
      const client = clients.get(spec.clientId);
      if (!client || client.ws.readyState !== WebSocket.OPEN) continue;
      if (client.ws.bufferedAmount > MAX_WS_BUFFERED_BYTES) continue;
      let state = cachedByView.get(spec.view);
      if (!state) {
        state = engine.getSpectatorState(spec.view, leftInfo, rightInfo);
        cachedByView.set(spec.view, state);
      }
      sendMsg(client, { type: 'match:state', state });
    }
  }
}

function resetHumanReadyFlags(room: PvpRoom) {
  for (const seat of ['player', 'enemy'] as PvpSeat[]) {
    const slot = room.slots[seat];
    if (slot && !slot.isAi) slot.ready = false;
  }
}

function detachClientFromRoom(client: ConnectedClient, gracefulLeave: boolean) {
  removeFromQueue(client.id);
  if (!client.roomCode || !client.role) return;

  const room = rooms.get(client.roomCode);
  const prevRole = client.role;
  const prevSeat = client.seat;
  client.roomCode = null;
  client.role = null;
  client.seat = null;
  notifyWatchersOfFriendCode(client.friendCode);

  if (!room) return;

  if (prevRole === 'spectator') {
    const spec = room.spectators.get(client.id);
    if (gracefulLeave) {
      room.spectators.delete(client.id);
      ensureValidHost(room);
      if (getHumanMemberIds(room).length > 0) {
        broadcastRoomState(room);
        pushRoomChat(room, '系統', 'system', null, `${client.name} 已離開觀戰。`);
      }
    } else if (spec) {
      spec.connected = false;
      ensureValidHost(room);
      broadcastRoomState(room);
      setTimeout(() => {
        const current = room.spectators.get(client.id);
        if (current && !current.connected) {
          room.spectators.delete(client.id);
          broadcastRoomState(room);
          cleanupRoomIfEmpty(room);
        }
      }, DISCONNECT_FORFEIT_MS);
    }
    cleanupRoomIfEmpty(room, gracefulLeave);
    return;
  }

  if (!prevSeat) return;

  const mySlot = room.slots[prevSeat];
  const oppSeat: PvpSeat = prevSeat === 'player' ? 'enemy' : 'player';
  const oppSlot = room.slots[oppSeat];

  if (room.phase === 'playing' && room.engine && room.engine.screen === 'PLAYING') {
    if (gracefulLeave) {
      if (mySlot) mySlot.connected = false;
      room.engine.surrender(prevSeat);
      room.phase = 'ended';
      room.rematchVotes.clear();
      clearRoomTimers(room);
      ensureValidHost(room);
      pushMatchStateToRoom(room);
      broadcastRoomState(room);
      sendNoticeToRoom(room, `${mySlot?.name ?? '玩家'} 已離開戰局，對手自動獲勝！`, 'info');
    } else {
      // Unplanned socket disconnect (vs human OR vs AI): 45s grace for automatic seamless rejoin!
      if (mySlot) mySlot.connected = false;
      ensureValidHost(room);
      broadcastRoomState(room);
      pushMatchStateToRoom(room);
      sendNoticeToRoom(room, `${mySlot?.name ?? '玩家'} 暫時斷線，等待自動重連（45 秒內可無縫續戰）。`, 'warn');
      const prevTimer = room.disconnectTimers[prevSeat];
      if (prevTimer) clearTimeout(prevTimer);
      room.disconnectTimers[prevSeat] = setTimeout(() => {
        delete room.disconnectTimers[prevSeat];
        const latestSlot = room.slots[prevSeat];
        if (
          latestSlot &&
          !latestSlot.connected &&
          room.phase === 'playing' &&
          room.engine &&
          room.engine.screen === 'PLAYING'
        ) {
          room.engine.surrender(prevSeat);
          room.phase = 'ended';
          room.rematchVotes.clear();
          pushMatchStateToRoom(room);
          broadcastRoomState(room);
          sendNoticeToRoom(room, `${latestSlot.name} 逾時未重連，對手獲得勝利！`, 'info');
        }
        cleanupRoomIfEmpty(room, true);
      }, DISCONNECT_FORFEIT_MS);
    }
  } else {
    cancelRoomCountdown(room, `${mySlot?.name ?? '玩家'} 已離席，開戰倒數已取消。`);
    room.slots[prevSeat] = null;
    room.rematchVotes.clear();
    if (oppSlot && !oppSlot.isAi && oppSlot.connected) {
      oppSlot.ready = false;
    }
    if (room.phase === 'ended' && getHumanMemberIds(room).length > 0) {
      room.phase = 'lobby';
      room.engine = null;
    }
    ensureValidHost(room);
    if (getHumanMemberIds(room).length > 0) {
      broadcastRoomState(room);
      sendNoticeToRoom(room, `${mySlot?.name ?? '玩家'} 已離開房間。`, 'warn');
      pushRoomChat(room, '系統', 'system', null, `${mySlot?.name ?? '玩家'} 已離開房間。`);
    }
  }

  cleanupRoomIfEmpty(room, gracefulLeave);
}

function handleGameCommand(client: ConnectedClient, cmd: PvpCommand) {
  // Spectators and non-seated clients are strictly read-only!
  if (client.role !== 'player' || !client.roomCode || !client.seat) return;
  const room = rooms.get(client.roomCode);
  if (!room || room.phase !== 'playing' || !room.engine || room.engine.screen !== 'PLAYING') return;

  const seat = client.seat;
  const slot = room.slots[seat];
  if (!slot || slot.isAi || slot.clientId !== client.id) return;

  const engine = room.engine;
  const isMirrored = seat === 'enemy';
  const toWorldX = (x: number) => (isMirrored ? WORLD_WIDTH - x : x);

  switch (cmd.type) {
    case 'select_lane': {
      if (!isValidLane(cmd.lane)) return;
      slot.selectedLane = cmd.lane;
      return;
    }
    case 'select_squad': {
      return;
    }
    case 'set_stance': {
      if (!isValidLane(cmd.lane) || !isValidStance(cmd.stance)) return;
      engine.setTeamLaneStance(seat, cmd.lane, cmd.stance);
      break;
    }
    case 'set_squad_stance': {
      if (!isValidStance(cmd.stance)) return;
      engine.setTeamSquadStance(seat, cmd.stance);
      break;
    }
    case 'train_unit': {
      if (
        typeof cmd.unitIndex !== 'number' ||
        !Number.isInteger(cmd.unitIndex) ||
        cmd.unitIndex < 0 ||
        cmd.unitIndex > 8 ||
        !isValidLane(cmd.lane)
      ) {
        return;
      }
      slot.selectedLane = cmd.lane;
      engine.trainUnit(cmd.unitIndex, cmd.lane, seat);
      break;
    }
    case 'start_tower': {
      if (typeof cmd.padId !== 'string' || !isValidTowerType(cmd.towerType)) return;
      const realPadId = isMirrored ? flipPadIdForSeat2(cmd.padId) : cmd.padId;
      if (!VALID_PAD_IDS.has(realPadId)) return;
      const upMode = cmd.upgradeMode === 'mining' ? 'mining' : cmd.upgradeMode === 'tech' ? 'tech' : 'combat';
      slot.selectedTowerType = cmd.towerType;
      engine.startTowerOnPad(realPadId, cmd.towerType, seat, upMode);
      break;
    }
    case 'quick_tower': {
      if (!isValidLane(cmd.lane) || !isValidTowerType(cmd.towerType)) return;
      const upMode = cmd.upgradeMode === 'mining' ? 'mining' : cmd.upgradeMode === 'tech' ? 'tech' : 'combat';
      slot.selectedLane = cmd.lane;
      slot.selectedTowerType = cmd.towerType;
      engine.quickBuildTowerForTeam(seat, cmd.lane, cmd.towerType, upMode);
      break;
    }
    case 'build_depot': {
      const rawDepotId = typeof cmd.depotId === 'string' ? cmd.depotId : undefined;
      const targetDepotId = rawDepotId && isMirrored ? flipPadIdForSeat2(rawDepotId) : rawDepotId;
      engine.buildSupplyDepot(seat, targetDepotId);
      break;
    }
    case 'build_barracks': {
      if (cmd.tier !== 1 && cmd.tier !== 2 && cmd.tier !== 3) return;
      engine.buildBarracks(cmd.tier, seat);
      break;
    }
    case 'build_armory': {
      if (cmd.kind !== 'bio_lab' && cmd.kind !== 'mech_bay') return;
      engine.buildArmoryBuilding(cmd.kind, seat);
      break;
    }
    case 'build_extractor': {
      const rawExtId = typeof cmd.extractorId === 'string' ? cmd.extractorId : undefined;
      const targetExtId = rawExtId && isMirrored ? flipPadIdForSeat2(rawExtId) : rawExtId;
      engine.buildOrUpgradeExtractor(seat, targetExtId);
      break;
    }
    case 'cancel_building': {
      if (
        (cmd.kind !== 'pad' &&
          cmd.kind !== 'depot' &&
          cmd.kind !== 'barracks' &&
          cmd.kind !== 'armory' &&
          cmd.kind !== 'extractor') ||
        typeof cmd.id !== 'string'
      ) {
        return;
      }
      const realId = isMirrored ? flipPadIdForSeat2(cmd.id) : cmd.id;
      engine.cancelBuilding(seat, cmd.kind, realId);
      break;
    }
    case 'upgrade_econ': {
      engine.upgradeEconomy(seat);
      break;
    }
    case 'upgrade_tech': {
      engine.upgradeTech(seat);
      break;
    }
    case 'upgrade_armory': {
      if (!isValidArmoryTrack(cmd.track)) return;
      engine.upgradeArmoryTrack(cmd.track, seat);
      break;
    }
    case 'research_special': {
      if (cmd.slot !== 0 && cmd.slot !== 1) return;
      engine.researchSpecialTech(cmd.slot, seat);
      break;
    }
    case 'form_squad': {
      if (
        !Array.isArray(cmd.unitIds) ||
        cmd.unitIds.length === 0 ||
        cmd.unitIds.length > 200 ||
        !isValidCoord(cmd.targetX, cmd.targetY)
      ) {
        return;
      }
      const cleanIds = cmd.unitIds.filter((id) => typeof id === 'number' && Number.isInteger(id) && id > 0);
      if (cleanIds.length === 0) return;
      engine.formSquad(seat, cleanIds, toWorldX(cmd.targetX), cmd.targetY);
      break;
    }
    case 'disband_squad': {
      engine.disbandSquad(seat);
      break;
    }
    case 'repair_nexus': {
      engine.repairNexusPlating(seat);
      break;
    }
    case 'scan': {
      if (!isValidCoord(cmd.x, cmd.y)) return;
      engine.castScan(seat, toWorldX(cmd.x), cmd.y);
      break;
    }
    case 'faction_skill': {
      if (!isValidCoord(cmd.x, cmd.y)) return;
      engine.castFactionSkill(seat, toWorldX(cmd.x), cmd.y);
      break;
    }
    case 'k_boost': {
      if (!isValidCoord(cmd.x, cmd.y)) return;
      engine.castKBoost(seat, toWorldX(cmd.x), cmd.y);
      break;
    }
    case 'surrender': {
      engine.surrender(seat);
      room.phase = 'ended';
      room.rematchVotes.clear();
      pushMatchStateToRoom(room);
      broadcastRoomState(room);
      return;
    }
    default:
      return;
  }

  // Throttle command-triggered state broadcasts so rapid clicks don't flood proxies
  const now = Date.now();
  if (now - room.lastPushAt >= MIN_CMD_PUSH_GAP_MS) {
    pushMatchStateToRoom(room);
  } else {
    room.pendingStatePush = true;
  }
}

function handleClientMessage(client: ConnectedClient, raw: string) {
  const now = Date.now();
  client.alive = true;
  client.lastSeen = now;

  if (now - client.msgWindowStart >= 1000) {
    client.msgWindowStart = now;
    client.msgCount = 0;
  }
  client.msgCount++;
  if (client.msgCount > MAX_MSGS_PER_SEC) {
    return;
  }

  let msg: ClientWsMessage;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') return;
    msg = parsed as ClientWsMessage;
  } catch {
    return;
  }

  switch (msg.type) {
    case 'ping': {
      sendMsg(client, { type: 'pong', ts: typeof msg.ts === 'number' ? msg.ts : now });
      return;
    }
    case 'presence:register': {
      const prevCode = client.friendCode;
      const nextCode = sanitizeFriendCode(msg.friendCode);
      client.name = sanitizeName(msg.name);
      if (nextCode) client.friendCode = nextCode;
      client.watchedFriends.clear();
      if (Array.isArray(msg.friendCodes)) {
        for (const rawCode of msg.friendCodes.slice(0, 50)) {
          const valid = sanitizeFriendCode(rawCode);
          if (valid && valid !== client.friendCode) {
            client.watchedFriends.add(valid);
          }
        }
      }
      sendFriendStatusesTo(client);
      if (prevCode && prevCode !== client.friendCode) {
        notifyWatchersOfFriendCode(prevCode);
      }
      notifyWatchersOfFriendCode(client.friendCode);
      if (client.roomCode) {
        const room = rooms.get(client.roomCode);
        if (room) {
          if (client.role === 'player' && client.seat && room.slots[client.seat]?.clientId === client.id) {
            room.slots[client.seat]!.name = client.name;
          } else if (client.role === 'spectator' && room.spectators.has(client.id)) {
            room.spectators.get(client.id)!.name = client.name;
          }
          broadcastRoomState(room);
        }
      }
      return;
    }
    case 'friend:invite': {
      const targetCode = sanitizeFriendCode(msg.targetFriendCode);
      const roomCode = typeof msg.roomCode === 'string' ? msg.roomCode.toUpperCase().trim() : '';
      const room = rooms.get(roomCode);
      if (!targetCode || !room || client.roomCode !== room.code) {
        sendMsg(client, { type: 'friend:invite_result', ok: false, message: '請先進入對戰房間再發送邀請。' });
        return;
      }
      let sent = 0;
      const invite = {
        id: crypto.randomUUID(),
        fromFriendCode: client.friendCode ?? '',
        fromName: client.name,
        roomCode: room.code,
        mapMode: room.mapMode,
        timestamp: now,
      };
      for (const other of clients.values()) {
        if (other.id !== client.id && other.friendCode === targetCode && other.ws.readyState === WebSocket.OPEN) {
          sendMsg(other, { type: 'friend:invited', invite });
          sent++;
        }
      }
      if (sent === 0) {
        sendMsg(client, { type: 'friend:invite_result', ok: false, message: '該好友目前不在線上。' });
      } else {
        sendMsg(client, { type: 'friend:invite_result', ok: true, message: `已發送房號 ${room.code} 邀請給好友！` });
      }
      return;
    }
    case 'room:create': {
      if (!isValidFaction(msg.faction)) {
        sendMsg(client, { type: 'room:error', message: '無效的文明選項。' });
        return;
      }
      if (rooms.size >= MAX_ROOMS) {
        sendMsg(client, { type: 'room:error', message: '目前線上房間已滿，請稍後再試。' });
        return;
      }
      detachClientFromRoom(client, true);
      client.name = sanitizeName(msg.name);
      client.faction = msg.faction;
      client.sessionToken = sanitizeSessionToken(msg.sessionToken, client.sessionToken);

      const code = generateRoomCode();
      const mapMode: MapMode = isValidMapMode(msg.mapMode) ? msg.mapMode : 'standard';
      const room: PvpRoom = {
        code,
        hostClientId: client.id,
        phase: 'lobby',
        mapMode,
        slots: {
          player: {
            clientId: client.id,
            sessionToken: client.sessionToken,
            seat: 'player',
            name: client.name,
            faction: client.faction,
            ready: false,
            connected: true,
            isAi: false,
            selectedLane: mapMode === 'simple' ? 0 : 1,
            selectedTowerType: 'watchtower',
          },
          enemy: null,
        },
        spectators: new Map(),
        chatHistory: [],
        engine: null,
        rematchVotes: new Set(),
        disconnectTimers: {},
        emptyRoomTimer: null,
        countdownSeconds: null,
        countdownTimer: null,
        pendingStatePush: false,
        lastPushAt: 0,
        createdAt: now,
      };
      rooms.set(code, room);
      client.roomCode = code;
      client.role = 'player';
      client.seat = 'player';
      sendChatHistory(client, room);
      pushRoomChat(
        room,
        '系統',
        'system',
        null,
        `${client.name} 建立了自訂房間 ${code}（${mapMode === 'simple' ? '簡易雙線速戰' : '標準三線戰場'}）。`
      );
      broadcastRoomState(room);
      return;
    }

    case 'room:config_map': {
      if (!client.roomCode) return;
      const room = rooms.get(client.roomCode);
      if (!room || room.phase !== 'lobby') return;
      if (room.hostClientId !== client.id) {
        sendMsg(client, { type: 'room:error', message: '僅房主可以切換地圖模式。' });
        return;
      }
      if (!isValidMapMode(msg.mapMode) || room.mapMode === msg.mapMode) return;
      room.mapMode = msg.mapMode;
      cancelRoomCountdown(room, '房主切換了地圖模式，請重新準備。');
      resetHumanReadyFlags(room);
      broadcastRoomState(room);
      pushRoomChat(
        room,
        '系統',
        'system',
        null,
        `房主已將戰場切換為【${msg.mapMode === 'simple' ? '簡易雙線速戰' : '標準三線戰場'}】。`
      );
      return;
    }

    case 'room:join': {
      const code = sanitizeRoomCode(msg.code);
      if (!code || !isValidFaction(msg.faction)) {
        sendMsg(client, { type: 'room:error', message: '請輸入正確的 4 碼房號。' });
        return;
      }
      const room = rooms.get(code);
      if (!room) {
        sendMsg(client, { type: 'room:error', message: `找不到房號 ${code}，請確認房號是否正確。` });
        return;
      }

      const wantSpectate = Boolean(msg.asSpectator);

      if (wantSpectate) {
        if (room.spectators.size >= MAX_SPECTATORS_PER_ROOM) {
          sendMsg(client, {
            type: 'room:error',
            message: `該房間觀戰人數已達上限 (${MAX_SPECTATORS_PER_ROOM}/${MAX_SPECTATORS_PER_ROOM})。`,
          });
          return;
        }
        detachClientFromRoom(client, true);
        client.name = sanitizeName(msg.name);
        client.faction = msg.faction;
        client.sessionToken = sanitizeSessionToken(msg.sessionToken, client.sessionToken);

        room.spectators.set(client.id, {
          clientId: client.id,
          sessionToken: client.sessionToken,
          name: client.name,
          view: 'all',
          connected: true,
        });
        client.roomCode = code;
        client.role = 'spectator';
        client.seat = null;

        sendChatHistory(client, room);
        if ((room.phase === 'playing' || room.phase === 'ended') && room.engine) {
          const leftInfo = getSlotMetaForSpectator(room, 'player');
          const rightInfo = getSlotMetaForSpectator(room, 'enemy');
          const state = room.engine.getSpectatorState('all', leftInfo, rightInfo);
          sendMsg(client, {
            type: 'match:start',
            room: buildRoomInfo(room, client.id, 'spectator', null),
            state,
          });
          broadcastRoomState(room);
          sendNoticeToRoom(room, `${client.name} 已進入觀戰。`, 'info');
        } else {
          broadcastRoomState(room);
        }
        pushRoomChat(room, '系統', 'system', null, `${client.name} 加入了觀戰席。`);
        return;
      }

      // Join as combatant
      if (room.phase !== 'lobby') {
        sendMsg(client, {
          type: 'room:error',
          message: '該房間已經開戰中，可改點「加入觀戰」即時觀看戰局！',
        });
        return;
      }
      if (room.slots.player && room.slots.enemy) {
        sendMsg(client, {
          type: 'room:error',
          message: '對戰席位已滿 (2/2)，可改點「加入觀戰」！',
        });
        return;
      }

      detachClientFromRoom(client, true);
      client.name = sanitizeName(msg.name);
      client.faction = msg.faction;
      client.sessionToken = sanitizeSessionToken(msg.sessionToken, client.sessionToken);

      const openSeat: PvpSeat = room.slots.player ? 'enemy' : 'player';
      room.slots[openSeat] = {
        clientId: client.id,
        sessionToken: client.sessionToken,
        seat: openSeat,
        name: client.name,
        faction: client.faction,
        ready: false,
        connected: true,
        isAi: false,
        selectedLane: room.mapMode === 'simple' ? 0 : 1,
        selectedTowerType: 'watchtower',
      };
      client.roomCode = code;
      client.role = 'player';
      client.seat = openSeat;
      sendChatHistory(client, room);
      broadcastRoomState(room);
      pushRoomChat(
        room,
        '系統',
        'system',
        null,
        `${client.name} 加入了${openSeat === 'player' ? '藍方' : '紅方'}席位。`
      );
      return;
    }

    case 'room:rejoin': {
      const code = sanitizeRoomCode(msg.code);
      const token = sanitizeSessionToken(msg.sessionToken, '');
      if (!code || !token) {
        sendMsg(client, { type: 'room:rejoin_failed', reason: '無效的重連憑證。' });
        return;
      }
      const room = rooms.get(code);
      if (!room) {
        sendMsg(client, { type: 'room:rejoin_failed', reason: '房間已關閉或已結束。' });
        return;
      }

      // 1. Try matching an existing player seat by sessionToken
      for (const seat of ['player', 'enemy'] as PvpSeat[]) {
        const slot = room.slots[seat];
        if (!slot || slot.isAi || slot.sessionToken !== token) continue;

        const oldClientId = slot.clientId;
        if (oldClientId !== client.id) {
          const oldClient = clients.get(oldClientId);
          if (oldClient) {
            oldClient.roomCode = null;
            oldClient.role = null;
            oldClient.seat = null;
          }
        }

        // Cancel pending forfeit & empty-room timers
        const seatTimer = room.disconnectTimers[seat];
        if (seatTimer) {
          clearTimeout(seatTimer);
          delete room.disconnectTimers[seat];
        }
        if (room.emptyRoomTimer) {
          clearTimeout(room.emptyRoomTimer);
          room.emptyRoomTimer = null;
        }

        slot.clientId = client.id;
        slot.connected = true;
        if (room.hostClientId === oldClientId) {
          room.hostClientId = client.id;
        }

        client.sessionToken = token;
        client.name = slot.name;
        client.faction = slot.faction;
        client.roomCode = room.code;
        client.role = 'player';
        client.seat = seat;

        sendChatHistory(client, room);
        if ((room.phase === 'playing' || room.phase === 'ended') && room.engine) {
          const oppSlot = room.slots[seat === 'player' ? 'enemy' : 'player'];
          const state = room.engine.getPerspectiveState(
            seat,
            slot.selectedLane,
            slot.selectedTowerType,
            'none',
            oppSlot ? oppSlot.name : '對手',
            Boolean(oppSlot?.connected)
          );
          sendMsg(client, {
            type: 'match:start',
            room: buildRoomInfo(room, client.id, 'player', seat),
            state,
            isRejoin: true,
          });
          pushMatchStateToRoom(room);
        }
        broadcastRoomState(room);
        sendNoticeToRoom(room, `${slot.name} 已重新連線！`, 'info');
        return;
      }

      // 2. Try matching an existing spectator by sessionToken
      for (const [oldSpecId, spec] of room.spectators.entries()) {
        if (spec.sessionToken !== token) continue;
        room.spectators.delete(oldSpecId);
        if (room.emptyRoomTimer) {
          clearTimeout(room.emptyRoomTimer);
          room.emptyRoomTimer = null;
        }
        const updatedSpec: RoomSpectator = {
          ...spec,
          clientId: client.id,
          connected: true,
        };
        room.spectators.set(client.id, updatedSpec);
        if (room.hostClientId === oldSpecId) {
          room.hostClientId = client.id;
        }

        client.sessionToken = token;
        client.name = updatedSpec.name;
        client.roomCode = room.code;
        client.role = 'spectator';
        client.seat = null;

        sendChatHistory(client, room);
        if ((room.phase === 'playing' || room.phase === 'ended') && room.engine) {
          const leftInfo = getSlotMetaForSpectator(room, 'player');
          const rightInfo = getSlotMetaForSpectator(room, 'enemy');
          const state = room.engine.getSpectatorState(updatedSpec.view, leftInfo, rightInfo);
          sendMsg(client, {
            type: 'match:start',
            room: buildRoomInfo(room, client.id, 'spectator', null),
            state,
            isRejoin: true,
          });
        }
        broadcastRoomState(room);
        return;
      }

      sendMsg(client, { type: 'room:rejoin_failed', reason: '找不到對應的對戰席位。' });
      return;
    }

    case 'room:add_ai': {
      if (!client.roomCode) return;
      const room = rooms.get(client.roomCode);
      if (!room || room.phase !== 'lobby') return;
      if (room.hostClientId !== client.id) {
        sendMsg(client, { type: 'room:error', message: '僅房主可以新增電腦 AI。' });
        return;
      }
      if (!isValidSeat(msg.seat) || !isValidFaction(msg.faction) || !isValidDifficulty(msg.difficulty)) {
        sendMsg(client, { type: 'room:error', message: '無效的電腦 AI 設定參數。' });
        return;
      }
      if (room.slots[msg.seat] !== null) {
        sendMsg(client, { type: 'room:error', message: '該席位已被佔用。' });
        return;
      }
      const aiArchetype: AIArchetypeOption =
        msg.aiArchetype !== undefined && isValidAiArchetypeOption(msg.aiArchetype) ? msg.aiArchetype : 'random';
      room.slots[msg.seat] = createAiSlot(msg.seat, msg.faction, msg.difficulty, aiArchetype);
      broadcastRoomState(room);
      return;
    }

    case 'room:remove_ai': {
      if (!client.roomCode) return;
      const room = rooms.get(client.roomCode);
      if (!room || room.phase !== 'lobby') return;
      if (room.hostClientId !== client.id) {
        sendMsg(client, { type: 'room:error', message: '僅房主可以移除電腦 AI。' });
        return;
      }
      if (!isValidSeat(msg.seat)) return;
      const targetSlot = room.slots[msg.seat];
      if (!targetSlot || !targetSlot.isAi) return;
      room.slots[msg.seat] = null;
      cancelRoomCountdown(room, '房主調整了席位，倒數已取消。');
      resetHumanReadyFlags(room);
      broadcastRoomState(room);
      return;
    }

    case 'room:config_ai': {
      if (!client.roomCode) return;
      const room = rooms.get(client.roomCode);
      if (!room || room.phase !== 'lobby') return;
      if (room.hostClientId !== client.id) {
        sendMsg(client, { type: 'room:error', message: '僅房主可以調整電腦 AI 設定。' });
        return;
      }
      if (!isValidSeat(msg.seat)) return;
      const targetSlot = room.slots[msg.seat];
      if (!targetSlot || !targetSlot.isAi) return;
      if (msg.faction !== undefined && isValidFaction(msg.faction)) {
        targetSlot.faction = msg.faction;
      }
      if (msg.difficulty !== undefined && isValidDifficulty(msg.difficulty)) {
        targetSlot.aiDifficulty = msg.difficulty;
      }
      if (msg.aiArchetype !== undefined && isValidAiArchetypeOption(msg.aiArchetype)) {
        targetSlot.aiArchetype = msg.aiArchetype;
      }
      targetSlot.name = formatAiDisplayName(
        targetSlot.aiDifficulty ?? 'standard',
        targetSlot.aiArchetype ?? 'random'
      );
      broadcastRoomState(room);
      return;
    }

    case 'room:switch_role': {
      if (!client.roomCode || !client.role) return;
      const room = rooms.get(client.roomCode);
      if (!room || room.phase !== 'lobby') return;

      if (msg.target === 'spectator') {
        if (client.role === 'spectator') return;
        if (room.spectators.size >= MAX_SPECTATORS_PER_ROOM) {
          sendMsg(client, {
            type: 'room:error',
            message: `觀戰席位已滿 (${MAX_SPECTATORS_PER_ROOM}/${MAX_SPECTATORS_PER_ROOM})。`,
          });
          return;
        }
        if (client.seat && room.slots[client.seat]?.clientId === client.id) {
          room.slots[client.seat] = null;
        }
        room.spectators.set(client.id, {
          clientId: client.id,
          sessionToken: client.sessionToken,
          name: client.name,
          view: 'all',
          connected: true,
        });
        client.role = 'spectator';
        client.seat = null;
        cancelRoomCountdown(room, `${client.name} 切換至觀戰席，倒數已取消。`);
        resetHumanReadyFlags(room);
        broadcastRoomState(room);
        return;
      }

      if (!isValidSeat(msg.target)) return;
      if (room.slots[msg.target] !== null) {
        sendMsg(client, { type: 'room:error', message: '目標席位已被佔用。' });
        return;
      }

      if (client.role === 'spectator') {
        room.spectators.delete(client.id);
      } else if (client.seat && room.slots[client.seat]?.clientId === client.id) {
        room.slots[client.seat] = null;
      }

      room.slots[msg.target] = {
        clientId: client.id,
        sessionToken: client.sessionToken,
        seat: msg.target,
        name: client.name,
        faction: client.faction,
        ready: false,
        connected: true,
        isAi: false,
        selectedLane: room.mapMode === 'simple' ? 0 : 1,
        selectedTowerType: 'watchtower',
      };
      client.role = 'player';
      client.seat = msg.target;
      cancelRoomCountdown(room, `${client.name} 更換了席位，倒數已取消。`);
      resetHumanReadyFlags(room);
      broadcastRoomState(room);
      return;
    }

    case 'room:start_match': {
      if (!client.roomCode) return;
      const room = rooms.get(client.roomCode);
      if (!room || room.phase !== 'lobby') return;
      if (room.hostClientId !== client.id) {
        sendMsg(client, { type: 'room:error', message: '僅房主可以直接啟動對戰。' });
        return;
      }
      const p = room.slots.player;
      const e = room.slots.enemy;
      if (!p || !e || !p.connected || !e.connected) {
        sendMsg(client, { type: 'room:error', message: '藍方與紅方席位皆須有人或電腦 AI 才能開戰。' });
        return;
      }
      // If host is seated as a combatant, auto-ready host when clicking start
      for (const slot of [p, e]) {
        if (!slot.isAi && slot.clientId === client.id) {
          slot.ready = true;
        }
      }
      const unreadyHuman = [p, e].find((s) => !s.isAi && !s.ready);
      if (unreadyHuman) {
        sendMsg(client, { type: 'room:error', message: `尚有參戰玩家（${unreadyHuman.name}）未按下準備完成。` });
        broadcastRoomState(room);
        return;
      }
      if (room.countdownSeconds !== null) return;
      beginMatchCountdown(room, 3);
      return;
    }

    case 'room:quickmatch': {
      if (!isValidFaction(msg.faction)) return;
      detachClientFromRoom(client, true);
      client.name = sanitizeName(msg.name);
      client.faction = msg.faction;
      client.sessionToken = sanitizeSessionToken(msg.sessionToken, client.sessionToken);

      for (let i = quickMatchQueue.length - 1; i >= 0; i--) {
        const qid = quickMatchQueue[i];
        const qc = clients.get(qid);
        if (!qc || qc.ws.readyState !== WebSocket.OPEN || qc.roomCode !== null) {
          quickMatchQueue.splice(i, 1);
        }
      }

      const partnerId = quickMatchQueue.find((id) => id !== client.id);
      if (partnerId) {
        removeFromQueue(partnerId);
        const partner = clients.get(partnerId);
        if (partner && rooms.size < MAX_ROOMS) {
          const code = generateRoomCode();
          const room: PvpRoom = {
            code,
            hostClientId: partner.id,
            phase: 'lobby',
            mapMode: 'standard',
            slots: {
              player: {
                clientId: partner.id,
                sessionToken: partner.sessionToken,
                seat: 'player',
                name: partner.name,
                faction: partner.faction,
                ready: true,
                connected: true,
                isAi: false,
                selectedLane: 1,
                selectedTowerType: 'watchtower',
              },
              enemy: {
                clientId: client.id,
                sessionToken: client.sessionToken,
                seat: 'enemy',
                name: client.name,
                faction: client.faction,
                ready: true,
                connected: true,
                isAi: false,
                selectedLane: 1,
                selectedTowerType: 'watchtower',
              },
            },
            spectators: new Map(),
            chatHistory: [],
            engine: null,
            rematchVotes: new Set(),
            disconnectTimers: {},
            emptyRoomTimer: null,
            countdownSeconds: null,
            countdownTimer: null,
            pendingStatePush: false,
            lastPushAt: 0,
            createdAt: now,
          };
          rooms.set(code, room);
          partner.roomCode = code;
          partner.role = 'player';
          partner.seat = 'player';
          client.roomCode = code;
          client.role = 'player';
          client.seat = 'enemy';
          sendChatHistory(partner, room);
          sendChatHistory(client, room);
          beginMatchCountdown(room, 3);
          return;
        }
      }

      if (!quickMatchQueue.includes(client.id)) {
        quickMatchQueue.push(client.id);
      }
      sendMsg(client, { type: 'queue:waiting', queueSize: quickMatchQueue.length });
      return;
    }

    case 'room:cancel_queue': {
      removeFromQueue(client.id);
      sendMsg(client, { type: 'queue:cancelled' });
      return;
    }

    case 'room:faction': {
      if (!isValidFaction(msg.faction)) return;
      client.faction = msg.faction;
      if (!client.roomCode || client.role !== 'player' || !client.seat) return;
      const room = rooms.get(client.roomCode);
      if (!room || room.phase !== 'lobby') return;
      const slot = room.slots[client.seat];
      if (!slot || slot.isAi) return;
      slot.faction = msg.faction;
      slot.ready = false;
      cancelRoomCountdown(room, `${slot.name} 切換了文明，倒數已取消。`);
      broadcastRoomState(room);
      return;
    }

    case 'room:ready': {
      if (typeof msg.ready !== 'boolean' || !client.roomCode || client.role !== 'player' || !client.seat) return;
      const room = rooms.get(client.roomCode);
      if (!room || room.phase !== 'lobby') return;
      const slot = room.slots[client.seat];
      if (!slot || slot.isAi) return;
      slot.ready = msg.ready;

      const p = room.slots.player;
      const e = room.slots.enemy;
      if (p && e && p.connected && e.connected && p.ready && e.ready) {
        if (room.countdownSeconds === null) {
          beginMatchCountdown(room, 3);
        }
      } else {
        if (!msg.ready && room.countdownSeconds !== null) {
          cancelRoomCountdown(room, `${slot.name} 取消準備，開戰倒數已停止。`);
        }
        broadcastRoomState(room);
      }
      return;
    }

    case 'room:rematch': {
      if (!client.roomCode || !client.role) return;
      const room = rooms.get(client.roomCode);
      if (!room || room.phase !== 'ended') return;
      const p = room.slots.player;
      const e = room.slots.enemy;
      if (!p || !e || !p.connected || !e.connected) {
        sendMsg(client, { type: 'room:error', message: '對手已離開，無法重賽。' });
        return;
      }

      // AI vs AI: Host (spectator) can start countdown for a new match
      if (p.isAi && e.isAi) {
        if (room.hostClientId === client.id && room.countdownSeconds === null) {
          beginMatchCountdown(room, 3);
        }
        return;
      }

      if (client.role !== 'player' || !client.seat) return;
      room.rematchVotes.add(client.seat);
      const oppSeat: PvpSeat = client.seat === 'player' ? 'enemy' : 'player';
      const oppSlot = room.slots[oppSeat];
      if (oppSlot?.isAi) {
        room.rematchVotes.add(oppSeat);
      }

      if (room.rematchVotes.has('player') && room.rematchVotes.has('enemy')) {
        if (room.countdownSeconds === null) {
          beginMatchCountdown(room, 3);
        }
      } else {
        broadcastRoomState(room);
      }
      return;
    }

    case 'room:leave': {
      detachClientFromRoom(client, true);
      sendMsg(client, { type: 'room:left' });
      return;
    }

    case 'spectator:view': {
      if (client.role !== 'spectator' || !client.roomCode) return;
      if (!isValidSpectatorView(msg.view)) return;
      const room = rooms.get(client.roomCode);
      if (!room) return;
      const spec = room.spectators.get(client.id);
      if (!spec) return;
      spec.view = msg.view;
      if (room.engine) {
        const leftInfo = getSlotMetaForSpectator(room, 'player');
        const rightInfo = getSlotMetaForSpectator(room, 'enemy');
        const state = room.engine.getSpectatorState(spec.view, leftInfo, rightInfo);
        sendMsg(client, { type: 'match:state', state });
      }
      return;
    }

    case 'chat:send': {
      if (!client.roomCode || !client.role) return;
      const room = rooms.get(client.roomCode);
      if (!room) return;

      // Verify caller is an active member (seated player or registered spectator) of this room
      const isActivePlayer =
        client.role === 'player' &&
        client.seat !== null &&
        room.slots[client.seat]?.clientId === client.id;
      const isActiveSpectator = client.role === 'spectator' && room.spectators.has(client.id);
      if (!isActivePlayer && !isActiveSpectator) return;

      const text = sanitizeChatText(msg.text);
      if (!text) return;

      // Per-client chat flood rate limit
      const cutoff = now - CHAT_RATE_WINDOW_MS;
      client.chatTimestamps = client.chatTimestamps.filter((ts) => ts > cutoff);
      if (client.chatTimestamps.length >= CHAT_RATE_MAX_MSGS) {
        sendMsg(client, { type: 'match:notice', text: '發送訊息過於頻繁，請稍候再試。', severity: 'warn' });
        return;
      }
      client.chatTimestamps.push(now);

      pushRoomChat(room, client.name, client.role, client.seat, text);
      return;
    }

    case 'game:cmd': {
      if (!msg.cmd || typeof msg.cmd !== 'object') return;
      handleGameCommand(client, msg.cmd);
      return;
    }
  }
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      online: clients.size,
      rooms: rooms.size,
      queued: quickMatchQueue.length,
    });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = http.createServer(app);
  // Align Node HTTP keep-alive timeouts above GCP/Cloud Run load balancer 60s timeout
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  const wss = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: 65_536,
    perMessageDeflate: false,
  });

  wss.on('connection', (ws) => {
    const clientId = crypto.randomUUID();
    const now = Date.now();
    const client: ConnectedClient = {
      id: clientId,
      sessionToken: crypto.randomUUID(),
      friendCode: null,
      watchedFriends: new Set(),
      ws,
      name: '指揮官',
      faction: 'ironbound',
      roomCode: null,
      role: null,
      seat: null,
      alive: true,
      lastSeen: now,
      msgWindowStart: now,
      msgCount: 0,
      chatTimestamps: [],
    };
    clients.set(clientId, client);

    sendMsg(client, { type: 'hello', clientId, onlineCount: clients.size });

    let cleanedUp = false;
    const cleanupSocket = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      const prevFriendCode = client.friendCode;
      detachClientFromRoom(client, false);
      clients.delete(clientId);
      notifyWatchersOfFriendCode(prevFriendCode);
    };

    ws.on('pong', () => {
      client.alive = true;
      client.lastSeen = Date.now();
    });

    ws.on('message', (data) => {
      try {
        const str = typeof data === 'string' ? data : data.toString('utf8');
        handleClientMessage(client, str);
      } catch (err) {
        console.error('[PvP] Error handling client message:', err);
      }
    });

    ws.on('close', cleanupSocket);
    ws.on('error', cleanupSocket);
  });

  // Authoritative 20Hz simulation tick + ~12.5Hz Fog-of-War filtered broadcasts (error-isolated per room)
  setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      if (room.phase !== 'playing' || !room.engine) continue;

      try {
        room.engine.update(SIM_TICK_MS / 1000);

        if (room.engine.screen === 'GAME_OVER') {
          room.phase = 'ended';
          room.rematchVotes.clear();
          pushMatchStateToRoom(room);
          broadcastRoomState(room);
          continue;
        }

        if (room.pendingStatePush || now - room.lastPushAt >= STATE_PUSH_MS) {
          pushMatchStateToRoom(room);
        }
      } catch (err) {
        console.error(`[PvP] Simulation error in room ${room.code}:`, err);
      }
    }
  }, SIM_TICK_MS);

  // Heartbeat & idle room reaper (every 15s; terminates only after 45s of total silence from BOTH app msgs & pong)
  setInterval(() => {
    const now = Date.now();
    for (const client of clients.values()) {
      if (now - client.lastSeen > CLIENT_IDLE_TIMEOUT_MS) {
        try {
          client.ws.terminate();
        } catch {
          // ignore
        }
        continue;
      }
      try {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      } catch {
        // ignore closed sockets
      }
    }

    for (const [code, room] of rooms.entries()) {
      if (room.phase === 'lobby' && now - room.createdAt > 15 * 60 * 1000) {
        if (getHumanMemberIds(room).length === 0) {
          clearRoomTimers(room);
          rooms.delete(code);
        }
      }
    }
  }, 15_000);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Fogfront PvP Server] Running on http://0.0.0.0:${PORT} (${IS_PROD ? 'prod' : 'dev'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
