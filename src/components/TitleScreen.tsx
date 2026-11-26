import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Bot,
  Check,
  Compass,
  Copy,
  Eye,
  FlaskConical,
  GraduationCap,
  MessageSquare,
  Radio,
  Send,
  Swords,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  AI_ARCHETYPE_LABELS,
  AI_ARCHETYPE_ORDER,
  DIFFICULTY_META,
  DIFFICULTY_ORDER,
  FACTION_ORDER,
  FACTIONS,
  MAP_MODE_META,
} from '../game/data';
import { SavedFriend } from '../game/playerStorage';
import { PvpRoomInfo, PvpSeat, RoomChatMessage } from '../game/pvpTypes';
import { TACTIC_PLAYBOOK_META } from '../game/tacticCoach';
import { AIArchetype, AIArchetypeOption, Difficulty, EnemyFactionOption, FactionId, MapMode } from '../game/types';
import { TacticalManualModal } from './TacticalManualModal';

interface TitleScreenProps {
  selectedFaction: FactionId;
  sandboxRightFaction: FactionId;
  enemyFaction: EnemyFactionOption;
  enemyArchetype: AIArchetypeOption;
  difficulty: Difficulty;
  mapMode: MapMode;
  onSelectFaction: (f: FactionId) => void;
  onSelectSandboxRightFaction: (f: FactionId) => void;
  onSelectEnemyFaction: (f: EnemyFactionOption) => void;
  onSelectEnemyArchetype: (a: AIArchetypeOption) => void;
  onSelectDifficulty: (d: Difficulty) => void;
  onSelectMapMode: (m: MapMode) => void;
  onStart: () => void;
  onStartSandbox: () => void;
  onStartTutorial: () => void;
  onOpenFactionGuide: (factionId?: FactionId) => void;
  pvpConnected: boolean;
  pvpOnlineCount: number;
  pvpRoom: PvpRoomInfo | null;
  pvpCountdown?: number | null;
  pvpNotice?: string | null;
  pvpQueueWaiting: boolean;
  pvpError: string | null;
  chatMessages: RoomChatMessage[];
  playerName: string;
  onChangePlayerName: (name: string) => void;
  onCreateRoom: () => void;
  onConfigRoomMapMode: (m: MapMode) => void;
  onJoinRoom: (code: string) => void;
  onJoinSpectate: (code: string) => void;
  onQuickMatch: () => void;
  onCancelQueue: () => void;
  onToggleReady: (ready: boolean) => void;
  onStartCustomMatch: () => void;
  onAddAi: (seat: PvpSeat, faction: FactionId, difficulty: Difficulty, aiArchetype?: AIArchetypeOption) => void;
  onRemoveAi: (seat: PvpSeat) => void;
  onConfigAi: (
    seat: PvpSeat,
    patch: { faction?: FactionId; difficulty?: Difficulty; aiArchetype?: AIArchetypeOption }
  ) => void;
  onSwitchRole: (target: PvpSeat | 'spectator') => void;
  onSendChat: (text: string) => void;
  onLeaveRoom: () => void;
  tacticGuideEnabled: boolean;
  selectedTacticGuide: AIArchetype;
  onToggleTacticGuide: (enabled: boolean) => void;
  onSelectTacticGuide: (tactic: AIArchetype) => void;
  myFriendCode: string;
  friends: SavedFriend[];
  onlineFriendsCount: number;
  incomingInviteCount: number;
  onOpenFriends: () => void;
  onAddFriend: (friendCode: string, nickname?: string) => string | null;
}

const BACKDROP_URL = '/src/assets/images/title_war_backdrop_1795427353783.jpg';

