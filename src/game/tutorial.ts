import { GameSnapshot } from './types';

export type TutorialStepId =
  | 'train_unit'
  | 'set_stance'
  | 'build_tower'
  | 'build_econ_infra'
  | 'build_barracks'
  | 'upgrade_econ_tech'
  | 'armory_upgrade'
  | 'use_scan'
  | 'use_ambush'
  | 'final_push';

export type TutorialHighlightId =
  | 'unit_0'
  | 'stances'
  | 'quick_tower'
  | 'depot_extractor'
  | 'barracks_1'
  | 'econ_tech'
  | 'armory'
  | 'scan'
  | 'ambush'
  | 'faction_skill';

export type TutorialMobileTab = 'units' | 'tactics' | 'build' | 'tech';

export interface TutorialRuntimeFlags {
  stanceChanged: boolean;
  factionSkillUsed: boolean;
}

export interface TutorialCheckItem {
  label: string;
  done: boolean;
}

export interface TutorialStepDef {
  id: TutorialStepId;
  stepNumber: number;
  title: string;
  summary: string;
  tip: string;
  hotkeys: string;
  highlight: TutorialHighlightId;
  mobileTab: TutorialMobileTab;
  rewardGold: number;
  rewardGas: number;
  rewardNote?: string;
  evaluate: (snap: GameSnapshot, flags: TutorialRuntimeFlags) => {
    done: boolean;
    checks: TutorialCheckItem[];
  };
}

