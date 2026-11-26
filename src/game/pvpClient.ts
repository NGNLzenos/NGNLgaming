import {
  ClientWsMessage,
  FriendInviteEvent,
  FriendOnlineStatus,
  PvpCommand,
  PvpRoomInfo,
  PvpWorldState,
  RoomChatMessage,
  ServerWsMessage,
} from './pvpTypes';

export interface PvpClientHandlers {
  onConnectionChange: (connected: boolean, onlineCount?: number) => void;
  onQueueChange: (waiting: boolean, queueSize: number) => void;
  onRoomState: (room: PvpRoomInfo | null) => void;
  onError: (message: string) => void;
  onMatchStart: (room: PvpRoomInfo, state: PvpWorldState, isRejoin: boolean) => void;
  onMatchState: (state: PvpWorldState) => void;
  onNotice: (text: string, severity: 'info' | 'warn' | 'critical') => void;
  onChatHistory: (messages: RoomChatMessage[]) => void;
  onChatMessage: (message: RoomChatMessage) => void;
  onCountdown?: (seconds: number | null, reason?: string) => void;
  onRejoinFailed?: (reason: string) => void;
  onFriendsStatus?: (statuses: FriendOnlineStatus[]) => void;
  onFriendInvited?: (invite: FriendInviteEvent) => void;
  onFriendInviteResult?: (ok: boolean, message: string) => void;
}

const SESSION_TOKEN_KEY = 'fogfront_pvp_session_token';
const ACTIVE_ROOM_KEY = 'fogfront_pvp_active_room';
const HEARTBEAT_INTERVAL_MS = 10_000;
const DEAD_SOCKET_TIMEOUT_MS = 22_000;
const RECONNECT_BACKOFF_MS = [600, 1200, 2000, 3000];

