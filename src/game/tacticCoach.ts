import { FACTIONS } from './data';
import { TutorialHighlightId } from './tutorial';
import { AIArchetype, FactionId, GameSnapshot } from './types';

export interface TacticCoachCheck {
  label: string;
  done: boolean;
}

export interface TacticCoachStepView {
  stepNumber: number;
  totalSteps: number;
  title: string;
  mapDirection: string;
  actionSummary: string;
  hotkeys: string;
  highlight: TutorialHighlightId | null;
  checks: TacticCoachCheck[];
  allDone: boolean;
}

export interface TacticPlaybookMeta {
  id: AIArchetype;
  badge: string;
  shortName: string;
  name: string;
  focusTag: string;
  summary: string;
}

export const TACTIC_PLAYBOOK_META: Record<AIArchetype, TacticPlaybookMeta> = {
  iron_rush: {
    id: 'iron_rush',
    badge: '①',
    shortName: '步槍快攻',
    name: '① 步槍快攻流',
    focusTag: '前期搶壓・雙營暴兵',
    summary: '跳過早挖礦與慢跳本，靠雙倍 T1 基礎兵直接壓崩對手前期經濟與塔基。',
  },
  iron_turtle: {
    id: 'iron_turtle',
    badge: '②',
    shortName: '玄武鐵龜',
    name: '② 玄武鐵龜陣',
    focusTag: '塔陣控礦・科技反推',
    summary: '前哨塔與重砲塔穩住戰線、經濟科技塔滾雪球，拖入高階科技與攻城反推。',
  },
  iron_air_siege: {
    id: 'iron_air_siege',
    badge: '③',
    shortName: '空對地奇招',
    name: '③ 空對地奇招流',
    focusTag: '速跳 T2・空軍奇襲',
    summary: '極簡守家直衝 T2 空軍＋攻城單位，無視路障直撲敵方防空薄弱的邊路。',
  },
  iron_mech: {
    id: 'iron_mech',
    badge: '④',
    shortName: '重甲推進',
    name: '④ 重甲推進流',
    focusTag: '高甲巨牆・機械攻防',
    summary: '前期穩守升經濟與機械攻防，以高護甲重裝單位與 T3 巨獸正面平推。',
  },
  iron_bio: {
    id: 'iron_bio',
    badge: '⑤',
    shortName: '生化部隊',
    name: '⑤ 生化部隊陣',
    focusTag: '控圖搶野・攻防Timing',
    summary: '前期小隊控線爭奪野區，T1 兵營 Lv.2 配生化攻防完工時打一波強推 Timing。',
  },
};

function getFactionUnitName(factionId: FactionId, index: number): string {
  return FACTIONS[factionId]?.units[index]?.name ?? '主力部隊';
}

function getSpecialTechName(factionId: FactionId, slot: 0 | 1): string {
  return FACTIONS[factionId]?.specialTechs[slot]?.name ?? (slot === 0 ? '專屬科技[K]' : '專屬科技[L]');
}

interface RawStepEval {
  title: string;
  mapDirection: string;
  actionSummary: string;
  hotkeys: string;
  highlight: TutorialHighlightId | null;
  checks: TacticCoachCheck[];
}

