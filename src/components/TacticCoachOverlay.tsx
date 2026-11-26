import React from 'react';
import { Check, ChevronDown, ChevronUp, Compass, FastForward, MapPin, X } from 'lucide-react';
import { AI_ARCHETYPE_ORDER } from '../game/data';
import { TACTIC_PLAYBOOK_META, TacticCoachStepView } from '../game/tacticCoach';
import { AIArchetype } from '../game/types';

interface TacticCoachOverlayProps {
  tactic: AIArchetype;
  step: TacticCoachStepView;
  collapsed: boolean;
  onChangeTactic: (next: AIArchetype) => void;
  onToggleCollapse: () => void;
  onSkipStep: () => void;
  onDisableGuide: () => void;
}

export const TacticCoachOverlay: React.FC<TacticCoachOverlayProps> = ({
  tactic,
  step,
  collapsed,
  onChangeTactic,
  onToggleCollapse,
  onSkipStep,
  onDisableGuide,
}) => {
  const meta = TACTIC_PLAYBOOK_META[tactic];
  const progressRatio = step.stepNumber / step.totalSteps;
  const isLastStep = step.stepNumber === step.totalSteps;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[48px] lg:top-[54px] z-25 flex flex-col items-center px-2 sm:px-4">
      <div className="pointer-events-auto w-full max-w-[560px] rounded-lg bg-[#0D1520]/94 border border-amber-400/50 shadow-xl overflow-hidden">
        {/* Progress hairline */}
        <div className="h-1 w-full bg-slate-800/90">
          <div
            className="h-full bg-amber-400 transition-transform duration-200 origin-left"
            style={{ transform: `scaleX(${progressRatio})` }}
          />
        </div>

        {/* Compact Header Strip */}
        <div className="px-3 py-1.5 flex items-center justify-between gap-2 border-b border-slate-800/80">
          <div className="flex items-center gap-1.5 min-w-0">
            <Compass className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="font-mono-num text-[11px] font-bold text-amber-300 whitespace-nowrap">
              {meta.shortName} {step.stepNumber}/{step.totalSteps}
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="text-xs font-bold text-slate-50 truncate">
              {step.allDone ? '全套戰術執行完畢！自由收割戰局' : step.title}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!isLastStep && !step.allDone && (
              <button
                type="button"
                onClick={onSkipStep}
                title="跳至下一步指示"
                className="px-1.5 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-[10.5px] font-medium text-slate-200 flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
              >
                <FastForward className="w-3 h-3 text-amber-300 shrink-0" />
                <span className="hidden sm:inline">下一步</span>
              </button>
            )}
            <button
              type="button"
              onClick={onToggleCollapse}
              title={collapsed ? '展開戰術索引' : '收合戰術索引'}
              className="px-1.5 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-[10.5px] font-medium text-slate-300 flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
            >
              {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{collapsed ? '展開' : '收合'}</span>
            </button>
            <button
              type="button"
              onClick={onDisableGuide}
              title="已熟練，關閉新手戰術索引（之後可在大廳或頂部重新開啟）"
              className="px-1.5 py-0.5 rounded bg-slate-800/90 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/60 text-[10.5px] font-medium text-slate-300 hover:text-rose-200 flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
            >
              <X className="w-3 h-3 shrink-0" />
              <span>熟練關閉</span>
            </button>
          </div>
        </div>

        {/* Collapsible Body */}
        {!collapsed && (
          <div className="px-3 py-2 space-y-1.5 text-xs">
            {/* 5-Tactic Instant Switcher Strip */}
            <div className="flex flex-wrap items-center gap-1 pb-1 border-b border-slate-800/75">
              {AI_ARCHETYPE_ORDER.map((arch) => {
                const item = TACTIC_PLAYBOOK_META[arch];
                const active = arch === tactic;
                return (
                  <button
                    key={arch}
                    type="button"
                    onClick={() => onChangeTactic(arch)}
                    className={`px-2 py-0.5 rounded text-[10.5px] transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-amber-300 text-slate-950 font-bold'
                        : 'bg-[#090F17] text-slate-400 hover:text-slate-100 border border-slate-800'
                    }`}
                  >
                    {item.badge} {item.shortName}
                  </button>
                );
              })}
            </div>

            {/* Map Direction Badge */}
            <div className="flex items-start gap-1.5 text-[11px] text-sky-200 bg-sky-950/45 border border-sky-500/35 rounded px-2 py-1">
              <MapPin className="w-3.5 h-3.5 text-sky-300 shrink-0 mt-0.5" />
              <span>
                <span className="font-semibold text-sky-300 mr-1">地圖動向：</span>
                {step.mapDirection}
              </span>
            </div>

            {/* Action Guidance */}
            <p className="text-slate-100 leading-relaxed">{step.actionSummary}</p>

            {/* Live Checklist */}
            <div className="space-y-1">
              {step.checks.map((chk, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 text-[11.5px] ${
                    chk.done ? 'text-emerald-300' : 'text-amber-200'
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                      chk.done
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                        : 'bg-[#090E16] border-amber-400/70 text-transparent'
                    }`}
                  >
                    <Check className="w-2.5 h-2.5" />
                  </span>
                  <span className={chk.done ? 'line-through opacity-75' : 'font-medium'}>
                    {chk.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Hotkey Strip */}
            <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[10.5px]">
              <span className="text-slate-400 truncate">{meta.focusTag}</span>
              <span className="font-mono-num text-amber-300 whitespace-nowrap">{step.hotkeys}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
