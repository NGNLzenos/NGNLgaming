import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Bot,
  Compass,
  Crosshair,
  Eye,
  MessageSquare,
  Pause,
  Play,
  Radio,
  Volume2,
  VolumeX,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  AI_ARCHETYPE_LABELS,
  ARMORY_BUILDING_DEFS,
  ARMORY_TIER_REQ,
  BARRACKS_DEFS,
  BARRACKS_TIERS,
  ECON_MAX_LEVEL,
  ECON_REQUIRED_TOWERS,
  ECON_TOWER_MINING_MULT_BY_LV,
  FACTIONS,
  GAS_EXTRACTOR_LEVELS,
  getBarracksNextUpgrade,
  getEconUpgradeCost,
  getRequiredArmoryBuilding,
  getTowerLevelStats,
  getTowerUpgradeCostAndTime,
  IRON_K_BOOST_COOLDOWN,
  IRON_K_BOOST_RADIUS,
  IRON_K_LV2_BIO_MAX_HP_BONUS,
  isArmoryLevelUnlocked,
  JUNGLE_AMBUSH_COOLDOWN,
  JUNGLE_AMBUSH_COST,
  LANE_SHORT_NAMES,
  MAX_SUPPLY_LIMIT,
  NEXUS_REPAIR_COST,
  NEXUS_REPAIR_TIME,
  SCAN_INITIAL_COOLDOWN,
  SQUAD_SELECT_RADIUS,
  SUPPLY_DEPOT_BONUS,
  SUPPLY_DEPOT_BUILD_TIME,
  SUPPLY_DEPOT_COST,
  TECH_TOWER_CD_RATE_BY_LV,
  TECH_TOWER_RES_RATE_BY_LV,
  TECH_UPGRADE_COSTS,
  TECH_UPGRADE_GAS_COSTS,
  TOWER_DEFS,
  TOWER_MINING_UPGRADE_BONUS,
  TOWER_TECH_CD_RATE_BY_LV,
  TOWER_TECH_LV2_BONUS_DMG,
  TOWER_TECH_TIER_DMG_BONUS,
  TOWER_TECH_TIER_HP_PERMILLE,
} from '../game/data';
import { ATTRIBUTE_TAG_BADGE_COLORS, ATTRIBUTE_TAG_LABELS } from '../game/combatMath';
import { RoomChatMessage, SpectatorTeamSummary, SpectatorViewMode } from '../game/pvpTypes';
import {
  ArmoryBuildingKind,
  ArmoryTrackId,
  AttributeTag,
  BarracksTier,
  FactionId,
  GameSnapshot,
  LaneId,
  LaneStance,
  TowerType,
  TowerUpgradeMode,
  UnitDef,
} from '../game/types';
import { TutorialHighlightId, TutorialMobileTab } from '../game/tutorial';
import { InGameChatOverlay } from './InGameChatOverlay';

type MobileDockTab = TutorialMobileTab;

export interface PvpHudInfo {
  roomCode: string;
  connected?: boolean;
  countdownSeconds?: number | null;
  opponentName: string;
  opponentConnected: boolean;
  rematchVoted: boolean;
  opponentRematchVoted: boolean;
  menuOpen: boolean;
  noticeText: string | null;
  isSpectator: boolean;
  isHost: boolean;
  spectatorCount: number;
  spectatorView: SpectatorViewMode;
  spectatorTeams: [SpectatorTeamSummary, SpectatorTeamSummary] | null;
  bothAi: boolean;
  opponentIsAi: boolean;
  chatMessages: RoomChatMessage[];
  chatOpen: boolean;
  onChatOpenChange: (open: boolean) => void;
  onSendChat: (text: string) => void;
}