function buildStepsForTactic(tactic: AIArchetype, snap: GameSnapshot): RawStepEval[] {
  const f = snap.player.faction;
  const uQ = getFactionUnitName(f, 0); // [Q]
  const uW = getFactionUnitName(f, 1); // [W]
  const uY = getFactionUnitName(f, 2); // [Y]
  const uE = getFactionUnitName(f, 3); // [E]
  const uN = getFactionUnitName(f, 5); // [N] T2 Air
  const uV = getFactionUnitName(f, 8); // [V] T3 Heavy
  const specK = getSpecialTechName(f, 0);
  const specL = getSpecialTechName(f, 1);

  const t1Barracks = snap.playerBarracks.find((b) => b.tier === 1);
  const t2Barracks = snap.playerBarracks.find((b) => b.tier === 2);
  const t3Barracks = snap.playerBarracks.find((b) => b.tier === 3);
  const bioLab = snap.playerArmories.find((a) => a.kind === 'bio_lab');
  const mechBay = snap.playerArmories.find((a) => a.kind === 'mech_bay');
  const t1BuiltOrBuilding = Boolean(t1Barracks && (t1Barracks.built || t1Barracks.building));
  const t2BuiltOrBuilding = Boolean(t2Barracks && (t2Barracks.built || t2Barracks.building));
  const t3BuiltOrBuilding = Boolean(t3Barracks && (t3Barracks.built || t3Barracks.building));
  const bioReady = Boolean(bioLab && (bioLab.built || bioLab.building));
  const mechReady = Boolean(mechBay && (mechBay.built || mechBay.building));

  const builtDepots = snap.playerDepotsBuilt;
  const extractors = snap.playerExtractorsBuilt + snap.playerExtractorsUpgrading;
  const towers = snap.playerStandingTowers + snap.playerTowersBuilding;
  const lanes = snap.activeLanes;
  const hasAnyPushStance = lanes.some(
    (l) => snap.player.laneStances[l] === 'push' || snap.player.laneStances[l] === 'all_in'
  );
  const hasHoldStance = lanes.some(
    (l) => snap.player.laneStances[l] === 'hold_tower' || snap.player.laneStances[l] === 'defend_base'
  );
  // trackA/B = Bio Atk/Arm, trackC/D = Mech Atk/Arm, trackE/F = Air Atk/Arm
  const bioUpgrades = snap.player.armoryLevels.trackA + snap.player.armoryLevels.trackB;
  const mechUpgrades = snap.player.armoryLevels.trackC + snap.player.armoryLevels.trackD;
  const airUpgrades = snap.player.armoryLevels.trackE + snap.player.armoryLevels.trackF;
  const specialDoneCount =
    (snap.player.specialTechsDone[0] ? 1 : 0) + (snap.player.specialTechsDone[1] ? 1 : 0);

  switch (tactic) {
    case 'iron_rush':
      return [
        {
          title: '中路速兵搶先手',
          mapDirection: '鎖定中路 [2]，第一時間壓往敵方前哨區',
          actionSummary: `開局先別急著升採礦！直接在中路連續訓練 3 隊【${uQ} [Q]】，準備搶拆對手空窗塔基。`,
          hotkeys: '[2]中路 · [Q]連續產兵',
          highlight: 'unit_0',
          checks: [
            {
              label: `訓練至少 3 隊基礎部隊（目前 ${Math.min(3, snap.player.unitsTrained)}/3）`,
              done: snap.player.unitsTrained >= 3,
            },
          ],
        },
        {
          title: '補人口＋建造 T1 兵營暴兵',
          mapDirection: '主堡後方空地，快速鋪開產能',
          actionSummary: '建造 1 座【補給站 [B]】防卡人口，並立刻建造【T1 兵營 [,]】讓基礎兵雙組並行生產。',
          hotkeys: '[B]補給站 · [,]T1 兵營',
          highlight: builtDepots < 1 ? 'depot_extractor' : 'barracks_1',
          checks: [
            { label: `建造 1 座補給站 [B]（${Math.min(1, builtDepots)}/1）`, done: builtDepots >= 1 },
            { label: '建造 T1 兵營 [,]', done: t1BuiltOrBuilding },
          ],
        },
        {
          title: '補前排＋全線強壓姿態',
          mapDirection: '中路 [2] 正面推進，迫使對手回防',
          actionSummary: `補出【${uW} [W]】或更多【${uQ} [Q]】湊滿 6 隊兵力，切換【[5]推進】或【[6]強攻】壓境。`,
          hotkeys: '[W]重甲前排 · [5]推進 / [6]強攻',
          highlight: hasAnyPushStance ? 'unit_0' : 'stances',
          checks: [
            {
              label: `累積徵召 6 隊部隊（${Math.min(6, snap.player.unitsTrained)}/6）`,
              done: snap.player.unitsTrained >= 6,
            },
            { label: '任一路切換 [5]推進 或 [6]強攻', done: hasAnyPushStance },
          ],
        },
        {
          title: '升級 T1 兵營 Lv.2＋採氣攻防',
          mapDirection: '前線持續施壓，後方補上瓦斯與生化研究所',
          actionSummary: `建造【瓦斯挖掘場 [P]】並將【T1 兵營 [,]】升至 Lv.2 解鎖【${uY} [Y]】，同步建【生研所 [[]】準備強化火力。`,
          hotkeys: '[P]瓦斯 · [,]升營 Lv.2 · [[]生研所',
          highlight: extractors < 1 ? 'depot_extractor' : !bioReady ? 'armory' : 'barracks_1',
          checks: [
            { label: '建造瓦斯挖掘場 [P]', done: extractors >= 1 },
            { label: '升級 T1 兵營至 Lv.2 或建生研所 [[]', done: (t1Barracks?.level ?? 0) >= 2 || bioReady },
          ],
        },
        {
          title: '雙線牽制與奇襲收官',
          mapDirection: '切至 [1]上路 / [3]下路分兵，或用 [X]奇襲 穿越野區偷拆後方',
          actionSummary:
            '趁敵方主力被中路拖住時，切換邊路增援並升【生物攻 [G]】，搭配【[X]奇襲】或【[S]掃描】一口氣推平主堡！',
          hotkeys: '[1]/[3]邊路 · [G]生物攻 · [X]奇襲',
          highlight: bioUpgrades < 1 ? 'armory' : 'ambush',
          checks: [
            {
              label: '升級至少 1 級攻防或累積 12 隊部隊',
              done: bioUpgrades >= 1 || snap.player.unitsTrained >= 12,
            },
            {
              label: '發動 1 次 [X]奇襲 或 [S]掃描偵察',
              done: snap.player.ambushesLaunched >= 1 || snap.player.scansUsed >= 1,
            },
          ],
        },
      ];

    case 'iron_turtle':
      return [
        {
          title: '中路立塔穩固防線',
          mapDirection: '前往中路 [2] 前方第一個空塔基',
          actionSummary:
            '點選【↑1哨塔】或【↑2重砲】，按【[T]快建】或直接點擊地圖塔基，建立第一道防線與外拓採礦點。',
          hotkeys: '[↑1]哨塔 / [↑2]重砲 · [T]快速建塔',
          highlight: 'quick_tower',
          checks: [
            { label: `建造至少 1 座防禦塔（${Math.min(1, towers)}/1）`, done: towers >= 1 },
          ],
        },
        {
          title: '雙塔聯防＋啟動瓦斯開採',
          mapDirection: '補建邊路（[1]上路 或 [3]下路）塔基，並在主堡旁蓋瓦斯場',
          actionSummary:
            '擴建第 2 座防禦塔保護雙線礦區，同時建【瓦斯挖掘場 [P]】並保持【[7]守塔】防對手趁蓋塔偷襲。',
          hotkeys: '[1]/[3]切路 · [T]建塔 · [P]瓦斯',
          highlight: towers < 2 ? 'quick_tower' : 'depot_extractor',
          checks: [
            { label: `擁有至少 2 座防禦塔（${Math.min(2, towers)}/2）`, done: towers >= 2 },
            { label: '建造瓦斯挖掘場 [P]', done: extractors >= 1 },
          ],
        },
        {
          title: '升採礦經濟＋補人口',
          mapDirection: '依托防禦塔與主堡後方穩定運營',
          actionSummary: '兩座塔完工後立刻升級【採礦經濟 [A]】拉開金礦差距，並蓋【補給站 [B]】支援中後期大軍。',
          hotkeys: '[A]升採礦 · [B]補給站 · [7]守塔',
          highlight: snap.player.econLevel < 2 ? 'econ_tech' : 'depot_extractor',
          checks: [
            { label: `採礦經濟達 Lv.2（目前 Lv.${snap.player.econLevel}）`, done: snap.player.econLevel >= 2 },
            { label: `建造 1 座補給站 [B]（${Math.min(1, builtDepots)}/1）`, done: builtDepots >= 1 },
          ],
        },
        {
          title: '晉升 T2 科技＋研發陣營專屬防禦',
          mapDirection: '升級主堡並可將關鍵前線塔切至【科技／經濟塔】',
          actionSummary: `升級【主堡科技 T2 [D]】，接著研發【[K] ${specK}】或【[L] ${specL}】讓防線與反空火力全面進化。`,
          hotkeys: '[D]升 T2 · [K]/[L]專屬科技',
          highlight: snap.player.techTier < 2 ? 'econ_tech' : 'armory',
          checks: [
            { label: `主堡科技達 T2（目前 T${snap.player.techTier}）`, done: snap.player.techTier >= 2 },
            { label: '研發任一專屬科技 [K] 或 [L]', done: specialDoneCount >= 1 },
          ],
        },
        {
          title: '攻城成型＋大招反推',
          mapDirection: '先用 [S]掃描 照亮敵陣，再從中路集結反推敵方主堡',
          actionSummary: `建造【T2 兵營 [.]】生產【${uE} [E]】等攻城火力，升級【主堡 T3 [D]】並抓準時機施放【[F]陣營大招】一舉反殺！`,
          hotkeys: '[.]T2兵營 · [E]攻城 · [S]掃描 · [F]大招',
          highlight: snap.player.scansUsed < 1 ? 'scan' : 'faction_skill',
          checks: [
            {
              label: '建造 T2 兵營 [.] 或升級至 T3 [D]',
              done: t2BuiltOrBuilding || snap.player.techTier >= 3,
            },
            {
              label: '施放 [S]掃描 或 [F]陣營大招',
              done: snap.player.scansUsed >= 1 || snap.player.activeCooldown > 0,
            },
          ],
        },
      ];

    case 'iron_air_siege':
      return [
        {
          title: '極簡守家＋早採瓦斯',
          mapDirection: '中路 [2] 保持 [7]守塔 穩守，主堡旁立刻開採瓦斯',
          actionSummary: `先產 2 隊【${uQ} [Q]】搭配【[7]守塔】拖時間，第一時間建造【瓦斯挖掘場 [P]】為空軍儲備大量瓦斯。`,
          hotkeys: '[Q]基本守兵 · [7]守塔 · [P]瓦斯',
          highlight: extractors < 1 ? 'depot_extractor' : 'unit_0',
          checks: [
            { label: '建造瓦斯挖掘場 [P]', done: extractors >= 1 },
            {
              label: `訓練 2 隊守家兵力（${Math.min(2, snap.player.unitsTrained)}/2）`,
              done: snap.player.unitsTrained >= 2,
            },
          ],
        },
        {
          title: '立前哨塔護家＋直衝 T2 科技',
          mapDirection: '中路前哨立 1 座塔拖住敵方陸軍，全資源直跳科技',
          actionSummary: '蓋 1 座防禦塔【[T]】與 1 座【補給站 [B]】後，把金礦與瓦斯全力投入【主堡科技 T2 [D]】！',
          hotkeys: '[T]建塔 · [B]補給 · [D]直跳 T2',
          highlight: towers < 1 ? 'quick_tower' : 'econ_tech',
          checks: [
            { label: '建造至少 1 座防禦塔 [T] 與補給站 [B]', done: towers >= 1 && builtDepots >= 1 },
            { label: `主堡升級至 T2（目前 T${snap.player.techTier}）`, done: snap.player.techTier >= 2 },
          ],
        },
        {
          title: '建造 T2 兵營＋機械廠',
          mapDirection: '主堡後方同步起雙建築，準備起飛空軍',
          actionSummary: `T2 完工後立刻建【T2 兵營 [.]】與【機械廠 []]】，同時解鎖【${uN} [N]】與空軍攻防研發。`,
          hotkeys: '[.]T2 兵營 · []]機械廠',
          highlight: !t2BuiltOrBuilding ? 'barracks_1' : 'armory',
          checks: [
            { label: '建造 T2 兵營 [.]', done: t2BuiltOrBuilding },
            { label: '建造機械廠 []]', done: mechReady },
          ],
        },
        {
          title: '爆空軍主力＋升空軍攻擊',
          mapDirection: '切到敵方防空薄弱的 [1]上路 或 [3]下路出兵',
          actionSummary: `開始生產【${uN} [N]】搭配【${uE} [E]】（空軍可直接飛越路障！），並研發【空軍攻 [J]】大幅提高斬殺速度。`,
          hotkeys: '[1]/[3]邊路 · [N]T2空軍 · [J]空軍攻',
          highlight: 'armory',
          checks: [
            {
              label: `累積總產兵達 6 隊以上（${Math.min(6, snap.player.unitsTrained)}/6）`,
              done: snap.player.unitsTrained >= 6,
            },
            { label: '升級空軍攻防 [J]/[O] 至少 1 級', done: airUpgrades >= 1 },
          ],
        },
        {
          title: '掃描探防空＋空中奇襲破陣',
          mapDirection: '用 [S]掃描 照亮敵方後排，空軍直撲無對空戰線',
          actionSummary: '先掃描確認對手哨塔位置，避開防空密集處切【[5]推進】直飛邊路拆礦拆堡，搭配【[F]大招】收尾！',
          hotkeys: '[S]掃描 · [5]推進 · [F]大招',
          highlight: snap.player.scansUsed < 1 ? 'scan' : 'faction_skill',
          checks: [
            { label: '使用 [S]掃描 偵察敵方防空配置', done: snap.player.scansUsed >= 1 },
            { label: '任一路切換 [5]推進 / [6]強攻展開空襲', done: hasAnyPushStance },
          ],
        },
      ];

    case 'iron_mech':
      return [
        {
          title: '重甲穩守＋早開瓦斯',
          mapDirection: '中路 [2] 設 [7]守塔，主堡旁建瓦斯挖掘場',
          actionSummary: `前期不出過多輕甲兵，先造【${uW} [W]】扛線並建【瓦斯挖掘場 [P]】，為高耗氣的重裝部隊存氣。`,
          hotkeys: '[W]重甲兵 · [7]守塔 · [P]瓦斯',
          highlight: extractors < 1 ? 'depot_extractor' : 'unit_0',
          checks: [
            { label: '建造瓦斯挖掘場 [P]', done: extractors >= 1 },
            {
              label: `訓練 2 隊初期守兵（${Math.min(2, snap.player.unitsTrained)}/2）`,
              done: snap.player.unitsTrained >= 2,
            },
          ],
        },
        {
          title: '建塔護礦＋升級採礦經濟',
          mapDirection: '中路與側翼塔基建塔，把經濟底座墊厚',
          actionSummary: '蓋 2 座防禦塔【[T]】穩住礦區、升級【採礦經濟 [A]】至 Lv.2，並蓋【補給站 [B]】預留重甲高人口空間。',
          hotkeys: '[T]建塔 · [A]升採礦 · [B]補給站',
          highlight: towers < 2 ? 'quick_tower' : snap.player.econLevel < 2 ? 'econ_tech' : 'depot_extractor',
          checks: [
            { label: '防禦塔達 2 座且採礦達 Lv.2', done: towers >= 2 && snap.player.econLevel >= 2 },
            { label: `建造補給站 [B]（${Math.min(1, builtDepots)}/1）`, done: builtDepots >= 1 },
          ],
        },
        {
          title: '起機械廠＋跳 T2 升機械攻防',
          mapDirection: '主堡後方建機械廠，全面強化重裝素質',
          actionSummary: '建造【機械廠 []]】並升級【主堡科技 T2 [D]】，立刻點下【機械攻 [H]】與【機械防 [I]】讓對手步槍打不動！',
          hotkeys: '[]]機械廠 · [D]升T2 · [H]/[I]機械攻防',
          highlight: snap.player.techTier < 2 ? 'econ_tech' : 'armory',
          checks: [
            { label: '建造機械廠 []] 並達 T2 科技', done: mechReady && snap.player.techTier >= 2 },
            { label: '升級機械攻 [H] 或機械防 [I]', done: mechUpgrades >= 1 },
          ],
        },
        {
          title: '解鎖 T3 重裝巨獸',
          mapDirection: '持續守塔累積資源，邁向終極兵種',
          actionSummary: `晉升【主堡科技 T3 [D]】並建造【T3 兵營 [/]】，開始量產【${uV} [V]】形成無法阻擋的鋼鐵推進牆。`,
          hotkeys: '[D]升T3 · [/]T3兵營 · [V]終極重裝',
          highlight: 'econ_tech',
          checks: [
            { label: `主堡科技達 T3（目前 T${snap.player.techTier}）`, done: snap.player.techTier >= 3 },
            { label: '建造 T3 兵營 [/]', done: t3BuiltOrBuilding },
          ],
        },
        {
          title: '重裝巨牆正面碾壓',
          mapDirection: '中路 [2] 集結主力，配合掃描一路平推敵主堡',
          actionSummary:
            '機械攻防達 +2 以上後切【[5]推進】正面壓境，交戰時按【[S]掃描】防潛行單位並以【[F]大招】清掉敵方反重甲後排！',
          hotkeys: '[5]推進 · [S]掃描 · [F]大招',
          highlight: hasAnyPushStance ? 'faction_skill' : 'stances',
          checks: [
            { label: '切換 [5]推進 或 [6]強攻正面總攻', done: hasAnyPushStance },
            {
              label: '機械攻防總和 ≥ 2 或使用 [F]大招',
              done: mechUpgrades >= 2 || snap.player.activeCooldown > 0,
            },
          ],
        },
      ];

    case 'iron_bio':
    default:
      return [
        {
          title: '中路出兵偵查＋建 T1 兵營',
          mapDirection: '中路 [2] 出兵搶先偵查視野，準備爭奪野區',
          actionSummary: `訓練 3 隊【${uQ} [Q]】並切【[5]推進】拿中路視野，同時蓋【補給站 [B]】與【T1 兵營 [,]】。`,
          hotkeys: '[Q]出兵 · [5]推進 · [B]補給 · [,]T1營',
          highlight: snap.player.unitsTrained < 3 ? 'unit_0' : !t1BuiltOrBuilding ? 'barracks_1' : 'depot_extractor',
          checks: [
            {
              label: `訓練 3 隊基礎兵（${Math.min(3, snap.player.unitsTrained)}/3）`,
              done: snap.player.unitsTrained >= 3,
            },
            { label: '建造補給站 [B] 與 T1 兵營 [,]', done: builtDepots >= 1 && t1BuiltOrBuilding },
          ],
        },
        {
          title: '開瓦斯＋升級 T1 兵營 Lv.2',
          mapDirection: '主堡旁開採瓦斯，解鎖雙軌獨立產兵冷卻',
          actionSummary: `建【瓦斯挖掘場 [P]】並把【T1 兵營 [,]】升到 Lv.2，解鎖反重甲主力【${uY} [Y]】且讓 Q/W/Y 分開冷卻產兵！`,
          hotkeys: '[P]瓦斯 · [,]升T1營Lv.2 · [Y]精銳兵',
          highlight: extractors < 1 ? 'depot_extractor' : 'barracks_1',
          checks: [
            { label: '建造瓦斯挖掘場 [P]', done: extractors >= 1 },
            { label: 'T1 兵營升至 Lv.2 [,]', done: (t1Barracks?.level ?? 0) >= 2 },
          ],
        },
        {
          title: '起生化研究所＋雙軌攻防',
          mapDirection: '補 1 座塔穩礦並升採礦，後方專攻生化攻防',
          actionSummary:
            '建造【生化研究所 [[]】後立刻研發【生物攻 [G]】與【生物防 [U]】，同時蓋塔【[T]】與升【採礦 [A]】支撐暴兵經濟。',
          hotkeys: '[[]生研所 · [G]生攻 · [U]生防 · [A]採礦',
          highlight: !bioReady || bioUpgrades < 1 ? 'armory' : 'econ_tech',
          checks: [
            { label: '建造生化研究所 [[]', done: bioReady },
            { label: `完成至少 1 級生物攻防 [G]/[U]（目前 +${bioUpgrades}）`, done: bioUpgrades >= 1 },
          ],
        },
        {
          title: '爭奪野區事件／奇襲控圖',
          mapDirection: '留意頂部野區事件倒數，用 [X]奇襲 或小隊搶吃野區增益',
          actionSummary: `用【${uQ} [Q]】＋【${uY} [Y]】混編部隊（累計 ≥ 8 隊），趁野區事件刷新時按【[X]奇襲】穿野區搶奪全軍紅利或掃描控圖。`,
          hotkeys: '[Q]/[Y]混編 · [X]奇襲野區 · [S]掃描',
          highlight: 'ambush',
          checks: [
            {
              label: `累計徵召 8 隊以上生化兵團（${Math.min(8, snap.player.unitsTrained)}/8）`,
              done: snap.player.unitsTrained >= 8,
            },
            {
              label: '奪取野區目標、發動 [X]奇襲 或 [S]掃描',
              done:
                snap.player.objectivesClaimed >= 1 ||
                snap.player.ambushesLaunched >= 1 ||
                snap.player.scansUsed >= 1,
            },
          ],
        },
        {
          title: '攻防 Timing 一波強攻壓境',
          mapDirection: '抓準攻防剛升完的爆發期，中邊雙線同時總攻',
          actionSummary: `生物攻防達 +2 以上或解鎖【[K] ${specK}】後，切【[6]強攻】集結生化海正面突破，配合【[F]大招】摧毀敵方防線！`,
          hotkeys: '[G]/[U]攻防 · [K]強化 · [6]強攻 · [F]大招',
          highlight: hasHoldStance && !hasAnyPushStance ? 'stances' : 'faction_skill',
          checks: [
            { label: `生物攻防總和 ≥ 2（目前 +${bioUpgrades}）`, done: bioUpgrades >= 2 },
            {
              label: '切換 [5]推進 / [6]強攻並施放 [F] 或完成專屬科技',
              done: hasAnyPushStance && (snap.player.activeCooldown > 0 || specialDoneCount >= 1),
            },
          ],
        },
      ];
  }
}

export function evaluateTacticCoach(
  tactic: AIArchetype,
  snap: GameSnapshot,
  manualMinStepIndex: number
): TacticCoachStepView {
  const rawSteps = buildStepsForTactic(tactic, snap);
  const totalSteps = rawSteps.length;

  let activeIdx = Math.max(0, Math.min(manualMinStepIndex, totalSteps - 1));
  while (activeIdx < totalSteps - 1) {
    const step = rawSteps[activeIdx];
    if (step.checks.every((c) => c.done)) {
      activeIdx++;
    } else {
      break;
    }
  }

  const chosen = rawSteps[activeIdx];
  return {
    stepNumber: activeIdx + 1,
    totalSteps,
    title: chosen.title,
    mapDirection: chosen.mapDirection,
    actionSummary: chosen.actionSummary,
    hotkeys: chosen.hotkeys,
    highlight: chosen.checks.every((c) => c.done) ? null : chosen.highlight,
    checks: chosen.checks,
    allDone: rawSteps.every((s) => s.checks.every((c) => c.done)),
  };
}