export const TUTORIAL_STEPS: TutorialStepDef[] = [
  {
    id: 'train_unit',
    stepNumber: 1,
    title: '徵召首批部隊',
    summary: '點擊底部發亮的「突擊步兵」按鈕，或直接按鍵盤 [Q] 訓練第 1 支步兵小隊。',
    tip: '可按 [1] / [2] 或點擊地圖切換上路／下路出兵位置。',
    hotkeys: '[Q] 訓練步兵 · [1]/[2] 切換戰線',
    highlight: 'unit_0',
    mobileTab: 'units',
    rewardGold: 140,
    rewardGas: 0,
    evaluate: (snap) => {
      const done = snap.player.unitsTrained >= 1 || snap.player.trainingQueue.length >= 1;
      return {
        done,
        checks: [{ label: '訓練 1 支突擊步兵 [Q]', done }],
      };
    },
  },
  {
    id: 'set_stance',
    stepNumber: 2,
    title: '下達戰線姿態指令',
    summary: '開局部隊預設為「守塔」。點擊左下姿態列「推進 [5]」或「強攻 [6]」，讓前線部隊主動壓進！',
    tip: '推進 [5] 優先殲敵；強攻 [6] 加速破塔；遇到劣勢按 [9] 或 [Z] 戰術撤退。',
    hotkeys: '[5] 推進 · [6] 強攻 · [7] 守塔 · [9/Z] 撤退',
    highlight: 'stances',
    mobileTab: 'tactics',
    rewardGold: 140,
    rewardGas: 0,
    evaluate: (snap, flags) => {
      const activeStance = snap.player.laneStances[snap.selectedLane];
      const pushed = activeStance === 'push' || activeStance === 'all_in' || flags.stanceChanged;
      return {
        done: pushed,
        checks: [{ label: '切換戰線為「推進 [5]」或「強攻 [6]」', done: pushed }],
      };
    },
  },
  {
    id: 'build_tower',
    stepNumber: 3,
    title: '建造防禦塔（視野＋經濟）',
    summary: '防禦塔不僅能守線開視野，每座塔還會持續開採該區金礦！按 [T] 快捷建塔，或直接點擊戰場發光的空塔基。',
    tip: '小技巧：對任何施工／升級中的我方建築「連點兩下」可立即取消並 100% 退還金幣！',
    hotkeys: '[T] 快捷建塔 · [⇧1~4] 選塔種 · 雙擊建築取消',
    highlight: 'quick_tower',
    mobileTab: 'build',
    rewardGold: 160,
    rewardGas: 20,
    evaluate: (snap) => {
      const done = snap.playerStandingTowers >= 1 || snap.playerTowersBuilding >= 1;
      return {
        done,
        checks: [{ label: '在空塔基建造 1 座防禦塔 [T]', done }],
      };
    },
  },
  {
    id: 'build_econ_infra',
    stepNumber: 4,
    title: '補給站與瓦斯挖掘場',
    summary: '建造「補給站 [B]」擴充人口上限（最高 100），再建造「瓦斯挖掘場 [P]」開採進階兵種所需的瓦斯！',
    tip: '瓦斯場建在主堡與防禦塔後方，後續可再次點擊升級至 Lv.3 提升產氣並強化 [F] 軌道砲擊波數。',
    hotkeys: '[B] 建造補給站 · [P] 建造瓦斯挖掘場',
    highlight: 'depot_extractor',
    mobileTab: 'build',
    rewardGold: 180,
    rewardGas: 40,
    evaluate: (snap) => {
      const depotOk = snap.playerDepotsBuilt + snap.playerDepotsBuilding >= 1;
      const gasOk = snap.playerExtractorsBuilt + snap.playerExtractorsUpgrading >= 1;
      return {
        done: depotOk && gasOk,
        checks: [
          { label: '建造 1 座補給站 [B]', done: depotOk },
          { label: '建造 1 座瓦斯挖掘場 [P]', done: gasOk },
        ],
      };
    },
  },
  {
    id: 'build_barracks',
    stepNumber: 5,
    title: '建造 T1 兵營倍增產線',
    summary: '按 [,] 或點擊基地旁的 T1 兵營空位，完工後 T1 單位可同時並行產兵（最高升至 Lv.4 一次產 4 組）！',
    tip: '精銳小隊 [Y] 需要 T1 兵營升級至 Lv.2 後才能徵召。',
    hotkeys: '[,] 建造／升級 T1 兵營 · [.] T2 兵營 · [/] T3 兵營',
    highlight: 'barracks_1',
    mobileTab: 'build',
    rewardGold: 220,
    rewardGas: 50,
    evaluate: (snap) => {
      const t1 = snap.playerBarracks.find((b) => b.tier === 1);
      const done = Boolean(t1 && (t1.built || t1.building));
      return {
        done,
        checks: [{ label: '建造 T1 兵營 [,]', done }],
      };
    },
  },
  {
    id: 'upgrade_econ_tech',
    stepNumber: 6,
    title: '升級採礦與科技時代',
    summary: '點擊「採礦 [A]」提高全場金礦產速，並點擊「T2 [D]」晉升科技時代，解鎖重裝機械與空中部隊！',
    tip: '升級 T2 不耗瓦斯，但後續 T3 與大多數攻防／專屬科技都需要瓦斯！',
    hotkeys: '[A] 升級採礦 · [D] 升級科技至 T2',
    highlight: 'econ_tech',
    mobileTab: 'build',
    rewardGold: 260,
    rewardGas: 110,
    evaluate: (snap) => {
      const econOk =
        snap.player.econLevel >= 2 ||
        snap.player.activeResearches.some((r) => r.kind === 'econ');
      const techOk =
        snap.player.techTier >= 2 ||
        snap.player.activeResearches.some((r) => r.kind === 'tech_tier');
      return {
        done: econOk && techOk,
        checks: [
          { label: '升級採礦效率 [A]', done: econOk },
          { label: '研發科技時代 T2 [D]', done: techOk },
        ],
      };
    },
  },
  {
    id: 'armory_upgrade',
    stepNumber: 7,
    title: '前置建築與軍械攻防',
    summary: '先蓋「生物研究所 [[]」（或機械軍工廠 []]），完工後按 [G / U]（或 [H / I / J / O]）花費金礦與瓦斯研發 1 項攻防！',
    tip: '實戰中生研／機廠需建造 30～32 秒且攻防皆耗瓦斯，教學模式已為你大幅加速建造。',
    hotkeys: '[[] 生物研究所 · []] 機械軍工廠 · [G/U/H/I/J/O] 攻防升級',
    highlight: 'armory',
    mobileTab: 'build',
    rewardGold: 220,
    rewardGas: 60,
    rewardNote: '掃描冷卻已就緒',
    evaluate: (snap) => {
      const buildingStarted = snap.playerArmories.some((a) => a.built || a.building);
      const trackLevels = Object.values(snap.player.armoryLevels).reduce((s, v) => s + v, 0);
      const armoryRes = snap.player.activeResearches.some((r) => r.kind.startsWith('armory_'));
      const upgradeStarted = trackLevels > 0 || armoryRes;
      return {
        done: buildingStarted && upgradeStarted,
        checks: [
          { label: '建造生物研究所 [[] 或機械軍工廠 []]', done: buildingStarted },
          { label: '研發任 1 項軍械攻防 [G / U / H / I / J / O]', done: upgradeStarted },
        ],
      };
    },
  },
  {
    id: 'use_scan',
    stepNumber: 8,
    title: '偵察掃描破除戰爭迷霧',
    summary: '按 [S] 啟動免費偵察掃描，再點擊戰場右側標記的迷霧區，即可看穿敵軍佈防並揭露隱形單位！',
    tip: '敵人從迷霧外開火時，你的人眼會看到琥珀色「開火暴露」標記，但部隊仍需掃描或推進獲得視野才能還擊。',
    hotkeys: '[S] 偵察掃描 → 點擊迷霧區',
    highlight: 'scan',
    mobileTab: 'tactics',
    rewardGold: 160,
    rewardGas: 40,
    evaluate: (snap) => {
      const done = snap.player.scansUsed >= 1;
      return {
        done,
        checks: [{ label: '對迷霧區域施放 1 次偵察掃描 [S]', done }],
      };
    },
  },
  {
    id: 'use_ambush',
    stepNumber: 9,
    title: '奇襲編隊（自由第四路）',
    summary: '按 [X] → 點擊我方部隊框選 → 再點地圖任意目標位置，即可組成不受戰線限制的「第四路奇襲小隊」！',
    tip: '奇襲編隊組成後按 [4] 可單獨控制其姿態（推進／強攻／撤退），連按兩下 [X] 或按 [⇧R] 立即解散。',
    hotkeys: '[X] 框選部隊 → 點地圖目的地 · [4] 選取編隊',
    highlight: 'ambush',
    mobileTab: 'tactics',
    rewardGold: 280,
    rewardGas: 100,
    rewardNote: '軌道砲擊 [F] 已充能，敵方靶場甦醒！',
    evaluate: (snap) => {
      const done = snap.player.ambushesLaunched >= 1 || snap.player.squadActive;
      return {
        done,
        checks: [{ label: '完成 1 次奇襲編隊出擊 [X]', done }],
      };
    },
  },
  {
    id: 'final_push',
    stepNumber: 10,
    title: '軌道砲擊與決戰推堡',
    summary: '最後一課！按 [F] 呼叫軌道砲擊轟炸敵軍陣地（注意會誤傷友軍，瞄準敵陣後方或敵堡！），並率領大軍擊破右側敵方主堡！',
    tip: '⚠ [F] 軌道砲擊會誤傷範圍內友軍！記得別炸到自己的前排部隊。',
    hotkeys: '[F] 軌道砲擊 → 點敵陣 · 擊破右側敵方主堡',
    highlight: 'faction_skill',
    mobileTab: 'tactics',
    rewardGold: 0,
    rewardGas: 0,
    evaluate: (snap, flags) => {
      const skillOk = flags.factionSkillUsed || snap.player.activeCooldown > 0;
      const winOk = snap.winner === 'player';
      return {
        done: winOk,
        checks: [
          { label: '施放陣營戰術技「軌道砲擊」[F]', done: skillOk },
          { label: '擊破右側敵方主堡獲得勝利', done: winOk },
        ],
      };
    },
  },
];

export function getTutorialStepByIndex(index: number): TutorialStepDef | null {
  if (index < 0 || index >= TUTORIAL_STEPS.length) return null;
  return TUTORIAL_STEPS[index];
}
