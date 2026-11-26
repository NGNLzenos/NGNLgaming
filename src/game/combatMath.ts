/**
 * Deterministic Fixed-Point RTS Combat & Flat-Subtraction Damage Engine
 *
 * Core Guarantees:
 * 1. ZERO native floating-point arithmetic in HP, Shield, Armor, Damage, or Attack Interval math.
 *    All values use integer fixed-point with FP_SCALE = 1000 (e.g., 1.0 = 1000, 0.5 = 500).
 * 2. 100% transparent Attribute Tag matching & linear flat addition/subtraction.
 *    No hidden per-unit-ID multipliers and no percentage armor reduction.
 * 3. Guaranteed minimum damage per hit = 0.5 (MIN_HIT_DAMAGE_FP = 500).
 * 4. Multi-hit attacks (attackCount >= 2) subtract target armor independently on EVERY hit.
 * 5. Shield priority: shields use independent Shield Armor; overflow damage passes to HP
 *    and then applies HP Armor separately.
 */

export const FP_SCALE = 1000;
export const MIN_HIT_DAMAGE_FP = 500; // 0.5 minimum damage per landed shot

export type AttributeTag =
  | 'Light'
  | 'Armored'
  | 'Biological'
  | 'Mechanical'
  | 'Structure'
  | 'Massive'
  | 'Psionic';

export const ATTRIBUTE_TAG_LABELS: Record<AttributeTag, string> = {
  Light: '輕甲',
  Armored: '重甲',
  Biological: '生物',
  Mechanical: '機械',
  Structure: '建築',
  Massive: '巨型',
  Psionic: '靈能',
};

export const ATTRIBUTE_TAG_BADGE_COLORS: Record<AttributeTag, string> = {
  Light: 'text-sky-200 border-sky-500/40 bg-sky-950/50',
  Armored: 'text-amber-200 border-amber-500/40 bg-amber-950/50',
  Biological: 'text-emerald-200 border-emerald-500/40 bg-emerald-950/50',
  Mechanical: 'text-slate-200 border-slate-500/45 bg-slate-800/70',
  Structure: 'text-orange-200 border-orange-500/40 bg-orange-950/50',
  Massive: 'text-rose-200 border-rose-500/40 bg-rose-950/50',
  Psionic: 'text-violet-200 border-violet-500/40 bg-violet-950/50',
};

export type TagBonusMapFp = Partial<Record<AttributeTag, number>>;

export interface WeaponAttackSpecFp {
  baseDamageFp: number;
  attackUpgradeLevel: number;
  damagePerUpgradeFp: number;
  bonusVsTagFp: TagBonusMapFp;
  bonusPerUpgradeVsTagFp?: TagBonusMapFp;
  attackCount: number;
  attackIntervalMs?: number;
  extraFlatDamageFp?: number;
  splashFalloffPermille?: number; // 1000 = 100%, 680 = 68%, 380 = 38%
}

export interface DefenseProfileFp {
  hpFp: number;
  maxHpFp?: number;
  baseArmorFp: number;
  armorUpgradeLevel: number;
  armorPerUpgradeFp: number;
  shieldFp: number;
  maxShieldFp?: number;
  baseShieldArmorFp: number;
  shieldArmorUpgradeLevel: number;
  shieldArmorPerUpgradeFp: number;
  attributes: readonly AttributeTag[];
}

export interface AttackResolutionResultFp {
  rawSingleHitFp: number;
  effectiveHpArmorFp: number;
  effectiveShieldArmorFp: number;
  shotsFired: number;
  shieldDamageFp: number;
  hpDamageFp: number;
  totalDamageFp: number;
  remainingShieldFp: number;
  remainingHpFp: number;
  destroyed: boolean;
}

/** Static-time conversion from human-readable spec value to fixed-point integer (scale 1000). */
export function toFp(val: number): number {
  return Math.round(val * FP_SCALE);
}

/** Boundary conversion strictly for UI display / canvas progress bars. */
export function fromFp(fp: number): number {
  return fp / FP_SCALE;
}

/** Deterministic integer multiply for two fixed-point values. */
export function mulFp(aFp: number, bFp: number): number {
  return Math.trunc((aFp * bFp) / FP_SCALE);
}

/** Deterministic integer divide for two fixed-point values. */
export function divFp(aFp: number, bFp: number): number {
  if (bFp === 0) return 0;
  return Math.trunc((aFp * FP_SCALE) / bFp);
}

