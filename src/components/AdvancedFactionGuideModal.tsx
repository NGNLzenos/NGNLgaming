import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Cpu,
  Crosshair,
  Eye,
  FlaskConical,
  Layers,
  Radar,
  Shield,
  Sparkles,
  Swords,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import {
  ARMORY_BUILDING_DEFS,
  CLASSIC_ARCHETYPE_MATRIX,
  FACTION_ORDER,
  FACTIONS,
  getRequiredArmoryBuilding,
  TECH_UPGRADE_COSTS,
  TECH_UPGRADE_GAS_COSTS,
  TECH_UPGRADE_TIMES,
  TOWER_DEFS,
} from '../game/data';
import { ATTRIBUTE_TAG_BADGE_COLORS, ATTRIBUTE_TAG_LABELS } from '../game/combatMath';
import { ArmoryTrackDef, ArmoryTrackId, FactionId, UnitDef } from '../game/types';

type GuideSubTab = 'tech' | 'units' | 'counters';

interface AdvancedFactionGuideModalProps {
  open: boolean;
  initialFaction?: FactionId;
  onClose: () => void;
  onLaunchSandbox?: (leftFaction: FactionId, rightFaction: FactionId) => void;
}

const FACTION_CORE_IDENTITY: Record<
  FactionId,
  {
    archetype: string;
    economyStyle: string;
    timingWindow: string;
    fSkillTip: string;
    kSkillTip: string;
    lSkillTip: string;
    unitTips: Record<string, string>;
    threatCounters: Array<{
      threat: string;
      badge: string;
      badgeTone: string;
      ourAnswer: string;
      reason: string;
    }>;
    matchups: Array<{
      vs: FactionId;
      headline: string;
      keyTech: string;
      watchOut: string;
      gameplan: string;
    }>;
  }
