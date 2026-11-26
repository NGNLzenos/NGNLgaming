import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Compass,
  Cpu,
  Crosshair,
  Eye,
  Factory,
  Flame,
  GraduationCap,
  Keyboard,
  Pickaxe,
  Radar,
  Scale,
  Shield,
  Sparkles,
  Swords,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import {
  ARMORY_TIER_REQ,
  BARRACKS_ARMOR,
  BARRACKS_DEFS,
  BARRACKS_TIERS,
  BARRICADE_ARMOR,
  BARRICADE_HP,
  CLASSIC_ARCHETYPE_MATRIX,
  COMMANDER_BONUS_GOLD,
  DIFFICULTY_META,
  DIFFICULTY_ORDER,
  ECON_BASE_MINE_RATE,
  ECON_MAX_LEVEL,
  ECON_REQUIRED_TOWERS,
  ECON_TOWER_BONUS_MULT,
  ECON_TOWER_MINING_MULT_BY_LV,
  ECON_UPGRADE_COSTS,
  ECON_UPGRADE_TIMES,
  FACTION_ORDER,
  FACTION_SKILL_INITIAL_COOLDOWN,
  FACTIONS,
  getEconUpgradeCost,
  getTowerLevelStats,
  INNER_PAD_BASE_MINE_RATE,
  JUNGLE_AMBUSH_COOLDOWN,
  JUNGLE_AMBUSH_COST,
  MAX_SUPPLY_LIMIT,
  MINE_HARASS_CLOSE_RADIUS,
  MINE_HARASS_EDGE_EFF_PERMILLE,
  MINE_HARASS_MIN_EFF_PERMILLE,
  MINE_HARASS_RADIUS,
  NEXUS_ARMOR,
  NEXUS_ATTACK_INTERVAL_MS,
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
  OBJECTIVE_META,
  OUTER_PAD_BASE_MINE_RATE,
  SCAN_INITIAL_COOLDOWN,
  SIMPLE_ECON_PACE_MULT,
  SIMPLE_NEXUS_BASE_HP,
  SIMPLE_NEXUS_MAX_HP,
  SIMPLE_NEXUS_PLATING_HP,
  SQUAD_SELECT_RADIUS,
  STARTING_GOLD_SIMPLE,
  STARTING_GOLD_STANDARD,
  SUPPLY_DEPOT_ARMOR,
  SUPPLY_DEPOT_BONUS,
  SUPPLY_DEPOT_BUILD_TIME,
  SUPPLY_DEPOT_COST,
  SUPPLY_DEPOT_HP,
  SUPPLY_DEPOT_MAX_COUNT,
  TECH_SUPPLY_BY_TIER,
  TECH_TOWER_CD_RATE_BY_LV,
  TECH_TOWER_RES_RATE_BY_LV,
  TECH_UPGRADE_COSTS,
  TECH_UPGRADE_TIMES,
  TOWER_DEFS,
  TOWER_MINING_UPGRADE_BONUS,
  TOWER_TECH_CD_RATE_BY_LV,
  TOWER_TECH_LV2_BONUS_DMG,
  TOWER_TECH_TIER_DMG_BONUS,
  TOWER_TECH_TIER_HP_PERMILLE,
} from '../game/data';
import {
  ATTRIBUTE_TAG_BADGE_COLORS,
  ATTRIBUTE_TAG_LABELS,
  FP_SCALE,
  MIN_HIT_DAMAGE_FP,
} from '../game/combatMath';
import { AttributeTag, FactionId, TowerType } from '../game/types';

type ManualTab = 'basics' | 'combat' | 'economy' | 'factions' | 'jungle' | 'guides';

interface TacticalManualModalProps {
  open: boolean;
  initialFaction?: FactionId;
  onClose: () => void;
}

const ALL_ATTRIBUTE_TAG_DOCS: Array<{
  tag: AttributeTag;
  group: string;
  desc: string;
}> = [
  { tag: 'Light', group: '護甲類型', desc: '低甲高機動或人海單位，易受反輕甲濺射與雙發武器額外加成。' },
  { tag: 'Armored', group: '護甲類型', desc: '重裝單位與防禦建築，基礎裝甲高，受「對重甲」穿透武器額外加成。' },
  { tag: 'Biological', group: '材質類型', desc: '生化／蟲群材質（含鐵壁盾衛），受鐵砧生物攻防 [G/U] 強化，並於鐵砧 [K] 享主動鼓舞與脫戰回血、鷹眼偵察機脫戰治療。' },
  { tag: 'Mechanical', group: '材質類型', desc: '機械單位與防禦塔，受鐵砧機械攻防 [H/I] 強化，並於鐵砧 [K] 享主動架設增程增傷與對 [建築] 固定加成。' },
  { tag: 'Structure', group: '材質類型', desc: '防禦塔、主堡、兵營、補給站與路障，受攻城迫擊砲與鐵砧 [K] 機械對建築固定加成重創。' },
  { tag: 'Massive', group: '特殊分類', desc: '泰坦、砲艇、巨像、利維坦等巨型終極兵種，用於識別巨獸定位與特殊技能目標。' },
  { tag: 'Psionic', group: '特殊分類', desc: '晨曦靈能與潛行單位，受干擾力場塔對靈能固定加成壓制。' },
];

const STRATEGY_PLAYBOOKS = [
  {
    id: 'early_rush',
    title: '一、邊路快攻壓制（Early Timing Rush）',
    tag: '快攻節奏',
    tagTone: 'text-rose-300',
    bestFactions: '鐵砧聯邦（步槍快攻）、蝕骨蟲巢（疾爪＋酸液）、晨曦聖約（光刃＋射手）',
    beats: '貪心跳科 T2/T3、裸升採礦不補塔的營運玩家',
    weakTo: '提早在邊路補防禦塔＋「守外塔」集結防禦的龜家陣型',
    steps: [
      '0:00–0:45：開局雙方均無任何預建防禦塔（僅留主堡，且主堡改為較低單體傷害）！直接將兵力壓在單一邊路並設為「推進」，搶先騷擾對手主堡削弱採礦效率或壓垮主堡額外裝甲。',
      '0:45–1:30：暫緩升 T2，連出 3–4 波 T1 部隊搶先踩進敵方邊路外塔基視野；若對手還沒蓋塔，直接強攻拆內區或順手在敵方空塔基「插哨塔」奪礦！',
      '1:30 後轉型：一旦逼出對手補塔防禦，切忌硬撞重砲堡壘，立刻用 [X] 圈選部隊編成第四路「編隊」繞野區轉向另一路或搶野區營地滾雪球。',
    ],
    counterTip: '反制此套路：開局 30 秒內掃描或派斥候看敵軍動向，被壓的那一路立刻補一座瞭望哨塔或重砲堡壘，並將該線姿態切換為「守外塔」，讓塔扛傷害吃光快攻兵力即可反賺科技差。',
  },
  {
    id: 'turtle_tech',
    title: '二、堅壁龜家跳階（Turtle & Fast Tech）',
    tag: '防禦反打',
    tagTone: 'text-sky-300',
    bestFactions: '鐵砧聯邦（堅壁雷達 [L] ＋重砲＋科技強化塔）、晨曦聖約（護盾巨像）',
    beats: '無偵察硬衝的單線快攻、低階輕甲人海',
    weakTo: '野區控圖營運、跨區插塔奪礦、T2 攻城迫擊砲白嫖、反隱不足時遭女武神潛行偷襲',
    steps: [
      '0:00–1:15：利用「採礦 Lv.2–4 僅需 0 塔」的平順門檻，先補 1 座關鍵路哨塔／重砲防快攻，同時點採礦 Lv.2–3（塔升級期間採礦不會中斷）。',
      `1:15–2:30：各路切換「守外塔」避免無謂送兵，存錢研發科技 T2（${TECH_UPGRADE_COSTS[1]}G / ${TECH_UPGRADE_TIMES[1]}s）——升 T2/T3 時全場己方防禦塔血量與火力會同步自動升級！完成後優先研發 [L] 解鎖塔對空與「⚡科技」偵隱強化。`,
      '2:30 後收割：憑藉 1–2 級攻防等級差與高甲單位（泰坦／聖陽巨像／天穹砲艇）一波正面平推。',
    ],
    counterTip: '反制此套路：千萬不要送 T1 小兵撞對手的重砲！改搶上側野區富晶礦（+8.5G/s）與魔獸營地擴大經濟，並在 T2 出「攻城迫擊砲（射程 235 遠超重砲 188）」或「女武神潛行空襲」趁對方還沒升「⚡科技」反隱塔前直接偷拆！',
  },
  {
    id: 'tower_expand',
    title: '三、擴張蓋塔奪礦（Tower Expansion & Proxy Mine）',
    tag: '資源壓制',
    tagTone: 'text-amber-300',
    bestFactions: '鐵砧聯邦（塔射程+15%＋經濟塔）、全文明皆可執行',
    beats: '只龜主堡不擴張、主堡礦脈提早枯竭的對手',
    weakTo: '高爆發攻城拆除（攻城迫擊砲、自爆毒囊蟲、軌道砲擊）、貼身壓礦騷擾與多線機動拉扯',
    steps: [
      '核心經濟公式：每多 1 座完工防禦塔，升級採礦費用立刻減免 10%（最高省 50%！），同時每座內塔開採 3.4G/s、外塔開採 5.2G/s × 採礦倍率，並計入「控區」解鎖補給站上限。',
      '1:00–2:30：優先在己方三路外塔基補滿哨塔／重砲／經濟塔，接著用折扣價拉高採礦至 Lv.5–7，並補滿 3–4 座補給站（直衝 80–100 人口）。',
      '進階奪區：部隊推過中線拿到視野後，直接點擊「敵方空塔基」蓋塔——不僅搶視野，還會直接把敵方 3600G 塔區金礦挖進自己口袋！注意塔升級額外血量若被打掉會降級失去強化特性，務必派兵掩護。',
    ],
    counterTip: '反制此套路：防禦塔施工中僅有 25% 血量且零傷害、零視野！看到敵方剛動工跨區偷塔，立刻派兵或用 [X] 編成第四路編隊切過去拆工地，或貼近對方礦塔 45px 內直接把採礦效率壓到僅剩 15%！',
  },
  {
    id: 'jungle_air',
    title: '四、第四路編隊機動與空優突襲（Custom Squad & Air Raid）',
    tag: '迷霧機動',
    tagTone: 'text-teal-300',
    bestFactions: '鐵砧聯邦（女武神15s戰鬥隱形＋鷹眼偵察）、晨曦聖約（潛行刺客＋追獵艇）、蝕骨蟲巢（尖嘯飛龍）',
    beats: '過度堆重砲堡壘（未升[L]無法對空）、缺乏「⚡科技」偵隱塔或行動反隱、把兵鎖在單一戰線的陣容',
    weakTo: '升級「⚡科技」的反隱防空塔、鷹眼偵察機 [C]、干擾力場塔緩速留人與主動掃描 [S]',
    steps: [
      '免費按 [X] 圈選場上任意處 115px 範圍內不限數量的友軍，再點地圖任意處即編成「第四路編隊 [4]」，可無縫使用全部五種姿態（推進／強攻／守外塔／回主堡／撤退）跨野區包抄！',
      '中期專搶野區兩大核心：上側「富晶礦脈（基礎 8.5G/s × 採礦倍率）」與下側「古塔遺跡（稀缺常駐反隱視野）」，並吃掉動態野區事件。',
      'T2 造兵營解鎖「女武神戰機 [N]」（遭遇敵軍啟動 15s 隱形，脫戰自動回復隱形），直接飛越路障專點對方沒有偵隱塔保護的後排補給站與重砲堡壘！',
    ],
    counterTip: '反制此套路：因主堡與基礎哨塔均「不再自帶反隱」，偵隱成為稀缺資源！遇到女武神或刺客務必透過 [L] 替前線塔升級「⚡科技」獲得偵隱、出 T3 鷹眼偵察機 [C]，或留 [S] 掃描集火擊殺。',
  },
];

