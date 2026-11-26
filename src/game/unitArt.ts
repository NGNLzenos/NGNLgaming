import { UnitEntity } from './types';

export interface UnitArtPalette {
  body: string;
  dark: string;
  light: string;
  glow: string;
  steelDark: string;
  steelMid: string;
  steelLight: string;
  outline: string;
  isEnemy: boolean;
  isFlashing: boolean;
}

export function getUnitArtPalette(
  u: UnitEntity,
  playerAccentHex: string
): UnitArtPalette {
  const isFlashing = u.hitFlash > 0.25;
  const isEnemy = u.team === 'enemy';

  if (u.team === 'neutral') {
    if (u.defId === 'supply_crate') {
      return {
        body: isFlashing ? '#FFFFFF' : '#F59E0B',
        dark: '#78350F',
        light: '#FDE68A',
        glow: '#FEF08A',
        steelDark: '#292524',
        steelMid: '#57534E',
        steelLight: '#D6D3D1',
        outline: '#0B0F14',
        isEnemy: false,
        isFlashing,
      };
    }
    if (u.defId === 'overdrive_core') {
      return {
        body: isFlashing ? '#FFFFFF' : '#FACC15',
        dark: '#A16207',
        light: '#FEF9C3',
        glow: '#FFFBEB',
        steelDark: '#422006',
        steelMid: '#CA8A04',
        steelLight: '#FEF08A',
        outline: '#0B0F14',
        isEnemy: false,
        isFlashing,
      };
    }
    if (u.defId === 'merc_guardian') {
      return {
        body: isFlashing ? '#FFFFFF' : '#F97316',
        dark: '#7C2D12',
        light: '#FDBA74',
        glow: '#FEF08A',
        steelDark: '#1C1917',
        steelMid: '#44403C',
        steelLight: '#A8A29E',
        outline: '#0B0F14',
        isEnemy: false,
        isFlashing,
      };
    }
    if (u.isBoss) {
      return {
        body: isFlashing ? '#FFFFFF' : '#9333EA',
        dark: '#3B0764',
        light: '#D8B4FE',
        glow: '#F0ABFC',
        steelDark: '#1E1B4B',
        steelMid: '#581C87',
        steelLight: '#E9D5FF',
        outline: '#0B0F14',
        isEnemy: false,
        isFlashing,
      };
    }
    // Standard jungle creep / fog golem
    return {
      body: isFlashing ? '#FFFFFF' : '#14B8A6',
      dark: '#115E59',
      light: '#99F6E4',
      glow: '#5EEAD4',
      steelDark: '#134E4A',
      steelMid: '#0F766E',
      steelLight: '#CCFBF1',
      outline: '#0B0F14',
      isEnemy: false,
      isFlashing,
    };
  }

  if (isEnemy) {
    // Keep enemy chassis unmistakable Crimson Red, while keeping faction-coded energy accents!
    const factionGlow =
      u.faction === 'dawn' ? '#FDE047' : u.faction === 'swarm' ? '#A3E635' : '#38BDF8';
    return {
      body: isFlashing ? '#FFFFFF' : '#EF4444',
      dark: '#7F1D1D',
      light: '#FCA5A5',
      glow: factionGlow,
      steelDark: '#1E1B24',
      steelMid: '#475569',
      steelLight: '#CBD5E1',
      outline: '#0B0F14',
      isEnemy: true,
      isFlashing,
    };
  }

  if (u.faction === 'dawn') {
    return {
      body: isFlashing ? '#FFFFFF' : '#F59E0B',
      dark: '#78350F',
      light: '#FEF08A',
      glow: '#38BDF8',
      steelDark: '#292524',
      steelMid: '#B45309',
      steelLight: '#FDE68A',
      outline: '#0B0F14',
      isEnemy: false,
      isFlashing,
    };
  }

  if (u.faction === 'swarm') {
    return {
      body: isFlashing ? '#FFFFFF' : '#10B981',
      dark: '#064E3B',
      light: '#6EE7B7',
      glow: '#BEF264',
      steelDark: '#052E16',
      steelMid: '#047857',
      steelLight: '#A7F3D0',
      outline: '#0B0F14',
      isEnemy: false,
      isFlashing,
    };
  }

  // Ironbound Federation (Player)
  return {
    body: isFlashing ? '#FFFFFF' : playerAccentHex || '#3B82F6',
    dark: '#1E3A8A',
    light: '#93C5FD',
    glow: '#38BDF8',
    steelDark: '#1E293B',
    steelMid: '#475569',
    steelLight: '#E2E8F0',
    outline: '#0B0F14',
    isEnemy: false,
    isFlashing,
  };
}

/**
 * Draws a tapered glowing jet thruster flame pointing backward (-X) from (x, y).
 */
