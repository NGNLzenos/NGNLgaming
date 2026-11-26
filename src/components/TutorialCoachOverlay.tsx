import React from 'react';
import { Check, ChevronDown, ChevronUp, FastForward, GraduationCap, X } from 'lucide-react';
import { TUTORIAL_STEPS, TutorialCheckItem, TutorialStepDef } from '../game/tutorial';

interface TutorialCoachOverlayProps {
  step: TutorialStepDef;
  checks: TutorialCheckItem[];
  collapsed: boolean;
  rewardToast: string | null;
  onToggleCollapse: () => void;
  onSkipStep: () => void;
  onExitGuide: () => void;
}

export const TutorialCoachOverlay: React.FC<TutorialCoachOverlayProps> = ({
  step,
  checks,
  collapsed,
  rewardToast,
  onToggleCollapse,
  onSkipStep,
  onExitGuide,
}) => {
  const totalSteps = TUTORIAL_STEPS.length;
  const progressRatio = step.stepNumber / totalSteps;
  const isLastStep = step.stepNumber === totalSteps;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[48px] lg:top-[54px] z-25 flex flex-col items-center px-2 sm:px-4 gap-1.5">
      {rewardToast && (
        <div className="px-3 py-1 rounded bg-emerald-950/95 border border-emerald-400/70 text-xs font-semibold text-emerald-200 shadow-lg">
          {rewardToast}
        </div>
      )}

      <div className="pointer-events-auto w-full max-w-[540px] rounded-lg bg-[#0D1520]/95 border border-sky-400/55 shadow-xl overflow-hidden">
        {/* Progress hairline */}
        <div className="h-1 w-full bg-slate-800/90">
          <div
            className="h-full bg-sky-400 transition-transform duration-200 origin-left"
            style={{ transform: `scaleX(${progressRatio})` }}
          />
        </div>

        {/* Header Strip */}
        <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2 min-w-0">
            <GraduationCap className="w-4 h-4 text-sky-300 shrink-0" />
            <span className="font-mono-num text-[11px] font-semibold text-sky-300 whitespace-nowrap">
              新手教學 {step.stepNumber}/{totalSteps}
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="text-xs sm:text-sm font-bold text-slate-50 truncate">
              {step.title}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!isLastStep && (
              <button
                type="button"
                onClick={onSkipStep}
                title="跳過此步驟並進入下一課 (F2)"
                className="px-2 py-1 rounded bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-[11px] font-medium text-slate-200 flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <FastForward className="w-3 h-3 text-amber-300 shrink-0" />
                <span>[F2]跳過</span>
              </button>
            )}
            <button
              type="button"
              onClick={onToggleCollapse}
              title={collapsed ? '展開教學指引 (F1)' : '收合教學指引 (F1)'}
              className="px-2 py-1 rounded bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-[11px] font-medium text-slate-300 flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
            >
              {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">[F1]{collapsed ? '展開' : '收合'}</span>
            </button>
            <button
              type="button"
              onClick={onExitGuide}
              title="結束教學指引並轉為自由對戰 (F3)"
              className="px-2 py-1 rounded bg-slate-800/90 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/60 text-[11px] font-medium text-slate-300 hover:text-rose-200 flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
            >
              <X className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">[F3]結束</span>
            </button>
          </div>
        </div>

        {/* Collapsible Body */}
        {!collapsed && (
          <div className="px-3.5 py-2.5 space-y-2 text-xs">
            <p className="text-slate-100 leading-relaxed">{step.summary}</p>

            {/* Live Objective Checklist */}
            <div className="space-y-1">
              {checks.map((chk, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 text-xs ${
                    chk.done ? 'text-emerald-300' : 'text-amber-200'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${
                      chk.done
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                        : 'bg-[#090E16] border-amber-400/70 text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3" />
                  </span>
                  <span className={chk.done ? 'line-through opacity-80' : 'font-medium'}>
                    {chk.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer Tip & Hotkey Bar */}
            <div className="pt-1.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px]">
              <span className="text-slate-400 leading-snug">{step.tip}</span>
              <span className="font-mono-num text-sky-300 whitespace-nowrap">
                {step.hotkeys}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