/** Integer-only conversion of delta-time seconds (from frame loop) into deterministic ms step. */
export function dtToFixedMs(dtSec: number): number {
  return Math.max(0, Math.round(dtSec * 1000));
}

/** Format a fixed-point integer cleanly without float noise (e.g. 7000 -> "7", 500 -> "0.5"). */
export function formatFp(fp: number): string {
  const neg = fp < 0;
  const abs = Math.abs(Math.trunc(fp));
  const whole = Math.trunc(abs / FP_SCALE);
  const rem = abs % FP_SCALE;
  if (rem === 0) return `${neg ? '-' : ''}${whole}`;
  // Trim trailing zeros in thousandths
  const frac = String(rem).padStart(3, '0').replace(/0+$/, '');
  return `${neg ? '-' : ''}${whole}.${frac}`;
}

/** Convert a readable Record<AttributeTag, number> to fixed-point TagBonusMapFp. */
export function toTagBonusFp(map?: Partial<Record<AttributeTag, number>>): TagBonusMapFp {
  const out: TagBonusMapFp = {};
  if (!map) return out;
  const keys = Object.keys(map) as AttributeTag[];
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const v = map[k];
    if (v !== undefined && v !== 0) {
      out[k] = toFp(v);
    }
  }
  return out;
}

/** Clone a fixed-point tag bonus map cleanly. */
export function cloneTagBonusFp(map?: TagBonusMapFp): TagBonusMapFp {
  const out: TagBonusMapFp = {};
  if (!map) return out;
  const keys = Object.keys(map) as AttributeTag[];
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const v = map[k];
    if (v !== undefined) out[k] = Math.trunc(v);
  }
  return out;
}

/** Add a flat fixed-point bonus to a specific attribute tag in-place. */
export function addTagBonusFp(map: TagBonusMapFp, tag: AttributeTag, deltaFp: number): void {
  const cur = map[tag] ?? 0;
  map[tag] = Math.trunc(cur + deltaFp);
}

/**
 * Pure Integer Fixed-Point Flat-Subtraction Attack Resolution
 *
 * Single hit raw attack:
 *   rawHitFp = baseDamageFp + attackUpgradeLevel * damagePerUpgradeFp
 *            + sum(bonusVsTagFp[tag] + attackUpgradeLevel * bonusPerUpgradeVsTagFp[tag] for tag in target.attributes)
 *            + extraFlatDamageFp
 *   (scaled by integer splashFalloffPermille / 1000 if splash outer ring)
 *
 * Effective Armor:
 *   effectiveHpArmorFp     = baseArmorFp + armorUpgradeLevel * armorPerUpgradeFp
 *   effectiveShieldArmorFp = baseShieldArmorFp + shieldArmorUpgradeLevel * shieldArmorPerUpgradeFp
 *
 * Per-Shot Loop (i = 0 .. attackCount - 1):
 *   - If shieldFp > 0:
 *       shieldHitFp = max(500, rawHitFp - effectiveShieldArmorFp)
 *       If shieldFp >= shieldHitFp: shieldFp -= shieldHitFp
 *       Else:
 *         absorbed = shieldFp; shieldFp = 0
 *         overflow = shieldHitFp - absorbed
 *         if overflow > 0:
 *           hpHitFp = max(500, overflow - effectiveHpArmorFp)
 *           hpFp = max(0, hpFp - hpHitFp)
 *   - Else (shieldFp == 0):
 *       hpHitFp = max(500, rawHitFp - effectiveHpArmorFp)
 *       hpFp = max(0, hpFp - hpHitFp)
 */