const FACTION_SHORT_LABELS: Record<FactionId, string> = {
  ironbound: '鐵砧',
  dawn: '晨曦',
  swarm: '蟲巢',
};

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedFaction,
  sandboxRightFaction,
  enemyFaction,
  enemyArchetype,
  difficulty,
  mapMode,
  onSelectFaction,
  onSelectSandboxRightFaction,
  onSelectEnemyFaction,
  onSelectEnemyArchetype,
  onSelectDifficulty,
  onSelectMapMode,
  onStart,
  onStartSandbox,
  onStartTutorial,
  onOpenFactionGuide,
  pvpConnected,
  pvpOnlineCount,
  pvpRoom,
  pvpCountdown = null,
  pvpNotice = null,
  pvpQueueWaiting,
  pvpError,
  chatMessages,
  playerName,
  onChangePlayerName,
  onCreateRoom,
  onConfigRoomMapMode,
  onJoinRoom,
  onJoinSpectate,
  onQuickMatch,
  onCancelQueue,
  onToggleReady,
  onStartCustomMatch,
  onAddAi,
  onRemoveAi,
  onConfigAi,
  onSwitchRole,
  onSendChat,
  onLeaveRoom,
  tacticGuideEnabled,
  selectedTacticGuide,
  onToggleTacticGuide,
  onSelectTacticGuide,
  myFriendCode,
  friends,
  onlineFriendsCount,
  incomingInviteCount,
  onOpenFriends,
  onAddFriend,
}) => {
  const [bgFailed, setBgFailed] = useState(false);
  const [failedEmblems, setFailedEmblems] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<'solo' | 'pvp' | 'sandbox'>('solo');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const lobbyChatRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (lobbyChatRef.current) {
      lobbyChatRef.current.scrollTop = lobbyChatRef.current.scrollHeight;
    }
  }, [chatMessages.length, pvpRoom?.code]);

  // Automatically stay on PvP tab if user is in a room or queue
  const effectiveMode = pvpRoom || pvpQueueWaiting ? 'pvp' : mode;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (effectiveMode !== 'solo' || manualOpen) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStart, effectiveMode, manualOpen]);

  const activeFaction = FACTIONS[selectedFaction];
  const blueSlot = pvpRoom?.players.find((p) => p.seat === 'player') ?? null;
  const redSlot = pvpRoom?.players.find((p) => p.seat === 'enemy') ?? null;
  const mySlot = pvpRoom && pvpRoom.yourSeat ? pvpRoom.players.find((p) => p.seat === pvpRoom.yourSeat) ?? null : null;
  const bothSeatsFilled = Boolean(blueSlot && redSlot);
  const humanSlots = [blueSlot, redSlot].filter((s): s is NonNullable<typeof s> => Boolean(s && !s.isAi));
  const otherHumansReady = humanSlots.every((s) => s.seat === pvpRoom?.yourSeat || s.ready);

  const handleCopyCode = () => {
    if (!pvpRoom) return;
    navigator.clipboard?.writeText(pvpRoom.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="relative w-full h-[100dvh] overflow-y-auto overscroll-contain lg:overflow-hidden bg-[#0A0E14] text-[#E6EDF3]">
      {/* Illustrated Key-Art Backdrop with Resilient Fallback */}
      {!bgFailed ? (
        <img
          src={BACKDROP_URL}
          alt="三線峽谷戰術地圖全景"
          referrerPolicy="no-referrer"
          onError={() => setBgFailed(true)}
          className="fixed inset-0 w-full h-full object-cover object-center opacity-70 pointer-events-none"
        />
      ) : (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 20% 55%, rgba(59,130,246,0.22), transparent 45%), radial-gradient(circle at 82% 40%, rgba(245,158,11,0.2), transparent 45%), linear-gradient(180deg, #0A0E14 0%, #131B26 100%)',
          }}
        />
      )}

      {/* Measured contrast scrim */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(95deg, rgba(8,12,18,0.94) 0%, rgba(8,12,18,0.85) 55%, rgba(8,12,18,0.46) 86%, rgba(8,12,18,0.7) 100%)',
        }}
      />

      {/* Main Content Grid */}
      <div className="relative z-10 min-h-full lg:h-full max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-12 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))] lg:py-5 flex flex-col justify-between gap-4 lg:gap-0">
        {/* Top Header + Mode Switcher */}
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <svg width="28" height="28" viewBox="0 0 36 36" fill="none" aria-hidden="true" className="shrink-0">
                <path
                  d="M18 3L31 10.5V25.5L18 33L5 25.5V10.5L18 3Z"
                  stroke="#94A3B8"
                  strokeWidth="1.6"
                  fill="rgba(15,23,42,0.75)"
                />
                <path d="M9 14H27M9 18H27M9 22H27" stroke="#60A5FA" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="18" cy="18" r="3.5" fill="#F59E0B" />
              </svg>
              <span className="font-display text-[11px] sm:text-xs tracking-[0.2em] text-slate-400">
                FOGFRONT · THREE-LANE COMMAND
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-50 leading-tight [text-wrap:balance]">
              迷霧三線：戰術要塞
            </h1>
            <p className="mt-1 text-xs lg:text-sm text-slate-300 max-w-2xl leading-relaxed">
              結合三路推塔、真實戰爭迷霧與隨機野區事件的沉穩節奏戰略。支援手機觸控與電腦鍵鼠跨裝置遊玩。
            </p>
          </div>

          {/* Mode Switcher + Tactical Manual Trigger */}
          <div className="flex flex-col items-stretch sm:items-end gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={Boolean(pvpRoom || pvpQueueWaiting)}
                onClick={onStartTutorial}
                className="flex-1 sm:flex-initial justify-center px-3 py-2 sm:py-1.5 rounded-md bg-teal-400/18 hover:bg-teal-400/28 border border-teal-400/70 text-xs font-bold text-teal-200 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                <span>新手實戰教學</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenFactionGuide(selectedFaction)}
                className="flex-1 sm:flex-initial justify-center px-3 py-2 sm:py-1.5 rounded-md bg-sky-400/18 hover:bg-sky-400/28 border border-sky-400/70 text-xs font-bold text-sky-200 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>進階種族教學</span>
              </button>

              <button
                type="button"
                onClick={() => setManualOpen(true)}
                className="flex-1 sm:flex-initial justify-center px-3 py-2 sm:py-1.5 rounded-md bg-[#121D2B]/95 hover:bg-[#19283B] border border-amber-400/55 text-xs font-semibold text-amber-200 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>戰術手冊</span>
              </button>

              <div className="inline-flex p-1 rounded-md bg-[#10161F]/95 border border-slate-700/80 flex-1 sm:flex-initial">
                <button
                  type="button"
                  disabled={Boolean(pvpRoom || pvpQueueWaiting)}
                  onClick={() => setMode('solo')}
                  className={`flex-1 sm:flex-initial justify-center px-3 py-2 sm:py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                    effectiveMode === 'solo'
                      ? 'bg-slate-200 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>單人 AI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('pvp')}
                  className={`flex-1 sm:flex-initial justify-center px-3 py-2 sm:py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    effectiveMode === 'pvp'
                      ? 'bg-sky-300 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>線上對戰</span>
                </button>
                <button
                  type="button"
                  disabled={Boolean(pvpRoom || pvpQueueWaiting)}
                  onClick={() => setMode('sandbox')}
                  className={`flex-1 sm:flex-initial justify-center px-3 py-2 sm:py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                    effectiveMode === 'sandbox'
                      ? 'bg-emerald-300 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>沙盒測試</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onOpenFriends}
                className={`relative flex-1 sm:flex-initial justify-center px-3 py-2 sm:py-1.5 rounded-md border text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  incomingInviteCount > 0
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400 text-emerald-200'
                    : 'bg-[#121D2B]/95 hover:bg-[#19283B] border-sky-400/55 text-sky-200'
                }`}
                title={`開啟好友欄（我的好友碼 #${myFriendCode}）`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>好友欄</span>
                <span className="font-mono-num text-[10.5px] px-1 rounded bg-slate-900/80 text-emerald-300">
                  {onlineFriendsCount}
                </span>
                {incomingInviteCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
                )}
              </button>
            </div>
            {effectiveMode === 'pvp' && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono-num text-slate-400">
                <Radio className={`w-3 h-3 ${pvpConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span>
                  {pvpConnected ? `對戰伺服器已連線 · 線上 ${pvpOnlineCount} 人` : '正在連線至對戰伺服器…'}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Middle: 3-Civilization Selection & Match Setup */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end my-auto py-2">
          <div className="lg:col-span-8 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
              <span className="text-sm font-semibold text-slate-200">
                {pvpRoom
                  ? pvpRoom.yourRole === 'spectator'
                    ? '文明情報預覽（目前位於觀戰席）'
                    : '切換出戰文明（大廳即時同步）'
                  : '選擇出戰文明'}
              </span>
              <span className="text-xs text-slate-400">三文明非對稱科技與戰術技</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {FACTION_ORDER.map((fid) => {
                const f = FACTIONS[fid];
                const isSelected = selectedFaction === fid;
                const emblemBroken = failedEmblems[fid];
                return (
                  <button
                    key={fid}
                    type="button"
                    onClick={() => onSelectFaction(fid)}
                    className={`text-left p-3 rounded-lg border transition-all duration-150 cursor-pointer flex flex-col justify-between focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
                      isSelected
                        ? 'bg-[#16202E]/95 border-slate-300/80 shadow-lg'
                        : 'bg-[#10161F]/80 border-slate-700/60 hover:border-slate-500/80 hover:bg-[#141C27]/90'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-11 h-11 rounded-md overflow-hidden shrink-0 border border-slate-700/80 bg-[#0D1219] flex items-center justify-center">
                          {!emblemBroken ? (
                            <img
                              src={f.emblemPath}
                              alt={`${f.name}文明徽章`}
                              referrerPolicy="no-referrer"
                              onError={() => setFailedEmblems((prev) => ({ ...prev, [fid]: true }))}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="font-display text-base font-bold" style={{ color: f.accentHex }}>
                              {fid === 'ironbound' ? 'IF' : fid === 'dawn' ? 'DC' : 'CS'}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-slate-50 truncate">{f.name}</span>
                            {fid === 'ironbound' ? (
                              <span className="text-[10px] font-semibold text-sky-300 whitespace-nowrap">
                                · 基準平衡
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-emerald-300 whitespace-nowrap">
                                · 九兵種同步
                              </span>
                            )}
                            {isSelected && (
                              <span
                                className="text-[11px] font-medium whitespace-nowrap"
                                style={{ color: f.accentLightHex }}
                              >
                                · 已選
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate">{f.subtitle}</div>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-1 text-[11px] leading-relaxed">
                        <div className="text-slate-300">
                          <span className="font-semibold text-slate-100">特性 · {f.passiveName}：</span>
                          {f.passiveDesc}
                        </div>
                        <div className="text-slate-400">
                          <span className="font-semibold text-slate-200">戰術技 · {f.activeName}：</span>
                          {f.activeDesc}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Persistent 5-Tactic Beginner Playbook Index Selector (saved to localStorage) */}
            <div className="rounded-lg bg-[#0E1520]/90 border border-amber-500/35 px-3 py-2 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Compass className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="text-xs font-bold text-amber-200 whitespace-nowrap">新手五戰術即時索引</span>
                  <span className="hidden sm:inline text-[11px] text-slate-400 truncate">
                    進場後照步驟提示出兵、升級與進軍路線（玩熟可隨時關閉）
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleTacticGuide(!tacticGuideEnabled)}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap border ${
                    tacticGuideEnabled
                      ? 'bg-amber-300 text-slate-950 border-amber-200'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {tacticGuideEnabled ? '索引：開啟中' : '索引：已關閉'}
                </button>
              </div>

              {tacticGuideEnabled && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <div className="flex flex-wrap items-center gap-1">
                    {AI_ARCHETYPE_ORDER.map((arch) => {
                      const meta = TACTIC_PLAYBOOK_META[arch];
                      const active = selectedTacticGuide === arch;
                      return (
                        <button
                          key={arch}
                          type="button"
                          onClick={() => onSelectTacticGuide(arch)}
                          className={`px-2 py-1 rounded text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                            active
                              ? 'bg-amber-300 text-slate-950 font-bold'
                              : 'bg-[#090F17] text-slate-300 hover:text-white border border-slate-700/80'
                          }`}
                        >
                          {meta.badge} {meta.shortName}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[11px] text-slate-400 truncate max-w-full sm:max-w-[300px]">
                    {TACTIC_PLAYBOOK_META[selectedTacticGuide].summary}
                  </span>
                </div>
              )}
            </div>

            {/* Match Setup Panel: Solo AI OR Online Custom Room Lobby */}
            {effectiveMode === 'solo' ? (
              <div className="space-y-2.5 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 whitespace-nowrap">戰場</span>
                      <div className="inline-flex p-1 rounded-md bg-[#111720] border border-slate-700/70">
                        <button
                          type="button"
                          onClick={() => onSelectMapMode('standard')}
                          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                            mapMode === 'standard'
                              ? 'bg-slate-200 text-slate-950 font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          標準三線
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectMapMode('simple')}
                          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                            mapMode === 'simple'
                              ? 'bg-teal-300 text-slate-950 font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          簡易雙線 · 新手/速戰
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 whitespace-nowrap">對手文明</span>
                      <div className="inline-flex p-1 rounded-md bg-[#111720] border border-slate-700/70">
                        {(
                          [
                            { id: 'random', label: '隨機' },
                            { id: 'ironbound', label: '鐵砧' },
                            { id: 'dawn', label: '晨曦' },
                            { id: 'swarm', label: '蟲巢' },
                          ] as Array<{ id: EnemyFactionOption; label: string }>
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => onSelectEnemyFaction(opt.id)}
                            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                              enemyFaction === opt.id
                                ? 'bg-slate-200 text-slate-950'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 whitespace-nowrap">AI 難度</span>
                      <div className="inline-flex p-1 rounded-md bg-[#111720] border border-slate-700/70">
                        {DIFFICULTY_ORDER.map((diff) => (
                          <button
                            key={diff}
                            type="button"
                            onClick={() => onSelectDifficulty(diff)}
                            title={DIFFICULTY_META[diff].desc}
                            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                              difficulty === diff
                                ? diff === 'commander'
                                  ? 'bg-amber-300 text-slate-950 font-semibold'
                                  : diff === 'rookie'
                                  ? 'bg-emerald-300 text-slate-950 font-semibold'
                                  : 'bg-slate-200 text-slate-950 font-semibold'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {DIFFICULTY_META[diff].shortName}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onStart}
                    className="w-full sm:w-auto px-7 py-3 sm:py-2.5 rounded-md text-sm font-bold text-slate-950 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.99] cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                    style={{ backgroundColor: activeFaction.accentLightHex }}
                  >
                    開始戰役<span className="hidden lg:inline">（Enter）</span>
                  </button>
                </div>

                {/* Ironbound 5-Strategy AI Practice Selector */}
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <span className="text-xs text-slate-400 whitespace-nowrap">AI 戰術練習（鐵砧基準）</span>
                  <div className="flex flex-wrap gap-1 p-1 rounded-md bg-[#111720] border border-slate-700/70">
                    <button
                      type="button"
                      onClick={() => onSelectEnemyArchetype('random')}
                      className={`px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                        enemyArchetype === 'random'
                          ? 'bg-sky-300 text-slate-950 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      隨機盲測
                    </button>
                    {AI_ARCHETYPE_ORDER.map((arch, idx) => (
                      <button
                        key={arch}
                        type="button"
                        onClick={() => onSelectEnemyArchetype(arch)}
                        title={AI_ARCHETYPE_LABELS[arch].desc}
                        className={`px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                          enemyArchetype === arch
                            ? 'bg-amber-300 text-slate-950 font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {idx + 1}.{AI_ARCHETYPE_LABELS[arch].shortName}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 leading-relaxed space-y-0.5">
                  <div>
                    <span className={mapMode === 'simple' ? 'text-teal-300 font-semibold' : 'text-slate-300 font-semibold'}>
                      {MAP_MODE_META[mapMode].name}（{MAP_MODE_META[mapMode].lanesLabel}）· {DIFFICULTY_META[difficulty].name}：
                    </span>
                    <span>{DIFFICULTY_META[difficulty].desc}</span>
                  </div>
                  <div>
                    <span className="text-amber-200 font-semibold">
                      {enemyArchetype === 'random'
                        ? '對手戰術：隨機盲測（五套鐵砧戰術隨機擇一）— '
                        : `指定練習：${AI_ARCHETYPE_LABELS[enemyArchetype].name} — `}
                    </span>
                    <span>
                      {enemyArchetype === 'random'
                        ? '開局迷霧中透過偵查判斷對手套路，賽後會解密 AI 戰術與反制要點。'
                        : AI_ARCHETYPE_LABELS[enemyArchetype].desc}
                    </span>
                  </div>
                </div>
              </div>
            ) : effectiveMode === 'sandbox' ? (
              /* DUAL-CONTROL SANDBOX TEST LAB */
              <div className="rounded-lg bg-[#0E1A19]/92 border border-emerald-500/45 p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-sky-300 font-semibold whitespace-nowrap">藍方(左)</span>
                      <div className="inline-flex p-1 rounded-md bg-[#0A1018] border border-slate-700/80">
                        {FACTION_ORDER.map((fid) => (
                          <button
                            key={fid}
                            type="button"
                            onClick={() => onSelectFaction(fid)}
                            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                              selectedFaction === fid
                                ? 'bg-sky-300 text-slate-950 font-semibold'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {FACTION_SHORT_LABELS[fid]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-rose-300 font-semibold whitespace-nowrap">紅方(右)</span>
                      <div className="inline-flex p-1 rounded-md bg-[#0A1018] border border-slate-700/80">
                        {FACTION_ORDER.map((fid) => (
                          <button
                            key={fid}
                            type="button"
                            onClick={() => onSelectSandboxRightFaction(fid)}
                            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                              sandboxRightFaction === fid
                                ? 'bg-rose-300 text-slate-950 font-semibold'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {FACTION_SHORT_LABELS[fid]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 whitespace-nowrap">戰場</span>
                      <div className="inline-flex p-1 rounded-md bg-[#0A1018] border border-slate-700/80">
                        <button
                          type="button"
                          onClick={() => onSelectMapMode('standard')}
                          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                            mapMode === 'standard'
                              ? 'bg-slate-200 text-slate-950 font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          標準三線
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectMapMode('simple')}
                          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                            mapMode === 'simple'
                              ? 'bg-teal-300 text-slate-950 font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          簡易雙線
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onStartSandbox}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-md text-sm font-bold text-slate-950 bg-emerald-300 hover:bg-emerald-200 transition-transform duration-150 hover:scale-[1.02] cursor-pointer whitespace-nowrap"
                  >
                    啟動雙邊沙盒測試
                  </button>
                </div>

                <div className="text-[11px] text-slate-300 leading-relaxed space-y-0.5">
                  <div>
                    <span className="text-emerald-300 font-semibold">一人操控藍／紅雙邊 · 無限金錢（99999G）· 全地圖視野：</span>
                    遊戲內全部功能（兵營、外拓補給站、三路防禦塔、攻防科技、主動技 [K]/[F]/[S]、第四路編隊 [X]）皆完整可用。
                  </div>
                  <div className="text-slate-400">
                    進場後按 <span className="text-slate-200 font-mono-num">[Tab]</span> 或點頂部工具列即可秒切藍方／紅方操作，並支援「雙邊滿科 +3/+3」、「瞬產開關」與「一鍵清場」，方便實測各兵種克制與強度。
                  </div>
                </div>
              </div>
            ) : pvpRoom ? (
              /* ACTIVE CUSTOM PVP ROOM LOBBY (Supports Human, AI Bots & Spectators) */
              <div className="rounded-lg bg-[#101722]/95 border border-sky-500/45 p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-slate-400">自訂對戰房</span>
                    <span className="font-mono-num text-base font-bold tracking-[0.2em] text-sky-300 bg-[#0A1018] px-2.5 py-0.5 rounded border border-slate-700">
                      {pvpRoom.code}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? '已複製' : '複製房號'}</span>
                    </button>
                    {pvpRoom.isHost && (
                      <span className="text-[11px] font-semibold text-amber-300 whitespace-nowrap">· 房主權限</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">戰場</span>
                    {pvpRoom.isHost ? (
                      <div className="inline-flex p-0.5 rounded bg-[#0A1018] border border-slate-700/80">
                        <button
                          type="button"
                          onClick={() => onConfigRoomMapMode('standard')}
                          className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer whitespace-nowrap ${
                            pvpRoom.mapMode === 'standard'
                              ? 'bg-slate-200 text-slate-950 font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          三線標準
                        </button>
                        <button
                          type="button"
                          onClick={() => onConfigRoomMapMode('simple')}
                          className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer whitespace-nowrap ${
                            pvpRoom.mapMode === 'simple'
                              ? 'bg-teal-300 text-slate-950 font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          雙線簡易
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`text-[11px] font-semibold whitespace-nowrap ${
                          pvpRoom.mapMode === 'simple' ? 'text-teal-300' : 'text-slate-200'
                        }`}
                      >
                        {MAP_MODE_META[pvpRoom.mapMode].name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Combatant Seats: Blue (Left) vs Red (Right) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(['player', 'enemy'] as PvpSeat[]).map((seat) => {
                    const slot = seat === 'player' ? blueSlot : redSlot;
                    const isMine = pvpRoom.yourRole === 'player' && pvpRoom.yourSeat === seat;
                    const seatLabel = seat === 'player' ? '藍方（左）' : '紅方（右）';
                    const seatAccent = seat === 'player' ? 'text-sky-300' : 'text-rose-300';
                    const borderTone = isMine
                      ? 'border-sky-500/65'
                      : slot?.isAi
                      ? 'border-amber-500/45'
                      : 'border-slate-700/80';

                    return (
                      <div key={seat} className={`p-2.5 rounded bg-[#0C121B] border ${borderTone} space-y-2`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`text-[11px] font-bold whitespace-nowrap ${seatAccent}`}>{seatLabel}</span>
                            {slot ? (
                              <>
                                {slot.isAi && <Bot className="w-3.5 h-3.5 text-amber-300 shrink-0" />}
                                <span className="text-xs font-bold text-slate-100 truncate">
                                  {slot.name}
                                  {isMine ? '（我方）' : ''}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-slate-500">空席位</span>
                            )}
                          </div>

                          {slot && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {!slot.isAi &&
                                !isMine &&
                                slot.friendCode &&
                                slot.friendCode !== myFriendCode &&
                                !friends.some((f) => f.friendCode === slot.friendCode) && (
                                  <button
                                    type="button"
                                    onClick={() => onAddFriend(slot.friendCode!, slot.name)}
                                    title={`將 ${slot.name} 加入好友欄`}
                                    className="px-1.5 py-0.5 rounded bg-sky-500/15 hover:bg-sky-500/30 border border-sky-400/50 text-[10px] font-semibold text-sky-200 flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
                                  >
                                    <UserPlus className="w-3 h-3" />
                                    <span>加好友</span>
                                  </button>
                                )}
                              <span
                                className={`text-[11px] font-semibold whitespace-nowrap ${
                                  slot.ready ? 'text-emerald-400' : 'text-slate-400'
                                }`}
                              >
                                {slot.isAi ? 'AI 就緒' : slot.ready ? '已準備' : '整備中'}
                              </span>
                              {slot.isAi && pvpRoom.isHost && (
                                <button
                                  type="button"
                                  onClick={() => onRemoveAi(seat)}
                                  title="移除此電腦 AI"
                                  className="p-0.5 rounded text-slate-400 hover:text-rose-300 hover:bg-slate-800 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {slot ? (
                          slot.isAi && pvpRoom.isHost ? (
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center justify-between gap-1.5">
                                <div className="inline-flex rounded bg-[#121A26] border border-slate-700/80 p-0.5">
                                  {FACTION_ORDER.map((fid) => (
                                    <button
                                      key={fid}
                                      type="button"
                                      onClick={() => onConfigAi(seat, { faction: fid })}
                                      className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer whitespace-nowrap ${
                                        slot.faction === fid
                                          ? 'bg-slate-200 text-slate-950 font-semibold'
                                          : 'text-slate-400 hover:text-slate-200'
                                      }`}
                                    >
                                      {FACTION_SHORT_LABELS[fid]}
                                    </button>
                                  ))}
                                </div>
                                <div className="inline-flex rounded bg-[#121A26] border border-slate-700/80 p-0.5">
                                  {DIFFICULTY_ORDER.map((diff) => (
                                    <button
                                      key={diff}
                                      type="button"
                                      onClick={() => onConfigAi(seat, { difficulty: diff })}
                                      className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer whitespace-nowrap ${
                                        (slot.aiDifficulty ?? 'standard') === diff
                                          ? 'bg-amber-300 text-slate-950 font-semibold'
                                          : 'text-slate-400 hover:text-slate-200'
                                      }`}
                                    >
                                      {DIFFICULTY_META[diff].shortName}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1 rounded bg-[#121A26] border border-slate-700/80 p-0.5">
                                <button
                                  type="button"
                                  onClick={() => onConfigAi(seat, { aiArchetype: 'random' })}
                                  className={`px-1.5 py-0.5 text-[10px] rounded transition-colors cursor-pointer whitespace-nowrap ${
                                    (slot.aiArchetype ?? 'random') === 'random'
                                      ? 'bg-sky-300 text-slate-950 font-semibold'
                                      : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  隨機
                                </button>
                                {AI_ARCHETYPE_ORDER.map((arch) => (
                                  <button
                                    key={arch}
                                    type="button"
                                    onClick={() => onConfigAi(seat, { faction: 'ironbound', aiArchetype: arch })}
                                    className={`px-1.5 py-0.5 text-[10px] rounded transition-colors cursor-pointer whitespace-nowrap ${
                                      slot.aiArchetype === arch
                                        ? 'bg-amber-300 text-slate-950 font-semibold'
                                        : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                  >
                                    {AI_ARCHETYPE_LABELS[arch].shortName}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-300">
                              文明：<span className="text-sky-200 font-medium">{FACTIONS[slot.faction].name}</span>
                              {slot.isAi && slot.aiArchetype && slot.aiArchetype !== 'random' && (
                                <span className="text-amber-300 ml-1.5">
                                  · {AI_ARCHETYPE_LABELS[slot.aiArchetype].shortName}
                                </span>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {pvpRoom.isHost && (
                              <button
                                type="button"
                                onClick={() => onAddAi(seat, 'ironbound', 'standard', 'random')}
                                className="px-2.5 py-1 rounded text-[11px] font-semibold bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/50 text-amber-200 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              >
                                <Bot className="w-3 h-3" />
                                <span>+ 加入電腦 AI</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onSwitchRole(seat)}
                              className="px-2.5 py-1 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 cursor-pointer whitespace-nowrap"
                            >
                              {pvpRoom.yourRole === 'spectator' ? '加入此席參戰' : '換至此席'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Spectator Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-[#0A1018] border border-slate-800 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Eye className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                    <span className="text-slate-400 whitespace-nowrap font-mono-num">
                      觀戰席 ({pvpRoom.spectators.length}/8)
                    </span>
                    <span className="text-slate-200 truncate">
                      {pvpRoom.spectators.length > 0
                        ? pvpRoom.spectators
                            .map((s) => `${s.name}${s.isHost ? '(房主)' : ''}`)
                            .join(' · ')
                        : '尚無觀戰者（好友可憑房號隨時進入觀戰）'}
                    </span>
                  </div>
                  {pvpRoom.yourRole === 'player' && (
                    <button
                      type="button"
                      onClick={() => onSwitchRole('spectator')}
                      className="px-2.5 py-1 rounded text-[11px] font-medium text-teal-200 bg-teal-950/50 hover:bg-teal-900/60 border border-teal-500/45 cursor-pointer whitespace-nowrap"
                    >
                      轉為觀戰席
                    </button>
                  )}
                </div>

                {/* Room Lobby Chat Box */}
                <div className="rounded bg-[#090F17] border border-slate-800 overflow-hidden">
                  <div className="px-2.5 py-1 border-b border-slate-800/90 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3 text-sky-300" />
                      <span className="font-semibold text-slate-300">房間對話</span>
                    </div>
                    <span>進遊戲後按 Enter 亦可對話（訊息會隨時間淡出）</span>
                  </div>
                  <div
                    ref={lobbyChatRef}
                    className="h-[88px] overflow-y-auto px-2.5 py-1.5 space-y-1 text-xs"
                  >
                    {chatMessages.length === 0 ? (
                      <div className="text-[11px] text-slate-500">尚無對話訊息，歡迎在開戰前溝通戰術！</div>
                    ) : (
                      chatMessages.map((m) => {
                        const badgeText =
                          m.senderRole === 'system'
                            ? '系統'
                            : m.senderRole === 'spectator'
                            ? '觀戰'
                            : m.senderSeat === 'enemy'
                            ? '紅方'
                            : '藍方';
                        const badgeColor =
                          m.senderRole === 'system'
                            ? 'text-slate-500'
                            : m.senderRole === 'spectator'
                            ? 'text-teal-300'
                            : m.senderSeat === 'enemy'
                            ? 'text-rose-300'
                            : 'text-sky-300';
                        return (
                          <div key={m.id} className="leading-snug break-words">
                            <span className={`font-semibold mr-1 ${badgeColor}`}>[{badgeText}]</span>
                            {m.senderRole !== 'system' && (
                              <span className="font-semibold text-slate-200 mr-1">{m.senderName}：</span>
                            )}
                            <span className={m.senderRole === 'system' ? 'text-slate-400' : 'text-slate-100'}>
                              {m.text}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const trimmed = chatDraft.trim();
                      if (!trimmed) return;
                      onSendChat(trimmed);
                      setChatDraft('');
                    }}
                    className="flex items-center gap-1.5 px-2 py-1.5 border-t border-slate-800/90 bg-[#0C121B]"
                  >
                    <input
                      type="text"
                      maxLength={120}
                      value={chatDraft}
                      onChange={(e) => setChatDraft(e.target.value)}
                      placeholder="輸入房間訊息…"
                      className="flex-1 min-w-0 bg-transparent text-base sm:text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none px-1"
                    />
                    <button
                      type="submit"
                      disabled={chatDraft.trim().length === 0}
                      className="px-3 py-1.5 sm:px-2.5 sm:py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs sm:text-[11px] font-semibold text-sky-200 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                    >
                      <Send className="w-3 h-3" />
                      <span>發送</span>
                    </button>
                  </form>
                </div>

                {pvpCountdown != null && pvpCountdown > 0 && (
                  <div className="rounded-md bg-emerald-950/85 border border-emerald-400/75 px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-[0_0_24px_rgba(16,185,129,0.28)]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-md bg-emerald-400 text-slate-950 font-mono-num text-xl font-black flex items-center justify-center shrink-0 animate-pulse">
                        {pvpCountdown}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-emerald-200 tracking-wide">
                          準備完成！戰場即將開啟（{pvpCountdown} 秒）
                        </div>
                        <div className="text-[11px] text-emerald-300/80">
                          {pvpRoom.yourRole === 'player'
                            ? '請確認所選文明與戰場配置，點擊「取消倒數」可立即中止'
                            : '全體已就緒，即將自動切換至觀戰視角…'}
                        </div>
                      </div>
                    </div>
                    <span className="hidden sm:inline-block font-mono-num text-[11px] font-bold text-emerald-300 tracking-widest uppercase shrink-0">
                      DEPLOYING
                    </span>
                  </div>
                )}

                {pvpNotice && !(pvpCountdown != null && pvpCountdown > 0) && (
                  <div className="text-xs text-amber-200 bg-amber-950/60 border border-amber-500/50 rounded px-2.5 py-1.5">
                    {pvpNotice}
                  </div>
                )}

                {pvpError && (
                  <div className="text-xs text-rose-300 bg-rose-950/50 border border-rose-500/50 rounded px-2.5 py-1">
                    {pvpError}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-0.5">
                  <button
                    type="button"
                    onClick={onLeaveRoom}
                    className="px-4 py-2 rounded text-xs font-medium text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 cursor-pointer whitespace-nowrap"
                  >
                    離開房間
                  </button>

                  {pvpRoom.yourRole === 'spectator' ? (
                    pvpRoom.isHost ? (
                      <button
                        type="button"
                        disabled={!bothSeatsFilled || !otherHumansReady || (pvpCountdown != null && pvpCountdown > 0)}
                        onClick={onStartCustomMatch}
                        className="px-6 py-2 rounded text-xs font-bold bg-emerald-400 hover:bg-emerald-300 text-slate-950 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                      >
                        {pvpCountdown != null && pvpCountdown > 0
                          ? `開戰倒數 ${pvpCountdown}s…`
                          : !bothSeatsFilled
                          ? '需填滿藍紅雙方席位'
                          : !otherHumansReady
                          ? '等待參戰玩家準備…'
                          : humanSlots.length === 0
                          ? '開始 AI 對決觀戰'
                          : '開始對戰'}
                      </button>
                    ) : (
                      <span className="text-xs text-teal-300 font-medium">
                        {pvpCountdown != null && pvpCountdown > 0
                          ? `雙方已就緒，${pvpCountdown} 秒後自動進入直播…`
                          : '觀戰席待機中，開戰後自動進入上帝視角直播…'}
                      </span>
                    )
                  ) : pvpRoom.isHost && humanSlots.length === 1 ? (
                    <button
                      type="button"
                      disabled={!bothSeatsFilled || (pvpCountdown != null && pvpCountdown > 0)}
                      onClick={onStartCustomMatch}
                      className="px-6 py-2 rounded text-xs font-bold bg-emerald-400 hover:bg-emerald-300 text-slate-950 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      {pvpCountdown != null && pvpCountdown > 0
                        ? `開戰倒數 ${pvpCountdown}s…`
                        : !bothSeatsFilled
                        ? '請加入對手或電腦 AI'
                        : '開始對戰'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!bothSeatsFilled}
                      onClick={() => onToggleReady(!mySlot?.ready)}
                      className={`px-6 py-2 rounded text-xs font-bold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                        pvpCountdown != null && pvpCountdown > 0 && mySlot?.ready
                          ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                          : mySlot?.ready
                          ? 'bg-slate-700 text-slate-100 hover:bg-slate-600'
                          : 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                      }`}
                    >
                      {!bothSeatsFilled
                        ? '等待對手加入…'
                        : pvpCountdown != null && pvpCountdown > 0 && mySlot?.ready
                        ? `取消倒數 (${pvpCountdown}s)`
                        : mySlot?.ready
                        ? '取消準備'
                        : '準備完成'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* PVP ENTRY: NICKNAME + QUICK MATCH + CREATE/JOIN/SPECTATE ROOM */
              <div className="rounded-lg bg-[#101722]/92 border border-slate-700/75 p-3.5 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <label htmlFor="pvp-name" className="text-xs text-slate-400 whitespace-nowrap">
                      指揮官代號
                    </label>
                    <input
                      id="pvp-name"
                      type="text"
                      maxLength={14}
                      value={playerName}
                      onChange={(e) => onChangePlayerName(e.target.value)}
                      placeholder="輸入代號"
                      className="flex-1 sm:flex-initial sm:w-28 px-2.5 py-1.5 rounded bg-[#0A1018] border border-slate-700 focus:border-sky-400 focus:outline-none text-base sm:text-xs text-slate-100"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {pvpQueueWaiting ? (
                      <button
                        type="button"
                        onClick={onCancelQueue}
                        className="flex-1 sm:flex-initial px-3.5 py-2.5 sm:py-2 rounded text-xs font-bold bg-amber-400/20 border border-amber-400 text-amber-200 hover:bg-amber-400/30 cursor-pointer whitespace-nowrap"
                      >
                        正在搜尋對手… 取消
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!pvpConnected}
                        onClick={onQuickMatch}
                        className="flex-1 sm:flex-initial px-3.5 py-2.5 sm:py-2 rounded text-xs font-bold text-slate-950 bg-sky-300 hover:bg-sky-200 disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        快速配對
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={!pvpConnected || pvpQueueWaiting}
                      onClick={onCreateRoom}
                      className="flex-1 sm:flex-initial px-3.5 py-2.5 sm:py-2 rounded text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      建立自訂房
                    </button>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <input
                        type="text"
                        maxLength={4}
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                        placeholder="4碼房號"
                        className="w-24 sm:w-20 px-2 py-1.5 rounded bg-[#0A1018] border border-slate-700 focus:border-sky-400 focus:outline-none text-base sm:text-xs font-mono-num tracking-widest text-slate-100 uppercase"
                      />
                      <button
                        type="button"
                        disabled={!pvpConnected || pvpQueueWaiting || joinCode.length !== 4}
                        onClick={() => onJoinRoom(joinCode)}
                        className="flex-1 sm:flex-initial px-3 py-2.5 sm:py-2 rounded text-xs font-semibold text-slate-950 bg-amber-300 hover:bg-amber-200 disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        加入參戰
                      </button>
                      <button
                        type="button"
                        disabled={!pvpConnected || pvpQueueWaiting || joinCode.length !== 4}
                        onClick={() => onJoinSpectate(joinCode)}
                        className="flex-1 sm:flex-initial justify-center px-3 py-2.5 sm:py-2 rounded text-xs font-semibold text-teal-100 bg-teal-900/70 hover:bg-teal-800/80 border border-teal-500/60 disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>加入觀戰</span>
                      </button>
                    </div>
                  </div>
                </div>

                {pvpError && (
                  <div className="text-xs text-rose-300 bg-rose-950/50 border border-rose-500/50 rounded px-2.5 py-1">
                    {pvpError}
                  </div>
                )}
                {!pvpError && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px] text-slate-400">
                    <span>
                      自訂房可自由切換標準三線／簡易雙線，並加入電腦 AI 與至多 8 位觀戰者。
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-slate-400">建房預設：</span>
                      <div className="inline-flex p-0.5 rounded bg-[#0A1018] border border-slate-700/80">
                        <button
                          type="button"
                          onClick={() => onSelectMapMode('standard')}
                          className={`px-2 py-0.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
                            mapMode === 'standard'
                              ? 'bg-slate-200 text-slate-950 font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          三線標準
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectMapMode('simple')}
                          className={`px-2 py-0.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
                            mapMode === 'simple'
                              ? 'bg-teal-300 text-slate-950 font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          雙線簡易
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Unit Roster, Asymmetric Armory & Dual Special Techs Preview */}
          <div className="lg:col-span-4 bg-[#0F151E]/88 border border-slate-700/60 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-sm font-semibold text-slate-100">
                {activeFaction.name} · {activeFaction.units.length} 兵種編制
              </span>
              <span className="text-[11px] text-slate-400">標籤克制 · 定點線性攻防</span>
            </div>
            <div className="divide-y divide-slate-800/80">
              {activeFaction.units.map((u) => {
                const armorLabel = u.attributes.includes('Armored') ? '重甲' : '輕甲';
                const armorTone = u.attributes.includes('Massive')
                  ? 'text-rose-300'
                  : u.domain === 'air'
                  ? 'text-cyan-300'
                  : u.attributes.includes('Armored')
                  ? 'text-amber-300'
                  : 'text-sky-300';
                return (
                  <div key={u.id} className="py-1.5 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono-num text-[11px] text-slate-400">[{u.hotkey}]</span>
                        <span className="font-semibold text-slate-100 truncate">{u.name}</span>
                        <span className={`text-[10.5px] font-semibold ${armorTone}`}>
                          {armorLabel}·{u.domain === 'air' ? '空' : '陸'}
                        </span>
                        {u.attackCount > 1 && (
                          <span className="text-[10px] font-mono-num text-amber-300">×{u.attackCount}</span>
                        )}
                        {u.canHitAir && <span className="text-[10px] text-sky-400">對空</span>}
                        <span className="text-[10.5px] text-slate-500">T{u.tier}</span>
                      </div>
                      <div className="text-[10.5px] text-slate-400 truncate">
                        {u.damage}攻/{u.armor}甲 · {u.counterNote}
                      </div>
                    </div>
                    <div className="font-mono-num text-amber-300 font-semibold whitespace-nowrap shrink-0">
                      {u.cost}G
                      {(u.gasCost ?? 0) > 0 && (
                        <span className="text-cyan-300 ml-1">+{u.gasCost}氣</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pt-2 border-t border-slate-800 space-y-1 text-[10.5px] text-slate-400 leading-snug">
              <div className="text-sky-300/90">
                六軌攻防（G/U/H/I/J/O）：{activeFaction.armorySummary}
              </div>
              {activeFaction.specialTechs.map((sp) => (
                <div key={sp.slot} className="text-violet-300/90">
                  專屬 [{sp.hotkey}]（T{sp.tierReq}）· {sp.name}：{sp.desc}
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Bottom Single Flat Control-Hint Line (Desktop Hotkeys vs Mobile Touch Hint) */}
        <footer className="border-t border-slate-800/70 pt-2 flex items-center justify-between text-xs text-slate-400">
          <div className="hidden lg:block truncate">
            1/2/3 戰線 · Q/W/E/R/C/V 徵召 · T 建/升塔 · B 補給 · G/H/J 攻防 · K/L 專屬 · X 奇襲 · Z 撤退 · S 掃描 · F 戰術技 · Space 選單
          </div>
          <div className="lg:hidden truncate text-[11px]">
            雙指縮放 / 單指拖曳戰場 · 點擊空塔基建塔 · 底部四分頁指令列
          </div>
          <div className="font-mono-num text-slate-500 whitespace-nowrap shrink-0 ml-3">
            摧毀敵方主堡獲勝
          </div>
        </footer>
      </div>

      {/* Detailed Data Tactical Manual & Strategy Guide Modal */}
      <TacticalManualModal
        open={manualOpen}
        initialFaction={selectedFaction}
        onClose={() => setManualOpen(false)}
      />
    </div>
  );
};
