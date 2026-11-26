import React, { useEffect, useRef, useState } from 'react';
import { Send, X } from 'lucide-react';
import { RoomChatMessage } from '../game/pvpTypes';

const CHAT_HOLD_MS = 8000;
const CHAT_TOTAL_MS = 10000;

interface InGameChatOverlayProps {
  messages: RoomChatMessage[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (text: string) => void;
}

function getSenderBadge(msg: RoomChatMessage): { label: string; colorClass: string } {
  if (msg.senderRole === 'system') {
    return { label: '系統', colorClass: 'text-slate-400' };
  }
  if (msg.senderRole === 'spectator') {
    return { label: '觀戰', colorClass: 'text-teal-300' };
  }
  if (msg.senderSeat === 'enemy') {
    return { label: '紅方', colorClass: 'text-rose-300' };
  }
  return { label: '藍方', colorClass: 'text-sky-300' };
}

export const InGameChatOverlay: React.FC<InGameChatOverlayProps> = ({
  messages,
  open,
  onOpenChange,
  onSend,
}) => {
  const [draft, setDraft] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const latestMsgTs = messages.length > 0 ? messages[messages.length - 1].timestamp : 0;
  const hasFreshMessages = latestMsgTs > 0 && now - latestMsgTs < CHAT_TOTAL_MS + 500;

  // Tick timer only while fresh messages exist and are waiting to fade out
  useEffect(() => {
    if (open || !hasFreshMessages) return;
    const id = window.setInterval(() => setNow(Date.now()), 400);
    return () => window.clearInterval(id);
  }, [open, hasFreshMessages]);

  // Sync timestamp immediately when a new message arrives
  useEffect(() => {
    if (messages.length > 0) {
      setNow(Date.now());
    }
  }, [messages.length]);

  // Focus input when chat box opens
  useEffect(() => {
    if (open) {
      setNow(Date.now());
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Auto-scroll message history when open
  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [open, messages.length]);

  const visibleMessages = open
    ? messages.slice(-12)
    : messages.filter((m) => now - m.timestamp < CHAT_TOTAL_MS).slice(-5);

  if (!open && visibleMessages.length === 0) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (trimmed.length > 0) {
      onSend(trimmed);
    }
    setDraft('');
    onOpenChange(false);
    inputRef.current?.blur();
  };

  return (
    <div className="pointer-events-none fixed left-2.5 sm:left-4 bottom-[calc(170px+env(safe-area-inset-bottom))] lg:bottom-[130px] z-25 w-[350px] max-w-[calc(100vw-1.25rem)] flex flex-col gap-1.5">
      {visibleMessages.length > 0 && (
        <div
          ref={listRef}
          className={`flex flex-col gap-1 ${
            open
              ? 'pointer-events-auto max-h-[150px] sm:max-h-[168px] overflow-y-auto overscroll-contain rounded bg-[#0A1018]/92 border border-slate-700/80 p-2'
              : 'pointer-events-none'
          }`}
        >
          {visibleMessages.map((msg) => {
            const age = Math.max(0, now - msg.timestamp);
            const fadeOpacity = open
              ? 1
              : age <= CHAT_HOLD_MS
              ? 1
              : Math.max(0, 1 - (age - CHAT_HOLD_MS) / (CHAT_TOTAL_MS - CHAT_HOLD_MS));
            const badge = getSenderBadge(msg);

            return (
              <div
                key={msg.id}
                style={{ opacity: fadeOpacity, transition: 'opacity 350ms linear' }}
                className={`text-xs leading-snug break-words ${
                  open
                    ? 'px-1 py-0.5'
                    : 'px-2.5 py-1 rounded bg-[#0B111A]/85 border border-slate-800/80 w-fit max-w-full'
                }`}
              >
                <span className={`font-semibold mr-1 ${badge.colorClass}`}>[{badge.label}]</span>
                {msg.senderRole !== 'system' && (
                  <span className="font-semibold text-slate-100 mr-1.5">{msg.senderName}：</span>
                )}
                <span className={msg.senderRole === 'system' ? 'text-slate-300' : 'text-slate-100'}>
                  {msg.text}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <form
          onSubmit={handleSubmit}
          className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded bg-[#0B111A]/95 border border-sky-400/70 shadow-lg"
        >
          <input
            ref={inputRef}
            type="text"
            maxLength={120}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onOpenChange(false);
                inputRef.current?.blur();
              }
            }}
            placeholder="輸入訊息發送…"
            className="flex-1 min-w-0 bg-transparent text-base sm:text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none px-1.5"
          />
          <button
            type="submit"
            className="px-2.5 py-1.5 sm:py-1 rounded bg-sky-300 hover:bg-sky-200 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Send className="w-3 h-3" />
            <span>發送</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              inputRef.current?.blur();
            }}
            aria-label="關閉聊天"
            className="p-1.5 sm:p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
};