interface BattleHUDProps {
  snap: GameSnapshot;
  muted: boolean;
  cameraZoom?: number;
  pvpInfo?: PvpHudInfo | null;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onToggleSpeed: () => void;
  onToggleQuickZoom?: () => void;
  onResetCamera?: () => void;
  onSelectLane: (lane: LaneId) => void;
  onSelectSquad: () => void;
  onDisbandSquad: () => void;
  onRepairNexus: () => void;
  onSetStance: (lane: LaneId, stance: LaneStance) => void;
  onTrainUnit: (index: number) => void;
  onSelectTowerType: (type: TowerType) => void;
  onSetTowerUpgradeMode: (mode: TowerUpgradeMode) => void;
  onQuickBuildTower: () => void;
  onBuildDepot: () => void;
  onBuildBarracks: (tier: BarracksTier) => void;
  onBuildArmory: (kind: ArmoryBuildingKind) => void;
  onBuildExtractor: () => void;
  onUpgradeEcon: () => void;
  onUpgradeTech: () => void;
  onUpgradeArmoryTrack: (track: ArmoryTrackId) => void;
  onResearchSpecialTech: (slot: 0 | 1) => void;
  onTriggerKAction?: () => void;
  onSwitchSandboxTeam?: (team: 'player' | 'enemy') => void;
  onSandboxToggleInstant?: () => void;
  onSandboxMaxOut?: (target: 'player' | 'enemy' | 'both') => void;
  onSandboxClearUnits?: () => void;
  onToggleAmbush: () => void;
  onToggleScan: () => void;
  onToggleFactionSkill: () => void;
  onCancelTargetMode: () => void;
  onChangeSpectatorView?: (view: SpectatorViewMode) => void;
  onRestart: () => void;
  onSurrender?: () => void;
  onReturnTitle: () => void;
  tutorialHighlight?: TutorialHighlightId | null;
  tutorialMobileTab?: TutorialMobileTab | null;
  onStartSoloAfterTutorial?: () => void;
  onOpenFactionGuide?: (factionId?: FactionId) => void;
  tacticGuideEnabled?: boolean;
  onToggleTacticGuide?: () => void;
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function getArmorDomainTag(u: UnitDef): { text: string; className: string } {
  if (u.armorClass === 'siege') {
    return { text: '攻城', className: 'text-orange-300 font-bold' };
  }
  const armorStr = u.armorClass === 'heavy' ? '重' : '輕';
  const domainStr = u.domain === 'air' ? '空' : '陸';
  if (u.domain === 'air') {
    return {
      text: `${armorStr}·${domainStr}`,
      className: u.armorClass === 'heavy' ? 'text-cyan-200 font-bold' : 'text-sky-300 font-semibold',
    };
  }
  return {
    text: `${armorStr}·${domainStr}`,
    className: u.armorClass === 'heavy' ? 'text-amber-300 font-bold' : 'text-slate-300 font-medium',
  };
}

export const BattleHUD: React.FC<BattleHUDProps> = ({
  snap,
  muted,
  cameraZoom = 1,
  pvpInfo,
  onToggleMute,
  onTogglePause,
  onToggleSpeed,
  onToggleQuickZoom,
  onResetCamera,
  onSelectLane,
  onSelectSquad,
  onDisbandSquad,
  onRepairNexus,
  onSetStance,
  onTrainUnit,
  onSelectTowerType,
  onSetTowerUpgradeMode,
  onQuickBuildTower,
  onBuildDepot,
  onBuildBarracks,
  onBuildArmory,
  onBuildExtractor,
  onUpgradeEcon,
  onUpgradeTech,
  onUpgradeArmoryTrack,
  onResearchSpecialTech,
  onTriggerKAction,
  onSwitchSandboxTeam,
  onSandboxToggleInstant,
  onSandboxMaxOut,
  onSandboxClearUnits,
  onToggleAmbush,
  onToggleScan,
  onToggleFactionSkill,
  onCancelTargetMode,
  onChangeSpectatorView,
  onRestart,
  onSurrender,
  onReturnTitle,
  tutorialHighlight = null,
  tutorialMobileTab = null,
  onStartSoloAfterTutorial,
  onOpenFactionGuide,
  tacticGuideEnabled = false,
  onToggleTacticGuide,
}) => {
  const [hoveredDockHint, setHoveredDockHint] = useState<
    | TowerType
    | 'quick_t'
    | 'upgrade_mode'
    | 'econ'
    | 'retreat'
    | 'ambush'
    | 'bio_lab'
    | 'mech_bay'
    | 'gas_extractor'
    | { kind: 'unit'; index: number }
    | { kind: 'barracks'; tier: BarracksTier }
    | null
  >(null);
  const [mobileTab, setMobileTab] = useState<MobileDockTab>('units');
  const isZoomed = cameraZoom > 1.05;

  useEffect(() => {
    if (tutorialMobileTab) {
      setMobileTab(tutorialMobileTab);
    }
  }, [tutorialMobileTab]);

  const hl = (active: boolean) =>
    active
      ? 'ring-2 ring-amber-300 ring-offset-1 ring-offset-[#10161F] shadow-[0_0_14px_rgba(251,191,36,0.45)] relative z-10'
      : '';

  const faction = FACTIONS[snap.player.faction];
  const goldInt = Math.floor(snap.player.gold);
  const gasInt = Math.floor(snap.player.gas ?? 0);
  const activeResearches = snap.player.activeResearches;
  const hasResearchKind = (kind: string) => activeResearches.some((r) => r.kind === kind);

  const econInfo = getEconUpgradeCost(snap.player.econLevel, snap.playerStandingTowers);
  const econCost = econInfo ? econInfo.cost : null;
  const econReqTowers = snap.player.econLevel < ECON_MAX_LEVEL ? (ECON_REQUIRED_TOWERS[snap.player.econLevel] ?? 0) : 0;
  const econTowerLocked = econCost !== null && snap.playerStandingTowers < econReqTowers;
  const econRunning = hasResearchKind('econ');
  const selectedTowerDef = TOWER_DEFS[snap.selectedTowerType];
  const isIronbound = faction.id === 'ironbound';
  const canUseTowerTech = (snap.player.specialTechLevels?.[1] ?? 0) >= 1;
  const nexusRepairing = hasResearchKind('nexus_repair');
  const canRepairNexus = snap.player.nexusPlatingBroken && !nexusRepairing && goldInt >= NEXUS_REPAIR_COST;

  const cycleTowerUpgradeMode = () => {
    const order: TowerUpgradeMode[] = ['combat', 'mining', 'tech'];
    const curIdx = order.indexOf(snap.towerUpgradeMode);
    const next = order[(curIdx + 1) % order.length];
    onSetTowerUpgradeMode(next);
  };

  const techCost = snap.player.techTier < 3 ? TECH_UPGRADE_COSTS[snap.player.techTier as 1 | 2] : null;
  const techGasCost = snap.player.techTier < 3 ? TECH_UPGRADE_GAS_COSTS[snap.player.techTier as 1 | 2] : 0;
  const techRunning = hasResearchKind('tech_tier');

  const depotsTotal = snap.playerDepotsBuilt + snap.playerDepotsBuilding;
  const depotCapReached = depotsTotal >= snap.playerMaxDepotsAllowed;
  const canBuildDepot = !depotCapReached && goldInt >= SUPPLY_DEPOT_COST;
  const isAmbushTargeting = snap.targetMode === 'ambush_select' || snap.targetMode === 'ambush_target';
  const canAmbush = snap.player.squadActive || (snap.player.ambushCooldown <= 0 && goldInt >= JUNGLE_AMBUSH_COST);

  const activeStance =
    snap.squadSelected && snap.player.squadActive
      ? snap.player.squadStance
      : snap.player.laneStances[snap.selectedLane];
  const latestIntel = snap.intelReports[0];
  const activeTrainings = snap.player.trainingQueue;
  const nexusGold = Math.ceil(snap.player.nexusGoldReserve);

  const trackMetaMap: Record<ArmoryTrackId, { kind: string; accent: string }> = {
    trackA: { kind: 'armory_A', accent: 'hover:border-amber-400 text-amber-200' },
    trackD: { kind: 'armory_D', accent: 'hover:border-yellow-400 text-yellow-200' },
    trackB: { kind: 'armory_B', accent: 'hover:border-sky-400 text-sky-200' },
    trackE: { kind: 'armory_E', accent: 'hover:border-cyan-400 text-cyan-200' },
    trackC: { kind: 'armory_C', accent: 'hover:border-emerald-400 text-emerald-200' },
    trackF: { kind: 'armory_F', accent: 'hover:border-teal-400 text-teal-200' },
  };

  const armoryTrackList = faction.armoryTrackOrder
    .map((id) => {
      const def = faction.armoryTracks[id];
      if (!def) return null;
      return { id, def, ...trackMetaMap[id] };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const t1BarracksBuilt = snap.playerBarracks?.find((b) => b.tier === 1 && b.built);
  const t1BarracksLevel = t1BarracksBuilt ? t1BarracksBuilt.level : 0;

  const getArmoryLockMeta = (trackId: ArmoryTrackId, curLv: number) => {
    const maxed = curLv >= 3;
    const targetLv = (curLv + 1) as 1 | 2 | 3;
    const reqTier = maxed ? 3 : ARMORY_TIER_REQ[curLv];
    const unlockRes = maxed
      ? { unlocked: true, requirementText: '' }
      : isArmoryLevelUnlocked(faction.id, trackId, targetLv, snap.player.techTier, t1BarracksLevel);
    const reqBuilding = getRequiredArmoryBuilding(faction.id, trackId);
    const reqBuildingDef = ARMORY_BUILDING_DEFS[reqBuilding];
    const buildingBuilt = snap.playerArmories?.some((a) => a.kind === reqBuilding && a.built) ?? false;
    const buildingLocked = !maxed && !buildingBuilt;
    const tierOnlyLocked = !maxed && !unlockRes.unlocked;
    const locked = buildingLocked || tierOnlyLocked;
    const isGroundOrCore =
      trackId === 'trackA' || trackId === 'trackD' || trackId === 'trackB' || trackId === 'trackE';
    const shortLock = buildingLocked
      ? `需${reqBuildingDef.shortName}`
      : isGroundOrCore && targetLv === 2
      ? 'T2/營2'
      : isGroundOrCore && targetLv === 3
      ? 'T3/營3'
      : `T${reqTier}`;
    const longLock = buildingLocked
      ? `需先建造前置建築【${reqBuildingDef.name}】[${reqBuildingDef.hotkey}]`
      : isGroundOrCore && targetLv === 2
      ? '需科技 T2 或 T1兵營 Lv.2'
      : isGroundOrCore && targetLv === 3
      ? '需科技 T3 或（T2 且 T1兵營 Lv.3）'
      : `需先晉升科技 T${reqTier}`;
    return { maxed, unlocked: !locked, buildingLocked, tierLocked: locked, reqTier, shortLock, longLock };
  };

  const getUnitControlMeta = (idx: number) => {
    const u = faction.units[idx];
    const techLocked = snap.player.techTier < u.tier;
    const reqBkTier = u.requiresBarracksTier ?? null;
    const reqBkLevel = u.requiresBarracksLevel ?? 1;
    const barracksLocked =
      reqBkTier !== null &&
      !(snap.playerBarracks?.some((b) => b.tier === reqBkTier && b.built && b.level >= reqBkLevel) ?? false);
    const locked = techLocked || barracksLocked;
    const unitOrders = activeTrainings
      .filter((q) => q.unitIndex === idx)
      .sort((a, b) => a.remaining - b.remaining);
    const activeCount = unitOrders.length;
    const unitOrder = unitOrders[0] ?? null;
    const trainPct = unitOrder
      ? Math.max(0, Math.min(1, 1 - unitOrder.remaining / Math.max(0.1, unitOrder.total)))
      : 0;
    const matchingBk = snap.playerBarracks?.find(
      (b) => b.built && BARRACKS_DEFS[b.tier].unitIndices.includes(idx)
    );
    const maxSlots = matchingBk ? Math.max(1, Math.min(4, matchingBk.level)) : 1;
    const hasMultiSlots = maxSlots >= 2;
    const slotsFull = activeCount >= maxSlots;
    const overSupply = snap.playerSupplyUsed + u.supplyCost > snap.playerSupplyCap;
    const lackGas = !locked && u.gasCost > 0 && gasInt < u.gasCost;
    const canTrain = !locked && !slotsFull && goldInt >= u.cost && gasInt >= u.gasCost && !overSupply;
    const tag = getArmorDomainTag(u);
    return {
      u,
      techLocked,
      barracksLocked,
      reqBkTier,
      reqBkLevel,
      locked,
      unitOrders,
      activeCount,
      unitOrder,
      onCd: slotsFull,
      trainPct,
      hasBarracks: hasMultiSlots,
      maxBatch: maxSlots,
      overSupply,
      lackGas,
      canTrain,
      tag,
    };
  };

  const bioLabStatus = snap.playerArmories?.find((a) => a.kind === 'bio_lab');
  const mechBayStatus = snap.playerArmories?.find((a) => a.kind === 'mech_bay');
  const extractorCanBuildAny =
    snap.playerExtractorsBuilt < snap.playerExtractorsTotal || snap.playerGasUpgrades < snap.playerExtractorsTotal * 2;
  const extractorMinCost = GAS_EXTRACTOR_LEVELS[1].cost;
  const canClickExtractor = extractorCanBuildAny && goldInt >= extractorMinCost;

  const getSpecialTechUiState = (slot: 0 | 1) => {
    const spec = faction.specialTechs[slot];
    const curLv = snap.player.specialTechLevels?.[slot] ?? (snap.player.specialTechsDone[slot] ? 1 : 0);
    const maxLv = spec.level2 ? 2 : 1;
    const maxed = curLv >= maxLv;
    const running = hasResearchKind(slot === 0 ? 'special_tech_1' : 'special_tech_2');
    const nextStage =
      curLv === 0
        ? {
            name: spec.name,
            shortName: spec.shortName,
            tierReq: spec.tierReq,
            cost: spec.cost,
            gasCost: spec.gasCost ?? 0,
            time: spec.time,
            desc: spec.desc,
          }
        : spec.level2
        ? {
            name: spec.level2.name,
            shortName: spec.level2.shortName,
            tierReq: spec.level2.tierReq,
            cost: spec.level2.cost,
            gasCost: spec.level2.gasCost ?? 0,
            time: spec.level2.time,
            desc: spec.level2.desc,
          }
        : null;
    const tierLocked = !maxed && nextStage !== null && snap.player.techTier < nextStage.tierReq;
    const canClick =
      !maxed &&
      !running &&
      !tierLocked &&
      nextStage !== null &&
      goldInt >= nextStage.cost &&
      gasInt >= nextStage.gasCost;
    return { spec, curLv, maxLv, maxed, running, nextStage, tierLocked, canClick };
  };

  // --- DEDICATED READ-ONLY SPECTATOR BROADCAST HUD ---
  if (pvpInfo?.isSpectator) {
    const leftTeam = pvpInfo.spectatorTeams?.[0] ?? null;
    const rightTeam = pvpInfo.spectatorTeams?.[1] ?? null;
    const leftFaction = leftTeam ? FACTIONS[leftTeam.faction] : faction;
    const rightFaction = rightTeam ? FACTIONS[rightTeam.faction] : FACTIONS[snap.enemyFinalStats.faction];

    const renderTeamDockCard = (team: SpectatorTeamSummary | null, side: 'left' | 'right') => {
      const f = team ? FACTIONS[team.faction] : side === 'left' ? leftFaction : rightFaction;
      const accentText = side === 'left' ? 'text-sky-300' : 'text-rose-300';
      const barColor = side === 'left' ? '#38BDF8' : '#FB7185';
      const sideTitle = side === 'left' ? '藍方' : '紅方';
      const hpRatio = team ? Math.max(0, team.nexusHp / Math.max(1, team.nexusMaxHp)) : 1;

      return (
        <div
          className={`flex flex-col justify-between gap-1 px-2.5 py-1.5 rounded bg-[#0C121B] border ${
            side === 'left' ? 'border-sky-500/35' : 'border-rose-500/35'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`text-[11px] font-bold whitespace-nowrap ${accentText}`}>{sideTitle}</span>
              {team?.isAi && <Bot className="w-3.5 h-3.5 text-amber-300 shrink-0" />}
              <span className="text-xs font-bold text-slate-100 truncate">{team?.name ?? sideTitle}</span>
              <span className="text-[11px] text-slate-400 whitespace-nowrap">· {f.name}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-20 h-2 bg-slate-800 rounded-sm overflow-hidden">
                <div
                  className="h-full origin-left transition-transform duration-150"
                  style={{ transform: `scaleX(${hpRatio})`, backgroundColor: barColor }}
                />
              </div>
              <span className="font-mono-num text-xs font-semibold text-slate-200 whitespace-nowrap">
                {team ? team.nexusHp : 0} HP
              </span>
            </div>
          </div>

          {team && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-0.5 text-[11px] font-mono-num">
                <span>
                  <span className="text-amber-300 font-bold">{team.gold}G</span>
                  <span className="text-emerald-400 ml-0.5">+{team.incomePerSec}</span>
                  <span className="text-slate-600 mx-1">/</span>
                  <span className="text-teal-300 font-bold">{team.gas}氣</span>
                  <span className="text-cyan-400 ml-0.5">+{team.gasIncomePerSec}</span>
                </span>
                <span className="text-slate-200">
                  人口 {team.supplyUsed}/{team.supplyCap}
                </span>
                <span className="text-sky-200">
                  T{team.techTier}·礦{team.econLevel}
                </span>
                <span className="text-slate-300">
                  塔{team.standingTowers}·區{team.controlledSectors}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-0.5 text-[10px] text-slate-400 font-mono-num border-t border-slate-800/90 pt-1">
                <span>
                  軍械：
                  {f.armoryTrackOrder
                    .map((tid) => {
                      const tr = f.armoryTracks[tid];
                      if (!tr) return null;
                      return `${tr.shortName}+${team.armoryLevels[tid] ?? 0}`;
                    })
                    .filter(Boolean)
                    .join(' ')}
                </span>
                <span>
                  專屬：
                  {([0, 1] as const)
                    .map((slot) => {
                      const sp = f.specialTechs[slot];
                      const lv = team.specialTechLevels?.[slot] ?? (team.specialTechsDone[slot] ? 1 : 0);
                      const mark = lv >= 2 ? 'II' : lv === 1 ? 'I' : '—';
                      return `${sp.hotkey}:${mark}`;
                    })
                    .join(' ')}
                </span>
                <span>主堡礦 {team.nexusGoldReserve}G</span>
              </div>
            </>
          )}
        </div>
      );
    };

    const viewOptions: Array<{ id: SpectatorViewMode; label: string; hotkey: string }> = [
      { id: 'all', label: '上帝全圖', hotkey: '1' },
      { id: 'player', label: '藍方迷霧', hotkey: '2' },
      { id: 'enemy', label: '紅方迷霧', hotkey: '3' },
    ];

    return (
      <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between">
        {/* SPECTATOR TOP BAR */}
        <div className="pointer-events-auto bg-[#10161F] border-b border-slate-800 pt-[env(safe-area-inset-top)] lg:pt-0">
          <div className="h-11 lg:h-12 px-2.5 sm:px-4 flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center gap-1.5 text-teal-300 font-semibold text-xs whitespace-nowrap">
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>觀戰</span>
              </div>
              <span className="text-slate-700" aria-hidden="true">·</span>
              <span className="font-mono-num text-xs text-sky-300 font-semibold whitespace-nowrap">
                {pvpInfo.roomCode}
              </span>
              <span className="font-mono-num text-xs text-slate-200 sm:hidden whitespace-nowrap">
                · {formatTime(snap.elapsed)}
              </span>
              <span className="text-slate-700 hidden sm:inline" aria-hidden="true">·</span>
              <span className="font-mono-num text-xs text-slate-400 hidden sm:inline whitespace-nowrap">
                觀戰 {pvpInfo.spectatorCount} 人
              </span>
              {leftTeam && rightTeam && (
                <div className="hidden xl:flex items-center gap-2 ml-2 text-xs font-mono-num">
                  <span className="text-sky-300 font-semibold">{leftTeam.name}</span>
                  <span className="text-slate-500">vs</span>
                  <span className="text-rose-300 font-semibold">{rightTeam.name}</span>
                </div>
              )}
            </div>

            <div className="hidden md:flex items-center gap-2.5 min-w-0">
              {snap.mapMode === 'simple' && (
                <>
                  <span className="text-xs font-semibold text-teal-300 whitespace-nowrap">雙線簡易</span>
                  <span className="text-slate-700" aria-hidden="true">·</span>
                </>
              )}
              <span className="font-mono-num text-xs font-semibold text-slate-200 whitespace-nowrap">
                {formatTime(snap.elapsed)}
              </span>
              <span className="text-slate-700" aria-hidden="true">·</span>
              {snap.activeEvent ? (
                <div className="text-xs text-teal-300 font-medium truncate max-w-[300px]">
                  {snap.activeEvent.title}
                  {snap.activeEvent.powerScale && snap.activeEvent.powerScale > 1.05
                    ? ` ${snap.activeEvent.powerScale.toFixed(1)}×`
                    : ''}
                  （{Math.ceil(snap.activeEvent.timeRemaining)}s）
                </div>
              ) : (
                <div className="text-xs text-slate-400 whitespace-nowrap">
                  野區事件：<span className="font-mono-num text-slate-200">{snap.nextEventCountdown}s</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="hidden sm:inline-flex p-0.5 rounded bg-[#0A1018] border border-slate-700/80">
                {viewOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeSpectatorView?.(opt.id)}
                    className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                      pvpInfo.spectatorView === opt.id
                        ? 'bg-teal-300 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    [{opt.hotkey}]{opt.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => pvpInfo.onChatOpenChange(!pvpInfo.chatOpen)}
                className={`px-1.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-mono-num ${
                  pvpInfo.chatOpen
                    ? 'bg-sky-300 text-slate-950'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300'
                }`}
                title="房間聊天 (Enter)"
                aria-label="房間聊天"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden md:inline">[↵]</span>
              </button>

              <button
                type="button"
                onClick={onToggleMute}
                className="px-1.5 py-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-mono-num"
                title={muted ? '開啟音效 (Backspace)' : '靜音 (Backspace)'}
                aria-label={muted ? '開啟音效' : '靜音'}
              >
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">[⌫]</span>
              </button>

              <button
                type="button"
                onClick={onReturnTitle}
                className="px-2.5 sm:px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-medium text-slate-200 cursor-pointer whitespace-nowrap"
                title="離開房間 (Space)"
              >
                [Space]離開
              </button>
            </div>
          </div>
        </div>

        {/* FLOATING NOTICE / INTEL STRIP */}
        <div className="px-2.5 sm:px-4 pt-1.5 sm:pt-2 flex flex-col gap-1 max-w-xl">
          {pvpInfo.connected === false && (
            <div className="px-2.5 py-1 rounded bg-rose-950/92 border border-rose-500/80 text-[11px] sm:text-xs font-semibold text-rose-100 animate-pulse">
              ⚠ 網路連線中斷，正在自動重連房間 {pvpInfo.roomCode}…
            </div>
          )}
          {pvpInfo.countdownSeconds != null && pvpInfo.countdownSeconds > 0 && (
            <div className="px-2.5 py-1 rounded bg-emerald-950/92 border border-emerald-400/80 text-[11px] sm:text-xs font-bold text-emerald-200">
              即將開戰：{pvpInfo.countdownSeconds} 秒後重新展開對決！
            </div>
          )}
          {pvpInfo.noticeText && (
            <div className="px-2.5 py-1 rounded bg-amber-950/90 border border-amber-500/70 text-[11px] sm:text-xs text-amber-100 truncate">
              {pvpInfo.noticeText}
            </div>
          )}
          {latestIntel && (
            <div className="px-2.5 py-1 rounded bg-[#0E141C]/92 border border-slate-700/80 text-[11px] sm:text-xs text-slate-200 truncate">
              <span className="font-mono-num text-slate-400 mr-1.5">{formatTime(latestIntel.time)}</span>
              {latestIntel.text}
            </div>
          )}
        </div>

        {/* FLOATING ZOOM CONTROL (MOBILE OR ZOOMED) */}
        {onToggleQuickZoom && (
          <div className={`pointer-events-auto fixed right-2.5 sm:right-4 bottom-[calc(170px+env(safe-area-inset-bottom))] lg:bottom-[136px] z-24 ${isZoomed ? 'block' : 'lg:hidden'}`}>
            <button
              type="button"
              onClick={isZoomed && onResetCamera ? onResetCamera : onToggleQuickZoom}
              className="px-2.5 py-1.5 rounded bg-[#0D1520]/95 border border-slate-600/80 text-[11px] font-semibold text-slate-100 flex items-center gap-1 shadow-lg cursor-pointer whitespace-nowrap"
            >
              {isZoomed ? <ZoomOut className="w-3.5 h-3.5 text-sky-300" /> : <ZoomIn className="w-3.5 h-3.5 text-sky-300" />}
              <span className="font-mono-num">{isZoomed ? `[-]還原全圖 (${cameraZoom.toFixed(1)}x)` : '[-]放大視角'}</span>
            </button>
          </div>
        )}

        {/* DESKTOP BOTTOM SPECTATOR BROADCAST DOCK */}
        <div className="pointer-events-auto hidden lg:flex bg-[#10161F] border-t border-slate-800 px-3 py-2 h-[126px] items-center">
          <div className="w-full max-w-[1480px] mx-auto grid grid-cols-[minmax(0,1fr)_248px_minmax(0,1fr)] gap-2 items-stretch">
            {renderTeamDockCard(leftTeam, 'left')}

            <div className="flex flex-col justify-between gap-1.5 px-2.5 py-1.5 rounded bg-[#0B1018] border border-slate-700/80 text-center">
              <div className="text-[11px] font-semibold text-teal-300">
                迷霧視角切換（唯讀觀戰）
              </div>
              <div className="grid grid-cols-3 gap-1">
                {viewOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeSpectatorView?.(opt.id)}
                    className={`px-1 py-1.5 rounded text-[10.5px] font-semibold transition-colors cursor-pointer whitespace-nowrap border ${
                      pvpInfo.spectatorView === opt.id
                        ? 'bg-teal-300 text-slate-950 border-teal-200'
                        : 'bg-[#141C27] text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    [{opt.hotkey}]{opt.label.slice(0, 2)}
                  </button>
                ))}
              </div>
              <div className="text-[10.5px] text-slate-400 font-mono-num truncate">
                1/2/3迷霧 · ↵聊天 · ⌫靜音 · -縮放
              </div>
            </div>

            {renderTeamDockCard(rightTeam, 'right')}
          </div>
        </div>

        {/* MOBILE COMPACT SPECTATOR DOCK */}
        <div className="pointer-events-auto lg:hidden bg-[#10161F] border-t border-slate-800 px-2.5 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          <div className="h-[146px] flex flex-col gap-1.5">
            <div className="grid grid-cols-3 gap-1.5 shrink-0">
              {viewOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeSpectatorView?.(opt.id)}
                  className={`py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap border ${
                    pvpInfo.spectatorView === opt.id
                      ? 'bg-teal-300 text-slate-950 border-teal-200'
                      : 'bg-[#141C27] text-slate-300 border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-1.5 flex-1 min-h-0">
              {([
                { team: leftTeam, side: 'left' as const },
                { team: rightTeam, side: 'right' as const },
              ]).map(({ team, side }) => {
                const f = team ? FACTIONS[team.faction] : side === 'left' ? leftFaction : rightFaction;
                const hpRatio = team ? Math.max(0, team.nexusHp / Math.max(1, team.nexusMaxHp)) : 1;
                return (
                  <div
                    key={side}
                    className={`px-2 py-1.5 rounded bg-[#0C121B] border flex flex-col justify-between min-w-0 ${
                      side === 'left' ? 'border-sky-500/40' : 'border-rose-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[11px] font-bold truncate ${side === 'left' ? 'text-sky-300' : 'text-rose-300'}`}>
                        {side === 'left' ? '藍' : '紅'}·{team?.name ?? (side === 'left' ? '藍方' : '紅方')}
                      </span>
                      <span className="font-mono-num text-[11px] text-slate-200 shrink-0">
                        {team ? team.nexusHp : 0}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-sm overflow-hidden">
                      <div
                        className="h-full origin-left"
                        style={{
                          transform: `scaleX(${hpRatio})`,
                          backgroundColor: side === 'left' ? '#38BDF8' : '#FB7185',
                        }}
                      />
                    </div>
                    {team && (
                      <div className="space-y-0.5 text-[10px] font-mono-num">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-amber-300 font-bold">{team.gold}G</span>
                          <span className="text-teal-300 font-bold">{team.gas}氣</span>
                          <span>{team.supplyUsed}/{team.supplyCap}人</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400 truncate">
                          <span>{f.name.slice(0, 2)} · T{team.techTier}</span>
                          <span>礦Lv{team.econLevel} · 塔{team.standingTowers}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* IN-GAME FADING CHAT OVERLAY (SPECTATOR) */}
        <InGameChatOverlay
          messages={pvpInfo.chatMessages}
          open={pvpInfo.chatOpen}
          onOpenChange={pvpInfo.onChatOpenChange}
          onSend={pvpInfo.onSendChat}
        />

        {/* SPECTATOR GAME OVER MODAL */}
        {snap.screen === 'GAME_OVER' && (
          <div className="pointer-events-auto fixed inset-0 z-30 bg-[#070B10]/88 flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto overscroll-contain bg-[#121923] border border-slate-700 rounded-lg p-4 sm:p-6 space-y-4 sm:space-y-5">
              <div className="border-b border-slate-800 pb-3 sm:pb-4">
                <div className="text-xs font-semibold tracking-wider text-teal-300">
                  MATCH FINISHED · 觀戰戰報結算
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-50 mt-1">
                  {snap.winner === 'player'
                    ? `藍方勝出 · ${leftTeam?.name ?? '藍方'}`
                    : `紅方勝出 · ${rightTeam?.name ?? '紅方'}`}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  房號 <span className="font-mono-num text-sky-300">{pvpInfo.roomCode}</span> · 戰局時長{' '}
                  <span className="font-mono-num text-slate-200">{formatTime(snap.elapsed)}</span>
                </p>
              </div>

              {leftTeam && rightTeam && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {([leftTeam, rightTeam] as const).map((t, idx) => (
                    <div key={t.seat} className="space-y-2">
                      <div
                        className={`font-semibold border-b border-slate-800 pb-1 ${
                          idx === 0 ? 'text-sky-300' : 'text-rose-300'
                        }`}
                      >
                        {idx === 0 ? '藍方' : '紅方'} · {t.name}（{FACTIONS[t.faction].name}）
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">最終科技 / 採礦</span>
                        <span className="font-mono-num text-slate-100">
                          T{t.techTier} / Lv.{t.econLevel}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">徵召 / 陣亡部隊</span>
                        <span className="font-mono-num text-slate-100">
                          {t.unitsTrained} / {t.unitsLost}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">奪取野區目標</span>
                        <span className="font-mono-num text-slate-100">{t.objectivesClaimed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">奇襲 / 掃描次數</span>
                        <span className="font-mono-num text-slate-100">
                          {t.ambushesLaunched} / {t.scansUsed}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onReturnTitle}
                  className="px-4 py-2 rounded text-xs font-medium text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 cursor-pointer whitespace-nowrap"
                >
                  離開房間
                </button>
                {pvpInfo.isHost && pvpInfo.bothAi && (
                  <button
                    type="button"
                    onClick={onRestart}
                    className="px-6 py-2 rounded text-xs font-bold text-slate-950 bg-amber-300 hover:bg-amber-200 cursor-pointer whitespace-nowrap"
                  >
                    再看一局 AI 對決
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between">
      {/* MOBILE COMPACT TOP STATUS BAR (< lg) */}
      <div className="pointer-events-auto lg:hidden bg-[#10161F] border-b border-slate-800 pt-[env(safe-area-inset-top)]">
        <div className="h-11 px-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 font-mono-num text-xs whitespace-nowrap">
            <div className="flex items-center gap-1 shrink-0">
              <div className="w-8 sm:w-12 h-2 bg-slate-800 rounded-sm overflow-hidden">
                <div
                  className="h-full transition-transform duration-150 origin-left"
                  style={{
                    transform: `scaleX(${Math.max(0, snap.player.nexusHp / snap.player.nexusMaxHp)})`,
                    backgroundColor: faction.accentHex,
                  }}
                />
              </div>
              <span className="text-[11px] font-semibold text-slate-100">{Math.ceil(snap.player.nexusHp)}</span>
              {snap.player.nexusPlatingBroken && (
                <button
                  type="button"
                  disabled={!canRepairNexus}
                  onClick={onRepairNexus}
                  className="px-1.5 py-0.5 rounded bg-orange-950/90 border border-orange-400/80 text-[10px] font-bold text-orange-200 disabled:opacity-55 cursor-pointer whitespace-nowrap"
                >
                  {nexusRepairing ? '修甲…' : `[0]修${NEXUS_REPAIR_COST}`}
                </button>
              )}
            </div>

            <span className="text-slate-700" aria-hidden="true">·</span>

            <div className="flex items-baseline gap-0.5 shrink-0">
              <span className="font-bold text-amber-300 text-xs">{goldInt}G</span>
              <span className="text-[10px] text-emerald-400">+{snap.playerIncomePerSec}</span>
              {snap.playerHarassedMines > 0 && (
                <span className="text-[10px] font-semibold text-rose-400 ml-0.5">
                  ⚠{snap.playerHarassedMines}
                </span>
              )}
            </div>

            <span className="text-slate-700" aria-hidden="true">·</span>

            <div className="flex items-baseline gap-0.5 shrink-0">
              <span className="font-bold text-teal-300 text-xs">{gasInt}氣</span>
              <span className="text-[10px] text-cyan-400">+{snap.playerGasIncomePerSec}</span>
            </div>

            <span className="text-slate-700" aria-hidden="true">·</span>

            <span
              className={`text-[11px] shrink-0 ${
                snap.playerSupplyUsed >= snap.playerSupplyCap
                  ? 'text-rose-400 font-semibold'
                  : 'text-slate-200'
              }`}
            >
              {snap.playerSupplyUsed}/{snap.playerSupplyCap}人
            </span>

            <span className="text-slate-700 hidden sm:inline" aria-hidden="true">·</span>
            <span className="hidden sm:inline text-[11px] text-sky-300">T{snap.player.techTier}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="font-mono-num text-[11px] text-slate-300 mr-1">{formatTime(snap.elapsed)}</span>

            {!pvpInfo && (
              <button
                type="button"
                onClick={onToggleSpeed}
                className="px-1.5 py-1 text-[11px] font-mono-num font-semibold rounded bg-slate-800/90 text-slate-200 cursor-pointer whitespace-nowrap"
              >
                {snap.speedMultiplier}x
              </button>
            )}

            {pvpInfo && (
              <button
                type="button"
                onClick={() => pvpInfo.onChatOpenChange(!pvpInfo.chatOpen)}
                className={`p-1.5 rounded cursor-pointer ${
                  pvpInfo.chatOpen ? 'bg-sky-300 text-slate-950' : 'bg-slate-800/90 text-slate-300'
                }`}
                aria-label="房間聊天"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onToggleMute}
              className="p-1.5 rounded bg-slate-800/90 text-slate-300 cursor-pointer"
              aria-label={muted ? '開啟音效' : '靜音'}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={onTogglePause}
              className="p-1.5 rounded bg-slate-800/90 text-slate-200 cursor-pointer"
              aria-label={pvpInfo ? '對戰選單' : '暫停'}
            >
              {snap.screen === 'PAUSED' || pvpInfo?.menuOpen ? (
                <Play className="w-3.5 h-3.5" />
              ) : (
                <Pause className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* DESKTOP TOP PERIMETER STATUS BAR (>= lg) */}
      <div className="pointer-events-auto hidden lg:flex h-12 px-4 bg-[#10161F] border-b border-slate-800 items-center justify-between gap-3">
        {/* Left: Citadel HP, Gold, Finite Reserve, Supply, Sectors & Tech */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-slate-200 whitespace-nowrap">{faction.name}</span>
            <div className="w-20 h-2 bg-slate-800 rounded-sm overflow-hidden">
              <div
                className="h-full transition-transform duration-150 origin-left"
                style={{
                  transform: `scaleX(${Math.max(0, snap.player.nexusHp / snap.player.nexusMaxHp)})`,
                  backgroundColor: faction.accentHex,
                }}
              />
            </div>
            <span className="font-mono-num text-xs text-slate-200 whitespace-nowrap">
              {Math.ceil(snap.player.nexusHp)}
            </span>
            {snap.player.nexusPlatingBroken && (
              <button
                type="button"
                disabled={!canRepairNexus}
                onClick={onRepairNexus}
                title={`[0] 主堡外甲破損！主堡採礦效率降為 65%，花費 ${NEXUS_REPAIR_COST}G（${NEXUS_REPAIR_TIME}s）修復 +${snap.player.nexusPlatingHp} 外甲並恢復 100% 採礦`}
                className="px-1.5 py-0.5 rounded bg-orange-950/90 hover:bg-orange-900/90 border border-orange-400/80 text-[10.5px] font-bold text-orange-200 disabled:opacity-55 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
              >
                {nexusRepairing ? '🔧修甲中…' : `[0]⚠修外甲 ${NEXUS_REPAIR_COST}G`}
              </button>
            )}
          </div>

          <div className="h-4 w-px bg-slate-800 shrink-0" />

          <div className="flex items-center gap-2 text-xs whitespace-nowrap">
            <div>
              <span className="text-slate-400 mr-1">金</span>
              <span className="font-mono-num font-bold text-amber-300 text-sm">{goldInt}</span>
              <span className="font-mono-num text-emerald-400 ml-0.5">+{snap.playerIncomePerSec}/s</span>
              {snap.playerHarassedMines > 0 && (
                <span
                  className="font-mono-num text-[10.5px] text-rose-300 bg-rose-950/75 border border-rose-500/60 rounded px-1 py-0.2 ml-1"
                  title="敵軍越靠近礦區（180px→45px），該區採礦效率線性下降（80%→15%）；單純遠程挨打無影響，唯獨塔被拆毀會斷礦歸 0"
                >
                  ⚠{snap.playerHarassedMines}擾
                </span>
              )}
            </div>

            <span className="text-slate-700" aria-hidden="true">·</span>

            <div
              title={`瓦斯挖掘場（已建 ${snap.playerExtractorsBuilt}/${snap.playerExtractorsTotal} 座 · 已升級 ${snap.playerGasUpgrades} 次）：用於訓練進階／重裝／空軍單位；按 [P] 或點擊各區後方瓦斯空位建造／升級`}
            >
              <span className="text-slate-400 mr-1">氣</span>
              <span className="font-mono-num font-bold text-teal-300 text-sm">{gasInt}</span>
              <span className="font-mono-num text-cyan-400 ml-0.5">+{snap.playerGasIncomePerSec}/s</span>
            </div>

            <span className="text-slate-700" aria-hidden="true">·</span>

            <div
              className={`font-mono-num ${
                nexusGold <= 0
                  ? 'text-rose-400 font-semibold'
                  : nexusGold <= 500
                  ? 'text-amber-300'
                  : 'text-slate-300'
              }`}
              title={`主堡礦脈剩餘 ${nexusGold}G · 塔區總儲量 ${Math.ceil(snap.playerSectorGoldTotal)}G`}
            >
              堡礦 {nexusGold <= 0 ? '枯竭' : `${nexusGold}G`}
            </div>

            <span className="text-slate-700" aria-hidden="true">·</span>

            <div
              className={`font-mono-num ${
                snap.playerSupplyUsed >= snap.playerSupplyCap
                  ? 'text-rose-400 font-semibold'
                  : snap.playerSupplyUsed >= snap.playerSupplyCap - 4
                  ? 'text-amber-300'
                  : 'text-slate-200'
              }`}
              title={`最高人口硬上限 ${MAX_SUPPLY_LIMIT}；每座補給站 +${SUPPLY_DEPOT_BONUS} 人口（目前已控 ${snap.playerControlledSectors} 區，可建 ${snap.playerMaxDepotsAllowed} 座補給站）`}
            >
              人口 {snap.playerSupplyUsed}/{snap.playerSupplyCap}
            </div>

            <span className="text-slate-700 hidden xl:inline" aria-hidden="true">·</span>

            <div
              className="hidden xl:block font-mono-num text-slate-200"
              title="佔領防禦塔與野區據點數，決定補給站上限"
            >
              T{snap.player.techTier} · 控區 {snap.playerControlledSectors}
            </div>

            {snap.player.globalAttackBuffTimer > 0 && (
              <>
                <span className="text-slate-700 hidden xl:inline" aria-hidden="true">·</span>
                <div className="hidden xl:block font-mono-num text-amber-300 font-semibold">
                  全軍鼓舞 {Math.ceil(snap.player.globalAttackBuffTimer)}s
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center: Match Clock & Jungle Dynamic Event */}
        <div className="flex items-center gap-2.5 min-w-0">
          {snap.mapMode === 'simple' && (
            <>
              <span className="text-xs font-semibold text-teal-300 whitespace-nowrap">雙線簡易</span>
              <span className="text-slate-700" aria-hidden="true">·</span>
            </>
          )}
          <span className="font-mono-num text-xs font-semibold text-slate-200 whitespace-nowrap">
            {formatTime(snap.elapsed)}
          </span>
          <span className="text-slate-700" aria-hidden="true">·</span>
          {snap.activeEvent ? (
            <div className="text-xs text-teal-300 font-medium truncate max-w-[300px]">
              {snap.activeEvent.title}
              {snap.activeEvent.powerScale && snap.activeEvent.powerScale > 1.05
                ? ` ${snap.activeEvent.powerScale.toFixed(1)}×`
                : ''}
              （{Math.ceil(snap.activeEvent.timeRemaining)}s）
            </div>
          ) : (
            <div className="text-xs text-slate-400 whitespace-nowrap">
              野區事件：<span className="font-mono-num text-slate-200">{snap.nextEventCountdown}s</span>
            </div>
          )}
        </div>

        {/* Right: Enemy Intel HP & Match Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {pvpInfo && (
            <div className="flex items-center gap-1.5 text-xs whitespace-nowrap">
              <span className="font-mono-num text-sky-300 font-semibold">房號 {pvpInfo.roomCode}</span>
              <span className="text-slate-700" aria-hidden="true">·</span>
              <span className="text-slate-300 truncate max-w-[115px]">vs {pvpInfo.opponentName}</span>
              {pvpInfo.spectatorCount > 0 && (
                <>
                  <span className="text-slate-700" aria-hidden="true">·</span>
                  <span className="font-mono-num text-teal-300">觀戰 {pvpInfo.spectatorCount}</span>
                </>
              )}
              {!pvpInfo.opponentConnected && (
                <span className="text-amber-300 font-semibold">（斷線）</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs whitespace-nowrap">
            <span className="text-slate-400">敵主堡</span>
            <span className="font-mono-num font-semibold text-rose-400">
              {snap.enemyNexusHpKnown !== null ? `${snap.enemyNexusHpKnown}` : '迷霧未知'}
            </span>
            {snap.enemyTechTierKnown !== null && (
              <span className="font-mono-num text-slate-400">· T{snap.enemyTechTierKnown}</span>
            )}
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {!pvpInfo && (
            <button
              type="button"
              onClick={onToggleSpeed}
              className="px-2 py-1 text-xs font-mono-num font-semibold rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
              title="切換遊戲速度 (\)"
            >
              [\]{snap.speedMultiplier}x
            </button>
          )}

          {pvpInfo && (
            <button
              type="button"
              onClick={() => pvpInfo.onChatOpenChange(!pvpInfo.chatOpen)}
              className={`px-1.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-mono-num ${
                pvpInfo.chatOpen
                  ? 'bg-sky-300 text-slate-950'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300'
              }`}
              title="房間聊天 (Enter)"
              aria-label="房間聊天"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>[↵]</span>
            </button>
          )}

          {onToggleTacticGuide && !snap.tutorialMode && !pvpInfo?.isSpectator && (
            <button
              type="button"
              onClick={onToggleTacticGuide}
              className={`px-2 py-1 rounded border transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap ${
                tacticGuideEnabled
                  ? 'bg-amber-400/20 hover:bg-amber-400/30 border-amber-400/60 text-amber-200'
                  : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title={tacticGuideEnabled ? '關閉五戰術新手索引' : '開啟五戰術新手索引'}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>戰術索引</span>
            </button>
          )}

          {onOpenFactionGuide && (
            <button
              type="button"
              onClick={() => onOpenFactionGuide(faction.id)}
              className="px-2 py-1 rounded bg-sky-950/75 hover:bg-sky-900/80 border border-sky-500/45 text-sky-200 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap"
              title="開啟進階種族教學：查看三族科技樹、九大兵種與相剋關係"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>進階教學</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleMute}
            className="px-1.5 py-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-mono-num"
            title={muted ? '開啟音效 (Backspace)' : '靜音 (Backspace)'}
            aria-label={muted ? '開啟音效' : '靜音'}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>[⌫]</span>
          </button>

          <button
            type="button"
            onClick={onTogglePause}
            className="px-1.5 py-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-mono-num"
            title={pvpInfo ? '對戰選單 / 投降 (Space)' : '暫停 (Space)'}
            aria-label={pvpInfo ? '對戰選單' : '暫停'}
          >
            {snap.screen === 'PAUSED' || pvpInfo?.menuOpen ? (
              <Play className="w-3.5 h-3.5" />
            ) : (
              <Pause className="w-3.5 h-3.5" />
            )}
            <span>[Sp]</span>
          </button>
        </div>
      </div>

      {/* SANDBOX DUAL-CONTROL BAR (ONLY IN SANDBOX MODE) */}
      {snap.sandboxMode && (
        <div className="pointer-events-auto fixed left-1/2 -translate-x-1/2 top-[48px] lg:top-[52px] z-25 flex flex-wrap items-center justify-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0D1520]/95 border border-emerald-500/60 shadow-lg text-[11px]">
          <span className="font-bold text-emerald-300 whitespace-nowrap">沙盒</span>
          <div className="inline-flex rounded bg-[#090F17] border border-slate-700 p-0.5">
            <button
              type="button"
              onClick={() => onSwitchSandboxTeam?.('player')}
              title="切換操控藍方 (Shift+A 或 Tab)"
              className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                snap.sandboxActiveTeam === 'player'
                  ? 'bg-sky-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              [⇧A]藍·{FACTIONS[snap.sandboxLeftFaction].name.slice(0, 2)}
            </button>
            <button
              type="button"
              onClick={() => onSwitchSandboxTeam?.('enemy')}
              title="切換操控紅方 (Shift+D 或 Tab)"
              className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                snap.sandboxActiveTeam === 'enemy'
                  ? 'bg-rose-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              [⇧D]紅·{FACTIONS[snap.sandboxRightFaction].name.slice(0, 2)}
            </button>
          </div>
          <span className="hidden sm:inline text-[10px] text-slate-400">[Tab切換]</span>
          <button
            type="button"
            onClick={() => onSandboxMaxOut?.('both')}
            title="將藍紅雙方科技升至 T3、全兵營 Lv.4、全前置建築完工、全攻防 +3/+3、專屬科技滿階與補給滿 100 (Shift+Z)"
            className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/60 text-amber-200 font-semibold cursor-pointer whitespace-nowrap"
          >
            [⇧Z]滿科+3/+3
          </button>
          <button
            type="button"
            onClick={() => onSandboxToggleInstant?.()}
            title="開啟後建造、升級、研發與出兵瞬間完成（0.05s）(Shift+I)"
            className={`px-2 py-0.5 rounded border font-semibold cursor-pointer whitespace-nowrap ${
              snap.sandboxInstantMode
                ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300'
            }`}
          >
            [⇧I]瞬產:{snap.sandboxInstantMode ? '開' : '關'}
          </button>
          <button
            type="button"
            onClick={() => onSandboxClearUnits?.()}
            title="清空場上所有部隊 (Shift+C)"
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-900/60 border border-slate-600 hover:border-rose-400/60 text-slate-200 font-semibold cursor-pointer whitespace-nowrap"
          >
            [⇧C]清場
          </button>
          <button
            type="button"
            onClick={onRestart}
            title="重置沙盒戰局 (Shift+X)"
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-semibold cursor-pointer whitespace-nowrap"
          >
            [⇧X]重置
          </button>
        </div>
      )}

      {/* TOP-RIGHT COMPACT TARGETING MODE PROMPT (NEVER BLOCKS CENTER BATTLEFIELD) */}
      {snap.targetMode !== 'none' && (
        <div className="pointer-events-auto fixed right-2 sm:right-3 top-[50px] lg:top-[56px] z-20 max-w-[235px] sm:max-w-[295px] flex items-start justify-between gap-2 px-2.5 py-1.5 rounded bg-[#101926]/95 border border-sky-400/70 text-[11px] text-sky-100 shadow-lg">
          <div className="leading-snug whitespace-normal break-words">
            {snap.targetMode === 'scan' ? (
              <>
                <div>點擊地圖施放【偵察掃描】</div>
                <div className="text-[10px] text-sky-300/90">揭露迷霧與潛行單位</div>
              </>
            ) : snap.targetMode === 'faction_skill' ? (
              <>
                <div className="font-semibold text-amber-200">點擊目標區域施放【{faction.activeName}】</div>
                <div className="text-[10px] text-rose-300 font-semibold">⚠ 注意：範圍傷害會誤傷我方友軍！</div>
              </>
            ) : snap.targetMode === 'k_boost' ? (
              <>
                <div className="font-semibold text-emerald-200">
                  【{faction.specialTechs[0].shortName} [K]】範圍 {IRON_K_BOOST_RADIUS}px
                </div>
                <div className="text-[10px] text-emerald-100/90">
                  {faction.id === 'dawn'
                    ? '回復 +35 護盾；生物/靈能獲 3s 激勵；純機械/空軍原地架設 3s（射程+35%、傷+6）'
                    : faction.id === 'swarm'
                    ? '全蟲群消耗 10% 生命激發 3s 狂熱（移速+28%、攻速+35%、傷+2）'
                    : '生物：微扣血獲 3s 士氣鼓舞；機械/空軍：原地架設 3s（射程+35%、傷+6）'}
                </div>
                <div className="text-[10px] text-slate-300">再按一次 [K] 或右鍵可取消</div>
              </>
            ) : snap.targetMode === 'ambush_select' ? (
              <>
                <div className="font-semibold text-cyan-200">【奇襲編隊 · 第 1 步】</div>
                <div className="text-[10px] text-sky-200/90">點擊地圖框選 {SQUAD_SELECT_RADIUS}px 內所有友軍（無人數上限）</div>
                <div className="text-[10px] text-slate-300">再按一次 [X] 或右鍵可取消</div>
              </>
            ) : snap.targetMode === 'ambush_target' ? (
              <>
                <div className="font-semibold text-cyan-200">【奇襲編隊 · 第 2 步】已選 {snap.pendingAmbushCount} 人</div>
                <div className="text-[10px] text-sky-200/90">點擊地圖任意位置立即編隊前往（成為第四路）</div>
                <div className="text-[10px] text-slate-300">再按一次 [X] 或右鍵可取消</div>
              </>
            ) : (
              <>
                <div>點擊空塔基建【{selectedTowerDef.name}】</div>
                <div className="text-[10px] text-sky-300/90">視野內敵區空基亦可奪取</div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onCancelTargetMode}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold cursor-pointer whitespace-nowrap shrink-0"
          >
            [Esc]取消
          </button>
        </div>
      )}

      {/* NON-BLOCKING AUTO-RECONNECT STRIP FOR PVP */}
      {pvpInfo && pvpInfo.connected === false && (
        <div className="pointer-events-none fixed top-[50px] lg:top-[56px] left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded bg-rose-950/95 border border-rose-500/85 text-xs font-semibold text-rose-100 shadow-lg animate-pulse whitespace-nowrap">
          ⚠ 網路連線中斷，正在自動重連房間 {pvpInfo.roomCode}…
        </div>
      )}

      {/* LEFT-EDGE VERTICAL STACK: SEGMENTED ALERTS + RESEARCH & TRAINING COUNTDOWNS (ZERO CENTER BLOCKING!) */}
      {(snap.activeEvent || pvpInfo?.noticeText || latestIntel || activeResearches.length > 0 || activeTrainings.length > 0) && (
        <div className="pointer-events-none fixed left-1.5 sm:left-2.5 top-[50px] lg:top-[56px] bottom-[calc(174px+env(safe-area-inset-bottom))] lg:bottom-[140px] z-15 flex flex-col gap-1 w-[166px] sm:w-[205px] overflow-hidden">
          {/* Mobile-only active jungle event slim badge */}
          {snap.activeEvent && (
            <div className="lg:hidden px-2 py-1 rounded bg-[#0C1D22]/90 border border-teal-500/55 text-[10.5px] leading-snug text-teal-200 whitespace-normal break-words shrink-0">
              <div>野區：{snap.activeEvent.title}</div>
              <div className="font-mono-num text-[10px] text-teal-300/90">
                {snap.activeEvent.powerScale && snap.activeEvent.powerScale > 1.05
                  ? `強度 ${snap.activeEvent.powerScale.toFixed(1)}× · `
                  : ''}
                剩餘 {Math.ceil(snap.activeEvent.timeRemaining)}s
              </div>
            </div>
          )}

          {pvpInfo?.noticeText && (
            <div className="px-2 py-1 rounded bg-amber-950/90 border border-amber-500/70 text-[10.5px] leading-snug text-amber-100 whitespace-normal break-words shrink-0">
              {pvpInfo.noticeText}
            </div>
          )}

          {latestIntel && (
            <div
              className={`px-2 py-1 rounded bg-[#0E141C]/88 border text-[10.5px] leading-snug whitespace-normal break-words shrink-0 ${
                latestIntel.severity === 'critical'
                  ? 'border-rose-500/75 text-rose-200'
                  : latestIntel.severity === 'warn'
                  ? 'border-amber-500/65 text-amber-200'
                  : 'border-slate-700/80 text-slate-200'
              }`}
            >
              {latestIntel.text
                .split(/(?<=[；！。])/)
                .map((seg) => seg.trim())
                .filter(Boolean)
                .map((seg, idx) => (
                  <div key={idx}>
                    {idx === 0 && (
                      <span className="font-mono-num text-[10px] text-slate-400 mr-1">
                        {formatTime(latestIntel.time)}
                      </span>
                    )}
                    {seg}
                  </div>
                ))}
            </div>
          )}

          {activeResearches.map((res) => (
            <div
              key={res.id}
              className="px-2 py-1 rounded bg-[#0B121B]/88 border border-emerald-500/45 shrink-0 w-[142px] sm:w-[160px]"
            >
              <div className="flex items-center justify-between gap-1.5 text-[10px] sm:text-[10.5px]">
                <span className="text-emerald-200 font-medium truncate">{res.label}</span>
                <span className="font-mono-num text-emerald-300 shrink-0">
                  {res.remaining.toFixed(1)}s
                </span>
              </div>
              <div className="mt-0.5 h-1 w-full bg-slate-800 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-emerald-400 origin-left"
                  style={{
                    transform: `scaleX(${Math.max(
                      0,
                      Math.min(1, 1 - res.remaining / Math.max(0.1, res.total))
                    )})`,
                  }}
                />
              </div>
            </div>
          ))}

          {activeTrainings.map((ord) => {
            const mult = ord.multiplier ?? 1;
            return (
            <div
              key={ord.id}
              className={`px-2 py-1 rounded bg-[#0B121B]/88 border shrink-0 w-[142px] sm:w-[160px] ${
                mult >= 2 ? 'border-amber-400/60' : 'border-sky-500/45'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 text-[10px] sm:text-[10.5px]">
                <span className={`font-medium truncate ${mult >= 2 ? 'text-amber-200' : 'text-sky-200'}`}>
                  {ord.unitName}
                  {mult >= 2 && (
                    <span className="font-mono-num text-amber-300 font-bold ml-0.5">×{mult}</span>
                  )}
                  <span className="text-slate-400 ml-0.5">({LANE_SHORT_NAMES[ord.lane]})</span>
                </span>
                <span className={`font-mono-num shrink-0 ${mult >= 2 ? 'text-amber-300' : 'text-sky-300'}`}>
                  {ord.remaining.toFixed(1)}s
                </span>
              </div>
              <div className="mt-0.5 h-1 w-full bg-slate-800 rounded-sm overflow-hidden">
                <div
                  className={`h-full origin-left ${mult >= 2 ? 'bg-amber-400' : 'bg-sky-400'}`}
                  style={{
                    transform: `scaleX(${Math.max(
                      0,
                      Math.min(1, 1 - ord.remaining / Math.max(0.1, ord.total))
                    )})`,
                  }}
                />
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* FLOATING QUICK ZOOM / RESET CAMERA CONTROL (MOBILE ALWAYS, DESKTOP WHEN ZOOMED) */}
      {onToggleQuickZoom && (
        <div
          className={`pointer-events-auto fixed right-2.5 sm:right-4 bottom-[calc(170px+env(safe-area-inset-bottom))] lg:bottom-[136px] z-24 ${
            isZoomed ? 'block' : 'lg:hidden'
          }`}
        >
          <button
            type="button"
            onClick={isZoomed && onResetCamera ? onResetCamera : onToggleQuickZoom}
            className="px-2.5 py-1.5 rounded bg-[#0D1520]/95 border border-slate-600/80 text-[11px] font-semibold text-slate-100 flex items-center gap-1 shadow-lg cursor-pointer whitespace-nowrap"
          >
            {isZoomed ? (
              <ZoomOut className="w-3.5 h-3.5 text-sky-300" />
            ) : (
              <ZoomIn className="w-3.5 h-3.5 text-sky-300" />
            )}
            <span className="font-mono-num">
              {isZoomed ? `[-]全圖 (${cameraZoom.toFixed(1)}x)` : '[-]放大戰場'}
            </span>
          </button>
        </div>
      )}

      {/* ZERO-DELAY FLOATING TACTICAL HINT POPOVER (DESKTOP HOVER ONLY) */}
      {hoveredDockHint && (
        <div className="pointer-events-none hidden lg:block fixed bottom-[134px] right-4 lg:right-[280px] z-30 w-[415px] max-w-[92vw] rounded-md bg-[#0D141E] border border-slate-600/90 px-3.5 py-2.5 shadow-xl text-xs">
          {hoveredDockHint === 'quick_t' ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-200">[T] 快捷建塔／奪區／升級</span>
                <span className="font-mono-num text-[11px] text-amber-300">
                  選用：{selectedTowerDef.name} ({selectedTowerDef.cost}G)
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                在目前戰線（{LANE_SHORT_NAMES[snap.selectedLane]}）自動執行：
                <span className="text-sky-200">1. 建我方空塔基</span> →{' '}
                <span className="text-teal-300">2. 奪取視野內敵方空塔基</span> →{' '}
                <span className="text-amber-300">
                  3. 依目前升級模式（
                  {snap.towerUpgradeMode === 'mining'
                    ? '⛏擴礦改裝'
                    : snap.towerUpgradeMode === 'tech'
                    ? '⚡科技升級'
                    : '⚔強化護甲傷害'}
                  ）升階至 Lv.2／Lv.3
                </span>
                。新建施工期間無視野/無傷/無礦；已完工塔在升級期間<span className="text-emerald-300">挖礦照常進行</span>！
              </p>
            </div>
          ) : hoveredDockHint === 'upgrade_mode' ? (
            (() => {
              const cLv2 = getTowerUpgradeCostAndTime(snap.selectedTowerType, 2, 'combat');
              const mLv2 = getTowerUpgradeCostAndTime(snap.selectedTowerType, 2, 'mining');
              const tLv2 = getTowerUpgradeCostAndTime(snap.selectedTowerType, 2, 'tech');
              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-amber-200">[;] 防禦塔三線升級切換（⇧Q/⇧W/⇧E 直選）</span>
                    <span className="font-mono-num text-[11px] text-sky-300">
                      目前：
                      {snap.towerUpgradeMode === 'mining'
                        ? '⛏擴礦'
                        : snap.towerUpgradeMode === 'tech'
                        ? '⚡科技'
                        : '⚔強化'}
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-300 leading-relaxed border-t border-slate-800 pt-1">
                    <div>
                      <span className="text-sky-300 font-semibold">• [⇧Q] ⚔ 強化（Lv2: {cLv2.cost}G/{cLv2.time}s）：</span>
                      提升該塔的護甲、血量與傷害輸出（經濟塔則提高採礦倍率）。
                    </div>
                    <div>
                      <span className="text-amber-300 font-semibold">• [⇧W] ⛏ 擴礦（Lv2: {mLv2.cost}G/{mLv2.time}s）：</span>
                      不強化戰鬥力，永久疊加 <span className="font-mono-num text-amber-200">+{Math.round(TOWER_MINING_UPGRADE_BONUS * 100)}%</span> 採礦速率。
                    </div>
                    <div>
                      <span className="text-violet-300 font-semibold">• [⇧E] ⚡ 科技（Lv2: {tLv2.cost}G/{tLv2.time}s）{!canUseTowerTech ? '（需專屬 [L]）' : ''}：</span>
                      1 次升級獲<span className="text-cyan-200 font-semibold">稀缺偵隱</span>＋CD +{Math.round(TOWER_TECH_CD_RATE_BY_LV[1] * 100)}%；第 2 次升級 CD +{Math.round(TOWER_TECH_CD_RATE_BY_LV[2] * 100)}% ＋ <span className="text-amber-200">+{TOWER_TECH_LV2_BONUS_DMG} 固定增傷</span>！
                    </div>
                    <div className="text-rose-300/90">
                      • 所有方向皆需施工時間與費用；施工／升級中<span className="text-amber-200 font-semibold">連點兩下可取消並全額退費</span>。升級額外血量被打掉會降級！
                    </div>
                  </div>
                </div>
              );
            })()
          ) : hoveredDockHint === 'bio_lab' || hoveredDockHint === 'mech_bay' ? (
            (() => {
              const def = ARMORY_BUILDING_DEFS[hoveredDockHint];
              const st = snap.playerArmories?.find((a) => a.kind === hoveredDockHint);
              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-emerald-200">
                      [{def.hotkey}] 前置建築：{def.name}
                    </span>
                    <span className="font-mono-num text-[11px] text-amber-300">
                      {def.cost}G · {def.buildTime}s · {def.hp}HP
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{def.desc}</p>
                  <div className="text-[10.5px] font-mono-num text-sky-300 border-t border-slate-800 pt-1">
                    狀態：
                    {st?.building
                      ? `施工中（剩 ${st.buildRemaining.toFixed(1)}s · 場上連點兩下取消退費）`
                      : st?.built
                      ? `已完工（可研發對應攻防科技）`
                      : `尚未建造（按 [${def.hotkey}] 或點擊主堡後方空位動工）`}
                  </div>
                </div>
              );
            })()
          ) : hoveredDockHint === 'gas_extractor' ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-teal-200">[P] 瓦斯挖掘場（各區後方建造 · 金幣升級）</span>
                <span className="font-mono-num text-[11px] text-cyan-300">
                  +{snap.playerGasIncomePerSec}/s · 已建 {snap.playerExtractorsBuilt}/{snap.playerExtractorsTotal}
                </span>
              </div>
              <div className="text-[11px] font-mono-num text-slate-200 bg-[#090F17] rounded px-2 py-1 border border-slate-800 space-y-0.5">
                <div>Lv.1：{GAS_EXTRACTOR_LEVELS[1].cost}G · {GAS_EXTRACTOR_LEVELS[1].time}s · +{GAS_EXTRACTOR_LEVELS[1].ratePerSec}氣/s</div>
                <div>Lv.2：{GAS_EXTRACTOR_LEVELS[2].cost}G · {GAS_EXTRACTOR_LEVELS[2].time}s · +{GAS_EXTRACTOR_LEVELS[2].ratePerSec}氣/s（鐵砧 [F] +1波）</div>
                <div>Lv.3：{GAS_EXTRACTOR_LEVELS[3].cost}G · {GAS_EXTRACTOR_LEVELS[3].time}s · +{GAS_EXTRACTOR_LEVELS[3].ratePerSec}氣/s（鐵砧 [F] 再+1波）</div>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                可於主堡後方及每座已佔領防禦塔後方建造，優先在建築後方施工；每區皆可獨立升級至 Lv.3。施工／升級中連點兩下可取消退費！
              </p>
            </div>
          ) : hoveredDockHint === 'ambush' ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-cyan-300">[X] 自訂奇襲編隊（第四戰線 · 無額外屬性加成）</span>
                <span className="font-mono-num text-[11px] text-amber-300">
                  免費 · 無人數上限 · 取消後 {JUNGLE_AMBUSH_COOLDOWN}s CD
                </span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-300 leading-relaxed border-t border-slate-800 pt-1">
                <div>
                  <span className="text-cyan-200 font-semibold">• 兩步驟編隊：</span>
                  按 <span className="font-mono-num">[X]</span> 點擊戰場框選 <span className="font-mono-num">{SQUAD_SELECT_RADIUS}px</span> 內全部友軍 → 再點任意目的地即編隊出擊（步驟中再按一次 [X] 取消）。
                </div>
                <div>
                  <span className="text-sky-300 font-semibold">• 第四路操控：</span>
                  編隊完成後按 [4] 或 [X] 選取編隊，完整受「[5]推進／[6]強攻／[7]守外塔／[8]回主堡／[9/Z]撤退」五大姿態掌控。
                </div>
                <div>
                  <span className="text-amber-300 font-semibold">• 解散編隊：</span>
                  連按兩次 [X] 或按 [⇧R] 立即解散編隊並回歸最近戰線，0.1 秒後奇襲即重新就緒！
                </div>
              </div>
            </div>
          ) : hoveredDockHint === 'retreat' ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-rose-300">[9 / Z] 戰術撤退（邊退邊反擊）</span>
                <span className="font-mono-num text-[11px] text-slate-300">
                  常態數值 · 適用路線或編隊
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                維持正常移速與防禦，立即往主堡撤離；追兵進入<span className="text-rose-200 font-semibold">實際射程內</span>仍會停頓完成普攻前後搖進行掩護反擊，射程外絕不回頭追敵。再按一次 [Z] 可切回守外塔。
              </p>
            </div>
          ) : hoveredDockHint === 'econ' ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-200">
                  [A] 採礦技術 Lv.{snap.player.econLevel} → {snap.player.econLevel >= ECON_MAX_LEVEL ? '滿級' : `Lv.${snap.player.econLevel + 1}`}
                </span>
                {econInfo && (
                  <span className="font-mono-num text-[11px] text-emerald-300">
                    {econInfo.discountPct > 0
                      ? `塔數折扣 -${econInfo.discountPct}% (${econInfo.baseCost}→${econInfo.cost}G)`
                      : `原價 ${econInfo.cost}G`}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                前置門檻：<span className="font-mono-num text-slate-100">Lv.2–4 需 0 塔</span>，Lv.5–8 依序需 1/2/3/4 塔。
                <span className="text-emerald-300">每多擁有 1 座完工防禦塔，採礦升級費用減免 10%（最高省 50%）</span>；鐵砧聯邦每升 1 級採礦亦讓 [F] 軌道砲擊 +1 波！
              </p>
            </div>
          ) : typeof hoveredDockHint === 'object' && hoveredDockHint.kind === 'barracks' ? (
            (() => {
              const tier = hoveredDockHint.tier;
              const def = BARRACKS_DEFS[tier];
              const bkStatus = snap.playerBarracks?.find((b) => b.tier === tier);
              const level = bkStatus?.level ?? (bkStatus?.built ? 1 : 0);
              const nextUp = getBarracksNextUpgrade(tier, level);
              const unitList = def.unitIndices
                .map((i) => faction.units[i])
                .filter((u): u is UnitDef => Boolean(u));
              const unlockedBonus = unitList.find((u) => u.requiresBarracksTier === tier);
              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-amber-200">
                      {def.name}（Lv.1 解鎖 · Lv.2/3/4 同時產 2/3/4 組）
                    </span>
                    <span className="font-mono-num text-[11px] text-amber-300 shrink-0">
                      目前 Lv.{level}/4
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-200 bg-[#090F17] rounded px-2 py-1.5 border border-slate-800">
                    對應並行產兵單位（可重複同兵種 · 各自獨立倒數）：
                    {unitList.map((u, i) => (
                      <span key={u.id} className="text-amber-300 font-semibold">
                        {i > 0 ? '、' : ''}[{u.hotkey}]{u.name}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Lv.1（{def.cost}G）解鎖該階專屬兵種；升級 <span className="text-amber-200 font-semibold">Lv.2（{def.lv2Cost}G）</span>每兵種可同時重複產 <span className="text-amber-200 font-semibold">2 組</span>；<span className="text-sky-300 font-semibold">Lv.3（{def.lv3Cost}G）</span>同時產 <span className="text-sky-300 font-semibold">3 組</span>；<span className="text-fuchsia-300 font-semibold">Lv.4（{def.lv4Cost}G）</span>達上限同時產 <span className="text-fuchsia-300 font-semibold">4 組</span>！每次點擊花 1 組金幣與人口，並可自由分配不同路線。<span className="text-rose-300">遭攻擊打掉升級額外血量會先降級並降低並行組數，需重新升級。</span>
                    {unlockedBonus && (
                      <span className="text-emerald-300 block mt-0.5">
                        Lv.1 完工即解鎖專屬新單位：[{unlockedBonus.hotkey}] {unlockedBonus.name}（與同階兵種獨立 CD！）
                      </span>
                    )}
                  </p>
                  <div className="text-[10.5px] font-mono-num text-sky-300 border-t border-slate-800 pt-1">
                    狀態：
                    {bkStatus?.building
                      ? `${bkStatus.built ? `升級至 Lv.${level + 1} 中` : '建造施工中'}（剩餘 ${bkStatus.buildRemaining.toFixed(1)}s）`
                      : snap.player.techTier < tier
                      ? `需先晉升科技時代至 T${tier}`
                      : nextUp
                      ? nextUp.nextLevel === 1
                        ? `點擊建造 Lv.1（解鎖專屬兵種 · ${nextUp.cost}G · ${nextUp.time}s）`
                        : `點擊升級至 Lv.${nextUp.nextLevel}（同時產 ${nextUp.concurrentSlots} 組可重複 · ${nextUp.cost}G · ${nextUp.time}s）`
                      : `Lv.4 滿級啟用中（每兵種最高同時重複產 4 組！）`}
                  </div>
                </div>
              );
            })()
          ) : typeof hoveredDockHint === 'object' ? (
            (() => {
              const u = faction.units[hoveredDockHint.index];
              if (!u) return null;
              const flatBonuses = Object.entries(u.bonusVsTag ?? {})
                .filter(([, v]) => (v ?? 0) > 0)
                .map(([k, v]) => {
                  const tag = k as AttributeTag;
                  const perLv = u.bonusPerLevelVsTag?.[tag] ?? 0;
                  return `對${ATTRIBUTE_TAG_LABELS[tag]} +${v}${perLv > 0 ? `(+${perLv}/級)` : ''}`;
                });
              const squadDps = (u.damage * u.attackCount * u.attackRate * u.squadSize).toFixed(1);
              const domainLabel = u.domain === 'air' ? '空軍' : '陸軍';
              const rangeLabel = u.combatRange === 'melee' ? (u.range >= 60 ? '中近戰' : '近戰') : '遠程';
              const m = getUnitControlMeta(hoveredDockHint.index);
              const intervalSec = (u.attackIntervalMs / 1000).toFixed(2);
              const armoryGroupLabel = isIronbound
                ? u.domain === 'air'
                  ? '空軍攻/防 [J/O]'
                  : u.attributes.includes('Biological')
                  ? '生物攻/防 [G/U]'
                  : '機械攻/防 [H/I]'
                : faction.id === 'dawn'
                ? u.domain === 'air'
                  ? '空軍攻/防 [J/O] · 護盾 [H/I]'
                  : '地面攻/防 [G/U] · 護盾 [H/I]'
                : u.domain === 'air'
                ? '飛翼攻/防 [J/O]'
                : u.combatRange === 'melee'
                ? '近戰攻/防 [G/U]'
                : '遠程攻/防 [H/I]';
              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-100">
                      [{u.hotkey}] {u.name} ×{u.squadSize}
                      {m.hasBarracks && (
                        <span className="text-amber-300 font-mono-num ml-1">
                          【並行 {m.activeCount}/{m.maxBatch} 組】
                        </span>
                      )}
                    </span>
                    <span className="font-mono-num text-[11px] text-amber-300 shrink-0">
                      {u.cost}G{u.gasCost > 0 ? <span className="text-teal-300">+{u.gasCost}氣</span> : <span className="text-slate-400">·免氣</span>} · {u.trainTime}s · {u.supplyCost}人
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[10.5px]">
                    <div className="flex flex-wrap items-center gap-1">
                      {u.attributes.map((tag) => (
                        <span
                          key={tag}
                          className={`px-1.5 py-0.5 rounded border text-[9.5px] font-semibold ${ATTRIBUTE_TAG_BADGE_COLORS[tag]}`}
                        >
                          {ATTRIBUTE_TAG_LABELS[tag]}
                        </span>
                      ))}
                      {u.detector && (
                        <span className="px-1.5 py-0.5 rounded border border-cyan-400/70 bg-cyan-950/70 text-cyan-200 text-[9.5px] font-bold">
                          偵隱
                        </span>
                      )}
                      {u.cloakDurationSec ? (
                        <span className="px-1.5 py-0.5 rounded border border-violet-400/70 bg-violet-950/70 text-violet-200 text-[9.5px] font-bold">
                          隱形{u.cloakDurationSec}s
                        </span>
                      ) : u.cloaked ? (
                        <span className="px-1.5 py-0.5 rounded border border-violet-400/70 bg-violet-950/70 text-violet-200 text-[9.5px] font-bold">
                          潛行
                        </span>
                      ) : null}
                      <span className="text-slate-300 font-semibold ml-0.5">
                        {domainLabel}·{rangeLabel}
                      </span>
                      <span className={u.canHitAir ? 'text-cyan-300' : 'text-slate-400'}>
                        （{u.canHitAir ? '可對空' : '僅對地'}）
                      </span>
                    </div>
                    <span className="font-mono-num text-sky-300">
                      前置：T{u.tier}
                      {u.requiresBarracksTier
                        ? ` ＋ T${u.requiresBarracksTier}營${(u.requiresBarracksLevel ?? 1) > 1 ? ` Lv.${u.requiresBarracksLevel}` : ''}`
                        : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 text-[10.5px] font-mono-num text-slate-300 bg-[#090F17] rounded px-2 py-1.5 border border-slate-800">
                    <span>
                      血量 <b className="text-slate-100">{u.hp}</b>
                      {u.shield > 0 && <b className="text-sky-300">+{u.shield}盾</b>}
                    </span>
                    <span>
                      裝甲 <b className="text-slate-100">{u.armor}甲</b>
                      {u.shield > 0 && (
                        <b className="text-sky-300">/{u.shieldArmor ?? 0}盾甲</b>
                      )}
                    </span>
                    <span>
                      單輪{' '}
                      <b className="text-emerald-300">
                        {u.damage}
                        {u.attackCount > 1 ? `×${u.attackCount}` : ''}
                      </b>
                      /{intervalSec}s
                    </span>
                    <span>
                      編隊DPS <b className="text-emerald-300">{squadDps}</b>
                    </span>
                    <span>
                      射程 <b className="text-sky-200">{u.range}</b>
                      {u.splashRadius ? <b className="text-amber-300"> 濺{u.splashRadius}</b> : ''}
                    </span>
                    <span>
                      吃科技 <b className="text-amber-200">{armoryGroupLabel}</b>
                    </span>
                  </div>
                  <div className="space-y-0.5 text-[10.5px] leading-snug border-t border-slate-800 pt-1">
                    <div className="text-sky-200 font-semibold">
                      標籤固定加成：{flatBonuses.length > 0 ? flatBonuses.join(' · ') : '無額外加成（純基礎傷）'}
                      {u.attackCount > 1 ? ` · ${u.attackCount}發獨立扣甲` : ''}
                    </div>
                    {u.specialEffectNote && (
                      <div className="text-slate-300">
                        <span className="text-slate-400">特性：</span>
                        {u.specialEffectNote}
                      </div>
                    )}
                    <div className="text-emerald-300">
                      <span className="text-slate-400">克制：</span>
                      {u.counterNote}
                    </div>
                    {u.weakAgainstNote && (
                      <div className="text-rose-300">
                        <span className="text-slate-400">怕誰：</span>
                        {u.weakAgainstNote}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            (() => {
              const td = TOWER_DEFS[hoveredDockHint];
              const curTier = snap.player.techTier;
              const s1 = getTowerLevelStats(hoveredDockHint, 1, curTier);
              const s2 = getTowerLevelStats(hoveredDockHint, 2, curTier);
              const s3 = getTowerLevelStats(hoveredDockHint, 3, curTier);
              const towerBonusText = (bMap: Partial<Record<AttributeTag, number>>) => {
                const items = Object.entries(bMap)
                  .filter(([, v]) => (v ?? 0) > 0)
                  .map(([k, v]) => `+${v}${ATTRIBUTE_TAG_LABELS[k as AttributeTag]}`);
                return items.length > 0 ? `(${items.join('/')})` : '';
              };
              const tierScaleNote =
                curTier === 1
                  ? `T2 塔血+${Math.round((TOWER_TECH_TIER_HP_PERMILLE[2] - 1000) / 10)}%/傷+${TOWER_TECH_TIER_DMG_BONUS[2]} · T3 塔血+${Math.round((TOWER_TECH_TIER_HP_PERMILLE[3] - 1000) / 10)}%/傷+${TOWER_TECH_TIER_DMG_BONUS[3]}`
                  : `已套用目前 T${curTier} 時代加成（血量 ×${(TOWER_TECH_TIER_HP_PERMILLE[curTier] / 1000).toFixed(2)} / 傷害 +${TOWER_TECH_TIER_DMG_BONUS[curTier]}）`;
              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-100">
                      {td.name}
                      <span
                        className={`ml-1.5 text-[10.5px] font-semibold ${
                          hoveredDockHint === 'econ_tower'
                            ? 'text-amber-300'
                            : td.canHitAir
                            ? 'text-sky-300'
                            : 'text-orange-300'
                        }`}
                      >
                        {hoveredDockHint === 'econ_tower'
                          ? '純挖礦·零傷害'
                          : td.canHitAir
                          ? '可對空'
                          : '僅對地（[L]解鎖對空）'}
                      </span>
                    </span>
                    <span className="font-mono-num text-[10.5px] text-amber-300">
                      {td.cost}/{td.upgradeCostLv2}/{td.upgradeCostLv3}G · {td.buildTime}/{td.upgradeTimeLv2}/{td.upgradeTimeLv3}s
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {td.attributes.map((tag) => (
                      <span
                        key={tag}
                        className={`px-1.5 py-0.5 rounded border text-[9.5px] font-semibold ${ATTRIBUTE_TAG_BADGE_COLORS[tag]}`}
                      >
                        {ATTRIBUTE_TAG_LABELS[tag]}
                      </span>
                    ))}
                    <span className="text-[9.5px] text-violet-300 font-mono-num ml-1">{tierScaleNote}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-0.5 text-[10.5px] font-mono-num bg-[#090F17] rounded px-2 py-1.5 border border-slate-800">
                    {([
                      { lv: 1, s: s1, tone: 'text-slate-200' },
                      { lv: 2, s: s2, tone: 'text-sky-200' },
                      { lv: 3, s: s3, tone: 'text-amber-200' },
                    ] as const).map(({ lv, s, tone }) => (
                      <div key={lv} className={`flex items-center justify-between gap-1 ${tone}`}>
                        <span className="font-bold w-8">Lv.{lv}</span>
                        <span>血{s.hp}</span>
                        <span>甲{s.armor}</span>
                        {hoveredDockHint === 'econ_tower' ? (
                          <span className="text-amber-300">
                            該區採礦 ×{ECON_TOWER_MINING_MULT_BY_LV[lv].toFixed(2)}（無傷害）
                          </span>
                        ) : hoveredDockHint === 'tech_tower' ? (
                          <span className="text-cyan-300">
                            CD+{Math.round(TECH_TOWER_CD_RATE_BY_LV[lv] * 100)}% 研+{Math.round(TECH_TOWER_RES_RATE_BY_LV[lv] * 100)}% · 攻{s.damage}
                          </span>
                        ) : (
                          <>
                            <span>
                              攻{s.damage}
                              {towerBonusText(s.bonusVsTag)}
                            </span>
                            <span>射{s.range}</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-200 leading-relaxed border-t border-slate-800 pt-1">
                    <span className="text-sky-300 font-semibold">特性：</span>
                    {td.strengths}
                  </p>
                  <p className="text-[10.5px] text-amber-300/90 leading-snug">
                    新建施工期間無視野/無傷/無礦；已完工塔升級期間<span className="text-emerald-300">挖礦照常</span>，可選「⚔強化 / ⛏擴礦 / ⚡科技(偵隱)」；額外升級血量被打掉會降級！
                  </p>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* DESKTOP BOTTOM TACTICAL COMMAND DOCK (>= lg, 4 Balanced Zones, 126px) */}
      <div className="pointer-events-auto hidden lg:flex bg-[#10161F] border-t border-slate-800 px-3 py-1.5 h-[126px] items-center">
        <div className="w-full max-w-[1480px] mx-auto grid grid-cols-[266px_minmax(0,1fr)_268px_304px] gap-2 items-stretch h-full">
          {/* ZONE 1: Lanes + 4th-Lane Custom Squad [X] + 5 Stances */}
          <div className="flex flex-col justify-between gap-1.5 pr-2 lg:border-r border-slate-800">
            <div className={`grid gap-1 ${snap.activeLanes.length === 2 ? 'grid-cols-3' : 'grid-cols-4'}`}>
              {snap.activeLanes.map((lane, idx) => {
                const isSelected = !snap.squadSelected && snap.selectedLane === lane;
                const alert = snap.laneUnderAttack[lane];
                return (
                  <button
                    key={lane}
                    type="button"
                    onClick={() => onSelectLane(lane)}
                    className={`px-1 py-1.5 rounded text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap border ${
                      isSelected
                        ? 'bg-slate-200 text-slate-950 border-slate-100'
                        : alert
                        ? 'bg-rose-950/60 text-rose-200 border-rose-500/60 hover:bg-rose-900/60'
                        : 'bg-[#161E2A] text-slate-300 border-slate-700/70 hover:bg-slate-800'
                    }`}
                  >
                    [{idx + 1}]{LANE_SHORT_NAMES[lane]}
                    {alert && !isSelected ? '!' : ''}
                  </button>
                );
              })}

              {snap.player.squadActive ? (
                <div className="flex items-stretch gap-0.5 min-w-0">
                  <button
                    type="button"
                    onClick={onToggleAmbush}
                    onMouseEnter={() => setHoveredDockHint('ambush')}
                    onMouseLeave={() => setHoveredDockHint(null)}
                    title="點擊切換操控第四路編隊 [4]；連按兩次 [X] 或按 [⇧R] 立即解散回歸最近戰線"
                    className={`flex-1 min-w-0 px-1 py-1.5 rounded-l text-[10px] font-bold transition-colors whitespace-nowrap border truncate cursor-pointer ${
                      snap.squadSelected
                        ? 'bg-cyan-300 text-slate-950 border-cyan-200'
                        : 'bg-[#122630] border-cyan-500/75 hover:border-cyan-300 text-cyan-200'
                    }`}
                  >
                    [4]編({snap.playerSquadCount})
                  </button>
                  <button
                    type="button"
                    onClick={onDisbandSquad}
                    title="解散編隊 [⇧R] 或連按兩次 [X]（回歸最近戰線，0.1s 後可再奇襲）"
                    className="px-1 py-1.5 rounded-r bg-rose-950/75 hover:bg-rose-900/90 border border-rose-500/60 text-[9.5px] font-bold text-rose-200 cursor-pointer shrink-0"
                  >
                    ⇧R✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!canAmbush && !isAmbushTargeting}
                  onClick={onToggleAmbush}
                  onMouseEnter={() => setHoveredDockHint('ambush')}
                  onMouseLeave={() => setHoveredDockHint(null)}
                  title="自訂奇襲編隊 [X]：點擊框選友軍 → 再點目的地成為第四路（再按 X 取消；無額外屬性加成）"
                  className={`px-1 py-1.5 rounded text-[11px] font-semibold transition-colors whitespace-nowrap border flex items-center justify-center gap-0.5 ${
                    isAmbushTargeting
                      ? 'bg-cyan-500/30 border-cyan-300 text-cyan-100 cursor-pointer'
                      : canAmbush
                      ? 'bg-[#132528] border-teal-600/70 hover:border-teal-400 text-teal-200 cursor-pointer'
                      : 'bg-[#111720] border-slate-800 text-slate-500 cursor-not-allowed'
                  } ${hl(tutorialHighlight === 'ambush')}`}
                >
                  <Crosshair className="w-3 h-3 shrink-0" />
                  <span>
                    {snap.targetMode === 'ambush_select'
                      ? '選兵'
                      : snap.targetMode === 'ambush_target'
                      ? `點地(${snap.pendingAmbushCount})`
                      : snap.player.ambushCooldown > 0
                      ? `${snap.player.ambushCooldown.toFixed(1)}s`
                      : '[X]奇襲'}
                  </span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-5 gap-1">
              {(
                [
                  { id: 'push', label: '[5]推進', tip: '[5] 推進（先殺人）：沿戰線（或編隊目的地）前進，優先殲滅敵方部隊，再拆建築' },
                  { id: 'all_in', label: '[6]強攻', tip: '[6] 強攻（破塔）：無視野怪全速衝鋒，優先鎖定敵方防禦塔、建築與主堡強拆（移速+15%）' },
                  { id: 'hold_tower', label: '[7]守塔', tip: '[7] 守外塔（開局預設）：駐守最外圍防禦塔（編隊則固守目的地周邊）' },
                  { id: 'defend_base', label: '[8]回堡', tip: '[8] 回主堡：撤回主堡與補給站區域防禦抄家（遇近敵仍會反擊）' },
                  {
                    id: 'retreat',
                    label: '[9]撤退',
                    tip: '[9 / Z] 戰術撤退：維持常態數值往主堡撤離；追兵進入實際射程內仍會反擊，射程外絕不回頭追敵',
                  },
                ] as Array<{ id: LaneStance; label: string; tip: string }>
              ).map((st) => {
                const active = activeStance === st.id;
                const activeTone =
                  st.id === 'retreat'
                    ? 'bg-rose-500/30 text-rose-100 border-rose-400/80'
                    : st.id === 'defend_base'
                    ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/70'
                    : st.id === 'all_in'
                    ? 'bg-amber-500/25 text-amber-200 border-amber-400/70'
                    : snap.squadSelected
                    ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/70'
                    : 'bg-sky-500/25 text-sky-200 border-sky-400/70';
                const idleTone =
                  st.id === 'retreat'
                    ? 'bg-[#1D1318] text-rose-300/90 border-rose-900/70 hover:border-rose-500/70 hover:text-rose-100'
                    : 'bg-[#141B25] text-slate-400 border-slate-800 hover:text-slate-200';
                return (
                  <button
                    key={st.id}
                    type="button"
                    title={st.tip}
                    onMouseEnter={() => {
                      if (st.id === 'retreat') setHoveredDockHint('retreat');
                    }}
                    onMouseLeave={() => {
                      if (st.id === 'retreat') setHoveredDockHint(null);
                    }}
                    onClick={() => onSetStance(snap.selectedLane, st.id)}
                    className={`px-0.5 py-1.5 rounded text-[10px] font-medium transition-colors cursor-pointer whitespace-nowrap border ${
                      active ? activeTone : idleTone
                    } ${hl(tutorialHighlight === 'stances' && (st.id === 'push' || st.id === 'all_in'))}`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ZONE 2: Unit Roster (Ironbound stacks T1/T2/T3 Barracks units neatly in 6 columns!) */}
          <div className="grid grid-cols-6 gap-1 pr-2 lg:border-r border-slate-800 h-full">
            {(isIronbound ? [0, 1, 2, 3, 4, 5] : faction.units.map((_, i) => i)).map((colIdx) => {
              const renderDesktopUnitButton = (idx: number, compactStack: boolean) => {
                const m = getUnitControlMeta(idx);
                const { u } = m;
                return (
                  <button
                    key={u.id}
                    type="button"
                    disabled={!m.canTrain}
                    onClick={() => onTrainUnit(idx)}
                    onMouseEnter={() => setHoveredDockHint({ kind: 'unit', index: idx })}
                    onMouseLeave={() => setHoveredDockHint(null)}
                    title={`${u.name} (${u.cost}G${u.gasCost > 0 ? `+${u.gasCost}氣` : ''} · CD ${u.trainTime}s · ${u.supplyCost}人 · ${m.tag.text}${m.hasBarracks ? ` · 並行 ${m.activeCount}/${m.maxBatch}` : ''}) — ${u.counterNote}`}
                    className={`relative rounded border text-left transition-colors flex flex-col justify-between overflow-hidden ${
                      compactStack ? 'px-1.5 py-0.5 flex-1 min-h-0' : 'px-1.5 py-1.5 h-full'
                    } ${
                      m.locked
                        ? 'bg-[#0C1118] border-slate-800/70 opacity-50 cursor-not-allowed'
                        : m.onCd
                        ? m.hasBarracks
                          ? 'bg-[#1D1A12] border-amber-500/70 cursor-not-allowed'
                          : 'bg-[#121D2B] border-sky-500/65 cursor-not-allowed'
                        : m.canTrain
                        ? m.activeCount > 0
                          ? 'bg-[#1C1E15] border-amber-400/75 hover:border-amber-200 hover:bg-[#25281C] cursor-pointer'
                          : m.hasBarracks
                          ? 'bg-[#19202B] border-amber-500/55 hover:border-amber-300 hover:bg-[#222B3A] cursor-pointer'
                          : u.armorClass === 'heavy'
                          ? 'bg-[#17202D] border-slate-600 hover:border-amber-300/80 hover:bg-[#1E2A3B] cursor-pointer'
                          : 'bg-[#161F2C] border-slate-700 hover:border-slate-400 hover:bg-[#1C2737] cursor-pointer'
                        : 'bg-[#121822] border-slate-800 opacity-65 cursor-not-allowed'
                    } ${hl(tutorialHighlight === 'unit_0' && idx === 0)}`}
                  >
                    <div className="flex items-center justify-between gap-0.5">
                      <span className="font-mono-num text-[9.5px] font-bold text-slate-400 whitespace-nowrap">
                        [{u.hotkey}]
                        {m.hasBarracks && (
                          <span className={`ml-0.5 ${m.activeCount > 0 ? 'text-amber-300' : 'text-amber-500/70'}`}>
                            {m.activeCount > 0 ? `${m.activeCount}/${m.maxBatch}` : `×${m.maxBatch}`}
                          </span>
                        )}
                      </span>
                      <span
                        className={`font-mono-num text-[9px] font-bold whitespace-nowrap ${
                          m.onCd
                            ? m.hasBarracks
                              ? 'text-amber-300'
                              : 'text-sky-300'
                            : 'text-amber-300'
                        }`}
                      >
                        {m.techLocked ? (
                          `需T${u.tier}`
                        ) : m.barracksLocked ? (
                          `需T${m.reqBkTier}營${m.reqBkLevel > 1 ? m.reqBkLevel : ''}`
                        ) : m.onCd ? (
                          `${m.unitOrder!.remaining.toFixed(1)}s`
                        ) : (
                          <>
                            {u.cost}
                            {u.gasCost > 0 && (
                              <span className={m.lackGas ? 'text-rose-400 ml-0.5' : 'text-teal-300 ml-0.5'}>
                                {u.gasCost}氣
                              </span>
                            )}
                          </>
                        )}
                      </span>
                    </div>

                    <div className={`font-bold text-slate-100 truncate leading-tight flex items-center gap-0.5 ${compactStack ? 'text-[10px]' : 'text-[11px]'}`}>
                      <span className="truncate">{u.name}</span>
                      {u.detector && <span className="text-[8.5px] text-cyan-300 font-bold shrink-0">偵</span>}
                      {u.cloakDurationSec && <span className="text-[8.5px] text-violet-300 font-bold shrink-0">隱</span>}
                    </div>

                    {!compactStack && (
                      <div className="flex items-center justify-between gap-1 text-[9.5px] leading-tight">
                        <span className={`${m.tag.className} whitespace-nowrap`}>
                          {m.tag.text}
                          {u.canHitAir && <span className="text-sky-400 font-normal ml-0.5">↑</span>}
                        </span>
                        <span className={`font-mono-num whitespace-nowrap ${m.overSupply && !m.locked ? 'text-rose-400' : 'text-slate-400'}`}>
                          {u.trainTime}s·{u.supplyCost}人
                        </span>
                      </div>
                    )}

                    {m.activeCount > 0 && (
                      <div className="absolute inset-x-0 bottom-0 h-1 flex gap-px bg-slate-900/90">
                        {Array.from({ length: m.maxBatch }).map((_, sIdx) => {
                          const ord = m.unitOrders[sIdx];
                          const pct = ord ? 1 - ord.remaining / Math.max(0.1, ord.total) : 0;
                          return (
                            <div key={sIdx} className="flex-1 h-full bg-slate-800 overflow-hidden">
                              {ord && (
                                <div
                                  className={`h-full origin-left ${m.hasBarracks ? 'bg-amber-400' : 'bg-sky-400'}`}
                                  style={{ transform: `scaleX(${pct})` }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </button>
                );
              };

              if (isIronbound && colIdx === 0 && faction.units[6]) {
                return (
                  <div key="iron_t1_col" className="flex flex-col gap-1 h-full min-h-0">
                    {renderDesktopUnitButton(0, true)}
                    {renderDesktopUnitButton(6, true)}
                  </div>
                );
              }
              if (isIronbound && colIdx === 3 && faction.units[7]) {
                return (
                  <div key="iron_t2_col" className="flex flex-col gap-1 h-full min-h-0">
                    {renderDesktopUnitButton(3, true)}
                    {renderDesktopUnitButton(7, true)}
                  </div>
                );
              }
              if (isIronbound && colIdx === 4 && faction.units[8]) {
                return (
                  <div key="iron_t3_col" className="flex flex-col gap-1 h-full min-h-0">
                    {renderDesktopUnitButton(4, true)}
                    {renderDesktopUnitButton(8, true)}
                  </div>
                );
              }

              return renderDesktopUnitButton(colIdx, false);
            })}
          </div>

          {/* ZONE 3: Faction Towers + Barracks + Armory Prereq & Gas Extractor + Depot/Econ/Tech */}
          <div className="flex flex-col justify-between gap-0.5 pr-2 lg:border-r border-slate-800">
            {/* Row 1: Faction Towers [⇧1..4] + Quick [T] */}
            <div className={`grid gap-1 ${faction.towerTypes.length === 4 ? 'grid-cols-5' : 'grid-cols-4'}`}>
              {faction.towerTypes.map((tt, tIdx) => {
                const def = TOWER_DEFS[tt];
                const selected = snap.selectedTowerType === tt;
                return (
                  <button
                    key={tt}
                    type="button"
                    onClick={() => onSelectTowerType(tt)}
                    onMouseEnter={() => setHoveredDockHint(tt)}
                    onMouseLeave={() => setHoveredDockHint(null)}
                    title={`[⇧${tIdx + 1}] 選用${def.name}（亦可用 ['] 鍵循環切換）`}
                    className={`px-0.5 py-0.5 rounded text-[9.5px] font-medium transition-colors cursor-pointer truncate border ${
                      selected
                        ? 'bg-slate-700 text-slate-50 border-slate-400'
                        : 'bg-[#141B25] text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    ⇧{tIdx + 1}{def.shortLabel}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={onQuickBuildTower}
                onMouseEnter={() => setHoveredDockHint('quick_t')}
                onMouseLeave={() => setHoveredDockHint(null)}
                className={`px-0.5 py-0.5 rounded bg-[#162231] hover:bg-[#1E2E42] border border-sky-700/70 text-[9.5px] font-semibold text-sky-200 cursor-pointer whitespace-nowrap ${hl(tutorialHighlight === 'quick_tower')}`}
              >
                [T]{selectedTowerDef.cost}
              </button>
            </div>

            {/* Row 2: 3 Base Barracks [, . /] + 3-Way Tower Upgrade Mode Toggle [;] */}
            <div className="grid grid-cols-[1fr_1fr_1fr_64px] gap-1">
              {BARRACKS_TIERS.map((tier, bIdx) => {
                const def = BARRACKS_DEFS[tier];
                const bkKey = [',', '.', '/'][bIdx];
                const bkStatus = snap.playerBarracks?.find((b) => b.tier === tier);
                const built = Boolean(bkStatus?.built);
                const building = Boolean(bkStatus?.building);
                const level = bkStatus?.level ?? (built ? 1 : 0);
                const nextUp = getBarracksNextUpgrade(tier, level);
                const tierLocked = snap.player.techTier < tier;
                const canClickBk = !building && !tierLocked && nextUp !== null && goldInt >= nextUp.cost;
                const isMaxed = built && level >= 4 && !building;
                return (
                  <button
                    key={tier}
                    type="button"
                    disabled={!canClickBk}
                    onClick={() => onBuildBarracks(tier)}
                    onMouseEnter={() => setHoveredDockHint({ kind: 'barracks', tier })}
                    onMouseLeave={() => setHoveredDockHint(null)}
                    className={`px-0.5 py-0.5 rounded border text-[9px] font-semibold transition-colors whitespace-nowrap truncate ${
                      isMaxed
                        ? 'bg-amber-950/45 border-amber-500/60 text-amber-300 cursor-default'
                        : building
                        ? 'bg-sky-950/45 border-sky-500/60 text-sky-200 cursor-not-allowed'
                        : canClickBk
                        ? built
                          ? 'bg-[#1D2419] hover:bg-[#273121] border-emerald-500/70 hover:border-emerald-300 text-emerald-200 cursor-pointer'
                          : 'bg-[#1A1C24] hover:bg-[#252630] border-amber-700/65 hover:border-amber-400 text-amber-200 cursor-pointer'
                        : 'bg-[#121720] border-slate-800 text-slate-500 opacity-55 cursor-not-allowed'
                    } ${hl(tutorialHighlight === 'barracks_1' && tier === 1)}`}
                  >
                    {building
                      ? `[${bkKey}]${Math.ceil(bkStatus!.buildRemaining)}s`
                      : isMaxed
                      ? `[${bkKey}]T${tier}×4✓`
                      : tierLocked
                      ? `[${bkKey}]需T${tier}`
                      : built && nextUp
                      ? `[${bkKey}]升${nextUp.nextLevel} ${nextUp.cost}`
                      : `[${bkKey}]${def.shortName}${def.cost}`}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={cycleTowerUpgradeMode}
                onMouseEnter={() => setHoveredDockHint('upgrade_mode')}
                onMouseLeave={() => setHoveredDockHint(null)}
                className={`px-1 py-0.5 rounded border text-[9px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  snap.towerUpgradeMode === 'mining'
                    ? 'bg-amber-950/60 border-amber-400/80 text-amber-200 hover:bg-amber-900/60'
                    : snap.towerUpgradeMode === 'tech'
                    ? canUseTowerTech
                      ? 'bg-violet-950/70 border-violet-400/80 text-violet-200 hover:bg-violet-900/70'
                      : 'bg-slate-900/80 border-violet-700/50 text-violet-300/70'
                    : 'bg-sky-950/50 border-sky-500/70 text-sky-200 hover:bg-sky-900/50'
                }`}
              >
                [;]
                {snap.towerUpgradeMode === 'mining'
                  ? '⛏礦'
                  : snap.towerUpgradeMode === 'tech'
                  ? canUseTowerTech
                    ? '⚡科'
                    : '🔒科'
                  : '⚔強'}
              </button>
            </div>

            {/* Row 3: Prerequisite Armory Buildings [生研] [機廠] + Gas Extractor [P] */}
            <div className="grid grid-cols-3 gap-1">
              {(['bio_lab', 'mech_bay'] as ArmoryBuildingKind[]).map((kind) => {
                const def = ARMORY_BUILDING_DEFS[kind];
                const st = kind === 'bio_lab' ? bioLabStatus : mechBayStatus;
                const built = Boolean(st?.built);
                const building = Boolean(st?.building);
                const canClick = !built && !building && goldInt >= def.cost;
                return (
                  <button
                    key={kind}
                    type="button"
                    disabled={!canClick}
                    onClick={() => onBuildArmory(kind)}
                    onMouseEnter={() => setHoveredDockHint(kind)}
                    onMouseLeave={() => setHoveredDockHint(null)}
                    className={`px-1 py-0.5 rounded border text-[9px] font-semibold transition-colors whitespace-nowrap truncate ${
                      built
                        ? 'bg-emerald-950/45 border-emerald-500/60 text-emerald-300 cursor-default'
                        : building
                        ? 'bg-sky-950/45 border-sky-500/60 text-sky-200 cursor-not-allowed'
                        : canClick
                        ? 'bg-[#17212C] hover:bg-[#1F2D3C] border-teal-500/60 hover:border-teal-300 text-teal-200 cursor-pointer'
                        : 'bg-[#121720] border-slate-800 text-slate-500 opacity-55 cursor-not-allowed'
                    } ${hl(tutorialHighlight === 'armory' && !built && !building)}`}
                  >
                    {built
                      ? `[${def.hotkey}]${def.shortName}✓`
                      : building
                      ? `[${def.hotkey}]${Math.ceil(st!.buildRemaining)}s`
                      : `[${def.hotkey}]${def.shortName}${def.cost}`}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={!canClickExtractor}
                onClick={onBuildExtractor}
                onMouseEnter={() => setHoveredDockHint('gas_extractor')}
                onMouseLeave={() => setHoveredDockHint(null)}
                className={`px-1 py-0.5 rounded bg-[#112426] hover:bg-[#183336] disabled:opacity-45 border border-teal-600/70 text-[9px] font-semibold text-teal-200 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap truncate ${hl(tutorialHighlight === 'depot_extractor' && snap.playerExtractorsBuilt + snap.playerExtractorsUpgrading < 1)}`}
              >
                {snap.playerExtractorsUpgrading > 0
                  ? `[P]氣建(${snap.playerExtractorsBuilt}/${snap.playerExtractorsTotal})`
                  : `[P]瓦斯${snap.playerExtractorsBuilt}/${snap.playerExtractorsTotal}`}
              </button>
            </div>

            {/* Row 4: Supply Depot [B] + Econ [A] + Tech Tier [D] */}
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                disabled={!canBuildDepot}
                onClick={onBuildDepot}
                title={`建造補給站 (${SUPPLY_DEPOT_COST}G · ${SUPPLY_DEPOT_BUILD_TIME}秒 · +${SUPPLY_DEPOT_BONUS} 人口上限)。控區數 ${snap.playerControlledSectors} 解鎖上限 ${snap.playerMaxDepotsAllowed} 座（最多 6 座，全軍硬上限 ${MAX_SUPPLY_LIMIT} 人口）(B)`}
                className={`px-1 py-0.5 rounded bg-[#16202D] hover:bg-[#1E2B3D] disabled:opacity-45 border border-slate-700 text-[9.5px] font-semibold text-cyan-200 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap ${hl(tutorialHighlight === 'depot_extractor' && depotsTotal < 1)}`}
              >
                {depotCapReached
                  ? depotsTotal >= 6
                    ? '[B]補給滿'
                    : `[B]控區(${depotsTotal}/${snap.playerMaxDepotsAllowed})`
                  : `[B]補${SUPPLY_DEPOT_COST} ${depotsTotal}/${snap.playerMaxDepotsAllowed}`}
              </button>

              <button
                type="button"
                disabled={econRunning || econCost === null || econTowerLocked || goldInt < econCost}
                onClick={onUpgradeEcon}
                onMouseEnter={() => setHoveredDockHint('econ')}
                onMouseLeave={() => setHoveredDockHint(null)}
                className={`px-1 py-0.5 rounded bg-[#16202D] hover:bg-[#1E2B3D] disabled:opacity-45 border border-slate-700 text-[9.5px] font-semibold text-amber-200 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap ${hl(tutorialHighlight === 'econ_tech' && snap.player.econLevel < 2 && !econRunning)}`}
              >
                {econRunning
                  ? '[A]採礦中'
                  : econCost === null
                  ? '[A]礦滿級'
                  : econTowerLocked
                  ? `[A]需${econReqTowers}塔`
                  : `[A]礦${snap.player.econLevel + 1} ${econCost}`}
              </button>

              <button
                type="button"
                disabled={techRunning || techCost === null || goldInt < techCost || gasInt < techGasCost}
                onClick={onUpgradeTech}
                title={`晉升科技時代：T2 僅需 ${TECH_UPGRADE_COSTS[1]}G（免瓦斯）；T3 需 ${TECH_UPGRADE_COSTS[2]}G + ${TECH_UPGRADE_GAS_COSTS[2]}氣。解鎖高階兵種、軍械攻防、Lv.3要塞塔、高階兵營與專屬科技 (D)`}
                className={`px-1 py-0.5 rounded bg-[#16202D] hover:bg-[#1E2B3D] disabled:opacity-45 border border-slate-700 text-[9.5px] font-semibold text-emerald-200 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap truncate ${hl(tutorialHighlight === 'econ_tech' && snap.player.techTier < 2 && !techRunning)}`}
              >
                {techRunning
                  ? '[D]升階中'
                  : techCost
                  ? techGasCost > 0
                    ? `[D]T${snap.player.techTier + 1} ${techCost}+${techGasCost}氣`
                    : `[D]T${snap.player.techTier + 1} ${techCost}G`
                  : '[D]T3滿階'}
              </button>
            </div>
          </div>

          {/* ZONE 4: Synchronized 6-Track Gas Armory + 2-Stage Active [K] & [L] + [S/F] */}
          <div className="flex flex-col justify-between gap-1">
            {/* Row 1–2: Faction-Specific 6-Track Armory */}
            <div className={`grid grid-cols-3 gap-1 ${armoryTrackList.length > 3 ? '' : 'flex-1'}`}>
              {armoryTrackList.map(({ id, def: track, kind, accent }) => {
                const lv = snap.player.armoryLevels[id] ?? 0;
                const running = hasResearchKind(kind);
                const lockMeta = getArmoryLockMeta(id, lv);
                const cost = lockMeta.maxed ? null : track.costs[lv];
                const gasCost = lockMeta.maxed ? 0 : (track.gasCosts[lv] ?? 0);
                const canClick =
                  !lockMeta.maxed &&
                  !running &&
                  !lockMeta.tierLocked &&
                  cost !== null &&
                  goldInt >= cost &&
                  gasInt >= gasCost;
                const compact = armoryTrackList.length > 3;

                return (
                  <button
                    key={id}
                    type="button"
                    disabled={!canClick}
                    onClick={() => onUpgradeArmoryTrack(id)}
                    title={`[${track.hotkey}] ${track.name} Lv.${lv}/3 — ${track.desc}${
                      lockMeta.maxed
                        ? '（已滿級）'
                        : lockMeta.tierLocked
                        ? `（${lockMeta.longLock}）`
                        : `（費用 ${cost}G + ${gasCost}氣 · ${track.times[lv]}s）`
                    }`}
                    className={`rounded border bg-[#141D26] border-slate-700 disabled:opacity-45 transition-colors cursor-pointer disabled:cursor-not-allowed ${accent} ${
                      compact
                        ? 'px-1 py-0.5 flex items-center justify-between gap-0.5'
                        : 'px-1 py-1 text-center flex flex-col justify-center'
                    } ${hl(tutorialHighlight === 'armory' && canClick)}`}
                  >
                    <div className="text-[9.5px] font-semibold leading-tight whitespace-nowrap truncate">
                      [{track.hotkey}]{track.shortName}+{lv}
                    </div>
                    <div className="font-mono-num text-[8.5px] text-slate-300 leading-tight whitespace-nowrap shrink-0">
                      {running ? (
                        '研…'
                      ) : lockMeta.maxed ? (
                        '滿'
                      ) : lockMeta.tierLocked ? (
                        lockMeta.shortLock
                      ) : (
                        <>
                          {cost}
                          <span className={gasInt < gasCost ? 'text-rose-300' : 'text-teal-300'}>/{gasCost}氣</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Row: 2 Special Techs (All 3 factions have active [K] + T3 CD-upgrade!) + Scan [S] + Faction Skill [F] */}
            <div className="grid grid-cols-4 gap-1">
              {([0, 1] as const).map((slot) => {
                const st = getSpecialTechUiState(slot);
                const isKActiveUnlocked = slot === 0 && st.curLv >= 1;
                if (isKActiveUnlocked) {
                  const kCd = snap.player.kActiveCooldown ?? 0;
                  const canCast = kCd <= 0;
                  const canUpgradeOnCd =
                    kCd > 0 &&
                    st.curLv === 1 &&
                    snap.player.techTier >= 3 &&
                    !st.running &&
                    st.nextStage !== null &&
                    goldInt >= st.nextStage.cost &&
                    gasInt >= st.nextStage.gasCost;
                  const isTargetingK = snap.targetMode === 'k_boost';
                  const disabled = !canCast && !canUpgradeOnCd;
                  const lv2ShortTag = faction.id === 'dawn' ? '[K]升盾II' : '[K]升+10血';
                  const activeShortTag =
                    faction.id === 'dawn'
                      ? `[K]盾超載${st.curLv >= 2 ? 'II' : ''}`
                      : faction.id === 'swarm'
                      ? `[K]狂熱${st.curLv >= 2 ? 'II' : ''}`
                      : `[K]激勵${st.curLv >= 2 ? 'II' : ''}`;
                  const kTooltip = canCast
                    ? `[K] ${st.spec.name}（主動 · 冷卻 ${IRON_K_BOOST_COOLDOWN}s · 範圍 ${IRON_K_BOOST_RADIUS}px）：${st.spec.desc}${
                        st.curLv === 1 && st.nextStage
                          ? `（施放進 CD 後達 T3 可再點花費 ${st.nextStage.cost}G+${st.nextStage.gasCost}氣 升級 Lv.2！）`
                          : '（已達 Lv.2 滿階）'
                      }`
                    : st.curLv === 1 && snap.player.techTier >= 3 && st.nextStage
                    ? `[K] 技能冷卻中（${Math.ceil(kCd)}s）— 點擊花費 ${st.nextStage.cost}G + ${st.nextStage.gasCost}氣 升級 ${st.nextStage.name}：${st.nextStage.desc}`
                    : `[K] 主動技冷卻中（剩 ${Math.ceil(kCd)}s）${st.curLv === 1 ? '；達 T3 時可於冷卻中點擊升級 Lv.2' : ''}`;

                  return (
                    <button
                      key={st.spec.slot}
                      type="button"
                      disabled={disabled}
                      onClick={() => (onTriggerKAction ? onTriggerKAction() : onResearchSpecialTech(0))}
                      title={kTooltip}
                      className={`px-1 py-1 rounded border text-center transition-colors ${
                        isTargetingK
                          ? 'bg-emerald-500/35 border-emerald-300 text-emerald-100 cursor-pointer'
                          : canCast
                          ? 'bg-[#10261F] border-emerald-500/75 hover:border-emerald-300 text-emerald-200 cursor-pointer'
                          : canUpgradeOnCd
                          ? 'bg-[#251833] border-fuchsia-400 hover:border-fuchsia-200 text-fuchsia-200 cursor-pointer'
                          : 'bg-[#121822] border-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <div className="text-[9.5px] font-semibold leading-tight whitespace-nowrap truncate">
                        {canUpgradeOnCd ? lv2ShortTag : activeShortTag}
                      </div>
                      <div className="font-mono-num text-[8.5px] leading-tight whitespace-nowrap">
                        {st.running
                          ? '升級中'
                          : canCast
                          ? '就緒'
                          : canUpgradeOnCd && st.nextStage
                          ? `${st.nextStage.cost}/${st.nextStage.gasCost}氣`
                          : `${Math.ceil(kCd)}s`}
                      </div>
                    </button>
                  );
                }

                const labelShort = st.nextStage ? st.nextStage.shortName : st.spec.level2?.shortName ?? st.spec.shortName;
                const tooltip = st.nextStage
                  ? `[${st.spec.hotkey}] 專屬科技【${st.nextStage.name}】(需 T${st.nextStage.tierReq} · ${st.nextStage.cost}G + ${st.nextStage.gasCost}氣 · ${st.nextStage.time}s)：${st.nextStage.desc}`
                  : `[${st.spec.hotkey}] ${st.spec.name}（已滿階）`;

                return (
                  <button
                    key={st.spec.slot}
                    type="button"
                    disabled={!st.canClick}
                    onClick={() => (slot === 0 && onTriggerKAction ? onTriggerKAction() : onResearchSpecialTech(slot))}
                    title={tooltip}
                    className={`px-1 py-1 rounded border text-center transition-colors ${
                      st.maxed
                        ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300 cursor-default'
                        : st.curLv >= 1
                        ? 'bg-[#211830] border-fuchsia-500/70 hover:border-fuchsia-300 disabled:opacity-50 text-fuchsia-200 cursor-pointer disabled:cursor-not-allowed'
                        : 'bg-[#191726] border-violet-600/60 hover:border-violet-400 disabled:opacity-45 text-violet-200 cursor-pointer disabled:cursor-not-allowed'
                    }`}
                  >
                    <div className="text-[9.5px] font-semibold leading-tight whitespace-nowrap truncate">
                      [{st.spec.hotkey}]{labelShort}
                    </div>
                    <div className="font-mono-num text-[8.5px] leading-tight whitespace-nowrap">
                      {st.maxed ? (
                        '已滿'
                      ) : st.running ? (
                        '研發中'
                      ) : st.tierLocked && st.nextStage ? (
                        `需T${st.nextStage.tierReq}`
                      ) : st.nextStage ? (
                        <>
                          {st.nextStage.cost}
                          <span className={gasInt < st.nextStage.gasCost ? 'text-rose-300' : 'text-teal-300'}>
                            /{st.nextStage.gasCost}氣
                          </span>
                        </>
                      ) : (
                        '已研'
                      )}
                    </div>
                  </button>
                );
              })}

              <button
                type="button"
                disabled={snap.player.scanCooldown > 0}
                onClick={onToggleScan}
                className={`px-1 py-1 rounded border flex flex-col items-center justify-center transition-colors ${
                  snap.targetMode === 'scan'
                    ? 'bg-sky-500/30 border-sky-300 text-sky-100 cursor-pointer'
                    : snap.player.scanCooldown > 0
                    ? 'bg-[#111720] border-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-[#162130] border-sky-700/70 hover:border-sky-400 text-sky-200 cursor-pointer'
                } ${hl(tutorialHighlight === 'scan')}`}
                title={`偵察掃描：免費 · 冷卻 ${faction.scanCooldown}s（開局鎖定 ${SCAN_INITIAL_COOLDOWN}s）· 揭露目標迷霧與潛行單位 (S)`}
              >
                <div className="flex items-center gap-0.5 text-[9.5px] font-semibold leading-tight whitespace-nowrap">
                  <Radio className="w-2.5 h-2.5 shrink-0" />
                  <span>[S]掃描</span>
                </div>
                <div className="font-mono-num text-[9px] leading-tight">
                  {snap.player.scanCooldown > 0 ? `${Math.ceil(snap.player.scanCooldown)}s` : '就緒'}
                </div>
              </button>

              <button
                type="button"
                disabled={snap.player.activeCooldown > 0 || goldInt < faction.activeCost}
                onClick={onToggleFactionSkill}
                className={`px-1 py-1 rounded border flex flex-col items-center justify-center transition-colors ${
                  snap.targetMode === 'faction_skill'
                    ? 'bg-amber-500/30 border-amber-300 text-amber-100 cursor-pointer'
                    : snap.player.activeCooldown > 0 || goldInt < faction.activeCost
                    ? 'bg-[#111720] border-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-[#1E1C18] border-amber-600/70 hover:border-amber-400 text-amber-200 cursor-pointer'
                } ${hl(tutorialHighlight === 'faction_skill' && snap.player.activeCooldown <= 0)}`}
                title={`${faction.activeName} (${faction.activeCost}G${isIronbound ? ` · 目前 ${snap.ironArtilleryWaves} 波` : ''})：${faction.activeDesc} (F)`}
              >
                <div className="flex items-center gap-0.5 text-[9.5px] font-semibold leading-tight whitespace-nowrap">
                  <Zap className="w-2.5 h-2.5 shrink-0" />
                  <span>{isIronbound ? `[F]${snap.ironArtilleryWaves}波` : '[F]技'}</span>
                </div>
                <div className="font-mono-num text-[9px] leading-tight">
                  {snap.player.activeCooldown > 0 ? `${Math.ceil(snap.player.activeCooldown)}s` : `${faction.activeCost}G`}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE THUMB-ZONE 4-TAB COMMAND DOCK (< lg, 162px + safe-area-bottom) */}
      <div className="pointer-events-auto lg:hidden bg-[#10161F] border-t border-slate-800 px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="h-[148px] flex flex-col gap-1.5">
          {/* Top Strip: 3 Lane Selector + 4 Category Tabs */}
          <div className="flex items-center justify-between gap-1.5 shrink-0">
            {/* Lane Selector (+ 4th-Lane Custom Squad tab when active) */}
            <div className="inline-flex rounded bg-[#0A1018] border border-slate-800 p-0.5 gap-0.5 shrink-0">
              {snap.activeLanes.map((lane) => {
                const isSelected = !snap.squadSelected && snap.selectedLane === lane;
                const alert = snap.laneUnderAttack[lane];
                return (
                  <button
                    key={lane}
                    type="button"
                    onClick={() => onSelectLane(lane)}
                    className={`px-2 py-1 rounded text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-slate-200 text-slate-950'
                        : alert
                        ? 'bg-rose-950/70 text-rose-200'
                        : 'text-slate-400'
                    }`}
                  >
                    {LANE_SHORT_NAMES[lane]}
                    {alert && !isSelected ? '!' : ''}
                  </button>
                );
              })}
              {snap.player.squadActive && (
                <button
                  type="button"
                  onClick={onSelectSquad}
                  className={`px-2 py-1 rounded text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    snap.squadSelected ? 'bg-cyan-300 text-slate-950' : 'bg-cyan-950/70 text-cyan-200'
                  }`}
                >
                  編{snap.playerSquadCount}
                </button>
              )}
            </div>

            {/* 4 Command Tabs */}
            <div className="grid grid-cols-4 gap-1 flex-1 min-w-0">
              {(
                [
                  { id: 'units', label: '徵兵' },
                  { id: 'tactics', label: '戰術' },
                  { id: 'build', label: '建築' },
                  { id: 'tech', label: '科技' },
                ] as Array<{ id: MobileDockTab; label: string }>
              ).map((tab) => {
                const active = mobileTab === tab.id;
                const badgeCount = tab.id === 'units' ? snap.player.trainingQueue.length : 0;
                const hasActiveMode = tab.id === 'tactics' && snap.targetMode !== 'none';
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMobileTab(tab.id)}
                    className={`py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer border ${
                      active
                        ? 'bg-sky-300/20 border-sky-400/80 text-sky-200'
                        : 'bg-[#141B25] border-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.label}
                    {badgeCount > 0 && <span className="font-mono-num text-[10px] ml-0.5 text-sky-300">({badgeCount})</span>}
                    {hasActiveMode && <span className="text-amber-300 ml-0.5">●</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Tab Body */}
          <div className="flex-1 min-h-0">
            {mobileTab === 'units' && (
              <div
                className={`h-full grid gap-1 ${
                  isIronbound && faction.units.length >= 9 ? 'grid-cols-3 grid-rows-3' : 'grid-cols-3 grid-rows-2 gap-1.5'
                }`}
              >
                {(isIronbound && faction.units.length >= 9
                  ? [0, 1, 6, 2, 3, 7, 4, 5, 8]
                  : faction.units.map((_, i) => i)
                ).map((idx) => {
                  const m = getUnitControlMeta(idx);
                  const { u } = m;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      disabled={!m.canTrain}
                      onClick={() => onTrainUnit(idx)}
                      className={`relative px-1.5 py-0.5 rounded border text-left transition-colors flex flex-col justify-between overflow-hidden ${
                        m.locked
                          ? 'bg-[#0C1118] border-slate-800/70 opacity-50'
                          : m.onCd
                          ? m.hasBarracks
                            ? 'bg-[#1D1A12] border-amber-500/70'
                            : 'bg-[#121D2B] border-sky-500/65'
                          : m.canTrain
                          ? m.activeCount > 0
                            ? 'bg-[#1C1E15] border-amber-400/75 active:bg-[#282B1E]'
                            : m.hasBarracks
                            ? 'bg-[#19202B] border-amber-500/55 active:bg-[#252E3E]'
                            : u.armorClass === 'heavy'
                            ? 'bg-[#17202D] border-slate-600 active:bg-[#223044]'
                            : 'bg-[#161F2C] border-slate-700 active:bg-[#1F2C3E]'
                          : 'bg-[#121822] border-slate-800 opacity-65'
                      } ${hl(tutorialHighlight === 'unit_0' && idx === 0)}`}
                    >
                      <div className="flex items-center justify-between gap-0.5">
                        <span className="text-[9.5px] font-bold text-slate-100 truncate leading-tight">
                          [{u.hotkey}]{u.name}
                          {m.hasBarracks && (
                            <span className={`font-mono-num ml-0.5 ${m.activeCount > 0 ? 'text-amber-300' : 'text-amber-500/70'}`}>
                              {m.activeCount > 0 ? `${m.activeCount}/${m.maxBatch}` : `×${m.maxBatch}`}
                            </span>
                          )}
                        </span>
                        <span
                          className={`font-mono-num text-[9px] font-bold shrink-0 ${
                            m.onCd
                              ? m.hasBarracks
                                ? 'text-amber-300'
                                : 'text-sky-300'
                              : 'text-amber-300'
                          }`}
                        >
                          {m.techLocked ? (
                            `T${u.tier}`
                          ) : m.barracksLocked ? (
                            `T${m.reqBkTier}營${m.reqBkLevel > 1 ? m.reqBkLevel : ''}`
                          ) : m.onCd ? (
                            `${m.unitOrder!.remaining.toFixed(1)}s`
                          ) : (
                            <>
                              {u.cost}
                              {u.gasCost > 0 && (
                                <span className={m.lackGas ? 'text-rose-400 ml-0.5' : 'text-teal-300 ml-0.5'}>
                                  {u.gasCost}氣
                                </span>
                              )}
                            </>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-0.5 text-[9px] leading-tight">
                        <span className={`${m.tag.className} whitespace-nowrap`}>
                          {m.tag.text}
                          {u.canHitAir && <span className="text-sky-400 font-normal ml-0.5">↑</span>}
                          {u.detector && <span className="text-cyan-300 font-bold ml-0.5">偵</span>}
                          {u.cloakDurationSec && <span className="text-violet-300 font-bold ml-0.5">隱</span>}
                        </span>
                        <span className={`font-mono-num whitespace-nowrap ${m.overSupply && !m.locked ? 'text-rose-400' : 'text-slate-400'}`}>
                          {u.supplyCost}人·{u.trainTime}s
                        </span>
                      </div>

                      {m.activeCount > 0 && (
                        <div className="absolute inset-x-0 bottom-0 h-1 flex gap-px bg-slate-900/90">
                          {Array.from({ length: m.maxBatch }).map((_, sIdx) => {
                            const ord = m.unitOrders[sIdx];
                            const pct = ord ? 1 - ord.remaining / Math.max(0.1, ord.total) : 0;
                            return (
                              <div key={sIdx} className="flex-1 h-full bg-slate-800 overflow-hidden">
                                {ord && (
                                  <div
                                    className={`h-full origin-left ${m.hasBarracks ? 'bg-amber-400' : 'bg-sky-400'}`}
                                    style={{ transform: `scaleX(${pct})` }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {mobileTab === 'tactics' && (
              <div className="h-full flex flex-col justify-between gap-1.5">
                <div className="grid grid-cols-5 gap-1 flex-1">
                  {(
                    [
                      { id: 'push', label: '[5]推進' },
                      { id: 'all_in', label: '[6]強攻' },
                      { id: 'hold_tower', label: '[7]守塔' },
                      { id: 'defend_base', label: '[8]回堡' },
                      { id: 'retreat', label: '[9]撤退' },
                    ] as Array<{ id: LaneStance; label: string }>
                  ).map((st) => {
                    const active = activeStance === st.id;
                    const activeTone =
                      st.id === 'retreat'
                        ? 'bg-rose-500/30 text-rose-100 border-rose-400/80'
                        : st.id === 'defend_base'
                        ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/70'
                        : st.id === 'all_in'
                        ? 'bg-amber-500/25 text-amber-200 border-amber-400/70'
                        : 'bg-sky-500/25 text-sky-200 border-sky-400/70';
                    const idleTone =
                      st.id === 'retreat'
                        ? 'bg-[#1D1318] text-rose-300 border-rose-900/70'
                        : 'bg-[#141B25] text-slate-300 border-slate-800';
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => onSetStance(snap.selectedLane, st.id)}
                        className={`rounded text-[10px] font-semibold transition-colors whitespace-nowrap border cursor-pointer ${
                          active ? activeTone : idleTone
                        } ${hl(tutorialHighlight === 'stances' && (st.id === 'push' || st.id === 'all_in'))}`}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-1.5 flex-1">
                  {snap.player.squadActive ? (
                    <button
                      type="button"
                      onClick={onDisbandSquad}
                      className="px-2 rounded border bg-rose-950/60 border-rose-500/70 text-rose-100 flex flex-col items-center justify-center transition-colors"
                    >
                      <div className="text-xs font-semibold whitespace-nowrap">[⇧R]解散 ({snap.playerSquadCount})</div>
                      <span className="font-mono-num text-[10px] text-rose-200/80">回歸最近戰線</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAmbush && !isAmbushTargeting}
                      onClick={onToggleAmbush}
                      className={`px-2 rounded border flex flex-col items-center justify-center transition-colors ${
                        isAmbushTargeting
                          ? 'bg-cyan-500/30 border-cyan-300 text-cyan-100'
                          : canAmbush
                          ? 'bg-[#132528] border-teal-600/70 text-teal-200'
                          : 'bg-[#111720] border-slate-800 text-slate-500'
                      } ${hl(tutorialHighlight === 'ambush')}`}
                    >
                      <div className="flex items-center gap-1 text-xs font-semibold whitespace-nowrap">
                        <Crosshair className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {snap.targetMode === 'ambush_select'
                            ? '取消框選'
                            : snap.targetMode === 'ambush_target'
                            ? `點地(${snap.pendingAmbushCount})`
                            : '[X]奇襲'}
                        </span>
                      </div>
                      <span className="font-mono-num text-[10px]">
                        {snap.player.ambushCooldown > 0
                          ? `冷卻 ${snap.player.ambushCooldown.toFixed(1)}s`
                          : '免費框選'}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={snap.player.scanCooldown > 0}
                    onClick={onToggleScan}
                    className={`px-2 rounded border flex flex-col items-center justify-center transition-colors ${
                      snap.targetMode === 'scan'
                        ? 'bg-sky-500/30 border-sky-300 text-sky-100'
                        : snap.player.scanCooldown > 0
                        ? 'bg-[#111720] border-slate-800 text-slate-500'
                        : 'bg-[#162130] border-sky-700/70 text-sky-200'
                    } ${hl(tutorialHighlight === 'scan')}`}
                  >
                    <div className="flex items-center gap-1 text-xs font-semibold whitespace-nowrap">
                      <Radio className="w-3.5 h-3.5 shrink-0" />
                      <span>[S]掃描</span>
                    </div>
                    <span className="font-mono-num text-[10px]">
                      {snap.player.scanCooldown > 0 ? `冷卻 ${Math.ceil(snap.player.scanCooldown)}s` : '免費就緒'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={snap.player.activeCooldown > 0 || goldInt < faction.activeCost}
                    onClick={onToggleFactionSkill}
                    className={`px-2 rounded border flex flex-col items-center justify-center transition-colors ${
                      snap.targetMode === 'faction_skill'
                        ? 'bg-amber-500/30 border-amber-300 text-amber-100'
                        : snap.player.activeCooldown > 0 || goldInt < faction.activeCost
                        ? 'bg-[#111720] border-slate-800 text-slate-500'
                        : 'bg-[#1E1C18] border-amber-600/70 text-amber-200'
                    } ${hl(tutorialHighlight === 'faction_skill' && snap.player.activeCooldown <= 0)}`}
                  >
                    <div className="flex items-center gap-1 text-xs font-semibold whitespace-nowrap truncate max-w-full">
                      <Zap className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">[F]{isIronbound ? `砲擊${snap.ironArtilleryWaves}波` : faction.activeName}</span>
                    </div>
                    <span className="font-mono-num text-[10px]">
                      {snap.player.activeCooldown > 0
                        ? `冷卻 ${Math.ceil(snap.player.activeCooldown)}s`
                        : `${faction.activeCost}G`}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {mobileTab === 'build' && (
              <div className="h-full flex flex-col justify-between gap-1">
                <div className={`grid gap-1 ${faction.towerTypes.length === 4 ? 'grid-cols-5' : 'grid-cols-4'}`}>
                  {faction.towerTypes.map((tt, tIdx) => {
                    const def = TOWER_DEFS[tt];
                    const selected = snap.selectedTowerType === tt;
                    return (
                      <button
                        key={tt}
                        type="button"
                        onClick={() => onSelectTowerType(tt)}
                        className={`py-0.5 rounded text-[10px] font-semibold transition-colors whitespace-nowrap border cursor-pointer ${
                          selected
                            ? 'bg-slate-700 text-slate-50 border-slate-400'
                            : 'bg-[#141B25] text-slate-400 border-slate-800'
                        }`}
                      >
                        ⇧{tIdx + 1}{def.shortLabel}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={onQuickBuildTower}
                    className={`py-0.5 rounded bg-[#162231] active:bg-[#1E2E42] border border-sky-600/80 text-[10px] font-bold text-sky-200 whitespace-nowrap cursor-pointer ${hl(tutorialHighlight === 'quick_tower')}`}
                  >
                    [T]{selectedTowerDef.cost}
                  </button>
                </div>

                {/* Mobile Base Barracks Row (Lv.1-4) + 3-Way Tower Upgrade Mode Toggle */}
                <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1">
                  {BARRACKS_TIERS.map((tier, bIdx) => {
                    const def = BARRACKS_DEFS[tier];
                    const bkKey = [',', '.', '/'][bIdx];
                    const bkStatus = snap.playerBarracks?.find((b) => b.tier === tier);
                    const built = Boolean(bkStatus?.built);
                    const building = Boolean(bkStatus?.building);
                    const level = bkStatus?.level ?? (built ? 1 : 0);
                    const nextUp = getBarracksNextUpgrade(tier, level);
                    const tierLocked = snap.player.techTier < tier;
                    const canClickBk = !building && !tierLocked && nextUp !== null && goldInt >= nextUp.cost;
                    const isMaxed = built && level >= 4 && !building;
                    return (
                      <button
                        key={tier}
                        type="button"
                        disabled={!canClickBk}
                        onClick={() => onBuildBarracks(tier)}
                        className={`py-0.5 px-1 rounded border text-[9.5px] font-semibold whitespace-nowrap truncate ${
                          isMaxed
                            ? 'bg-amber-950/45 border-amber-500/60 text-amber-300'
                            : building
                            ? 'bg-sky-950/45 border-sky-500/60 text-sky-200'
                            : canClickBk
                            ? built
                              ? 'bg-[#1D2419] border-emerald-500/75 text-emerald-200'
                              : 'bg-[#1A1C24] active:bg-[#252630] border-amber-600/75 text-amber-200'
                            : 'bg-[#121720] border-slate-800 text-slate-500 opacity-55'
                        } ${hl(tutorialHighlight === 'barracks_1' && tier === 1)}`}
                      >
                        {building
                          ? `[${bkKey}]${Math.ceil(bkStatus!.buildRemaining)}s`
                          : isMaxed
                          ? `[${bkKey}]T${tier}×4✓`
                          : tierLocked
                          ? `[${bkKey}]需T${tier}`
                          : built && nextUp
                          ? `[${bkKey}]升${nextUp.nextLevel} ${nextUp.cost}`
                          : `[${bkKey}]${def.shortName}${def.cost}`}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={cycleTowerUpgradeMode}
                    className={`px-1.5 py-0.5 rounded border text-[9.5px] font-bold whitespace-nowrap cursor-pointer ${
                      snap.towerUpgradeMode === 'mining'
                        ? 'bg-amber-950/60 border-amber-400/80 text-amber-200'
                        : snap.towerUpgradeMode === 'tech'
                        ? canUseTowerTech
                          ? 'bg-violet-950/70 border-violet-400/80 text-violet-200'
                          : 'bg-slate-900/80 border-violet-700/50 text-violet-300/70'
                        : 'bg-sky-950/50 border-sky-500/70 text-sky-200'
                    }`}
                  >
                    [;]
                    {snap.towerUpgradeMode === 'mining'
                      ? '⛏礦'
                      : snap.towerUpgradeMode === 'tech'
                      ? canUseTowerTech
                        ? '⚡科'
                        : '🔒科'
                      : '⚔強'}
                  </button>
                </div>

                {/* Mobile Prerequisite Armory Buildings + Gas Extractor */}
                <div className="grid grid-cols-3 gap-1">
                  {(['bio_lab', 'mech_bay'] as ArmoryBuildingKind[]).map((kind) => {
                    const def = ARMORY_BUILDING_DEFS[kind];
                    const st = kind === 'bio_lab' ? bioLabStatus : mechBayStatus;
                    const built = Boolean(st?.built);
                    const building = Boolean(st?.building);
                    const canClick = !built && !building && goldInt >= def.cost;
                    return (
                      <button
                        key={kind}
                        type="button"
                        disabled={!canClick}
                        onClick={() => onBuildArmory(kind)}
                        className={`py-0.5 px-1 rounded border text-[9.5px] font-semibold whitespace-nowrap truncate ${
                          built
                            ? 'bg-emerald-950/45 border-emerald-500/60 text-emerald-300'
                            : building
                            ? 'bg-sky-950/45 border-sky-500/60 text-sky-200'
                            : canClick
                            ? 'bg-[#17212C] border-teal-500/60 text-teal-200'
                            : 'bg-[#121720] border-slate-800 text-slate-500 opacity-55'
                        } ${hl(tutorialHighlight === 'armory' && !built && !building)}`}
                      >
                        {built
                          ? `[${def.hotkey}]${def.shortName}✓`
                          : building
                          ? `[${def.hotkey}]${Math.ceil(st!.buildRemaining)}s`
                          : `[${def.hotkey}]${def.shortName} ${def.cost}G`}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={!canClickExtractor}
                    onClick={onBuildExtractor}
                    className={`py-0.5 px-1 rounded bg-[#112426] disabled:opacity-45 border border-teal-600/70 text-[9.5px] font-semibold text-teal-200 whitespace-nowrap truncate ${hl(tutorialHighlight === 'depot_extractor' && snap.playerExtractorsBuilt + snap.playerExtractorsUpgrading < 1)}`}
                  >
                    [P]瓦斯 {snap.playerExtractorsBuilt}/{snap.playerExtractorsTotal}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    disabled={!canBuildDepot}
                    onClick={onBuildDepot}
                    className={`py-1 px-1 rounded bg-[#16202D] disabled:opacity-45 border border-slate-700 text-[10px] font-semibold text-cyan-200 whitespace-nowrap truncate ${hl(tutorialHighlight === 'depot_extractor' && depotsTotal < 1)}`}
                  >
                    {depotCapReached
                      ? depotsTotal >= 6
                        ? '[B]補給滿'
                        : `[B]控區${depotsTotal}/${snap.playerMaxDepotsAllowed}`
                      : `[B]補${SUPPLY_DEPOT_COST} ${depotsTotal}/${snap.playerMaxDepotsAllowed}`}
                  </button>

                  <button
                    type="button"
                    disabled={
                      econRunning ||
                      econCost === null ||
                      econTowerLocked ||
                      goldInt < econCost
                    }
                    onClick={onUpgradeEcon}
                    className={`py-1 px-1 rounded bg-[#16202D] disabled:opacity-45 border border-slate-700 text-[10px] font-semibold text-amber-200 whitespace-nowrap truncate ${hl(tutorialHighlight === 'econ_tech' && snap.player.econLevel < 2 && !econRunning)}`}
                  >
                    {econRunning
                      ? '[A]採礦中'
                      : econCost === null
                      ? '[A]礦滿級'
                      : econTowerLocked
                      ? `[A]需${econReqTowers}塔`
                      : `[A]礦${snap.player.econLevel + 1} ${econCost}`}
                  </button>

                  <button
                    type="button"
                    disabled={techRunning || techCost === null || goldInt < techCost || gasInt < techGasCost}
                    onClick={onUpgradeTech}
                    className={`py-1 px-1 rounded bg-[#16202D] disabled:opacity-45 border border-slate-700 text-[10px] font-semibold text-emerald-200 whitespace-nowrap truncate ${hl(tutorialHighlight === 'econ_tech' && snap.player.techTier < 2 && !techRunning)}`}
                  >
                    {techRunning
                      ? '[D]升階中'
                      : techCost
                      ? techGasCost > 0
                        ? `[D]T${snap.player.techTier + 1} ${techCost}+${techGasCost}氣`
                        : `[D]T${snap.player.techTier + 1} ${techCost}G`
                      : '[D]T3滿'}
                  </button>
                </div>
              </div>
            )}

            {mobileTab === 'tech' && (
              <div className="h-full flex flex-col justify-between gap-1">
                <div className={`grid grid-cols-3 gap-1 ${armoryTrackList.length > 3 ? '' : 'flex-1'}`}>
                  {armoryTrackList.map(({ id, def: track, kind, accent }) => {
                    const lv = snap.player.armoryLevels[id] ?? 0;
                    const running = hasResearchKind(kind);
                    const lockMeta = getArmoryLockMeta(id, lv);
                    const cost = lockMeta.maxed ? null : track.costs[lv];
                    const gasCost = lockMeta.maxed ? 0 : (track.gasCosts[lv] ?? 0);
                    const canClick =
                      !lockMeta.maxed &&
                      !running &&
                      !lockMeta.tierLocked &&
                      cost !== null &&
                      goldInt >= cost &&
                      gasInt >= gasCost;
                    const compact = armoryTrackList.length > 3;

                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={!canClick}
                        onClick={() => onUpgradeArmoryTrack(id)}
                        className={`rounded border bg-[#141D26] border-slate-700 disabled:opacity-45 leading-tight ${accent} ${
                          compact
                            ? 'px-1.5 py-1 flex items-center justify-between gap-1'
                            : 'px-1.5 py-1 flex flex-col items-center justify-center text-center'
                        } ${hl(tutorialHighlight === 'armory' && canClick)}`}
                      >
                        <span className="text-[10px] font-semibold truncate">
                          [{track.hotkey}]{track.shortName}+{lv}
                        </span>
                        <span className="font-mono-num text-[9px] text-slate-300 shrink-0">
                          {running ? (
                            '研…'
                          ) : lockMeta.maxed ? (
                            '滿'
                          ) : lockMeta.tierLocked ? (
                            lockMeta.shortLock
                          ) : (
                            <>
                              {cost}
                              <span className={gasInt < gasCost ? 'text-rose-300' : 'text-teal-300'}>/{gasCost}氣</span>
                            </>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-1.5 flex-1">
                  {([0, 1] as const).map((slot) => {
                    const st = getSpecialTechUiState(slot);
                    const isKActiveUnlocked = slot === 0 && st.curLv >= 1;
                    if (isKActiveUnlocked) {
                      const kCd = snap.player.kActiveCooldown ?? 0;
                      const canCast = kCd <= 0;
                      const canUpgradeOnCd =
                        kCd > 0 &&
                        st.curLv === 1 &&
                        snap.player.techTier >= 3 &&
                        !st.running &&
                        st.nextStage !== null &&
                        goldInt >= st.nextStage.cost &&
                        gasInt >= st.nextStage.gasCost;
                      const isTargetingK = snap.targetMode === 'k_boost';
                      return (
                        <button
                          key={st.spec.slot}
                          type="button"
                          disabled={!canCast && !canUpgradeOnCd}
                          onClick={() => (onTriggerKAction ? onTriggerKAction() : onResearchSpecialTech(0))}
                          className={`px-2 py-1 rounded border text-left flex flex-col justify-center leading-tight ${
                            isTargetingK
                              ? 'bg-emerald-500/35 border-emerald-300 text-emerald-100'
                              : canCast
                              ? 'bg-[#10261F] border-emerald-500/75 text-emerald-200'
                              : canUpgradeOnCd
                              ? 'bg-[#251833] border-fuchsia-400 text-fuchsia-200'
                              : 'bg-[#121822] border-slate-800 text-slate-500 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10.5px] font-bold truncate">
                              {canUpgradeOnCd
                                ? faction.id === 'dawn'
                                  ? '升盾超載II'
                                  : '升生物體質 +10血'
                                : `${st.spec.shortName} [K]${st.curLv >= 2 ? ' II' : ''}`}
                            </span>
                            <span className="font-mono-num text-[9px] shrink-0">
                              {st.running
                                ? '升級中'
                                : canCast
                                ? '就緒'
                                : canUpgradeOnCd && st.nextStage
                                ? `${st.nextStage.cost}/${st.nextStage.gasCost}氣`
                                : `${Math.ceil(kCd)}s`}
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-400 truncate mt-0.5">
                            {canUpgradeOnCd && st.nextStage
                              ? `CD中點此升Lv.2：${st.nextStage.desc}`
                              : faction.id === 'dawn'
                              ? '回+35盾 · 靈能激勵3s／機械架設3s'
                              : faction.id === 'swarm'
                              ? '扣10%血激發3s蟲巢狂熱'
                              : '生物鼓舞3s／機械架設3s（射程+35% 傷+6）'}
                          </span>
                        </button>
                      );
                    }

                    const titleText = st.nextStage ? st.nextStage.name : st.spec.level2?.name ?? st.spec.name;
                    const descText = st.nextStage ? st.nextStage.desc : st.spec.level2?.desc ?? st.spec.desc;

                    return (
                      <button
                        key={st.spec.slot}
                        type="button"
                        disabled={!st.canClick}
                        onClick={() => (slot === 0 && onTriggerKAction ? onTriggerKAction() : onResearchSpecialTech(slot))}
                        className={`px-2 py-1 rounded border text-left flex flex-col justify-center leading-tight ${
                          st.maxed
                            ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300'
                            : st.curLv >= 1
                            ? 'bg-[#211830] border-fuchsia-500/70 disabled:opacity-50 text-fuchsia-200'
                            : 'bg-[#191726] border-violet-600/60 disabled:opacity-45 text-violet-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10.5px] font-bold truncate">[{st.spec.hotkey}]{titleText}</span>
                          <span className="font-mono-num text-[9px] shrink-0">
                            {st.maxed ? (
                              '已滿'
                            ) : st.running ? (
                              '研發中'
                            ) : st.tierLocked && st.nextStage ? (
                              `需T${st.nextStage.tierReq}`
                            ) : st.nextStage ? (
                              <>
                                {st.nextStage.cost}
                                <span className={gasInt < st.nextStage.gasCost ? 'text-rose-300' : 'text-teal-300'}>
                                  /{st.nextStage.gasCost}氣
                                </span>
                              </>
                            ) : (
                              '已研'
                            )}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400 truncate mt-0.5">{descText}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* IN-GAME FADING CHAT OVERLAY (PLAYER PVP) */}
      {pvpInfo && (
        <InGameChatOverlay
          messages={pvpInfo.chatMessages}
          open={pvpInfo.chatOpen}
          onOpenChange={pvpInfo.onChatOpenChange}
          onSend={pvpInfo.onSendChat}
        />
      )}

      {/* PAUSE / PVP INFO MODAL */}
      {(snap.screen === 'PAUSED' || (Boolean(pvpInfo?.menuOpen) && snap.screen === 'PLAYING')) && (
        <div className="pointer-events-auto fixed inset-0 z-30 bg-[#070B10]/85 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto overscroll-contain bg-[#121923] border border-slate-700 rounded-lg p-4 sm:p-6 space-y-4 sm:space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-50">
                {pvpInfo ? '線上對戰選單' : '戰局已暫停'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {pvpInfo
                  ? `房號 ${pvpInfo.roomCode} · 對手 ${pvpInfo.opponentName}（線上戰局即時進行中）`
                  : `時間 ${formatTime(snap.elapsed)} · 滿足科技樹即可自由同時並行研發`}
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300 border-y border-slate-800 py-3 font-mono-num">
              <div className="flex justify-between">
                <span className="text-slate-400">主堡礦脈剩餘</span>
                <span>
                  {nexusGold} / {snap.player.nexusGoldMax} G
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">前線塔區總儲量（{snap.playerStandingTowers} 座防禦塔）</span>
                <span>{Math.ceil(snap.playerSectorGoldTotal)} G</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">控區解鎖補給站 / 人口（上限 {MAX_SUPPLY_LIMIT}）</span>
                <span>
                  {snap.playerDepotsBuilt}/{snap.playerMaxDepotsAllowed} 座 · {snap.playerSupplyUsed}/{snap.playerSupplyCap}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400 shrink-0">文明軍械科技</span>
                <span className="text-right">
                  {armoryTrackList
                    .map(({ id, def: tr }) => `${tr.shortName}+${snap.player.armoryLevels[id] ?? 0}`)
                    .join(' · ')}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400 shrink-0">專屬科技</span>
                <span className="text-right">
                  {([0, 1] as const)
                    .map((slot) => {
                      const sp = faction.specialTechs[slot];
                      const lv = snap.player.specialTechLevels?.[slot] ?? (snap.player.specialTechsDone[slot] ? 1 : 0);
                      const status = lv >= 2 ? 'II滿' : lv === 1 ? (sp.level2 ? 'I階' : '已研') : '未研';
                      return `${sp.shortName}:${status}`;
                    })
                    .join(' · ')}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5">
              {pvpInfo ? (
                <>
                  {onSurrender && (
                    <button
                      type="button"
                      onClick={onSurrender}
                      className="px-4 py-2 rounded text-xs font-medium text-rose-200 bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/60 cursor-pointer whitespace-nowrap"
                    >
                      投降認輸
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onReturnTitle}
                    className="px-4 py-2 rounded text-xs font-medium text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 cursor-pointer whitespace-nowrap"
                  >
                    離開房間
                  </button>
                  <button
                    type="button"
                    onClick={onTogglePause}
                    className="px-5 py-2 rounded text-xs font-bold text-slate-950 bg-sky-300 hover:bg-sky-200 cursor-pointer whitespace-nowrap"
                  >
                    回到戰場
                  </button>
                </>
              ) : (
                <>
                  {onSurrender && (
                    <button
                      type="button"
                      onClick={onSurrender}
                      className="px-4 py-2 rounded text-xs font-medium text-rose-200 bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/60 cursor-pointer whitespace-nowrap"
                    >
                      投降看結算
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onReturnTitle}
                    className="px-4 py-2 rounded text-xs font-medium text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 cursor-pointer whitespace-nowrap"
                  >
                    返回文明選擇
                  </button>
                  <button
                    type="button"
                    onClick={onRestart}
                    className="px-4 py-2 rounded text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 cursor-pointer whitespace-nowrap"
                  >
                    重新開局
                  </button>
                  <button
                    type="button"
                    onClick={onTogglePause}
                    className="px-5 py-2 rounded text-xs font-bold text-slate-950 bg-sky-300 hover:bg-sky-200 cursor-pointer whitespace-nowrap"
                  >
                    繼續戰鬥
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER / VICTORY MODAL */}
      {snap.screen === 'GAME_OVER' && (
        <div className="pointer-events-auto fixed inset-0 z-30 bg-[#070B10]/88 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto overscroll-contain bg-[#121923] border border-slate-700 rounded-lg p-4 sm:p-6 space-y-4 sm:space-y-5">
            <div className="border-b border-slate-800 pb-4">
              <div
                className={`text-xs font-semibold tracking-wider ${
                  snap.winner === 'player' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {snap.tutorialMode && snap.winner === 'player'
                  ? 'TUTORIAL COMPLETE · 新手實戰教學結業'
                  : snap.winner === 'player'
                  ? 'VICTORY · 戰役勝利'
                  : snap.player.nexusHp > 0
                  ? 'DEFEAT · 投降結算'
                  : 'DEFEAT · 主堡陷落'}
              </div>
              <h2 className="text-2xl font-bold text-slate-50 mt-1">
                {snap.tutorialMode && snap.winner === 'player'
                  ? '恭喜結業！你已掌握全盤指揮'
                  : snap.winner === 'player'
                  ? '成功擊敗對手'
                  : snap.player.nexusHp > 0
                  ? '我方已宣告投降'
                  : '我方主堡已陷落'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                戰局時長 <span className="font-mono-num text-slate-200">{formatTime(snap.elapsed)}</span>
              </p>
            </div>

            {/* Post-Game Asymmetric Intel Reveal / PvP Opponent Summary */}
            {snap.tutorialMode ? (
              <div className="p-3.5 rounded bg-[#0C1D22] border border-teal-500/45 space-y-1.5">
                <div className="text-xs text-teal-300 font-semibold">結業總結 · 你已學會所有核心戰術</div>
                <div className="text-xs text-slate-200 leading-relaxed">
                  三線出兵與姿態控場、防禦塔經濟、補給與瓦斯雙資源、兵營多組並行、前置研究建築與攻防升級、迷霧掃描反隱、奇襲第四路與陣營大招皆已實戰演練完成。
                </div>
                <div className="text-xs text-amber-200 pt-0.5">
                  建議接下來挑戰「單人 AI 標準三線」或到「線上對戰」與好友開房切磋！
                </div>
              </div>
            ) : pvpInfo ? (
              <div className="p-3.5 rounded bg-[#0D131C] border border-slate-800 space-y-1">
                <div className="text-xs text-slate-400">線上 1v1 對戰結算 · 房號 {pvpInfo.roomCode}</div>
                <div className="text-sm font-bold text-sky-300">
                  對手：{pvpInfo.opponentName}（{FACTIONS[snap.enemyFinalStats.faction].name}）
                </div>
                {pvpInfo.opponentIsAi && (
                  <div className="text-xs text-amber-200/90">
                    {AI_ARCHETYPE_LABELS[snap.aiArchetype].name} — {AI_ARCHETYPE_LABELS[snap.aiArchetype].counterHint}
                  </div>
                )}
                {pvpInfo.countdownSeconds != null && pvpInfo.countdownSeconds > 0 ? (
                  <div className="mt-2 px-3 py-2 rounded bg-emerald-950/85 border border-emerald-400/75 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded bg-emerald-400 text-slate-950 font-mono-num text-base font-black flex items-center justify-center shrink-0 animate-pulse">
                      {pvpInfo.countdownSeconds}
                    </span>
                    <span className="text-xs font-bold text-emerald-200">
                      雙方準備完成！{pvpInfo.countdownSeconds} 秒後立即展開下一局對戰…
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">
                    {pvpInfo.opponentRematchVoted && !pvpInfo.rematchVoted
                      ? '對手已請求再戰，點擊右側按鈕即可進入開戰倒數！'
                      : pvpInfo.rematchVoted
                      ? '已送出再戰請求，等待對手同意…'
                      : '點擊「請求再戰」可於同房直接展開下一回合。'}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded bg-[#0D131C] border border-slate-800 space-y-1.5">
                <div className="text-xs text-slate-400">情報解密 · 本局電腦 AI 戰術與反制解析</div>
                <div className="text-sm font-bold text-amber-300">
                  {FACTIONS[snap.enemyFinalStats.faction].name} — {AI_ARCHETYPE_LABELS[snap.aiArchetype].name}
                </div>
                <div className="text-xs text-slate-300">{AI_ARCHETYPE_LABELS[snap.aiArchetype].desc}</div>
                <div className="text-xs text-emerald-300 font-medium pt-0.5">
                  {AI_ARCHETYPE_LABELS[snap.aiArchetype].counterHint}
                </div>
              </div>
            )}

            {/* Clean Tabular Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div className="font-semibold text-sky-300 border-b border-slate-800 pb-1">
                  我方（{faction.name}）
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">最終科技 / 採礦</span>
                  <span className="font-mono-num text-slate-100">
                    T{snap.player.techTier} / Lv.{snap.player.econLevel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">徵召部隊總數</span>
                  <span className="font-mono-num text-slate-100">{snap.player.unitsTrained}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">奪取野區目標</span>
                  <span className="font-mono-num text-slate-100">{snap.player.objectivesClaimed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">奇襲 / 掃描次數</span>
                  <span className="font-mono-num text-slate-100">
                    {snap.player.ambushesLaunched} / {snap.player.scansUsed}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-rose-300 border-b border-slate-800 pb-1">
                  {pvpInfo ? pvpInfo.opponentName : '敵方'}（{FACTIONS[snap.enemyFinalStats.faction].name}）
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">最終科技 / 採礦</span>
                  <span className="font-mono-num text-slate-100">
                    T{snap.enemyFinalStats.techTier} / Lv.{snap.enemyFinalStats.econLevel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">徵召部隊總數</span>
                  <span className="font-mono-num text-slate-100">{snap.enemyFinalStats.unitsTrained}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">奪取野區目標</span>
                  <span className="font-mono-num text-slate-100">{snap.enemyFinalStats.objectivesClaimed}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onReturnTitle}
                className="px-4 py-2 rounded text-xs font-medium text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 cursor-pointer whitespace-nowrap"
              >
                {pvpInfo ? '返回大廳' : snap.tutorialMode ? '返回主畫面' : '切換文明'}
              </button>
              {snap.tutorialMode && onStartSoloAfterTutorial ? (
                <button
                  type="button"
                  onClick={onStartSoloAfterTutorial}
                  className="px-6 py-2 rounded text-xs font-bold text-slate-950 bg-teal-300 hover:bg-teal-200 cursor-pointer whitespace-nowrap"
                >
                  開始正式單人對戰
                </button>
              ) : (
                <button
                  type="button"
                  disabled={Boolean(
                    pvpInfo &&
                      ((pvpInfo.countdownSeconds != null && pvpInfo.countdownSeconds > 0) ||
                        (!pvpInfo.opponentIsAi && (pvpInfo.rematchVoted || !pvpInfo.opponentConnected)))
                  )}
                  onClick={onRestart}
                  className="px-6 py-2 rounded text-xs font-bold text-slate-950 bg-amber-300 hover:bg-amber-200 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {pvpInfo
                    ? pvpInfo.countdownSeconds != null && pvpInfo.countdownSeconds > 0
                      ? `開戰倒數 ${pvpInfo.countdownSeconds}s…`
                      : pvpInfo.opponentIsAi
                      ? '再戰一局'
                      : !pvpInfo.opponentConnected
                      ? '對手已離開'
                      : pvpInfo.rematchVoted
                      ? '等待對手確認…'
                      : pvpInfo.opponentRematchVoted
                      ? '接受再戰！'
                      : '請求再戰'
                    : '再戰一局'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
