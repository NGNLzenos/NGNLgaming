import React from 'react';
import { HoverInspectData } from '../game/hoverInspect';

interface BattleHoverTooltipProps {
  data: HoverInspectData;
  x: number;
  y: number;
}

const VALUE_TONE_CLASS = {
  default: 'text-slate-100',
  amber: 'text-amber-300',
  rose: 'text-rose-300',
  emerald: 'text-emerald-300',
  sky: 'text-sky-300',
  violet: 'text-violet-300',
};

export const BattleHoverTooltip: React.FC<BattleHoverTooltipProps> = ({ data, x, y }) => {
  const cardWidth = 276;
  const approxHeight = 225;
  const pad = 14;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 720;

  let left = x + 18;
  if (left + cardWidth + pad > vw) {
    left = Math.max(pad, x - cardWidth - 18);
  }
  let top = y + 16;
  if (top + approxHeight + pad > vh) {
    top = Math.max(54, y - approxHeight - 14);
  }

  const borderClass =
    data.tone === 'enemy'
      ? 'border-rose-500/75 shadow-[0_8px_28px_rgba(244,63,94,0.2)]'
      : data.tone === 'neutral'
      ? 'border-amber-400/75 shadow-[0_8px_28px_rgba(251,191,36,0.18)]'
      : 'border-sky-400/70 shadow-[0_8px_28px_rgba(56,189,248,0.18)]';

  const badgeClass =
    data.tone === 'enemy'
      ? 'bg-rose-500/20 text-rose-200 border-rose-400/50'
      : data.tone === 'neutral'
      ? 'bg-amber-400/20 text-amber-200 border-amber-400/50'
      : 'bg-sky-400/20 text-sky-200 border-sky-400/50';

  const hpPct =
    data.hp !== undefined && data.maxHp && data.maxHp > 0
      ? Math.max(0, Math.min(100, (data.hp / data.maxHp) * 100))
      : null;
  const shieldPct =
    data.shield !== undefined && data.maxShield && data.maxShield > 0
      ? Math.max(0, Math.min(100, (data.shield / data.maxShield) * 100))
      : null;

  return (
    <div
      className={`pointer-events-none fixed z-[45] w-[276px] rounded-lg bg-[#0B121C]/96 border backdrop-blur-sm p-2.5 text-slate-100 space-y-2 ${borderClass}`}
      style={{ left: `${Math.round(left)}px`, top: `${Math.round(top)}px` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-50 leading-tight truncate">{data.title}</div>
          <div className="text-[10.5px] text-slate-400 truncate mt-0.5">{data.subtitle}</div>
        </div>
        <span
          className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold whitespace-nowrap shrink-0 ${badgeClass}`}
        >
          {data.badgeText}
        </span>
      </div>

      {/* Status Alert Banner (Construction Fragility / Upgrade / Harass / Fire Reveal) */}
      {data.statusBanner && (
        <div
          className={`px-2 py-1 rounded text-[10.5px] font-semibold leading-snug border ${
            data.statusBanner.tone === 'critical'
              ? 'bg-rose-950/85 border-rose-500/65 text-rose-200'
              : data.statusBanner.tone === 'warn'
              ? 'bg-amber-950/85 border-amber-500/65 text-amber-200'
              : 'bg-sky-950/80 border-sky-500/55 text-sky-200'
          }`}
        >
          {data.statusBanner.text}
        </div>
      )}

      {/* Live HP & Shield Bars */}
      {hpPct !== null && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10.5px] font-mono-num">
            <span className="text-slate-400">生命值</span>
            <span className="font-semibold text-slate-100">
              {data.hp} / {data.maxHp}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${
                data.tone === 'enemy'
                  ? 'bg-rose-400'
                  : data.tone === 'neutral'
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
          {shieldPct !== null && (
            <>
              <div className="flex items-center justify-between text-[10.5px] font-mono-num pt-0.5">
                <span className="text-cyan-300">護盾值</span>
                <span className="font-semibold text-cyan-200">
                  {data.shield} / {data.maxShield}
                </span>
              </div>
              <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-100"
                  style={{ width: `${shieldPct}%` }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Attribute Tags */}
      {data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-1.5 py-0.5 rounded bg-slate-800/90 border border-slate-700/80 text-[10px] text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Detailed Stat Grid */}
      {data.stats.length > 0 && (
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 pt-1 border-t border-slate-800/90 text-[10.5px]">
          {data.stats.map((st, idx) => (
            <div key={idx} className="flex flex-col">
              <span className="text-slate-500 text-[9.5px]">{st.label}</span>
              <span className={`font-mono-num font-semibold ${VALUE_TONE_CLASS[st.tone ?? 'default']}`}>
                {st.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Bonus Damage vs Tags */}
      {data.bonuses.length > 0 && (
        <div className="text-[10.5px] text-amber-200 bg-amber-950/45 border border-amber-500/35 rounded px-2 py-1 font-mono-num">
          特攻加成：{data.bonuses.join(' · ')}
        </div>
      )}

      {/* Notes */}
      {data.notes.length > 0 && (
        <div className="pt-1 border-t border-slate-800/90 space-y-0.5 text-[10.5px] text-slate-300 leading-snug">
          {data.notes.slice(0, 3).map((note, idx) => (
            <div key={idx}>{note}</div>
          ))}
        </div>
      )}
    </div>
  );
};
