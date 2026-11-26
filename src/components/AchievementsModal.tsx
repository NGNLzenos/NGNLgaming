import React, { useMemo, useState } from 'react';
import { Award, CheckCircle2, Lock, Trophy, X } from 'lucide-react';
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  ACHIEVEMENT_DEFS,
  ACHIEVEMENT_TIER_META,
  AchievementCategory,
  AchievementStore,
  getAchievementSummary,
} from '../game/achievements';

interface AchievementsModalProps {
  open: boolean;
  store: AchievementStore;
  onClose: () => void;
}

type FilterTab = 'all' | AchievementCategory;

function formatDuration(sec: number | null): string {
  if (sec === null) return '尚無紀錄';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatUnlockDate(ts: number): string {
  try {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  } catch {
    return '已解鎖';
  }
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ open, store, onClose }) => {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [onlyUnlocked, setOnlyUnlocked] = useState(false);

  const summary = useMemo(() => getAchievementSummary(store), [store]);

  const filteredDefs = useMemo(() => {
    return ACHIEVEMENT_DEFS.filter((def) => {
      if (filter !== 'all' && def.category !== filter) return false;
      if (onlyUnlocked && !store.unlocked[def.id]) return false;
      return true;
    }).sort((a, b) => {
      const ua = store.unlocked[a.id] ? 1 : 0;
      const ub = store.unlocked[b.id] ? 1 : 0;
      if (ua !== ub) return ub - ua;
      return 0;
    });
  }, [filter, onlyUnlocked, store.unlocked]);

  if (!open) return null;

  const overallPct = summary.totalCount > 0 ? Math.round((summary.unlockedCount / summary.totalCount) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[88dvh] flex flex-col rounded-xl bg-[#0D131C] border border-slate-700/80 shadow-2xl text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-800 bg-[#101826]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-amber-400/15 border border-amber-400/45 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-50 truncate">指揮官戰績與成就系統</h2>
              <p className="text-xs text-slate-400 truncate">
                所有進度自動儲存在本機瀏覽器 · 沙盒測試模式不計入勝利成就
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="關閉成就視窗"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Career Summary & Progress Bar */}
        <div className="px-5 py-4 border-b border-slate-800/90 bg-[#0B1018] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-4 flex-wrap">
              <div>
                <span className="text-xs text-slate-400">已解鎖成就</span>
                <div className="text-xl font-bold font-mono-num text-amber-300">
                  {summary.unlockedCount} / {summary.totalCount}
                  <span className="ml-2 text-xs font-normal text-slate-400">({overallPct}%)</span>
                </div>
              </div>
              <div className="h-7 w-px bg-slate-800 hidden sm:block" />
              <div>
                <span className="text-xs text-slate-400">成就總積分</span>
                <div className="text-xl font-bold font-mono-num text-sky-300">
                  {summary.points}
                  <span className="text-xs font-normal text-slate-500"> / {summary.maxPoints} pts</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono-num">
              <div className="px-2.5 py-1.5 rounded-md bg-slate-900/90 border border-slate-800">
                <div className="text-[10.5px] text-slate-400">正規勝場</div>
                <div className="text-sm font-bold text-slate-100">{store.stats.totalMatchesWon} 勝</div>
              </div>
              <div className="px-2.5 py-1.5 rounded-md bg-slate-900/90 border border-slate-800">
                <div className="text-[10.5px] text-slate-400">最速奪勝</div>
                <div className="text-sm font-bold text-emerald-300">{formatDuration(store.stats.fastestWinSec)}</div>
              </div>
              <div className="px-2.5 py-1.5 rounded-md bg-slate-900/90 border border-slate-800">
                <div className="text-[10.5px] text-slate-400">累計建塔</div>
                <div className="text-sm font-bold text-amber-300">{store.stats.totalTowersBuilt} 座</div>
              </div>
              <div className="px-2.5 py-1.5 rounded-md bg-slate-900/90 border border-slate-800">
                <div className="text-[10.5px] text-slate-400">野區據點</div>
                <div className="text-sm font-bold text-sky-300">{store.stats.totalObjectivesClaimed} 次</div>
              </div>
            </div>
          </div>

          <div className="h-2 rounded-full bg-slate-800/90 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-300"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-slate-800/80 bg-[#0E1520]">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: '全部成就' },
                { id: 'combat', label: ACHIEVEMENT_CATEGORY_LABELS.combat },
                { id: 'faction', label: ACHIEVEMENT_CATEGORY_LABELS.faction },
                { id: 'tactics', label: ACHIEVEMENT_CATEGORY_LABELS.tactics },
                { id: 'economy', label: ACHIEVEMENT_CATEGORY_LABELS.economy },
              ] as Array<{ id: FilterTab; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  filter === tab.id
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setOnlyUnlocked((v) => !v)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
              onlyUnlocked
                ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {onlyUnlocked ? '僅顯示已解鎖' : '顯示全部進度'}
          </button>
        </div>

        {/* Achievements List */}
        <div className="flex-1 overflow-y-auto p-5">
          {filteredDefs.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              此分類目前尚未解鎖任何成就，快進入戰場挑戰吧！
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredDefs.map((def) => {
                const unlockedAt = store.unlocked[def.id];
                const isUnlocked = Boolean(unlockedAt);
                const progress = Math.min(def.target, def.getProgress(store.stats));
                const pct = def.target > 0 ? Math.min(100, Math.round((progress / def.target) * 100)) : 0;
                const tierMeta = ACHIEVEMENT_TIER_META[def.tier];

                return (
                  <div
                    key={def.id}
                    className={`rounded-lg border p-3.5 transition-colors flex flex-col justify-between gap-2.5 ${
                      isUnlocked
                        ? `${tierMeta.bgClass} ${tierMeta.borderClass}`
                        : 'bg-slate-900/65 border-slate-800/90 opacity-85'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className={`mt-0.5 w-8 h-8 rounded-md flex items-center justify-center shrink-0 border ${
                            isUnlocked
                              ? `${tierMeta.borderClass} bg-slate-950/60`
                              : 'border-slate-700/80 bg-slate-950/50'
                          }`}
                        >
                          {isUnlocked ? (
                            <Award className={`w-4 h-4 ${tierMeta.textClass}`} />
                          ) : (
                            <Lock className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-bold ${isUnlocked ? 'text-slate-50' : 'text-slate-300'}`}>
                              {def.title}
                            </span>
                            <span className={`text-[11px] font-semibold ${tierMeta.textClass}`}>
                              {tierMeta.label} · +{def.points} pts
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{def.description}</p>
                        </div>
                      </div>

                      {isUnlocked && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-label="已解鎖" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono-num">
                        <span className="text-slate-400">{ACHIEVEMENT_CATEGORY_LABELS[def.category]}</span>
                        <span className={isUnlocked ? 'text-emerald-300 font-semibold' : 'text-slate-300'}>
                          {isUnlocked
                            ? `已達成 · ${formatUnlockDate(unlockedAt)}`
                            : `進度 ${progress} / ${def.target}`}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isUnlocked ? 'bg-emerald-400' : 'bg-sky-400/75'
                          }`}
                          style={{ width: `${isUnlocked ? 100 : pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