function getOrCreateSessionToken(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (existing && existing.length >= 8) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID().replace(/-/g, '')
        : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
    window.sessionStorage.setItem(SESSION_TOKEN_KEY, generated);
    return generated;
  } catch {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

function readStoredRoomCode(): string | null {
  try {
    const code = window.sessionStorage.getItem(ACTIVE_ROOM_KEY);
    return code && code.length === 4 ? code : null;
  } catch {
    return null;
  }
}

function persistRoomCode(code: string | null) {
  try {
    if (code) {
      window.sessionStorage.setItem(ACTIVE_ROOM_KEY, code);
    } else {
      window.sessionStorage.removeItem(ACTIVE_ROOM_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export class PvpClient {
  private ws: WebSocket | null = null;
  private handlers: PvpClientHandlers;
  private closedManually = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempt = 0;
  private lastServerMsgAt = 0;
  private pendingQueue: ClientWsMessage[] = [];
  private sessionToken: string;
  private activeRoomCode: string | null;
  private listenersAttached = false;
  private lastPresence: { friendCode: string; name: string; friendCodes: string[] } | null = null;

  constructor(handlers: PvpClientHandlers) {
    this.handlers = handlers;
    this.sessionToken = getOrCreateSessionToken();
    this.activeRoomCode = readStoredRoomCode();
  }

  public registerPresence(friendCode: string, name: string, friendCodes: string[]) {
    this.lastPresence = { friendCode, name, friendCodes };
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            type: 'presence:register',
            friendCode,
            name,
            friendCodes,
          })
        );
      } catch {
        // ignore
      }
    }
  }

  private handleNetworkOnline = () => {
    if (this.closedManually) return;
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.reconnectAttempt = 0;
      this.clearReconnectTimer();
      this.connect();
    }
  };

  private handleVisibilityChange = () => {
    if (this.closedManually || document.visibilityState !== 'visible') return;
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.reconnectAttempt = 0;
      this.clearReconnectTimer();
      this.connect();
    } else if (this.ws.readyState === WebSocket.OPEN) {
      // Proactively check liveness after tab wakes up
      const now = Date.now();
      if (this.lastServerMsgAt > 0 && now - this.lastServerMsgAt > DEAD_SOCKET_TIMEOUT_MS) {
        try {
          this.ws.close();
        } catch {
          // ignore
        }
      } else {
        try {
          this.ws.send(JSON.stringify({ type: 'ping', ts: now }));
        } catch {
          // ignore
        }
      }
    }
  };

  private attachBrowserListeners() {
    if (this.listenersAttached || typeof window === 'undefined') return;
    window.addEventListener('online', this.handleNetworkOnline);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.listenersAttached = true;
  }

  private detachBrowserListeners() {
    if (!this.listenersAttached || typeof window === 'undefined') return;
    window.removeEventListener('online', this.handleNetworkOnline);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.listenersAttached = false;
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      const now = Date.now();
      if (this.lastServerMsgAt > 0 && now - this.lastServerMsgAt > DEAD_SOCKET_TIMEOUT_MS) {
        // Zombie socket detected (proxy silently dropped connection) -> force close to trigger immediate reconnect
        try {
          this.ws.close();
        } catch {
          // ignore
        }
        return;
      }
      try {
        this.ws.send(JSON.stringify({ type: 'ping', ts: now }));
      } catch {
        // ignore
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private setActiveRoomCode(code: string | null) {
    this.activeRoomCode = code;
    persistRoomCode(code);
  }

  private withSessionToken(msg: ClientWsMessage): ClientWsMessage {
    if (msg.type === 'room:create' || msg.type === 'room:join' || msg.type === 'room:quickmatch') {
      return { ...msg, sessionToken: msg.sessionToken ?? this.sessionToken };
    }
    return msg;
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.closedManually = false;
    this.clearReconnectTimer();
    this.attachBrowserListeners();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        if (this.ws !== ws) return;
        this.reconnectAttempt = 0;
        this.lastServerMsgAt = Date.now();
        this.startHeartbeat();
        this.handlers.onConnectionChange(true);

        // Register commander friend code & watched friend list immediately on open/reconnect
        if (this.lastPresence) {
          try {
            ws.send(
              JSON.stringify({
                type: 'presence:register',
                friendCode: this.lastPresence.friendCode,
                name: this.lastPresence.name,
                friendCodes: this.lastPresence.friendCodes,
              })
            );
          } catch {
            // ignore
          }
        }

        // If we were in a room prior to a network hiccup, immediately rejoin seamlessly before flushing commands
        if (this.activeRoomCode) {
          try {
            ws.send(
              JSON.stringify({
                type: 'room:rejoin',
                code: this.activeRoomCode,
                sessionToken: this.sessionToken,
              })
            );
          } catch {
            // ignore
          }
        }

        while (this.pendingQueue.length > 0 && ws.readyState === WebSocket.OPEN) {
          const msg = this.pendingQueue.shift()!;
          ws.send(JSON.stringify(this.withSessionToken(msg)));
        }
      };

      ws.onmessage = (event) => {
        if (this.ws !== ws) return;
        this.lastServerMsgAt = Date.now();
        if (typeof event.data !== 'string') return;
        let msg: ServerWsMessage;
        try {
          msg = JSON.parse(event.data) as ServerWsMessage;
        } catch {
          return;
        }

        switch (msg.type) {
          case 'pong':
            break;
          case 'friends:status':
            this.handlers.onFriendsStatus?.(msg.statuses);
            break;
          case 'friend:invited':
            this.handlers.onFriendInvited?.(msg.invite);
            break;
          case 'friend:invite_result':
            this.handlers.onFriendInviteResult?.(msg.ok, msg.message);
            break;
          case 'hello':
            this.handlers.onConnectionChange(true, msg.onlineCount);
            break;
          case 'queue:waiting':
            this.handlers.onQueueChange(true, msg.queueSize);
            break;
          case 'queue:cancelled':
            this.handlers.onQueueChange(false, 0);
            break;
          case 'room:state':
            this.setActiveRoomCode(msg.room.code);
            this.handlers.onQueueChange(false, 0);
            this.handlers.onRoomState(msg.room);
            break;
          case 'room:error':
            this.handlers.onError(msg.message);
            break;
          case 'room:left':
            this.setActiveRoomCode(null);
            this.handlers.onQueueChange(false, 0);
            this.handlers.onCountdown?.(null);
            this.handlers.onRoomState(null);
            break;
          case 'room:rejoin_failed':
            this.setActiveRoomCode(null);
            this.handlers.onCountdown?.(null);
            this.handlers.onRejoinFailed?.(msg.reason);
            break;
          case 'match:countdown':
            this.handlers.onCountdown?.(msg.seconds, msg.reason);
            break;
          case 'match:start':
            this.setActiveRoomCode(msg.room.code);
            this.handlers.onQueueChange(false, 0);
            this.handlers.onCountdown?.(null);
            this.handlers.onMatchStart(msg.room, msg.state, Boolean(msg.isRejoin));
            break;
          case 'match:state':
            this.handlers.onMatchState(msg.state);
            break;
          case 'match:notice':
            this.handlers.onNotice(msg.text, msg.severity);
            break;
          case 'chat:history':
            this.handlers.onChatHistory(msg.messages);
            break;
          case 'chat:message':
            this.handlers.onChatMessage(msg.message);
            break;
        }
      };

      ws.onclose = () => {
        if (this.ws === ws) {
          this.ws = null;
        }
        this.stopHeartbeat();
        this.handlers.onConnectionChange(false);
        if (!this.closedManually) {
          this.scheduleReconnect();
        }
      };

      ws.onerror = () => {
        // onclose will handle cleanup and reconnect
      };
    } catch {
      this.stopHeartbeat();
      this.handlers.onConnectionChange(false);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.closedManually) return;
    const delay = RECONNECT_BACKOFF_MS[Math.min(this.reconnectAttempt, RECONNECT_BACKOFF_MS.length - 1)];
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.closedManually) this.connect();
    }, delay);
  }

  public send(msg: ClientWsMessage) {
    if (msg.type === 'room:leave') {
      this.setActiveRoomCode(null);
    }
    const enriched = this.withSessionToken(msg);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(enriched));
    } else {
      if (this.pendingQueue.length < 10 && msg.type !== 'ping' && msg.type !== 'game:cmd') {
        this.pendingQueue.push(enriched);
      }
      this.connect();
    }
  }

  public sendCommand(cmd: PvpCommand) {
    this.send({ type: 'game:cmd', cmd });
  }

  public disconnect() {
    this.closedManually = true;
    this.pendingQueue = [];
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.detachBrowserListeners();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }
}