const IRONBOUND_FIVE_STRATEGIES = [
  {
    id: 'iron_rush',
    title: '① 步槍快攻（Early Rifle Rush）',
    tag: '前期壓制',
    tagTone: 'text-rose-300',
    beats: '貪心裸蓋塔（抓工地零防禦窗口）、裸升採礦、裸跳科技 T2 的無防備對手',
    weakTo: '提早完工的重砲堡壘＋守外塔陣地、重甲盾衛抗線、火焰兵 [R] 與濺射單位',
    steps: [
      '0:00–0:55：暫緩採礦與科技，持續點 [Q] 步槍小隊（60G / 5.2s）集中壓單一路；可補 T1 兵營並升至 Lv.2 解鎖精銳 [Y]，續升 Lv.3/4 同時重複並行產 3/4 組。',
      '抓工地與主堡裝甲窗口：防禦塔施工中零防禦，且主堡單體輸出已下調——直接壓進敵家打爆主堡額外裝甲（+400HP）可令對方主堡挖礦效率暴跌 -35%！',
    ],
  },
  {
    id: 'iron_turtle',
    title: '② 玄武鐵龜陣（Fortress Tech Turtle）',
    tag: '陣地拖後',
    tagTone: 'text-sky-300',
    beats: '無偵察盲衝快攻、純低階輕甲人海、缺乏攻城/空優反制的對手',
    weakTo: '生化控野擴張經濟輾壓、攻城迫擊砲超遠程白嫖、被打掉升級額外血量觸發降級',
    steps: [
      '放棄早期基本兵升級，優先補哨塔＋重砲堡壘＋科技塔；升級塔時依戰況選「⚔強化（甲+傷）」、「⛏擴礦（+45%礦）」或（研發[L]後）「⚡科技（獲稀缺偵隱＋減CD＋二階增傷）」。',
      '升級期間塔照常挖礦！快速上 T2/T3 讓全場防禦塔獲得時代血量與火力加成，點滿 [L] 防空雷達與 [K] 主動激勵／架設模組，搭配 6 波軌道砲擊 [F] 封鎖前線。',
    ],
  },
  {
    id: 'iron_air_siege',
    title: '③ 空對地奇招流（Fast Valkyrie + Mortar）',
    tag: '迷霧突襲',
    tagTone: 'text-cyan-300',
    beats: '不做偵查、沒升「⚡科技」偵隱塔/鷹眼偵察機、過度堆重砲堡壘與純地面部隊的對手',
    weakTo: '「⚡科技」偵隱哨塔＋鷹眼偵察機 [C]＋步槍/精銳防空網、高機動編隊繞後切迫擊砲',
    steps: [
      '穩守初期後速升 T2 並建造 T2 兵營 Lv.1 解鎖 [N] 女武神戰機（遭遇敵軍自動隱形 15 秒、脫戰回隱，可飛越路障！），搭配 1–2 門 [E] 攻城迫擊砲（重甲機械，射程 235 白嫖敵塔），並點 [J] 空軍攻。',
      '女武神專偷敵方沒反隱保護的經濟塔、重砲塔與補給站；15 秒隱形快到期前按 [Z] 脫戰即可快速回復滿額隱形再度進場！',
    ],
  },
  {
    id: 'iron_mech',
    title: '④ 重甲機械推進流（Pure Heavy Mech Push）',
    tag: '正面碾壓',
    tagTone: 'text-amber-300',
    beats: '一整堆未升科技的基本生物輕甲兵（低單發傷撞上重甲護甲被純減法壓到極低）',
    weakTo: '反重甲固定加成兵種（精銳小隊/射手/酸液/砲艇）、大量空軍（火焰兵/泰坦不能對空）、成型前快攻打穿',
    steps: [
      '前期僅靠外塔穩守，快速升階 T2/T3，並把資源全砸在 [H] 機械攻與 [I] 機械防（Lv.2 需 T2 或 T1營Lv.2；Lv.3 需 T3 或 T2+T1營Lv.3），加上專屬 [K] 主動原地架設（3s 射程+35%/傷+6）與對建築固定加成！',
      '集結火焰兵 [R]（中近戰烈焰清輕甲海）、攻城迫擊砲 [E] 與泰坦機甲 [V] 正面平推，並配 [C] 鷹眼偵察機（反隱兼脫戰治生物）或 [L] 防空塔防禦空軍。',
    ],
  },
  {
    id: 'iron_bio',
    title: '⑤ 生化部隊陣（Biological Bio Timing）',
    tag: '節奏營運',
    tagTone: 'text-emerald-300',
    beats: '消極龜縮在家、兵量太少、或經濟擴張跟不上的營運對手',
    weakTo: '重砲塔/迫擊砲/火焰兵/巨像等濺射單位、反輕甲固定加成兵、以及高爆發 AOE 戰術技',
    steps: [
      '前期以步槍小隊 [Q]＋鐵壁盾衛 [W]（重甲生物，享生物攻防！）推進，升 T1 兵營 Lv.2 解鎖 [Y] 精銳小隊（對重甲 +8/+1 級）；T1 營 Lv.2/3 還能提前解鎖生物攻防 Lv.2/3！',
      'T2 研發專屬 [K] 後可主動按 [K] 選取友軍區域激勵（生物微扣血獲 3s 士氣鼓舞），CD 中達 T3 再點升級更令全生物最大生命 +10；搭配 [C] 鷹眼偵察機脫戰時還能持續幫生物緩慢回血！',
    ],
  },
];

const FACTION_SIGNATURE_BUILDS: Array<{
  factionId: FactionId;
  title: string;
  coreUnits: string;
  keyTech: string;
  plan: string;
}> = [
  {
    factionId: 'ironbound',
    title: '鐵砧聯邦（基準種族）· 9 兵種三大體系自由變陣',
    coreUnits: '生物：步槍[Q]＋盾衛[W]＋精銳[Y]｜機械：火焰兵[R]＋迫擊砲[E]＋泰坦[V]｜空軍：鷹眼[C]＋女武神[N]＋砲艇[M]',
    keyTech: '生物/機械/空軍 攻防 6 線分研 [G/U · H/I · J/O] ＋ [K]主動激勵/架設(CD中T3升+10生物血) ＋ [L]防空/科技塔',
    plan: '移速、採礦與產兵為全遊戲基準節奏：T1/T2/T3 兵營逐級擴建至 ×2/×3/×4 並各自解鎖精銳/女武神/天穹砲艇，配合第四路 [X] 編隊與稀缺反隱博弈打出極深戰術變化。',
  },
  {
    factionId: 'dawn',
    title: '晨曦聖約 · 潛行護盾空優流',
    coreUnits: '光刃斥候＋星輝射手 → 幽影刺客＋聖殿追獵艇 → 聖陽巨像',
    keyTech: '全軍星能武器 [G] ＋ 等離子盾 [H] ＋ 折躍護盾超載 [K]',
    plan: '全軍武器共用的設計讓你無縫混編陸空；靠 +12% 移速與脫戰回盾打拉扯戰，T2 用隱身刺客切後排迫擊砲與缺少偵隱的防禦塔，配合 [F] 聖光加速矩陣一波破陣。',
  },
  {
    factionId: 'swarm',
    title: '蝕骨蟲巢 · 以戰養戰蟲海奇襲流',
    coreUnits: '疾爪蟲＋酸液噴吐蟲 → 自爆毒囊蟲＋尖嘯飛龍／衝鋒獸 → 利維坦巨獸',
    keyTech: '近戰演化 [G] 或 遠程演化 [H] ＋ 狂暴腎上腺素 [K]',
    plan: '全遊戲唯一「擊殺敵軍依人口回收 +4G/人口（T3 酸蝕雲 +6G/人口）」的文明！只要不斷換血小規模摩擦就不虧經濟，搭配 [F] 孢子空投直落敵陣後排。',
  },
];