> = {
  ironbound: {
    archetype: '遠程火力網 · 陣地推進 · 生機雙體系切換',
    economyStyle: '標準礦氣節奏，靠資源採礦塔與外拓補給站支撐雙線滿攻防，[F] 軌道炮火齊射波數隨礦／氣升級線性增加。',
    timingWindow: 'T1營Lv.2 解鎖 [Y] 精銳小隊＋生物+2/+2 即可強打中期；T2 迫擊砲＋女武神破局，T3 泰坦＋天穹砲艇終結。',
    fSkillTip: '軌道炮火齊射會誤傷範圍內友軍！務必壓在敵軍後排、敵方防禦塔或先將前排按 [Z] 拉回再轟炸；每次金礦或瓦斯升級都會額外增加 1 波砲擊。',
    kSkillTip: '升完 Lv.1 後按 [K] 選區強化：生物耗 10% 血量獲得 3 秒高速士氣爆發；機械原地架設 3 秒大幅增程增傷。冷卻中達到 T3 可再按 [K] 升 Lv.2，全體生物永久 +10 最大生命。',
    lSkillTip: 'Lv.1 解鎖全部防禦塔對空與「⚡科技」反隱升級，是防範潛行空襲與空軍的關鍵門檻；T3 升 Lv.2 讓防禦塔再享全面火力與範圍強化。',
    unitTips: {
      iron_rifle: '0 瓦斯高頻輕甲步兵，雙連發極怕高甲，前期靠射程壓制與人海消耗；升級生物攻 [G] 收益最高。',
      iron_mech: '已改為【生物】屬性的前排重甲肉盾！吃生物攻防 [G/U]、[K] 士氣爆發與 [C] 鷹眼脫戰回血，專門扛傷掩護後排。',
      iron_mortar: '超長射程攻城重砲（235px），對建築與輕甲重創，需前排視野與反隱保護，最怕空軍與側翼奇襲。',
      iron_flamer: '近距扇形反輕甲清場專家，對輕甲步兵與蟲群海造成毀滅性濺射，怕長手狙擊與高甲巨獸。',
      iron_recon: '空中高速反隱偵察機 [C]：非戰鬥且非偵隱時會緩慢幫周圍生物單位回血（4HP/秒），反潛行＋生物隊必配！',
      iron_titan: '重甲反重甲核心巨獸 [V]，高基礎護甲直接碾壓低攻多段輕兵，配 [K] 機械架設站樁拆前排無人能擋。',
      iron_elite_rifle: 'T1營 Lv.2 解鎖的高瓦斯反重甲精銳小隊 [Y]，高單發穿甲火力在中盤壓制重甲與前排極具威脅。',
      iron_valkyrie: 'T2營 Lv.1 解鎖的潛行／空優戰機 [N]，擅長隱形繞後切迫擊砲與敵礦，需提防對手反隱塔與移動偵察艦。',
      iron_gunship: 'T3營 Lv.1 終極空對地重甲砲艇 [M]，高單發反重甲直接蒸發敵方泰坦／巨像／利維坦，需大量瓦斯與空軍攻防支撐。',
    },
    threatCounters: [
      {
        threat: '敵方輕甲人海（步槍／光刃／疾爪）',
        badge: '反輕甲',
        badgeTone: 'text-sky-300 bg-sky-500/15 border-sky-400/40',
        ourAnswer: '[W] 鐵壁盾衛 ＋ [R] 火焰兵 ＋ [E] 攻城迫擊砲',
        reason: '高護甲盾衛搭配生研防 [U] 直接讓多段輕甲攻擊跌至最低傷害，火焰兵與迫擊砲濺射成片清空。',
      },
      {
        threat: '敵方高甲重裝巨獸（泰坦／巨像／利維坦）',
        badge: '反重甲',
        badgeTone: 'text-amber-300 bg-amber-500/15 border-amber-400/40',
        ourAnswer: '[Y] 精銳小隊 ＋ [V] 泰坦機甲 ＋ [M] 天穹砲艇 ＋ 機械 [K] 架設',
        reason: '高單發穿甲傷害避開平減護甲懲罰；[K] 架設可讓機械單位在安全距離直接融化巨獸。',
      },
      {
        threat: '敵方空軍編隊（女武神／追獵艇／尖嘯飛龍／飛龍王）',
        badge: '防空網',
        badgeTone: 'text-cyan-300 bg-cyan-500/15 border-cyan-400/40',
        ourAnswer: '[N] 女武神戰機 ＋ [L] 塔對空網 ＋ [Q]/[Y] 步兵對空集火',
        reason: '升完 [L] 讓全線防禦塔即時獲得對空火力，同時派女武神與步兵群快速清場。',
      },
      {
        threat: '潛行偷襲單位（女武神／幽影刺客）',
        badge: '反潛行',
        badgeTone: 'text-violet-300 bg-violet-500/15 border-violet-400/40',
        ourAnswer: '[C] 鷹眼偵察機 ＋ [L] 防禦塔「⚡科技」反隱 ＋ [S] 掃描',
        reason: '鷹眼隨隊推進提供移動反隱＋生物脫戰回血；邊路塔升「⚡科技」永久封死潛行繞後。',
      },
    ],
    matchups: [
      {
        vs: 'ironbound',
        headline: '內戰決勝點：氣礦節奏、先手 [L] 防空與 [K] 架設拉扯',
        keyTech: '早下生研 [[] (30s) 或 機廠 []] (32s) 決定中盤攻防領先；T2 不用瓦斯，別被卡死在 T1。',
        watchOut: '內戰迫擊砲互轟時，切忌把部隊擠成一團吃滿對手 [F] 軌道砲擊。',
        gameplan: '開局先補 1–2 座瓦斯挖掘場 [P]，T2 出 1 架 [C] 鷹眼防女武神偷家，中期靠 [V] 泰坦＋[E] 迫擊砲搶下野區與外塔。',
      },
      {
        vs: 'dawn',
        headline: '抗晨曦核心：防禦塔反隱、拆護盾持續消耗與空優壓制',
        keyTech: '必升 [L] 防空＋反隱應對幽影刺客與聖輝審判艦；生研生物攻 [G] 壓低對手護盾再生效率。',
        watchOut: '晨曦 [F] 聖光裁決外圈會給友軍巨額護盾加速，內圈 75px 有友傷高爆——看到敵軍抱團時別硬衝，先用迫擊砲拉扯！',
        gameplan: '晨曦前期部隊單價高、怕高頻消耗；前期壓迫外礦＋中盤迫擊砲逼走位，後期用 [M] 天穹砲艇反制聖陽巨像。',
      },
      {
        vs: 'swarm',
        headline: '抗蟲巢核心：重砲陣地＋生物護甲防蟲海＋反飛龍防空網',
        keyTech: '提早升生物防 [U] 抵銷疾爪多段攻擊；[R] 火焰兵搭配 [L] 塔對空徹底鎖死蟲海與飛龍。',
        watchOut: '蟲巢 [F] 孢子空投會直接落入後排砲兵陣！防線內保留盾衛或火焰兵保護迫擊砲。',
        gameplan: '前期別盲目單兵外擴送生物質金礦，穩守外塔靠火焰兵與重砲消耗，等雙攻防成型後帶鷹眼推進清巢。',
      },
    ],
  },
  dawn: {
    archetype: '高盾精銳 · 護盾再生拉扯 · 科技與空軍制霸',
    economyStyle: '單位單價與瓦斯需求偏高但戰損極低！透過「脫戰快速回盾」與「戰術科技塔」加速研發與技能冷卻，滾出科技代差。',
    timingWindow: 'T1 靠護盾拉扯換血；T1營Lv.2 解鎖 [Y] 聖殿執行官增強反重甲；T2 機廠護盾＋[N] 星瞳偵察艦成型；T3 巨像＋審判艦接管戰場。',
    fSkillTip: '聖光裁決矩陣：外圈 120px 賦予友軍強化護盾與攻速（隨礦／氣升級遞增），但中心 75px 烈焰會誤傷友軍！施放時讓前排留在外圈吃盾、中心準星砸向敵軍集群。',
    kSkillTip: '折躍護盾超載 [K]：Lv.1 主動施放為區域友軍注入爆發強化，並加速脫戰回盾；冷卻期間達到 T3 可再點擊升 Lv.2，大幅提升全軍耐久與回盾速度。',
    lSkillTip: '星辰共鳴防空網 [L]：Lv.1 解鎖全部防禦塔對空火力與「⚡科技」偵隱強化；T3 升 Lv.2 進一步強化塔防與聖光防線壓制力。',
    unitTips: {
      dawn_zealot: '0 瓦斯高盾近戰前排 [Q]，雙刃連擊專切輕甲，靠護盾脫戰回復反覆換血；升地面防 [U]＋護盾甲 [I] 後極難擊穿。',
      dawn_archer: '遠程對空對地主力 [W]，適合在光刃斥候後方穩定輸出並支援前期防空，受地面攻防 [G/U]＋護盾 [H/I] 雙重強化。',
      dawn_stalker: '高機動潛行靈能刺客 [E]！專切敵方迫擊砲、後排遠程與無反隱側翼，遇到偵隱塔或偵察艦須立刻撤退。',
      dawn_interceptor: '高機動反輕甲／防空戰機 [R]，可快速支援三線壓制敵方輕甲空軍與脆皮單位。',
      dawn_paladin: '高盾高甲近戰中堅 [C]，強大正面承傷與反重甲能力，是中後期推塔陣型最穩固的肉盾核心。',
      dawn_colossus: 'T3 超遠程重裝巨像 [V]，寬幅光束對輕甲與集群毀滅性清場，但屬重甲大型目標怕敵方反重甲與空對地。',
      dawn_templar: 'T1營 Lv.2 解鎖的靈能精銳 [Y]，高單發破甲傷害可快速撕裂敵方重裝前排，瓦斯消耗高需站於光刃後方。',
      dawn_observer: 'T2營 Lv.1 解鎖的移動反隱支援艦 [N]：內建偵隱並於脫戰時自動幫附近友軍快速充能護盾（5/秒）！',
      dawn_carrier: 'T3營 Lv.1 終極重型空軍旗艦 [M]，極高護盾與持續空對地反重甲壓制力，搭配護盾與空軍攻防無往不利。',
    },
    threatCounters: [
      {
        threat: '敵方輕甲人海（步槍／火焰兵／疾爪）',
        badge: '反輕甲',
        badgeTone: 'text-sky-300 bg-sky-500/15 border-sky-400/40',
        ourAnswer: '[Q] 光刃斥候 ＋ [R] 聖殿追獵艇 ＋ [V] 聖陽巨像',
        reason: '護盾吸收第一波消耗，聖陽巨像範圍光束在數秒內清空輕甲集群，戰後靠脫戰回盾近乎無損。',
      },
      {
        threat: '敵方高甲重裝巨獸（泰坦／天穹砲艇／利維坦）',
        badge: '反重甲',
        badgeTone: 'text-amber-300 bg-amber-500/15 border-amber-400/40',
        ourAnswer: '[Y] 聖殿執行官 ＋ [C] 輝光重裝騎士 ＋ [M] 聖輝審判艦',
        reason: '高單發穿甲火力迅速融化高甲目標，搭配輝光騎士抗線與審判艦空中壓制全面壓倒巨獸。',
      },
      {
        threat: '敵方長射程攻城與防禦塔群',
        badge: '潛行破陣',
        badgeTone: 'text-rose-300 bg-rose-500/15 border-rose-400/40',
        ourAnswer: '[E] 幽影刺客 ＋ [M] 聖輝審判艦 ＋ [F] 外圈護盾強衝',
        reason: '幽影刺客繞過正面火網直切迫擊砲；審判艦無視地形拆塔，配合 [F] 外圈加盾硬吃塔傷。',
      },
      {
        threat: '敵方潛行單位與空軍騷擾',
        badge: '反隱制空',
        badgeTone: 'text-violet-300 bg-violet-500/15 border-violet-400/40',
        ourAnswer: '[N] 星瞳偵察艦 ＋ [L] 星辰防空網 ＋ [W] 星輝射手',
        reason: '星瞳偵察艦提供移動反隱＋脫戰回盾，搭配 [L] 解鎖防禦塔對空與「⚡科技」偵隱徹底封鎖偷襲。',
      },
    ],
    matchups: [
      {
        vs: 'ironbound',
        headline: '對鐵砧核心：別在迫擊砲射程內罰站，用護盾拉扯＋反重甲收割',
        keyTech: '機廠 []] (32s) 優先補「護盾擴容／護盾甲 [H/I]」與空軍攻防，再配戰術科技塔加速研究。',
        watchOut: '鐵砧 [K] 機械架設＋泰坦爆發極高，且 [C] 鷹眼會看破幽影刺客——先集火打掉鷹眼再進場！',
        gameplan: '善用 [Z] 撤退與「守外塔」反覆回滿護盾打消耗；中盤靠 [Y] 執行官＋[E] 幽影刺客瓦解鐵砧陣地。',
      },
      {
        vs: 'dawn',
        headline: '內戰決勝點：戰術科技塔加速差、星瞳回盾續航與 [F] 外圈站位',
        keyTech: '早蓋生研 [[]／機廠 []] 並補 1 座「戰術科技塔」壓縮攻防與技能冷卻時間。',
        watchOut: '內戰切忌把 [F] 聖光裁決中心 75px 砸在自己前排光刃頭上，會直接炸碎自家護盾！',
        gameplan: '搶先出 [N] 星瞳偵察艦反制敵方幽影並維持滿盾，後期以 [R] 追獵艇＋[M] 審判艦爭奪制空權。',
      },
      {
        vs: 'swarm',
        headline: '對蟲巢核心：嚴守窄口與塔線、防孢子空投切巨像',
        keyTech: '早升地面防 [U] 與 [L] 塔對空／反隱，徹底封鎖飛龍偷礦與毒囊突擊。',
        watchOut: '蟲巢擊殺單位會掠奪生物質金礦——盡量保留殘血精銳撤退回盾，不讓對手刷錢滾雪球！',
        gameplan: '前期靠哨塔＋光刃穩守不送兵，中盤以 [V] 聖陽巨像搭配 [N] 星瞳偵察艦抱團平推蟲海。',
      },
    ],
  },
  swarm: {
    archetype: '高速暴兵 · 擊殺掠奪生物質 · 酸蝕壓制與空投包抄',
    economyStyle: '擊殺敵軍可額外掠奪生物質金礦（注意：友傷擊殺不計金礦！），搭配資源採礦塔與多點瓦斯場，用人口洪流與多線奇襲淹沒對手。',
    timingWindow: '全遊戲最快前期壓制！T1 疾爪雙線騷擾斷礦；T1營Lv.2 出 [Y] 穿甲刺蛇破重甲；T2 生研四軌齊升＋飛龍空襲；T3 利維坦＋腐蝕飛龍王踏平防線。',
    fSkillTip: '孢子伏擊空投：墜落衝擊會誤傷範圍內友軍！務必直接空投在敵方後排砲兵、脆皮射手或敵方礦區後方，落地孵化 3–8 隻疾爪（隨金礦／瓦斯升級增加數量）瞬間打亂陣型！',
    kSkillTip: '狂暴腎上腺素 [K]：Lv.1 主動施放讓範圍蟲群爆發極限攻速移速（生物耗血換輸出／重甲單位強化站樁火力）；冷卻期間達到 T3 可升 Lv.2 永久強化全體生物生命！',
    lSkillTip: '酸蝕孢子防空網 [L]：強化酸蝕死亡濺射傷害，並解鎖全防禦塔對空火力與「⚡科技」偵隱！T3 升 Lv.2 讓死亡酸霧與防空塔傷害更上一層樓。',
    unitTips: {
      swarm_ling: '0 瓦斯極速輕甲蟲群 [Q]，跑速與圍殺能力冠絕全場，極怕高護甲與範圍濺射，善用 [X] 編隊繞後斷礦。',
      swarm_spitter: '遠程酸液對空對地主力 [W]，受生研遠程攻防 [H/I] 強化，適合頂在疾爪與衝鋒獸後方穩定輸出。',
      swarm_volatile: '高爆發自爆清場單位 [E]！專克密集輕甲步兵團（步槍兵／光刃／疾爪），務必用前排吸砲火再讓毒囊衝臉。',
      swarm_mutalisk: '高機動空軍突襲主力 [R]，騷擾後排與礦區極佳，切忌硬撞已升 [L] 的防空塔陣。',
      swarm_crusher: '重甲高血衝鋒前排 [C]，專扛正面火力並撕開敵方前排，受近戰攻防 [G/U] 強化。',
      swarm_leviathan: 'T3 終極巨獸 [V]，超高血量與護甲直接踩碎輕甲與建築防線，需防對手高單發反重甲空軍。',
      swarm_lurker: 'T1營 Lv.2 解鎖的高輸出遠程穿甲刺蛇 [Y]！對重甲前排殺傷力極強，是中期瓦解盾衛／騎士／泰坦的關鍵兵種。',
      swarm_overseer: 'T2營 Lv.1 移動反隱支援蟲 [N]：內建偵隱並於脫戰時幫周圍生物蟲群持續回血（4HP/秒），推進必帶！',
      swarm_broodlord: 'T3營 Lv.1 終極重型空對地旗艦 [M]，超長距離壓制地面重裝與防禦塔，搭配監視蟲與飛龍護航近乎無解。',
    },
    threatCounters: [
      {
        threat: '敵方密集輕甲步兵群（步槍小隊／光刃／火焰兵）',
        badge: '自爆清場',
        badgeTone: 'text-rose-300 bg-rose-500/15 border-rose-400/40',
        ourAnswer: '[E] 自爆毒囊蟲 ＋ [F] 孢子空投切後 ＋ [L] 酸蝕死亡濺射',
        reason: '自爆毒囊直接蒸發抱團輕甲，搭配孢子空投包抄後排迫擊砲讓敵軍首尾無法兼顧。',
      },
      {
        threat: '敵方重甲前排與防禦塔陣（泰坦／騎士／重砲堡壘）',
        badge: '穿甲破陣',
        badgeTone: 'text-amber-300 bg-amber-500/15 border-amber-400/40',
        ourAnswer: '[Y] 穿甲刺蛇 ＋ [C] 甲殼衝鋒獸 ＋ [M] 腐蝕飛龍王',
        reason: '穿甲刺蛇在中盤即可壓制重甲，後期腐蝕飛龍王超長距離安全拆塔並融化重裝巨獸。',
      },
      {
        threat: '敵方空軍主力（女武神／追獵艇／天穹砲艇／審判艦）',
        badge: '防空毒網',
        badgeTone: 'text-cyan-300 bg-cyan-500/15 border-cyan-400/40',
        ourAnswer: '[W] 酸液噴吐蟲 ＋ [Y] 穿甲刺蛇 ＋ [L] 酸蝕防空塔網 ＋ [R] 飛龍',
        reason: '生研 [[] 一棟建築同時解鎖近戰＋遠程四條攻防！快速點高遠程攻防搭配 [L] 防空塔直接點掉敵機。',
      },
      {
        threat: '敵方潛行偷襲與團戰續航需求',
        badge: '偵隱回血',
        badgeTone: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/40',
        ourAnswer: '[N] 靈眼監視蟲 ＋ [L] 塔「⚡科技」反隱 ＋ [S] 掃描',
        reason: '靈眼監視蟲同時解決移動反隱與生物脫戰回血，讓衝鋒獸、刺蛇與利維坦越打越能扛。',
      },
    ],
    matchups: [
      {
        vs: 'ironbound',
        headline: '對鐵砧核心：多線拉扯別送免費戰損，空投拆迫擊砲再決戰',
        keyTech: '生研 [[] (30s) 一棟同時解鎖近戰 [G/U]＋遠程 [H/I] 四條攻防！性價比冠絕全場。',
        watchOut: '鐵砧火焰兵＋迫擊砲＋生物護甲專克疾爪硬衝，千萬別讓疾爪單線無腦送頭。',
        gameplan: '前期用少量疾爪干擾敵方外塔與經濟；中盤靠 [Y] 穿甲刺蛇＋[F] 孢子空投直砸迫擊砲後排，逼鐵砧顧此失彼。',
      },
      {
        vs: 'dawn',
        headline: '對晨曦核心：持續騷擾打斷回盾，多線擴張用人口差壓垮對手',
        keyTech: '早下多座瓦斯場 [P] 支撐穿甲刺蛇／自爆毒囊／飛龍的瓦斯消耗，並搶升 [L] 防空反隱。',
        watchOut: '晨曦聖陽巨像清疾爪極快，且 [E] 幽影刺客會潛行切後——務必帶 [N] 靈眼監視蟲同行！',
        gameplan: '利用蟲巢機動性同時攻擊兩條戰線，迫使晨曦無法脫戰回盾；後期用 [M] 腐蝕飛龍王＋[Y] 穿甲刺蛇壓制巨像與審判艦。',
      },
      {
        vs: 'swarm',
        headline: '內戰決勝點：近遠攻防領先、自爆毒囊控場與 [N] 監視蟲續航',
        keyTech: '生研 [[] 建築速度決定整個中盤戰鬥力，[L] 酸蝕濺射在密集近戰內戰收益爆表。',
        watchOut: '內戰 [F] 孢子空投砸到自家蟲群一樣會造成友傷且不掉生物質金礦，務必瞄準對手後排刺蛇！',
        gameplan: '前期互拚疾爪＋自爆細節，中期優先補 [N] 靈眼監視蟲提供全團回血，後期轉 [M] 腐蝕飛龍王定勝負。',
      },
    ],
  },
};

