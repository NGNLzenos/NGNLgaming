import { ATTRIBUTE_TAG_LABELS, FP_SCALE } from './combatMath';
import {
  ARMORY_BUILDING_DEFS,
  BARRACKS_DEFS,
  ENEMY_NEXUS_POS,
  FACTIONS,
  GAS_EXTRACTOR_LEVELS,
  LANE_SHORT_NAMES,
  NEXUS_ARMOR,
  OBJECTIVE_META,
  PLAYER_NEXUS_POS,
  SUPPLY_DEPOT_BONUS,
  TOWER_DEFS,
} from './data';
import { BattleEngine } from './engine';
import { AttributeTag, TagBonusMapFp, UnitEntity } from './types';

export type HoveredEntityRef =
  | { kind: 'unit'; id: number }
  | { kind: 'pad'; id: string }
  | { kind: 'nexus'; team: 'player' | 'enemy' }
  | { kind: 'depot'; id: string }
  | { kind: 'barracks'; id: string }
  | { kind: 'armory'; id: string }
  | { kind: 'extractor'; id: string }
  | { kind: 'objective'; id: string }
  | { kind: 'event' };

export interface HoverInspectStat {
  label: string;
  value: string;
  tone?: 'default' | 'amber' | 'rose' | 'emerald' | 'sky' | 'violet';
}

export interface HoverInspectData {
  title: string;
  subtitle: string;
  tone: 'enemy' | 'neutral' | 'player';
  badgeText: string;
  hp?: number;
  maxHp?: number;
  shield?: number;
  maxShield?: number;
  statusBanner?: { text: string; tone: 'warn' | 'critical' | 'info' };
  tags: string[];
  stats: HoverInspectStat[];
  bonuses: string[];
  notes: string[];
}

function distSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

function formatTagBonusesFp(
  baseMap: TagBonusMapFp | undefined,
  perUpgradeMap: TagBonusMapFp | undefined,
  upgradeLevel: number
): string[] {
  if (!baseMap) return [];
  const out: string[] = [];
  for (const [k, rawBase] of Object.entries(baseMap)) {
    if (!rawBase) continue;
    const tag = k as AttributeTag;
    const perUp = perUpgradeMap?.[tag] ?? 0;
    const total = Math.round((rawBase + perUp * upgradeLevel) / FP_SCALE);
    if (total > 0) {
      out.push(`對[${ATTRIBUTE_TAG_LABELS[tag] ?? tag}] +${total}`);
    }
  }
  return out;
}

function getNeutralUnitDetails(u: UnitEntity): { title: string; subtitle: string; rewardNote: string } {
  switch (u.defId) {
    case 'overdrive_core':
      return {
        title: '星脈黃金湧流',
        subtitle: '野區事件目標 · 全軍增益',
        rewardNote: `擊破獲得 +${u.bountyGold}G 並賦予全軍 14 秒強化增益（會通報全圖）。`,
      };
    case 'supply_crate':
      return {
        title: '高能空投物資',
        subtitle: '野區事件目標 · 全軍士氣',
        rewardNote: `奪取獲得 +${u.bountyGold}G 與全軍 10 秒士氣強化（會通報全圖）。`,
      };
    case 'fog_golem':
      return {
        title: '迷霧巨像',
        subtitle: '野區高懸賞守衛',
        rewardNote: `擊殺獲得 +${u.bountyGold}G 賞金與高額經驗，不向敵方通報。`,
      };
    case 'merc_guardian':
      return {
        title: '傭兵守護者',
        subtitle: '野區重甲守衛',
        rewardNote: `擊殺獲得 +${u.bountyGold}G 賞金並可順勢佔領周邊野區據點。`,
      };
    case 'boss_colossus':
      return {
        title: '迷霧巨獸首領',
        subtitle: '野區事件首領 · 全軍增益',
        rewardNote: `擊殺獲得 +${u.bountyGold}G 與全軍強效戰鬥強化（會通報全圖）。`,
      };
    default:
      return {
        title: u.isBoss ? '野區首領魔獸' : '野區魔獸',
        subtitle: u.isBoss ? '野區首領單位' : '中立野區守衛',
        rewardNote: `單體擊殺賞金 +${u.bountyGold}G；清剿整座野區魔獸營地再贈 +110G 與全軍 18 秒強化。`,
      };
  }
}

