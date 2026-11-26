import { FP_SCALE } from './combatMath';
import {
  ARMORY_BUILDING_DEFS,
  BARRACKS_DEFS,
  ENEMY_NEXUS_POS,
  FACTIONS,
  GAS_EXTRACTOR_COST,
  GAS_EXTRACTOR_UPGRADE_COSTS,
  getBarracksNextUpgrade,
  getTowerUpgradeCostAndTime,
  HAWKEYE_HEAL_RADIUS,
  IRON_K_BOOST_RADIUS,
  JUNGLE_CENTERS,
  LANE_SHORT_NAMES,
  LANE_WAYPOINTS,
  NEXUS_REPAIR_COST,
  PLAYER_NEXUS_POS,
  SQUAD_SELECT_RADIUS,
  SUPPLY_DEPOT_COST,
  TOWER_DEFS,
  TOWER_TECH_CD_RATE_BY_LV,
  TOWER_TECH_LV2_BONUS_DMG,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './data';
import { BattleEngine } from './engine';
import { drawDetailedUnitArt, getUnitArtPalette } from './unitArt';
import {
  ArmoryBuilding,
  BarracksBuilding,
  GasExtractor,
  LaneId,
  MapMode,
  NeutralObjective,
  SupplyDepot,
  TowerPad,
  UnitEntity,
} from './types';

export class BattleRenderer {
  private terrainCanvas: HTMLCanvasElement;
  private exploredCanvas: HTMLCanvasElement;
  private fogCanvas: HTMLCanvasElement;
  private lastMapVersion = -1;
  private bakedMapMode: MapMode = 'standard';
  private cameraZoom = 1;
  private cameraCenterX = WORLD_WIDTH * 0.5;
  private cameraCenterY = WORLD_HEIGHT * 0.5;

  constructor() {
    this.terrainCanvas = document.createElement('canvas');
    this.terrainCanvas.width = WORLD_WIDTH;
    this.terrainCanvas.height = WORLD_HEIGHT;

    this.exploredCanvas = document.createElement('canvas');
    this.exploredCanvas.width = WORLD_WIDTH;
    this.exploredCanvas.height = WORLD_HEIGHT;

    this.fogCanvas = document.createElement('canvas');
    this.fogCanvas.width = WORLD_WIDTH;
    this.fogCanvas.height = WORLD_HEIGHT;

    this.bakeTerrain();
    this.resetExplored();
  }

  private resetExplored() {
    const ctx = this.exploredCanvas.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#05080D';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  private bakeTerrain(mapMode: MapMode = 'standard') {
    this.bakedMapMode = mapMode;
    const ctx = this.terrainCanvas.getContext('2d');
    if (!ctx) return;

    const isSimple = mapMode === 'simple';

    // 1. Deep tactical slate-earth base
    const bgGrad = ctx.createLinearGradient(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    bgGrad.addColorStop(0, '#0E141C');
    bgGrad.addColorStop(0.5, '#121922');
    bgGrad.addColorStop(1, '#0E131B');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // 2. Cartographic coordinate grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= WORLD_WIDTH; x += 72) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += 72) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_WIDTH, y);
      ctx.stroke();
    }

    // 3. Wild Jungle Basin(s) nestled between lanes
    if (isSimple) {
      const cx = JUNGLE_CENTERS.center.x;
      const cy = JUNGLE_CENTERS.center.y;
      ctx.save();
      const grad = ctx.createRadialGradient(cx, cy, 36, cx, cy, 390);
      grad.addColorStop(0, 'rgba(20, 83, 74, 0.28)');
      grad.addColorStop(0.58, 'rgba(15, 36, 42, 0.22)');
      grad.addColorStop(1, 'rgba(14, 20, 28, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 410, 225, 0, 0, Math.PI * 2);
      ctx.fill();

      // Clear dashed ambush cross-paths connecting Top <-> Central Jungle <-> Bottom
      ctx.setLineDash([6, 9]);
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.22)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(cx - 265, 118);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + 265, 722);
      ctx.moveTo(cx - 265, 722);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + 265, 118);
      ctx.moveTo(cx, 122);
      ctx.lineTo(cx, 718);
      ctx.stroke();
      ctx.setLineDash([]);

      // Contoured central jungle perimeter ridges
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.14)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 310, 175, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.09)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 220, 118, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      const drawJungleBasin = (cx: number, cy: number) => {
        ctx.save();
        const grad = ctx.createRadialGradient(cx, cy, 24, cx, cy, 290);
        grad.addColorStop(0, 'rgba(20, 83, 74, 0.24)');
        grad.addColorStop(0.6, 'rgba(15, 36, 42, 0.2)');
        grad.addColorStop(1, 'rgba(14, 20, 28, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 320, 118, 0, 0, Math.PI * 2);
        ctx.fill();

        // Subtle dashed ambush cross-paths connecting adjacent lanes through the jungle
        ctx.setLineDash([5, 9]);
        ctx.strokeStyle = 'rgba(45, 212, 191, 0.16)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 210, cy - 110);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + 210, cy + 110);
        ctx.moveTo(cx - 210, cy + 110);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + 210, cy - 110);
        ctx.stroke();
        ctx.setLineDash([]);

        // Contoured jungle perimeter ridge
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 250, 92, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      };
      drawJungleBasin(JUNGLE_CENTERS.upper.x, JUNGLE_CENTERS.upper.y);
      drawJungleBasin(JUNGLE_CENTERS.lower.x, JUNGLE_CENTERS.lower.y);
    }

    // 4. Center meridian dividing line
    ctx.save();
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(WORLD_WIDTH / 2, 18);
    ctx.lineTo(WORLD_WIDTH / 2, WORLD_HEIGHT - 18);
    ctx.stroke();
    ctx.restore();

    // 5. Widely separated stone causeways (Top & Bot only in Simple Mode; all 3 lanes in Standard Mode)
    const activeLanes: LaneId[] = isSimple ? [0, 2] : [0, 1, 2];
    for (const lane of activeLanes) {
      const pts = LANE_WAYPOINTS[lane];
      const traceLane = () => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      };

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      traceLane();
      ctx.strokeStyle = '#080C11';
      ctx.lineWidth = 84;
      ctx.stroke();

      traceLane();
      ctx.strokeStyle = '#1D2632';
      ctx.lineWidth = 72;
      ctx.stroke();

      traceLane();
      ctx.strokeStyle = '#242F3E';
      ctx.lineWidth = 58;
      ctx.stroke();

      traceLane();
      ctx.setLineDash([12, 16]);
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.12)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // 6. Fortress base courtyards
    const drawCourtyard = (x: number, y: number, tint: string) => {
      ctx.save();
      const g = ctx.createRadialGradient(x, y, 16, x, y, 125);
      g.addColorStop(0, tint);
      g.addColorStop(0.65, '#1B2430');
      g.addColorStop(1, 'rgba(14, 20, 28, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 125, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    drawCourtyard(PLAYER_NEXUS_POS.x, PLAYER_NEXUS_POS.y, 'rgba(59, 130, 246, 0.16)');
    drawCourtyard(ENEMY_NEXUS_POS.x, ENEMY_NEXUS_POS.y, 'rgba(245, 158, 11, 0.14)');
  }

  public getCameraZoom(): number {
    return this.cameraZoom;
  }

  public resetCamera(): void {
    this.cameraZoom = 1;
    this.cameraCenterX = WORLD_WIDTH * 0.5;
    this.cameraCenterY = WORLD_HEIGHT * 0.5;
  }

  private computeTransform(viewWidth: number, viewHeight: number): {
    scale: number;
    offsetX: number;
    offsetY: number;
  } {
    const safeW = Math.max(1, viewWidth);
    const safeH = Math.max(1, viewHeight);
    const baseScale = Math.min(safeW / WORLD_WIDTH, safeH / WORLD_HEIGHT);
    const scale = baseScale * this.cameraZoom;

    const visWorldW = safeW / scale;
    const visWorldH = safeH / scale;

    if (visWorldW >= WORLD_WIDTH) {
      this.cameraCenterX = WORLD_WIDTH * 0.5;
    } else {
      const halfW = visWorldW * 0.5;
      this.cameraCenterX = Math.max(halfW, Math.min(WORLD_WIDTH - halfW, this.cameraCenterX));
    }

    if (visWorldH >= WORLD_HEIGHT) {
      this.cameraCenterY = WORLD_HEIGHT * 0.5;
    } else {
      const halfH = visWorldH * 0.5;
      this.cameraCenterY = Math.max(halfH, Math.min(WORLD_HEIGHT - halfH, this.cameraCenterY));
    }

    const offsetX = safeW * 0.5 - this.cameraCenterX * scale;
    const offsetY = safeH * 0.5 - this.cameraCenterY * scale;
    return { scale, offsetX, offsetY };
  }

  public setCameraZoom(
    nextZoom: number,
    viewWidth: number,
    viewHeight: number,
    anchorOffsetX?: number,
    anchorOffsetY?: number
  ): number {
    const clampedZoom = Math.max(1, Math.min(2.5, nextZoom));
    if (clampedZoom <= 1.01) {
      this.resetCamera();
      return 1;
    }

    const prev = this.computeTransform(viewWidth, viewHeight);
    const ax = anchorOffsetX ?? viewWidth * 0.5;
    const ay = anchorOffsetY ?? viewHeight * 0.5;
    const worldAnchorX = (ax - prev.offsetX) / prev.scale;
    const worldAnchorY = (ay - prev.offsetY) / prev.scale;

    this.cameraZoom = clampedZoom;
    const baseScale = Math.min(Math.max(1, viewWidth) / WORLD_WIDTH, Math.max(1, viewHeight) / WORLD_HEIGHT);
    const newScale = baseScale * this.cameraZoom;
    this.cameraCenterX = worldAnchorX - (ax - viewWidth * 0.5) / newScale;
    this.cameraCenterY = worldAnchorY - (ay - viewHeight * 0.5) / newScale;
    this.computeTransform(viewWidth, viewHeight);
    return this.cameraZoom;
  }

  public focusCameraOnWorld(
    worldX: number,
    worldY: number,
    targetZoom: number,
    viewWidth: number,
    viewHeight: number
  ): number {
    this.cameraZoom = Math.max(1, Math.min(2.5, targetZoom));
    this.cameraCenterX = worldX;
    this.cameraCenterY = worldY;
    this.computeTransform(viewWidth, viewHeight);
    return this.cameraZoom;
  }

  public panByScreenDelta(dxCss: number, dyCss: number, viewWidth: number, viewHeight: number): void {
    if (this.cameraZoom <= 1.01) return;
    const { scale } = this.computeTransform(viewWidth, viewHeight);
    this.cameraCenterX -= dxCss / scale;
    this.cameraCenterY -= dyCss / scale;
    this.computeTransform(viewWidth, viewHeight);
  }

  public render(ctx: CanvasRenderingContext2D, engine: BattleEngine, canvasWidth: number, canvasHeight: number) {
    if (this.bakedMapMode !== engine.mapMode) {
      this.bakeTerrain(engine.mapMode);
    }
    if (this.lastMapVersion !== engine.mapVersion) {
      this.resetExplored();
      this.resetCamera();
      this.lastMapVersion = engine.mapVersion;
    }

    const { scale, offsetX, offsetY } = this.computeTransform(canvasWidth, canvasHeight);

    ctx.save();
    ctx.fillStyle = '#080B10';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    let shakeX = 0;
    let shakeY = 0;
    if (engine.shakeTime > 0) {
      const mag = engine.shakeMagnitude * (engine.shakeTime / 0.25);
      shakeX = (Math.random() - 0.5) * mag;
      shakeY = (Math.random() - 0.5) * mag;
    }

    ctx.translate(offsetX + shakeX * scale, offsetY + shakeY * scale);
    ctx.scale(scale, scale);

    ctx.beginPath();
    ctx.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    ctx.clip();

    // 1. Pre-baked terrain
    ctx.drawImage(this.terrainCanvas, 0, 0);

    const isObserver = engine.observerView !== 'none';
    const fullVision = engine.observerView === 'all' || engine.sandboxMode;
    const viewerTeam: 'player' | 'enemy' = engine.sandboxMode
      ? engine.sandboxActiveTeam
      : engine.observerView === 'enemy'
      ? 'enemy'
      : 'player';
    const viewVision = fullVision
      ? [{ x: WORLD_WIDTH * 0.5, y: WORLD_HEIGHT * 0.5, r: 2400, detector: true }]
      : engine.getVisionCircles(viewerTeam);

    // 2. Selected Lane highlight (players only)
    if (!isObserver) {
      this.drawSelectedLaneOverlay(ctx, engine);
    }

    // 3. Supply Depots, Base Barracks, Armory Prerequisite Buildings & Gas Extractors
    for (const dep of engine.depots) {
      this.drawSupplyDepot(ctx, engine, dep, viewVision, viewerTeam);
    }
    for (const bk of engine.barracks) {
      this.drawBarracks(ctx, engine, bk, viewVision, viewerTeam);
    }
    for (const arm of engine.armories) {
      this.drawArmoryBuilding(ctx, engine, arm, viewVision, viewerTeam);
    }
    for (const ext of engine.extractors) {
      this.drawGasExtractor(ctx, engine, ext, viewVision, viewerTeam);
    }

    // 4. Tower Pads & Sector Gold Veins (with construction progress bars!)
    for (const pad of engine.pads) {
      this.drawTowerPad(ctx, engine, pad, viewVision, viewerTeam);
    }

    // 5. Neutral Objectives (Jungle veins/beacons/camps + Lane barricades)
    for (const obj of engine.objectives) {
      this.drawObjective(ctx, engine, obj, viewVision, viewerTeam);
    }

    // 6. Active Jungle Rift Shrine visual
    if (engine.activeEvent?.kind === 'aether_rift') {
      const ev = engine.activeEvent;
      if (fullVision || engine.isPointVisibleTo(viewerTeam, ev.x, ev.y, viewVision)) {
        const pulse = 1 + 0.14 * Math.sin(engine.elapsed * 5);
        ctx.save();
        ctx.strokeStyle = '#2DD4BF';
        ctx.fillStyle = 'rgba(45, 212, 191, 0.22)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(ev.x, ev.y, 26 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // 7. Nexuses (with training/research progress bar & mineral reserve readout!)
    this.drawNexus(ctx, engine, 'player', viewVision, viewerTeam);
    this.drawNexus(ctx, engine, 'enemy', viewVision, viewerTeam);

    // 8. Units (strictly filtered by Fog of War — ground first, then air units flying above!)
    // Units firing from outside vision (non-cloaked) are collected to render over fog for HUMAN EYES ONLY!
    const visibleAir: UnitEntity[] = [];
    const fireRevealedOverFog: UnitEntity[] = [];
    for (const u of engine.units) {
      if (!fullVision) {
        const inUnitVision = engine.isUnitVisibleTo(viewerTeam, u, viewVision);
        if (!inUnitVision) {
          if (engine.isUnitVisibleToHumanEye(viewerTeam, u, viewVision)) {
            fireRevealedOverFog.push(u);
          }
          continue;
        }
      }
      if (u.domain === 'air') {
        visibleAir.push(u);
      } else {
        this.drawUnit(ctx, engine, u, false);
      }
    }
    for (const u of visibleAir) {
      this.drawUnit(ctx, engine, u, false);
    }

    // 9. Projectiles
    for (const p of engine.projectiles) {
      if (fullVision || p.team === viewerTeam || engine.isPointVisibleTo(viewerTeam, p.x, p.y, viewVision)) {
        this.drawProjectile(ctx, p);
      }
    }

    // 10. Artillery Strikes & Spore Pod Drops
    for (const s of engine.strikes) this.drawArtilleryReticle(ctx, s, engine.elapsed);
    for (const drop of engine.sporeDrops) this.drawSporeDrop(ctx, drop);

    // 11. Particles
    for (const pt of engine.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.alpha);
      if (pt.ring) {
        const progress = 1 - pt.life / pt.maxLife;
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = 2.6 * (1 - progress * 0.6);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * (0.25 + progress * 0.85), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 12. Tighter Fog of War Layer (skipped in Spectator God-View & Sandbox Mode)
    if (!fullVision) {
      this.renderFogOfWar(ctx, viewVision);
      // Draw non-cloaked attackers firing from fog so HUMAN EYES can spot them (while friendly AI still cannot target them!)
      for (const u of fireRevealedOverFog) {
        this.drawUnit(ctx, engine, u, true);
      }
    }

    // 13. Over-Fog Tactical Overlays (Sonar Event Ripple in Dark Jungle, Scans, Ghosts, Zone Labels, Reticle)
    this.drawJungleEventSonar(ctx, engine);
    this.drawScanPulses(ctx, engine);
    this.drawGhostIntel(ctx, engine);
    this.drawZoneLabels(ctx, engine);
    this.drawFloatingTexts(ctx, engine);
    this.drawTutorialBeacon(ctx, engine);
    this.drawTargetingReticle(ctx, engine);

    ctx.restore();
  }

  public clientToWorld(
    clientX: number,
    clientY: number,
    rect: DOMRect
  ): { x: number; y: number } | null {
    const { scale, offsetX, offsetY } = this.computeTransform(rect.width, rect.height);
    const wx = (clientX - rect.left - offsetX) / scale;
    const wy = (clientY - rect.top - offsetY) / scale;
    if (wx < 0 || wx > WORLD_WIDTH || wy < 0 || wy > WORLD_HEIGHT) return null;
    return { x: wx, y: wy };
  }

  private drawSelectedLaneOverlay(ctx: CanvasRenderingContext2D, engine: BattleEngine) {
    // Draw 4th-lane custom squad destination flag whenever squad is active
    if (engine.player.squadActive && engine.player.squadTarget) {
      const st = engine.player.squadTarget;
      const pulse = 1 + 0.1 * Math.sin(engine.elapsed * 4.5);
      ctx.save();
      ctx.strokeStyle = engine.squadSelected ? '#22D3EE' : 'rgba(34, 211, 238, 0.55)';
      ctx.fillStyle = engine.squadSelected ? 'rgba(34, 211, 238, 0.16)' : 'rgba(34, 211, 238, 0.08)';
      ctx.lineWidth = engine.squadSelected ? 2.4 : 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(st.x, st.y, 26 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = '700 10px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#090C11';
      ctx.fillText('編隊集結點', st.x + 1, st.y - 31);
      ctx.fillStyle = '#67E8F9';
      ctx.fillText('編隊集結點', st.x, st.y - 32);
      ctx.restore();
    }

    if (engine.squadSelected) return;

    const pts = LANE_WAYPOINTS[engine.selectedLane];
    const accent = FACTIONS[engine.player.faction].accentHex;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = `${accent}20`;
    ctx.lineWidth = 66;
    ctx.stroke();

    const stance = engine.player.laneStances[engine.selectedLane];
    ctx.strokeStyle =
      stance === 'all_in'
        ? '#FBBF24AA'
        : stance === 'defend_base'
        ? '#34D399AA'
        : stance === 'hold_tower'
        ? '#38BDF8AA'
        : `${accent}88`;
    ctx.lineWidth = 2.2;

    if (stance === 'defend_base') {
      // Base defense shield arc around home Nexus
      const pulse = 1 + 0.06 * Math.sin(engine.elapsed * 4.5);
      ctx.beginPath();
      ctx.arc(PLAYER_NEXUS_POS.x, PLAYER_NEXUS_POS.y, 68 * pulse, -Math.PI * 0.55, Math.PI * 0.55);
      ctx.stroke();
    } else if (stance === 'hold_tower') {
      // Hold furthest-forward standing friendly tower (including captured enemy pads!)
      const lanePads = engine.pads
        .filter((p) => p.team === 'player' && p.lane === engine.selectedLane && p.towerType !== null && !p.building)
        .sort((a, b) => b.x - a.x);
      const outerPad = lanePads[0];
      if (outerPad) {
        const pulse = 1 + 0.08 * Math.sin(engine.elapsed * 3.8);
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(outerPad.x, outerPad.y, 34 * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else {
      const phase = (engine.elapsed * (stance === 'all_in' ? 0.55 : 0.32)) % 1;
      for (let k = 0; k < 3; k++) {
        const t = ((k / 3 + phase) % 1) * 0.4 + 0.08;
        const idx = Math.min(Math.floor(t * (pts.length - 1)), pts.length - 2);
        const frac = t * (pts.length - 1) - idx;
        const x = pts[idx].x + (pts[idx + 1].x - pts[idx].x) * frac;
        const y = pts[idx].y + (pts[idx + 1].y - pts[idx].y) * frac;
        const ang = Math.atan2(pts[idx + 1].y - pts[idx].y, pts[idx + 1].x - pts[idx].x);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(-6, -8);
        ctx.lineTo(5, 0);
        ctx.lineTo(-6, 8);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  private drawSupplyDepot(
    ctx: CanvasRenderingContext2D,
    engine: BattleEngine,
    dep: SupplyDepot,
    playerVision: Array<{ x: number; y: number; r: number; detector: boolean }>,
    viewerTeam: 'player' | 'enemy' = 'player'
  ) {
    const isObserver = engine.observerView !== 'none';
    const visible =
      engine.observerView === 'all' ||
      engine.sandboxMode ||
      dep.team === viewerTeam ||
      engine.isPointVisibleTo(viewerTeam, dep.x, dep.y, playerVision);
    if (!visible) return;

    const teamColor =
      dep.team === 'player'
        ? FACTIONS[engine.player.faction].accentHex
        : FACTIONS[engine.enemy.faction].accentHex;

    ctx.save();
    if (!dep.built && !dep.building) {
      if (!isObserver && dep.team === viewerTeam) {
        ctx.strokeStyle = dep.isForward ? 'rgba(56, 189, 248, 0.45)' : 'rgba(148, 163, 184, 0.38)';
        ctx.fillStyle = dep.isForward ? 'rgba(12, 34, 56, 0.55)' : 'rgba(15, 23, 42, 0.6)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 3]);
        ctx.fillRect(dep.x - 14, dep.y - 14, 28, 28);
        ctx.strokeRect(dep.x - 14, dep.y - 14, 28, 28);
        ctx.setLineDash([]);
        ctx.font = '600 9px "Noto Sans TC", sans-serif';
        ctx.fillStyle = dep.isForward ? 'rgba(125, 211, 252, 0.78)' : 'rgba(148, 163, 184, 0.7)';
        ctx.textAlign = 'center';
        ctx.fillText(dep.isForward ? `外拓補給 ${SUPPLY_DEPOT_COST}G` : `補給 ${SUPPLY_DEPOT_COST}G`, dep.x, dep.y + 24);
      }
      ctx.restore();
      return;
    }

    // Built or building depot
    ctx.fillStyle = dep.hitFlash > 0.2 ? '#FFFFFF' : dep.building ? 'rgba(30, 41, 59, 0.7)' : '#1E293B';
    ctx.strokeStyle = dep.building ? '#38BDF8' : teamColor;
    ctx.lineWidth = 2;
    ctx.fillRect(dep.x - 14, dep.y - 14, 28, 28);
    ctx.strokeRect(dep.x - 14, dep.y - 14, 28, 28);

    // Inner supply icon
    ctx.fillStyle = dep.building ? 'rgba(56, 189, 248, 0.45)' : teamColor;
    ctx.fillRect(dep.x - 6, dep.y - 6, 12, 12);

    if (dep.building) {
      const pct = 1 - dep.buildRemaining / Math.max(0.1, dep.buildTotal);
      this.drawMiniBar(ctx, dep.x, dep.y - 22, 32, 4, pct, '#38BDF8');
      if (!isObserver && dep.team === viewerTeam) {
        ctx.font = '600 8px "Noto Sans TC", sans-serif';
        ctx.fillStyle = 'rgba(125, 211, 252, 0.85)';
        ctx.textAlign = 'center';
        ctx.fillText('雙擊取消', dep.x, dep.y + 24);
      }
    } else if (dep.hp < dep.maxHp) {
      this.drawMiniBar(ctx, dep.x, dep.y - 22, 32, 4, dep.hp / dep.maxHp, dep.team === 'player' ? '#3B82F6' : '#EF4444');
    }
    ctx.restore();
  }

  private drawBarracks(
    ctx: CanvasRenderingContext2D,
    engine: BattleEngine,
    bk: BarracksBuilding,
    playerVision: Array<{ x: number; y: number; r: number; detector: boolean }>,
    viewerTeam: 'player' | 'enemy' = 'player'
  ) {
    const isObserver = engine.observerView !== 'none';
    const visible =
      engine.observerView === 'all' ||
      engine.sandboxMode ||
      bk.team === viewerTeam ||
      engine.isPointVisibleTo(viewerTeam, bk.x, bk.y, playerVision);
    if (!visible) return;

    const def = BARRACKS_DEFS[bk.tier];
    const teamColor =
      bk.team === 'player'
        ? FACTIONS[engine.player.faction].accentHex
        : FACTIONS[engine.enemy.faction].accentHex;
    const r = 17;
    const cut = 6;

    const traceOctagon = () => {
      ctx.beginPath();
      ctx.moveTo(bk.x - r + cut, bk.y - r);
      ctx.lineTo(bk.x + r - cut, bk.y - r);
      ctx.lineTo(bk.x + r, bk.y - r + cut);
      ctx.lineTo(bk.x + r, bk.y + r - cut);
      ctx.lineTo(bk.x + r - cut, bk.y + r);
      ctx.lineTo(bk.x - r + cut, bk.y + r);
      ctx.lineTo(bk.x - r, bk.y + r - cut);
      ctx.lineTo(bk.x - r, bk.y - r + cut);
      ctx.closePath();
    };

    ctx.save();
    if (!bk.built && !bk.building) {
      if (!isObserver && bk.team === viewerTeam) {
        const ownerState = bk.team === 'player' ? engine.player : engine.enemy;
        const tierUnlocked = ownerState.techTier >= bk.tier;
        ctx.strokeStyle = tierUnlocked ? 'rgba(251, 191, 36, 0.52)' : 'rgba(148, 163, 184, 0.28)';
        ctx.fillStyle = tierUnlocked ? 'rgba(30, 24, 15, 0.55)' : 'rgba(15, 23, 42, 0.45)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 3]);
        traceOctagon();
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.fillStyle = tierUnlocked ? 'rgba(252, 211, 77, 0.85)' : 'rgba(148, 163, 184, 0.55)';
        ctx.textAlign = 'center';
        ctx.fillText(`T${bk.tier}營`, bk.x, bk.y + 3);

        ctx.font = '600 9px "Noto Sans TC", sans-serif';
        ctx.fillStyle = tierUnlocked ? 'rgba(251, 191, 36, 0.82)' : 'rgba(148, 163, 184, 0.55)';
        ctx.fillText(
          tierUnlocked ? `${def.shortName} ${def.cost}G` : `${def.shortName} 需T${bk.tier}`,
          bk.x,
          bk.y + 27
        );
      }
      ctx.restore();
      return;
    }

    // Built or building barracks
    traceOctagon();
    ctx.fillStyle = bk.hitFlash > 0.2 ? '#FFFFFF' : bk.building ? 'rgba(30, 41, 59, 0.72)' : '#1A2332';
    ctx.fill();
    ctx.strokeStyle = bk.building ? '#38BDF8' : bk.team === 'player' ? '#F59E0B' : '#FB7185';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Inner faction-tinted frame
    ctx.strokeStyle = bk.building ? 'rgba(56, 189, 248, 0.45)' : `${teamColor}AA`;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(bk.x - 10, bk.y - 10, 20, 20);

    // Chevrons representing level & concurrent slots (Lv.1=1, Lv.2=2, Lv.3=3, Lv.4=4)
    const chevrons = Math.max(1, bk.level);
    ctx.strokeStyle = bk.building
      ? '#7DD3FC'
      : bk.level >= 4
      ? '#F472B6'
      : bk.level === 3
      ? '#38BDF8'
      : bk.level === 2
      ? '#FBBF24'
      : '#FDE68A';
    ctx.lineWidth = 1.8;
    const stepY = chevrons >= 4 ? 3.8 : 4.6;
    const baseOffset = -((chevrons - 1) * stepY) * 0.5;
    for (let c = 0; c < chevrons; c++) {
      const cy = bk.y + baseOffset + c * stepY;
      ctx.beginPath();
      ctx.moveTo(bk.x - 5, cy + 2);
      ctx.lineTo(bk.x, cy - 2.5);
      ctx.lineTo(bk.x + 5, cy + 2);
      ctx.stroke();
    }

    // Compact label under standing barracks
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    const nextUp = !isObserver && bk.team === 'player' ? getBarracksNextUpgrade(bk.tier, bk.level) : null;
    ctx.fillStyle = bk.building
      ? '#7DD3FC'
      : bk.level >= 4
      ? '#F472B6'
      : bk.level === 3
      ? '#38BDF8'
      : bk.level === 2
      ? '#FBBF24'
      : '#FDE68A';
    ctx.fillText(
      bk.building
        ? bk.built
          ? `升Lv.${bk.level + 1}中`
          : `T${bk.tier}建中`
        : bk.level >= 2
        ? `T${bk.tier} Lv.${bk.level}(×${bk.level})`
        : `T${bk.tier} Lv.1`,
      bk.x,
      bk.y + 27
    );
    if (bk.building && !isObserver && bk.team === viewerTeam) {
      ctx.font = '600 8px "Noto Sans TC", sans-serif';
      ctx.fillStyle = 'rgba(125, 211, 252, 0.85)';
      ctx.fillText('雙擊取消', bk.x, bk.y + 38);
    } else if (nextUp && !bk.building && (bk.team === 'player' ? engine.player.techTier : engine.enemy.techTier) >= bk.tier) {
      ctx.font = '600 8.5px "Noto Sans TC", sans-serif';
      ctx.fillStyle = 'rgba(125, 211, 252, 0.85)';
      ctx.fillText(`點升Lv${nextUp.nextLevel} ${nextUp.cost}G`, bk.x, bk.y + 38);
    }

    const thresholds = bk.upgradeThresholdsFp ?? [];
    const showHpBar = bk.built && (bk.hp < bk.maxHp || thresholds.length > 0);
    if (bk.building) {
      const pct = 1 - bk.buildRemaining / Math.max(0.1, bk.buildTotal);
      this.drawMiniBar(ctx, bk.x, bk.y - 24, 36, 4.5, pct, '#38BDF8');
    }
    if (showHpBar) {
      const barW = 36;
      const barY = bk.building ? bk.y - 31 : bk.y - 24;
      this.drawMiniBar(
        ctx,
        bk.x,
        barY,
        barW,
        4.5,
        bk.hp / Math.max(1, bk.maxHp),
        bk.team === 'player' ? '#F59E0B' : '#EF4444'
      );
      if (thresholds.length > 0 && bk.maxHp > 0) {
        ctx.fillStyle = '#FDE047';
        for (const tFp of thresholds) {
          const tickFrac = Math.max(0.05, Math.min(0.95, tFp / (bk.maxHp * FP_SCALE)));
          const tx = bk.x - barW / 2 + barW * tickFrac;
          ctx.fillRect(tx - 0.75, barY - 1, 1.5, 6.5);
        }
      }
    }
    ctx.restore();
  }

  private drawArmoryBuilding(
    ctx: CanvasRenderingContext2D,
    engine: BattleEngine,
    arm: ArmoryBuilding,
    playerVision: Array<{ x: number; y: number; r: number; detector: boolean }>,
    viewerTeam: 'player' | 'enemy' = 'player'
  ) {
    const isObserver = engine.observerView !== 'none';
    const visible =
      engine.observerView === 'all' ||
      engine.sandboxMode ||
      arm.team === viewerTeam ||
      engine.isPointVisibleTo(viewerTeam, arm.x, arm.y, playerVision);
    if (!visible) return;

    const def = ARMORY_BUILDING_DEFS[arm.kind];
    const isBio = arm.kind === 'bio_lab';
    const accent = isBio ? '#34D399' : '#F59E0B';
    const r = 15;

    ctx.save();
    if (!arm.built && !arm.building) {
      if (!isObserver && arm.team === viewerTeam) {
        ctx.strokeStyle = isBio ? 'rgba(52, 211, 153, 0.48)' : 'rgba(245, 158, 11, 0.48)';
        ctx.fillStyle = isBio ? 'rgba(6, 40, 32, 0.5)' : 'rgba(40, 28, 10, 0.5)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
          const px = arm.x + Math.cos(a) * r;
          const py = arm.y + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '700 8.5px "Noto Sans TC", sans-serif';
        ctx.fillStyle = isBio ? 'rgba(110, 231, 183, 0.85)' : 'rgba(253, 224, 71, 0.85)';
        ctx.textAlign = 'center';
        ctx.fillText(def.shortName, arm.x, arm.y + 3);
        ctx.font = '600 8.5px "JetBrains Mono", monospace';
        ctx.fillText(`${def.cost}G [${def.hotkey}]`, arm.x, arm.y + 24);
      }
      ctx.restore();
      return;
    }

    // Built or building Armory Prerequisite Building
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
      const px = arm.x + Math.cos(a) * r;
      const py = arm.y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = arm.hitFlash > 0.2 ? '#FFFFFF' : arm.building ? 'rgba(30, 41, 59, 0.72)' : '#17212F';
    ctx.fill();
    ctx.strokeStyle = arm.building ? '#38BDF8' : accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner emblem
    ctx.fillStyle = arm.building ? 'rgba(56, 189, 248, 0.55)' : accent;
    if (isBio) {
      // Bio helix / cross icon
      ctx.fillRect(arm.x - 2, arm.y - 6.5, 4, 13);
      ctx.fillRect(arm.x - 6.5, arm.y - 2, 13, 4);
    } else {
      // Mech & Air diamond gear core
      ctx.beginPath();
      ctx.moveTo(arm.x, arm.y - 7);
      ctx.lineTo(arm.x + 7, arm.y);
      ctx.lineTo(arm.x, arm.y + 7);
      ctx.lineTo(arm.x - 7, arm.y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.font = '700 8.5px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = arm.building ? '#7DD3FC' : accent;
    ctx.fillText(arm.building ? `${def.shortName}建中` : def.shortName, arm.x, arm.y + 24);

    if (arm.building) {
      const pct = 1 - arm.buildRemaining / Math.max(0.1, arm.buildTotal);
      this.drawMiniBar(ctx, arm.x, arm.y - 22, 32, 4, pct, '#38BDF8');
      if (!isObserver && arm.team === viewerTeam) {
        ctx.font = '600 8px "Noto Sans TC", sans-serif';
        ctx.fillStyle = 'rgba(125, 211, 252, 0.85)';
        ctx.fillText('雙擊取消', arm.x, arm.y + 34);
      }
    } else if (arm.hp < arm.maxHp) {
      this.drawMiniBar(ctx, arm.x, arm.y - 22, 32, 4, arm.hp / Math.max(1, arm.maxHp), arm.team === 'player' ? accent : '#EF4444');
    }
    ctx.restore();
  }

  private drawGasExtractor(
    ctx: CanvasRenderingContext2D,
    engine: BattleEngine,
    ext: GasExtractor,
    playerVision: Array<{ x: number; y: number; r: number; detector: boolean }>,
    viewerTeam: 'player' | 'enemy' = 'player'
  ) {
    const isObserver = engine.observerView !== 'none';
    const isBuiltOrBusy = ext.built || ext.building;
    const isEligible = !isObserver && !isBuiltOrBusy && engine.isExtractorEligibleForTeam(ext, viewerTeam);
    const visible =
      engine.observerView === 'all' ||
      engine.sandboxMode ||
      ext.team === viewerTeam ||
      isEligible ||
      (isBuiltOrBusy && engine.isPointVisibleTo(viewerTeam, ext.x, ext.y, playerVision));
    if (!visible) return;
    if (!isBuiltOrBusy && !isEligible) return;

    ctx.save();
    const r = 12;

    if (!isBuiltOrBusy) {
      // Unbuilt Gas Geyser Socket behind Nexus or built Tower
      const pulse = 0.88 + 0.12 * Math.sin(engine.elapsed * 3.5);
      ctx.beginPath();
      ctx.arc(ext.x, ext.y, r * pulse, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(13, 52, 56, 0.65)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.62)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Subtle green-teal gas vent core
      ctx.fillStyle = 'rgba(45, 212, 191, 0.5)';
      ctx.beginPath();
      ctx.arc(ext.x, ext.y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '600 8.5px "Noto Sans TC", sans-serif';
      ctx.fillStyle = 'rgba(94, 234, 212, 0.88)';
      ctx.textAlign = 'center';
      ctx.fillText(`瓦斯場 ${GAS_EXTRACTOR_COST}G`, ext.x, ext.y + 21);
      ctx.restore();
      return;
    }

    // Built or building/upgrading Gas Extractor
    const isPlayerOwned = ext.team === 'player';
    ctx.beginPath();
    ctx.arc(ext.x, ext.y, r + 1.5, 0, Math.PI * 2);
    ctx.fillStyle = ext.hitFlash > 0.2 ? '#FFFFFF' : ext.building ? 'rgba(15, 36, 42, 0.72)' : '#10252C';
    ctx.fill();
    ctx.strokeStyle = ext.building || ext.upgrading ? '#38BDF8' : isPlayerOwned ? '#14B8A6' : '#FB7185';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner turbine / gas dome
    ctx.fillStyle = ext.building ? 'rgba(56, 189, 248, 0.5)' : '#2DD4BF';
    ctx.beginPath();
    ctx.arc(ext.x, ext.y, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Level pips (Lv.1 -> 1 dot, Lv.2 -> 2 dots, Lv.3 -> 3 dots)
    if (ext.built && ext.level >= 1) {
      for (let i = 0; i < ext.level; i++) {
        const px = ext.x + (i - (ext.level - 1) / 2) * 6;
        ctx.fillStyle = ext.level >= 3 ? '#FDE047' : '#5EEAD4';
        ctx.beginPath();
        ctx.arc(px, ext.y - 16, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.font = '700 8.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    if (ext.building || ext.upgrading) {
      const pct = 1 - ext.buildRemaining / Math.max(0.1, ext.buildTotal);
      this.drawMiniBar(ctx, ext.x, ext.y - 22, 30, 4, pct, '#38BDF8');
      ctx.fillStyle = '#7DD3FC';
      ctx.fillText(ext.upgrading ? `氣升Lv.${ext.level + 1}` : '氣場建中', ext.x, ext.y + 21);
      if (!isObserver && ext.team === viewerTeam) {
        ctx.font = '600 8px "Noto Sans TC", sans-serif';
        ctx.fillStyle = 'rgba(125, 211, 252, 0.85)';
        ctx.fillText('雙擊取消', ext.x, ext.y + 31);
      }
    } else {
      const effPct = Math.round((ext.harassEffPermille ?? 1000) / 10);
      const isHarassed = effPct < 100;
      ctx.fillStyle = isHarassed ? '#FBBF24' : '#5EEAD4';
      ctx.fillText(
        isHarassed ? `⚠氣Lv.${ext.level} ${effPct}%` : `氣Lv.${ext.level}`,
        ext.x,
        ext.y + 21
      );
      if (!isObserver && ext.team === viewerTeam && ext.level < 3) {
        const nextCost = GAS_EXTRACTOR_UPGRADE_COSTS[ext.level as 1 | 2];
        ctx.font = '600 8px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(153, 246, 228, 0.72)';
        ctx.fillText(`點升${nextCost}G`, ext.x, ext.y + 31);
      }
      if (ext.hp < ext.maxHp || ext.upgradeThresholdsFp.length > 0) {
        const barW = 30;
        this.drawMiniBar(
          ctx,
          ext.x,
          ext.y - 22,
          barW,
          4,
          ext.hp / Math.max(1, ext.maxHp),
          isPlayerOwned ? '#14B8A6' : '#EF4444'
        );
        if (ext.upgradeThresholdsFp.length > 0 && ext.maxHp > 0) {
          ctx.fillStyle = '#FDE047';
          for (const tFp of ext.upgradeThresholdsFp) {
            const frac = Math.max(0.05, Math.min(0.95, tFp / (ext.maxHp * FP_SCALE)));
            ctx.fillRect(ext.x - barW / 2 + barW * frac - 0.75, ext.y - 23, 1.5, 6);
          }
        }
      }
    }
    ctx.restore();
  }

  private drawTowerPad(
    ctx: CanvasRenderingContext2D,
    engine: BattleEngine,
    pad: TowerPad,
    playerVision: Array<{ x: number; y: number; r: number; detector: boolean }>,
    viewerTeam: 'player' | 'enemy' = 'player'
  ) {
    const isObserver = engine.observerView !== 'none';
    const isVisible =
      engine.observerView === 'all' ||
      pad.team === viewerTeam ||
      pad.homeSide === viewerTeam ||
      engine.isPointVisibleTo(viewerTeam, pad.x, pad.y, playerVision);
    const isEmpty = pad.towerType === null && !pad.building;
    const canPlayerBuildHere =
      !isObserver &&
      isEmpty &&
      (pad.homeSide === 'player' || engine.isPointVisibleTo('player', pad.x, pad.y, playerVision));
    const canPlayerInteract =
      !isObserver && (canPlayerBuildHere || (pad.team === 'player' && !pad.building && pad.level < 3));
    const isHovered = !isObserver && engine.hoveredPadId === pad.id;
    const isBuildHighlight = !isObserver && engine.targetMode === 'build_tower' && canPlayerInteract;
    const isEnemyContestable = isEmpty && pad.homeSide === 'enemy' && canPlayerBuildHere;
    const isCapturedCrossTerritory = pad.team !== null && pad.team !== pad.homeSide;

    ctx.save();
    // Socket ring
    ctx.beginPath();
    ctx.arc(pad.x, pad.y, 21, 0, Math.PI * 2);
    ctx.fillStyle =
      pad.team === 'player' || (isEmpty && pad.homeSide === 'player')
        ? 'rgba(30, 41, 59, 0.92)'
        : isEnemyContestable
        ? 'rgba(17, 46, 52, 0.9)'
        : 'rgba(36, 30, 28, 0.85)';
    ctx.fill();
    ctx.lineWidth = isHovered || isBuildHighlight || isCapturedCrossTerritory ? 2.5 : 1.5;
    ctx.strokeStyle = isHovered
      ? '#F8FAFC'
      : isEnemyContestable
      ? '#2DD4BF'
      : isBuildHighlight
      ? '#38BDF8'
      : pad.team === 'player'
      ? isCapturedCrossTerritory
        ? '#2DD4BF'
        : 'rgba(96, 165, 250, 0.7)'
      : pad.team === 'enemy'
      ? 'rgba(248, 113, 113, 0.7)'
      : pad.homeSide === 'player'
      ? 'rgba(96, 165, 250, 0.45)'
      : 'rgba(248, 113, 113, 0.35)';
    ctx.stroke();

    // Finite Sector Gold Vein + Distance-Scaled Proximity Harassment Readout beside pad
    if (isVisible) {
      const depleted = pad.goldReserve <= 0;
      const effPct = Math.round((pad.harassEffPermille ?? 1000) / 10);
      const isHarassed = !depleted && pad.towerType !== null && !pad.building && effPct < 100;
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = depleted
        ? 'rgba(148, 163, 184, 0.45)'
        : isHarassed
        ? effPct <= 40
          ? '#F87171'
          : '#FBBF24'
        : isEnemyContestable || (pad.homeSide === 'enemy' && pad.team === 'player')
        ? '#5EEAD4'
        : '#FCD34D';
      const label = depleted
        ? '礦盡'
        : isHarassed
        ? `⚠礦${effPct}% · ${Math.ceil(pad.goldReserve)}G`
        : `${Math.ceil(pad.goldReserve)}G`;
      ctx.fillText(label, pad.x, pad.y + 34);
    }

    // Hover range preview, live stats & build/upgrade prompt (player OR visible enemy towers!)
    if (isHovered && (canPlayerBuildHere || pad.team === 'player' || (pad.towerType !== null && isVisible))) {
      const previewRange =
        pad.towerType !== null
          ? pad.range
          : TOWER_DEFS[engine.selectedTowerType].range > 0
          ? Math.round(
              TOWER_DEFS[engine.selectedTowerType].range * (engine.player.faction === 'ironbound' ? 1.15 : 1)
            )
          : 0;
      if (previewRange > 0) {
        ctx.beginPath();
        ctx.arc(pad.x, pad.y, previewRange, 0, Math.PI * 2);
        ctx.fillStyle =
          pad.team === 'enemy'
            ? 'rgba(248, 113, 113, 0.07)'
            : isEnemyContestable
            ? 'rgba(45, 212, 191, 0.08)'
            : 'rgba(56, 189, 248, 0.06)';
        ctx.fill();
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle =
          pad.team === 'enemy'
            ? 'rgba(248, 113, 113, 0.55)'
            : isEnemyContestable
            ? 'rgba(45, 212, 191, 0.65)'
            : 'rgba(56, 189, 248, 0.48)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      let hintText: string;
      let statsLine: string | null = null;
      if (pad.towerType !== null && !pad.building) {
        const dps = (pad.damage * pad.attackRate).toFixed(1);
        const mineTag = pad.miningLevel > 0 ? ` · 擴礦+${pad.miningLevel * 45}%` : '';
        const techTag =
          pad.techLevel >= 2
            ? ` · ⚡科技Lv2(偵隱/CD+${Math.round(TOWER_TECH_CD_RATE_BY_LV[2] * 100)}%/傷+${TOWER_TECH_LV2_BONUS_DMG})`
            : pad.techLevel === 1
            ? ` · ⚡科技Lv1(偵隱/CD+${Math.round(TOWER_TECH_CD_RATE_BY_LV[1] * 100)}%)`
            : '';
        statsLine =
          pad.towerType === 'econ_tower'
            ? `採礦Lv.${pad.combatLevel}${techTag} · HP ${Math.ceil(pad.hp)}/${pad.maxHp} · 甲${pad.armor}`
            : `戰Lv.${pad.combatLevel}${mineTag}${techTag} · HP ${Math.ceil(pad.hp)}/${pad.maxHp} · 甲${pad.armor} · 攻${pad.damage}(${dps}/s) · 射${pad.range}`;
      }

      if (pad.team === 'enemy' && pad.towerType !== null) {
        hintText = `敵方 ${TOWER_DEFS[pad.towerType].name}${pad.building ? `（施工中無效 ${pad.buildRemaining.toFixed(1)}s）` : pad.upgrading ? `（改裝中·仍可採礦 ${pad.buildRemaining.toFixed(1)}s）` : ''}`;
      } else if (pad.building) {
        hintText = `施工中 ${pad.buildRemaining.toFixed(1)}s（完工前無視野/無傷/無採礦）`;
      } else if (pad.upgrading) {
        hintText = `升級中 Lv.${pad.level + 1} (${pad.buildRemaining.toFixed(1)}s · 挖礦照常)`;
      } else if (pad.towerType === null) {
        const def = TOWER_DEFS[engine.selectedTowerType];
        hintText = isEnemyContestable
          ? `奪取敵區建 ${def.name} (${def.cost}G · ${def.buildTime}s)`
          : `建 ${def.name} (${def.cost}G · ${def.buildTime}s)`;
      } else if (pad.level === 1 || pad.level === 2) {
        const nextLv = (pad.level + 1) as 2 | 3;
        const mode =
          pad.towerType === 'econ_tower' && engine.towerUpgradeMode === 'mining' ? 'combat' : engine.towerUpgradeMode;
        const upInfo = getTowerUpgradeCostAndTime(pad.towerType, nextLv, mode);
        if (nextLv === 3 && engine.player.techTier < 2) {
          hintText = `升 Lv.3 需科技 T2 (${upInfo.cost}G)`;
        } else if (mode === 'tech' && !engine.canUseTowerTechUpgrade('player')) {
          hintText = `⚡科技升級需先研發專屬 [L]（或改切強化/擴礦）`;
        } else {
          hintText =
            mode === 'mining'
              ? `⛏擴礦改裝 Lv.${nextLv} (${upInfo.cost}G · ${upInfo.time}s · 挖礦+45%)`
              : mode === 'tech'
              ? pad.techLevel === 0
                ? `⚡科技升級 Lv.${nextLv} (${upInfo.cost}G · ${upInfo.time}s · 偵隱+主動技CD加速)`
                : `⚡科技再強化 Lv.${nextLv} (${upInfo.cost}G · ${upInfo.time}s · 增傷+8 & CD加速)`
              : `⚔強化 Lv.${nextLv} (${upInfo.cost}G · ${upInfo.time}s · 護甲+傷害)`;
        }
      } else {
        hintText = `${TOWER_DEFS[pad.towerType].name} Lv.3 滿級`;
      }

      ctx.font = '600 11px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#090C11';
      ctx.fillText(hintText, pad.x + 1, pad.y - 31);
      ctx.fillStyle =
        pad.team === 'enemy' ? '#FCA5A5' : isEnemyContestable ? '#99F6E4' : '#E0F2FE';
      ctx.fillText(hintText, pad.x, pad.y - 32);

      if (statsLine) {
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#090C11';
        ctx.fillText(statsLine, pad.x + 1, pad.y - 45);
        ctx.fillStyle = '#FDE68A';
        ctx.fillText(statsLine, pad.x, pad.y - 46);
      }
    }

    // Under construction scaffolding visual
    if (pad.building && isVisible) {
      const pct = 1 - pad.buildRemaining / Math.max(0.1, pad.buildTotal);
      const buildColor = pad.team === 'enemy' ? '#F87171' : isCapturedCrossTerritory ? '#2DD4BF' : '#38BDF8';
      ctx.strokeStyle = buildColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Circular progress arc
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
      ctx.strokeStyle = buildColor;
      ctx.lineWidth = 3;
      ctx.stroke();

      this.drawMiniBar(ctx, pad.x, pad.y - 26, 36, 4.5, pct, buildColor);
      if (!isObserver && pad.team === viewerTeam) {
        ctx.font = '600 8.5px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#7DD3FC';
        ctx.textAlign = 'center';
        ctx.fillText('雙擊取消', pad.x, pad.y - 33);
      }
      ctx.restore();
      return;
    }

    if (!pad.towerType || !isVisible) {
      if (canPlayerBuildHere) {
        ctx.strokeStyle = isEnemyContestable
          ? '#2DD4BF'
          : isBuildHighlight
          ? '#38BDF8'
          : 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pad.x - 6, pad.y);
        ctx.lineTo(pad.x + 6, pad.y);
        ctx.moveTo(pad.x, pad.y - 6);
        ctx.lineTo(pad.x, pad.y + 6);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    // Completed Tower (Lv.1 / Lv.2 / Lv.3 Bastion scaling)
    const teamColor =
      pad.team === 'player'
        ? FACTIONS[engine.player.faction].accentHex
        : FACTIONS[engine.enemy.faction].accentHex;
    const fill = pad.hitFlash > 0.2 ? '#FFFFFF' : teamColor;

    // Lv.3 outer fortified bastion ring
    if (pad.level >= 3) {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const px = pad.x + Math.cos(a) * 20.5;
        const py = pad.y + Math.sin(a) * 20.5;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }

    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const r = pad.level >= 3 ? 17.5 : pad.level === 2 ? 16 : 14.5;
      const px = pad.x + Math.cos(a) * r;
      const py = pad.y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#1E293B';
    ctx.fill();
    ctx.lineWidth = pad.level >= 3 ? 2.8 : pad.level === 2 ? 2.4 : 1.8;
    ctx.strokeStyle = fill;
    ctx.stroke();

    ctx.fillStyle = fill;
    if (pad.towerType === 'watchtower') {
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.75)';
      ctx.lineWidth = 1.6;
      const a = engine.elapsed * 2.2;
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, 10, a, a + 1.2);
      ctx.stroke();
    } else if (pad.towerType === 'artillery') {
      ctx.fillRect(pad.x - 8, pad.y - 5, 16, 10);
      ctx.fillStyle = '#E2E8F0';
      const dir = pad.team === 'player' ? 1 : -1;
      ctx.fillRect(pad.x, pad.y - 2.5, dir * (pad.combatLevel >= 3 ? 15 : 13), 5);
    } else if (pad.towerType === 'tech_tower') {
      // Tactical Tech Spire with pulsing violet/cyan signal rings
      const pulse = 1 + 0.12 * Math.sin(engine.elapsed * 4.2);
      ctx.strokeStyle = '#C084FC';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, 9.5 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#A855F7';
      ctx.beginPath();
      ctx.moveTo(pad.x, pad.y - 10);
      ctx.lineTo(pad.x + 6, pad.y + 7);
      ctx.lineTo(pad.x - 6, pad.y + 7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#E9D5FF';
      ctx.beginPath();
      ctx.arc(pad.x, pad.y - 2, 2.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (pad.towerType === 'econ_tower') {
      // Pure Golden Mining Extractor Rig (no barrel, unmistakable resource crystal core!)
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(pad.x, pad.y - 11);
      ctx.lineTo(pad.x + 9, pad.y - 2);
      ctx.lineTo(pad.x + 5, pad.y + 10);
      ctx.lineTo(pad.x - 5, pad.y + 10);
      ctx.lineTo(pad.x - 9, pad.y - 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, 3.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(pad.x, pad.y - 10);
      ctx.lineTo(pad.x + 8, pad.y);
      ctx.lineTo(pad.x, pad.y + 10);
      ctx.lineTo(pad.x - 8, pad.y);
      ctx.closePath();
      ctx.fill();
    }

    // Subtle detector pulse halo for towers upgraded with Tech (Scarce Detection!)
    if (pad.detector) {
      const detPulse = 1 + 0.14 * Math.sin(engine.elapsed * 3.8);
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.65)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, 23 * detPulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Subtle anti-air readiness dot
    if (pad.canHitAir) {
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(pad.x + 13, pad.y + 13, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Level pips: Blue circles for Combat, Gold diamonds for Mining, Purple stars for Tech!
    if (pad.level >= 2) {
      const pips: Array<'combat' | 'mining' | 'tech'> = [];
      for (let i = 1; i < pad.combatLevel; i++) pips.push('combat');
      for (let i = 0; i < pad.miningLevel; i++) pips.push('mining');
      for (let i = 0; i < pad.techLevel; i++) pips.push('tech');
      pips.forEach((kind, idx) => {
        const px = pad.x + (idx - (pips.length - 1) / 2) * 9;
        const py = pad.y - 20;
        if (kind === 'mining') {
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.moveTo(px, py - 3.6);
          ctx.lineTo(px + 3.4, py);
          ctx.lineTo(px, py + 3.6);
          ctx.lineTo(px - 3.4, py);
          ctx.closePath();
          ctx.fill();
        } else if (kind === 'tech') {
          ctx.fillStyle = '#C084FC';
          ctx.beginPath();
          ctx.moveTo(px, py - 4);
          ctx.lineTo(px + 3.6, py + 2.8);
          ctx.lineTo(px - 3.6, py + 2.8);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = '#7DD3FC';
          ctx.beginPath();
          ctx.arc(px, py, 2.7, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    if (pad.upgrading) {
      const pct = 1 - pad.buildRemaining / Math.max(0.1, pad.buildTotal);
      this.drawMiniBar(
        ctx,
        pad.x,
        pad.y - 28,
        36,
        4.5,
        pct,
        pad.pendingUpgradeMode === 'mining'
          ? '#F59E0B'
          : pad.pendingUpgradeMode === 'tech'
          ? '#C084FC'
          : '#38BDF8'
      );
      if (!isObserver && pad.team === viewerTeam) {
        ctx.font = '600 8.5px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#7DD3FC';
        ctx.textAlign = 'center';
        ctx.fillText('雙擊取消', pad.x, pad.y - 35);
      }
    } else if (pad.hp < pad.maxHp || pad.upgradeStack.length > 0) {
      const barW = 36;
      const ratio = pad.hp / Math.max(1, pad.maxHp);
      this.drawMiniBar(ctx, pad.x, pad.y - 28, barW, 4, ratio, pad.team === 'player' ? '#3B82F6' : '#EF4444');
      // Draw downgrade threshold ticks from upgradeStack (breaking extra HP downgrades tower!)
      if (pad.upgradeStack.length > 0 && pad.maxHp > 0) {
        ctx.fillStyle = '#FDE047';
        for (const layer of pad.upgradeStack) {
          const tickFrac = Math.max(0.05, Math.min(0.95, layer.thresholdHpFp / (pad.maxHp * FP_SCALE)));
          const tx = pad.x - barW / 2 + barW * tickFrac;
          ctx.fillRect(tx - 0.75, pad.y - 29, 1.5, 6);
        }
      }
    }
    ctx.restore();
  }

  private drawObjective(
    ctx: CanvasRenderingContext2D,
    engine: BattleEngine,
    obj: NeutralObjective,
    playerVision: Array<{ x: number; y: number; r: number; detector: boolean }>,
    viewerTeam: 'player' | 'enemy' = 'player'
  ) {
    const visible =
      engine.observerView === 'all' || engine.isPointVisibleTo(viewerTeam, obj.x, obj.y, playerVision);
    ctx.save();

    if (obj.kind === 'barricade') {
      if (obj.cleared) {
        ctx.fillStyle = 'rgba(100, 116, 139, 0.25)';
        ctx.fillRect(obj.x - 10, obj.y - 26, 7, 12);
        ctx.fillRect(obj.x + 4, obj.y + 14, 8, 12);
        ctx.restore();
        return;
      }
      ctx.fillStyle = visible && obj.hitFlash > 0.2 ? '#F8FAFC' : '#475569';
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2;
      ctx.fillRect(obj.x - 12, obj.y - 34, 24, 68);
      ctx.strokeRect(obj.x - 12, obj.y - 34, 24, 68);
      ctx.strokeStyle = '#1E293B';
      ctx.beginPath();
      ctx.moveTo(obj.x - 10, obj.y - 30);
      ctx.lineTo(obj.x + 10, obj.y + 30);
      ctx.moveTo(obj.x + 10, obj.y - 30);
      ctx.lineTo(obj.x - 10, obj.y + 30);
      ctx.stroke();

      if (visible) {
        this.drawMiniBar(ctx, obj.x, obj.y - 44, 44, 5, obj.hp / obj.maxHp, '#CBD5E1');
      }
      ctx.restore();
      return;
    }

    const ringColor =
      obj.owner === 'player'
        ? FACTIONS[engine.player.faction].accentHex
        : obj.owner === 'enemy'
        ? '#EF4444'
        : obj.kind === 'crystal_vein'
        ? '#14B8A6'
        : obj.kind === 'ancient_beacon'
        ? '#38BDF8'
        : '#A855F7';

    ctx.beginPath();
    ctx.arc(obj.x, obj.y, 28, 0, Math.PI * 2);
    ctx.fillStyle = `${ringColor}18`;
    ctx.fill();
    ctx.strokeStyle = `${ringColor}66`;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    if (visible && (obj.kind === 'crystal_vein' || obj.kind === 'ancient_beacon') && obj.captureProgress !== 0) {
      const frac = Math.abs(obj.captureProgress) / 100;
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, 32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.strokeStyle = obj.captureProgress > 0 ? '#3B82F6' : '#EF4444';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    if (obj.kind === 'crystal_vein') {
      ctx.fillStyle = obj.goldReserve > 0 ? ringColor : '#475569';
      ctx.beginPath();
      ctx.moveTo(obj.x, obj.y - 14);
      ctx.lineTo(obj.x + 9, obj.y - 2);
      ctx.lineTo(obj.x + 5, obj.y + 12);
      ctx.lineTo(obj.x - 6, obj.y + 12);
      ctx.lineTo(obj.x - 9, obj.y - 2);
      ctx.closePath();
      ctx.fill();
      if (visible) {
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        const effPct = Math.round((obj.harassEffPermille ?? 1000) / 10);
        const isHarassed = obj.owner && obj.goldReserve > 0 && effPct < 100;
        ctx.fillStyle = obj.goldReserve <= 0 ? '#64748B' : isHarassed ? '#FBBF24' : '#5EEAD4';
        const label =
          obj.goldReserve <= 0
            ? '枯竭'
            : isHarassed
            ? `⚠礦${effPct}% · ${Math.ceil(obj.goldReserve)}G`
            : `${Math.ceil(obj.goldReserve)}G`;
        ctx.fillText(label, obj.x, obj.y + 42);
      }
    } else if (obj.kind === 'ancient_beacon') {
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#E0F2FE';
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = obj.cleared ? 'rgba(148,163,184,0.35)' : '#C084FC';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(obj.x - 8, obj.y - 8);
      ctx.lineTo(obj.x + 8, obj.y + 8);
      ctx.moveTo(obj.x + 8, obj.y - 8);
      ctx.lineTo(obj.x - 8, obj.y + 8);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawNexus(
    ctx: CanvasRenderingContext2D,
    engine: BattleEngine,
    team: 'player' | 'enemy',
    playerVision: Array<{ x: number; y: number; r: number; detector: boolean }>,
    viewerTeam: 'player' | 'enemy' = 'player'
  ) {
    const pos = team === 'player' ? PLAYER_NEXUS_POS : ENEMY_NEXUS_POS;
    const state = team === 'player' ? engine.player : engine.enemy;
    const f = FACTIONS[state.faction];
    const isVisible =
      engine.observerView === 'all' ||
      team === viewerTeam ||
      engine.isPointVisibleTo(viewerTeam, pos.x, pos.y, playerVision);

    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 46, 0, Math.PI * 2);
    ctx.fillStyle = '#141B25';
    ctx.fill();
    ctx.strokeStyle = state.nexusHitFlash > 0.2 ? '#FFFFFF' : f.accentHex;
    ctx.lineWidth = 3;
    ctx.stroke();

    if (isVisible) {
      for (let t = 1; t < state.techTier; t++) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 46 + t * 8, 0, Math.PI * 2);
        ctx.strokeStyle = `${f.accentLightHex}66`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Active parallel training progress ring on player Nexus (tracks soonest-finishing unit)
    if (team === 'player' && state.trainingQueue.length > 0) {
      let soonest = state.trainingQueue[0];
      for (let i = 1; i < state.trainingQueue.length; i++) {
        if (state.trainingQueue[i].remaining < soonest.remaining) soonest = state.trainingQueue[i];
      }
      const pct = 1 - soonest.remaining / Math.max(0.1, soonest.total);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 52, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
      ctx.strokeStyle = soonest.multiplier === 2 ? '#F59E0B' : '#FBBF24';
      ctx.lineWidth = state.trainingQueue.length > 1 ? 3.6 : 3;
      ctx.stroke();
    }

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = pos.x + Math.cos(a) * 32;
      const py = pos.y + Math.sin(a) * 32;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = state.nexusHitFlash > 0.2 ? '#FFFFFF' : '#1E293B';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = f.accentLightHex;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 13, 0, Math.PI * 2);
    ctx.fillStyle = f.accentHex;
    ctx.fill();

    if (isVisible) {
      const barW = 84;
      const ratio = state.nexusHp / Math.max(1, state.nexusMaxHp);
      this.drawMiniBar(
        ctx,
        pos.x,
        pos.y - 60,
        barW,
        6.5,
        ratio,
        team === 'player' ? (state.nexusPlatingBroken ? '#F59E0B' : f.accentHex) : '#EF4444'
      );
      // Draw extra-plating threshold notch on Nexus HP bar
      if (!state.nexusPlatingBroken && state.nexusMaxHp > 0 && state.nexusPlatingThresholdFp > 0) {
        const threshFrac = Math.max(0.1, Math.min(0.95, state.nexusPlatingThresholdFp / (state.nexusMaxHp * FP_SCALE)));
        const tx = pos.x - barW / 2 + barW * threshFrac;
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(tx - 1, pos.y - 61.5, 2, 9.5);
      }
      ctx.font = '600 11px "Noto Sans TC", sans-serif';
      ctx.fillStyle = '#E2E8F0';
      ctx.textAlign = 'center';
      ctx.fillText(
        team === 'player' ? `我方主堡 T${state.techTier}` : `敵方主堡 T${state.techTier}`,
        pos.x,
        pos.y + 66
      );
      if (team === 'player') {
        ctx.font = '600 10px "JetBrains Mono", monospace';
        const effPct = Math.round((state.nexusHarassEffPermille ?? 1000) / 10);
        const nHarassed = state.nexusGoldReserve > 0 && effPct < 100;
        ctx.fillStyle =
          state.nexusGoldReserve <= 0
            ? '#F87171'
            : nHarassed
            ? '#FBBF24'
            : '#FCD34D';
        ctx.fillText(
          state.nexusGoldReserve <= 0
            ? '主堡礦脈枯竭'
            : nHarassed
            ? `⚠礦${effPct}% · ${Math.ceil(state.nexusGoldReserve)}G`
            : `礦脈 ${Math.ceil(state.nexusGoldReserve)}G`,
          pos.x,
          pos.y + 81
        );
        if (state.nexusPlatingBroken) {
          const repairing = state.activeResearches.find((r) => r.kind === 'nexus_repair');
          ctx.font = '700 10px "Noto Sans TC", sans-serif';
          ctx.fillStyle = repairing ? '#38BDF8' : '#FB923C';
          ctx.fillText(
            repairing
              ? `🔧外甲修復中 ${repairing.remaining.toFixed(1)}s`
              : `⚠外甲破損(-35%礦) 點主堡修復 ${NEXUS_REPAIR_COST}G`,
            pos.x,
            pos.y + 96
          );
        }
      } else if (state.nexusPlatingBroken) {
        ctx.font = '600 9.5px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#FCA5A5';
        ctx.fillText('外甲已破 (-35%採礦)', pos.x, pos.y + 81);
      }
    }

    ctx.restore();
  }

  private drawUnit(ctx: CanvasRenderingContext2D, engine: BattleEngine, u: UnitEntity, revealedOnlyByFire = false) {
    const isAir = u.domain === 'air';
    const isHeavy = u.armorClass === 'heavy';
    const isSiege = u.armorClass === 'siege';
    const hoverOffset = isAir ? -13 + Math.sin(engine.elapsed * 4.4 + u.id * 1.3) * 2.5 : 0;

    ctx.save();
    ctx.translate(u.x, u.y);

    if (revealedOnlyByFire) {
      // Enemy unit attacking from outside vision: visible to human eyes (amber pulsing ring), NOT targetable by friendly units!
      ctx.globalAlpha = 0.82;
      const firePulse = 1 + 0.14 * Math.sin(engine.elapsed * 10);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(0, hoverOffset, (u.radius + 7) * firePulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (u.cloaked && u.revealTimer <= 0) {
      ctx.globalAlpha = u.team === 'player' ? 0.55 : 0.72;
    }

    // Ground drop shadow (clearly offset lower & softer for Air units + subtle altitude tether!)
    const shadowY = isAir ? u.radius * 0.75 + 12 : u.radius * 0.65;
    ctx.fillStyle = isAir ? 'rgba(0,0,0,0.34)' : 'rgba(0,0,0,0.42)';
    ctx.beginPath();
    ctx.ellipse(
      0,
      shadowY,
      u.radius * (isAir ? 0.84 : 0.94),
      u.radius * (isAir ? 0.34 : 0.46),
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    if (isAir) {
      // Subtle altitude drop-line & ground footprint ring so flying units are instantly legible as AIR!
      ctx.save();
      ctx.strokeStyle = u.team === 'enemy' ? 'rgba(248, 113, 113, 0.28)' : 'rgba(125, 211, 252, 0.28)';
      ctx.lineWidth = 1.1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(0, hoverOffset + u.radius * 0.55);
      ctx.lineTo(0, shadowY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Subtle ground-plane armored bracket for Heavy / Siege units (never obscures the unit silhouette!)
    if (isHeavy && u.team !== 'neutral' && !isAir) {
      ctx.save();
      ctx.strokeStyle = u.team === 'player' ? 'rgba(226, 232, 240, 0.52)' : 'rgba(252, 165, 165, 0.52)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, shadowY - 2, u.radius * 1.14, u.radius * 0.56, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (isSiege && u.team !== 'neutral' && !isAir) {
      ctx.save();
      ctx.strokeStyle = 'rgba(251, 146, 60, 0.58)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.ellipse(0, shadowY - 2, u.radius * 1.12, u.radius * 0.54, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Lift hovering air chassis cleanly above ground plane
    ctx.translate(0, hoverOffset);
    ctx.scale(u.scaleX, u.scaleY);

    const palette = getUnitArtPalette(u, FACTIONS[engine.player.faction].accentHex);

    // Subtle wingtip chevron arcs for Heavy Air capital ships (Gunship / Carrier / Leviathan / Broodlord)
    if (isHeavy && isAir && u.team !== 'neutral') {
      ctx.save();
      ctx.strokeStyle = u.team === 'player' ? 'rgba(226, 232, 240, 0.42)' : 'rgba(252, 165, 165, 0.42)';
      ctx.lineWidth = 1.5;
      const ar = u.radius + 5;
      ctx.beginPath();
      ctx.arc(0, 0, ar, -0.55, 0.55);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, ar, Math.PI - 0.55, Math.PI + 0.55);
      ctx.stroke();
      ctx.restore();
    }

    // Subtle mobile detector radar pulse ring (Scarce Detection!)
    if (u.detector && u.team === 'player') {
      const detPulse = 1 + 0.16 * Math.sin(engine.elapsed * 4.5 + u.id);
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.55)';
      ctx.lineWidth = 1.3;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, (u.radius + 11) * detPulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Pending ambush selection highlight (during ambush_target step!)
    const isPendingSelected = engine.targetMode === 'ambush_target' && engine.pendingAmbushUnitIds.includes(u.id);
    if (isPendingSelected) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, u.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Hawkeye Recon passive bio-heal aura (when OOC & not detecting cloak)
    if (u.healingBioActive) {
      const healPulse = 0.85 + 0.15 * Math.sin(engine.elapsed * 4.5);
      ctx.strokeStyle = `rgba(52, 211, 153, ${0.28 * healPulse})`;
      ctx.fillStyle = 'rgba(52, 211, 153, 0.05)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, HAWKEYE_HEAL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      // Small green medical cross above recon drone
      ctx.strokeStyle = '#6EE7B7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, -u.radius - 13);
      ctx.lineTo(4, -u.radius - 13);
      ctx.moveTo(0, -u.radius - 17);
      ctx.lineTo(0, -u.radius - 9);
      ctx.stroke();
    }

    // Ironbound [K] Morale Stim (Biological) or Siege Lock (Mech/Air) overlay
    if (u.stimTimer > 0) {
      const p = 1 + 0.12 * Math.sin(engine.elapsed * 14);
      ctx.strokeStyle = '#34D399';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, (u.radius + 6) * p, 0, Math.PI * 2);
      ctx.stroke();
    } else if (u.siegeLockTimer > 0) {
      // Stationary anchored siege-lock brackets (amber/orange)
      const br = u.radius + 8;
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2.4;
      for (let k = 0; k < 4; k++) {
        const ang = (k * Math.PI) / 2 + Math.PI / 4;
        ctx.beginPath();
        ctx.arc(0, 0, br, ang - 0.28, ang + 0.28);
        ctx.stroke();
      }
    }

    // Desperate retreat aura OR 4th-lane squad badge ring
    const unitStance =
      u.team === 'player'
        ? u.inAmbushSquad
          ? engine.player.squadStance
          : engine.player.laneStances[u.lane]
        : u.team === 'enemy'
        ? u.inAmbushSquad
          ? engine.enemy.squadStance
          : engine.enemy.laneStances[u.lane]
        : 'push';
    if (unitStance === 'retreat') {
      ctx.strokeStyle = '#FB7185';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, u.radius + 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (u.inAmbushSquad && u.team === engine.getControlledTeam()) {
      // Dedicated 4th-lane custom squad ring (pure visual marker, zero stat buffs)
      ctx.strokeStyle = engine.squadSelected ? '#22D3EE' : 'rgba(45, 212, 191, 0.78)';
      ctx.lineWidth = engine.squadSelected ? 2.2 : 1.7;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, u.radius + 6.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (u.hasteTimer > 0) {
      ctx.strokeStyle = '#FCD34D';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, u.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    } else if (u.auraShield) {
      ctx.strokeStyle = 'rgba(252, 211, 77, 0.38)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, u.radius + 9, 0, Math.PI * 2);
      ctx.stroke();
    }

    const dir: 1 | -1 = u.team === 'enemy' ? -1 : 1;
    drawDetailedUnitArt(ctx, u, engine.elapsed, dir, palette);

    if (u.slowTimer > 0) {
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, u.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    const barW = u.isBoss ? 48 : u.radius >= 16 ? 34 : 22;
    const barY = u.y + hoverOffset - u.radius - (isHeavy ? 11 : 8);
    if (u.hp < u.maxHp || u.isBoss || u.shield > 0) {
      this.drawMiniBar(
        ctx,
        u.x,
        barY,
        barW,
        u.isBoss ? 5 : 3.5,
        u.hp / u.maxHp,
        u.team === 'player' ? '#60A5FA' : u.team === 'enemy' ? '#EF4444' : '#C084FC'
      );
      if (u.shield > 0 && u.maxShield > 0) {
        this.drawMiniBar(ctx, u.x, barY - 4.5, barW, 2.5, u.shield / u.maxShield, '#38BDF8');
      }
    }
    // Valkyrie 15s combat cloak duration readout (visible to owner!)
    if (u.cloakMaxSec > 0 && u.team === 'player') {
      ctx.save();
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = u.cloaked ? '#67E8F9' : '#94A3B8';
      ctx.fillText(
        u.cloaked ? `隱${Math.ceil(u.cloakTimer)}s` : '顯形',
        u.x,
        barY - (u.shield > 0 ? 7.5 : 3.5)
      );
      ctx.restore();
    } else if (revealedOnlyByFire) {
      ctx.save();
      ctx.font = '700 8.5px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FBBF24';
      ctx.fillText('開火暴露', u.x, barY - (u.shield > 0 ? 7.5 : 3.5));
      ctx.restore();
    }
  }

  private drawProjectile(ctx: CanvasRenderingContext2D, p: { x: number; y: number; targetX: number; targetY: number; color: string; kind: string }) {
    ctx.save();
    const ang = Math.atan2(p.targetY - p.y, p.targetX - p.x);
    ctx.translate(p.x, p.y);
    ctx.rotate(ang);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;

    if (p.kind === 'shell' || p.kind === 'orb') {
      ctx.beginPath();
      ctx.arc(0, 0, 4.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'beam' || p.kind === 'laser') {
      ctx.lineWidth = p.kind === 'beam' ? 3.5 : 2.2;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(8, 0);
      ctx.stroke();
    } else {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(5, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawArtilleryReticle(
    ctx: CanvasRenderingContext2D,
    s: { x: number; y: number; radius: number },
    elapsed: number
  ) {
    ctx.save();
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.85)';
    ctx.fillStyle = 'rgba(251, 146, 60, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    const rInner = (elapsed * 90) % s.radius;
    ctx.strokeStyle = 'rgba(253, 186, 116, 0.65)';
    ctx.beginPath();
    ctx.arc(s.x, s.y, rInner, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawSporeDrop(
    ctx: CanvasRenderingContext2D,
    drop: { x: number; y: number; radius: number; timeRemaining: number; duration: number; team: 'player' | 'enemy' }
  ) {
    const progress = 1 - Math.max(0, drop.timeRemaining / drop.duration);
    const color = drop.team === 'player' ? '#34D399' : '#FB7185';
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = drop.team === 'player' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(244, 63, 94, 0.14)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.setLineDash([6, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(drop.x, drop.y, drop.radius * (1 - progress * 0.85), 0, Math.PI * 2);
    ctx.stroke();

    const fallOffset = (1 - progress) * 140;
    ctx.fillStyle = '#A7F3D0';
    ctx.beginPath();
    ctx.arc(drop.x, drop.y - fallOffset, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(drop.x, drop.y - fallOffset);
    ctx.lineTo(drop.x, drop.y - fallOffset - 36);
    ctx.stroke();
    ctx.restore();
  }

  private renderFogOfWar(
    ctx: CanvasRenderingContext2D,
    visionCircles: Array<{ x: number; y: number; r: number; detector: boolean }>
  ) {
    const expCtx = this.exploredCanvas.getContext('2d');
    if (expCtx) {
      expCtx.globalCompositeOperation = 'destination-out';
      for (const c of visionCircles) {
        const grad = expCtx.createRadialGradient(c.x, c.y, c.r * 0.65, c.x, c.y, c.r);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        expCtx.fillStyle = grad;
        expCtx.beginPath();
        expCtx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        expCtx.fill();
      }
      expCtx.globalCompositeOperation = 'source-over';
    }

    const fCtx = this.fogCanvas.getContext('2d');
    if (!fCtx) return;
    fCtx.globalCompositeOperation = 'source-over';
    fCtx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Deeper shroud so Fog of War genuinely empowers aggressive scouting & raids!
    fCtx.fillStyle = 'rgba(5, 8, 13, 0.72)';
    fCtx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    fCtx.globalAlpha = 0.82;
    fCtx.drawImage(this.exploredCanvas, 0, 0);
    fCtx.globalAlpha = 1;

    fCtx.globalCompositeOperation = 'destination-out';
    for (const c of visionCircles) {
      const grad = fCtx.createRadialGradient(c.x, c.y, c.r * 0.62, c.x, c.y, c.r);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      fCtx.fillStyle = grad;
      fCtx.beginPath();
      fCtx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      fCtx.fill();
    }
    fCtx.globalCompositeOperation = 'source-over';

    ctx.drawImage(this.fogCanvas, 0, 0);
  }

  // Subtle acoustic sonar ripple in the dark jungle when a Jungle Event spawns (invites players to scout/raid!)
  private drawJungleEventSonar(ctx: CanvasRenderingContext2D, engine: BattleEngine) {
    const ev = engine.activeEvent;
    if (!ev) return;
    const pulse = (engine.elapsed * 0.65) % 1;
    const color =
      ev.kind === 'boss_colossus'
        ? '#C084FC'
        : ev.kind === 'supply_drop'
        ? '#FBBF24'
        : ev.kind === 'aether_rift'
        ? '#2DD4BF'
        : ev.kind === 'vein_overdrive'
        ? '#FDE047'
        : ev.kind === 'merc_convoy'
        ? '#FB923C'
        : '#94A3B8';

    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.75 * (1 - pulse);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ev.x, ev.y, 18 + pulse * 72, 0, Math.PI * 2);
    ctx.stroke();

    const scaleTag = ev.powerScale && ev.powerScale > 1.05 ? ` (${ev.powerScale.toFixed(1)}×)` : '';
    ctx.globalAlpha = 0.94;
    ctx.font = '600 11px "Noto Sans TC", sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(`▲ ${ev.title}${scaleTag}`, ev.x, ev.y - 36);
    ctx.restore();
  }

  private drawScanPulses(ctx: CanvasRenderingContext2D, engine: BattleEngine) {
    for (const scan of engine.scans) {
      const isPlayer = scan.team === 'player';
      const progress = 1 - scan.timeRemaining / scan.duration;
      const color = isPlayer ? '#38BDF8' : '#F87171';
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(scan.x, scan.y, scan.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const sweepR = ((progress * 3) % 1) * scan.radius;
      ctx.globalAlpha = 0.45 * (1 - ((progress * 3) % 1));
      ctx.beginPath();
      ctx.arc(scan.x, scan.y, sweepR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 0.9;
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(
        `${isPlayer ? '偵察掃描' : '敵軍掃描'} ${scan.timeRemaining.toFixed(1)}s`,
        scan.x,
        scan.y - scan.radius + 18
      );
      ctx.restore();
    }
  }

  private drawGhostIntel(ctx: CanvasRenderingContext2D, engine: BattleEngine) {
    for (const g of engine.ghosts) {
      const alpha = (g.timeRemaining / g.maxTime) * 0.72;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#F87171';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(g.x, g.y, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '600 10px "Noto Sans TC", sans-serif';
      ctx.fillStyle = '#FCA5A5';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y + 3.5);
      ctx.restore();
    }
  }

  private drawZoneLabels(ctx: CanvasRenderingContext2D, engine: BattleEngine) {
    const laneCoords: Record<LaneId, { x: number; y: number }> = {
      0: { x: 720, y: 42 },
      1: { x: 720, y: 376 },
      2: { x: 720, y: 806 },
    };

    ctx.save();
    ctx.font = '600 11px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    for (const lane of engine.getActiveLanes()) {
      const pos = laneCoords[lane];
      const isSelected = engine.selectedLane === lane;
      ctx.fillStyle = isSelected ? '#F8FAFC' : 'rgba(203, 213, 225, 0.58)';
      ctx.fillText(`${LANE_SHORT_NAMES[lane]}戰線`, pos.x, pos.y);
    }

    // Subtle Jungle Zone labels
    ctx.font = '500 10px "Noto Sans TC", sans-serif';
    ctx.fillStyle = 'rgba(94, 234, 212, 0.62)';
    if (engine.mapMode === 'simple') {
      ctx.fillText('中央野區迷霧 · [X] 跨線奇襲通道', JUNGLE_CENTERS.center.x, JUNGLE_CENTERS.center.y - 126);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.52)';
      ctx.fillText('雙線寬距分離 · 適合單線猛推或穿越中央奇襲', JUNGLE_CENTERS.center.x, JUNGLE_CENTERS.center.y + 136);
    } else {
      ctx.fillText('上側野區迷霧 · [X] 奇襲通道', JUNGLE_CENTERS.upper.x, JUNGLE_CENTERS.upper.y - 68);
      ctx.fillText('下側野區迷霧 · [X] 奇襲通道', JUNGLE_CENTERS.lower.x, JUNGLE_CENTERS.lower.y + 78);
    }
    ctx.restore();
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D, engine: BattleEngine) {
    for (const ft of engine.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
      ctx.font = '700 12px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#090C11';
      ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  private drawTutorialBeacon(ctx: CanvasRenderingContext2D, engine: BattleEngine) {
    const beacon = engine.getTutorialBeacon();
    if (!beacon) return;

    const pulse = 1 + 0.14 * Math.sin(engine.elapsed * 5.2);
    const outerR = beacon.radius * pulse;

    ctx.save();
    // Subtle outer guide ring
    ctx.beginPath();
    ctx.arc(beacon.x, beacon.y, outerR, 0, Math.PI * 2);
    ctx.fillStyle = `${beacon.color}1C`;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.setLineDash([7, 5]);
    ctx.strokeStyle = beacon.color;
    ctx.stroke();
    ctx.setLineDash([]);

    // Inner solid precision ring
    ctx.beginPath();
    ctx.arc(beacon.x, beacon.y, Math.max(12, beacon.radius * 0.56), 0, Math.PI * 2);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#FFFFFFCC';
    ctx.stroke();

    // Label callout box above beacon
    ctx.font = '700 12px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    const textW = ctx.measureText(beacon.label).width;
    const boxW = textW + 16;
    const boxH = 22;
    const boxX = beacon.x - boxW / 2;
    const boxY = Math.max(14, beacon.y - outerR - boxH - 8);

    ctx.fillStyle = 'rgba(10, 15, 23, 0.92)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = beacon.color;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = '#F8FAFC';
    ctx.fillText(beacon.label, beacon.x, boxY + 15);
    ctx.restore();
  }

  private drawTargetingReticle(ctx: CanvasRenderingContext2D, engine: BattleEngine) {
    if (!engine.hoveredWorld) return;
    if (
      engine.targetMode !== 'scan' &&
      engine.targetMode !== 'faction_skill' &&
      engine.targetMode !== 'k_boost' &&
      engine.targetMode !== 'ambush_select' &&
      engine.targetMode !== 'ambush_target'
    ) {
      return;
    }

    const ctrl = engine.getControlledTeam();
    const ctrlState = ctrl === 'player' ? engine.player : engine.enemy;
    const { x, y } = engine.hoveredWorld;
    const isScan = engine.targetMode === 'scan';
    const isKBoost = engine.targetMode === 'k_boost';
    const isSelect = engine.targetMode === 'ambush_select';
    const isTarget = engine.targetMode === 'ambush_target';
    const isFactionSkill = engine.targetMode === 'faction_skill';
    const radius = isScan
      ? FACTIONS[ctrlState.faction].scanRadius
      : isKBoost
      ? IRON_K_BOOST_RADIUS
      : isSelect
      ? SQUAD_SELECT_RADIUS
      : isTarget
      ? 36
      : ctrlState.faction === 'ironbound'
      ? 72
      : ctrlState.faction === 'dawn'
      ? 120
      : 72;
    const color = isScan
      ? '#38BDF8'
      : isKBoost
      ? '#34D399'
      : isSelect || isTarget
      ? '#22D3EE'
      : ctrlState.faction === 'ironbound'
      ? '#FB923C'
      : ctrlState.faction === 'dawn'
      ? '#FBBF24'
      : '#10B981';

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `${color}18`;
    ctx.fill();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // Friendly-fire danger zone overlay for [F] Faction Skills!
    if (isFactionSkill) {
      const ffRadius = ctrlState.faction === 'dawn' ? 75 : 72;
      if (ctrlState.faction === 'dawn') {
        ctx.beginPath();
        ctx.arc(x, y, ffRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(248,113,113,0.12)';
        ctx.fill();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = '#F87171';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      let friendlyInBlast = 0;
      for (const u of engine.units) {
        if (u.team === ctrl && u.hp > 0 && Math.hypot(u.x - x, u.y - y) <= ffRadius) {
          friendlyInBlast++;
        }
      }
      if (friendlyInBlast > 0) {
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FCA5A5';
        ctx.fillText(`⚠ 範圍內 ${friendlyInBlast} 名友軍將受誤傷！`, x, y - radius - 8);
      }
    }

    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y + 10);
    ctx.stroke();

    if (isKBoost) {
      let bioN = 0;
      let mechN = 0;
      for (const u of engine.units) {
        if (u.team === ctrl && u.hp > 0 && Math.hypot(u.x - x, u.y - y) <= IRON_K_BOOST_RADIUS) {
          if (u.attributes.includes('Biological')) bioN++;
          else mechN++;
        }
      }
      const txt = `K 戰術激勵 (生物×${bioN} 鼓舞 / 其他×${mechN} 架設鎖定)`;
      ctx.font = '700 11px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#090C11';
      ctx.fillText(txt, x + 1, y - radius - 9);
      ctx.fillStyle = '#6EE7B7';
      ctx.fillText(txt, x, y - radius - 10);
    } else if (isSelect) {
      let count = 0;
      for (const u of engine.units) {
        if (u.team === ctrl && Math.hypot(u.x - x, u.y - y) <= SQUAD_SELECT_RADIUS) count++;
      }
      ctx.font = '700 11px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#090C11';
      ctx.fillText(`框選編隊 (${count} 單位) · 再按 X 取消`, x + 1, y - radius - 9);
      ctx.fillStyle = '#67E8F9';
      ctx.fillText(`框選編隊 (${count} 單位) · 再按 X 取消`, x, y - radius - 10);
    } else if (isTarget) {
      ctx.font = '700 11px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#090C11';
      ctx.fillText(`點擊目的地 (${engine.pendingAmbushUnitIds.length} 單位編隊前往) · 再按 X 取消`, x + 1, y - radius - 9);
      ctx.fillStyle = '#67E8F9';
      ctx.fillText(`點擊目的地 (${engine.pendingAmbushUnitIds.length} 單位編隊前往) · 再按 X 取消`, x, y - radius - 10);
    }
    ctx.restore();
  }

  private drawMiniBar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    ratio: number,
    color: string
  ) {
    const r = Math.max(0, Math.min(1, ratio));
    ctx.fillStyle = 'rgba(9, 13, 18, 0.85)';
    ctx.fillRect(cx - w / 2 - 1, cy - 1, w + 2, h + 2);
    ctx.fillStyle = color;
    ctx.fillRect(cx - w / 2, cy, w * r, h);
  }
}
