import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdvancedFactionGuideModal } from './components/AdvancedFactionGuideModal';
import { BattleHoverTooltip } from './components/BattleHoverTooltip';
import { BattleHUD, PvpHudInfo } from './components/BattleHUD';
import { FriendsDrawer } from './components/FriendsDrawer';
import { TacticCoachOverlay } from './components/TacticCoachOverlay';
import { TitleScreen } from './components/TitleScreen';
import { TutorialCoachOverlay } from './components/TutorialCoachOverlay';
import { tacticalAudio } from './game/audio';
import { BattleEngine, closestLaneToPoint } from './game/engine';
import { FACTIONS, PLAYER_NEXUS_POS } from './game/data';
import { buildHoverInspectData, findHoveredEntity, HoveredEntityRef } from './game/hoverInspect';
import {
  loadPlayerPrefs,
  normalizeFriendCode,
  SavedFriend,
  savePlayerPrefs,
} from './game/playerStorage';
import { PvpClient } from './game/pvpClient';
import {
  FriendInviteEvent,
  FriendOnlineStatus,
  PvpRoomInfo,
  PvpSeat,
  RoomChatMessage,
  SpectatorTeamSummary,
  SpectatorViewMode,
} from './game/pvpTypes';
import { BattleRenderer } from './game/renderer';
import { evaluateTacticCoach } from './game/tacticCoach';
import {
  getTutorialStepByIndex,
  TUTORIAL_STEPS,
  TutorialMobileTab,
  TutorialRuntimeFlags,
} from './game/tutorial';
import {
  AIArchetype,
  AIArchetypeOption,
  ArmoryBuildingKind,
  ArmoryTrackId,
  BarracksTier,
  CancellableBuildingKind,
  Difficulty,
  EnemyFactionOption,
  FactionId,
  GameSnapshot,
  LaneId,
  LaneStance,
  MapMode,
  TargetMode,
  TowerType,
  TowerUpgradeMode,
} from './game/types';