export function findHoveredEntity(
  engine: BattleEngine,
  worldX: number,
  worldY: number
): HoveredEntityRef | null {
  if (engine.screen === 'TITLE') return null;

  const viewerTeam: 'player' | 'enemy' = engine.observerView === 'enemy' ? 'enemy' : 'player';
  const fullVision = engine.observerView === 'all' || engine.sandboxMode;
  const vision = fullVision ? undefined : engine.getVisionCircles(viewerTeam);

  // 1. Units (highest precision; prioritize enemy & neutral over friendly when overlapping)
  let bestUnit: { id: number; score: number } | null = null;
  for (const u of engine.units) {
    if (u.hp <= 0) continue;
    if (u.team !== viewerTeam && !fullVision && !engine.isUnitVisibleToHumanEye(viewerTeam, u, vision)) {
      continue;
    }
    const hitR = Math.max(18, u.radius + 9);
    const d2 = distSq(worldX, worldY, u.x, u.y);
    if (d2 <= hitR * hitR) {
      // Slightly prioritize enemy & neutral units when stacked near friendly units
      const priorityBias = u.team === 'enemy' ? 0.65 : u.team === 'neutral' ? 0.72 : 1.0;
      const score = d2 * priorityBias;
      if (!bestUnit || score < bestUnit.score) {
        bestUnit = { id: u.id, score };
      }
    }
  }
  if (bestUnit) return { kind: 'unit', id: bestUnit.id };

  // 2. Active Dynamic Event Marker
  if (engine.activeEvent) {
    const ev = engine.activeEvent;
    if (distSq(worldX, worldY, ev.x, ev.y) <= 38 * 38) {
      return { kind: 'event' };
    }
  }

  // 3. Neutral Objectives (barricades, crystal veins, ancient beacons, creep camps)
  for (const obj of engine.objectives) {
    if (obj.kind === 'barricade' && obj.cleared) continue;
    const hitR = obj.kind === 'barricade' ? 36 : 34;
    if (distSq(worldX, worldY, obj.x, obj.y) <= hitR * hitR) {
      return { kind: 'objective', id: obj.id };
    }
  }

  // 4. Tower Pads (built, building, or visible empty pads)
  for (const pad of engine.pads) {
    if (distSq(worldX, worldY, pad.x, pad.y) <= 34 * 34) {
      const visible =
        fullVision ||
        pad.team === viewerTeam ||
        pad.homeSide === viewerTeam ||
        engine.isPointVisibleTo(viewerTeam, pad.x, pad.y, vision);
      if (visible) {
        return { kind: 'pad', id: pad.id };
      }
    }
  }

  // 5. Nexus (player & enemy)
  if (distSq(worldX, worldY, PLAYER_NEXUS_POS.x, PLAYER_NEXUS_POS.y) <= 52 * 52) {
    return { kind: 'nexus', team: 'player' };
  }
  if (distSq(worldX, worldY, ENEMY_NEXUS_POS.x, ENEMY_NEXUS_POS.y) <= 52 * 52) {
    const enemyNexusVisible =
      fullVision ||
      engine.enemyNexusHpKnown !== null ||
      engine.isPointVisibleTo(viewerTeam, ENEMY_NEXUS_POS.x, ENEMY_NEXUS_POS.y, vision);
    if (enemyNexusVisible) {
      return { kind: 'nexus', team: 'enemy' };
    }
  }

  // 6. Barracks, Armories, Extractors, Supply Depots
  for (const b of engine.barracks) {
    if (!b.built && !b.building) continue;
    if (distSq(worldX, worldY, b.x, b.y) <= 28 * 28) {
      if (fullVision || b.team === viewerTeam || engine.isPointVisibleTo(viewerTeam, b.x, b.y, vision)) {
        return { kind: 'barracks', id: b.id };
      }
    }
  }
  for (const a of engine.armories) {
    if (!a.built && !a.building) continue;
    if (distSq(worldX, worldY, a.x, a.y) <= 26 * 26) {
      if (fullVision || a.team === viewerTeam || engine.isPointVisibleTo(viewerTeam, a.x, a.y, vision)) {
        return { kind: 'armory', id: a.id };
      }
    }
  }
  for (const e of engine.extractors) {
    if (!e.built && !e.building) continue;
    if (distSq(worldX, worldY, e.x, e.y) <= 24 * 24) {
      if (fullVision || e.team === viewerTeam || engine.isPointVisibleTo(viewerTeam, e.x, e.y, vision)) {
        return { kind: 'extractor', id: e.id };
      }
    }
  }
  for (const d of engine.depots) {
    if (!d.built && !d.building) continue;
    if (distSq(worldX, worldY, d.x, d.y) <= 24 * 24) {
      if (fullVision || d.team === viewerTeam || engine.isPointVisibleTo(viewerTeam, d.x, d.y, vision)) {
        return { kind: 'depot', id: d.id };
      }
    }
  }

  return null;
}

