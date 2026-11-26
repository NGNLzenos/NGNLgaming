import type { FactionId, LaneId, LaneStance, Projectile, UnitEntity } from './types';

export type AttackAudioKind = Projectile['kind'] | 'melee' | 'flame';

export type UnitAudioArchetype =
  | 'bio_human'
  | 'bio_psionic'
  | 'bio_swarm'
  | 'mech_light'
  | 'mech_heavy'
  | 'air_jet'
  | 'air_bio'
  | 'neutral_beast';

export function classifyUnitAudio(
  u: Pick<UnitEntity, 'domain' | 'attributes' | 'faction' | 'shape' | 'armorClass' | 'team'>
): UnitAudioArchetype {
  if (u.team === 'neutral') {
    if (u.shape === 'titan' || u.attributes.includes('Mechanical')) return 'mech_heavy';
    return 'neutral_beast';
  }
  if (u.domain === 'air') {
    if (u.faction === 'swarm' || u.attributes.includes('Biological')) return 'air_bio';
    return 'air_jet';
  }
  if (u.attributes.includes('Mechanical')) {
    return u.armorClass === 'heavy' || u.attributes.includes('Massive') || u.shape === 'mortar'
      ? 'mech_heavy'
      : 'mech_light';
  }
  if (u.faction === 'swarm') return 'bio_swarm';
  if (u.faction === 'dawn' || u.attributes.includes('Psionic')) return 'bio_psionic';
  return 'bio_human';
}