function drawJetFlame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  width: number,
  outerColor: string,
  innerColor: string
) {
  ctx.save();
  ctx.fillStyle = outerColor;
  ctx.beginPath();
  ctx.moveTo(x, y - width * 0.5);
  ctx.lineTo(x - len, y);
  ctx.lineTo(x, y + width * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = innerColor;
  ctx.beginPath();
  ctx.moveTo(x, y - width * 0.24);
  ctx.lineTo(x - len * 0.62, y);
  ctx.lineTo(x, y + width * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Draws a pair of animated scuttling insect legs along top and bottom of an organic body.
 */
function drawInsectLegs(
  ctx: CanvasRenderingContext2D,
  pairs: number,
  spreadX: number,
  bodyY: number,
  legLen: number,
  stridePhase: number,
  color: string,
  lineWidth = 1.6
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < pairs; i++) {
    const frac = pairs === 1 ? 0 : (i / (pairs - 1)) * 2 - 1;
    const bx = frac * spreadX;
    const swing = Math.sin(stridePhase + i * 2.1) * 2.2;
    for (const side of [-1, 1]) {
      const kneeX = bx + swing * side * 0.5;
      const kneeY = side * (bodyY + legLen * 0.55);
      const footX = bx + frac * 2.6 + swing * side;
      const footY = side * (bodyY + legLen);
      ctx.beginPath();
      ctx.moveTo(bx, side * bodyY * 0.65);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(footX, footY);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Draws an intuitive, high-craft vector silhouette for every unit in Fogfront RTS.
 * All shapes are authored facing +X and mirrored automatically via `dir` (+1 or -1).
 */
export function drawDetailedUnitArt(
  ctx: CanvasRenderingContext2D,
  u: UnitEntity,
  elapsed: number,
  dir: 1 | -1,
  p: UnitArtPalette
) {
  // Slight visual boost for compact infantry/light flyers so weapons, wings & limbs read crisply at 1.0x zoom
  const r = u.radius <= 10 ? u.radius * 1.18 : u.radius * 1.06;
  const speedSq = u.vx * u.vx + u.vy * u.vy;
  const isMoving = speedSq > 16;
  const stridePhase = elapsed * (isMoving ? 14 : 3.4) + u.id * 1.73;
  const stride = Math.sin(stridePhase) * (isMoving ? 1 : 0.22);
  const jetFlicker = 0.78 + 0.34 * Math.sin(elapsed * 30 + u.id * 2.3);
  const wingFlap = Math.sin(elapsed * 12 + u.id * 1.5);
  const pulse = 0.5 + 0.5 * Math.sin(elapsed * 6.5 + u.id);

  ctx.save();
  ctx.scale(dir, 1);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Subtle wingtip contrails / flight wind streaks behind moving Air units for immediate airborne feel!
  if (u.domain === 'air' && isMoving) {
    ctx.save();
    ctx.strokeStyle = p.isEnemy ? 'rgba(252, 165, 165, 0.22)' : 'rgba(186, 230, 253, 0.24)';
    ctx.lineWidth = 1.2;
    const trailLen = r * 1.35 + pulse * 4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.65, -r * 0.85);
    ctx.lineTo(-r * 0.65 - trailLen, -r * 0.85);
    ctx.moveTo(-r * 0.65, r * 0.85);
    ctx.lineTo(-r * 0.65 - trailLen, r * 0.85);
    ctx.stroke();
    ctx.restore();
  }

  // =========================================================================
  // NEUTRAL SPECIAL OBJECTS & JUNGLE CREATURES
  // =========================================================================
  if (u.defId === 'supply_crate') {
    const s = r * 0.95;
    // Steel military airdrop crate
    ctx.fillStyle = p.steelDark;
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-s, -s, s * 2, s * 2, 3);
    ctx.fill();
    ctx.stroke();

    // Inner amber lid
    ctx.fillStyle = p.body;
    ctx.fillRect(-s * 0.78, -s * 0.78, s * 1.56, s * 1.56);

    // Cross cargo straps
    ctx.strokeStyle = p.light;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.85, 0);
    ctx.lineTo(s * 0.85, 0);
    ctx.moveTo(0, -s * 0.85);
    ctx.lineTo(0, s * 0.85);
    ctx.stroke();

    // Glowing beacon core
    ctx.fillStyle = p.glow;
    ctx.beginPath();
    ctx.arc(0, 0, 3.2 + pulse * 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (u.defId === 'overdrive_core') {
    // Rotating crystalline Star-Vein Overdrive Prism + orbiting shards
    ctx.save();
    ctx.rotate(elapsed * 0.8);
    ctx.fillStyle = p.body;
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rad = i % 2 === 0 ? r * 1.15 : r * 0.65;
      if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
      else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Orbiting mini crystal shards
    ctx.fillStyle = p.light;
    for (let k = 0; k < 3; k++) {
      const a = elapsed * 1.8 + (k * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * (r + 5), Math.sin(a) * (r + 5), 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle = p.glow;
    ctx.beginPath();
    ctx.arc(0, 0, 4.8 + pulse * 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (u.defId === 'merc_guardian') {
    // Heavy copper mercenary exo-trooper with dual shoulder armor & heavy cannon
    ctx.fillStyle = p.steelDark;
    ctx.fillRect(-r * 0.4 + stride * 2.5, -r * 0.65, 5, 4);
    ctx.fillRect(-r * 0.4 - stride * 2.5, r * 0.65 - 4, 5, 4);

    // Broad mechanical pauldrons
    ctx.fillStyle = p.body;
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-r * 0.72, -r * 0.95, r * 1.35, r * 1.9, 4);
    ctx.fill();
    ctx.stroke();

    // Visor helmet
    ctx.fillStyle = p.steelMid;
    ctx.beginPath();
    ctx.arc(r * 0.08, 0, r * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = p.glow;
    ctx.fillRect(r * 0.25, -3, 4, 6);

    // Heavy mercenary rotary cannon
    ctx.fillStyle = p.steelLight;
    ctx.fillRect(r * 0.3, 2, r * 0.95, 4.5);
    ctx.strokeRect(r * 0.3, 2, r * 0.95, 4.5);
    ctx.restore();
    return;
  }

  // =========================================================================
  // FACTION 1: 鐵砧聯邦 (IRONBOUND FEDERATION)
  // =========================================================================
  switch (u.shape) {
    case 'rifle': {
      // 步槍小隊 — Human Biological Tactical Marine (boots, marine shoulders, helmet, assault rifle)
      // Stepping boots
      ctx.fillStyle = p.steelDark;
      ctx.beginPath();
      ctx.ellipse(-2 + stride * 2.8, -r * 0.42, 3.2, 1.9, 0, 0, Math.PI * 2);
      ctx.ellipse(-2 - stride * 2.8, r * 0.42, 3.2, 1.9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tactical backpack
      ctx.fillStyle = p.dark;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.3;
      ctx.fillRect(-r * 0.85, -r * 0.55, r * 0.55, r * 1.1);
      ctx.strokeRect(-r * 0.85, -r * 0.55, r * 0.55, r * 1.1);

      // Broad human marine shoulders / torso
      ctx.fillStyle = p.body;
      ctx.beginPath();
      ctx.ellipse(-r * 0.08, 0, r * 0.62, r * 0.88, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Forward arms gripping rifle
      ctx.strokeStyle = p.body;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.58);
      ctx.lineTo(r * 0.55, -1.5);
      ctx.moveTo(0, r * 0.58);
      ctx.lineTo(r * 0.45, 2.2);
      ctx.stroke();

      // Assault Rifle (dark gunmetal receiver + steel barrel + subtle muzzle)
      ctx.fillStyle = p.steelDark;
      ctx.fillRect(r * 0.15, -1.2, r * 1.15, 3.4);
      ctx.fillStyle = p.steelLight;
      ctx.fillRect(r * 0.72, -0.6, r * 0.72, 2.0);

      // Round combat helmet + glowing visor
      ctx.fillStyle = p.light;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(r * 0.05, 0, r * 0.46, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(r * 0.25, 0, r * 0.26, -1.1, 1.1);
      ctx.fill();
      ctx.fillStyle = p.glow;
      ctx.fillRect(r * 0.32, -1.8, 2.2, 3.6);
      break;
    }

    case 'elite_rifle': {
      // 精銳小隊 — Spec-Ops Heavy Commando (antenna pack, angular armor pads, long pulse sniper rifle)
      // Stepping boots
      ctx.fillStyle = p.steelDark;
      ctx.beginPath();
      ctx.ellipse(-2.5 + stride * 3.0, -r * 0.46, 3.5, 2.0, 0, 0, Math.PI * 2);
      ctx.ellipse(-2.5 - stride * 3.0, r * 0.46, 3.5, 2.0, 0, 0, Math.PI * 2);
      ctx.fill();

      // Spec-ops comm pack + radio antenna
      ctx.fillStyle = p.steelDark;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.3;
      ctx.fillRect(-r * 0.95, -r * 0.56, r * 0.55, r * 1.12);
      ctx.strokeRect(-r * 0.95, -r * 0.56, r * 0.55, r * 1.12);
      ctx.strokeStyle = p.light;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.82, -r * 0.45);
      ctx.lineTo(-r * 1.28, -r * 0.92);
      ctx.stroke();

      // Armored tactical shoulders
      ctx.fillStyle = p.body;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-r * 0.55, -r * 0.94, r * 1.05, r * 1.88, 4);
      ctx.fill();
      ctx.stroke();

      // Shoulder trim stripes
      ctx.fillStyle = p.light;
      ctx.fillRect(-r * 0.35, -r * 0.82, r * 0.65, 2.2);
      ctx.fillRect(-r * 0.35, r * 0.82 - 2.2, r * 0.65, 2.2);

      // Long heavy rail-carbine with glowing plasma barrel
      ctx.fillStyle = p.steelDark;
      ctx.fillRect(r * 0.15, -1.5, r * 1.45, 3.8);
      ctx.fillStyle = p.glow;
      ctx.fillRect(r * 0.55, -0.5, r * 0.95, 1.6);

      // Angular tactical helmet + bright optic visor
      ctx.fillStyle = p.dark;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(r * 0.55, 0);
      ctx.lineTo(0, -r * 0.48);
      ctx.lineTo(-r * 0.42, -r * 0.36);
      ctx.lineTo(-r * 0.42, r * 0.36);
      ctx.lineTo(0, r * 0.48);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = p.glow;
      ctx.fillRect(r * 0.16, -2.5, 3.2, 5);
      break;
    }

    case 'mech': {
      // 鐵壁盾衛 — Heavy Armored Riot-Shield Juggernaut Trooper
      // Heavy stomping armored boots
      ctx.fillStyle = p.steelDark;
      ctx.fillRect(-r * 0.45 + stride * 2.4, -r * 0.65, 5, 3.8);
      ctx.fillRect(-r * 0.45 - stride * 2.4, r * 0.65 - 3.8, 5, 3.8);

      // Bulky armored torso & backpack behind the shield
      ctx.fillStyle = p.dark;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-r * 0.95, -r * 0.78, r * 1.25, r * 1.56, 4);
      ctx.fill();
      ctx.stroke();

      // Broad juggernaut shoulders
      ctx.fillStyle = p.body;
      ctx.beginPath();
      ctx.ellipse(-r * 0.25, 0, r * 0.58, r * 0.88, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Helmet
      ctx.fillStyle = p.steelLight;
      ctx.beginPath();
      ctx.arc(-r * 0.12, 0, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Side-peeking compact SMG barrel
      ctx.fillStyle = p.steelDark;
      ctx.fillRect(r * 0.2, r * 0.48, r * 0.88, 3.2);

      // MASSIVE CURVED STEEL TOWER RIOT SHIELD across the front!
      ctx.fillStyle = p.steelMid;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(r * 0.35, -r * 1.08);
      ctx.quadraticCurveTo(r * 1.22, -r * 0.6, r * 1.15, 0);
      ctx.quadraticCurveTo(r * 1.22, r * 0.6, r * 0.35, r * 1.08);
      ctx.lineTo(r * 0.12, r * 0.88);
      ctx.quadraticCurveTo(r * 0.72, 0, r * 0.12, -r * 0.88);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Bright armor edge & reinforced shield viewport slit
      ctx.strokeStyle = p.light;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(r * 0.48, -r * 0.88);
      ctx.quadraticCurveTo(r * 1.05, 0, r * 0.48, r * 0.88);
      ctx.stroke();

      ctx.fillStyle = p.glow;
      ctx.fillRect(r * 0.68, -2.5, 2.6, 5);
      break;
    }

    case 'flamer': {
      // 火焰兵 — Mechanical Hazmat Pyro Exo-Suit (twin bright orange fuel tanks + flamethrower + live pilot flame)
      // Heavy exo boots
      ctx.fillStyle = p.steelDark;
      ctx.fillRect(-r * 0.45 + stride * 2.4, -r * 0.56, 4.5, 3.4);
      ctx.fillRect(-r * 0.45 - stride * 2.4, r * 0.56 - 3.4, 4.5, 3.4);

      // Twin pressurized ORANGE fuel canisters strapped on back!
      ctx.fillStyle = '#EA580C';
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(-r * 1.05, -r * 0.72, r * 0.62, r * 0.62, 2.5);
      ctx.roundRect(-r * 1.05, r * 0.1, r * 0.62, r * 0.62, 2.5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FDBA74';
      ctx.fillRect(-r * 0.92, -r * 0.56, r * 0.36, 1.8);
      ctx.fillRect(-r * 0.92, r * 0.26, r * 0.36, 1.8);

      // Boxy mechanical fire-suit torso
      ctx.fillStyle = p.body;
      ctx.beginPath();
      ctx.roundRect(-r * 0.48, -r * 0.82, r * 0.98, r * 1.64, 3);
      ctx.fill();
      ctx.stroke();

      // Chunky twin-tube flamethrower nozzle
      ctx.fillStyle = p.steelMid;
      ctx.fillRect(r * 0.32, -2.6, r * 0.88, 5.2);
      ctx.strokeRect(r * 0.32, -2.6, r * 0.88, 5.2);

      // Live flickering pilot flame at the tip!
      const flameR = 2.6 * jetFlicker;
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.moveTo(r * 1.18, -flameR * 0.8);
      ctx.lineTo(r * 1.18 + flameR * 2.2, 0);
      ctx.lineTo(r * 1.18, flameR * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(r * 1.24, 0, flameR * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Hazmat helmet with orange-tinted heat visor
      ctx.fillStyle = p.steelLight;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(r * 0.14, -2.4, 2.8, 4.8);
      break;
    }

    case 'mortar': {
      // 攻城迫擊砲 — Tracked Siege Artillery Tank (dual tank treads + armored turret + heavy mortar barrel)
      const treadW = r * 1.9;
      const treadH = r * 0.42;

      // Dual dark armored tank treads (top & bottom)
      ctx.fillStyle = '#111827';
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-treadW * 0.52, -r * 0.96, treadW, treadH, 2.5);
      ctx.roundRect(-treadW * 0.52, r * 0.96 - treadH, treadW, treadH, 2.5);
      ctx.fill();
      ctx.stroke();

      // Tread grip notches
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.2;
      const treadShift = isMoving ? ((elapsed * 18) % 5) : 0;
      for (let tx = -treadW * 0.42 + treadShift; tx < treadW * 0.42; tx += 5) {
        ctx.beginPath();
        ctx.moveTo(tx, -r * 0.94);
        ctx.lineTo(tx, -r * 0.94 + treadH);
        ctx.moveTo(tx, r * 0.94 - treadH);
        ctx.lineTo(tx, r * 0.94);
        ctx.stroke();
      }

      // Armored tank hull chassis
      ctx.fillStyle = p.body;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-r * 0.85, -r * 0.65, r * 1.65, r * 1.3, 3);
      ctx.fill();
      ctx.stroke();

      // Rear recoil stabilizer bumper
      ctx.fillStyle = p.steelMid;
      ctx.fillRect(-r * 1.02, -r * 0.45, r * 0.24, r * 0.9);

      // Circular artillery turret mount
      ctx.fillStyle = p.dark;
      ctx.beginPath();
      ctx.arc(-r * 0.12, 0, r * 0.52, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Thick heavy siege mortar cannon barrel + orange recoil rings
      ctx.fillStyle = p.steelMid;
      ctx.fillRect(-r * 0.05, -3.8, r * 1.38, 7.6);
      ctx.strokeRect(-r * 0.05, -3.8, r * 1.38, 7.6);

      // Muzzle brake & glowing heat ring
      ctx.fillStyle = '#FB923C';
      ctx.fillRect(r * 0.55, -3.2, 3.2, 6.4);
      ctx.fillStyle = p.steelDark;
      ctx.fillRect(r * 1.15, -4.4, 3.2, 8.8);
      break;
    }

    case 'titan': {
      // 泰坦重裝機甲 — Colossal Bipedal War Mech (walking mech feet, bulky torso, shoulder pods, twin heavy cannons)
      // Articulated heavy mechanical legs stepping beneath torso
      ctx.fillStyle = p.steelDark;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.6;
      const leftStep = stride * 4.2;
      const rightStep = -stride * 4.2;
      ctx.beginPath();
      ctx.roundRect(-4 + leftStep, -r * 1.05, 10, 5.5, 2);
      ctx.roundRect(-4 + rightStep, r * 1.05 - 5.5, 10, 5.5, 2);
      ctx.fill();
      ctx.stroke();

      // Twin heavy autocannon arms on left & right flanks!
      ctx.fillStyle = p.steelMid;
      ctx.fillRect(r * 0.15, -r * 0.88, r * 1.05, 4.6);
      ctx.strokeRect(r * 0.15, -r * 0.88, r * 1.05, 4.6);
      ctx.fillRect(r * 0.15, r * 0.88 - 4.6, r * 1.05, 4.6);
      ctx.strokeRect(r * 0.15, r * 0.88 - 4.6, r * 1.05, 4.6);
      // Glowing muzzle tips
      ctx.fillStyle = '#FDBA74';
      ctx.fillRect(r * 1.12, -r * 0.84, 3, 3.6);
      ctx.fillRect(r * 1.12, r * 0.88 - 4.1, 3, 3.6);

      // Colossal chamfered armored mech torso
      ctx.fillStyle = p.body;
      ctx.beginPath();
      ctx.moveTo(r * 0.65, -r * 0.55);
      ctx.lineTo(r * 0.65, r * 0.55);
      ctx.lineTo(r * 0.15, r * 0.96);
      ctx.lineTo(-r * 0.82, r * 0.82);
      ctx.lineTo(-r * 0.96, r * 0.45);
      ctx.lineTo(-r * 0.96, -r * 0.45);
      ctx.lineTo(-r * 0.82, -r * 0.82);
      ctx.lineTo(r * 0.15, -r * 0.96);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Heavy armored shoulder missile pods with hazard trim
      ctx.fillStyle = p.dark;
      ctx.fillRect(-r * 0.58, -r * 0.84, r * 0.78, r * 0.42);
      ctx.fillRect(-r * 0.58, r * 0.42, r * 0.78, r * 0.42);
      ctx.fillStyle = p.light;
      ctx.fillRect(-r * 0.48, -r * 0.74, r * 0.58, 2.2);
      ctx.fillRect(-r * 0.48, r * 0.74 - 2.2, r * 0.58, 2.2);

      // Recessed armored cockpit head + glowing slit visor
      ctx.fillStyle = p.steelDark;
      ctx.beginPath();
      ctx.roundRect(-r * 0.25, -r * 0.36, r * 0.78, r * 0.72, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = p.glow;
      ctx.fillRect(r * 0.18, -r * 0.22, 3.6, r * 0.44);
      break;
    }

    case 'recon': {
      // 鷹眼偵察機 — Twin-Boom AWACS Scout Aircraft (swept hawk wings, spinning dorsal radar dish, thruster glow)
      drawJetFlame(ctx, -r * 0.75, 0, r * 0.68 * jetFlicker, 4.2, '#38BDF8', '#E0F2FE');

      // Swept hawk-like reconnaissance wings
      ctx.fillStyle = p.body;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(r * 1.22, 0);
      ctx.lineTo(r * 0.15, -r * 0.35);
      ctx.lineTo(-r * 0.25, -r * 1.38);
      ctx.lineTo(-r * 0.65, -r * 1.25);
      ctx.lineTo(-r * 0.38, -r * 0.32);
      ctx.lineTo(-r * 0.85, -r * 0.48);
      ctx.lineTo(-r * 0.75, 0);
      ctx.lineTo(-r * 0.85, r * 0.48);
      ctx.lineTo(-r * 0.38, r * 0.32);
      ctx.lineTo(-r * 0.65, r * 1.25);
      ctx.lineTo(-r * 0.25, r * 1.38);
      ctx.lineTo(r * 0.15, r * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Forward optical nose sensor glass
      ctx.fillStyle = p.glow;
      ctx.beginPath();
      ctx.ellipse(r * 0.68, 0, 3.2, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Prominent spinning dorsal AWACS radar disc
      ctx.fillStyle = p.steelDark;
      ctx.strokeStyle = p.light;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(-r * 0.08, 0, r * 0.48, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const radarA = elapsed * 5.6;
      ctx.strokeStyle = '#67E8F9';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-r * 0.08 - Math.cos(radarA) * r * 0.42, -Math.sin(radarA) * r * 0.42);
      ctx.lineTo(-r * 0.08 + Math.cos(radarA) * r * 0.42, Math.sin(radarA) * r * 0.42);
      ctx.stroke();
      break;
    }

    case 'valkyrie': {
      // 女武神戰機 — Sleek Twin-Engine Stealth Fighter Jet (delta wings, cockpit canopy, twin afterburners!)
      // Twin animated jet afterburner exhaust flames
      drawJetFlame(ctx, -r * 0.88, -r * 0.28, r * 0.9 * jetFlicker, 4.2, '#F97316', '#FEF08A');
      drawJetFlame(ctx, -r * 0.88, r * 0.28, r * 0.9 * jetFlicker, 4.2, '#F97316', '#FEF08A');

      // Swept stealth fighter airframe & wings
      ctx.fillStyle = p.body;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(r * 1.42, 0); // Sharp fighter nose
      ctx.lineTo(r * 0.35, -r * 0.32);
      ctx.lineTo(-r * 0.35, -r * 1.32); // Left wingtip
      ctx.lineTo(-r * 0.82, -r * 1.15);
      ctx.lineTo(-r * 0.52, -r * 0.38);
      ctx.lineTo(-r * 0.98, -r * 0.52); // Left tailplane
      ctx.lineTo(-r * 0.85, 0);
      ctx.lineTo(-r * 0.98, r * 0.52); // Right tailplane
      ctx.lineTo(-r * 0.52, r * 0.38);
      ctx.lineTo(-r * 0.82, r * 1.15);
      ctx.lineTo(-r * 0.35, r * 1.32); // Right wingtip
      ctx.lineTo(r * 0.35, r * 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wing stripe & metallic fuselage ridge
      ctx.strokeStyle = p.light;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(r * 0.15, -r * 0.45);
      ctx.lineTo(-r * 0.45, -r * 1.12);
      ctx.moveTo(r * 0.15, r * 0.45);
      ctx.lineTo(-r * 0.45, r * 1.12);
      ctx.stroke();

      // Sleek fighter glass cockpit canopy
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.ellipse(r * 0.42, 0, r * 0.38, r * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.glow;
      ctx.beginPath();
      ctx.ellipse(r * 0.48, 0, r * 0.24, r * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'gunship': {
      // 天穹砲艇 — Heavy Armored Sky-Fortress Battlecruiser (twin hulls, VTOL turbine pods, broadside cannons, big jets)
      // Powerful dual main engine thrusters
      drawJetFlame(ctx, -r * 1.05, -r * 0.38, r * 0.95 * jetFlicker, 6.2, '#38BDF8', '#F0F9FF');
      drawJetFlame(ctx, -r * 1.05, r * 0.38, r * 0.95 * jetFlicker, 6.2, '#38BDF8', '#F0F9FF');

      // Heavy armored stub-wings with VTOL turbine rings
      ctx.fillStyle = p.steelDark;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-r * 0.55, -r * 1.22, r * 0.95, r * 2.44, 4);
      ctx.fill();
      ctx.stroke();

      // Spinning VTOL rotor/turbine glow discs on wingtips
      ctx.fillStyle = p.glow;
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.arc(-r * 0.08, -r * 0.98, 3.6, 0, Math.PI * 2);
      ctx.arc(-r * 0.08, r * 0.98, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Twin heavy forward cannon barrels
      ctx.fillStyle = p.steelLight;
      ctx.fillRect(r * 0.55, -r * 0.48, r * 0.78, 3.4);
      ctx.fillRect(r * 0.55, r * 0.48 - 3.4, r * 0.78, 3.4);

      // Broad armored battlecruiser hull
      ctx.fillStyle = p.body;
      ctx.beginPath();
      ctx.moveTo(r * 1.18, -r * 0.25);
      ctx.lineTo(r * 1.18, r * 0.25);
      ctx.lineTo(r * 0.48, r * 0.72);
      ctx.lineTo(-r * 1.02, r * 0.64);
      ctx.lineTo(-r * 1.12, r * 0.35);
      ctx.lineTo(-r * 1.12, -r * 0.35);
      ctx.lineTo(-r * 1.02, -r * 0.64);
      ctx.lineTo(r * 0.48, -r * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dorsal armored command bridge & glowing viewport
      ctx.fillStyle = p.dark;
      ctx.beginPath();
      ctx.roundRect(-r * 0.52, -r * 0.36, r * 1.12, r * 0.72, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = p.glow;
      ctx.fillRect(r * 0.22, -r * 0.22, 4.2, r * 0.44);
      break;
    }

    // =========================================================================
    // FACTION 2: 晨曦聖約 (DAWN COVENANT)
    // =========================================================================
    case 'zealot': {
      // 光刃斥候 — Psionic Blade Warrior (agile humanoid, flowing mantle, dual glowing curved energy blades!)
      // Striding boots
      ctx.fillStyle = p.dark;
      ctx.beginPath();
      ctx.ellipse(-2 + stride * 3.0, -r * 0.38, 3, 1.8, 0, 0, Math.PI * 2);
      ctx.ellipse(-2 - stride * 3.0, r * 0.38, 3, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Fluttering rear ceremonial cape
      const capeWag = Math.sin(elapsed * 9 + u.id) * 1.8;
      ctx.fillStyle = p.dark;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.55);
      ctx.lineTo(-r * 1.22, -r * 0.35 + capeWag);
      ctx.lineTo(-r * 1.05, 0 + capeWag * 0.5);
      ctx.lineTo(-r * 1.22, r * 0.35 + capeWag);
      ctx.lineTo(-r * 0.2, r * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dual glowing PSIONIC ENERGY BLADES projecting from both arms!
      ctx.strokeStyle = p.glow;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(r * 0.1, -r * 0.65);
      ctx.quadraticCurveTo(r * 0.95, -r * 0.85, r * 1.48, -r * 0.22);
      ctx.moveTo(r * 0.1, r * 0.65);
      ctx.quadraticCurveTo(r * 0.95, r * 0.85, r * 1.48, r * 0.22);
      ctx.stroke();
      // White hot inner blade core
      ctx.strokeStyle = '#F0F9FF';
      ctx.lineWidth = 1.1;
      ctx.stroke();

      // Golden armored warrior shoulders & crest helm
      ctx.fillStyle = p.body;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.58, r * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pointed crested helm
      ctx.fillStyle = p.light;
      ctx.beginPath();
      ctx.moveTo(r * 0.52, 0);
      ctx.lineTo(-r * 0.15, -r * 0.38);
      ctx.lineTo(-r * 0.45, 0);
      ctx.lineTo(-r * 0.15, r * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'archer': {
      // 星輝射手 — Radiant Mechanical Crystal Archer (compact gilded walker + drawn glowing crescent energy bow & arrow!)
      // Subtle mechanical triad legs
      ctx.strokeStyle = p.steelMid;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.4);
      ctx.lineTo(-r * 0.65 + stride * 2, -r * 0.85);
      ctx.moveTo(-r * 0.2, r * 0.4);
      ctx.lineTo(-r * 0.65 - stride * 2, r * 0.85);
      ctx.stroke();

      // Sleek gilded mechanical body
      ctx.fillStyle = p.body;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(r * 0.45, 0);
      ctx.lineTo(-r * 0.2, -r * 0.72);
      ctx.lineTo(-r * 0.88, -r * 0.42);
      ctx.lineTo(-r * 0.72, 0);
      ctx.lineTo(-r * 0.88, r * 0.42);
      ctx.lineTo(-r * 0.2, r * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Unmistakable drawn RADIANT ENERGY BOW in front!
      ctx.strokeStyle = p.light;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(r * 0.1, 0, r * 0.92, -1.12, 1.12);
      ctx.stroke();

      // Bowstring
      ctx.strokeStyle = p.glow;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(r * 0.1 + Math.cos(-1.12) * r * 0.92, Math.sin(-1.12) * r * 0.92);
      ctx.lineTo(r * 0.05, 0);
      ctx.lineTo(r * 0.1 + Math.cos(1.12) * r * 0.92, Math.sin(1.12) * r * 0.92);
      ctx.stroke();

      // Glowing starlight arrow nocked & pointing forward
      ctx.strokeStyle = '#FEF9C3';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(r * 0.05, 0);
      ctx.lineTo(r * 1.38, 0);
      ctx.stroke();
      ctx.fillStyle = p.glow;
      ctx.beginPath();
      ctx.moveTo(r * 1.48, 0);
      ctx.lineTo(r * 1.15, -2.6);
      ctx.lineTo(r * 1.15, 2.6);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'stalker': {
      // 幽影刺客 — Hooded Shadow Psionic Assassin (trailing shadow scarf, cowl, twin violet shadow daggers)
      const wisp = Math.sin(elapsed * 11 + u.id) * 2.2;
      // Trailing translucent shadow cloak wisps
      ctx.fillStyle = 'rgba(139, 92, 246, 0.55)';
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, -r * 0.55);
      ctx.lineTo(-r * 1.45, -r * 0.52 + wisp);
      ctx.lineTo(-r * 1.1, 0 - wisp * 0.4);
      ctx.lineTo(-r * 1.45, r * 0.52 + wisp);
      ctx.lineTo(-r * 0.1, r * 0.55);
      ctx.closePath();
      ctx.fill();

      // Twin violet curved shadow daggers
      ctx.strokeStyle = '#C084FC';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.58);
      ctx.lineTo(r * 1.35, -r * 0.35);
      ctx.moveTo(0, r * 0.58);
      ctx.lineTo(r * 1.35, r * 0.35);
      ctx.stroke();

      // Sleek hooded cowl silhouette
      ctx.fillStyle = p.isEnemy ? '#991B1B' : '#312E81';
      ctx.strokeStyle = '#C084FC';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(r * 0.72, 0);
      ctx.lineTo(-r * 0.18, -r * 0.72);
      ctx.lineTo(-r * 0.85, -r * 0.38);
      ctx.lineTo(-r * 0.58, 0);
      ctx.lineTo(-r * 0.85, r * 0.38);
      ctx.lineTo(-r * 0.18, r * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing assassin eyes
      ctx.fillStyle = '#E879F9';
      ctx.beginPath();
      ctx.arc(r * 0.28, -2.2, 1.5, 0, Math.PI * 2);
      ctx.arc(r * 0.28, 2.2, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'templar': {
      // 聖殿執行官 — Levitating Psionic High Templar (ethereal tail, ornate collar, orbiting lightning orbs!)
      // Floating ethereal energy tail
      const sway = Math.sin(elapsed * 7 + u.id) * 2.4;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.38)';
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, -r * 0.45);
      ctx.quadraticCurveTo(-r * 0.85, sway, -r * 1.45, sway * 0.6);
      ctx.quadraticCurveTo(-r * 0.85, r * 0.45 + sway * 0.4, -r * 0.1, r * 0.45);
      ctx.closePath();
      ctx.fill();

      // Ornate ceremonial horned collar/mantle
      ctx.fillStyle = p.body;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(r * 0.55, 0);
      ctx.lineTo(r * 0.1, -r * 0.95);
      ctx.lineTo(-r * 0.85, -r * 0.65);
      ctx.lineTo(-r * 0.45, 0);
      ctx.lineTo(-r * 0.85, r * 0.65);
      ctx.lineTo(r * 0.1, r * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Crowned psionic head
      ctx.fillStyle = p.light;
      ctx.beginPath();
      ctx.arc(r * 0.12, 0, r * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Twin orbiting crackling psionic lightning orbs!
      for (const side of [-1, 1]) {
        const orbX = r * 0.68 + Math.cos(elapsed * 6 + side) * 1.8;
        const orbY = side * (r * 0.72 + Math.sin(elapsed * 6) * 1.5);
        ctx.fillStyle = p.glow;
        ctx.beginPath();
        ctx.arc(orbX, orbY, 3.0 + pulse * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(orbX, orbY, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'paladin': {
      // 輝光重裝騎士 — Armored Golden Knight-Walker (walker legs, broad gilded torso, kite shield, radiant lance!)
      // Mechanical knight walker feet
      ctx.fillStyle = p.steelDark;
      ctx.fillRect(-r * 0.4 + stride * 3.0, -r * 0.82, 6, 4);
      ctx.fillRect(-r * 0.4 - stride * 3.0, r * 0.82 - 4, 6, 4);

      // Radiant energy lance extending far ahead on right side
      ctx.fillStyle = p.steelLight;
      ctx.fillRect(r * 0.1, r * 0.52, r * 1.38, 2.8);
      ctx.fillStyle = p.glow;
      ctx.beginPath();
      ctx.moveTo(r * 1.72, r * 0.66);
      ctx.lineTo(r * 1.25, r * 0.42);
      ctx.lineTo(r * 1.25, r * 0.9);
      ctx.closePath();
      ctx.fill();

      // Broad armored knight hull
      ctx.fillStyle = p.body;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(r * 0.6, -r * 0.55);
      ctx.lineTo(r * 0.6, r * 0.55);
      ctx.lineTo(-r * 0.15, r * 0.95);
      ctx.lineTo(-r * 0.92, r * 0.65);
      ctx.lineTo(-r * 0.92, -r * 0.65);
      ctx.lineTo(-r * 0.15, -r * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Iconic pointed golden KITE SHIELD on front-left!
      ctx.fillStyle = p.light;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(r * 1.15, -r * 0.18);
      ctx.lineTo(r * 0.52, -r * 0.95);
      ctx.lineTo(r * 0.18, -r * 0.65);
      ctx.lineTo(r * 0.45, r * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Knight helm & golden crest
      ctx.fillStyle = p.dark;
      ctx.beginPath();
      ctx.arc(-r * 0.05, 0, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.glow;
      ctx.fillRect(r * 0.08, -2.2, 3.2, 4.4);
      break;
    }

    case 'colossus': {
      // 聖陽巨像 — Towering Four-Legged Mechanical Solar Strider (4 articulated spider legs + blazing solar crystal core!)
      // Four long articulated golden mechanical spider legs!
      ctx.strokeStyle = p.steelLight;
      ctx.lineWidth = 2.6;
      const legAngles = [-2.25, -0.9, 0.9, 2.25];
      for (let i = 0; i < 4; i++) {
        const ang = legAngles[i];
        const step = (i % 2 === 0 ? stride : -stride) * 3.0;
        const kneeR = r * 0.98;
        const footR = r * 1.48;
        const kx = Math.cos(ang) * kneeR + step * 0.4;
        const ky = Math.sin(ang) * kneeR;
        const fx = Math.cos(ang) * footR + step;
        const fy = Math.sin(ang) * footR;

        // Dark leg outline then golden highlight
        ctx.strokeStyle = p.outline;
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(kx, ky);
        ctx.lineTo(fx, fy);
        ctx.stroke();

        ctx.strokeStyle = p.body;
        ctx.lineWidth = 2.1;
        ctx.stroke();

        // Joint dot
        ctx.fillStyle = p.light;
        ctx.beginPath();
        ctx.arc(kx, ky, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Elevated crescent armored dome head
      ctx.fillStyle = p.body;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(r * 0.95, 0);
      ctx.lineTo(r * 0.25, -r * 0.85);
      ctx.lineTo(-r * 0.78, -r * 0.55);
      ctx.lineTo(-r * 0.92, 0);
      ctx.lineTo(-r * 0.78, r * 0.55);
      ctx.lineTo(r * 0.25, r * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Twin forward thermal-lance emitter prongs
      ctx.fillStyle = p.light;
      ctx.fillRect(r * 0.45, -r * 0.44, r * 0.65, 2.8);
      ctx.fillRect(r * 0.45, r * 0.44 - 2.8, r * 0.65, 2.8);

      // Blazing golden SOLAR CRYSTAL CORE in center!
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(r * 0.05, 0, r * 0.42 + pulse * 1.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(r * 0.05, 0, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'interceptor': {
      // 聖殿追獵艇 — Sleek Gilded Crescent Starfighter (twin curved forward prongs + plasma engine glow)
      drawJetFlame(ctx, -r * 0.85, 0, r * 0.95 * jetFlicker, 5.2, '#38BDF8', '#FFFFFF');

      // Classic twin-pronged crescent sci-fi starfighter hull
      ctx.fillStyle = p.body;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(r * 1.42, -r * 0.34); // Upper forward prong tip
      ctx.lineTo(r * 0.25, -r * 1.08);
      ctx.lineTo(-r * 0.92, -r * 0.48);
      ctx.lineTo(-r * 0.78, 0);
      ctx.lineTo(-r * 0.92, r * 0.48);
      ctx.lineTo(r * 0.25, r * 1.08);
      ctx.lineTo(r * 1.42, r * 0.34); // Lower forward prong tip
      ctx.lineTo(r * 0.55, r * 0.16);
      ctx.lineTo(r * 0.32, 0);
      ctx.lineTo(r * 0.55, -r * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Golden wing trim
      ctx.strokeStyle = p.light;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.38);
      ctx.lineTo(r * 0.95, -r * 0.3);
      ctx.moveTo(-r * 0.5, r * 0.38);
      ctx.lineTo(r * 0.95, r * 0.3);
      ctx.stroke();

      // Central glowing cyan plasma core
      ctx.fillStyle = p.glow;
      ctx.beginPath();
      ctx.arc(-r * 0.05, 0, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'observer': {
      // 星瞳偵察艦 — Floating Celestial Eye Prism Ship (detached wing vanes + glowing all-seeing star eye!)
      drawJetFlame(ctx, -r * 0.95, 0, r * 0.55 * jetFlicker, 3.4, '#38BDF8', '#E0F2FE');

      // Detached floating prism wing-vanes
      ctx.fillStyle = p.light;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(r * 0.2, -r * 0.85);
      ctx.lineTo(-r * 0.7, -r * 1.18);
      ctx.lineTo(-r * 0.45, -r * 0.65);
      ctx.closePath();
      ctx.moveTo(r * 0.2, r * 0.85);
      ctx.lineTo(-r * 0.7, r * 1.18);
      ctx.lineTo(-r * 0.45, r * 0.65);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Sleek diamond eye hull
      ctx.fillStyle = p.body;
      ctx.beginPath();
      ctx.moveTo(r * 1.32, 0);
      ctx.lineTo(0, -r * 0.68);
      ctx.lineTo(-r * 1.02, 0);
      ctx.lineTo(0, r * 0.68);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Luminous scanning Star-Eye lens
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(r * 0.15, 0, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.glow;
      ctx.beginPath();
      ctx.arc(r * 0.22, 0, r * 0.28 + pulse * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(r * 0.28, -1, 1.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'carrier': {
      // 聖輝審判艦 — Majestic Golden Mothership Carrier (cathedral hull, armored ribs, orbiting mini-interceptors!)
      // Triple warp-engine glow trails
      drawJetFlame(ctx, -r * 1.15, 0, r * 1.0 * jetFlicker, 6.0, '#38BDF8', '#FFFFFF');
      drawJetFlame(ctx, -r * 1.02, -r * 0.42, r * 0.68 * jetFlicker, 3.6, '#38BDF8', '#E0F2FE');
      drawJetFlame(ctx, -r * 1.02, r * 0.42, r * 0.68 * jetFlicker, 3.6, '#38BDF8', '#E0F2FE');

      // Elongated cathedral-prow capital hull
      ctx.fillStyle = p.body;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(r * 1.42, 0);
      ctx.quadraticCurveTo(r * 0.72, -r * 0.92, -r * 0.22, -r * 0.95);
      ctx.lineTo(-r * 1.12, -r * 0.58);
      ctx.lineTo(-r * 1.22, 0);
      ctx.lineTo(-r * 1.12, r * 0.58);
      ctx.lineTo(-r * 0.22, r * 0.95);
      ctx.quadraticCurveTo(r * 0.72, r * 0.92, r * 1.42, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Golden armor ribs & recessed glowing hangar bays
      ctx.fillStyle = p.dark;
      ctx.fillRect(-r * 0.78, -r * 0.52, r * 1.55, r * 1.04);
      ctx.strokeStyle = p.light;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, 0);
      ctx.lineTo(r * 1.18, 0);
      for (const rx of [-r * 0.45, 0, r * 0.45]) {
        ctx.moveTo(rx, -r * 0.62);
        ctx.lineTo(rx, r * 0.62);
      }
      ctx.stroke();

      // Glowing cyan hangar bay strips
      ctx.fillStyle = p.glow;
      ctx.fillRect(-r * 0.42, -r * 0.26, r * 0.84, 2.6);
      ctx.fillRect(-r * 0.42, r * 0.26 - 2.6, r * 0.84, 2.6);

      // Two tiny orbiting mini-interceptor drones circling the flagship!
      for (let k = 0; k < 2; k++) {
        const oa = elapsed * 2.8 + k * Math.PI;
        const ox = Math.cos(oa) * (r * 1.25);
        const oy = Math.sin(oa) * (r * 1.15);
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.moveTo(ox + 3.2, oy);
        ctx.lineTo(ox - 2.2, oy - 1.8);
        ctx.lineTo(ox - 2.2, oy + 1.8);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    // =========================================================================
    // FACTION 3: 蝕骨蟲巢 (BLIGHT SWARM — PURE ORGANIC INSECTS & BIO-DRAGONS)
    // =========================================================================
    case 'swarmling': {
      // 疾爪蟲群 — Fast Skittering Six-Legged Razor-Clawed Zergling
      // Rapidly scuttling insect legs
      drawInsectLegs(ctx, 3, r * 0.48, r * 0.45, r * 0.52, stridePhase * 1.35, p.dark, 1.5);

      // Whip tail wagging behind
      const tailWag = Math.sin(elapsed * 16 + u.id) * 2.6;
      ctx.strokeStyle = p.dark;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-r * 0.72, 0);
      ctx.quadraticCurveTo(-r * 1.15, tailWag, -r * 1.48, -tailWag * 0.7);
      ctx.stroke();

      // Twin sharp forward scythe-claws!
      ctx.strokeStyle = p.light;
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(r * 0.35, -r * 0.38);
      ctx.quadraticCurveTo(r * 1.15, -r * 0.82, r * 1.45, -r * 0.15);
      ctx.moveTo(r * 0.35, r * 0.38);
      ctx.quadraticCurveTo(r * 1.15, r * 0.82, r * 1.45, r * 0.15);
      ctx.stroke();

      // Segmented chitinous oval thorax & head
      ctx.fillStyle = p.body;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(-r * 0.1, 0, r * 0.85, r * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Carapace spine ridge
      ctx.strokeStyle = p.dark;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-r * 0.65, 0);
      ctx.lineTo(r * 0.42, 0);
      ctx.stroke();

      // Predatory glowing eyes
      ctx.fillStyle = p.glow;
      ctx.beginPath();
      ctx.arc(r * 0.52, -2.0, 1.4, 0, Math.PI * 2);
      ctx.arc(r * 0.52, 2.0, 1.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'spitter': {
      // 酸液噴吐蟲 — Serpentine Cobra-Hooded Acid Spitter (Hydralisk-style sinuous tail + flared hood + glowing acid jaws!)
      const slither = Math.sin(elapsed * 10 + u.id) * 3.0;
      // Undulating serpentine tail
      ctx.strokeStyle = p.dark;
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, 0);
      ctx.quadraticCurveTo(-r * 0.95, slither, -r * 1.52, -slither * 0.6);
      ctx.stroke();
      ctx.strokeStyle = p.body;
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // Flared armored cobra hood / dorsal frill
      ctx.fillStyle = p.body;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(r * 0.88, 0);
      ctx.quadraticCurveTo(r * 0.45, -r * 1.05, -r * 0.48, -r * 0.82);
      ctx.lineTo(-r * 0.72, 0);
      ctx.lineTo(-r * 0.48, r * 0.82);
      ctx.quadraticCurveTo(r * 0.45, r * 1.05, r * 0.88, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Chitin hood ribs
      ctx.strokeStyle = p.dark;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(r * 0.1, -r * 0.7);
      ctx.lineTo(-r * 0.35, 0);
      ctx.lineTo(r * 0.1, r * 0.7);
      ctx.stroke();

      // Open mandibles holding a glowing neon lime-green ACID SAC!
      ctx.fillStyle = '#BEF264';
      ctx.beginPath();
      ctx.arc(r * 0.68, 0, r * 0.34 + pulse * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = p.light;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(r * 0.55, -r * 0.35);
      ctx.lineTo(r * 1.18, -r * 0.18);
      ctx.moveTo(r * 0.55, r * 0.35);
      ctx.lineTo(r * 1.18, r * 0.18);
      ctx.stroke();
      break;
    }

    case 'volatile': {
      // 自爆毒囊蟲 — Swollen Violently Pulsing Acid-Sac Baneling!
      const swell = 1 + 0.14 * Math.sin(elapsed * 13 + u.id);
      drawInsectLegs(ctx, 2, r * 0.42, r * 0.58, r * 0.42, stridePhase * 1.5, p.dark, 1.5);

      // Small armored insect head in front
      ctx.fillStyle = p.dark;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(r * 0.55, 0, r * 0.42, r * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Huge swollen glowing NEON TOXIC ABDOMEN SAC
      ctx.fillStyle = '#84CC16';
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(-r * 0.12, 0, r * 0.88 * swell, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Translucent neon inner blister & veins
      ctx.fillStyle = '#D9F99D';
      ctx.beginPath();
      ctx.arc(-r * 0.22, -r * 0.15, r * 0.44 * swell, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ECFCCB';
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.22, r * 0.18 * swell, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'lurker': {
      // 穿甲刺蛇 — Spiny Armored Venomous Viper-Crab (bristling dorsal bone spines + piercing twin fangs)
      drawInsectLegs(ctx, 3, r * 0.55, r * 0.58, r * 0.48, stridePhase, p.dark, 1.7);

      // Protruding jagged bone spikes around carapace!
      ctx.fillStyle = p.light;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.3;
      const spikeAngles = [-2.4, -1.7, -1.0, 1.0, 1.7, 2.4];
      for (const a of spikeAngles) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.18) * r * 0.65, Math.sin(a - 0.18) * r * 0.65);
        ctx.lineTo(Math.cos(a) * r * 1.32, Math.sin(a) * r * 1.32);
        ctx.lineTo(Math.cos(a + 0.18) * r * 0.65, Math.sin(a + 0.18) * r * 0.65);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Ribbed armored carapace
      ctx.fillStyle = p.body;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.92, r * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Twin piercing needle-fangs forward
      ctx.fillStyle = '#BEF264';
      ctx.beginPath();
      ctx.moveTo(r * 0.55, -3.2);
      ctx.lineTo(r * 1.48, -1.6);
      ctx.lineTo(r * 0.55, -0.4);
      ctx.moveTo(r * 0.55, 3.2);
      ctx.lineTo(r * 1.48, 1.6);
      ctx.lineTo(r * 0.55, 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'crusher': {
      // 甲殼衝鋒獸 — Massive Horned Rhinoceros Beetle / Ultralisk Juggernaut (layered carapace + giant curved ramming tusks!)
      drawInsectLegs(ctx, 3, r * 0.58, r * 0.72, r * 0.52, stridePhase * 0.85, p.dark, 2.4);

      // Colossal twin curved bone ramming tusks / Kaiser blades!
      ctx.fillStyle = p.light;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.6;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(r * 0.35, side * r * 0.42);
        ctx.quadraticCurveTo(r * 1.25, side * r * 0.92, r * 1.58, side * r * 0.22);
        ctx.quadraticCurveTo(r * 1.05, side * r * 0.52, r * 0.45, side * r * 0.16);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Layered armored beetle carapace plates
      ctx.fillStyle = p.body;
      ctx.beginPath();
      ctx.ellipse(-r * 0.08, 0, r * 1.02, r * 0.86, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Overlapping dorsal armor ridges
      ctx.strokeStyle = p.dark;
      ctx.lineWidth = 2.2;
      for (const rx of [-r * 0.48, -r * 0.05, r * 0.35]) {
        ctx.beginPath();
        ctx.arc(rx, 0, r * 0.65, -0.95, 0.95);
        ctx.stroke();
      }

      // Armored horned head crest & glowing eyes
      ctx.fillStyle = p.dark;
      ctx.beginPath();
      ctx.arc(r * 0.52, 0, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.glow;
      ctx.beginPath();
      ctx.arc(r * 0.66, -3.2, 1.8, 0, Math.PI * 2);
      ctx.arc(r * 0.66, 3.2, 1.8, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'mutalisk': {
      // 尖嘯飛龍 — Organic Bat-Winged Flying Wyvern (actively flapping veined wings + undulating whip tail!)
      const flap = wingFlap * (r * 0.32);
      const tailWave = Math.sin(elapsed * 12 + u.id) * 3.5;

      // Long undulating organic dragon whip tail
      ctx.strokeStyle = p.dark;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, 0);
      ctx.quadraticCurveTo(-r * 1.15, tailWave, -r * 1.75, -tailWave * 0.7);
      ctx.stroke();

      // Actively FLAPPING scalloped bat-dragon wings!
      ctx.fillStyle = p.body;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.5;
      for (const side of [-1, 1]) {
        const yTip = side * (r * 1.48 - Math.abs(flap) * 0.35) + side * flap;
        ctx.beginPath();
        ctx.moveTo(r * 0.48, side * r * 0.15);
        ctx.quadraticCurveTo(r * 0.25, yTip * 0.75, -r * 0.28, yTip);
        ctx.quadraticCurveTo(-r * 0.58, yTip * 0.62, -r * 0.88, side * r * 0.72 + side * flap * 0.5);
        ctx.quadraticCurveTo(-r * 0.52, side * r * 0.35, -r * 0.55, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Wing bone ribs
        ctx.strokeStyle = p.light;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(r * 0.15, side * r * 0.15);
        ctx.lineTo(-r * 0.26, yTip * 0.92);
        ctx.stroke();
        ctx.strokeStyle = p.outline;
        ctx.lineWidth = 1.5;
      }

      // Horned dragon head & elongated snout
      ctx.fillStyle = p.dark;
      ctx.beginPath();
      ctx.ellipse(r * 0.45, 0, r * 0.62, r * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = p.glow;
      ctx.beginPath();
      ctx.arc(r * 0.68, -2.0, 1.6, 0, Math.PI * 2);
      ctx.arc(r * 0.68, 2.0, 1.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'overseer': {
      // 靈眼監視蟲 — Floating Organic Bio-Balloon Jellyfish (pulsing sac, trailing tentacles, huge glowing sensor eye!)
      const bob = Math.sin(elapsed * 7 + u.id) * 2.2;
      // Waving organic trailing tentacles
      ctx.strokeStyle = p.light;
      ctx.lineWidth = 1.7;
      for (let i = -1; i <= 1; i++) {
        const ty = i * r * 0.38;
        ctx.beginPath();
        ctx.moveTo(-r * 0.65, ty);
        ctx.quadraticCurveTo(-r * 1.22, ty + bob * (i === 0 ? -1 : 1), -r * 1.62, ty - bob * 0.6);
        ctx.stroke();
      }

      // Pulsing organic bulbous gas-sac body
      const sacScale = 1 + 0.06 * Math.sin(elapsed * 5 + u.id);
      ctx.fillStyle = p.body;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.02 * sacScale, r * 0.88 * sacScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Organic dorsal blisters
      ctx.fillStyle = p.dark;
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.35, r * 0.26, 0, Math.PI * 2);
      ctx.arc(-r * 0.35, r * 0.35, r * 0.26, 0, Math.PI * 2);
      ctx.fill();

      // Giant bright cyan-yellow ALL-SEEING COMPOUND EYE!
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(r * 0.32, 0, r * 0.44, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(r * 0.38, 0, r * 0.33, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(r * 0.46, 0, r * 0.14 + pulse * 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'broodlord': {
      // 腐蝕飛龍王 — Wide Manta-Ray Sky-Wyvern Brood Mother (sweeping ribbed manta wings + glowing brood pods!)
      const slowFlap = Math.sin(elapsed * 6.5 + u.id) * (r * 0.22);
      // Trailing bio-tendrils
      ctx.strokeStyle = p.dark;
      ctx.lineWidth = 2.0;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.72, side * r * 0.32);
        ctx.quadraticCurveTo(-r * 1.25, side * r * 0.45 + slowFlap * 0.6, -r * 1.65, side * r * 0.2);
        ctx.stroke();
      }

      // Broad sweeping organic MANTA-RAY wings
      ctx.fillStyle = p.body;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(r * 1.25, 0);
      ctx.quadraticCurveTo(r * 0.65, -r * 0.95, 0, -r * 1.42 + slowFlap);
      ctx.quadraticCurveTo(-r * 0.68, -r * 1.05 + slowFlap * 0.6, -r * 1.15, -r * 0.55);
      ctx.lineTo(-r * 0.75, 0);
      ctx.lineTo(-r * 1.15, r * 0.55);
      ctx.quadraticCurveTo(-r * 0.68, r * 1.05 - slowFlap * 0.6, 0, r * 1.42 - slowFlap);
      ctx.quadraticCurveTo(r * 0.65, r * 0.95, r * 1.25, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Armored dorsal spine crest
      ctx.fillStyle = p.dark;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.85, r * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glowing lime-green brood-spawn sacs along mantle
      ctx.fillStyle = '#BEF264';
      ctx.beginPath();
      ctx.arc(-r * 0.15, -r * 0.46, 2.8 + pulse * 0.6, 0, Math.PI * 2);
      ctx.arc(-r * 0.15, r * 0.46, 2.8 + pulse * 0.6, 0, Math.PI * 2);
      ctx.arc(r * 0.42, 0, 3.2 + pulse * 0.7, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'leviathan': {
      // 利維坦巨獸 — Colossal Bio-Sky-Whale Dreadnought (massive armored organic hull, flapping side fins, giant pincer jaws, bio-vents!)
      const finWave = Math.sin(elapsed * 5.2 + u.id) * 3.5;

      // Writhing rear bio-tendrils
      ctx.strokeStyle = p.dark;
      ctx.lineWidth = 2.6;
      for (const side of [-1, 0, 1]) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.92, side * r * 0.35);
        ctx.quadraticCurveTo(-r * 1.38, side * r * 0.45 + finWave * (side === 0 ? 1 : 0.6), -r * 1.78, side * r * 0.25);
        ctx.stroke();
      }

      // Undulating organic sky-whale pectoral fins
      ctx.fillStyle = p.dark;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.6;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(r * 0.32, side * r * 0.55);
        ctx.quadraticCurveTo(-r * 0.08, side * (r * 1.48) + side * finWave, -r * 0.78, side * r * 0.95 + side * finWave * 0.5);
        ctx.lineTo(-r * 0.55, side * r * 0.52);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Colossal forward pincer tusks!
      ctx.fillStyle = p.light;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(r * 0.58, side * r * 0.48);
        ctx.quadraticCurveTo(r * 1.38, side * r * 0.72, r * 1.68, side * r * 0.22);
        ctx.quadraticCurveTo(r * 1.12, side * r * 0.38, r * 0.68, side * r * 0.18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Massive armored segmented organic dreadnought body
      ctx.fillStyle = p.body;
      ctx.beginPath();
      ctx.moveTo(r * 1.18, 0);
      ctx.quadraticCurveTo(r * 0.62, -r * 0.88, -r * 0.38, -r * 0.84);
      ctx.lineTo(-r * 1.08, -r * 0.52);
      ctx.lineTo(-r * 1.18, 0);
      ctx.lineTo(-r * 1.08, r * 0.52);
      ctx.lineTo(-r * 0.38, r * 0.84);
      ctx.quadraticCurveTo(r * 0.62, r * 0.88, r * 1.18, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Bio-luminescent pulsating spine vents
      ctx.fillStyle = '#BEF264';
      for (const vx of [-r * 0.52, -r * 0.08, r * 0.36]) {
        ctx.beginPath();
        ctx.ellipse(vx, 0, 2.8, 4.2 + pulse * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    default: {
      // 野區魔獸 / 迷霧巨像 / 首領 (Jungle Beast / Fog Golem / Boss Colossus)
      // Articulated beast claws / heavy arms
      ctx.fillStyle = p.dark;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.6;
      for (const side of [-1, 1]) {
        const armSwing = stride * 2.5 * side;
        ctx.beginPath();
        ctx.ellipse(r * 0.35 + armSwing, side * r * 0.78, r * 0.45, r * 0.26, side * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Rugged crystalline/stone beast torso
      ctx.fillStyle = p.body;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const rad = i % 2 === 0 ? r * 1.02 : r * 0.78;
        if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Forward beast horns
      ctx.fillStyle = p.light;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(r * 0.42, side * r * 0.35);
        ctx.lineTo(r * (u.isBoss ? 1.48 : 1.18), side * r * 0.55);
        ctx.lineTo(r * 0.65, side * r * 0.12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Glowing beast eyes / boss void core
      ctx.fillStyle = p.glow;
      ctx.beginPath();
      ctx.arc(r * 0.48, -r * 0.22, u.isBoss ? 2.8 : 2.0, 0, Math.PI * 2);
      ctx.arc(r * 0.48, r * 0.22, u.isBoss ? 2.8 : 2.0, 0, Math.PI * 2);
      ctx.fill();

      if (u.isBoss) {
        ctx.fillStyle = '#F5D0FE';
        ctx.beginPath();
        ctx.arc(-r * 0.08, 0, r * 0.34 + pulse * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }

  ctx.restore();
}