export function buildHoverInspectData(
  engine: BattleEngine,
  ref: HoveredEntityRef
): HoverInspectData | null {
  const viewerTeam: 'player' | 'enemy' = engine.observerView === 'enemy' ? 'enemy' : 'player';
  const fullVision = engine.observerView === 'all' || engine.sandboxMode;
  const vision = fullVision ? undefined : engine.getVisionCircles(viewerTeam);

  switch (ref.kind) {
    case 'unit': {
      const u = engine.units.find((item) => item.id === ref.id && item.hp > 0);
      if (!u) return null;
      if (u.team !== viewerTeam && !fullVision && !engine.isUnitVisibleToHumanEye(viewerTeam, u, vision)) {
        return null;
      }

      const isNeutral = u.team === 'neutral';
      const isEnemy = u.team === 'enemy';
      const teamState = u.team === 'player' ? engine.player : u.team === 'enemy' ? engine.enemy : null;
      const factionDef = teamState ? FACTIONS[teamState.faction] : null;
      const unitDef = factionDef?.units.find((d) => d.id === u.defId);

      const effDamage = Math.round((u.baseDamageFp + u.attackUpgradeLevel * u.damagePerUpgradeFp) / FP_SCALE);
      const effArmor = Math.round((u.baseArmorFp + u.armorUpgradeLevel * u.armorPerUpgradeFp) / FP_SCALE);
      const effShieldArmor = Math.round(
        (u.baseShieldArmorFp + u.shieldArmorUpgradeLevel * u.shieldArmorPerUpgradeFp) / FP_SCALE
      );
      const attackIntervalSec = u.attackIntervalMs > 0 ? (u.attackIntervalMs / 1000).toFixed(2) : '-';
      const bonuses = formatTagBonusesFp(u.bonusVsTagFp, u.bonusPerUpgradeVsTagFp, u.attackUpgradeLevel);
      const tags = [
        ...u.attributes.map((t) => ATTRIBUTE_TAG_LABELS[t] ?? t),
        u.domain === 'air' ? '飛行' : '地面',
        u.canHitAir ? '可對空' : '僅對地',
      ];

      const notes: string[] = [];
      if (isNeutral) {
        const neutralMeta = getNeutralUnitDetails(u);
        notes.push(neutralMeta.rewardNote);
        if (u.provokedTimer !== undefined && u.provokedTimer <= 0) {
          notes.push('目前處於守衛待機狀態，受攻擊後會反擊。');
        }
        return {
          title: neutralMeta.title,
          subtitle: neutralMeta.subtitle,
          tone: 'neutral',
          badgeText: u.isBoss ? '野區首領' : '野區中立',
          hp: Math.ceil(u.hp),
          maxHp: Math.ceil(u.maxHp),
          shield: u.maxShield > 0 ? Math.ceil(u.shield) : undefined,
          maxShield: u.maxShield > 0 ? Math.ceil(u.maxShield) : undefined,
          tags,
          stats: [
            {
              label: '攻擊力',
              value: u.attackCount > 1 ? `${effDamage} × ${u.attackCount}` : `${effDamage}`,
              tone: 'amber',
            },
            { label: '雙防（甲/盾）', value: u.maxShield > 0 ? `${effArmor} / ${effShieldArmor}` : `${effArmor} / -`, tone: 'sky' },
            { label: '射程 / 攻速', value: `${Math.round(u.range)}px · ${attackIntervalSec}s` },
            { label: '擊殺賞金', value: `+${u.bountyGold}G`, tone: 'emerald' },
          ],
          bonuses,
          notes,
        };
      }

      if (u.cloaked) notes.push(u.revealTimer > 0 ? '潛行單位（目前反隱顯形中）' : '潛行單位（需反隱偵查）');
      if (u.detector) notes.push('具備反隱偵測能力，可揭露周圍潛行敵軍。');
      if (u.splashRadius > 0) notes.push(`範圍濺射攻擊（半徑 ${Math.round(u.splashRadius)}px）。`);
      if (u.corrosive) notes.push('攻擊附帶腐蝕減甲效果。');
      if (u.auraShield) notes.push('為周圍友軍提供護盾回復光環。');
      if (u.suicidal) notes.push('自爆單位：接觸目標時造成高額範圍爆發傷害。');
      if (u.buffTimer > 0) notes.push(`野區全軍強化生效中（剩餘 ${Math.ceil(u.buffTimer)}s）。`);
      if (u.stimTimer > 0) notes.push(`士氣激勵生效中（剩餘 ${u.stimTimer.toFixed(1)}s）。`);
      if (u.slowTimer > 0) notes.push(`受到緩速干擾（剩餘 ${u.slowTimer.toFixed(1)}s）。`);
      if (unitDef?.counterNote) notes.push(`戰術定位：${unitDef.counterNote}`);

      const statusBanner =
        isEnemy && u.firedRevealTimer > 0 && !fullVision && !engine.isUnitVisibleTo(viewerTeam, u, vision)
          ? { text: '開火暴露中（迷霧外射擊現形，我軍仍需視野才能鎖定）', tone: 'warn' as const }
          : undefined;

      const unitTitle =
        unitDef?.name ??
        (u.defId === 'interceptor_drone'
          ? '星艦攔截機'
          : u.defId === 'broodling_spawn'
          ? '孵化寄生蟲'
          : u.defId);

      return {
        title: unitTitle,
        subtitle: `${factionDef?.name ?? ''}${unitDef ? ` · T${unitDef.tier}` : ''} · ${
          u.inAmbushSquad ? '奇襲編隊' : LANE_SHORT_NAMES[u.lane]
        }`,
        tone: isEnemy ? 'enemy' : 'player',
        badgeText: isEnemy ? '敵方單位' : '我方單位',
        hp: Math.ceil(u.hp),
        maxHp: Math.ceil(u.maxHp),
        shield: u.maxShield > 0 ? Math.ceil(u.shield) : undefined,
        maxShield: u.maxShield > 0 ? Math.ceil(u.maxShield) : undefined,
        statusBanner,
        tags,
        stats: [
          {
            label: '攻擊力',
            value:
              (u.attackCount > 1 ? `${effDamage} × ${u.attackCount}` : `${effDamage}`) +
              (u.attackUpgradeLevel > 0 ? ` (+${u.attackUpgradeLevel})` : ''),
            tone: 'amber',
          },
          {
            label: '雙防（甲/盾）',
            value:
              u.maxShield > 0
                ? `${effArmor}${u.armorUpgradeLevel > 0 ? `(+${u.armorUpgradeLevel})` : ''} / ${effShieldArmor}`
                : `${effArmor}${u.armorUpgradeLevel > 0 ? `(+${u.armorUpgradeLevel})` : ''} / -`,
            tone: 'sky',
          },
          { label: '射程 / 攻速', value: `${Math.round(u.range)}px · ${attackIntervalSec}s` },
          { label: '移速 / 視野', value: `${Math.round(u.speed)} · ${Math.round(u.vision)}px` },
        ],
        bonuses,
        notes,
      };
    }

    case 'pad': {
      const pad = engine.pads.find((p) => p.id === ref.id);
      if (!pad) return null;
      const visible =
        fullVision ||
        pad.team === viewerTeam ||
        pad.homeSide === viewerTeam ||
        engine.isPointVisibleTo(viewerTeam, pad.x, pad.y, vision);
      if (!visible) return null;

      const laneName = LANE_SHORT_NAMES[pad.lane];
      const goldLeft = Math.ceil(pad.goldReserve);
      const goldMax = Math.ceil(pad.goldReserveMax);

      if (!pad.towerType && !pad.building) {
        return {
          title: `${laneName}${pad.slot === 'outer' ? '外拓' : '內線'}空塔基`,
          subtitle: pad.homeSide === 'enemy' ? '敵區礦脈塔基（可推進搶建奪礦）' : '我方礦脈塔基',
          tone: pad.homeSide === 'enemy' ? 'enemy' : 'player',
          badgeText: '空塔基',
          tags: ['建築地基', `${laneName}`],
          stats: [
            { label: '剩餘金礦脈', value: `${goldLeft} / ${goldMax}G`, tone: 'amber' },
            { label: '狀態', value: '可建防禦塔' },
          ],
          bonuses: [],
          notes: ['建塔完工後自動開採此區塊金礦；施工期間雙防統一為 0（脆弱狀態，易被快攻強拆）。'],
        };
      }

      const activeType = pad.towerType ?? pad.pendingTowerType;
      if (!activeType) return null;
      const def = TOWER_DEFS[activeType];
      const isEnemy = pad.team === 'enemy';
      const bonuses = formatTagBonusesFp(pad.bonusVsTagFp, pad.bonusPerUpgradeVsTagFp, Math.max(0, pad.combatLevel - 1));

      const statusBanner = pad.building
        ? {
            text: `建造施工中（剩餘 ${Math.max(0, pad.buildRemaining).toFixed(1)}s）· 雙防統一 0/0 脆弱（受傷 +25%）`,
            tone: 'critical' as const,
          }
        : pad.upgrading
        ? {
            text: `改裝升級中（剩餘 ${Math.max(0, pad.buildRemaining).toFixed(1)}s）· 暫停射擊與光環`,
            tone: 'warn' as const,
          }
        : pad.harassState === 'halted'
        ? { text: '遭敵軍近距離騷擾，採礦暫時停擺！', tone: 'critical' as const }
        : pad.harassState === 'harassed'
        ? { text: `受騷擾中，採礦效率降至 ${Math.round(pad.harassEffPermille / 10)}%`, tone: 'warn' as const }
        : undefined;

      const upgradeBadges: string[] = [];
      if (pad.combatLevel > 1) upgradeBadges.push(`戰Lv.${pad.combatLevel}`);
      if (pad.miningLevel > 0) upgradeBadges.push(`擴礦+${pad.miningLevel}`);
      if (pad.techLevel > 0) upgradeBadges.push(`科技+${pad.techLevel}`);

      const notes: string[] = [];
      if (pad.building) {
        notes.push('趁施工期集火可輕鬆摧毀並迫使對手損失造價與礦區控制權！');
      } else {
        if (pad.detector) notes.push('具備反隱偵測能力，可照出範圍內潛行敵軍。');
        if (pad.splashRadius > 0) notes.push(`具備 ${Math.round(pad.splashRadius)}px 範圍濺射砲擊。`);
        if (pad.slowFactor > 0) notes.push('命中敵軍時附加強力緩速與減攻速力場。');
        notes.push(def.shortDesc);
      }

      const effArmor = pad.building ? 0 : Math.round((pad.baseArmorFp + pad.armorUpgradeLevel * pad.armorPerUpgradeFp) / FP_SCALE);

      return {
        title: `${def.name}${pad.level > 0 ? ` Lv.${pad.level}` : ''}`,
        subtitle: `${laneName}${upgradeBadges.length > 0 ? ` · ${upgradeBadges.join(' / ')}` : ''}`,
        tone: isEnemy ? 'enemy' : 'player',
        badgeText: pad.building ? (isEnemy ? '敵塔施工中' : '施工中') : isEnemy ? '敵方防禦塔' : '我方防禦塔',
        hp: Math.ceil(pad.hp),
        maxHp: Math.ceil(pad.maxHp),
        statusBanner,
        tags: [
          ...pad.attributes.map((t) => ATTRIBUTE_TAG_LABELS[t] ?? t),
          pad.building ? '脆弱雙防' : pad.canHitAir ? '可對空' : '僅對地',
        ],
        stats: [
          {
            label: '攻擊力',
            value: pad.building ? '施工中（0）' : pad.damage > 0 ? `${pad.damage}` : '無攻擊',
            tone: pad.building ? 'rose' : 'amber',
          },
          {
            label: '雙防（甲/盾）',
            value: pad.building ? '0 / 0（脆弱）' : `${effArmor} / 0`,
            tone: pad.building ? 'rose' : 'sky',
          },
          {
            label: '射程 / 攻速',
            value:
              pad.building || pad.attackIntervalMs <= 0
                ? '-'
                : `${Math.round(pad.range)}px · ${(pad.attackIntervalMs / 1000).toFixed(2)}s`,
          },
          { label: '區塊金礦脈', value: `${goldLeft} / ${goldMax}G`, tone: 'amber' },
        ],
        bonuses: pad.building ? [] : bonuses,
        notes,
      };
    }

    case 'nexus': {
      const isEnemy = ref.team === 'enemy';
      const state = isEnemy ? engine.enemy : engine.player;
      const faction = FACTIONS[state.faction];
      const visible =
        fullVision ||
        !isEnemy ||
        engine.isPointVisibleTo(viewerTeam, ENEMY_NEXUS_POS.x, ENEMY_NEXUS_POS.y, vision);

      if (isEnemy && !visible && engine.enemyNexusHpKnown === null) return null;

      const hpVal = isEnemy && !visible ? (engine.enemyNexusHpKnown ?? state.nexusHp) : Math.ceil(state.nexusHp);
      const tierVal = isEnemy && !visible ? (engine.enemyTechTierKnown ?? state.techTier) : state.techTier;

      return {
        title: `${isEnemy ? '敵方' : '我方'}主堡（${faction.name}）`,
        subtitle: `核心指揮中樞 · 科技 T${tierVal}`,
        tone: isEnemy ? 'enemy' : 'player',
        badgeText: isEnemy ? '敵方主堡' : '我方主堡',
        hp: Math.ceil(hpVal),
        maxHp: Math.ceil(state.nexusMaxHp),
        statusBanner: state.nexusPlatingBroken
          ? { text: '主堡外甲破損：主礦開採效率降至 65%', tone: 'critical' }
          : undefined,
        tags: ['重甲', '建築', `T${tierVal}`],
        stats: [
          { label: '護甲', value: `${NEXUS_ARMOR}`, tone: 'sky' },
          { label: '採礦等級', value: visible || !isEnemy ? `Lv.${state.econLevel}` : '迷霧未知', tone: 'amber' },
          {
            label: '主堡金礦脈',
            value: visible || !isEnemy ? `${Math.ceil(state.nexusGoldReserve)}G` : '需視野偵察',
            tone: 'amber',
          },
          { label: '獲勝條件', value: isEnemy ? '摧毀即勝' : '死守核心', tone: isEnemy ? 'emerald' : 'rose' },
        ],
        bonuses: [],
        notes: [
          isEnemy
            ? '摧毀敵方主堡即可贏得整場對戰！打掉外甲會大幅削弱對手主礦收入。'
            : '主堡受重創破甲時可透過【修復主堡外甲】恢復 100% 採礦效率。',
        ],
      };
    }

    case 'barracks': {
      const b = engine.barracks.find((item) => item.id === ref.id);
      if (!b || (!b.built && !b.building)) return null;
      if (!fullVision && b.team !== viewerTeam && !engine.isPointVisibleTo(viewerTeam, b.x, b.y, vision)) return null;
      const def = BARRACKS_DEFS[b.tier];
      const isEnemy = b.team === 'enemy';
      return {
        title: `${def.name}${b.built ? ` Lv.${b.level}` : ''}`,
        subtitle: `${isEnemy ? '敵方' : '我方'}產兵核心建築`,
        tone: isEnemy ? 'enemy' : 'player',
        badgeText: b.building ? (b.built ? '升級中' : '建造中') : isEnemy ? '敵方兵營' : '我方兵營',
        hp: Math.ceil(b.hp),
        maxHp: Math.ceil(b.maxHp),
        statusBanner: b.building
          ? {
              text: `${b.built ? '升級中' : '施工中'}（剩餘 ${Math.max(0, b.buildRemaining).toFixed(1)}s）`,
              tone: 'warn',
            }
          : undefined,
        tags: ['重甲', '建築', `T${b.tier}兵營`],
        stats: [
          { label: '護甲', value: `${Math.round(b.baseArmorFp / FP_SCALE)}`, tone: 'sky' },
          { label: '對應兵種', value: def.hotkeysLabel, tone: 'amber' },
        ],
        bonuses: [],
        notes: [
          `解鎖 ${def.hotkeysLabel} 並行訓練與專屬高階兵種；摧毀可重創對手爆兵產能！`,
        ],
      };
    }

    case 'armory': {
      const a = engine.armories.find((item) => item.id === ref.id);
      if (!a || (!a.built && !a.building)) return null;
      if (!fullVision && a.team !== viewerTeam && !engine.isPointVisibleTo(viewerTeam, a.x, a.y, vision)) return null;
      const def = ARMORY_BUILDING_DEFS[a.kind];
      const isEnemy = a.team === 'enemy';
      return {
        title: def.name,
        subtitle: `${isEnemy ? '敵方' : '我方'}攻防研發前置建築`,
        tone: isEnemy ? 'enemy' : 'player',
        badgeText: a.building ? '建造中' : isEnemy ? '敵方研究建築' : '研究建築',
        hp: Math.ceil(a.hp),
        maxHp: Math.ceil(a.maxHp),
        statusBanner: a.building
          ? { text: `施工中（剩餘 ${Math.max(0, a.buildRemaining).toFixed(1)}s）`, tone: 'warn' }
          : undefined,
        tags: ['重甲', '建築', '科技前置'],
        stats: [
          { label: '護甲', value: `${Math.round(a.baseArmorFp / FP_SCALE)}`, tone: 'sky' },
          { label: '解鎖科技', value: a.kind === 'bio_lab' ? '生物攻防 [G]/[U]' : '機械／空軍攻防', tone: 'violet' },
        ],
        bonuses: [],
        notes: [def.desc],
      };
    }

    case 'extractor': {
      const e = engine.extractors.find((item) => item.id === ref.id);
      if (!e || (!e.built && !e.building)) return null;
      if (!fullVision && e.team !== viewerTeam && !engine.isPointVisibleTo(viewerTeam, e.x, e.y, vision)) return null;
      const isEnemy = e.team === 'enemy';
      const lvInfo = e.level >= 1 ? GAS_EXTRACTOR_LEVELS[e.level as 1 | 2 | 3] : null;
      return {
        title: `瓦斯挖掘場${e.built ? ` Lv.${e.level}` : ''}`,
        subtitle: `${isEnemy ? '敵方' : '我方'}瓦斯氣礦設施`,
        tone: isEnemy ? 'enemy' : 'player',
        badgeText: e.building ? '建造中' : isEnemy ? '敵方氣礦' : '瓦斯挖掘場',
        hp: Math.ceil(e.hp),
        maxHp: Math.ceil(e.maxHp),
        statusBanner: e.building
          ? { text: `施工中（剩餘 ${Math.max(0, e.buildRemaining).toFixed(1)}s）`, tone: 'warn' }
          : e.upgrading
          ? { text: `升級中（剩餘 ${Math.max(0, e.buildRemaining).toFixed(1)}s）`, tone: 'warn' }
          : undefined,
        tags: ['重甲', '建築', '瓦斯經濟'],
        stats: [
          { label: '護甲', value: `${Math.round(e.baseArmorFp / FP_SCALE)}`, tone: 'sky' },
          { label: '採氣速率', value: e.built && lvInfo ? `+${lvInfo.ratePerSec.toFixed(1)}氣/s` : '施工中', tone: 'emerald' },
        ],
        bonuses: [],
        notes: ['開採高能瓦斯用於攻防升級、高階科技與重甲／空軍單位；摧毀可切斷對手科技線！'],
      };
    }

    case 'depot': {
      const d = engine.depots.find((item) => item.id === ref.id);
      if (!d || (!d.built && !d.building)) return null;
      if (!fullVision && d.team !== viewerTeam && !engine.isPointVisibleTo(viewerTeam, d.x, d.y, vision)) return null;
      const isEnemy = d.team === 'enemy';
      return {
        title: '補給站',
        subtitle: `${isEnemy ? '敵方' : '我方'}人口補給建築`,
        tone: isEnemy ? 'enemy' : 'player',
        badgeText: d.building ? '建造中' : isEnemy ? '敵方補給站' : '補給站',
        hp: Math.ceil(d.hp),
        maxHp: Math.ceil(d.maxHp),
        statusBanner: d.building
          ? { text: `施工中（剩餘 ${Math.max(0, d.buildRemaining).toFixed(1)}s）`, tone: 'warn' }
          : undefined,
        tags: ['重甲', '建築'],
        stats: [
          { label: '護甲', value: `${Math.round(d.baseArmorFp / FP_SCALE)}`, tone: 'sky' },
          { label: '人口上限', value: `+${SUPPLY_DEPOT_BONUS} 人口`, tone: 'amber' },
        ],
        bonuses: [],
        notes: ['摧毀敵方補給站可使其人口卡死、無法繼續徵召新部隊。'],
      };
    }

    case 'objective': {
      const obj = engine.objectives.find((o) => o.id === ref.id);
      if (!obj) return null;
      const visible = fullVision || obj.owner === viewerTeam || engine.isPointVisibleTo(viewerTeam, obj.x, obj.y, vision);
      const meta = OBJECTIVE_META[obj.kind];

      if (obj.kind === 'barricade') {
        if (obj.cleared) return null;
        return {
          title: `${LANE_SHORT_NAMES[obj.lane]}${obj.name}`,
          subtitle: '中立戰線障礙物',
          tone: 'neutral',
          badgeText: '遠古路障',
          hp: visible ? Math.ceil(obj.hp) : Math.ceil(obj.maxHp),
          maxHp: Math.ceil(obj.maxHp),
          tags: ['重甲', '建築', '地面阻擋'],
          stats: [
            { label: '護甲', value: `${Math.round(obj.baseArmorFp / FP_SCALE)}`, tone: 'sky' },
            { label: '突破賞金', value: '+110G', tone: 'emerald' },
          ],
          bonuses: [],
          notes: [
            '阻擋地面部隊通行（空軍可直接飛越）；擊破不向敵方通報，利於偷開側翼！',
            ...(visible ? [] : ['目前位於迷霧中，需視野才能檢視即時剩餘血量。']),
          ],
        };
      }

      const ownerLabel =
        obj.owner === 'player' ? '我方佔領中' : obj.owner === 'enemy' ? '敵方佔領中' : '中立未佔領';
      return {
        title: obj.name,
        subtitle: meta?.desc ?? '野區戰略據點',
        tone: obj.owner === 'enemy' ? 'enemy' : obj.owner === 'player' ? 'player' : 'neutral',
        badgeText: ownerLabel,
        tags: [
          '野區據點',
          obj.jungleZone === 'upper' ? '上側野區' : obj.jungleZone === 'lower' ? '下側野區' : `${LANE_SHORT_NAMES[obj.lane]}據點`,
        ],
        stats: [
          { label: '目前控制權', value: ownerLabel, tone: obj.owner === 'player' ? 'emerald' : obj.owner === 'enemy' ? 'rose' : 'amber' },
          {
            label: '佔領進度',
            value: visible ? `${Math.round(Math.abs(obj.captureProgress))}%` : '迷霧中',
          },
        ],
        bonuses: [],
        notes: [
          obj.kind === 'creep_camp'
            ? obj.cleared
              ? `營地已清剿，約 ${Math.ceil(obj.respawnTimer)}s 後重生野怪。`
              : '清剿此營地所有野怪可獲 +110G 與全軍 18 秒強化增益！'
            : '派單位停留據點圈內即可佔領，提供持續經濟／視野控圖紅利。',
        ],
      };
    }

    case 'event': {
      const ev = engine.activeEvent;
      if (!ev) return null;
      return {
        title: ev.title,
        subtitle: '限時野區動態事件',
        tone: 'neutral',
        badgeText: '野區事件',
        tags: ['全圖爭奪', `剩餘 ${Math.ceil(ev.timeRemaining)}s`],
        stats: [
          { label: '剩餘時間', value: `${Math.ceil(ev.timeRemaining)} 秒`, tone: 'amber' },
          { label: '事件強度', value: `${(ev.powerScale ?? 1).toFixed(1)}×`, tone: 'violet' },
        ],
        bonuses: [],
        notes: [ev.detail, '優先派出奇襲或前線部隊前往爭奪，搶得全軍強化增益！'],
      };
    }
  }
}