export function resolveDeterministicAttackFp(
  atk: WeaponAttackSpecFp,
  def: DefenseProfileFp
): AttackResolutionResultFp {
  const effectiveHpArmorFp =
    Math.trunc(def.baseArmorFp) + Math.trunc(def.armorUpgradeLevel) * Math.trunc(def.armorPerUpgradeFp);
  const effectiveShieldArmorFp =
    Math.trunc(def.baseShieldArmorFp) +
    Math.trunc(def.shieldArmorUpgradeLevel) * Math.trunc(def.shieldArmorPerUpgradeFp);

  let tagBonusFp = 0;
  for (let i = 0; i < def.attributes.length; i++) {
    const tag = def.attributes[i];
    const baseTagBonus = atk.bonusVsTagFp[tag];
    if (baseTagBonus !== undefined) {
      tagBonusFp += Math.trunc(baseTagBonus);
    }
    if (atk.bonusPerUpgradeVsTagFp && atk.attackUpgradeLevel > 0) {
      const upTagBonus = atk.bonusPerUpgradeVsTagFp[tag];
      if (upTagBonus !== undefined) {
        tagBonusFp += Math.trunc(upTagBonus) * Math.trunc(atk.attackUpgradeLevel);
      }
    }
  }

  let rawSingleHitFp =
    Math.trunc(atk.baseDamageFp) +
    Math.trunc(atk.attackUpgradeLevel) * Math.trunc(atk.damagePerUpgradeFp) +
    tagBonusFp +
    Math.trunc(atk.extraFlatDamageFp ?? 0);

  if (atk.splashFalloffPermille !== undefined && atk.splashFalloffPermille !== FP_SCALE) {
    rawSingleHitFp = Math.trunc((rawSingleHitFp * Math.trunc(atk.splashFalloffPermille)) / FP_SCALE);
  }
  if (rawSingleHitFp < 0) rawSingleHitFp = 0;

  let curHpFp = Math.max(0, Math.trunc(def.hpFp));
  let curShieldFp = Math.max(0, Math.trunc(def.shieldFp));
  let totalShieldDmgFp = 0;
  let totalHpDmgFp = 0;

  const shots = Math.max(1, Math.trunc(atk.attackCount));
  let shotsFired = 0;

  for (let s = 0; s < shots; s++) {
    if (curHpFp <= 0) break;
    shotsFired++;

    if (curShieldFp > 0) {
      const shieldHitFp = Math.max(MIN_HIT_DAMAGE_FP, rawSingleHitFp - effectiveShieldArmorFp);
      if (curShieldFp >= shieldHitFp) {
        curShieldFp -= shieldHitFp;
        totalShieldDmgFp += shieldHitFp;
      } else {
        const absorbedFp = curShieldFp;
        curShieldFp = 0;
        totalShieldDmgFp += absorbedFp;

        const overflowRawFp = shieldHitFp - absorbedFp;
        if (overflowRawFp > 0) {
          const hpOverflowHitFp = Math.max(MIN_HIT_DAMAGE_FP, overflowRawFp - effectiveHpArmorFp);
          const appliedHpFp = Math.min(curHpFp, hpOverflowHitFp);
          curHpFp -= appliedHpFp;
          totalHpDmgFp += appliedHpFp;
        }
      }
    } else {
      const hpHitFp = Math.max(MIN_HIT_DAMAGE_FP, rawSingleHitFp - effectiveHpArmorFp);
      const appliedHpFp = Math.min(curHpFp, hpHitFp);
      curHpFp -= appliedHpFp;
      totalHpDmgFp += appliedHpFp;
    }
  }

  return {
    rawSingleHitFp,
    effectiveHpArmorFp,
    effectiveShieldArmorFp,
    shotsFired,
    shieldDamageFp: totalShieldDmgFp,
    hpDamageFp: totalHpDmgFp,
    totalDamageFp: totalShieldDmgFp + totalHpDmgFp,
    remainingShieldFp: curShieldFp,
    remainingHpFp: curHpFp,
    destroyed: curHpFp <= 0,
  };
}

/**
 * Helper to compute deterministic integer DPS × 1000 (for UI display) against a 0-armor neutral baseline.
 * DPS_fp = Math.trunc((singleHitDamageFp * attackCount * 1000) / attackIntervalMs)
 */
export function computeBaseDpsFp(
  singleHitDamageFp: number,
  attackCount: number,
  attackIntervalMs: number,
  squadSize = 1
): number {
  if (attackIntervalMs <= 0) return 0;
  return Math.trunc((Math.trunc(singleHitDamageFp) * Math.trunc(attackCount) * Math.trunc(squadSize) * 1000) / Math.trunc(attackIntervalMs));
}

/** Deterministic integer interval scaling given an attack-speed permille multiplier (1000 = 1.0x, 1400 = 1.4x). */
export function scaleAttackIntervalMs(baseIntervalMs: number, speedPermille: number): number {
  const safeSpeed = Math.max(250, Math.trunc(speedPermille));
  return Math.max(180, Math.trunc((Math.trunc(baseIntervalMs) * 1000) / safeSpeed));
}