function getUnitArmoryLabel(faction: FactionId, u: UnitDef): string {
  if (faction === 'ironbound') {
    if (u.domain === 'air') return '空軍攻/防 [J/O]（機廠）';
    if (u.attributes.includes('Biological')) return '生物攻/防 [G/U]（生研）';
    return '機械攻/防 [H/I]（機廠）';
  }
  if (faction === 'dawn') {
    if (u.domain === 'air') return '空軍攻/防 [J/O] + 護盾 [H/I]（機廠）';
    return '地面攻/防 [G/U]（生研）+ 護盾 [H/I]（機廠）';
  }
  if (u.domain === 'air') return '飛翼攻/防 [J/O]（機廠）';
  if (u.range <= 65) return '近戰攻/防 [G/U]（生研）';
  return '遠程攻/防 [H/I]（生研）';
}

function getUnitUnlockLabel(u: UnitDef): string {
  if (u.requiresBarracksTier) {
    return `T${u.requiresBarracksTier}營 Lv.${u.requiresBarracksLevel ?? 1}`;
  }
  return `T${u.tier} 主堡`;
}

function getUnitDps(u: UnitDef): string {
  const intervalSec = Math.max(0.1, u.attackIntervalMs / 1000);
  const dps = (u.damage * u.attackCount) / intervalSec;
  return dps.toFixed(1);
}