function pickVariant(count: number): number {
  return Math.floor(Math.random() * count);
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Subtle, restrained tactical Web Audio synthesizer.
// Designed for clear combat, randomized unit foley, construction ambience & command confirmation.
class TacticalAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  private muted = false;

  // Per-category rate-limiting timestamps (ms) to keep dense battles calm and legible
  private lastPlayed: Record<string, number> = {};

  // Continuous building construction ambience graph
  private buildAmbGain: GainNode | null = null;
  private buildAmbNoise: AudioBufferSourceNode | null = null;
  private buildAmbHumOsc: OscillatorNode | null = null;
  private buildAmbFilter: BiquadFilterNode | null = null;
  private buildAmbActive = false;
  private buildAmbCount = 0;
  private buildAmbFaction: FactionId = 'ironbound';
  private nextBuildAccentAt = 0;

  private ensureContext(): { ctx: AudioContext; out: AudioNode } | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterFilter = this.ctx.createBiquadFilter();
      this.masterFilter.type = 'lowpass';
      this.masterFilter.frequency.value = 4600;
      this.masterFilter.Q.value = 0.65;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.44;

      this.masterFilter.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.masterFilter) return null;
    return { ctx: this.ctx, out: this.masterFilter };
  }

  private nowMs(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  private canPlay(key: string, cooldownMs: number): boolean {
    const now = this.nowMs();
    const prev = this.lastPlayed[key] ?? 0;
    if (now - prev < cooldownMs) return false;
    this.lastPlayed[key] = now;
    return true;
  }

  public setMuted(mute: boolean) {
    this.muted = mute;
    if (mute) {
      this.stopConstructionAmbience();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private tone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0
  ) {
    const audio = this.ensureContext();
    if (!audio) return;
    const { ctx, out } = audio;
    const now = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(35, freq), now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(35, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + Math.min(0.012, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private filteredNoise(
    duration: number,
    volume: number,
    cutoffHz: number,
    delay = 0,
    filterType: BiquadFilterType = 'lowpass',
    q = 1.0,
    decayFactor = 0.4
  ) {
    const audio = this.ensureContext();
    if (!audio) return;
    const { ctx, out } = audio;
    const now = ctx.currentTime + delay;

    const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / Math.max(1, sampleCount * decayFactor));
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(cutoffHz, now);
    filter.Q.setValueAtTime(q, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.0001, volume), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    src.start(now);
  }

  // ==================== TACTICAL COMMAND FEEDBACK ====================

  public playClick() {
    if (!this.canPlay('click', 35)) return;
    this.tone(620, 480, 0.036, 'sine', 0.06);
  }

  public playLaneSelect(lane: LaneId) {
    if (!this.canPlay('lane', 40)) return;
    const baseFreq = lane === 0 ? 680 : lane === 1 ? 570 : 475;
    this.tone(baseFreq, baseFreq * 0.92, 0.045, 'sine', 0.06);
  }

  public playStance(stance: LaneStance) {
    if (!this.canPlay('stance', 50)) return;
    if (stance === 'push') {
      this.tone(460, 560, 0.065, 'triangle', 0.065);
    } else if (stance === 'hold_tower') {
      this.tone(510, 510, 0.045, 'sine', 0.06);
      this.tone(510, 490, 0.055, 'sine', 0.05, 0.055);
    } else if (stance === 'defend_base') {
      this.tone(520, 440, 0.055, 'sine', 0.06);
      this.tone(440, 540, 0.065, 'sine', 0.055, 0.055);
    } else if (stance === 'all_in') {
      this.tone(500, 680, 0.065, 'triangle', 0.075);
      this.tone(680, 800, 0.075, 'triangle', 0.06, 0.055);
    } else {
      // 'retreat': unmistakable clean descending two-tone pullback confirmation
      this.tone(620, 520, 0.065, 'sine', 0.075);
      this.tone(470, 360, 0.095, 'sine', 0.07, 0.065);
    }
  }

  public playRecruit() {
    if (!this.canPlay('recruit', 45)) return;
    this.tone(450, 540, 0.055, 'sine', 0.06);
    this.tone(620, 680, 0.06, 'sine', 0.05, 0.048);
  }

  public playBuildStart() {
    if (!this.canPlay('build_start', 55)) return;
    const j = randRange(0.95, 1.06);
    this.tone(330 * j, 440 * j, 0.06, 'triangle', 0.065);
    this.tone(490 * j, 520 * j, 0.055, 'sine', 0.05, 0.05);
    this.filteredNoise(0.045, 0.028, 1200, 0.01, 'bandpass', 2.0);
  }

  public playBuildDone() {
    if (!this.canPlay('build_done', 140)) return;
    this.tone(523, 523, 0.075, 'sine', 0.065);
    this.tone(659, 659, 0.085, 'sine', 0.06, 0.07);
    this.tone(784, 784, 0.11, 'sine', 0.055, 0.14);
  }

  // Alias preserved for compatibility
  public playBuild() {
    this.playBuildDone();
  }

  public playResearchStart() {
    if (!this.canPlay('res_start', 55)) return;
    this.tone(460, 620, 0.075, 'sine', 0.06);
  }

  public playResearchDone() {
    if (!this.canPlay('res_done', 160)) return;
    this.tone(587, 587, 0.085, 'sine', 0.065);
    this.tone(880, 880, 0.14, 'sine', 0.06, 0.085);
  }

  public playScan() {
    if (!this.canPlay('scan', 120)) return;
    this.tone(820, 1080, 0.12, 'sine', 0.065);
    this.tone(1080, 760, 0.16, 'sine', 0.045, 0.1);
  }

  public playAmbush() {
    if (!this.canPlay('ambush', 120)) return;
    this.filteredNoise(0.09, 0.045, 1100);
    this.tone(320, 540, 0.11, 'triangle', 0.065, 0.02);
  }

  public playSkill() {
    if (!this.canPlay('skill', 120)) return;
    this.tone(490, 660, 0.08, 'triangle', 0.07);
    this.tone(660, 880, 0.12, 'sine', 0.065, 0.07);
  }

  public playDenied() {
    if (!this.canPlay('denied', 240)) return;
    this.tone(185, 145, 0.06, 'sine', 0.065);
    this.tone(145, 120, 0.065, 'sine', 0.055, 0.055);
  }

  public playAlert(urgent = false) {
    if (!this.canPlay(urgent ? 'alert_urgent' : 'alert', urgent ? 5500 : 7500)) return;
    if (urgent) {
      this.tone(720, 620, 0.085, 'triangle', 0.08);
      this.tone(720, 560, 0.11, 'triangle', 0.075, 0.11);
    } else {
      this.tone(620, 520, 0.085, 'sine', 0.06);
      this.tone(520, 480, 0.09, 'sine', 0.05, 0.1);
    }
  }

  public playEventHorn() {
    if (!this.canPlay('event_horn', 400)) return;
    this.tone(330, 330, 0.13, 'triangle', 0.075);
    this.tone(440, 440, 0.22, 'triangle', 0.07, 0.12);
  }

  public playCountdownTick(seconds: number) {
    if (!this.canPlay('countdown', 250)) return;
    const freq = seconds <= 1 ? 880 : seconds === 2 ? 660 : 523;
    this.tone(freq, freq * 1.03, 0.11, 'triangle', 0.09);
    this.tone(freq * 1.5, freq * 1.5, 0.07, 'sine', 0.045, 0.03);
  }

  public playAchievementUnlock() {
    if (!this.canPlay('achievement', 280)) return;
    this.tone(587.3, 587.3, 0.09, 'triangle', 0.075, 0);
    this.tone(784.0, 784.0, 0.1, 'triangle', 0.075, 0.075);
    this.tone(987.8, 987.8, 0.12, 'sine', 0.075, 0.15);
    this.tone(1174.7, 1174.7, 0.28, 'sine', 0.085, 0.23);
  }

  public playVictory(won: boolean) {
    this.stopConstructionAmbience();
    if (won) {
      this.tone(523, 523, 0.14, 'sine', 0.075, 0);
      this.tone(659, 659, 0.15, 'sine', 0.075, 0.11);
      this.tone(784, 784, 0.17, 'sine', 0.075, 0.22);
      this.tone(1046, 1046, 0.34, 'sine', 0.08, 0.34);
    } else {
      this.tone(440, 420, 0.18, 'sine', 0.07, 0);
      this.tone(370, 349, 0.2, 'sine', 0.065, 0.16);
      this.tone(294, 262, 0.32, 'sine', 0.065, 0.34);
    }
  }

  // ==================== RANDOMIZED UNIT MOVEMENT FOLEY ====================

  public playUnitMove(archetype: UnitAudioArchetype, movingCount = 1) {
    const cooldown =
      archetype === 'mech_heavy'
        ? 540
        : archetype === 'air_jet' || archetype === 'air_bio'
        ? 620
        : archetype === 'bio_swarm'
        ? 440
        : 520;
    if (!this.canPlay(`move_${archetype}`, cooldown)) return;
    if (!this.canPlay('move_global', 220)) return;

    const variant = pickVariant(3);
    const volScale = Math.min(1.25, 0.78 + movingCount * 0.08);
    const j = randRange(0.9, 1.12);

    switch (archetype) {
      case 'bio_human': {
        // Boot march cadence (2 soft gravel-step bursts with slight stride randomization)
        if (variant === 0) {
          this.filteredNoise(0.036, 0.022 * volScale, 1100 * j, 0, 'bandpass', 1.8);
          this.tone(95 * j, 62, 0.032, 'sine', 0.02 * volScale, 0);
          this.filteredNoise(0.032, 0.018 * volScale, 980 * j, 0.115, 'bandpass', 1.8);
        } else if (variant === 1) {
          this.filteredNoise(0.04, 0.02 * volScale, 860 * j, 0, 'bandpass', 1.5);
          this.tone(112 * j, 74, 0.028, 'triangle', 0.016 * volScale, 0.09);
        } else {
          this.filteredNoise(0.028, 0.018 * volScale, 1320 * j, 0, 'bandpass', 2.2);
          this.filteredNoise(0.032, 0.02 * volScale, 1050 * j, 0.095, 'bandpass', 1.9);
        }
        break;
      }
      case 'bio_psionic': {
        // Ethereal cloak glide / harmonic stride whisper
        if (variant === 0) {
          this.tone(540 * j, 680 * j, 0.09, 'sine', 0.018 * volScale);
          this.filteredNoise(0.075, 0.014 * volScale, 2100 * j, 0, 'bandpass', 3.0);
        } else if (variant === 1) {
          this.tone(420 * j, 510 * j, 0.08, 'triangle', 0.016 * volScale);
        } else {
          this.tone(640 * j, 520 * j, 0.075, 'sine', 0.017 * volScale);
          this.tone(960 * j, 820 * j, 0.06, 'sine', 0.01 * volScale, 0.02);
        }
        break;
      }
      case 'bio_swarm': {
        // Rapid organic chitin scuttling clicks
        const taps = variant === 0 ? 3 : 2;
        for (let i = 0; i < taps; i++) {
          const d = i * randRange(0.04, 0.065);
          this.filteredNoise(0.022, 0.02 * volScale, randRange(1500, 2400), d, 'bandpass', 3.2);
          if (variant === 2 && i === 0) {
            this.tone(240 * j, 165 * j, 0.03, 'triangle', 0.016 * volScale, d);
          }
        }
        break;
      }
      case 'mech_light': {
        // Crisp servo whirr + metallic step clack
        if (variant === 0) {
          this.tone(280 * j, 360 * j, 0.055, 'sawtooth', 0.014 * volScale);
          this.filteredNoise(0.028, 0.02 * volScale, 1750 * j, 0.03, 'bandpass', 2.4);
        } else if (variant === 1) {
          this.tone(190 * j, 145 * j, 0.045, 'triangle', 0.02 * volScale);
          this.tone(520 * j, 460 * j, 0.035, 'sine', 0.014 * volScale, 0.035);
        } else {
          this.filteredNoise(0.03, 0.018 * volScale, 1450 * j, 0, 'bandpass', 2.8);
          this.tone(340 * j, 270 * j, 0.05, 'triangle', 0.016 * volScale, 0.02);
        }
        break;
      }
      case 'mech_heavy': {
        // Heavy hydraulic stomp or tracked armor rumble
        if (variant === 0) {
          this.tone(86 * j, 48, 0.11, 'sine', 0.042 * volScale);
          this.filteredNoise(0.07, 0.024 * volScale, 420 * j, 0, 'lowpass', 1.2);
        } else if (variant === 1) {
          // Tracked clank + servo hiss
          this.tone(110 * j, 62, 0.085, 'triangle', 0.034 * volScale);
          this.filteredNoise(0.055, 0.02 * volScale, 920 * j, 0.03, 'bandpass', 2.1);
        } else {
          // Twin bipedal hydraulic step
          this.tone(92 * j, 52, 0.075, 'sine', 0.036 * volScale);
          this.tone(220 * j, 165 * j, 0.045, 'triangle', 0.016 * volScale, 0.025);
        }
        break;
      }
      case 'air_jet': {
        // Aerodynamic turbine hum & jet slipstream whoosh
        if (variant === 0) {
          this.filteredNoise(0.16, 0.022 * volScale, 920 * j, 0, 'bandpass', 1.6, 0.55);
          this.tone(260 * j, 340 * j, 0.13, 'sine', 0.018 * volScale);
        } else if (variant === 1) {
          this.filteredNoise(0.14, 0.02 * volScale, 1280 * j, 0, 'bandpass', 2.0, 0.5);
          this.tone(380 * j, 305 * j, 0.12, 'triangle', 0.015 * volScale);
        } else {
          this.tone(210 * j, 290 * j, 0.11, 'sine', 0.02 * volScale);
          this.filteredNoise(0.12, 0.018 * volScale, 760 * j, 0.02, 'bandpass', 1.4, 0.5);
        }
        break;
      }
      case 'air_bio': {
        // Organic leathery wing-flap air swoop
        if (variant === 0) {
          this.filteredNoise(0.11, 0.026 * volScale, 560 * j, 0, 'bandpass', 1.3, 0.52);
          this.tone(145 * j, 92 * j, 0.085, 'sine', 0.022 * volScale);
        } else if (variant === 1) {
          this.filteredNoise(0.095, 0.024 * volScale, 680 * j, 0, 'lowpass', 1.1, 0.48);
          this.filteredNoise(0.07, 0.015 * volScale, 490 * j, 0.07, 'bandpass', 1.4, 0.45);
        } else {
          this.tone(175 * j, 108 * j, 0.09, 'triangle', 0.02 * volScale);
          this.filteredNoise(0.1, 0.02 * volScale, 620 * j, 0.01, 'bandpass', 1.5, 0.5);
        }
        break;
      }
      case 'neutral_beast': {
        this.tone(76 * j, 45, 0.11, 'sine', 0.032 * volScale);
        this.filteredNoise(0.06, 0.02 * volScale, 380 * j, 0, 'lowpass', 1.0);
        break;
      }
    }
  }

  // ==================== RANDOMIZED COMBAT / ATTACK FEEDBACK ====================

  public playAttack(kind: AttackAudioKind = 'bullet', archetype?: UnitAudioArchetype) {
    const isHeavy = kind === 'shell' || kind === 'beam';
    if (!this.canPlay(isHeavy ? 'atk_heavy' : 'atk_light', isHeavy ? 120 : 82)) return;

    const variant = pickVariant(3);
    const j = randRange(0.9, 1.12);

    switch (kind) {
      case 'shell': {
        // Heavy mortar / artillery cannon (3 punchy randomized timbres)
        if (variant === 0) {
          this.tone(162 * j, 52, 0.12, 'sine', 0.088);
          this.filteredNoise(0.08, 0.048, 620 * j, 0, 'lowpass', 1.1);
        } else if (variant === 1) {
          this.tone(142 * j, 48, 0.135, 'triangle', 0.082);
          this.filteredNoise(0.095, 0.044, 780 * j, 0.008, 'bandpass', 1.2);
        } else {
          // Metallic breech thoomp + brief shell whistle
          this.tone(175 * j, 58, 0.105, 'sine', 0.085);
          this.tone(540 * j, 360 * j, 0.065, 'sine', 0.022, 0.02);
          this.filteredNoise(0.065, 0.04, 560 * j);
        }
        break;
      }
      case 'beam': {
        // Colossus solar thermal lance / radiant energy beam
        if (variant === 0) {
          this.tone(320 * j, 195 * j, 0.115, 'triangle', 0.065);
          this.tone(640 * j, 420 * j, 0.09, 'sine', 0.032, 0.01);
        } else if (variant === 1) {
          this.tone(285 * j, 385 * j, 0.105, 'sawtooth', 0.038);
          this.filteredNoise(0.09, 0.028, 1800 * j, 0, 'bandpass', 2.4);
        } else {
          this.tone(360 * j, 220 * j, 0.12, 'sine', 0.062);
          this.tone(720 * j, 540 * j, 0.08, 'triangle', 0.028, 0.015);
        }
        break;
      }
      case 'laser': {
        // Titan / Gunship / Valkyrie / Interceptor / Tower energy bolts
        if (variant === 0) {
          this.tone(820 * j, 320 * j, 0.062, 'sine', 0.052);
        } else if (variant === 1) {
          // Twin rapid pulse bolt
          this.tone(740 * j, 360 * j, 0.045, 'triangle', 0.045);
          this.tone(880 * j, 420 * j, 0.045, 'sine', 0.04, 0.036);
        } else {
          this.tone(920 * j, 280 * j, 0.068, 'sawtooth', 0.03);
          this.tone(460 * j, 210 * j, 0.055, 'sine', 0.035);
        }
        break;
      }
      case 'arrow': {
        // Star-Archer radiant energy bow
        if (variant === 0) {
          this.tone(960 * j, 460 * j, 0.045, 'sine', 0.044);
          this.filteredNoise(0.028, 0.018, 2600 * j, 0, 'bandpass', 2.6);
        } else if (variant === 1) {
          this.tone(1080 * j, 520 * j, 0.04, 'triangle', 0.04);
        } else {
          this.tone(880 * j, 420 * j, 0.048, 'sine', 0.042);
          this.tone(1320 * j, 780 * j, 0.03, 'sine', 0.02, 0.01);
        }
        break;
      }
      case 'orb': {
        // Acid spit (Swarm) vs Psionic disruptor orb
        if (archetype === 'bio_swarm' || archetype === 'air_bio') {
          if (variant === 0) {
            this.tone(360 * j, 180 * j, 0.072, 'triangle', 0.05);
            this.filteredNoise(0.055, 0.03, 1350 * j, 0, 'bandpass', 2.5);
          } else if (variant === 1) {
            this.tone(290 * j, 420 * j, 0.045, 'sine', 0.045);
            this.tone(420 * j, 175 * j, 0.05, 'sine', 0.04, 0.03);
          } else {
            this.filteredNoise(0.065, 0.034, 1650 * j, 0, 'bandpass', 3.0);
            this.tone(410 * j, 210 * j, 0.06, 'sine', 0.045);
          }
        } else {
          if (variant === 0) {
            this.tone(440 * j, 230 * j, 0.072, 'sine', 0.052);
          } else if (variant === 1) {
            this.tone(510 * j, 290 * j, 0.065, 'triangle', 0.048);
            this.tone(760 * j, 460 * j, 0.05, 'sine', 0.022, 0.012);
          } else {
            this.tone(390 * j, 260 * j, 0.078, 'sine', 0.05);
          }
        }
        break;
      }
      case 'flame': {
        // Flamer roaring pressurized fire jet (3 flame burst variations)
        const cutoff = variant === 0 ? 1150 : variant === 1 ? 1480 : 940;
        this.filteredNoise(0.125, 0.058, cutoff * j, 0, 'bandpass', 1.15, 0.55);
        this.tone(140 * j, 82 * j, 0.095, 'sawtooth', 0.024);
        break;
      }
      case 'melee': {
        if (archetype === 'bio_psionic') {
          // Psionic energy blade slash
          if (variant === 0) {
            this.tone(680 * j, 260 * j, 0.058, 'triangle', 0.052);
            this.filteredNoise(0.04, 0.024, 2400 * j, 0, 'bandpass', 2.8);
          } else if (variant === 1) {
            this.tone(820 * j, 340 * j, 0.052, 'sine', 0.05);
            this.tone(410 * j, 190 * j, 0.045, 'triangle', 0.032, 0.012);
          } else {
            this.tone(580 * j, 310 * j, 0.055, 'sawtooth', 0.028);
            this.filteredNoise(0.038, 0.022, 2000 * j, 0, 'bandpass', 2.5);
          }
        } else if (archetype === 'bio_swarm') {
          // Sharp chitin claw rip / snap
          if (variant === 0) {
            this.filteredNoise(0.042, 0.034, 1850 * j, 0, 'bandpass', 2.2);
            this.tone(310 * j, 125 * j, 0.045, 'sawtooth', 0.028);
          } else if (variant === 1) {
            this.tone(265 * j, 110 * j, 0.052, 'triangle', 0.046);
            this.filteredNoise(0.035, 0.03, 1450 * j, 0.01, 'bandpass', 2.0);
          } else {
            this.filteredNoise(0.048, 0.036, 2200 * j, 0, 'bandpass', 2.8);
            this.tone(215 * j, 95 * j, 0.04, 'sine', 0.042);
          }
        } else {
          // Shield bash / heavy physical strike
          if (variant === 0) {
            this.tone(235 * j, 96, 0.05, 'triangle', 0.052);
            this.filteredNoise(0.034, 0.028, 950 * j);
          } else if (variant === 1) {
            this.tone(195 * j, 78, 0.058, 'sine', 0.058);
            this.filteredNoise(0.04, 0.03, 760 * j);
          } else {
            this.tone(275 * j, 115, 0.044, 'triangle', 0.048);
            this.filteredNoise(0.03, 0.024, 1250 * j);
          }
        }
        break;
      }
      case 'bullet':
      default: {
        // Tactical rifle / elite carbine crack (3 randomized burst variants)
        if (variant === 0) {
          this.tone(540 * j, 180 * j, 0.045, 'triangle', 0.05);
          this.filteredNoise(0.026, 0.024, 1900 * j, 0, 'bandpass', 1.8);
        } else if (variant === 1) {
          // Crisp double-tap rifle burst
          this.tone(590 * j, 210 * j, 0.035, 'triangle', 0.044);
          this.tone(560 * j, 195 * j, 0.035, 'triangle', 0.038, 0.042);
          this.filteredNoise(0.024, 0.02, 2100 * j, 0, 'bandpass', 2.0);
        } else {
          // Punchy suppressed carbine pop
          this.tone(460 * j, 155 * j, 0.05, 'sine', 0.054);
          this.filteredNoise(0.03, 0.026, 1550 * j, 0, 'bandpass', 1.6);
        }
        break;
      }
    }
  }

  public playShot(heavy = false) {
    this.playAttack(heavy ? 'shell' : 'bullet');
  }

  // ==================== RANDOMIZED UNIT DEATH FEEDBACK ====================

  public playUnitDeath(archetype: UnitAudioArchetype, isBoss = false) {
    if (isBoss) {
      if (!this.canPlay('death_boss', 260)) return;
      this.tone(125, 38, 0.34, 'sine', 0.11);
      this.tone(240, 62, 0.28, 'triangle', 0.07, 0.04);
      this.filteredNoise(0.32, 0.1, 520, 0, 'lowpass', 1.1, 0.45);
      return;
    }

    const cooldown = archetype === 'mech_heavy' || archetype === 'air_jet' ? 150 : 115;
    if (!this.canPlay(`death_${archetype}`, cooldown)) return;
    if (!this.canPlay('death_global', 75)) return;

    const variant = pickVariant(3);
    const j = randRange(0.88, 1.14);

    switch (archetype) {
      case 'bio_human': {
        // Brief tactical comms static + armored drop thud
        if (variant === 0) {
          this.tone(210 * j, 82, 0.085, 'sine', 0.048);
          this.filteredNoise(0.065, 0.03, 1850 * j, 0.01, 'bandpass', 2.6);
        } else if (variant === 1) {
          this.tone(175 * j, 68, 0.095, 'triangle', 0.046);
          this.filteredNoise(0.05, 0.026, 1400 * j, 0, 'bandpass', 2.2);
        } else {
          this.filteredNoise(0.07, 0.028, 2200 * j, 0, 'bandpass', 3.0);
          this.tone(155 * j, 64, 0.08, 'sine', 0.045, 0.015);
        }
        break;
      }
      case 'bio_psionic': {
        // Crystalline warp-dissolve / psionic shield shatter
        if (variant === 0) {
          this.tone(860 * j, 340 * j, 0.14, 'sine', 0.048);
          this.tone(1240 * j, 520 * j, 0.11, 'triangle', 0.028, 0.02);
        } else if (variant === 1) {
          this.tone(740 * j, 260 * j, 0.15, 'triangle', 0.046);
          this.filteredNoise(0.08, 0.024, 2800 * j, 0, 'bandpass', 3.2);
        } else {
          this.tone(980 * j, 410 * j, 0.12, 'sine', 0.044);
          this.tone(620 * j, 240 * j, 0.13, 'sine', 0.036, 0.03);
        }
        break;
      }
      case 'bio_swarm': {
        // Wet organic carapace pop & acidic splat
        if (variant === 0) {
          this.tone(340 * j, 105 * j, 0.09, 'triangle', 0.052);
          this.filteredNoise(0.085, 0.042, 1300 * j, 0.01, 'bandpass', 2.2);
        } else if (variant === 1) {
          this.tone(240 * j, 420 * j, 0.03, 'sine', 0.045);
          this.tone(420 * j, 95 * j, 0.085, 'sine', 0.048, 0.025);
          this.filteredNoise(0.075, 0.038, 1650 * j, 0.02, 'bandpass', 2.8);
        } else {
          this.filteredNoise(0.095, 0.046, 980 * j, 0, 'lowpass', 1.3);
          this.tone(285 * j, 88 * j, 0.08, 'sawtooth', 0.026);
        }
        break;
      }
      case 'mech_light': {
        // Metallic crunch + short servo power-down
        if (variant === 0) {
          this.tone(360 * j, 110 * j, 0.11, 'sawtooth', 0.032);
          this.filteredNoise(0.09, 0.044, 1150 * j, 0, 'bandpass', 1.8);
        } else if (variant === 1) {
          this.tone(210 * j, 74, 0.12, 'triangle', 0.056);
          this.filteredNoise(0.085, 0.042, 820 * j, 0.015, 'lowpass', 1.2);
        } else {
          this.tone(480 * j, 145 * j, 0.1, 'triangle', 0.042);
          this.filteredNoise(0.07, 0.038, 1650 * j, 0, 'bandpass', 2.4);
        }
        break;
      }
      case 'mech_heavy': {
        // Heavy armor detonation + sub-bass reactor thump + secondary spark
        if (variant === 0) {
          this.tone(132 * j, 42, 0.2, 'sine', 0.09);
          this.filteredNoise(0.18, 0.072, 540 * j, 0, 'lowpass', 1.1);
          this.tone(310 * j, 95 * j, 0.11, 'sawtooth', 0.026, 0.04);
        } else if (variant === 1) {
          this.tone(112 * j, 38, 0.22, 'triangle', 0.085);
          this.filteredNoise(0.19, 0.068, 680 * j, 0.01, 'lowpass', 1.0);
        } else {
          // Two-stage heavy mech collapse
          this.tone(150 * j, 54, 0.13, 'sine', 0.078);
          this.tone(102 * j, 38, 0.18, 'sine', 0.075, 0.07);
          this.filteredNoise(0.2, 0.068, 480 * j, 0.02, 'lowpass', 1.1);
        }
        break;
      }
      case 'air_jet': {
        // Descending turbine whine + mid-air hull pop
        if (variant === 0) {
          this.tone(620 * j, 145 * j, 0.16, 'sine', 0.046);
          this.filteredNoise(0.14, 0.056, 840 * j, 0.045, 'lowpass', 1.2);
        } else if (variant === 1) {
          this.tone(520 * j, 115 * j, 0.15, 'triangle', 0.048);
          this.tone(135 * j, 48, 0.14, 'sine', 0.065, 0.05);
          this.filteredNoise(0.13, 0.052, 720 * j, 0.04, 'lowpass', 1.1);
        } else {
          this.tone(740 * j, 185 * j, 0.13, 'sawtooth', 0.024);
          this.filteredNoise(0.15, 0.058, 980 * j, 0.03, 'bandpass', 1.4);
        }
        break;
      }
      case 'air_bio': {
        // Organic flyer shriek fade + wet fall burst
        if (variant === 0) {
          this.tone(560 * j, 175 * j, 0.14, 'triangle', 0.048);
          this.filteredNoise(0.11, 0.042, 1120 * j, 0.03, 'bandpass', 2.0);
        } else if (variant === 1) {
          this.tone(480 * j, 130 * j, 0.15, 'sawtooth', 0.024);
          this.filteredNoise(0.12, 0.044, 920 * j, 0.02, 'lowpass', 1.2);
        } else {
          this.tone(640 * j, 220 * j, 0.12, 'sine', 0.046);
          this.tone(220 * j, 85 * j, 0.1, 'triangle', 0.042, 0.045);
        }
        break;
      }
      case 'neutral_beast': {
        this.tone(138 * j, 48, 0.16, 'sine', 0.07);
        this.filteredNoise(0.14, 0.052, 580 * j, 0, 'lowpass', 1.1);
        break;
      }
    }
  }

  public playImpact(heavy = false) {
    if (!this.canPlay(heavy ? 'impact_heavy' : 'impact_light', heavy ? 170 : 135)) return;
    const jitter = 0.92 + Math.random() * 0.16;
    if (heavy) {
      this.tone(140 * jitter, 56, 0.095, 'sine', 0.075);
      this.filteredNoise(0.06, 0.045, 580);
    } else {
      this.tone(205 * jitter, 95, 0.052, 'sine', 0.045);
    }
  }

  public playExplosion() {
    if (!this.canPlay('explosion', 200)) return;
    const j = randRange(0.92, 1.08);
    this.tone(105 * j, 42, 0.21, 'sine', 0.1);
    this.filteredNoise(0.22, 0.095, 420 * j);
  }

  // ==================== BUILDING CONSTRUCTION AMBIENCE ====================

  private ensureBuildAmbienceGraph() {
    if (this.buildAmbGain) return;
    const audio = this.ensureContext();
    if (!audio) return;
    const { ctx, out } = audio;

    // 2-second seamless filtered noise bed for subtle welding/construction atmosphere
    const sampleCount = Math.floor(ctx.sampleRate * 2.0);
    const buf = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < sampleCount; i++) {
      // Soft pink/brownian noise texture so it sounds like warm industrial machinery, never harsh static
      const white = Math.random() * 2 - 1;
      last = (last + 0.08 * white) / 1.08;
      ch[i] = last * 2.2;
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buf;
    noiseSrc.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 340;
    filter.Q.value = 1.6;

    const humOsc = ctx.createOscillator();
    humOsc.type = 'triangle';
    humOsc.frequency.value = 110;

    const humGain = ctx.createGain();
    humGain.gain.value = 0.28;

    const ambGain = ctx.createGain();
    ambGain.gain.value = 0.0001;

    noiseSrc.connect(filter);
    filter.connect(ambGain);
    humOsc.connect(humGain);
    humGain.connect(ambGain);
    ambGain.connect(out);

    noiseSrc.start();
    humOsc.start();

    this.buildAmbNoise = noiseSrc;
    this.buildAmbHumOsc = humOsc;
    this.buildAmbFilter = filter;
    this.buildAmbGain = ambGain;
  }

  private playBuildAccentFoley(faction: FactionId) {
    const variant = pickVariant(3);
    const j = randRange(0.92, 1.09);

    if (faction === 'dawn') {
      // Golden warp-crystal harmonic resonance & light chimes
      if (variant === 0) {
        this.tone(528 * j, 540 * j, 0.22, 'sine', 0.018);
        this.tone(792 * j, 792 * j, 0.16, 'sine', 0.012, 0.04);
      } else if (variant === 1) {
        this.tone(660 * j, 720 * j, 0.18, 'triangle', 0.015);
      } else {
        this.tone(440 * j, 660 * j, 0.24, 'sine', 0.014);
      }
      return;
    }

    if (faction === 'swarm') {
      // Organic hive heartbeat pulse & chitin growth squelches
      if (variant === 0) {
        this.tone(92 * j, 64, 0.14, 'sine', 0.028);
        this.tone(86 * j, 58, 0.12, 'sine', 0.02, 0.14);
      } else if (variant === 1) {
        this.filteredNoise(0.08, 0.018, 920 * j, 0, 'bandpass', 2.8);
        this.tone(180 * j, 120 * j, 0.09, 'triangle', 0.018);
      } else {
        this.filteredNoise(0.095, 0.016, 1280 * j, 0, 'bandpass', 3.4);
      }
      return;
    }

    // Ironbound (default): Pneumatic rivet hits, metallic clinks & arc-welding sizzle
    if (variant === 0) {
      // Double metallic hammer / rivet tap
      this.tone(680 * j, 420 * j, 0.042, 'triangle', 0.02);
      this.filteredNoise(0.032, 0.016, 2200 * j, 0, 'bandpass', 3.0);
      this.tone(720 * j, 460 * j, 0.04, 'triangle', 0.017, 0.13);
    } else if (variant === 1) {
      // Arc-welding crackle sizzle
      this.filteredNoise(0.14, 0.02, 2600 * j, 0, 'bandpass', 2.5, 0.65);
      this.tone(240 * j, 220 * j, 0.12, 'sawtooth', 0.009);
    } else {
      // Hydraulic crane servo whirr
      this.tone(185 * j, 245 * j, 0.15, 'triangle', 0.018);
      this.filteredNoise(0.06, 0.014, 1100 * j, 0.04, 'bandpass', 2.0);
    }
  }

  /**
   * Call periodically from the active battle loop / remote frame sync to drive continuous
   * faction-appropriate building construction ambience and occasional welding/chime/hive foley.
   */
  public updateConstructionAmbience(activeCount: number, faction: FactionId, isPlaying: boolean) {
    if (typeof window === 'undefined') return;
    const shouldRun = !this.muted && isPlaying && activeCount > 0;
    this.buildAmbCount = activeCount;
    this.buildAmbFaction = faction;

    if (!shouldRun) {
      this.stopConstructionAmbience();
      return;
    }

    // Only activate AudioContext once the user has interacted and ctx exists (avoid autoplay warnings)
    if (!this.ctx || this.ctx.state !== 'running') return;
    this.ensureBuildAmbienceGraph();
    if (!this.buildAmbGain || !this.buildAmbFilter || !this.buildAmbHumOsc) return;

    const now = this.ctx.currentTime;
    // Tune ambient texture per faction
    if (faction === 'dawn') {
      this.buildAmbFilter.frequency.setTargetAtTime(620, now, 0.15);
      this.buildAmbHumOsc.frequency.setTargetAtTime(220, now, 0.15);
    } else if (faction === 'swarm') {
      this.buildAmbFilter.frequency.setTargetAtTime(220, now, 0.15);
      this.buildAmbHumOsc.frequency.setTargetAtTime(76, now, 0.15);
    } else {
      this.buildAmbFilter.frequency.setTargetAtTime(340, now, 0.15);
      this.buildAmbHumOsc.frequency.setTargetAtTime(112, now, 0.15);
    }

    // Subtle, non-fatiguing ambient bed volume scaled smoothly by concurrent construction count
    const targetGain = Math.min(0.042, 0.02 + Math.min(3, activeCount - 1) * 0.007);
    if (!this.buildAmbActive) {
      this.buildAmbActive = true;
      this.nextBuildAccentAt = this.nowMs() + randRange(500, 1100);
    }
    this.buildAmbGain.gain.setTargetAtTime(targetGain, now, 0.18);

    // Schedule occasional randomized construction foley accents
    const nowMs = this.nowMs();
    if (nowMs >= this.nextBuildAccentAt) {
      this.playBuildAccentFoley(this.buildAmbFaction);
      const paceScale = Math.max(0.62, 1 - Math.min(3, this.buildAmbCount - 1) * 0.12);
      this.nextBuildAccentAt = nowMs + randRange(1050, 2250) * paceScale;
    }
  }

  public stopConstructionAmbience() {
    this.buildAmbActive = false;
    if (this.ctx && this.buildAmbGain) {
      const now = this.ctx.currentTime;
      this.buildAmbGain.gain.setTargetAtTime(0.0001, now, 0.12);
    }
  }
}

export const tacticalAudio = new TacticalAudio();