export default function App() {
  const initialPrefsRef = useRef<ReturnType<typeof loadPlayerPrefs> | null>(null);
  if (!initialPrefsRef.current) {
    initialPrefsRef.current = loadPlayerPrefs();
  }
  const initialPrefs = initialPrefsRef.current;

  const [myFriendCode] = useState<string>(initialPrefs.friendCode);
  const [selectedFaction, setSelectedFaction] = useState<FactionId>(initialPrefs.selectedFaction);
  const [sandboxRightFaction, setSandboxRightFaction] = useState<FactionId>('ironbound');
  const [enemyFaction, setEnemyFaction] = useState<EnemyFactionOption>('ironbound');
  const [enemyArchetype, setEnemyArchetype] = useState<AIArchetypeOption>('random');
  const [difficulty, setDifficulty] = useState<Difficulty>(initialPrefs.difficulty);
  const [mapMode, setMapMode] = useState<MapMode>(initialPrefs.mapMode);
  const [muted, setMuted] = useState<boolean>(initialPrefs.muted);

  // Persistent 5-Tactic Beginner Playbook Coach State
  const [tacticGuideEnabled, setTacticGuideEnabled] = useState<boolean>(initialPrefs.tacticGuideEnabled);
  const [selectedTacticGuide, setSelectedTacticGuide] = useState<AIArchetype>(initialPrefs.selectedTacticGuide);
  const [tacticCoachCollapsed, setTacticCoachCollapsed] = useState(false);
  const [tacticCoachMinStep, setTacticCoachMinStep] = useState(0);

  // Persistent Friends List & Live Presence State
  const [friends, setFriends] = useState<SavedFriend[]>(initialPrefs.friends);
  const [friendsDrawerOpen, setFriendsDrawerOpen] = useState(false);
  const [friendStatuses, setFriendStatuses] = useState<Record<string, FriendOnlineStatus>>({});
  const [incomingInvites, setIncomingInvites] = useState<FriendInviteEvent[]>([]);
  const [friendFeedback, setFriendFeedback] = useState<string | null>(null);
  const pendingInviteTargetRef = useRef<string | null>(null);
  const friendFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Online PvP State
  const [playerName, setPlayerName] = useState<string>(initialPrefs.playerName);
  const [pvpConnected, setPvpConnected] = useState(false);
  const [pvpOnlineCount, setPvpOnlineCount] = useState(1);
  const [pvpRoom, setPvpRoom] = useState<PvpRoomInfo | null>(null);
  const [pvpQueueWaiting, setPvpQueueWaiting] = useState(false);
  const [pvpError, setPvpError] = useState<string | null>(null);
  const [pvpMenuOpen, setPvpMenuOpen] = useState(false);
  const [pvpNotice, setPvpNotice] = useState<string | null>(null);
  const [pvpCountdown, setPvpCountdown] = useState<number | null>(null);
  const [spectatorView, setSpectatorView] = useState<SpectatorViewMode>('all');
  const [spectatorTeams, setSpectatorTeams] = useState<[SpectatorTeamSummary, SpectatorTeamSummary] | null>(null);
  const [chatMessages, setChatMessages] = useState<RoomChatMessage[]>([]);
  const [inGameChatOpen, setInGameChatOpen] = useState(false);
  const [cameraZoom, setCameraZoom] = useState(1);
  const [hoveredEntity, setHoveredEntity] = useState<{ ref: HoveredEntityRef; x: number; y: number } | null>(null);

  // Interactive New-Player Tutorial State
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [tutorialCollapsed, setTutorialCollapsed] = useState(false);
  const [tutorialRewardToast, setTutorialRewardToast] = useState<string | null>(null);
  const [tutorialFlags, setTutorialFlags] = useState<TutorialRuntimeFlags>({
    stanceChanged: false,
    factionSkillUsed: false,
  });

  // Faction-Based Advanced Tutorial Modal State
  const [factionGuideOpen, setFactionGuideOpen] = useState(false);
  const [factionGuideFaction, setFactionGuideFaction] = useState<FactionId>('ironbound');

  const engineRef = useRef<BattleEngine | null>(null);
  const rendererRef = useRef<BattleRenderer | null>(null);
  const pvpClientRef = useRef<PvpClient | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tutorialToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAdvancedStepRef = useRef<number>(-1);

  // Apply persisted mute state on initial load
  useEffect(() => {
    tacticalAudio.setMuted(muted);
  }, [muted]);

  // Persist all user preferences & friends list to browser localStorage
  useEffect(() => {
    savePlayerPrefs({
      friendCode: myFriendCode,
      playerName,
      tacticGuideEnabled,
      selectedTacticGuide,
      selectedFaction,
      mapMode,
      difficulty,
      muted,
      friends,
    });
  }, [
    myFriendCode,
    playerName,
    tacticGuideEnabled,
    selectedTacticGuide,
    selectedFaction,
    mapMode,
    difficulty,
    muted,
    friends,
  ]);

  // Unified touch & mouse pointer gesture tracking (tap vs pan vs 2-finger pinch zoom)
  const pointersRef = useRef<
    Map<number, { x: number; y: number; startX: number; startY: number; pointerType: string; moved: boolean }>
  >(new Map());
  const pinchRef = useRef<{
    active: boolean;
    lastDist: number;
    lastMidX: number;
    lastMidY: number;
  }>({ active: false, lastDist: 0, lastMidX: 0, lastMidY: 0 });
  const suppressNextTapRef = useRef(false);
  const lastSquadXPressRef = useRef(0);
  const lastRemoteConstructClickRef = useRef<{ kind: CancellableBuildingKind; id: string; time: number } | null>(null);

  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => {
    const eng = new BattleEngine();
    engineRef.current = eng;
    return eng.getSnapshot();
  });

  // Wire snapshot subscription + 60fps isolated animation loop
  useEffect(() => {
    const engine = engineRef.current ?? new BattleEngine();
    engineRef.current = engine;
    const renderer = rendererRef.current ?? new BattleRenderer();
    rendererRef.current = renderer;

    engine.emitSnapshot = () => {
      setSnapshot(engine.getSnapshot());
    };

    let rafId = 0;
    let lastTime = performance.now();

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = container.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };

    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    if (containerRef.current) ro.observe(containerRef.current);

    const frame = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      engine.update(dt);

      const canvas = canvasRef.current;
      if (canvas && engine.screen !== 'TITLE') {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderer.render(ctx, engine, canvas.width, canvas.height);
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  // Wire Online PvP WebSocket Client
  useEffect(() => {
    const client = new PvpClient({
      onConnectionChange: (connected, onlineCount) => {
        setPvpConnected(connected);
        if (typeof onlineCount === 'number') setPvpOnlineCount(onlineCount);
        if (!connected) {
          setPvpQueueWaiting(false);
          if (engineRef.current?.isRemoteClient) {
            if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
            setPvpNotice('連線暫時中斷，正在自動重連戰局…');
          }
        }
      },
      onQueueChange: (waiting) => {
        setPvpQueueWaiting(waiting);
        if (waiting) setPvpError(null);
      },
      onRoomState: (room) => {
        setPvpRoom(room);
        setPvpCountdown(room?.countdownSeconds ?? null);
        setPvpError(null);
        if (room && pendingInviteTargetRef.current) {
          const targetCode = pendingInviteTargetRef.current;
          pendingInviteTargetRef.current = null;
          pvpClientRef.current?.send({
            type: 'friend:invite',
            targetFriendCode: targetCode,
            roomCode: room.code,
          });
        }
      },
      onError: (message) => {
        setPvpError(message);
      },
      onFriendsStatus: (statuses) => {
        setFriendStatuses((prev) => {
          const next = { ...prev };
          for (const st of statuses) {
            next[st.friendCode] = st;
          }
          return next;
        });
        setFriends((prev) => {
          let changed = false;
          const updated = prev.map((f) => {
            const matched = statuses.find((s) => s.friendCode === f.friendCode && s.online && s.name);
            if (matched && matched.name !== f.name) {
              changed = true;
              return { ...f, name: matched.name };
            }
            return f;
          });
          return changed ? updated : prev;
        });
      },
      onFriendInvited: (invite) => {
        tacticalAudio.playCountdownTick(2);
        setIncomingInvites((prev) => {
          if (prev.some((i) => i.id === invite.id || (i.roomCode === invite.roomCode && i.fromFriendCode === invite.fromFriendCode))) {
            return prev;
          }
          return [invite, ...prev].slice(0, 5);
        });
      },
      onFriendInviteResult: (_ok, message) => {
        setFriendFeedback(message);
        if (friendFeedbackTimerRef.current) clearTimeout(friendFeedbackTimerRef.current);
        friendFeedbackTimerRef.current = setTimeout(() => setFriendFeedback(null), 4500);
      },
      onCountdown: (seconds, reason) => {
        if (seconds && seconds > 0) {
          setPvpCountdown(seconds);
          tacticalAudio.playCountdownTick(seconds);
        } else {
          setPvpCountdown(null);
          if (reason) {
            setPvpNotice(reason);
            if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
            noticeTimerRef.current = setTimeout(() => setPvpNotice(null), 4500);
          }
        }
      },
      onRejoinFailed: (reason) => {
        setPvpRoom(null);
        setPvpCountdown(null);
        if (engineRef.current?.isRemoteClient) {
          setPvpNotice(reason);
          if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
          noticeTimerRef.current = setTimeout(() => setPvpNotice(null), 7000);
        }
      },
      onMatchStart: (room, state, isRejoin) => {
        setPvpRoom(room);
        setPvpCountdown(null);
        setPvpMenuOpen(false);
        setPvpError(null);
        setFriendsDrawerOpen(false);
        if (!isRejoin) {
          setTacticCoachMinStep(0);
          setTacticCoachCollapsed(false);
        }
        setSpectatorView(state.spectatorView ?? 'all');
        setSpectatorTeams(state.spectatorTeams ?? null);
        const engine = engineRef.current;
        const seamlessRejoin = Boolean(isRejoin && engine && engine.isRemoteClient && engine.screen === 'PLAYING');
        if (engine) {
          if (!seamlessRejoin) {
            const lanes = state.snapshot.activeLanes;
            engine.selectedLane = lanes?.includes(1) ? 1 : (lanes?.[0] ?? (state.mapMode === 'simple' ? 0 : 1));
            engine.selectedTowerType = 'watchtower';
            engine.towerUpgradeMode = 'combat';
            engine.targetMode = 'none';
          }
          engine.applyRemoteState(state);
        }
        if (seamlessRejoin) {
          setPvpNotice('已自動重連至戰局，繼續作戰！');
          if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
          noticeTimerRef.current = setTimeout(() => setPvpNotice(null), 4000);
        } else {
          setPvpNotice(null);
          rendererRef.current?.resetCamera();
          setCameraZoom(1);
          tacticalAudio.playEventHorn();
        }
      },
      onMatchState: (state) => {
        if (state.spectatorView) setSpectatorView(state.spectatorView);
        if (state.spectatorTeams) setSpectatorTeams(state.spectatorTeams);
        const engine = engineRef.current;
        if (engine && engine.isRemoteClient) {
          engine.applyRemoteState(state);
        }
      },
      onNotice: (text) => {
        setPvpNotice(text);
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = setTimeout(() => setPvpNotice(null), 6500);
      },
      onChatHistory: (messages) => {
        setChatMessages(messages.slice(-60));
      },
      onChatMessage: (message) => {
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          const next = [...prev, message];
          return next.length > 60 ? next.slice(-60) : next;
        });
      },
    });

    pvpClientRef.current = client;
    client.connect();

    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      if (friendFeedbackTimerRef.current) clearTimeout(friendFeedbackTimerRef.current);
      client.disconnect();
      pvpClientRef.current = null;
    };
  }, []);

  // Keep server presence & watched friends list synchronized
  useEffect(() => {
    pvpClientRef.current?.registerPresence(
      myFriendCode,
      playerName,
      friends.map((f) => f.friendCode)
    );
  }, [myFriendCode, playerName, friends, pvpConnected]);

  const getControlledTeamState = (engine: BattleEngine) => engine.getControlledTeamState();

  // Unified Action Dispatchers (Local Solo / Sandbox Engine OR Online Authoritative PvP Server)
  const actSelectLane = useCallback((lane: LaneId) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.selectLane(lane);
    if (engine.isRemoteClient) {
      pvpClientRef.current?.sendCommand({ type: 'select_lane', lane });
    }
  }, []);

  const actSelectSquad = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !getControlledTeamState(engine).squadActive) return;
    engine.selectSquad();
    if (engine.isRemoteClient) {
      pvpClientRef.current?.sendCommand({ type: 'select_squad' });
    }
  }, []);

  const actSetStance = useCallback((lane: LaneId, stance: LaneStance) => {
    const engine = engineRef.current;
    if (!engine) return;
    const ctrlState = getControlledTeamState(engine);
    if (engine.squadSelected && ctrlState.squadActive) {
      if (engine.isRemoteClient) {
        tacticalAudio.playStance(stance);
        pvpClientRef.current?.sendCommand({ type: 'set_squad_stance', stance });
      } else {
        engine.setSquadStance(stance);
      }
      return;
    }
    if (engine.isRemoteClient) {
      tacticalAudio.playStance(stance);
      pvpClientRef.current?.sendCommand({ type: 'set_stance', lane, stance });
    } else {
      engine.setLaneStance(lane, stance);
      if (engine.tutorialMode && (stance === 'push' || stance === 'all_in')) {
        setTutorialFlags((prev) => (prev.stanceChanged ? prev : { ...prev, stanceChanged: true }));
      }
    }
  }, []);

  const actDisbandSquad = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !getControlledTeamState(engine).squadActive) return;
    if (engine.isRemoteClient) {
      engine.squadSelected = false;
      tacticalAudio.playClick();
      pvpClientRef.current?.sendCommand({ type: 'disband_squad' });
      engine.emitSnapshot();
    } else {
      engine.disbandSquad(engine.getControlledTeam());
    }
  }, []);

  const actRepairNexus = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.isRemoteClient) {
      tacticalAudio.playBuildStart();
      pvpClientRef.current?.sendCommand({ type: 'repair_nexus' });
    } else {
      engine.repairNexusPlating(engine.getControlledTeam());
    }
  }, []);

  const actTrainUnit = useCallback((unitIndex: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.isRemoteClient) {
      tacticalAudio.playRecruit();
      pvpClientRef.current?.sendCommand({ type: 'train_unit', unitIndex, lane: engine.selectedLane });
    } else {
      engine.trainUnit(unitIndex, engine.selectedLane, engine.getControlledTeam());
    }
  }, []);

  const actSelectTowerType = useCallback((type: TowerType) => {
    engineRef.current?.selectTowerType(type);
  }, []);

  const actSetTowerUpgradeMode = useCallback((mode: TowerUpgradeMode) => {
    engineRef.current?.setTowerUpgradeMode(mode);
  }, []);

  const actQuickBuildTower = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.isRemoteClient) {
      tacticalAudio.playBuildStart();
      pvpClientRef.current?.sendCommand({
        type: 'quick_tower',
        lane: engine.selectedLane,
        towerType: engine.selectedTowerType,
        upgradeMode: engine.towerUpgradeMode,
      });
    } else {
      engine.quickBuildTowerOnSelectedLane();
    }
  }, []);

  const actBuildDepot = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.isRemoteClient) {
      tacticalAudio.playBuildStart();
      pvpClientRef.current?.sendCommand({ type: 'build_depot' });
    } else {
      engine.buildSupplyDepot(engine.getControlledTeam());
    }
  }, []);

  const actBuildBarracks = useCallback((tier: BarracksTier) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.isRemoteClient) {
      tacticalAudio.playBuildStart();
      pvpClientRef.current?.sendCommand({ type: 'build_barracks', tier });
    } else {
      engine.buildBarracks(tier, engine.getControlledTeam());
    }
  }, []);

  const actBuildArmory = useCallback((kind: ArmoryBuildingKind) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.isRemoteClient) {
      tacticalAudio.playBuildStart();
      pvpClientRef.current?.sendCommand({ type: 'build_armory', kind });
    } else {
      engine.buildArmoryBuilding(kind, engine.getControlledTeam());
    }
  }, []);

  const actBuildExtractor = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.isRemoteClient) {
      tacticalAudio.playBuildStart();
      pvpClientRef.current?.sendCommand({ type: 'build_extractor' });
    } else {
      engine.buildOrUpgradeExtractor(engine.getControlledTeam());
    }
  }, []);

  const actCycleTowerType = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const ctrlState = engine.getControlledTeamState();
    const list = FACTIONS[ctrlState.faction].towerTypes;
    const idx = list.indexOf(engine.selectedTowerType);
    const next = list[(idx + 1) % list.length];
    if (next) engine.selectTowerType(next);
  }, []);

  const actCycleTowerUpgradeMode = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const order: TowerUpgradeMode[] = ['combat', 'mining', 'tech'];
    const idx = order.indexOf(engine.towerUpgradeMode);
    engine.setTowerUpgradeMode(order[(idx + 1) % order.length]);
  }, []);

  const actUpgradeEcon = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.isRemoteClient) {
      tacticalAudio.playResearchStart();
      pvpClientRef.current?.sendCommand({ type: 'upgrade_econ' });
    } else {
      engine.upgradeEconomy(engine.getControlledTeam());
    }
  }, []);

  const actUpgradeTech = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.isRemoteClient) {
      tacticalAudio.playResearchStart();
      pvpClientRef.current?.sendCommand({ type: 'upgrade_tech' });
    } else {
      engine.upgradeTech(engine.getControlledTeam());
    }
  }, []);

  const actUpgradeArmory = useCallback((track: ArmoryTrackId) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.isRemoteClient) {
      tacticalAudio.playResearchStart();
      pvpClientRef.current?.sendCommand({ type: 'upgrade_armory', track });
    } else {
      engine.upgradeArmoryTrack(track, engine.getControlledTeam());
    }
  }, []);

  const actResearchSpecial = useCallback((slot: 0 | 1) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.isRemoteClient) {
      tacticalAudio.playResearchStart();
      pvpClientRef.current?.sendCommand({ type: 'research_special', slot });
    } else {
      engine.researchSpecialTech(slot, engine.getControlledTeam());
    }
  }, []);

  // Smart [K] trigger (synchronized for all 3 factions): Lv.0 researches I; Lv.1+ ready casts active [K]; Lv.1 on CD at T3 upgrades to Lv.2
  const actTriggerKAction = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const ctrlState = getControlledTeamState(engine);
    const kLv = ctrlState.specialTechLevels?.[0] ?? (ctrlState.specialTechsDone[0] ? 1 : 0);
    if (kLv === 0) {
      actResearchSpecial(0);
      return;
    }
    const kCd = ctrlState.kActiveCooldown ?? 0;
    if (kCd <= 0) {
      engine.setTargetMode('k_boost');
      return;
    }
    if (kLv === 1 && ctrlState.techTier >= 3) {
      actResearchSpecial(0);
      return;
    }
    tacticalAudio.playDenied();
  }, [actResearchSpecial]);

  const actSetTargetMode = useCallback((mode: TargetMode) => {
    engineRef.current?.setTargetMode(mode);
  }, []);

  const actPressAmbushKey = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    // If already selecting or targeting for ambush, pressing X again cancels it
    if (engine.targetMode === 'ambush_select' || engine.targetMode === 'ambush_target') {
      engine.setTargetMode('none');
      return;
    }
    // If 4th-lane squad is active: single press selects squad; double-press within 450ms disbands!
    if (getControlledTeamState(engine).squadActive) {
      const now = Date.now();
      if (now - lastSquadXPressRef.current <= 450) {
        lastSquadXPressRef.current = 0;
        actDisbandSquad();
      } else {
        lastSquadXPressRef.current = now;
        actSelectSquad();
      }
      return;
    }
    // Otherwise start ambush unit selection
    engine.setTargetMode('ambush_select');
  }, [actDisbandSquad, actSelectSquad]);

  const actTogglePause = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.isRemoteClient) {
      setPvpMenuOpen((prev) => !prev);
    } else {
      engine.togglePause();
    }
  }, []);

  const handleChangeSpectatorView = useCallback((view: SpectatorViewMode) => {
    setSpectatorView(view);
    pvpClientRef.current?.send({ type: 'spectator:view', view });
    tacticalAudio.playClick();
  }, []);

  const handleSendChat = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    pvpClientRef.current?.send({ type: 'chat:send', text: trimmed });
  }, []);

  // Keyboard shortcuts effect is mounted below after all action callbacks are declared.

  const handleSelectFaction = useCallback(
    (faction: FactionId) => {
      setSelectedFaction(faction);
      if (pvpRoom && pvpRoom.phase === 'lobby') {
        pvpClientRef.current?.send({ type: 'room:faction', faction });
      }
    },
    [pvpRoom]
  );

  const handleSelectEnemyArchetype = useCallback((arch: AIArchetypeOption) => {
    setEnemyArchetype(arch);
    if (arch !== 'random') {
      setEnemyFaction('ironbound');
    }
  }, []);

  const handleStartMatch = useCallback(() => {
    setPvpMenuOpen(false);
    rendererRef.current?.resetCamera();
    setCameraZoom(1);
    engineRef.current?.startMatch(selectedFaction, difficulty, enemyFaction, mapMode, enemyArchetype);
  }, [selectedFaction, difficulty, enemyFaction, mapMode, enemyArchetype]);

  const handleStartSandbox = useCallback(() => {
    setPvpMenuOpen(false);
    rendererRef.current?.resetCamera();
    setCameraZoom(1);
    engineRef.current?.startSandboxMatch(selectedFaction, sandboxRightFaction, mapMode);
  }, [selectedFaction, sandboxRightFaction, mapMode]);

  const handleOpenFactionGuide = useCallback(
    (factionId?: FactionId) => {
      const engine = engineRef.current;
      const fallbackFaction =
        engine && engine.screen !== 'TITLE' ? getControlledTeamState(engine).faction : selectedFaction;
      setFactionGuideFaction(factionId ?? fallbackFaction);
      setFactionGuideOpen(true);
    },
    [selectedFaction]
  );

  const handleLaunchSandboxFromGuide = useCallback(
    (leftFaction: FactionId, rightFaction: FactionId) => {
      setFactionGuideOpen(false);
      setPvpMenuOpen(false);
      setSelectedFaction(leftFaction);
      setSandboxRightFaction(rightFaction);
      rendererRef.current?.resetCamera();
      setCameraZoom(1);
      engineRef.current?.startSandboxMatch(leftFaction, rightFaction, mapMode);
    },
    [mapMode]
  );

  const showTutorialToast = useCallback((msg: string) => {
    setTutorialRewardToast(msg);
    if (tutorialToastTimerRef.current) clearTimeout(tutorialToastTimerRef.current);
    tutorialToastTimerRef.current = setTimeout(() => {
      setTutorialRewardToast(null);
    }, 3200);
  }, []);

  const handleStartTutorial = useCallback(() => {
    setPvpMenuOpen(false);
    rendererRef.current?.resetCamera();
    setCameraZoom(1);
    setTutorialStepIndex(0);
    setTutorialCollapsed(false);
    setTutorialRewardToast(null);
    setTutorialFlags({ stanceChanged: false, factionSkillUsed: false });
    lastAdvancedStepRef.current = -1;
    engineRef.current?.startTutorialMatch();
  }, []);

  const advanceTutorialFromIndex = useCallback(
    (curIdx: number, skipped = false) => {
      const curStep = getTutorialStepByIndex(curIdx);
      const nextStep = getTutorialStepByIndex(curIdx + 1);
      if (!curStep || !nextStep) return;
      lastAdvancedStepRef.current = curIdx;
      setTutorialStepIndex(curIdx + 1);
      const rewardParts: string[] = [];
      if (curStep.rewardGold > 0) rewardParts.push(`+${curStep.rewardGold}G`);
      if (curStep.rewardGas > 0) rewardParts.push(`+${curStep.rewardGas}氣`);
      if (curStep.rewardNote) rewardParts.push(curStep.rewardNote);
      const prefix = skipped ? `已跳過【${curStep.title}】` : `✓ 完成【${curStep.title}】`;
      showTutorialToast(rewardParts.length > 0 ? `${prefix} · ${rewardParts.join(' ')}` : prefix);
      engineRef.current?.advanceTutorialStep(
        nextStep.id,
        curStep.rewardGold,
        curStep.rewardGas,
        nextStep.id === 'final_push'
      );
    },
    [showTutorialToast]
  );

  const handleSkipTutorialStep = useCallback(() => {
    if (!engineRef.current?.tutorialMode) return;
    if (tutorialStepIndex >= TUTORIAL_STEPS.length - 1) return;
    advanceTutorialFromIndex(tutorialStepIndex, true);
  }, [tutorialStepIndex, advanceTutorialFromIndex]);

  const handleExitTutorialGuide = useCallback(() => {
    setTutorialRewardToast(null);
    engineRef.current?.exitTutorialGuide();
  }, []);

  const handleToggleTutorialCollapse = useCallback(() => {
    setTutorialCollapsed((prev) => !prev);
  }, []);

  // Auto-evaluate active tutorial step completion in real time
  const activeTutorialStep = snapshot.tutorialMode ? getTutorialStepByIndex(tutorialStepIndex) : null;
  const activeTutorialEval = useMemo(() => {
    if (!activeTutorialStep) return null;
    return activeTutorialStep.evaluate(snapshot, tutorialFlags);
  }, [activeTutorialStep, snapshot, tutorialFlags]);

  useEffect(() => {
    if (!snapshot.tutorialMode || snapshot.screen !== 'PLAYING') return;
    if (snapshot.player.activeCooldown > 0 && !tutorialFlags.factionSkillUsed && activeTutorialStep?.id === 'final_push') {
      setTutorialFlags((prev) => ({ ...prev, factionSkillUsed: true }));
    }
    if (
      activeTutorialEval?.done &&
      tutorialStepIndex < TUTORIAL_STEPS.length - 1 &&
      lastAdvancedStepRef.current !== tutorialStepIndex
    ) {
      advanceTutorialFromIndex(tutorialStepIndex, false);
    }
  }, [
    snapshot.tutorialMode,
    snapshot.screen,
    snapshot.player.activeCooldown,
    tutorialFlags.factionSkillUsed,
    activeTutorialStep?.id,
    activeTutorialEval?.done,
    tutorialStepIndex,
    advanceTutorialFromIndex,
  ]);

  const actSwitchSandboxTeam = useCallback((team: 'player' | 'enemy') => {
    engineRef.current?.switchSandboxTeam(team);
  }, []);

  const actSandboxToggleInstant = useCallback(() => {
    engineRef.current?.toggleSandboxInstantMode();
  }, []);

  const actSandboxMaxOut = useCallback((target: 'player' | 'enemy' | 'both') => {
    engineRef.current?.sandboxMaxOutTeam(target);
  }, []);

  const actSandboxClearUnits = useCallback(() => {
    engineRef.current?.sandboxClearUnits();
  }, []);

  const handleRestartOrRematch = useCallback(() => {
    const engine = engineRef.current;
    if (engine?.isRemoteClient) {
      pvpClientRef.current?.send({ type: 'room:rematch' });
    } else if (engine?.tutorialMode) {
      handleStartTutorial();
    } else if (engine?.sandboxMode) {
      handleStartSandbox();
    } else {
      handleStartMatch();
    }
  }, [handleStartMatch, handleStartSandbox, handleStartTutorial]);

  const handleSurrender = useCallback(() => {
    setPvpMenuOpen(false);
    const engine = engineRef.current;
    if (engine?.isRemoteClient) {
      pvpClientRef.current?.sendCommand({ type: 'surrender' });
    } else {
      engine?.surrender(engine.getControlledTeam());
    }
  }, []);

  const handleReturnTitle = useCallback(() => {
    setPvpMenuOpen(false);
    setPvpNotice(null);
    setPvpCountdown(null);
    setSpectatorTeams(null);
    setSpectatorView('all');
    setChatMessages([]);
    setInGameChatOpen(false);
    setTutorialRewardToast(null);
    rendererRef.current?.resetCamera();
    setCameraZoom(1);
    const engine = engineRef.current;
    if (engine?.isRemoteClient || pvpRoom) {
      pvpClientRef.current?.send({ type: 'room:leave' });
      setPvpRoom(null);
    }
    if (engine) {
      engine.isRemoteClient = false;
      engine.pvpMode = false;
      engine.sandboxMode = false;
      engine.tutorialMode = false;
      engine.tutorialStepId = null;
      engine.observerView = 'none';
      engine.setScreen('TITLE');
    }
  }, [pvpRoom]);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      tacticalAudio.setMuted(next);
      return next;
    });
  }, []);

  const syncCameraZoomState = useCallback((z: number) => {
    const rounded = Math.round(z * 10) / 10;
    setCameraZoom((prev) => (prev === rounded ? prev : rounded));
  }, []);

  const handleResetCamera = useCallback(() => {
    rendererRef.current?.resetCamera();
    setCameraZoom(1);
  }, []);

  const handleToggleQuickZoom = useCallback(() => {
    const renderer = rendererRef.current;
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!renderer || !canvas) return;
    if (renderer.getCameraZoom() > 1.05) {
      renderer.resetCamera();
      setCameraZoom(1);
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const laneYMap: Record<LaneId, number> = { 0: 165, 1: 450, 2: 735 };
    const focusY = engine ? laneYMap[engine.selectedLane] : 450;
    const z = renderer.focusCameraOnWorld(760, focusY, 1.85, rect.width, rect.height);
    syncCameraZoomState(z);
  }, [syncCameraZoomState]);

  // Complete conflict-free keyboard shortcuts for EVERY button on the battlefield
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine || engine.screen === 'TITLE' || factionGuideOpen) return;

      // Never trigger gameplay hotkeys while typing in chat input
      const activeTag = (e.target as HTMLElement | null)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      const key = e.key.toLowerCase();

      // Press Enter during any online room match (player or spectator) to open in-game chat
      if (key === 'enter' && engine.isRemoteClient) {
        e.preventDefault();
        setInGameChatOpen(true);
        return;
      }

      // Global audio mute [Backspace] & camera zoom [-]
      if (key === 'backspace') {
        e.preventDefault();
        handleToggleMute();
        return;
      }
      if (e.code === 'Minus') {
        e.preventDefault();
        handleToggleQuickZoom();
        return;
      }

      // Spectators are strictly read-only: fog camera 1/2/3 + Space leave + Backspace mute + - zoom + Enter chat
      if (engine.observerView !== 'none') {
        if (key === '1') handleChangeSpectatorView('all');
        else if (key === '2') handleChangeSpectatorView('player');
        else if (key === '3') handleChangeSpectatorView('enemy');
        else if (key === ' ' || key === 'escape') {
          e.preventDefault();
          handleReturnTitle();
        }
        return;
      }

      if (key === ' ' || key === 'escape') {
        e.preventDefault();
        if (key === 'escape' && engine.targetMode !== 'none') {
          engine.setTargetMode('none');
          return;
        }
        if (engine.screen === 'PLAYING' || engine.screen === 'PAUSED') {
          actTogglePause();
        }
        return;
      }

      if (engine.screen !== 'PLAYING') return;

      // Tutorial coach overlay hotkeys [F1] collapse, [F2] skip step, [F3] exit guide
      if (engine.tutorialMode) {
        if (e.code === 'F1') {
          e.preventDefault();
          handleToggleTutorialCollapse();
          return;
        }
        if (e.code === 'F2') {
          e.preventDefault();
          handleSkipTutorialStep();
          return;
        }
        if (e.code === 'F3') {
          e.preventDefault();
          handleExitTutorialGuide();
          return;
        }
      }

      if (key === 'tab' && engine.sandboxMode) {
        e.preventDefault();
        engine.switchSandboxTeam(engine.sandboxActiveTeam === 'player' ? 'enemy' : 'player');
        return;
      }

      const activeLanes = engine.getActiveLanes();
      const ctrlState = getControlledTeamState(engine);

      // Shifted hotkeys checked FIRST so they never collide with unshifted keys
      if (e.shiftKey) {
        const towerTypes = FACTIONS[ctrlState.faction].towerTypes;
        if (e.code === 'Digit1' && towerTypes[0]) { e.preventDefault(); actSelectTowerType(towerTypes[0]); return; }
        if (e.code === 'Digit2' && towerTypes[1]) { e.preventDefault(); actSelectTowerType(towerTypes[1]); return; }
        if (e.code === 'Digit3' && towerTypes[2]) { e.preventDefault(); actSelectTowerType(towerTypes[2]); return; }
        if (e.code === 'Digit4' && towerTypes[3]) { e.preventDefault(); actSelectTowerType(towerTypes[3]); return; }
        if (e.code === 'Digit5' && towerTypes[4]) { e.preventDefault(); actSelectTowerType(towerTypes[4]); return; }
        if (e.code === 'KeyQ') { e.preventDefault(); actSetTowerUpgradeMode('combat'); return; }
        if (e.code === 'KeyW') { e.preventDefault(); actSetTowerUpgradeMode('mining'); return; }
        if (e.code === 'KeyE') { e.preventDefault(); actSetTowerUpgradeMode('tech'); return; }
        if (e.code === 'KeyR') { e.preventDefault(); actDisbandSquad(); return; }
        if (engine.sandboxMode) {
          if (e.code === 'KeyA') { e.preventDefault(); actSwitchSandboxTeam('player'); return; }
          if (e.code === 'KeyD') { e.preventDefault(); actSwitchSandboxTeam('enemy'); return; }
          if (e.code === 'KeyZ') { e.preventDefault(); actSandboxMaxOut('both'); return; }
          if (e.code === 'KeyI') { e.preventDefault(); actSandboxToggleInstant(); return; }
          if (e.code === 'KeyC') { e.preventDefault(); actSandboxClearUnits(); return; }
          if (e.code === 'KeyX') { e.preventDefault(); handleRestartOrRematch(); return; }
        }
        return;
      }

      if (key === '1' && activeLanes[0] !== undefined) actSelectLane(activeLanes[0]);
      else if (key === '2' && activeLanes[1] !== undefined) actSelectLane(activeLanes[1]);
      else if (key === '3' && activeLanes[2] !== undefined) actSelectLane(activeLanes[2]);
      else if (key === '4' && ctrlState.squadActive) actSelectSquad();
      else if (key === '5') actSetStance(engine.selectedLane, 'push');
      else if (key === '6') actSetStance(engine.selectedLane, 'all_in');
      else if (key === '7') actSetStance(engine.selectedLane, 'hold_tower');
      else if (key === '8') actSetStance(engine.selectedLane, 'defend_base');
      else if (key === '9') actSetStance(engine.selectedLane, 'retreat');
      else if (key === '0') actRepairNexus();
      else if (key === 'q') actTrainUnit(0);
      else if (key === 'w') actTrainUnit(1);
      else if (key === 'e') actTrainUnit(2);
      else if (key === 'r') actTrainUnit(3);
      else if (key === 'c') actTrainUnit(4);
      else if (key === 'v') actTrainUnit(5);
      else if (key === 'y') actTrainUnit(6);
      else if (key === 'n') actTrainUnit(7);
      else if (key === 'm') actTrainUnit(8);
      else if (key === 't') actQuickBuildTower();
      else if (key === 'b') actBuildDepot();
      else if (key === 'p') actBuildExtractor();
      else if (e.code === 'BracketLeft') actBuildArmory('bio_lab');
      else if (e.code === 'BracketRight') actBuildArmory('mech_bay');
      else if (e.code === 'Comma') actBuildBarracks(1);
      else if (e.code === 'Period') actBuildBarracks(2);
      else if (e.code === 'Slash') actBuildBarracks(3);
      else if (e.code === 'Semicolon') actCycleTowerUpgradeMode();
      else if (e.code === 'Quote') actCycleTowerType();
      else if (e.code === 'Backslash' && !engine.isRemoteClient) engine.toggleSpeed();
      else if (key === 'a') actUpgradeEcon();
      else if (key === 'd') actUpgradeTech();
      else if (key === 'g') actUpgradeArmory('trackA');
      else if (key === 'u') actUpgradeArmory('trackD');
      else if (key === 'h') actUpgradeArmory('trackB');
      else if (key === 'i') actUpgradeArmory('trackE');
      else if (key === 'j') actUpgradeArmory('trackC');
      else if (key === 'o') actUpgradeArmory('trackF');
      else if (key === 'k') actTriggerKAction();
      else if (key === 'l') actResearchSpecial(1);
      else if (key === 'x') actPressAmbushKey();
      else if (key === 'z') {
        const cur =
          engine.squadSelected && ctrlState.squadActive
            ? ctrlState.squadStance
            : ctrlState.laneStances[engine.selectedLane];
        actSetStance(engine.selectedLane, cur === 'retreat' ? 'hold_tower' : 'retreat');
      }
      else if (key === 's') actSetTargetMode('scan');
      else if (key === 'f') actSetTargetMode('faction_skill');
    };

    const onBlur = () => {
      const engine = engineRef.current;
      if (engine && engine.targetMode !== 'none') {
        engine.setTargetMode('none');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', onBlur);
    };
  }, [
    actTogglePause,
    actSelectLane,
    actSelectSquad,
    actDisbandSquad,
    actRepairNexus,
    actPressAmbushKey,
    actSetStance,
    actTrainUnit,
    actSelectTowerType,
    actSetTowerUpgradeMode,
    actCycleTowerType,
    actCycleTowerUpgradeMode,
    actQuickBuildTower,
    actBuildDepot,
    actBuildBarracks,
    actBuildArmory,
    actBuildExtractor,
    actUpgradeEcon,
    actUpgradeTech,
    actUpgradeArmory,
    actTriggerKAction,
    actResearchSpecial,
    actSetTargetMode,
    actSwitchSandboxTeam,
    actSandboxMaxOut,
    actSandboxToggleInstant,
    actSandboxClearUnits,
    handleToggleMute,
    handleToggleQuickZoom,
    handleRestartOrRematch,
    handleReturnTitle,
    handleChangeSpectatorView,
    handleToggleTutorialCollapse,
    handleSkipTutorialStep,
    handleExitTutorialGuide,
    factionGuideOpen,
  ]);

  const dispatchCanvasTap = useCallback((clientX: number, clientY: number, isTouch: boolean) => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    const engine = engineRef.current;
    if (!canvas || !renderer || !engine) return;
    const rect = canvas.getBoundingClientRect();
    const world = renderer.clientToWorld(clientX, clientY, rect);
    if (!world) return;

    if (!engine.isRemoteClient) {
      engine.handleCanvasClick(world.x, world.y, false, isTouch);
      return;
    }

    if (engine.observerView !== 'none' || engine.screen !== 'PLAYING') return;

    // Remote PvP Canvas Click Routing
    if (engine.targetMode === 'scan') {
      pvpClientRef.current?.sendCommand({ type: 'scan', x: world.x, y: world.y });
      engine.targetMode = 'none';
      tacticalAudio.playScan();
      engine.emitSnapshot();
      return;
    }
    if (engine.targetMode === 'faction_skill') {
      pvpClientRef.current?.sendCommand({ type: 'faction_skill', x: world.x, y: world.y });
      engine.targetMode = 'none';
      tacticalAudio.playSkill();
      engine.emitSnapshot();
      return;
    }
    if (engine.targetMode === 'k_boost') {
      pvpClientRef.current?.sendCommand({ type: 'k_boost', x: world.x, y: world.y });
      engine.targetMode = 'none';
      tacticalAudio.playSkill();
      engine.emitSnapshot();
      return;
    }
    if (engine.targetMode === 'ambush_select') {
      engine.selectUnitsForAmbush(world.x, world.y);
      return;
    }
    if (engine.targetMode === 'ambush_target') {
      const unitIds = [...engine.pendingAmbushUnitIds];
      engine.pendingAmbushUnitIds = [];
      engine.targetMode = 'none';
      if (unitIds.length > 0) {
        pvpClientRef.current?.sendCommand({ type: 'form_squad', unitIds, targetX: world.x, targetY: world.y });
        engine.squadSelected = true;
        tacticalAudio.playAmbush();
      }
      engine.emitSnapshot();
      return;
    }

    // Clicking own Nexus when plating is broken initiates plating repair!
    if (
      engine.player.nexusPlatingBroken &&
      Math.hypot(PLAYER_NEXUS_POS.x - world.x, PLAYER_NEXUS_POS.y - world.y) <= (isTouch ? 58 : 48)
    ) {
      pvpClientRef.current?.sendCommand({ type: 'repair_nexus' });
      tacticalAudio.playBuildStart();
      return;
    }

    const depotHitRadius = isTouch ? 36 : 22;
    const padHitRadius = isTouch ? 42 : 28;

    const checkRemoteDoubleCancel = (kind: CancellableBuildingKind, id: string): boolean => {
      const now = Date.now();
      const prev = lastRemoteConstructClickRef.current;
      if (prev && prev.kind === kind && prev.id === id && now - prev.time <= 600) {
        lastRemoteConstructClickRef.current = null;
        pvpClientRef.current?.sendCommand({ type: 'cancel_building', kind, id });
        tacticalAudio.playClick();
        return true;
      }
      lastRemoteConstructClickRef.current = { kind, id, time: now };
      return false;
    };

    // Check Armory Prerequisite Buildings (Bio Lab / Mech Bay)
    const clickedArmory = engine.armories.find(
      (a) => a.team === 'player' && Math.hypot(a.x - world.x, a.y - world.y) <= depotHitRadius + 4
    );
    if (clickedArmory) {
      if (clickedArmory.building) {
        checkRemoteDoubleCancel('armory', clickedArmory.id);
        return;
      }
      if (!clickedArmory.built) {
        pvpClientRef.current?.sendCommand({ type: 'build_armory', kind: clickedArmory.kind });
        tacticalAudio.playBuildStart();
        return;
      }
    }

    // Check Gas Extractors (behind Nexus & behind every active Tower Pad)
    const clickedExtractor = engine.extractors.find(
      (g) =>
        Math.hypot(g.x - world.x, g.y - world.y) <= depotHitRadius + 2 &&
        ((g.team === 'player' && (g.building || g.upgrading || g.built)) ||
          (!g.built && !g.building && engine.isExtractorEligibleForTeam(g, 'player')))
    );
    if (clickedExtractor) {
      if (clickedExtractor.team === 'player' && (clickedExtractor.building || clickedExtractor.upgrading)) {
        checkRemoteDoubleCancel('extractor', clickedExtractor.id);
        return;
      }
      if (!clickedExtractor.built || clickedExtractor.level < 3) {
        pvpClientRef.current?.sendCommand({ type: 'build_extractor', extractorId: clickedExtractor.id });
        tacticalAudio.playBuildStart();
        return;
      }
    }

    const clickedDepot = engine.depots.find(
      (d) => d.team === 'player' && Math.hypot(d.x - world.x, d.y - world.y) <= depotHitRadius
    );
    if (clickedDepot) {
      if (clickedDepot.building) {
        checkRemoteDoubleCancel('depot', clickedDepot.id);
        return;
      }
      if (!clickedDepot.built) {
        pvpClientRef.current?.sendCommand({ type: 'build_depot', depotId: clickedDepot.id });
        tacticalAudio.playBuildStart();
        return;
      }
    }

    const clickedBarracks = engine.barracks.find(
      (b) => b.team === 'player' && Math.hypot(b.x - world.x, b.y - world.y) <= depotHitRadius + 4
    );
    if (clickedBarracks) {
      if (clickedBarracks.building) {
        checkRemoteDoubleCancel('barracks', clickedBarracks.id);
        return;
      }
      if (!clickedBarracks.built || clickedBarracks.level < 4) {
        if (engine.player.techTier >= clickedBarracks.tier) {
          pvpClientRef.current?.sendCommand({ type: 'build_barracks', tier: clickedBarracks.tier });
          tacticalAudio.playBuildStart();
        }
        return;
      }
    }

    const playerVision = engine.getVisionCircles('player');
    const clickedPad = engine.pads.find(
      (p) =>
        Math.hypot(p.x - world.x, p.y - world.y) <= padHitRadius &&
        (p.team === 'player' ||
          (p.towerType === null &&
            !p.building &&
            (p.homeSide === 'player' || engine.isPointVisibleTo('player', p.x, p.y, playerVision))))
    );
    if (clickedPad) {
      if (clickedPad.team === 'player' && (clickedPad.building || clickedPad.upgrading)) {
        checkRemoteDoubleCancel('pad', clickedPad.id);
        return;
      }
      engine.selectedLane = clickedPad.lane;
      engine.squadSelected = false;
      engine.targetMode = 'none';
      pvpClientRef.current?.sendCommand({
        type: 'start_tower',
        padId: clickedPad.id,
        towerType: engine.selectedTowerType,
        upgradeMode: engine.towerUpgradeMode,
      });
      tacticalAudio.playBuildStart();
      engine.emitSnapshot();
      return;
    }

    if (engine.targetMode === 'build_tower') {
      engine.targetMode = 'none';
    }

    const lane = closestLaneToPoint(world.x, world.y, engine.getActiveLanes());
    if (lane !== engine.selectedLane || engine.squadSelected) {
      engine.selectedLane = lane;
      engine.squadSelected = false;
      pvpClientRef.current?.sendCommand({ type: 'select_lane', lane });
      tacticalAudio.playLaneSelect(lane);
      engine.emitSnapshot();
    }
  }, []);

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic capture failures
    }

    pointersRef.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      pointerType: e.pointerType,
      moved: false,
    });

    if (pointersRef.current.size === 2) {
      const [p1, p2] = Array.from(pointersRef.current.values());
      pinchRef.current = {
        active: true,
        lastDist: Math.max(10, Math.hypot(p2.x - p1.x, p2.y - p1.y)),
        lastMidX: (p1.x + p2.x) * 0.5,
        lastMidY: (p1.y + p2.y) * 0.5,
      };
      suppressNextTapRef.current = true;
    } else if (pointersRef.current.size === 1) {
      suppressNextTapRef.current = false;
    }
  }, []);

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const renderer = rendererRef.current;
      const engine = engineRef.current;
      if (!canvas || !renderer || !engine) return;
      const rect = canvas.getBoundingClientRect();

      const tracked = pointersRef.current.get(e.pointerId);
      if (tracked) {
        const prevX = tracked.x;
        const prevY = tracked.y;
        tracked.x = e.clientX;
        tracked.y = e.clientY;

        if (pointersRef.current.size >= 2 && pinchRef.current.active) {
          const [p1, p2] = Array.from(pointersRef.current.values());
          const dist = Math.max(10, Math.hypot(p2.x - p1.x, p2.y - p1.y));
          const midX = (p1.x + p2.x) * 0.5;
          const midY = (p1.y + p2.y) * 0.5;
          const scaleFactor = dist / Math.max(10, pinchRef.current.lastDist);
          const nextZoom = renderer.setCameraZoom(
            renderer.getCameraZoom() * scaleFactor,
            rect.width,
            rect.height,
            midX - rect.left,
            midY - rect.top
          );
          renderer.panByScreenDelta(midX - pinchRef.current.lastMidX, midY - pinchRef.current.lastMidY, rect.width, rect.height);
          pinchRef.current.lastDist = dist;
          pinchRef.current.lastMidX = midX;
          pinchRef.current.lastMidY = midY;
          syncCameraZoomState(nextZoom);
          setHoveredEntity((prev) => (prev ? null : prev));
          return;
        }

        const dragThreshold = tracked.pointerType === 'touch' ? 10 : 6;
        if (!tracked.moved && Math.hypot(e.clientX - tracked.startX, e.clientY - tracked.startY) > dragThreshold) {
          tracked.moved = true;
        }
        if (tracked.moved && renderer.getCameraZoom() > 1.02) {
          renderer.panByScreenDelta(e.clientX - prevX, e.clientY - prevY, rect.width, rect.height);
          setHoveredEntity((prev) => (prev ? null : prev));
          return;
        }
      }

      if (e.pointerType !== 'touch') {
        const world = renderer.clientToWorld(e.clientX, e.clientY, rect);
        engine.handleCanvasHover(world ? world.x : null, world ? world.y : null);
        if (pointersRef.current.size === 0 && engine.screen !== 'TITLE') {
          const hit = world ? findHoveredEntity(engine, world.x, world.y) : null;
          setHoveredEntity((prev) => {
            if (!hit) return prev ? null : prev;
            return { ref: hit, x: e.clientX, y: e.clientY };
          });
        } else {
          setHoveredEntity((prev) => (prev ? null : prev));
        }
      }
    },
    [syncCameraZoomState]
  );

  const handleCanvasPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const tracked = pointersRef.current.get(e.pointerId);
      pointersRef.current.delete(e.pointerId);

      if (pointersRef.current.size < 2) {
        pinchRef.current.active = false;
      }

      if (tracked && !tracked.moved && !suppressNextTapRef.current && (e.pointerType !== 'mouse' || e.button === 0)) {
        dispatchCanvasTap(e.clientX, e.clientY, e.pointerType === 'touch');
      }

      if (pointersRef.current.size === 0) {
        suppressNextTapRef.current = false;
      }
    },
    [dispatchCanvasTap]
  );

  const handleCanvasPointerCancel = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) {
      pinchRef.current.active = false;
    }
    if (pointersRef.current.size === 0) {
      suppressNextTapRef.current = false;
    }
    setHoveredEntity((prev) => (prev ? null : prev));
  }, []);

  const handleCanvasPointerLeave = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== 'touch') {
      engineRef.current?.handleCanvasHover(null, null);
      setHoveredEntity((prev) => (prev ? null : prev));
    }
  }, []);

  const handleCanvasWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const renderer = rendererRef.current;
      if (!canvas || !renderer) return;
      const rect = canvas.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      const nextZoom = renderer.setCameraZoom(
        renderer.getCameraZoom() * factor,
        rect.width,
        rect.height,
        e.clientX - rect.left,
        e.clientY - rect.top
      );
      syncCameraZoomState(nextZoom);
    },
    [syncCameraZoomState]
  );

  const handleCanvasContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.isRemoteClient) {
      if (engine.targetMode !== 'none') {
        engine.pendingAmbushUnitIds = [];
        engine.targetMode = 'none';
        tacticalAudio.playClick();
        engine.emitSnapshot();
      }
      return;
    }
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer) return;
    const rect = canvas.getBoundingClientRect();
    const world = renderer.clientToWorld(e.clientX, e.clientY, rect);
    engine.handleCanvasClick(world ? world.x : 0, world ? world.y : 0, true);
  }, []);

  const pvpHudInfo: PvpHudInfo | null = useMemo(() => {
    if (!pvpRoom || !engineRef.current?.isRemoteClient) return null;
    const isSpectator = pvpRoom.yourRole === 'spectator';
    const opp = !isSpectator && pvpRoom.yourSeat ? pvpRoom.players.find((p) => p.seat !== pvpRoom.yourSeat) : null;
    const oppSeat: PvpSeat = pvpRoom.yourSeat === 'player' ? 'enemy' : 'player';
    const bothAi = pvpRoom.players.length === 2 && pvpRoom.players.every((p) => p.isAi);
    return {
      roomCode: pvpRoom.code,
      connected: pvpConnected,
      countdownSeconds: pvpCountdown ?? pvpRoom.countdownSeconds ?? null,
      opponentName: opp?.name ?? '對手',
      opponentConnected: Boolean(opp?.connected),
      rematchVoted: Boolean(pvpRoom.yourSeat && pvpRoom.rematchVotes.includes(pvpRoom.yourSeat)),
      opponentRematchVoted: pvpRoom.rematchVotes.includes(oppSeat),
      menuOpen: pvpMenuOpen,
      noticeText: pvpNotice,
      isSpectator,
      isHost: pvpRoom.isHost,
      spectatorCount: pvpRoom.spectators.length,
      spectatorView,
      spectatorTeams,
      bothAi,
      opponentIsAi: Boolean(opp?.isAi),
      chatMessages,
      chatOpen: inGameChatOpen,
      onChatOpenChange: setInGameChatOpen,
      onSendChat: handleSendChat,
    };
  }, [
    pvpRoom,
    pvpConnected,
    pvpCountdown,
    pvpMenuOpen,
    pvpNotice,
    spectatorView,
    spectatorTeams,
    chatMessages,
    inGameChatOpen,
    handleSendChat,
    snapshot.screen,
  ]);

  const handleAddFriend = useCallback(
    (rawCode: string, nickname?: string): string | null => {
      const code = normalizeFriendCode(rawCode);
      if (code.length !== 6) return '好友碼需為 6 位英數字。';
      if (code === myFriendCode) return '不能加入自己的好友碼。';
      if (friends.some((f) => f.friendCode === code)) return '此戰友已在好友欄中。';
      const liveName = friendStatuses[code]?.name;
      const resolvedName = (nickname?.trim() || liveName || `戰友#${code.slice(0, 3)}`).slice(0, 14);
      setFriends((prev) => [{ friendCode: code, name: resolvedName, addedAt: Date.now() }, ...prev].slice(0, 50));
      setFriendFeedback(`已將 ${resolvedName} (#${code}) 加入好友欄！`);
      if (friendFeedbackTimerRef.current) clearTimeout(friendFeedbackTimerRef.current);
      friendFeedbackTimerRef.current = setTimeout(() => setFriendFeedback(null), 4000);
      return null;
    },
    [myFriendCode, friends, friendStatuses]
  );

  const handleRemoveFriend = useCallback((friendCode: string) => {
    setFriends((prev) => prev.filter((f) => f.friendCode !== friendCode));
  }, []);

  const handleInviteFriend = useCallback(
    (targetFriendCode: string) => {
      if (pvpRoom) {
        pvpClientRef.current?.send({
          type: 'friend:invite',
          targetFriendCode,
          roomCode: pvpRoom.code,
        });
      } else {
        pendingInviteTargetRef.current = targetFriendCode;
        setPvpError(null);
        pvpClientRef.current?.send({
          type: 'room:create',
          name: playerName,
          faction: selectedFaction,
          mapMode,
        });
      }
    },
    [pvpRoom, playerName, selectedFaction, mapMode]
  );

  const handleJoinFriendRoom = useCallback(
    (roomCode: string, asSpectator: boolean) => {
      setPvpError(null);
      pvpClientRef.current?.send({
        type: 'room:join',
        code: roomCode,
        name: playerName,
        faction: selectedFaction,
        asSpectator,
      });
    },
    [playerName, selectedFaction]
  );

  const handleAcceptInvite = useCallback(
    (invite: FriendInviteEvent) => {
      setIncomingInvites((prev) => prev.filter((i) => i.id !== invite.id));
      setFriendsDrawerOpen(false);
      handleJoinFriendRoom(invite.roomCode, false);
    },
    [handleJoinFriendRoom]
  );

  const handleDismissInvite = useCallback((inviteId: string) => {
    setIncomingInvites((prev) => prev.filter((i) => i.id !== inviteId));
  }, []);

  const onlineFriendsCount = useMemo(
    () => friends.filter((f) => friendStatuses[f.friendCode]?.online).length,
    [friends, friendStatuses]
  );

  const activeTacticCoachStep = useMemo(() => {
    if (!tacticGuideEnabled || snapshot.screen !== 'PLAYING' || snapshot.tutorialMode || pvpHudInfo?.isSpectator) {
      return null;
    }
    return evaluateTacticCoach(selectedTacticGuide, snapshot, tacticCoachMinStep);
  }, [tacticGuideEnabled, snapshot, pvpHudInfo?.isSpectator, selectedTacticGuide, tacticCoachMinStep]);

  const hoveredInspectData = useMemo(() => {
    if (!hoveredEntity || !engineRef.current || snapshot.screen === 'TITLE') {
      return null;
    }
    return buildHoverInspectData(engineRef.current, hoveredEntity.ref);
  }, [hoveredEntity, snapshot]);

  const cursorClass =
    pvpHudInfo?.isSpectator
      ? 'cursor-default'
      : snapshot.targetMode === 'scan' ||
        snapshot.targetMode === 'faction_skill' ||
        snapshot.targetMode === 'k_boost' ||
        snapshot.targetMode === 'ambush_select' ||
        snapshot.targetMode === 'ambush_target'
      ? 'cursor-crosshair'
      : 'cursor-pointer';

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-[#090C11]">
      {snapshot.screen === 'TITLE' && (
        <TitleScreen
          selectedFaction={selectedFaction}
          sandboxRightFaction={sandboxRightFaction}
          enemyFaction={enemyFaction}
          enemyArchetype={enemyArchetype}
          difficulty={difficulty}
          mapMode={mapMode}
          onSelectFaction={handleSelectFaction}
          onSelectSandboxRightFaction={setSandboxRightFaction}
          onSelectEnemyFaction={setEnemyFaction}
          onSelectEnemyArchetype={handleSelectEnemyArchetype}
          onSelectDifficulty={setDifficulty}
          onSelectMapMode={setMapMode}
          onStart={() => {
            setTacticCoachMinStep(0);
            setTacticCoachCollapsed(false);
            handleStartMatch();
          }}
          onStartSandbox={() => {
            setTacticCoachMinStep(0);
            setTacticCoachCollapsed(false);
            handleStartSandbox();
          }}
          onStartTutorial={handleStartTutorial}
          onOpenFactionGuide={handleOpenFactionGuide}
          tacticGuideEnabled={tacticGuideEnabled}
          selectedTacticGuide={selectedTacticGuide}
          onToggleTacticGuide={(enabled) => {
            setTacticGuideEnabled(enabled);
            if (enabled) setTacticCoachCollapsed(false);
          }}
          onSelectTacticGuide={(tactic) => {
            setSelectedTacticGuide(tactic);
            setTacticCoachMinStep(0);
          }}
          myFriendCode={myFriendCode}
          friends={friends}
          onlineFriendsCount={onlineFriendsCount}
          incomingInviteCount={incomingInvites.length}
          onOpenFriends={() => setFriendsDrawerOpen(true)}
          onAddFriend={handleAddFriend}
          pvpConnected={pvpConnected}
          pvpOnlineCount={pvpOnlineCount}
          pvpRoom={pvpRoom}
          pvpCountdown={pvpCountdown ?? pvpRoom?.countdownSeconds ?? null}
          pvpNotice={pvpNotice}
          pvpQueueWaiting={pvpQueueWaiting}
          pvpError={pvpError}
          chatMessages={chatMessages}
          playerName={playerName}
          onChangePlayerName={setPlayerName}
          onCreateRoom={() => {
            setPvpError(null);
            pvpClientRef.current?.send({
              type: 'room:create',
              name: playerName,
              faction: selectedFaction,
              mapMode,
            });
          }}
          onConfigRoomMapMode={(nextMode) => {
            setPvpError(null);
            pvpClientRef.current?.send({ type: 'room:config_map', mapMode: nextMode });
          }}
          onJoinRoom={(code) => {
            setPvpError(null);
            pvpClientRef.current?.send({
              type: 'room:join',
              code,
              name: playerName,
              faction: selectedFaction,
              asSpectator: false,
            });
          }}
          onJoinSpectate={(code) => {
            setPvpError(null);
            pvpClientRef.current?.send({
              type: 'room:join',
              code,
              name: playerName,
              faction: selectedFaction,
              asSpectator: true,
            });
          }}
          onQuickMatch={() => {
            setPvpError(null);
            pvpClientRef.current?.send({ type: 'room:quickmatch', name: playerName, faction: selectedFaction });
          }}
          onCancelQueue={() => {
            pvpClientRef.current?.send({ type: 'room:cancel_queue' });
          }}
          onToggleReady={(ready) => {
            tacticalAudio.playClick();
            pvpClientRef.current?.send({ type: 'room:ready', ready });
          }}
          onStartCustomMatch={() => {
            setPvpError(null);
            pvpClientRef.current?.send({ type: 'room:start_match' });
          }}
          onAddAi={(seat, faction, diff, aiArchetype) => {
            setPvpError(null);
            pvpClientRef.current?.send({ type: 'room:add_ai', seat, faction, difficulty: diff, aiArchetype });
          }}
          onRemoveAi={(seat) => {
            setPvpError(null);
            pvpClientRef.current?.send({ type: 'room:remove_ai', seat });
          }}
          onConfigAi={(seat, patch) => {
            setPvpError(null);
            pvpClientRef.current?.send({ type: 'room:config_ai', seat, ...patch });
          }}
          onSwitchRole={(target) => {
            setPvpError(null);
            pvpClientRef.current?.send({ type: 'room:switch_role', target });
          }}
          onSendChat={handleSendChat}
          onLeaveRoom={() => {
            pvpClientRef.current?.send({ type: 'room:leave' });
            setPvpRoom(null);
            setPvpCountdown(null);
            setChatMessages([]);
            setInGameChatOpen(false);
          }}
        />
      )}

      {/* Isolated Canvas Container mounted between top bar and bottom dock (mobile safe-area aware) */}
      <div
        ref={containerRef}
        className={`absolute inset-x-0 top-[calc(44px+env(safe-area-inset-top))] lg:top-12 bottom-[calc(162px+env(safe-area-inset-bottom))] lg:bottom-[126px] ${
          snapshot.screen === 'TITLE' ? 'hidden' : 'block'
        }`}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerCancel={handleCanvasPointerCancel}
          onPointerLeave={handleCanvasPointerLeave}
          onWheel={handleCanvasWheel}
          onContextMenu={handleCanvasContextMenu}
          className={`w-full h-full block touch-none ${cursorClass}`}
        />
      </div>

      {snapshot.screen !== 'TITLE' && (
        <BattleHUD
          snap={snapshot}
          muted={muted}
          cameraZoom={cameraZoom}
          pvpInfo={pvpHudInfo}
          onToggleMute={handleToggleMute}
          onTogglePause={actTogglePause}
          onToggleSpeed={() => engineRef.current?.toggleSpeed()}
          onToggleQuickZoom={handleToggleQuickZoom}
          onResetCamera={handleResetCamera}
          onSelectLane={actSelectLane}
          onSelectSquad={actSelectSquad}
          onDisbandSquad={actDisbandSquad}
          onRepairNexus={actRepairNexus}
          onSetStance={actSetStance}
          onTrainUnit={actTrainUnit}
          onSelectTowerType={actSelectTowerType}
          onSetTowerUpgradeMode={actSetTowerUpgradeMode}
          onQuickBuildTower={actQuickBuildTower}
          onBuildDepot={actBuildDepot}
          onBuildBarracks={actBuildBarracks}
          onBuildArmory={actBuildArmory}
          onBuildExtractor={actBuildExtractor}
          onUpgradeEcon={actUpgradeEcon}
          onUpgradeTech={actUpgradeTech}
          onUpgradeArmoryTrack={actUpgradeArmory}
          onResearchSpecialTech={actResearchSpecial}
          onTriggerKAction={actTriggerKAction}
          onSwitchSandboxTeam={actSwitchSandboxTeam}
          onSandboxToggleInstant={actSandboxToggleInstant}
          onSandboxMaxOut={actSandboxMaxOut}
          onSandboxClearUnits={actSandboxClearUnits}
          onToggleAmbush={actPressAmbushKey}
          onToggleScan={() => actSetTargetMode('scan')}
          onToggleFactionSkill={() => actSetTargetMode('faction_skill')}
          onCancelTargetMode={() => actSetTargetMode('none')}
          onChangeSpectatorView={handleChangeSpectatorView}
          onRestart={handleRestartOrRematch}
          onSurrender={!pvpHudInfo?.isSpectator && !snapshot.sandboxMode ? handleSurrender : undefined}
          onReturnTitle={handleReturnTitle}
          tutorialHighlight={
            snapshot.tutorialMode && snapshot.screen === 'PLAYING'
              ? activeTutorialStep?.highlight ?? null
              : activeTacticCoachStep?.highlight ?? null
          }
          tutorialMobileTab={
            snapshot.tutorialMode && snapshot.screen === 'PLAYING' && activeTutorialStep
              ? activeTutorialStep.id === 'armory_upgrade' && snapshot.playerArmories.some((a) => a.built)
                ? ('tech' as TutorialMobileTab)
                : activeTutorialStep.mobileTab
              : null
          }
          onStartSoloAfterTutorial={handleStartMatch}
          onOpenFactionGuide={handleOpenFactionGuide}
          tacticGuideEnabled={tacticGuideEnabled}
          onToggleTacticGuide={() => {
            setTacticGuideEnabled((prev) => !prev);
            setTacticCoachCollapsed(false);
          }}
        />
      )}

      {hoveredInspectData && hoveredEntity && (
        <BattleHoverTooltip data={hoveredInspectData} x={hoveredEntity.x} y={hoveredEntity.y} />
      )}

      {snapshot.tutorialMode && snapshot.screen === 'PLAYING' && activeTutorialStep && activeTutorialEval && (
        <TutorialCoachOverlay
          step={activeTutorialStep}
          checks={activeTutorialEval.checks}
          collapsed={tutorialCollapsed}
          rewardToast={tutorialRewardToast}
          onToggleCollapse={handleToggleTutorialCollapse}
          onSkipStep={handleSkipTutorialStep}
          onExitGuide={handleExitTutorialGuide}
        />
      )}

      {activeTacticCoachStep && (
        <TacticCoachOverlay
          tactic={selectedTacticGuide}
          step={activeTacticCoachStep}
          collapsed={tacticCoachCollapsed}
          onChangeTactic={(next) => {
            setSelectedTacticGuide(next);
            setTacticCoachMinStep(0);
          }}
          onToggleCollapse={() => setTacticCoachCollapsed((prev) => !prev)}
          onSkipStep={() => setTacticCoachMinStep((prev) => Math.min(4, Math.max(prev + 1, activeTacticCoachStep.stepNumber)))}
          onDisableGuide={() => setTacticGuideEnabled(false)}
        />
      )}

      {/* Floating Incoming Friend Room Invite Toast (when Friends Drawer is closed) */}
      {!friendsDrawerOpen && incomingInvites.length > 0 && snapshot.screen === 'TITLE' && (
        <div className="fixed top-4 right-4 z-40 w-[300px] rounded-lg bg-[#0D1A18]/95 border border-emerald-400/75 shadow-2xl p-3 space-y-2 text-slate-100">
          <div className="text-xs font-bold text-emerald-300">收到好友對戰邀請！</div>
          <div className="text-xs text-slate-200 leading-snug">
            <span className="font-bold text-white">{incomingInvites[0].fromName}</span> 邀請你加入房間{' '}
            <span className="font-mono-num font-bold text-sky-300">{incomingInvites[0].roomCode}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAcceptInvite(incomingInvites[0])}
              className="flex-1 py-1.5 rounded bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold cursor-pointer"
            >
              立即加入
            </button>
            <button
              type="button"
              onClick={() => handleDismissInvite(incomingInvites[0].id)}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
            >
              忽略
            </button>
          </div>
        </div>
      )}

      <FriendsDrawer
        open={friendsDrawerOpen}
        onClose={() => setFriendsDrawerOpen(false)}
        myFriendCode={myFriendCode}
        playerName={playerName}
        onChangePlayerName={setPlayerName}
        pvpConnected={pvpConnected}
        pvpRoom={pvpRoom}
        friends={friends}
        friendStatuses={friendStatuses}
        incomingInvites={incomingInvites}
        feedbackText={friendFeedback}
        onAddFriend={handleAddFriend}
        onRemoveFriend={handleRemoveFriend}
        onInviteFriend={handleInviteFriend}
        onJoinFriendRoom={handleJoinFriendRoom}
        onAcceptInvite={handleAcceptInvite}
        onDismissInvite={handleDismissInvite}
      />

      <AdvancedFactionGuideModal
        open={factionGuideOpen}
        initialFaction={factionGuideFaction}
        onClose={() => setFactionGuideOpen(false)}
        onLaunchSandbox={pvpRoom ? undefined : handleLaunchSandboxFromGuide}
      />
    </div>
  );
}