export const AdvancedFactionGuideModal: React.FC<AdvancedFactionGuideModalProps> = ({
  open,
  initialFaction = 'ironbound',
  onClose,
  onLaunchSandbox,
}) => {
  const [selectedFaction, setSelectedFaction] = useState<FactionId>(initialFaction);
  const [subTab, setSubTab] = useState<GuideSubTab>('tech');

  useEffect(() => {
    if (open) {
      setSelectedFaction(initialFaction);
    }
  }, [open, initialFaction]);

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
  const guide = FACTION_CORE_IDENTITY[selectedFaction];
  const coreUnits = faction.units.slice(0, 6);
  const barracksUnits = faction.units.slice(6);
  const rivalFaction: FactionId =
    selectedFaction === 'ironbound' ? 'dawn' : selectedFaction === 'dawn' ? 'swarm' : 'ironbound';

  const orderedTracks: ArmoryTrackDef[] = faction.armoryTrackOrder
    .map((tid) => faction.armoryTracks[tid])
    .filter((t): t is ArmoryTrackDef => Boolean(t));

  const bioLabTracks = orderedTracks.filter(
    (t) => getRequiredArmoryBuilding(selectedFaction, t.id as ArmoryTrackId) === 'bio_lab'
  );
  const mechBayTracks = orderedTracks.filter(
    (t) => getRequiredArmoryBuilding(selectedFaction, t.id as ArmoryTrackId) === 'mech_bay'
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[1160px] h-[92dvh] rounded-xl bg-[#0B111A] border border-slate-700/90 shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#0F1724] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-400/45 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-sky-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-50 tracking-tight truncate">
                進階種族戰術學院 · 科技樹、九大兵種與相剋關係
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                即時同步最新數值（瓦斯科技 / T2 免氣 / 30s 前置建築 / 全三族六軌攻防 / [F] 友傷警戒）
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1.5 rounded-md bg-slate-800/90 hover:bg-slate-700 border border-slate-600/80 text-xs text-slate-200 flex items-center gap-1 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
            <span>關閉 (Esc)</span>
          </button>
        </div>

        {/* Faction Selector Bar + Sub-Tab Navigation */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#0D1420] border-b border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-2.5 shrink-0">
          {/* 3 Faction Tabs */}
          <div className="grid grid-cols-3 gap-1.5 sm:inline-flex">
            {FACTION_ORDER.map((fid) => {
              const f = FACTIONS[fid];
              const active = selectedFaction === fid;
              return (
                <button
                  key={fid}
                  type="button"
                  onClick={() => setSelectedFaction(fid)}
                  className={`px-3 py-2 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${
                    active
                      ? 'bg-[#172334] border-slate-300/85 shadow-md'
                      : 'bg-[#101824] border-slate-800 hover:border-slate-600 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: f.accentLightHex }}
                  />
                  <div className="min-w-0">
                    <div className={`text-xs sm:text-sm font-bold truncate ${active ? 'text-white' : 'text-slate-300'}`}>
                      {f.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate hidden sm:block">{f.subtitle}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 3 Sub-Tabs */}
          <div className="inline-flex p-1 rounded-lg bg-[#090F18] border border-slate-800 self-stretch md:self-auto">
            {(
              [
                { id: 'tech', label: '1. 科技與技能架構', icon: Cpu },
                { id: 'units', label: '2. 九大兵種解析', icon: Layers },
                { id: 'counters', label: '3. 相剋關係與對陣', icon: Crosshair },
              ] as Array<{ id: GuideSubTab; label: string; icon: React.ComponentType<{ className?: string }> }>
            ).map((tab) => {
              const Icon = tab.icon;
              const active = subTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSubTab(tab.id)}
                  className={`flex-1 md:flex-initial justify-center px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-sky-400/20 text-sky-200 border border-sky-400/55'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5">
          {/* Faction Identity Banner */}
          <div
            className="rounded-xl p-4 border bg-[#101927]/95 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
            style={{ borderColor: `${faction.accentHex}66` }}
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base sm:text-lg font-bold text-white">{faction.name}</span>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded border"
                  style={{
                    color: faction.accentLightHex,
                    borderColor: `${faction.accentHex}80`,
                    backgroundColor: `${faction.accentHex}1F`,
                  }}
                >
                  {guide.archetype}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                <span className="font-semibold text-slate-100">被動特性 · {faction.passiveName}：</span>
                {faction.passiveDesc}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                <span className="font-semibold text-slate-200">營運節奏：</span>
                {guide.economyStyle}　<span className="font-semibold text-amber-200">發力期：</span>
                {guide.timingWindow}
              </p>
            </div>
          </div>

          {/* SUB-TAB 1: TECH TREE, ARMORY, TOWERS & SKILLS */}
          {subTab === 'tech' && (
            <div className="space-y-5">
              {/* Row 1: Tech Tier & Prerequisite Buildings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Tech Tier & Gas Pacing */}
                <div className="rounded-xl bg-[#101824] border border-slate-800 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-300" />
                      主堡科技階級 [D] 與瓦斯資源規則
                    </h3>
                    <span className="text-[11px] font-mono-num text-emerald-300">T2 免瓦斯 · T3 需瓦斯</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-lg bg-[#0B111A] border border-emerald-500/35 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-300">T1 → T2 科技</span>
                        <span className="font-mono-num text-amber-300 font-semibold">
                          {TECH_UPGRADE_COSTS[1]}G / {TECH_UPGRADE_GAS_COSTS[1]}氣
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        耗時 {TECH_UPGRADE_TIMES[1]}s，<strong>完全不花瓦斯</strong>！升級後解鎖 T2 兵種、T2 兵營、[K]/[L] Lv.1 專屬科技、以及防禦塔自動升階。
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#0B111A] border border-violet-500/35 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-violet-300">T2 → T3 科技</span>
                        <span className="font-mono-num text-cyan-300 font-semibold">
                          {TECH_UPGRADE_COSTS[2]}G + {TECH_UPGRADE_GAS_COSTS[2]}氣
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        耗時 {TECH_UPGRADE_TIMES[2]}s，需提早建瓦斯場 [P] 存氣！解鎖 T3 終極兵種、T3 兵營、空軍攻防 Lv.3 與 [K]/[L] Lv.2 終極強化。
                      </p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0B111A] border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                    <span className="text-cyan-300 font-semibold">瓦斯挖掘場 [P]：</span>
                    可建於主堡與每座已佔領塔基後方（只花金礦，單區最高 Lv.3）。大部分進階兵種、六軌攻防、專屬科技與 T3 均需消耗瓦斯，且<strong>每次升級金礦或瓦斯都會同步強化 [F] 戰術技</strong>！
                  </div>
                </div>

                {/* Prerequisite Armory Buildings */}
                <div className="rounded-xl bg-[#101824] border border-slate-800 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-sky-300" />
                      攻防前置建築（30s+ 建造，連點兩下可取消退費）
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {(['bio_lab', 'mech_bay'] as const).map((kind) => {
                      const def = ARMORY_BUILDING_DEFS[kind];
                      const unlockedTracks = kind === 'bio_lab' ? bioLabTracks : mechBayTracks;
                      return (
                        <div
                          key={kind}
                          className="p-2.5 rounded-lg bg-[#0B111A] border border-slate-700/80 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-100">
                              [{def.hotkey}] {def.name}
                            </span>
                            <span className="font-mono-num text-[11px] text-amber-300">
                              {def.cost}G · {def.buildTime}s
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            本族解鎖軌道：
                            <span className="text-sky-300 font-semibold">
                              {unlockedTracks.map((t) => `${t.shortName}[${t.hotkey}]`).join('、')}
                            </span>
                          </div>
                          <div className="text-[10.5px] text-slate-400 leading-snug">
                            建造耗時長（≥30 秒），若決定打攻防一波流務必提早下建築；敵方壓家時可雙擊取消返還金礦。
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Row 2: 6-Track Split Armory Table */}
              <div className="rounded-xl bg-[#101824] border border-slate-800 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <Swords className="w-4 h-4 text-sky-300" />
                    {faction.name} · 六軌分流攻防科技樹（金礦＋瓦斯）
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    地面／核心軌：Lv.2 需 T2 或 T1營2 · Lv.3 需 T3 或 T2+T1營3 ｜ 空軍軌：T1 / T2 / T3
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[680px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                        <th className="py-2 pr-3 font-semibold">快捷／軌道</th>
                        <th className="py-2 px-3 font-semibold">前置建築</th>
                        <th className="py-2 px-3 font-semibold">Lv.1 費用</th>
                        <th className="py-2 px-3 font-semibold">Lv.2 費用</th>
                        <th className="py-2 px-3 font-semibold">Lv.3 費用</th>
                        <th className="py-2 pl-3 font-semibold">每級效果</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {orderedTracks.map((tr) => {
                        const reqBldg = getRequiredArmoryBuilding(selectedFaction, tr.id as ArmoryTrackId);
                        const bldgDef = ARMORY_BUILDING_DEFS[reqBldg];
                        return (
                          <tr key={tr.id} className="hover:bg-slate-800/30">
                            <td className="py-2 pr-3 whitespace-nowrap">
                              <span className="font-mono-num text-amber-300 font-bold mr-1.5">[{tr.hotkey}]</span>
                              <span className="font-semibold text-slate-100">{tr.name}</span>
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span
                                className={`text-[11px] px-1.5 py-0.5 rounded border ${
                                  reqBldg === 'bio_lab'
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                    : 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                                }`}
                              >
                                [{bldgDef.hotkey}] {bldgDef.shortName}
                              </span>
                            </td>
                            {[0, 1, 2].map((lvl) => (
                              <td key={lvl} className="py-2 px-3 font-mono-num whitespace-nowrap">
                                <span className="text-amber-300">{tr.costs[lvl]}G</span>
                                <span className="text-slate-500"> + </span>
                                <span className="text-cyan-300">{tr.gasCosts[lvl]}氣</span>
                              </td>
                            ))}
                            <td className="py-2 pl-3 text-slate-300">{tr.desc}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Row 3: Special Techs [K] / [L] & Active Skill [F] */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {faction.specialTechs.map((sp) => (
                  <div
                    key={sp.slot}
                    className="rounded-xl bg-[#101824] border border-violet-500/35 p-4 space-y-2.5 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-violet-200">
                          專屬 [{sp.hotkey}] · {sp.name}
                        </span>
                        <span className="font-mono-num text-[11px] text-cyan-300 whitespace-nowrap">
                          T{sp.tierReq} · {sp.cost}G+{sp.gasCost}氣
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{sp.desc}</p>
                      {sp.level2 && (
                        <div className="p-2.5 rounded-lg bg-[#0B111A] border border-violet-500/30 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-amber-200">Lv.2 · {sp.level2.name}</span>
                            <span className="font-mono-num text-cyan-300">
                              T{sp.level2.tierReq} · {sp.level2.cost}G+{sp.level2.gasCost}氣
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">{sp.level2.desc}</p>
                        </div>
                      )}
                    </div>
                    <div className="pt-2 border-t border-slate-800 text-[11px] text-sky-200/90 leading-relaxed">
                      <Sparkles className="w-3.5 h-3.5 inline mr-1 text-amber-300" />
                      {sp.slot === 0 ? guide.kSkillTip : guide.lSkillTip}
                    </div>
                  </div>
                ))}

                {/* [F] Faction Active Skill with Friendly Fire Alert */}
                <div className="rounded-xl bg-[#191219] border border-rose-500/45 p-4 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-rose-200">
                        戰術技 [F] · {faction.activeName}
                      </span>
                      <span className="font-mono-num text-[11px] text-amber-300 whitespace-nowrap">
                        CD {faction.activeCooldown}s
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">{faction.activeDesc}</p>
                    <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-500/50 text-[11px] text-rose-200 flex items-start gap-2 leading-relaxed">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>友軍誤傷警告：</strong>[F] 技能爆炸區會對己方單位造成真實傷害！瞄準時游標會即時提示範圍內受波及友軍人數，施放前務必確認落點。
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-rose-900/50 text-[11px] text-amber-200/95 leading-relaxed">
                    {guide.fSkillTip}
                  </div>
                </div>
              </div>

              {/* Row 4: 4 Tower Types */}
              <div className="rounded-xl bg-[#101824] border border-slate-800 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <Radar className="w-4 h-4 text-amber-300" />
                    {faction.name} · 四大防禦塔配置（Shift+1~4 切換 · [T] 建／升塔）
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    建造完可選「⚔戰力 / ⛏採礦 / ⚡科技（需 [L] 解鎖反隱）」三方向升級
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {faction.towerTypes.map((tt, idx) => {
                    const tdef = TOWER_DEFS[tt];
                    return (
                      <div key={tt} className="p-3 rounded-lg bg-[#0B111A] border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-slate-100">
                            <span className="font-mono-num text-amber-300 mr-1">Shift+{idx + 1}</span>
                            {tdef.name}
                          </span>
                          <span className="font-mono-num text-[11px] text-amber-300">{tdef.cost}G</span>
                        </div>
                        <div className="text-[11px] font-mono-num text-slate-400">
                          血量 {tdef.hp} · 射程 {tdef.range} · 傷 {tdef.damage}
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug">{tdef.shortDesc}</p>
                        <p className="text-[10.5px] text-sky-300/85 leading-snug">{tdef.strengths}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: ALL 9 UNITS ROSTER */}
          {subTab === 'units' && (
            <div className="space-y-5">
              {/* Core 6 Units */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-300" />
                    基礎六大主力編制（Q / W / E / R / C / V）
                  </h3>
                  <span className="text-[11px] text-slate-400">依科技階級 T1 / T2 / T3 逐步解鎖，需搭配對應兵營並行加速</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {coreUnits.map((u) => (
                    <UnitGuideCard key={u.id} faction={selectedFaction} unit={u} tip={guide.unitTips[u.id]} />
                  ))}
                </div>
              </div>

              {/* Barracks Bonus 3 Units */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    兵營專屬進階三兵種（[Y] T1營Lv.2 · [N] T2營Lv.1 · [M] T3營Lv.1）
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    三族皆配備 T1營Lv.2 [Y]、T2營Lv.1 [N]、T3營Lv.1 [M] 進階強兵與移動反隱支援單位
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {barracksUnits.map((u) => (
                    <UnitGuideCard key={u.id} faction={selectedFaction} unit={u} tip={guide.unitTips[u.id]} highlight />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: COUNTER MATRIX & FACTION MATCHUPS */}
          {subTab === 'counters' && (
            <div className="space-y-5">
              {/* Universal 4-Archetype Counter Loop + Flat Armor Rule */}
              <div className="rounded-xl bg-[#101824] border border-slate-800 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <Crosshair className="w-4 h-4 text-amber-300" />
                    全遊戲核心四系相剋循環＆平減護甲公式
                  </h3>
                  <span className="text-[11px] font-mono-num text-sky-300">
                    單發傷害 = max(0.5, 攻擊力 + 標籤加成 − 目標護甲)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {CLASSIC_ARCHETYPE_MATRIX.map((row) => (
                    <div key={row.role} className="p-3 rounded-lg bg-[#0B111A] border border-slate-800 space-y-1.5">
                      <div className="text-xs font-bold text-slate-100">{row.title}</div>
                      <div className="text-[10.5px] text-sky-300">{row.exampleUnits}</div>
                      <div className="text-[11px] text-amber-200">{row.damageStructure}</div>
                      <p className="text-[10.5px] text-slate-300 leading-snug">{row.tacticalLogic}</p>
                      <p className="text-[10px] text-emerald-300/90 leading-snug">{row.numericalExample}</p>
                    </div>
                  ))}
                </div>
                <div className="p-2.5 rounded-lg bg-[#0B111A] border border-amber-500/30 text-[11px] text-slate-300 leading-relaxed">
                  <strong className="text-amber-300">平減護甲實戰重點：</strong>
                  多段攻擊單位（如雙連發步槍兵、雙爪疾爪）每一下都會被扣一次護甲！因此只要把前排護甲升 2–3 級，敵方輕甲步兵輸出就會腰斬；反之高單發穿甲單位（泰坦、虛空戰艦、天穹砲艇、巢蟲領主）只被扣一次甲，是撕開重裝防線的唯一解！
                </div>
              </div>

              {/* This Faction's Threat-to-Answer Table */}
              <div className="rounded-xl bg-[#101824] border border-slate-800 p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-300" />
                  使用【{faction.name}】時：遇到各類威脅該怎麼反制？
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {guide.threatCounters.map((item) => (
                    <div
                      key={item.threat}
                      className="p-3.5 rounded-lg bg-[#0B111A] border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-100">{item.threat}</span>
                        <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap ${item.badgeTone}`}>
                          {item.badge}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-amber-200">
                        推薦解法：{item.ourAnswer}
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cross-Faction Matchup Cards */}
              <div className="rounded-xl bg-[#101824] border border-slate-800 p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Swords className="w-4 h-4 text-sky-300" />
                  【{faction.name}】對戰三大種族實戰攻略
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {guide.matchups.map((m) => {
                    const opp = FACTIONS[m.vs];
                    return (
                      <div
                        key={m.vs}
                        className="p-3.5 rounded-lg bg-[#0B111A] border border-slate-800 space-y-2 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: opp.accentLightHex }}
                              />
                              vs {opp.name}
                              {m.vs === selectedFaction ? '（內戰）' : ''}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-sky-200 leading-snug">{m.headline}</div>
                          <div className="text-[11px] text-slate-300 leading-relaxed">
                            <span className="text-emerald-300 font-semibold">關鍵科技：</span>
                            {m.keyTech}
                          </div>
                          <div className="text-[11px] text-slate-300 leading-relaxed">
                            <span className="text-rose-300 font-semibold">防範要點：</span>
                            {m.watchOut}
                          </div>
                          <div className="text-[11px] text-slate-300 leading-relaxed">
                            <span className="text-amber-300 font-semibold">致勝打法：</span>
                            {m.gameplan}
                          </div>
                        </div>
                        {onLaunchSandbox && (
                          <button
                            type="button"
                            onClick={() => onLaunchSandbox(selectedFaction, m.vs)}
                            className="mt-2 w-full py-1.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/45 text-[11px] font-semibold text-emerald-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <FlaskConical className="w-3.5 h-3.5" />
                            <span>沙盒實測：{faction.name.slice(0, 2)} vs {opp.name.slice(0, 2)}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Strip */}
        <div className="px-4 sm:px-6 py-3 bg-[#0F1724] border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-400">
            提示：所有兵種與攻防費用皆即時讀取自遊戲核心數據，並可直接進入「雙邊沙盒」開啟滿科實測相剋強度。
          </div>
          <div className="flex items-center gap-2">
            {onLaunchSandbox && (
              <button
                type="button"
                onClick={() => onLaunchSandbox(selectedFaction, rivalFaction)}
                className="px-3.5 py-1.5 rounded-md bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>進入沙盒實測【{faction.name}】</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 cursor-pointer"
            >
              返回戰場
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface UnitGuideCardProps {
  faction: FactionId;
  unit: UnitDef;
  tip?: string;
  highlight?: boolean;
}

const UnitGuideCard: React.FC<UnitGuideCardProps> = ({ faction, unit, tip, highlight }) => {
  const bonusEntries = Object.entries(unit.bonusVsTag ?? {}).filter(([, val]) => (val ?? 0) > 0);
  const hasOocHeal = unit.id === 'iron_recon' || unit.id === 'swarm_overseer';
  const hasOocShield = unit.id === 'dawn_observer';

  return (
    <div
      className={`rounded-xl p-3.5 border flex flex-col justify-between gap-2.5 ${
        highlight
          ? 'bg-[#131C2B] border-amber-400/45'
          : 'bg-[#101824] border-slate-800'
      }`}
    >
      <div className="space-y-2">
        {/* Top line: Hotkey, Name, Unlock, Cost */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono-num text-xs font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                {unit.hotkey}
              </span>
              <span className="text-sm font-bold text-white truncate">{unit.name}</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700/80">
                {getUnitUnlockLabel(unit)}
              </span>
            </div>
          </div>
          <div className="text-right font-mono-num text-[11px] whitespace-nowrap shrink-0">
            <span className="text-amber-300 font-bold">{unit.cost}G</span>
            {(unit.gasCost ?? 0) > 0 ? (
              <span className="text-cyan-300 font-bold"> +{unit.gasCost}氣</span>
            ) : (
              <span className="text-emerald-400"> · 0氣</span>
            )}
            <div className="text-[10px] text-slate-400">人口 {unit.supplyCost} · {unit.trainTime}s</div>
          </div>
        </div>

        {/* Attribute & Special Badges */}
        <div className="flex flex-wrap items-center gap-1">
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
              unit.domain === 'air'
                ? 'bg-cyan-500/15 border-cyan-400/45 text-cyan-200'
                : 'bg-slate-800/80 border-slate-700 text-slate-300'
            }`}
          >
            {unit.domain === 'air' ? '空軍' : '地面'}
          </span>
          {unit.attributes.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded border"
              style={{
                color: ATTRIBUTE_TAG_BADGE_COLORS[tag],
                borderColor: `${ATTRIBUTE_TAG_BADGE_COLORS[tag]}55`,
                backgroundColor: `${ATTRIBUTE_TAG_BADGE_COLORS[tag]}18`,
              }}
            >
              {ATTRIBUTE_TAG_LABELS[tag]}
            </span>
          ))}
          {unit.canHitAir && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-400/40 text-sky-300 flex items-center gap-0.5">
              <Wind className="w-2.5 h-2.5" />
              對空
            </span>
          )}
          {unit.cloaked && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-500/20 border border-violet-400/45 text-violet-200">
              潛行
            </span>
          )}
          {unit.detector && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-500/20 border border-teal-400/45 text-teal-200 flex items-center gap-0.5">
              <Eye className="w-2.5 h-2.5" />
              反隱
            </span>
          )}
          {hasOocHeal && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/45 text-emerald-200">
              脫戰治療
            </span>
          )}
          {hasOocShield && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/45 text-sky-200">
              脫戰回盾
            </span>
          )}
          {(unit.splashRadius ?? 0) > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-500/20 border border-orange-400/45 text-orange-200">
              濺射 {unit.splashRadius}px
            </span>
          )}
        </div>

        {/* Core Stats Strip */}
        <div className="grid grid-cols-4 gap-1.5 p-2 rounded-lg bg-[#0B111A] border border-slate-800/90 text-center font-mono-num text-[11px]">
          <div>
            <div className="text-[9.5px] text-slate-400">生命{unit.shield ? '/盾' : ''}</div>
            <div className="font-bold text-slate-100">
              {unit.hp}
              {unit.shield ? <span className="text-sky-300">+{unit.shield}</span> : null}
            </div>
          </div>
          <div>
            <div className="text-[9.5px] text-slate-400">攻擊/DPS</div>
            <div className="font-bold text-amber-200">
              {unit.damage}
              {unit.attackCount > 1 ? `×${unit.attackCount}` : ''}
              <span className="text-[9.5px] text-slate-400 block leading-none mt-0.5">{getUnitDps(unit)}/s</span>
            </div>
          </div>
          <div>
            <div className="text-[9.5px] text-slate-400">護甲</div>
            <div className="font-bold text-emerald-300">{unit.armor}</div>
          </div>
          <div>
            <div className="text-[9.5px] text-slate-400">射程</div>
            <div className="font-bold text-sky-300">{unit.range}</div>
          </div>
        </div>

        {/* Bonus vs Tags & Armory Track */}
        <div className="space-y-1 text-[11px]">
          {bonusEntries.length > 0 && (
            <div className="text-amber-200">
              <span className="text-slate-400">屬性加成：</span>
              {bonusEntries
                .map(([tag, val]) => `對【${ATTRIBUTE_TAG_LABELS[tag as keyof typeof ATTRIBUTE_TAG_LABELS] ?? tag}】+${val}`)
                .join('、')}
            </div>
          )}
          <div className="text-sky-300/90">
            <span className="text-slate-400">受惠攻防：</span>
            {getUnitArmoryLabel(faction, unit)}
          </div>
        </div>
      </div>

      {/* Counter Note & Tactical Tip */}
      <div className="pt-2 border-t border-slate-800/90 space-y-1 text-[11px] leading-relaxed">
        <div className="text-slate-200 font-medium">{unit.counterNote}</div>
        {tip && <div className="text-slate-400">{tip}</div>}
      </div>
    </div>
  );
};
