import React, { useMemo, useState } from 'react';
import { Check, Copy, Eye, Send, Trash2, UserPlus, Users, X } from 'lucide-react';
import { MAP_MODE_META } from '../game/data';
import { normalizeFriendCode, SavedFriend } from '../game/playerStorage';
import { FriendInviteEvent, FriendOnlineStatus, PvpRoomInfo } from '../game/pvpTypes';

interface FriendsDrawerProps {
  open: boolean;
  onClose: () => void;
  myFriendCode: string;
  playerName: string;
  onChangePlayerName: (name: string) => void;
  pvpConnected: boolean;
  pvpRoom: PvpRoomInfo | null;
  friends: SavedFriend[];
  friendStatuses: Record<string, FriendOnlineStatus>;
  incomingInvites: FriendInviteEvent[];
  feedbackText: string | null;
  onAddFriend: (friendCode: string, nickname?: string) => string | null;
  onRemoveFriend: (friendCode: string) => void;
  onInviteFriend: (friendCode: string) => void;
  onJoinFriendRoom: (roomCode: string, asSpectator: boolean) => void;
  onAcceptInvite: (invite: FriendInviteEvent) => void;
  onDismissInvite: (inviteId: string) => void;
}

export const FriendsDrawer: React.FC<FriendsDrawerProps> = ({
  open,
  onClose,
  myFriendCode,
  playerName,
  onChangePlayerName,
  pvpConnected,
  pvpRoom,
  friends,
  friendStatuses,
  incomingInvites,
  feedbackText,
  onAddFriend,
  onRemoveFriend,
  onInviteFriend,
  onJoinFriendRoom,
  onAcceptInvite,
  onDismissInvite,
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [copiedMyCode, setCopiedMyCode] = useState(false);

  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      const sa = friendStatuses[a.friendCode];
      const sb = friendStatuses[b.friendCode];
      const onlineDiff = Number(Boolean(sb?.online)) - Number(Boolean(sa?.online));
      if (onlineDiff !== 0) return onlineDiff;
      return b.addedAt - a.addedAt;
    });
  }, [friends, friendStatuses]);

  const onlineCount = useMemo(
    () => friends.filter((f) => friendStatuses[f.friendCode]?.online).length,
    [friends, friendStatuses]
  );

  if (!open) return null;

  const handleCopyMyCode = () => {
    navigator.clipboard?.writeText(myFriendCode).catch(() => {});
    setCopiedMyCode(true);
    setTimeout(() => setCopiedMyCode(false), 1800);
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = normalizeFriendCode(codeInput);
    const err = onAddFriend(cleaned, nameInput.trim() || undefined);
    if (err) {
      setAddError(err);
      return;
    }
    setAddError(null);
    setCodeInput('');
    setNameInput('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[390px] h-full bg-[#0C121B] border-l border-slate-700/80 shadow-2xl flex flex-col text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2 bg-[#101824]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-300" />
            <h2 className="text-sm font-bold text-slate-50">好友欄</h2>
            <span className="font-mono-num text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700">
              {onlineCount}/{friends.length} 在線
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            title="關閉好友欄"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* My Commander Identity Card */}
        <div className="px-4 py-3 border-b border-slate-800/90 bg-[#0A1018] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">我的指揮官 ID（自動儲存於本機）</span>
            <span
              className={`text-[10.5px] font-mono-num ${
                pvpConnected ? 'text-emerald-400' : 'text-amber-300'
              }`}
            >
              {pvpConnected ? '● 伺服器連線中' : '○ 重連中…'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              maxLength={14}
              value={playerName}
              onChange={(e) => onChangePlayerName(e.target.value)}
              placeholder="輸入指揮官名稱"
              className="flex-1 min-w-0 px-2.5 py-1.5 rounded bg-[#111926] border border-slate-700 focus:border-sky-400 focus:outline-none text-xs text-slate-100"
            />
            <button
              type="button"
              onClick={handleCopyMyCode}
              className="px-2.5 py-1.5 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/50 text-xs font-mono-num font-bold text-sky-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="點擊複製我的 6 碼好友碼給朋友"
            >
              <span>#{myFriendCode}</span>
              {copiedMyCode ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Incoming Room Invites */}
        {incomingInvites.length > 0 && (
          <div className="px-4 py-2.5 border-b border-slate-800 bg-emerald-950/35 space-y-2">
            <div className="text-[11px] font-bold text-emerald-300">收到對戰邀請 ({incomingInvites.length})</div>
            {incomingInvites.map((inv) => (
              <div
                key={inv.id}
                className="p-2.5 rounded bg-[#0D1A18] border border-emerald-500/50 space-y-2"
              >
                <div className="text-xs text-slate-100">
                  <span className="font-bold text-emerald-200">{inv.fromName}</span> 邀請你加入房號{' '}
                  <span className="font-mono-num font-bold text-sky-300">{inv.roomCode}</span>
                  <span className="text-[10.5px] text-slate-400 ml-1">
                    （{MAP_MODE_META[inv.mapMode]?.name ?? '標準三線'}）
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onAcceptInvite(inv)}
                    className="flex-1 py-1.5 rounded bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold cursor-pointer"
                  >
                    立即加入對戰
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismissInvite(inv.id)}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                  >
                    忽略
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Friend Form */}
        <form onSubmit={handleSubmitAdd} className="px-4 py-3 border-b border-slate-800 space-y-2">
          <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5 text-sky-300" />
            <span>輸入 6 碼好友碼新增戰友</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              maxLength={6}
              value={codeInput}
              onChange={(e) => {
                setCodeInput(normalizeFriendCode(e.target.value));
                setAddError(null);
              }}
              placeholder="6碼好友碼"
              className="w-28 px-2.5 py-1.5 rounded bg-[#0A1018] border border-slate-700 focus:border-sky-400 focus:outline-none text-xs font-mono-num uppercase tracking-wider text-slate-100"
            />
            <input
              type="text"
              maxLength={14}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="備註稱呼（選填）"
              className="flex-1 min-w-0 px-2.5 py-1.5 rounded bg-[#0A1018] border border-slate-700 focus:border-sky-400 focus:outline-none text-xs text-slate-100"
            />
            <button
              type="submit"
              disabled={codeInput.length !== 6}
              className="px-3 py-1.5 rounded bg-sky-300 hover:bg-sky-200 disabled:opacity-40 text-slate-950 text-xs font-bold cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
            >
              加入
            </button>
          </div>
          {addError && <div className="text-[11px] text-rose-300">{addError}</div>}
          {feedbackText && <div className="text-[11px] text-emerald-300">{feedbackText}</div>}
        </form>

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {sortedFriends.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700/80 bg-[#0A1018] p-5 text-center space-y-1.5">
              <Users className="w-6 h-6 text-slate-500 mx-auto" />
              <div className="text-xs font-semibold text-slate-300">尚未加入任何好友</div>
              <div className="text-[11px] text-slate-400 leading-relaxed">
                把右上角的 <span className="font-mono-num text-sky-300">#{myFriendCode}</span> 傳給朋友，或在對戰房間裡點擊玩家旁的「+加好友」即可建立清單。
              </div>
            </div>
          ) : (
            sortedFriends.map((friend) => {
              const status = friendStatuses[friend.friendCode];
              const isOnline = Boolean(status?.online);
              const displayName = status?.name || friend.name;
              const inSameRoom = Boolean(pvpRoom && status?.roomCode && status.roomCode === pvpRoom.code);
              const statusLabel = !isOnline
                ? '離線'
                : inSameRoom
                ? `同房中 (${status.roomCode})`
                : status?.roomCode && status.roomPhase === 'playing'
                ? `對戰中 (${status.roomCode})`
                : status?.roomCode
                ? `房間整備 (${status.roomCode})`
                : '在線大廳';
              const statusDotClass = !isOnline
                ? 'bg-slate-600'
                : status?.roomPhase === 'playing'
                ? 'bg-amber-400'
                : status?.roomCode
                ? 'bg-sky-400'
                : 'bg-emerald-400';

              return (
                <div
                  key={friend.friendCode}
                  className="p-2.5 rounded-md bg-[#111926] border border-slate-800 hover:border-slate-700 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotClass}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-100 truncate">{displayName}</span>
                          <span className="font-mono-num text-[10px] text-slate-500">#{friend.friendCode}</span>
                        </div>
                        <div className="text-[10.5px] text-slate-400">{statusLabel}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveFriend(friend.friendCode)}
                      title="移除好友"
                      className="p-1 rounded text-slate-500 hover:text-rose-300 hover:bg-slate-800 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isOnline && !inSameRoom && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        disabled={!pvpConnected}
                        onClick={() => onInviteFriend(friend.friendCode)}
                        className="flex-1 px-2.5 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-[11px] font-semibold text-sky-200 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-45"
                      >
                        <Send className="w-3 h-3" />
                        <span>{pvpRoom ? '邀請進本房' : '開房並邀請'}</span>
                      </button>

                      {status?.roomCode && status.roomPhase === 'lobby' && (
                        <button
                          type="button"
                          onClick={() => {
                            onJoinFriendRoom(status.roomCode!, false);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 text-[11px] font-semibold text-amber-200 cursor-pointer whitespace-nowrap"
                        >
                          加入房間
                        </button>
                      )}

                      {status?.roomCode && (status.roomPhase === 'playing' || status.roomPhase === 'lobby') && (
                        <button
                          type="button"
                          onClick={() => {
                            onJoinFriendRoom(status.roomCode!, true);
                            onClose();
                          }}
                          className="px-2 py-1 rounded bg-teal-900/60 hover:bg-teal-800/70 border border-teal-500/50 text-[11px] font-semibold text-teal-200 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <Eye className="w-3 h-3" />
                          <span>觀戰</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-800 text-[10.5px] text-slate-500 bg-[#090F17]">
          好友清單與指揮官設定皆自動儲存於瀏覽器 LocalStorage。
        </div>
      </div>
    </div>
  );
};