export const TacticalManualModal: React.FC<TacticalManualModalProps> = ({
  open,
  initialFaction = 'ironbound',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ManualTab>('basics');
  const [selectedFaction, setSelectedFaction] = useState<FactionId>(initialFaction);

  useEffect(() => {
    setSelectedFaction(initialFaction);
  }, [initialFaction]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const faction = FACTIONS[selectedFaction];

  const TOWER_ICON_MAP: Record<TowerType, { icon: React.ReactNode; color: string; badge: string }> = {
    watchtower: { icon: <Eye className="w-4 h-4 text-sky-300" />, color: 'border-sky-500/45', badge: '廣視野·對輕+7·對空' },
    artillery: { icon: <Flame className="w-4 h-4 text-orange-300" />, color: 'border-orange-500/45', badge: '重砲·地面濺射' },
    tech_tower: { icon: <Cpu className="w-4 h-4 text-violet-300" />, color: 'border-violet-500/45', badge: '鐵砧專屬·減CD/研速' },
    econ_tower: { icon: <Pickaxe className="w-4 h-4 text-amber-300" />, color: 'border-amber-500/45', badge: '鐵砧專屬·純挖礦' },
    disruptor: { icon: <Zap className="w-4 h-4 text-teal-300" />, color: 'border-teal-500/45', badge: '晨曦/蟲巢·緩速留人' },
  };

  const tabs: Array<{ id: ManualTab; label: string; icon: React.ReactNode }> = [
    { id: 'basics', label: '新手與全機制', icon: <GraduationCap className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'combat', label: '編隊、姿態與攻防', icon: <Shield className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'economy', label: '防禦塔、兵營與經濟', icon: <Factory className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'factions', label: '文明與兵種數值', icon: <Swords className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'jungle', label: '野區事件與迷霧', icon: <Crosshair className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'guides', label: '套路導引與反制', icon: <Compass className="w-3.5 h-3.5 shrink-0" /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-[#06090E]/90 flex items-center justify-center p-2.5 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[1140px] h-[92dvh] sm:h-[88dvh] bg-[#0E141D] border border-slate-700/90 rounded-lg shadow-2xl flex flex-col overflow-hidden text-[#E6EDF3]">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3 bg-[#121A26] border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-sky-300 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-50 truncate">
                迷霧三線 · 完整數據手冊與戰術套路導引
              </h2>
              <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                所有數值即時同步自戰場核心引擎 · 鐵砧聯邦 9 兵種三大體系 · 三大文明 21 兵種與五類防禦塔完整對照
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>關閉</span>
          </button>
        </div>

        {/* Tab Bar */}
        <div className="px-3 sm:px-6 py-2 bg-[#0B1018] border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto shrink-0">
          {tabs.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer border shrink-0 ${
                  active
                    ? 'bg-sky-300 text-slate-950 border-sky-200'
                    : 'bg-[#131B27] text-slate-300 border-slate-800 hover:border-slate-600 hover:text-white'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-5">
          {/* TAB 0: BEGINNER GUIDE, VISUAL SKILL TREE, ALL UNIT MECHANICS, BUFFS, HOTKEYS & FAIRNESS */}
          {activeTab === 'basics' && (
            <div className="space-y-5">
              {/* 60-Second Beginner Onboarding */}
              <section className="rounded-lg bg-[#0D1A26] border border-sky-500/45 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-sky-200 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-sky-300" />
                    60 秒新手上手流程（本遊戲 100% 數值透明，無隱藏倍率）
                  </h3>
                  <span className="text-[11px] text-teal-300 font-semibold">
                    推薦先玩「簡易雙線模式 ＋ 鐵砧聯邦 ＋ 初級 AI」
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
                  <div className="p-2.5 rounded bg-[#0A111A] border border-slate-800 space-y-1">
                    <div className="font-bold text-sky-300">第 1 步：認識開局</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      雙方皆從 <span className="text-amber-300 font-semibold">0 座塔＋僅主堡（{STARTING_GOLD_STANDARD}G）</span> 開局，所有路線預設為「守外塔」，[F] 種族大招開局鎖定 {FACTION_SKILL_INITIAL_COOLDOWN}s、[S] 掃描開局鎖定 {SCAN_INITIAL_COOLDOWN}s。
                    </p>
                  </div>
                  <div className="p-2.5 rounded bg-[#0A111A] border border-slate-800 space-y-1">
                    <div className="font-bold text-amber-300">第 2 步：出兵與控線</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      按 <span className="font-mono-num text-slate-100">1/2/3</span> 選路線，按 <span className="font-mono-num text-slate-100">Q/W</span> 徵兵（各單位 CD 獨立可同時產），再切「推進／強攻／守外塔」下達戰術。
                    </p>
                  </div>
                  <div className="p-2.5 rounded bg-[#0A111A] border border-slate-800 space-y-1">
                    <div className="font-bold text-emerald-300">第 3 步：佔礦、蓋塔與瓦斯</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      點地圖空塔基或按 <span className="font-mono-num text-slate-100">[T]</span> 蓋塔；按 <span className="font-mono-num text-teal-300">[P]</span> 於主堡與塔後方建<span className="text-teal-200 font-semibold">瓦斯挖掘場</span>（金幣升級至 Lv.3）。施工／升級中<span className="text-amber-200 font-semibold">連點兩下可取消全額退費</span>！
                    </p>
                  </div>
                  <div className="p-2.5 rounded bg-[#0A111A] border border-slate-800 space-y-1">
                    <div className="font-bold text-violet-300">第 4 步：前置建築與升階</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      按 <span className="font-mono-num text-slate-100">[</span> 建生物研究所、<span className="font-mono-num text-slate-100">]</span> 建機械軍工廠（地面機械與空軍共用）解鎖攻防升級；<span className="font-mono-num text-slate-100">, / . / /</span> 建 T1/T2/T3 兵營並升 Lv.2–4 並行產 2–4 組！
                    </p>
                  </div>
                  <div className="p-2.5 rounded bg-[#0A111A] border border-slate-800 space-y-1">
                    <div className="font-bold text-teal-300">第 5 步：偵察、開火暴露與野怪</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      前期 3.5 分鐘野怪不主動追擊偵察兵；非隱形敵軍於迷霧外開火會向<span className="text-amber-200 font-semibold">玩家肉眼暴露 2.6s</span>（但己方單位無法盲打），配合 <span className="font-mono-num text-slate-100">[S]</span> 掃描與 <span className="font-mono-num text-slate-100">[X]</span> 第四路編隊靈活反打！
                    </p>
                  </div>
                </div>
              </section>

              {/* Visual Skill & Tech Dependency Tree with Icons */}
              <section className="rounded-lg bg-[#111926] border border-slate-800 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    技能樹與建築圖示總覽（滿足科技前置即可任意並行研發）
                  </h3>
                  <span className="text-[11px] text-emerald-300 font-mono-num">
                    無同時研發上限 · 全部科技線皆可並行點擊
                  </span>
                </div>

                {/* 3-Tier Horizontal Progression Flow */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
                  {/* Tier 1 */}
                  <div className="p-3 rounded bg-[#0A1018] border border-sky-600/45 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="font-bold text-sky-300 flex items-center gap-1.5">
                        <Shield className="w-4 h-4" /> T1 基礎時代（開局）
                      </span>
                      <span className="font-mono-num text-[10.5px] text-slate-400">基礎 {TECH_SUPPLY_BY_TIER[1]} 人口</span>
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-slate-300">
                      <li className="flex items-start gap-1.5">
                        <Swords className="w-3.5 h-3.5 text-sky-300 shrink-0 mt-0.5" />
                        <span><strong className="text-slate-100">基礎兵種 [Q]/[W]：</strong>免兵營直接出兵（各兵種 CD 獨立）；建「T1 兵營 Lv.1」解鎖 <strong className="text-amber-300">[Y] 精銳小隊</strong>，升級 Lv.2/3/4 後可同時重複產 2/3/4 組！</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Factory className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                        <span><strong className="text-slate-100">防禦塔與補給站：</strong>全種防禦塔（哨/砲/科/經/干）T1 皆可建並升至 Lv.3（升級時照常採礦）；補給站 [B] 可點擊主堡外側任意空位自選建造。</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0 mt-0.5" />
                        <span><strong className="text-slate-100">軍械攻防 Lv.1：</strong>鐵砧 6 線為「生物 [G/U] · 機械 [H/I] · 空軍 [J/O]」攻防，T1 即可先升 +1。</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Radar className="w-3.5 h-3.5 text-cyan-300 shrink-0 mt-0.5" />
                        <span><strong className="text-slate-100">戰術技：</strong>[S] 免費掃描（開局鎖定 {SCAN_INITIAL_COOLDOWN}s · 稀缺破隱）、[X] 免費編隊（第四路）、[F] 種族主動技（開局鎖定 {FACTION_SKILL_INITIAL_COOLDOWN}s）。</span>
                      </li>
                    </ul>
                  </div>

                  {/* Tier 2 */}
                  <div className="p-3 rounded bg-[#0A1018] border border-amber-500/45 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <Cpu className="w-4 h-4" /> T2 進階時代（[D] {TECH_UPGRADE_COSTS[1]}G · {TECH_UPGRADE_TIMES[1]}s）
                      </span>
                      <span className="font-mono-num text-[10.5px] text-slate-400">基礎 {TECH_SUPPLY_BY_TIER[2]} 人口</span>
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-slate-300">
                      <li className="flex items-start gap-1.5">
                        <Wind className="w-3.5 h-3.5 text-cyan-300 shrink-0 mt-0.5" />
                        <span><strong className="text-slate-100">解鎖中堅兵種 [E]/[R] 與 T2 營：</strong>攻城迫擊砲 [E]（重甲機械）／火焰兵 [R]（輕甲機械 · 中近戰烈焰 AOE）；建「T2 兵營 Lv.1」解鎖鐵砧 <strong className="text-cyan-300">[N] 女武神戰機</strong>（15s 戰鬥隱形），升 Lv.2/3/4 可同時重複產 2/3/4 組！</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0 mt-0.5" />
                        <span><strong className="text-slate-100">全塔時代強化 ＋ 軍械 Lv.2：</strong>全場防禦塔血量自動 +{Math.round((TOWER_TECH_TIER_HP_PERMILLE[2] - 1000) / 10)}%、武裝塔傷害 +{TOWER_TECH_TIER_DMG_BONUS[2]}；軍械解鎖至 +2。</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-violet-300 shrink-0 mt-0.5" />
                        <span><strong className="text-slate-100">專屬科技一階 [K] ＆ [L]：</strong>鐵砧 [K] 生物脫戰回血＋機械拆塔+5＋視野；[L] 解鎖塔對空、塔「⚡科技」偵隱升級、塔視野/射程/護甲。</span>
                      </li>
                    </ul>
                  </div>

                  {/* Tier 3 */}
                  <div className="p-3 rounded bg-[#0A1018] border border-violet-500/45 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="font-bold text-violet-300 flex items-center gap-1.5">
                        <Flame className="w-4 h-4" /> T3 終極時代（[D] {TECH_UPGRADE_COSTS[2]}G · {TECH_UPGRADE_TIMES[2]}s）
                      </span>
                      <span className="font-mono-num text-[10.5px] text-slate-400">基礎 {TECH_SUPPLY_BY_TIER[3]} 人口</span>
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-slate-300">
                      <li className="flex items-start gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-rose-300 shrink-0 mt-0.5" />
                        <span><strong className="text-slate-100">解鎖終極主力 [C]/[V] 與 T3 營：</strong>鷹眼偵察機 [C]（空中反隱！）／泰坦機甲 [V]；建「T3 兵營 Lv.1」解鎖鐵砧 <strong className="text-amber-300">[M] 天穹砲艇</strong>，升 Lv.2/3/4 可同時重複產 2/3/4 組！</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0 mt-0.5" />
                        <span><strong className="text-slate-100">全塔時代強化 ＋ 軍械 Lv.3：</strong>全場防禦塔血量自動 +{Math.round((TOWER_TECH_TIER_HP_PERMILLE[3] - 1000) / 10)}%、武裝塔傷害 +{TOWER_TECH_TIER_DMG_BONUS[3]}；軍械開放升滿 +3。</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-fuchsia-300 shrink-0 mt-0.5" />
                        <span><strong className="text-slate-100">專屬科技二階 [K] II / [L] II：</strong>鐵砧 [K] II 強化生物回血/機械對建築+10/全局視野；[L] II 重砲對空全面強化且全塔+2甲/+12%射程。</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Tower Icon Legend Row */}
                <div className="pt-1 border-t border-slate-800/80">
                  <div className="text-[11px] font-semibold text-slate-400 mb-2">五大防禦塔圖示與定位速覽（詳細 Lv.1–3 數值與三路升級請見「防禦塔、兵營與經濟」頁）：</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-[11px]">
                    {(['watchtower', 'artillery', 'tech_tower', 'econ_tower', 'disruptor'] as TowerType[]).map((tt) => {
                      const td = TOWER_DEFS[tt];
                      const meta = TOWER_ICON_MAP[tt];
                      return (
                        <div key={tt} className={`p-2 rounded bg-[#0A1018] border ${meta.color} space-y-0.5`}>
                          <div className="flex items-center gap-1.5 font-bold text-slate-100">
                            {meta.icon}
                            <span>{td.name}</span>
                          </div>
                          <div className="text-[10px] text-sky-300">{meta.badge}</div>
                          <div className="font-mono-num text-[10px] text-amber-300">{td.cost}G · {td.buildTime}s</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Complete Unit Mechanics Encyclopedia */}
              <section className="rounded-lg bg-[#111926] border border-slate-800 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-slate-100">
                    全部隊核心機制百科（零隱藏規則 · 所有特殊能力運作方式公開）
                  </h3>
                  <span className="text-[11px] text-slate-400">每一條皆直接對應戰場引擎原始實作</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded bg-[#0B1018] border border-slate-800 space-y-1">
                    <div className="font-bold text-sky-300">① 陸軍與空軍（對空判定）</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      僅標記「可對空」的單位與塔才能攻擊空軍（純對地單位如盾衛、泰坦、迫擊砲、未升 [L] 的重砲塔會完全無視空軍）。<span className="text-sky-200 font-semibold">空軍可直接飛越邊路「遠古路障」</span>而不受阻擋！
                    </p>
                  </div>
                  <div className="p-2.5 rounded bg-[#0B1018] border border-slate-800 space-y-1">
                    <div className="font-bold text-violet-300">② 潛行（隱身）與稀缺反隱偵測</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      <span className="text-cyan-200 font-semibold">女武神戰機 [N]：</span>遭遇敵軍啟動 <span className="font-mono-num text-amber-300">15s</span> 戰鬥隱形（開火不破隱），歸零顯形後脫戰 4 秒回復滿額隱形。<span className="text-violet-200 font-semibold">幽影刺客：</span>常駐潛行，開火顯形 2.4s（[K] 縮至 1.2s）。<span className="text-rose-200 font-semibold">偵隱為稀缺資源：</span>主堡與基礎哨塔<span className="text-rose-300 font-bold">均無反隱</span>，全場僅「掃描 [S]、古塔遺跡、升級『⚡科技』的防禦塔、行動反隱單位（鷹眼偵察機 [C]）」能破隱！
                    </p>
                  </div>
                  <div className="p-2.5 rounded bg-[#0B1018] border border-slate-800 space-y-1">
                    <div className="font-bold text-cyan-300">③ 護盾、獨立護盾甲與脫戰回復</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      傷害先扣除護盾並套用獨立「護盾裝甲」（不扣本體甲）；擊破護盾後的溢出傷害才轉入血量並扣除「本體裝甲」。晨曦單位脫戰 3 秒後自動回盾（聖陽巨像另有 +8/s 護盾光環）；鐵砧研發 [K] 後所有 <span className="text-emerald-300 font-semibold">[生物]</span> 部隊脫戰會緩慢自動回血（2.5%/s → 4.5%/s）。
                    </p>
                  </div>
                  <div className="p-2.5 rounded bg-[#0B1018] border border-slate-800 space-y-1">
                    <div className="font-bold text-amber-300">④ 多段連射與範圍濺射（AOE）</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      雙發武器（如女武神、尖嘯飛龍）<span className="text-amber-200 font-semibold">每一發都獨立扣除一次目標裝甲</span>，天然被高甲單位克制。濺射傷害依距爆心距離分三段定點衰減：<span className="font-mono-num text-emerald-300">核心 100% / 中圈 68% / 外圈 38%</span>。
                    </p>
                  </div>
                  <div className="p-2.5 rounded bg-[#0B1018] border border-slate-800 space-y-1">
                    <div className="font-bold text-emerald-300">⑤ 自爆、腐蝕緩速與定期孵化</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      <span className="text-emerald-200 font-semibold">自爆（毒囊蟲）：</span>貼身引爆 72px 地面 AOE 並附帶緩速，自身同歸於盡（不給敵方殺敵賞金）。<span className="text-emerald-200 font-semibold">腐蝕（酸液蟲）：</span>命中施加緩速。<span className="text-emerald-200 font-semibold">孵化（利維坦）：</span>每 9.5s 自動免費生出疾爪蟲。
                    </p>
                  </div>
                  <div className="p-2.5 rounded bg-[#0B1018] border border-slate-800 space-y-1">
                    <div className="font-bold text-rose-300">⑥ 普攻前後搖與賞金規則</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      每次攻擊皆鎖定移動 <span className="font-mono-num text-slate-200">34% 攻擊間隔（200–480ms；撤退中 36% / 220–520ms）</span>，無法靠切姿態取消後搖。擊殺敵兵除蟲巢外一律 <span className="font-mono-num text-amber-300">0G</span>；<span className="text-rose-200 font-semibold">摧毀任何敵方建築全文明一律 0G</span>（僅拆野區中立目標有賞金）。
                    </p>
                  </div>
                </div>
              </section>

              {/* Status Buff / Debuff Exact Values Table */}
              <section className="rounded-lg bg-[#111926] border border-slate-800 overflow-hidden">
                <div className="px-3.5 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-100">全場狀態效果（Buff / Debuff）精確數值一覽</span>
                  <span className="text-[11px] text-amber-300">第四路 [X] 編隊已取消任何屬性加成，維持 100% 公平白板對決</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                    <thead>
                      <tr className="bg-[#0B1018] text-[11px] text-slate-400 border-b border-slate-800">
                        <th className="py-2 px-3">狀態名稱</th>
                        <th className="py-2 px-2">觸發來源</th>
                        <th className="py-2 px-2">移速變化</th>
                        <th className="py-2 px-2">攻擊間隔變化</th>
                        <th className="py-2 px-3">額外效果與持續時間</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-mono-num text-[11.5px]">
                      <tr className="hover:bg-[#162030]/60">
                        <td className="py-2 px-3 font-bold text-amber-300">全軍士氣鼓舞</td>
                        <td className="py-2 px-2 text-slate-300 font-sans">野怪營地 / 空投 / 裂隙 / 湧流</td>
                        <td className="py-2 px-2 text-emerald-300">+15%</td>
                        <td className="py-2 px-2 text-emerald-300">×86%（攻速+16%）</td>
                        <td className="py-2 px-3 text-slate-200 font-sans">每發攻擊 <span className="font-mono-num text-amber-300">+2 固定傷害</span>（依事件持續 10–40 秒）</td>
                      </tr>
                      <tr className="hover:bg-[#162030]/60">
                        <td className="py-2 px-3 font-bold text-sky-300">聖光加速（Haste）</td>
                        <td className="py-2 px-2 text-slate-300 font-sans">晨曦 [F] 聖盾矩陣 / 傭兵增援</td>
                        <td className="py-2 px-2 text-emerald-300">+35%</td>
                        <td className="py-2 px-2 text-emerald-300">×74%（攻速+35%）</td>
                        <td className="py-2 px-3 text-slate-200 font-sans">持續 6.0 秒（晨曦 [F] 另立即補充 +45 護盾）</td>
                      </tr>
                      <tr className="hover:bg-[#162030]/60">
                        <td className="py-2 px-3 font-bold text-rose-300">干擾 / 腐蝕緩速</td>
                        <td className="py-2 px-2 text-slate-300 font-sans">干擾力場塔 / 酸液蟲 / 毒囊蟲</td>
                        <td className="py-2 px-2 text-rose-300">-45%（剩55%）</td>
                        <td className="py-2 px-2 text-rose-300">×135%（攻速-26%）</td>
                        <td className="py-2 px-3 text-slate-200 font-sans">同時拖慢行軍與開火頻率，克制近戰衝臉與高攻速兵團</td>
                      </tr>
                      <tr className="hover:bg-[#162030]/60">
                        <td className="py-2 px-3 font-bold text-slate-200">路線／編隊姿態移速</td>
                        <td className="py-2 px-2 text-slate-300 font-sans">強攻 / 回主堡 姿態</td>
                        <td className="py-2 px-2 text-emerald-300">強攻+15% / 回防+12%</td>
                        <td className="py-2 px-2 text-slate-400">不變</td>
                        <td className="py-2 px-3 text-slate-200 font-sans">[Z] 撤退與推進／守外塔皆維持 100% 正常常態數值（第四路編隊一併適用）</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Keyboard Hotkey Cheatsheet + Fairness & AI Disclosure */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 text-xs">
                <div className="rounded-lg bg-[#111926] border border-slate-800 p-4 space-y-2.5">
                  <div className="font-bold text-sm text-sky-200 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                    <Keyboard className="w-4 h-4 text-sky-300" />
                    完整鍵盤快捷鍵速查表
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-400">選擇路線 / 第四路編隊</span>
                      <span className="font-mono-num text-slate-100">1 / 2 / 3 / 4</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-400">暫停 / 取消瞄準</span>
                      <span className="font-mono-num text-slate-100">Space / Esc</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-400">T1 徵兵（T1營解鎖）</span>
                      <span className="font-mono-num text-sky-300">Q / W（Y）</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-400">T2 徵兵（T2營解鎖）</span>
                      <span className="font-mono-num text-sky-300">E / R（N）</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-400">T3 徵兵（T3營解鎖）</span>
                      <span className="font-mono-num text-sky-300">C / V（M）</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-400">五種戰術姿態（推/強/守/回/撤）</span>
                      <span className="font-mono-num text-slate-100">5 / 6 / 7 / 8 / 9 (Z)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-400">修主堡外甲 / 鏡頭縮放 / 變速</span>
                      <span className="font-mono-num text-slate-100">0 / - / \</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-400">選塔型 / 切換升級方向</span>
                      <span className="font-mono-num text-amber-300">⇧1–4 (') / ⇧QWE (;)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-400">快捷建塔 / 補給站 / 瓦斯場</span>
                      <span className="font-mono-num text-amber-300">T / B / P</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-400">T1/T2/T3 兵營 / 生研 / 機廠</span>
                      <span className="font-mono-num text-amber-300">, . / ＆ [ ]</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-400">採礦升級 / 時代升階</span>
                      <span className="font-mono-num text-emerald-300">A / D</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-400">軍械攻防（生/機/空）</span>
                      <span className="font-mono-num text-emerald-300">G U · H I · J O</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-400">專屬科技 I / II ＆ 掃描 / 大招</span>
                      <span className="font-mono-num text-violet-300">K / L · S / F</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-400">奇襲編隊 / 解散編隊</span>
                      <span className="font-mono-num text-teal-300">X / ⇧R (連按X)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-400">靜音 / 聊天 / 取消建造</span>
                      <span className="font-mono-num text-sky-300">⌫ / Enter / 雙擊建築</span>
                    </div>
                    <div className="flex justify-between col-span-2 pt-0.5">
                      <span className="text-slate-400">沙盒模式專屬（切換陣營 / 滿科 / 瞬產 / 清場 / 重置）</span>
                      <span className="font-mono-num text-emerald-300">Tab (⇧A/⇧D) · ⇧Z · ⇧I · ⇧C · ⇧X</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-[#111926] border border-emerald-500/35 p-4 space-y-2.5">
                  <div className="font-bold text-sm text-emerald-300 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                    <Scale className="w-4 h-4 text-emerald-300" />
                    公平對決與 AI 難度公開透明表（絕無暗箱作弊）
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    <span className="text-emerald-200 font-semibold">線上 1v1 真人對戰：</span>雙方開局金幣（標準 {STARTING_GOLD_STANDARD}G / 簡易 {STARTING_GOLD_SIMPLE}G）、採礦速率、攻防公式、建築位置與戰爭迷霧視野 <span className="font-mono-num text-emerald-300 font-bold">100% 絕對對稱公平</span>，由伺服器權威定點數引擎結算。
                  </p>
                  <div className="space-y-1.5 text-[11px]">
                    {DIFFICULTY_ORDER.map((diff) => (
                      <div key={diff} className="p-2 rounded bg-[#0A1018] border border-slate-800 flex flex-col gap-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-100">{DIFFICULTY_META[diff].name}</span>
                          <span className={`font-mono-num text-[10.5px] ${diff === 'standard' ? 'text-emerald-300' : diff === 'commander' ? 'text-amber-300' : 'text-sky-300'}`}>
                            {diff === 'rookie' ? '採礦 90% · 同開局金' : diff === 'standard' ? '採礦 100% · 完全公平' : `採礦 112% · 開局 +${COMMANDER_BONUS_GOLD}G`}
                          </span>
                        </div>
                        <span className="text-slate-400">{DIFFICULTY_META[diff].desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 1: PLAYSTYLES & COUNTER TRIANGLE */}
          {activeTab === 'guides' && (
            <div className="space-y-5">
              {/* Simple 2-Lane Beginner & Quick-Match Guide */}
              <section className="rounded-lg bg-[#0D1E23] border border-teal-500/45 p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-teal-200">
                    新手推薦 / 快節奏首選：簡易雙線速戰模式
                  </h3>
                  <span className="text-[11px] font-mono-num text-teal-300/90">
                    寬距上下兩路 · 中央單一野區 · 採礦 +{Math.round((SIMPLE_ECON_PACE_MULT - 1) * 100)}% · 主堡 {SIMPLE_NEXUS_MAX_HP} HP · 精簡事件
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  移除了中路並將上下兩路拉開至最大距離，雙方同樣從 0 塔純主堡開局，自行決定要先鋪哪一路的礦塔或防塔，且大幅減少野區事件頻率、僅保留「高能戰備空投」與「迷霧巨像」兩種直覺事件。因為支援距離夠長，
                  <span className="text-amber-300 font-semibold">「專攻單路猛推」</span>與
                  <span className="text-teal-300 font-semibold">「按 [X] 穿越中央大野區避戰轉線或全速奇襲」</span>
                  都能打出極強戰術效果，非常適合新手理解與快節奏對局。
                </p>
              </section>

              {/* Strategic Counter Loop Overview */}
              <section className="rounded-lg bg-[#111926] border border-slate-700/80 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-slate-50">核心戰術博弈循環（沒有無敵單一打法）</h3>
                  <span className="text-[11px] text-slate-400">偵察判斷對手意圖 → 切換對應套路反制</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-3 rounded bg-[#0B1018] border border-rose-500/40 space-y-1">
                    <div className="font-bold text-rose-300">① 邊路快攻壓制</div>
                    <div className="text-[11px] text-slate-300">
                      <span className="text-emerald-300 font-semibold">克制：</span>貪心跳科 / 裸升採礦
                    </div>
                    <div className="text-[11px] text-slate-400">
                      <span className="text-rose-300 font-semibold">被克：</span>提早補塔＋守外塔
                    </div>
                  </div>

                  <div className="p-3 rounded bg-[#0B1018] border border-sky-500/40 space-y-1">
                    <div className="font-bold text-sky-300">② 堅壁龜家跳階</div>
                    <div className="text-[11px] text-slate-300">
                      <span className="text-emerald-300 font-semibold">克制：</span>無偵察單線快攻
                    </div>
                    <div className="text-[11px] text-slate-400">
                      <span className="text-rose-300 font-semibold">被克：</span>野區控圖 / 迫擊砲 / 空優
                    </div>
                  </div>

                  <div className="p-3 rounded bg-[#0B1018] border border-amber-500/40 space-y-1">
                    <div className="font-bold text-amber-300">③ 擴張蓋塔奪礦</div>
                    <div className="text-[11px] text-slate-300">
                      <span className="text-emerald-300 font-semibold">克制：</span>消極龜家（礦枯竭＋折扣差）
                    </div>
                    <div className="text-[11px] text-slate-400">
                      <span className="text-rose-300 font-semibold">被克：</span>抓工地快攻 / 攻城拆塔
                    </div>
                  </div>

                  <div className="p-3 rounded bg-[#0B1018] border border-teal-500/40 space-y-1">
                    <div className="font-bold text-teal-300">④ 野區奇襲與空優</div>
                    <div className="text-[11px] text-slate-300">
                      <span className="text-emerald-300 font-semibold">克制：</span>重砲陣地 / 死守單線
                    </div>
                    <div className="text-[11px] text-slate-400">
                      <span className="text-rose-300 font-semibold">被克：</span>哨塔反隱防空 / 干擾塔留人
                    </div>
                  </div>
                </div>
              </section>

              {/* Ironbound Benchmark 5-Strategy Playbook */}
              <section className="rounded-lg bg-[#0E1828] border border-sky-500/45 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-sky-200">
                    鐵砧聯邦（基準節奏）五大核心套路與相互克制表
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    易上手難精通：每套打法都有銳利強度，也都有明確反制破口
                  </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {IRONBOUND_FIVE_STRATEGIES.map((st) => (
                    <div
                      key={st.id}
                      className="rounded bg-[#0A1018] border border-slate-800 p-3 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5">
                        <span className="font-bold text-slate-100">{st.title}</span>
                        <span className={`text-[11px] font-semibold whitespace-nowrap ${st.tagTone}`}>{st.tag}</span>
                      </div>
                      <div className="space-y-1 text-[11px]">
                        <div>
                          <span className="text-emerald-300 font-semibold">克制：</span>
                          <span className="text-slate-200">{st.beats}</span>
                        </div>
                        <div>
                          <span className="text-rose-300 font-semibold">被克：</span>
                          <span className="text-slate-400">{st.weakTo}</span>
                        </div>
                      </div>
                      <ol className="space-y-1 text-[11.5px] text-slate-300 leading-relaxed border-t border-slate-800/70 pt-1.5">
                        {st.steps.map((step, i) => (
                          <li key={i} className="flex gap-1.5">
                            <span className="font-mono-num text-sky-300 font-bold shrink-0">{i + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </section>

              {/* 4 General Playstyle Playbooks */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {STRATEGY_PLAYBOOKS.map((pb) => (
                  <div
                    key={pb.id}
                    className="rounded-lg bg-[#111926] border border-slate-800 p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-800/90 pb-2">
                        <h4 className="text-sm font-bold text-slate-100">{pb.title}</h4>
                        <span className={`text-[11px] font-semibold whitespace-nowrap ${pb.tagTone}`}>
                          {pb.tag}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-300 space-y-1">
                        <div>
                          <span className="text-slate-400">推薦文明：</span>
                          <span className="text-slate-100">{pb.bestFactions}</span>
                        </div>
                        <div>
                          <span className="text-emerald-300 font-semibold">優勢對局：</span>
                          <span>{pb.beats}</span>
                        </div>
                        <div>
                          <span className="text-rose-300 font-semibold">劣勢風險：</span>
                          <span>{pb.weakTo}</span>
                        </div>
                      </div>

                      <ol className="space-y-1.5 text-xs text-slate-200 leading-relaxed border-t border-slate-800/80 pt-2">
                        {pb.steps.map((s, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="font-mono-num text-sky-300 font-bold shrink-0">{idx + 1}.</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="px-3 py-2 rounded bg-[#0A1018] border border-slate-800 text-[11px] text-amber-200/90 leading-relaxed">
                      <span className="font-bold text-amber-300">遭遇破解法：</span>
                      {pb.counterTip}
                    </div>
                  </div>
                ))}
              </section>

              {/* Civilization Signature Builds */}
              <section className="rounded-lg bg-[#111926] border border-slate-800 p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2">
                  三大文明招牌進階路線速查
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {FACTION_SIGNATURE_BUILDS.map((b) => {
                    const f = FACTIONS[b.factionId];
                    return (
                      <div key={b.factionId} className="p-3 rounded bg-[#0B1018] border border-slate-800 space-y-1.5">
                        <div className="font-bold text-sm" style={{ color: f.accentLightHex }}>
                          {b.title}
                        </div>
                        <div className="text-[11px] text-slate-300">
                          <span className="text-slate-400">核心編隊：</span>
                          {b.coreUnits}
                        </div>
                        <div className="text-[11px] text-sky-200">
                          <span className="text-slate-400">優先科技：</span>
                          {b.keyTech}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-slate-800/80">
                          {b.plan}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: CIVILIZATIONS & 18-UNIT EXACT DATA TABLE */}
          {activeTab === 'factions' && (
            <div className="space-y-4">
              {/* Faction Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex p-1 rounded-md bg-[#0A1018] border border-slate-800">
                  {FACTION_ORDER.map((fid) => {
                    const f = FACTIONS[fid];
                    const active = selectedFaction === fid;
                    return (
                      <button
                        key={fid}
                        type="button"
                        onClick={() => setSelectedFaction(fid)}
                        className={`px-3.5 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                          active ? 'bg-slate-200 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {f.name}
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs text-slate-400">{faction.subtitle}</span>
              </div>

              {/* Faction Core Mechanics Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-lg bg-[#111926] border border-slate-800 space-y-2">
                  <div className="font-bold text-sm" style={{ color: faction.accentLightHex }}>
                    {faction.name} · 文明特性與主動技
                  </div>
                  <div className="text-slate-200 leading-relaxed">
                    <span className="text-slate-400 font-semibold">被動【{faction.passiveName}】：</span>
                    {faction.passiveDesc}
                  </div>
                  <div className="text-slate-200 leading-relaxed">
                    <span className="text-amber-300 font-semibold">
                      主動 [F]【{faction.activeName}】({faction.activeCost}G · {faction.activeCooldown}s冷卻 · 開局鎖 {FACTION_SKILL_INITIAL_COOLDOWN}s)：
                    </span>
                    {faction.activeDesc}
                  </div>
                  <div className="text-[11px] font-mono-num text-sky-300">
                    戰術掃描 [S]：免費 · 冷卻 {faction.scanCooldown}s（開局鎖 {SCAN_INITIAL_COOLDOWN}s）· 半徑 {faction.scanRadius}px · 持續 {faction.scanDuration}s（可破隱）
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#111926] border border-slate-800 space-y-2">
                  <div className="font-bold text-sm text-sky-200">
                    非對稱軍械科技（{faction.armorySummary}）
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    {faction.armoryTrackOrder.map((tid) => {
                      const tr = faction.armoryTracks[tid];
                      if (!tr) return null;
                      return (
                        <div key={tid} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800/70 pb-1">
                          <div>
                            <span className="font-mono-num text-amber-300 mr-1">[{tr.hotkey}]</span>
                            <span className="font-semibold text-slate-100">{tr.name}</span>
                            <span className="text-slate-400 ml-1.5">{tr.desc}</span>
                          </div>
                          <span className="font-mono-num text-slate-300 whitespace-nowrap shrink-0">
                            {tr.costs.join('/')}G · {tr.times.join('/')}s
                          </span>
                        </div>
                      );
                    })}
                    {faction.specialTechs.map((sp) => (
                      <div key={sp.slot} className="space-y-1 border-b border-slate-800/50 pb-1 last:border-b-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-violet-200">
                          <div>
                            <span className="font-mono-num text-violet-300 mr-1">[{sp.hotkey}]</span>
                            <span className="font-semibold">
                              T{sp.tierReq} 專屬·{sp.name}：
                            </span>
                            <span className="text-slate-300">{sp.desc}</span>
                          </div>
                          <span className="font-mono-num text-violet-300 whitespace-nowrap shrink-0">
                            {sp.cost}G · {sp.time}s
                          </span>
                        </div>
                        {sp.level2 && (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pl-3 text-fuchsia-200">
                            <div>
                              <span className="font-mono-num text-fuchsia-300 mr-1">↳</span>
                              <span className="font-semibold">
                                T{sp.level2.tierReq} 進階·{sp.level2.name}：
                              </span>
                              <span className="text-slate-300">{sp.level2.desc}</span>
                            </div>
                            <span className="font-mono-num text-fuchsia-300 whitespace-nowrap shrink-0">
                              {sp.level2.cost}G · {sp.level2.time}s
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Complete Unit Stats Table */}
              <div className="rounded-lg bg-[#111926] border border-slate-800 overflow-hidden">
                <div className="px-3.5 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-100">
                    {faction.name} · {faction.units.length} 兵種完整數值、特效與克制表（基礎 0 攻防）
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono-num">手機可左右滑動表格</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs min-w-[920px]">
                    <thead>
                      <tr className="bg-[#0B1018] text-[11px] text-slate-400 border-b border-slate-800">
                        <th className="py-2 px-3">兵種 / 熱鍵</th>
                        <th className="py-2 px-2">造價 / 時間 / 前置</th>
                        <th className="py-2 px-2">屬性標籤與陸空</th>
                        <th className="py-2 px-2">血量 (+盾) / 甲</th>
                        <th className="py-2 px-2">單輪傷害 / 間隔 / 升級</th>
                        <th className="py-2 px-2">射程/移速/視野</th>
                        <th className="py-2 px-3">標籤固定加成、特效與克制</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {faction.units.map((u) => {
                        const squadDps = (u.damage * u.attackCount * u.attackRate * u.squadSize).toFixed(1);
                        const totalEhp = (u.hp + u.shield) * u.squadSize;
                        const domainStr = u.domain === 'air' ? '空軍' : '陸軍';
                        const rangeStr = u.combatRange === 'melee' ? (u.range >= 60 ? '中近戰' : '近戰') : '遠程';
                        const flatBonuses = Object.entries(u.bonusVsTag ?? {})
                          .filter(([, v]) => (v ?? 0) > 0)
                          .map(([k, v]) => {
                            const tag = k as AttributeTag;
                            const perLv = u.bonusPerLevelVsTag?.[tag] ?? 0;
                            return `對[${ATTRIBUTE_TAG_LABELS[tag]}] +${v}${perLv > 0 ? `(+${perLv}/級)` : ''}`;
                          });
                        return (
                          <tr key={u.id} className="hover:bg-[#162030]/60 align-top">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-100 whitespace-nowrap">
                                <span className="font-mono-num text-slate-400 mr-1">[{u.hotkey}]</span>
                                {u.name}
                                <span className="font-mono-num text-sky-300 ml-1">×{u.squadSize}</span>
                              </div>
                              <div className="text-[10.5px] text-slate-400">{u.roleLabel}</div>
                            </td>
                            <td className="py-2.5 px-2 font-mono-num whitespace-nowrap">
                              <div className="text-amber-300 font-bold">
                                {u.cost}G · {u.trainTime}s · {u.supplyCost}人
                              </div>
                              <div className="text-[10.5px] text-slate-400">
                                需科技 T{u.tier}
                                {u.requiresBarracksTier ? ` ＋ T${u.requiresBarracksTier}兵營` : ''}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 whitespace-nowrap">
                              <div className="flex flex-wrap gap-1 mb-0.5">
                                {u.attributes.map((tag) => (
                                  <span
                                    key={tag}
                                    className={`px-1.5 py-0.2 rounded border text-[9.5px] font-semibold ${ATTRIBUTE_TAG_BADGE_COLORS[tag]}`}
                                  >
                                    {ATTRIBUTE_TAG_LABELS[tag]}
                                  </span>
                                ))}
                              </div>
                              <div className={`text-[10.5px] ${u.canHitAir ? 'text-sky-300' : 'text-slate-500'}`}>
                                {domainStr} · {rangeStr} · {u.canHitAir ? '可對空' : '僅對地'}
                                {u.cloakDurationSec ? ` · ${u.cloakDurationSec}s戰隱` : u.cloaked ? ' · 潛行' : ''}
                                {u.detector ? ' · 反隱偵測' : ''}
                                {u.suicidal ? ' · 自爆' : ''}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 font-mono-num whitespace-nowrap">
                              <div className="text-slate-100">
                                {u.hp}
                                {u.shield > 0 && <span className="text-sky-300">+{u.shield}盾</span>}
                                <span className="text-slate-400"> / {u.armor}甲</span>
                                {u.shield > 0 && (
                                  <span className="text-sky-300">({u.shieldArmor ?? 0}盾甲)</span>
                                )}
                              </div>
                              <div className="text-[10.5px] text-slate-400">
                                總有效血 {totalEhp} · +{u.armorPerLevel}甲/級
                              </div>
                            </td>
                            <td className="py-2.5 px-2 font-mono-num whitespace-nowrap">
                              <div className="text-slate-100">
                                {u.damage}
                                {u.attackCount > 1 && <span className="text-amber-300">×{u.attackCount}發</span>}
                                <span className="text-slate-400"> / {(u.attackIntervalMs / 1000).toFixed(2)}s</span>
                              </div>
                              <div className="text-[10.5px] text-emerald-300 font-semibold">
                                編隊 {squadDps} DPS · +{u.damagePerLevel}攻/級
                                {u.splashRadius ? ` (濺${u.splashRadius})` : ''}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 font-mono-num whitespace-nowrap text-slate-300">
                              <div>
                                射 {u.range} · 速 {u.speed}
                              </div>
                              <div className="text-[10px] text-slate-400">視野 {u.vision}</div>
                            </td>
                            <td className="py-2.5 px-3 text-[11px] leading-snug space-y-0.5 max-w-[310px]">
                              <div className="text-sky-200 font-semibold">
                                {flatBonuses.length > 0 ? flatBonuses.join(' · ') : '無標籤加成（純基礎傷）'}
                                {u.attackCount > 1 && (
                                  <span className="text-amber-300 ml-1">· 每發獨立扣甲</span>
                                )}
                                {u.auraShield && <span className="text-amber-300 ml-1">· 友軍護盾光環</span>}
                                {u.spawnerInterval && (
                                  <span className="text-emerald-300 ml-1">· 每 {u.spawnerInterval}s 孵化疾爪蟲</span>
                                )}
                              </div>
                              {u.specialEffectNote && (
                                <div className="text-slate-300">
                                  <span className="text-slate-400">特效：</span>
                                  {u.specialEffectNote}
                                </div>
                              )}
                              <div className="text-emerald-300/95">
                                <span className="text-slate-400">克制：</span>
                                {u.counterNote}
                              </div>
                              {u.weakAgainstNote && (
                                <div className="text-rose-300/90">
                                  <span className="text-slate-400">弱點：</span>
                                  {u.weakAgainstNote}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DETERMINISTIC FIXED-POINT FLAT-SUBTRACTION COMBAT & 4 CLASSIC ARCHETYPES */}
          {activeTab === 'combat' && (
            <div className="space-y-4">
              {/* Deterministic Fixed-Point Flat-Subtraction Formulas */}
              <section className="rounded-lg bg-[#111926] border border-slate-800 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-slate-100">
                    確定性定點數攻防系統：線性純減法 + 屬性標籤正向加成（零浮點數 / 零百分比減傷）
                  </h3>
                  <span className="font-mono-num text-[11px] text-emerald-300 bg-emerald-950/50 border border-emerald-500/40 rounded px-2 py-0.5">
                    定點數精度 ×{FP_SCALE}（0.5 保底 = {MIN_HIT_DAMAGE_FP}）
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 font-mono-num text-[11.5px] leading-relaxed">
                  <div className="p-3 rounded bg-[#0A1018] border border-sky-700/50 space-y-1.5">
                    <div className="font-bold text-sky-300">① 核心線性減法公式（Flat Subtraction）</div>
                    <div className="text-slate-100">
                      單次實際傷害 = max(0.5, (基礎攻 + 攻升×每級增量 + Σ匹配標籤加成) − (基礎甲 + 甲升×每級增量))
                    </div>
                    <div className="text-sky-200">
                      單輪總傷害 = Σ[i = 1..AttackCount] 單次實際傷害(i)
                    </div>
                    <div className="text-[10.5px] text-slate-400">
                      全場戰鬥引擎以整數定點數（×1000）運算，嚴禁任何隱藏單位 ID 倍率與百分比減傷。
                    </div>
                  </div>
                  <div className="p-3 rounded bg-[#0A1018] border border-amber-700/50 space-y-1.5">
                    <div className="font-bold text-amber-300">② 三大關鍵戰鬥鐵則</div>
                    <div className="text-slate-200">
                      • <span className="text-amber-200 font-bold">0.5 保底傷害：</span>無論目標裝甲多高，單次命中保底造成 <span className="text-amber-300">0.5</span> 傷害（500 定點數）。
                    </div>
                    <div className="text-slate-200">
                      • <span className="text-emerald-300 font-bold">多段攻擊獨立扣甲：</span>Attack Count = 2（如女武神／飛龍）每發都獨立扣一次目標裝甲！
                    </div>
                    <div className="text-slate-200">
                      • <span className="text-sky-300 font-bold">護盾優先與溢出判定：</span>護盾套用獨立「護盾裝甲」；破盾溢出傷害轉入血量後再單獨扣「本體裝甲」。
                    </div>
                  </div>
                  <div className="p-3 rounded bg-[#0A1018] border border-slate-800 space-y-1">
                    <div className="font-bold text-emerald-300">③ 攻擊間隔（ms）、距離與濺射衰減</div>
                    <div className="text-slate-200">
                      實戰接敵距離 = 基礎射程 + 目標碰撞半徑（塔基 20px / 單位 7–19px）
                    </div>
                    <div className="text-emerald-200">
                      攻擊間隔以整數毫秒計時；濺射範圍依距離以定點千分比衰減：核心 100% / 中圈 68% / 外圈 38%。
                    </div>
                  </div>
                  <div className="p-3 rounded bg-[#0A1018] border border-slate-800 space-y-1">
                    <div className="font-bold text-teal-300">④ 攻防升級門檻與「≤3× 硬克制上限」平衡鐵則</div>
                    <div className="text-slate-200">
                      鐵砧生物/機械攻防：Lv.2 需 T2 或 T1營Lv.2；Lv.3 需 T3 或（T2＋T1營Lv.3），其餘軍械對應 T{ARMORY_TIER_REQ[0]}/T{ARMORY_TIER_REQ[1]}/T{ARMORY_TIER_REQ[2]}（無並行上限）。
                    </div>
                    <div className="text-teal-200">
                      公平平衡基準：滿攻防 +3/+3 下任何單位面對其「3 倍造價」滿攻防被克制目標時，優勢皆控制在 3 倍內，絕不出現無解碾壓！
                    </div>
                  </div>
                </div>
              </section>

              {/* 7 Attribute Tags Table */}
              <section className="rounded-lg bg-[#111926] border border-slate-800 p-4 space-y-2.5">
                <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2">
                  七大透明屬性標籤系統（Attributes）
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                  {ALL_ATTRIBUTE_TAG_DOCS.map((item) => (
                    <div
                      key={item.tag}
                      className="p-2.5 rounded bg-[#0B1018] border border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`px-1.5 py-0.5 rounded border text-[10.5px] font-bold ${ATTRIBUTE_TAG_BADGE_COLORS[item.tag]}`}
                        >
                          {item.tag} · {ATTRIBUTE_TAG_LABELS[item.tag]}
                        </span>
                        <span className="text-[10px] text-slate-500">{item.group}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">{item.desc}</p>
                    </div>
                  ))}
                  <div className="p-2.5 rounded bg-[#0A131C] border border-sky-800/50 space-y-1">
                    <div className="font-bold text-sky-300 text-[11px]">多標籤疊加實例</div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      防禦塔同時帶有 <span className="text-amber-300">[重甲·機械·建築]</span>：攻城迫擊砲(對建築+18，升[K]再+5/+10)與精銳小隊(對重甲+10)皆可觸發對應固定加成！
                    </p>
                  </div>
                </div>
              </section>

              {/* 4 Classic Unit Archetypes Counter Matrix */}
              <section className="rounded-lg bg-[#111926] border border-slate-800 overflow-hidden">
                <div className="px-3.5 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-100">
                    四大經典兵種定位與克制矩陣（Classic Archetypes Matrix）
                  </span>
                  <span className="text-[11px] text-amber-300">
                    所有克制純粹由線性加減法與屬性標籤自然湧現
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs min-w-[820px]">
                    <thead>
                      <tr className="bg-[#0B1018] text-[11px] text-slate-400 border-b border-slate-800">
                        <th className="py-2 px-3">角色原型</th>
                        <th className="py-2 px-2">攻擊特性與代表兵種</th>
                        <th className="py-2 px-2">傷害與裝甲結構</th>
                        <th className="py-2 px-3">戰術克制邏輯與實算範例</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {CLASSIC_ARCHETYPE_MATRIX.map((row) => (
                        <tr key={row.role} className="hover:bg-[#162030]/60 align-top">
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-bold text-slate-100">{row.title}</div>
                            <div className="text-[10.5px] text-slate-400">{row.specRef}</div>
                          </td>
                          <td className="py-2.5 px-2 max-w-[220px]">
                            <div className="text-sky-200 font-semibold">{row.attackProfile}</div>
                            <div className="text-[10.5px] text-slate-400 mt-0.5">{row.exampleUnits}</div>
                          </td>
                          <td className="py-2.5 px-2 font-mono-num text-amber-200 max-w-[230px]">
                            {row.damageStructure}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] leading-snug space-y-1">
                            <div className="text-slate-200">{row.tacticalLogic}</div>
                            <div className="text-emerald-300 font-mono-num text-[10.5px]">
                              實算：{row.numericalExample}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 5 Lane Stances & 4th-Lane Custom Squad Guide */}
              <section className="rounded-lg bg-[#111926] border border-slate-800 p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2">
                  五種戰線姿態（按介面由左至右順序）＆ [X] 第四路編隊完整機制
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
                  <div className="p-2.5 rounded bg-[#0B1018] border border-slate-800 space-y-1">
                    <div className="font-bold text-sky-300">① 推進（先殺人）</div>
                    <p className="text-[11px] text-slate-400">穩步沿該路向前推進，優先鎖定並殲滅視野內的敵方部隊，清空敵軍後再拆建築。</p>
                  </div>
                  <div className="p-2.5 rounded bg-[#0B1018] border border-amber-700/60 space-y-1">
                    <div className="font-bold text-amber-300">② 強攻（無視野怪 · 破塔 · 移速+15%）</div>
                    <p className="text-[11px] text-slate-300">完全無視沿途野怪，全速優先鎖定敵方防禦塔、補給站、兵營與主堡強拆，適合換家或趁對手無備速推。</p>
                  </div>
                  <div className="p-2.5 rounded bg-[#0B1018] border border-sky-700/60 space-y-1">
                    <div className="font-bold text-sky-200">③ 守外塔（開局預設）</div>
                    <p className="text-[11px] text-slate-400">於該路最外圍己方防禦塔前固守（編隊模式則駐守編隊目標點），配塔吃掉快攻。</p>
                  </div>
                  <div className="p-2.5 rounded bg-[#0B1018] border border-slate-800 space-y-1">
                    <div className="font-bold text-emerald-300">④ 回主堡（移速 +12%）</div>
                    <p className="text-[11px] text-slate-400">撤回主堡與內圈兵營／外側補給站區域防禦抄家（近家 270px 內遇敵仍會主動迎擊）。</p>
                  </div>
                  <div className="p-2.5 rounded bg-[#180D12] border border-rose-500/45 space-y-1">
                    <div className="font-bold text-rose-300">⑤ [Z] 撤退（常態數值 · 邊退邊打）</div>
                    <p className="text-[11px] text-slate-300">
                      維持 100% 常態數值，立即往主堡撤離（對選中路線或第四路編隊皆生效）；追兵進入實際射程時會停頓反擊，射程外不回頭追擊。
                    </p>
                  </div>
                </div>

                {/* Detailed [X] 4th-Lane Custom Squad Mechanism */}
                <div className="p-3.5 rounded-lg bg-[#09181D] border border-teal-500/50 text-xs text-teal-100 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-800/60 pb-1.5">
                    <span className="font-bold text-sm text-teal-200 flex items-center gap-1.5">
                      <Crosshair className="w-4 h-4 text-teal-300" />
                      [X] 第四路編隊系統（無數量上限 · 無屬性加成 · 自由轉線）
                    </span>
                    <span className="font-mono-num text-[11px] text-amber-300">
                      費用 {JUNGLE_AMBUSH_COST}G · 圈選半徑 {SQUAD_SELECT_RADIUS}px · 解散後冷卻 {JUNGLE_AMBUSH_COOLDOWN}s
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-200 leading-relaxed">
                    <div>
                      <span className="text-teal-300 font-bold">• 兩步圈選編隊：</span>
                      按 <span className="font-mono-num text-amber-300">[X]</span> 後先點擊戰場任意處，圈選 <span className="font-mono-num text-sky-200 font-semibold">{SQUAD_SELECT_RADIUS}px 內所有友軍戰鬥單位（不限數量）</span>；再點擊地圖任意位置即編成獨立的「第四路編隊 [4]」前往目標！選取過程中再按一次 [X] 即取消。
                    </div>
                    <div>
                      <span className="text-amber-300 font-bold">• 零額外屬性加成（純戰術調度）：</span>
                      編隊<span className="text-emerald-300 font-semibold">不提供任何隱藏攻速／移速／傷害加成</span>，與常規路線 100% 公平對等，純粹作為第四路靈活調遣！
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    <div className="px-2.5 py-2 rounded bg-[#071115] border border-teal-800/70 space-y-1">
                      <span className="font-bold text-emerald-300">① 獨立第四路 [4] · 全姿態掌控</span>
                      <div className="text-slate-300 leading-snug">
                        編隊完成後 [X] 鍵化為「編隊」頁籤（熱鍵 [4]），可獨立切換<span className="text-emerald-200 font-semibold">推進／強攻／守外塔／回主堡／撤退</span>五種姿態！
                      </div>
                    </div>
                    <div className="px-2.5 py-2 rounded bg-[#071115] border border-amber-700/60 space-y-1">
                      <span className="font-bold text-amber-300">② 穿越野區偷點 ＆ 討伐野怪</span>
                      <div className="text-slate-300 leading-snug">
                        編隊點在野區營地、晶礦或敵方側翼即可穿越野區包抄；切「強攻」會無視野怪直衝敵塔與主堡，按 [Z] 可隨時全隊邊退邊打撤退！
                      </div>
                    </div>
                    <div className="px-2.5 py-2 rounded bg-[#071115] border border-sky-800/70 space-y-1">
                      <span className="font-bold text-sky-300">③ 連按兩次 [X] 秒解散歸線</span>
                      <div className="text-slate-300 leading-snug">
                        編隊存在時<span className="text-amber-200 font-semibold">連按兩次 [X]（或點 ✕）</span>即可解散，每名單位自動歸屬至<span className="text-sky-200 font-semibold">距離自己最近的路線</span>並受該路姿態掌控，僅需 0.1 秒即可重新編隊！
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 4: TOWERS, MINING LV1-8, FINITE VEINS & SUPPLY */}
          {activeTab === 'economy' && (
            <div className="space-y-4">
              {/* Tower Comparison Table */}
              <section className="rounded-lg bg-[#111926] border border-slate-800 overflow-hidden">
                <div className="px-3.5 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-100">
                    五大防禦塔完整數值與三路升階（T1 基礎值 · T2 血+{Math.round((TOWER_TECH_TIER_HP_PERMILLE[2] - 1000) / 10)}%/傷+{TOWER_TECH_TIER_DMG_BONUS[2]} · T3 血+{Math.round((TOWER_TECH_TIER_HP_PERMILLE[3] - 1000) / 10)}%/傷+{TOWER_TECH_TIER_DMG_BONUS[3]}）
                  </span>
                  <span className="text-[11px] text-amber-300">
                    新建施工期間無功能；已建塔升級時「採礦照常運作」，但升級額外血被打掉會降級！
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs min-w-[900px]">
                    <thead>
                      <tr className="bg-[#0B1018] text-[11px] text-slate-400 border-b border-slate-800">
                        <th className="py-2 px-3">防禦塔</th>
                        <th className="py-2 px-2">費用 / 工期 (Lv1/2/3)</th>
                        <th className="py-2 px-2">Lv.1 血 / 甲 / 功能或火力</th>
                        <th className="py-2 px-2">Lv.2 ⚔強化數值</th>
                        <th className="py-2 px-2">Lv.3 ⚔強化數值</th>
                        <th className="py-2 px-3">特性與三路升級長處</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {(['watchtower', 'artillery', 'tech_tower', 'econ_tower', 'disruptor'] as TowerType[]).map((tt) => {
                        const td = TOWER_DEFS[tt];
                        const iconMeta = TOWER_ICON_MAP[tt];
                        const s1 = getTowerLevelStats(tt, 1);
                        const s2 = getTowerLevelStats(tt, 2);
                        const s3 = getTowerLevelStats(tt, 3);
                        return (
                          <tr key={tt} className="hover:bg-[#162030]/60">
                            <td className="py-2.5 px-3 font-bold text-slate-100 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {iconMeta.icon}
                                <span>{td.name}</span>
                              </div>
                              <div className="text-[10px] font-normal text-sky-300/90 mt-0.5">{iconMeta.badge}</div>
                              <div className="text-[10px] font-normal text-slate-400 font-mono-num">
                                視野 {s1.vision}/{s2.vision}/{s3.vision}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 font-mono-num whitespace-nowrap">
                              <div className="text-amber-300">
                                {td.cost} / {td.upgradeCostLv2} / {td.upgradeCostLv3}G
                              </div>
                              <div className="text-[10.5px] text-slate-400">
                                {td.buildTime} / {td.upgradeTimeLv2} / {td.upgradeTimeLv3}s
                              </div>
                            </td>
                            <td className="py-2.5 px-2 font-mono-num whitespace-nowrap text-slate-200">
                              <div>
                                {s1.hp}HP · {s1.armor}甲
                              </div>
                              <div className="text-[10.5px] text-emerald-300">
                                {tt === 'econ_tower'
                                  ? `採礦 ×${ECON_TOWER_MINING_MULT_BY_LV[1].toFixed(2)}（零傷）`
                                  : tt === 'tech_tower'
                                  ? `CD+${Math.round(TECH_TOWER_CD_RATE_BY_LV[1] * 100)}% 研+${Math.round(TECH_TOWER_RES_RATE_BY_LV[1] * 100)}% · 攻${s1.damage}`
                                  : `攻${s1.damage} (${s1.dps}/s) · 射${s1.range}`}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 font-mono-num whitespace-nowrap text-sky-200">
                              <div>
                                {s2.hp}HP · {s2.armor}甲
                              </div>
                              <div className="text-[10.5px] text-sky-300">
                                {tt === 'econ_tower'
                                  ? `採礦 ×${ECON_TOWER_MINING_MULT_BY_LV[2].toFixed(2)}（零傷）`
                                  : tt === 'tech_tower'
                                  ? `CD+${Math.round(TECH_TOWER_CD_RATE_BY_LV[2] * 100)}% 研+${Math.round(TECH_TOWER_RES_RATE_BY_LV[2] * 100)}% · 攻${s2.damage}`
                                  : `攻${s2.damage} (${s2.dps}/s) · 射${s2.range}`}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 font-mono-num whitespace-nowrap text-amber-200">
                              <div>
                                {s3.hp}HP · {s3.armor}甲
                              </div>
                              <div className="text-[10.5px] text-amber-300">
                                {tt === 'econ_tower'
                                  ? `採礦 ×${ECON_TOWER_MINING_MULT_BY_LV[3].toFixed(2)}（零傷）`
                                  : tt === 'tech_tower'
                                  ? `CD+${Math.round(TECH_TOWER_CD_RATE_BY_LV[3] * 100)}% 研+${Math.round(TECH_TOWER_RES_RATE_BY_LV[3] * 100)}% · 攻${s3.damage}`
                                  : `攻${s3.damage} (${s3.dps}/s) · 射${s3.range}`}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-300 leading-snug">
                              <div className="mb-0.5">
                                {tt === 'econ_tower' ? (
                                  <span className="text-amber-300 font-semibold">純經濟採礦塔 · 無戰鬥效果</span>
                                ) : (
                                  <span className={td.canHitAir ? 'text-sky-300 font-semibold' : 'text-orange-300 font-semibold'}>
                                    {td.canHitAir ? '可對空' : '僅對地'}
                                  </span>
                                )}
                                <span className="text-violet-300/90 ml-1">· 升⚡科技獲反隱</span>
                                {td.splashRadius && (
                                  <span className="text-amber-300 font-mono-num ml-1">· 濺射{td.splashRadius}</span>
                                )}
                              </div>
                              {td.strengths}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Nexus Turret Public Stats Row */}
                      <tr className="bg-[#0C141E]/85">
                        <td className="py-2.5 px-3 font-bold text-sky-200 whitespace-nowrap">
                          <div>主堡防禦砲塔（純單體）</div>
                          <div className="text-[10px] font-normal text-slate-400 font-mono-num">
                            重甲·機械·建築 · 視野 175 · 無反隱
                          </div>
                        </td>
                        <td className="py-2.5 px-2 font-mono-num text-slate-400 whitespace-nowrap">
                          <div>開局自帶</div>
                          <div className="text-[10px] text-amber-300">修裝甲 {NEXUS_REPAIR_COST}G/{NEXUS_REPAIR_TIME}s</div>
                        </td>
                        <td colSpan={3} className="py-2.5 px-2 font-mono-num text-slate-200">
                          <div>
                            標準 {NEXUS_BASE_HP}+<span className="text-amber-300">{NEXUS_PLATING_HP}裝甲</span>={NEXUS_MAX_HP}HP（簡易 {SIMPLE_NEXUS_BASE_HP}+{SIMPLE_NEXUS_PLATING_HP}={SIMPLE_NEXUS_MAX_HP}HP）· {NEXUS_ARMOR}甲
                          </div>
                          <div className="text-[10.5px] text-sky-300">
                            純單體攻 {NEXUS_DAMAGE}（對輕+{NEXUS_BONUS_VS_TAG.Light ?? 0}/重+{NEXUS_BONUS_VS_TAG.Armored ?? 0} · 間隔 {(NEXUS_ATTACK_INTERVAL_MS / 1000).toFixed(2)}s · 射程 {NEXUS_RANGE}）
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-sky-200 leading-snug">
                          可對空、無反隱；<span className="text-amber-300 font-semibold">額外裝甲被打穿後主堡挖礦效率降至 {Math.round(NEXUS_PLATING_BROKEN_MINE_EFF_PERMILLE / 10)}%</span>，須花 {NEXUS_REPAIR_COST}G 修復！
                          （補給站 {SUPPLY_DEPOT_HP}HP/{SUPPLY_DEPOT_ARMOR}甲 · 兵營 {BARRACKS_ARMOR}甲 · 路障 {BARRICADE_HP}HP/{BARRICADE_ARMOR}甲）
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="px-3.5 py-2 bg-[#0B1018] border-t border-slate-800 text-[11px] text-slate-300 space-y-1">
                  <div>
                    <span className="text-amber-300 font-bold">零農民自動化拓礦 × 時代同步成長：</span>
                    開局雙方皆為 <span className="text-sky-200 font-semibold">0 座起始塔</span>（僅留主堡）。完工防禦塔自動採礦（內礦 3.4/s·2200G，外礦 5.2/s·3600G），升級過程<span className="text-emerald-300 font-semibold">照常挖礦不中斷</span>；主科技升至 T2/T3 時全場己方塔自動獲得血量 +{Math.round((TOWER_TECH_TIER_HP_PERMILLE[2] - 1000) / 10)}% / +{Math.round((TOWER_TECH_TIER_HP_PERMILLE[3] - 1000) / 10)}% 與傷害 +{TOWER_TECH_TIER_DMG_BONUS[2]} / +{TOWER_TECH_TIER_DMG_BONUS[3]}！
                  </div>
                  <div className="text-rose-200/95">
                    <span className="text-rose-400 font-bold">距離漸進騷擾 × 拆塔斷礦：</span>
                    敵軍靠近礦塔或主堡（{MINE_HARASS_RADIUS}px 內）依距離線性壓低採礦效率：邊緣 {MINE_HARASS_RADIUS}px 為 <span className="font-mono-num text-amber-300">{Math.round(MINE_HARASS_EDGE_EFF_PERMILLE / 10)}%</span>，貼臉 {MINE_HARASS_CLOSE_RADIUS}px 內最低降至 <span className="font-mono-num text-rose-300">{Math.round(MINE_HARASS_MIN_EFF_PERMILLE / 10)}%</span>！驅離即刻恢復，拆毀建築無賞金但徹底切斷該區收入。
                  </div>
                  <div>
                    <span className="text-amber-300 font-bold">三路升級（⚔強化 / ⛏擴礦 / ⚡科技）× 額外血量降級機制：</span>
                    每座塔升 Lv.2/Lv.3 可選<span className="text-sky-300 font-semibold">「⚔強化」</span>（升甲＋增傷）、<span className="text-amber-300 font-semibold">「⛏擴礦」</span>（+{Math.round(TOWER_MINING_UPGRADE_BONUS * 100)}%礦速）或<span className="text-violet-300 font-semibold">「⚡科技」</span>（鐵砧須先研 [L]：一階獲稀缺<span className="text-teal-300 font-semibold">偵隱</span>＋主動/掃描CD+{Math.round(TOWER_TECH_CD_RATE_BY_LV[1] * 100)}%，二階 CD+{Math.round(TOWER_TECH_CD_RATE_BY_LV[2] * 100)}% 並賦予武裝塔 +{TOWER_TECH_LV2_BONUS_DMG} 傷害）。<span className="text-amber-200 font-semibold">注意：升級新增的額外血量一旦被打穿（血條黃色刻度），該塔將立即降級並退回原本數值與特性，須重新升級！</span>
                  </div>
                </div>
              </section>

              {/* Mining Lv.1-8 Table */}
              <section className="rounded-lg bg-[#111926] border border-slate-800 overflow-hidden">
                <div className="px-3.5 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-100">採礦技術 Lv.1–Lv.8 門檻、塔數折扣與產金率</span>
                  <span className="text-[11px] text-emerald-300">每多 1 座完工防禦塔，升級費 -10%（最高 -50%）</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs min-w-[680px]">
                    <thead>
                      <tr className="bg-[#0B1018] text-[11px] text-slate-400 border-b border-slate-800">
                        <th className="py-2 px-3">目標等級</th>
                        <th className="py-2 px-2">前置塔數</th>
                        <th className="py-2 px-2">0 塔原價</th>
                        <th className="py-2 px-2">3 塔價(-30%)</th>
                        <th className="py-2 px-2">5 塔價(-50%)</th>
                        <th className="py-2 px-2">研發時間</th>
                        <th className="py-2 px-2">主堡產金/秒</th>
                        <th className="py-2 px-3">塔區採礦倍率（內塔3.4 / 外塔5.2）</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-mono-num">
                      {Array.from({ length: ECON_MAX_LEVEL - 1 }, (_, i) => {
                        const fromLv = i + 1;
                        const toLv = i + 2;
                        const reqTowers = ECON_REQUIRED_TOWERS[fromLv] ?? 0;
                        const baseCost = ECON_UPGRADE_COSTS[fromLv] ?? 0;
                        const cost3 = getEconUpgradeCost(fromLv, 3)?.cost ?? baseCost;
                        const cost5 = getEconUpgradeCost(fromLv, 5)?.cost ?? baseCost;
                        const time = ECON_UPGRADE_TIMES[fromLv] ?? 0;
                        const rate = ECON_BASE_MINE_RATE[toLv] ?? 0;
                        const mult = ECON_TOWER_BONUS_MULT[toLv] ?? 1;
                        return (
                          <tr key={toLv} className="hover:bg-[#162030]/60">
                            <td className="py-2 px-3 font-bold text-amber-200">Lv.{fromLv} → Lv.{toLv}</td>
                            <td className="py-2 px-2 text-slate-200">{reqTowers === 0 ? '0 塔（可龜家）' : `需 ${reqTowers} 座塔`}</td>
                            <td className="py-2 px-2 text-slate-300">{baseCost}G</td>
                            <td className="py-2 px-2 text-emerald-300">{cost3}G</td>
                            <td className="py-2 px-2 text-emerald-200 font-bold">{cost5}G</td>
                            <td className="py-2 px-2 text-slate-300">{time.toFixed(0)}s</td>
                            <td className="py-2 px-2 text-amber-300">+{rate}/s</td>
                            <td className="py-2 px-3 text-sky-300">
                              ×{mult.toFixed(2)}（內 {(INNER_PAD_BASE_MINE_RATE * mult).toFixed(1)}/s · 外 {(OUTER_PAD_BASE_MINE_RATE * mult).toFixed(1)}/s）
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Finite Veins + Tech & Supply Summary */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-lg bg-[#111926] border border-slate-800 space-y-2">
                  <div className="font-bold text-amber-300">有限礦脈儲量總覽（逼迫擴張、拒絕無限龜家）</div>
                  <div className="space-y-1.5 font-mono-num text-[11.5px] text-slate-300">
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span>己方主堡（標準 {NEXUS_MAX_HP} / 簡易 {SIMPLE_NEXUS_MAX_HP} HP）</span>
                      <span className="text-amber-300">{NEXUS_GOLD_RESERVE}G（枯竭後剩 2.0G/s 保底）</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span>內防禦塔區（每路 1 座，基礎 {INNER_PAD_BASE_MINE_RATE}G/s）</span>
                      <span className="text-slate-100">2200G / 區</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span>外防禦塔區（每路 1 座，基礎 {OUTER_PAD_BASE_MINE_RATE}G/s）</span>
                      <span className="text-sky-200">3600G / 區（可奪取敵區！）</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span>野區富晶礦脈（基礎 8.5G/s × 採礦科技）</span>
                      <span className="text-teal-300">4500G（全場最肥礦脈）</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-sans">
                      <span className="text-rose-300 font-semibold">距離漸進騷擾（{MINE_HARASS_RADIUS}px → {MINE_HARASS_CLOSE_RADIUS}px）</span>
                      <span className="text-amber-200">效率線性降至 {Math.round(MINE_HARASS_EDGE_EFF_PERMILLE / 10)}%→{Math.round(MINE_HARASS_MIN_EFF_PERMILLE / 10)}% · 拆塔斷礦</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#111926] border border-slate-800 space-y-2">
                  <div className="font-bold text-cyan-300">科技時代升階、基地配置與補給站上限</div>
                  <div className="space-y-1.5 font-mono-num text-[11.5px] text-slate-300">
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span>T1 → T2 科技時代</span>
                      <span className="text-emerald-300">
                        {TECH_UPGRADE_COSTS[1]}G · {TECH_UPGRADE_TIMES[1]}s（基礎人口 {TECH_SUPPLY_BY_TIER[1]}→{TECH_SUPPLY_BY_TIER[2]}）
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span>T2 → T3 科技時代</span>
                      <span className="text-emerald-300">
                        {TECH_UPGRADE_COSTS[2]}G · {TECH_UPGRADE_TIMES[2]}s（基礎人口 {TECH_SUPPLY_BY_TIER[2]}→{TECH_SUPPLY_BY_TIER[3]}）
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span>補給站 [B]（主堡外側＋路旁外拓基座 · {SUPPLY_DEPOT_HP}HP/{SUPPLY_DEPOT_ARMOR}甲）</span>
                      <span className="text-cyan-200">
                        {SUPPLY_DEPOT_COST}G · {SUPPLY_DEPOT_BUILD_TIME}s · +{SUPPLY_DEPOT_BONUS} 人口（最多 {SUPPLY_DEPOT_MAX_COUNT} 座）
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span>前線外拓補給與人口上限</span>
                      <span className="text-slate-100 font-sans">
                        可點主堡外側或三線路旁基座外拓建造（提供 95px 視野）· 人口硬上限 {MAX_SUPPLY_LIMIT} 人
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] font-sans">
                      <span className="text-amber-300 font-semibold">基地內外圈與前線佈局</span>
                      <span className="text-slate-300">兵營緊貼主堡內圈 · 補給站可外拓至各路旁兼作偵查前哨</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Independent Unit CD & Base Barracks T1/T2/T3 Detailed Comparison */}
              <section className="rounded-lg bg-[#111926] border border-amber-500/35 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-amber-200">
                    T1 營 / T2 營 / T3 營 四階擴建（Lv.1 解鎖 · Lv.2/3/4 同時產 2/3/4 組）
                  </h3>
                  <span className="text-[11px] font-mono-num text-amber-300">
                    全兵種 CD 徹底獨立 · 升級後可重複同時並行產 2 / 3 / 4 組
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  所有兵種皆擁有<span className="text-slate-100 font-semibold">各自完全獨立的訓練冷卻（CD）</span>，符合條件即可同時並行徵兵！三座兵營建於<span className="text-sky-200 font-semibold">緊貼主堡的安全內圈</span>（拆毀無賞金）：建好 <span className="text-amber-300 font-semibold">Lv.1 解鎖該階兵營專屬兵種</span>；升級至 <span className="text-amber-200 font-semibold">Lv.2 開放同時產 2 組（可重複同兵種！）</span>、升至 <span className="text-sky-300 font-semibold">Lv.3 可同時產 3 組</span>、升滿 <span className="text-fuchsia-300 font-semibold">Lv.4 達上限同時產 4 組</span>！每次點擊花費 1 組金幣與人口並開啟獨立並行倒數，還能自由分配到不同戰線！<span className="text-rose-300 font-semibold">兵營受損降級規則（同防禦塔與主堡）：</span>Lv.2–4 升級所獲得的額外血量若遭敵軍打穿（血條黃色刻度），會先逐級降級（Lv.4→3→2→1）並同步降低並行組數上限，需重新花費升級恢復；唯有連 Lv.1 基礎血量也歸零時才會徹底摧毀。
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                  {BARRACKS_TIERS.map((tier) => {
                    const def = BARRACKS_DEFS[tier];
                    return (
                      <div key={tier} className="p-3 rounded bg-[#0B1018] border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between gap-1 border-b border-slate-800/80 pb-1">
                          <span className="font-bold text-amber-300">
                            T{tier} {def.name}（需科技 T{tier}）
                          </span>
                          <span className="font-mono-num text-[10.5px] text-slate-200">
                            {def.cost}/{def.lv2Cost}/{def.lv3Cost}/{def.lv4Cost}G
                          </span>
                        </div>
                        <div className="font-mono-num text-[10.5px] text-sky-300">
                          [{def.hotkeysLabel}] 並行 1/2/3/4 組 · {def.hp}/{def.lv2Hp}/{def.lv3Hp}/{def.lv4Hp}HP · {BARRACKS_ARMOR}甲
                        </div>
                        <div className="font-mono-num text-[10px] text-slate-400">
                          工期：{def.buildTime}s / {def.lv2Time}s / {def.lv3Time}s / {def.lv4Time}s
                        </div>
                        <div className="text-[11px] text-slate-300 leading-relaxed">
                          {tier === 1 ? (
                            <>
                              <div><strong className="text-slate-100">通用：</strong>升至 Lv.2/3/4 後基礎兵種 [Q]/[W]/[Y] 皆可重複連點、同時並行產 2/3/4 組；鐵砧 Lv.2/Lv.3 並可提前解鎖生物/機械攻防！</div>
                              <div className="mt-1 text-amber-200/95">
                                <strong>鐵砧 Lv.2 解鎖：</strong>升至 T1 營 Lv.2 後解鎖 <strong>[Y] 精銳小隊</strong>（輕甲生物 · 對重甲+8/+1級，與 [Q] CD 獨立）。
                              </div>
                            </>
                          ) : tier === 2 ? (
                            <>
                              <div><strong className="text-slate-100">中期核心產線：</strong>升至 Lv.2/3/4 後 T2 兵種 [E]/[R]/[N] 可重複同時並行產 2/3/4 組。</div>
                              <div className="mt-1 text-cyan-200/95">
                                <strong>鐵砧 Lv.1 解鎖：</strong>立即解鎖 <strong>[N] 女武神戰機</strong>（遇敵 15s 戰鬥隱形、脫戰回隱，與 [E]/[R] CD 獨立）。
                              </div>
                            </>
                          ) : (
                            <>
                              <div><strong className="text-slate-100">終局巨獸與反隱產線：</strong>升至 Lv.2/3/4 後 T3 主力 [C]/[V]/[M] 可重複同時並行產 2/3/4 組！</div>
                              <div className="mt-1 text-amber-200/95">
                                <strong>鐵砧 Lv.1 解鎖：</strong>立即解鎖 <strong>[M] 天穹砲艇</strong>（重甲巨型空母 · 對重甲+10/對建築+12，與 [C]/[V] CD 獨立）。
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {/* TAB 5: JUNGLE EVENTS & FOG OF WAR */}
          {activeTab === 'jungle' && (
            <div className="space-y-4">
              <section className="rounded-lg bg-[#111926] border border-slate-800 p-4 space-y-2.5">
                <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2">
                  地圖常駐中立據點（主動出擊與探照迷霧的回報）
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {(['crystal_vein', 'ancient_beacon', 'creep_camp', 'barricade'] as const).map((k) => {
                    const meta = OBJECTIVE_META[k];
                    return (
                      <div key={k} className="p-3 rounded bg-[#0B1018] border border-slate-800 space-y-1">
                        <div className="font-bold text-teal-300">{meta.name}</div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">{meta.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-lg bg-[#111926] border border-slate-800 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-slate-100">
                    六大野區動態事件（獎勵、血量與戰局影響力隨時間 1.0× → 3.0× 持續強化）
                  </h3>
                  <span className="text-[11px] font-mono-num text-amber-300">
                    標準模式：首發 68s · 每 60s 觸發 · 影響力隨對局時間不斷拉高
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded bg-[#0B1018] border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-amber-300">① 高能戰備空投</span>
                      <span className="font-mono-num text-[10.5px] text-amber-200">+170×倍率 G ＋ 全軍鼓舞</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      擊毀野區重裝空投艙即可獲得高額現金補給（隨時間最高破 500G！）並觸發 10 秒全軍攻速移速鼓舞。
                    </p>
                  </div>

                  <div className="p-3 rounded bg-[#0B1018] border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-teal-300">② 上古能量裂隙</span>
                      <span className="font-mono-num text-[10.5px] text-teal-200">+145×倍率 G ＋ 全軍回血</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      任一單位率先踏入即刻奪取：領取巨額金幣、立即為全軍回復 16%–35% 血盾，並啟動 22–40 秒全軍強攻鼓舞！
                    </p>
                  </div>

                  <div className="p-3 rounded bg-[#0B1018] border border-yellow-600/40 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-yellow-300">③ 星脈黃金湧流（新）</span>
                      <span className="font-mono-num text-[10.5px] text-yellow-200">+195×倍率 G ＋ 補滿礦脈</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      擊碎金色星脈晶核後，除獲得鉅額現金外，還會為主堡與所有己方防禦塔各回充 +650×倍率 G 礦脈儲量，逆轉枯竭危機！
                    </p>
                  </div>

                  <div className="p-3 rounded bg-[#0B1018] border border-orange-600/40 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-orange-300">④ 精銳傭兵裂隙（2:45 後）</span>
                      <span className="font-mono-num text-[10.5px] text-orange-200">+180×倍率 G ＋ 精銳援軍</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      擊敗橘焰傭兵守衛即可收編 2–3 支己方 T2/T3 精銳主力部隊直接空降該線投入推進，並附帶奇襲加速！
                    </p>
                  </div>

                  <div className="p-3 rounded bg-[#0B1018] border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-sky-300">⑤ 迷霧磁暴</span>
                      <span className="font-mono-num text-[10.5px] text-sky-200">34–46s ＋ 控野結算獎金</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      大幅收窄該野區與週邊視野掩護繞後奇襲；風暴結束時將依野區據點控制權頒發 +115×倍率 G 情報紅利。
                    </p>
                  </div>

                  <div className="p-3 rounded bg-[#0B1018] border border-purple-600/45 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-purple-300">⑥ 迷霧巨像 Boss（2:45 後）</span>
                      <span className="font-mono-num text-[10.5px] text-purple-200">+280×倍率 G ＋ 成長巨像</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      終局決戰級野怪！隨時間大幅強化血盾與傷害，擊殺方除巨額賞金外還會召喚一隻隨時間同步成長的「先鋒巨像」碾碎敵陣防線。
                    </p>
                  </div>
                </div>

                {/* Simple Mode Reduced Event Rules Callout */}
                <div className="p-3 rounded bg-[#0D1E23] border border-teal-500/45 text-xs text-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-teal-300">簡易雙線模式（Simple Mode）精簡事件規則：</span>
                    為方便新手專注對線與基礎奇襲，事件發生頻率大幅降低（<span className="font-mono-num text-teal-200">首發 105s、每 125s 一次</span>），且事件池精簡為僅會出現
                    <span className="text-amber-300 font-semibold">「高能戰備空投」</span>與
                    <span className="text-purple-300 font-semibold">「迷霧巨像（3:30 後）」</span>兩種最直覺事件，時間成長封頂 <span className="font-mono-num text-teal-200">1.85×</span>。
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
