"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import DMHeader from "./DMHeader";
import { getSocket } from "@/lib/socket";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store/store";
import UserAvatar from "@/components/UserAvatar";
import dayjs from "dayjs";
import { Trash2, Phone, Monitor, PhoneOff } from "lucide-react";
import { startCall } from "@/store/callSlice";
import { endCall, clearIncomingCall, finalizeCall } from "@/store/callSlice";
import { startVoiceCall, endVoiceCall } from "@/lib/callUtils";
import { showModal } from "@/store/modalSlice";
import { initOfferConnection } from "@/lib/callUtils";

interface Message {
  _id: string;
  roomId: string;
  sender: string;
  content: string;
  attachments?: { type: string; url: string; filename: string; size: number }[];
  isReadBy: string[];
  deletedBy: string[];
  createdAt: string;
}

export default function DMRoomPage() {
  const dispatch = useDispatch();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const MIN_FETCH_INTERVAL = 500;

  const selectedFriend = useSelector(
    (state: RootState) => state.ui.selectedFriend
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const socket = getSocket();
  const myEmail =
    useSelector((state: RootState) => state.auth.user?.email) || "";
  const myProfileImage = useSelector(
    (state: RootState) => state.auth.user?.profileImage
  );
  const myName =
    useSelector((state: RootState) => state.auth.user?.nickname) || "";
  const myTag = useSelector((state: RootState) => state.auth.user?.tag) || "";
  const myColor =
    useSelector((state: RootState) => state.auth.user?.color) || "";
  const userStatus = useSelector((state: RootState) =>
    selectedFriend?.email
      ? state.userStatus.statuses[selectedFriend.email]
      : "offline"
  );
  const isMyMicActive = useSelector(
    (state: RootState) => state.micActivity.activities[myEmail] ?? false
  );

  const isTargetMicActive = useSelector(
    (state: RootState) =>
      state.micActivity.activities[selectedFriend?.email || ""] ?? false
  );

  const call = useSelector((state: RootState) => state.call); //통화 상태

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const handleReceiveMessage = (msg: Message) => {
      if (!selectedFriend || !myEmail) return;

      if (msg.roomId === selectedFriend.roomId) {
        socket.emit("markAsRead", {
          roomId: selectedFriend.roomId,
          email: myEmail,
        });
      }
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => {
        requestAnimationFrame(() => {
          const el = containerRef.current;
          if (!el) return;
          const nearBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight < 200;

          if (nearBottom || msg.sender === myEmail) {
            el.scrollTop = el.scrollHeight;
          }
        });
      }, 0);
    };

    socket.on("receiveMessage", handleReceiveMessage);
    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
    };
  }, [selectedFriend, myEmail]);

  const fetchMessages = async (initial = false) => {
    if (
      !selectedFriend?.email ||
      !selectedFriend?.roomId ||
      isLoading ||
      !hasMore
    )
      return;
    setIsLoading(true);
    const el = containerRef.current;
    const prevScrollHeight = el?.scrollHeight || 0;

    try {
      const res = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/api/dms/messages?target=${encodeURIComponent(
          selectedFriend.email
        )}&skip=${initial ? 0 : messages.length}&limit=20`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (res.ok) {
        if (data.messages.length < 20) setHasMore(false);
        setMessages((prev) => {
          const all = [...data.messages, ...prev];
          const unique = new Map(all.map((m) => [m._id, m]));
          return Array.from(unique.values()).sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
        if (!initial) {
          requestAnimationFrame(() => {
            if (el) el.scrollTop = el.scrollHeight - prevScrollHeight;
          });
        } else {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dms/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ roomId: selectedFriend.roomId }),
          });
        }
      }
    } catch (err) {
      console.error("메시지 로딩 실패:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(true);
  }, [selectedFriend]);

  useLayoutEffect(() => {
    if (!initialScrollDone && messages.length > 0) {
      const el = containerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
      setInitialScrollDone(true);
    }
  }, [messages, initialScrollDone]);

  const handleScroll = () => {
    const el = containerRef.current;
    const now = Date.now();
    if (!el) return;
    if (el.scrollTop < 100) {
      if (
        canLoadMore &&
        hasMore &&
        !isLoading &&
        now - lastFetchTime > MIN_FETCH_INTERVAL
      ) {
        setLastFetchTime(now);
        setCanLoadMore(false);
        fetchMessages(false);
      }
    } else {
      if (!canLoadMore) setCanLoadMore(true);
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [
    hasMore,
    isLoading,
    selectedFriend,
    messages,
    lastFetchTime,
    canLoadMore,
  ]);

  const handleSend = async () => {
    if (!selectedFriend?.roomId || (!input.trim() && pendingFiles.length === 0))
      return;

    let attachments: Message["attachments"] = [];

    if (pendingFiles.length > 0) {
      const formData = new FormData();
      pendingFiles.forEach((file) => formData.append("files", file));
      formData.append("roomId", selectedFriend.roomId);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/dms/upload`,
          {
            method: "POST",
            body: formData,
            credentials: "include",
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        attachments = data.attachments;
      } catch (err) {
        dispatch(showModal({ type: "alert", message: "파일 업로드 실패" }));
        console.error(err);
        return;
      }
    }

    socket.emit("sendMessage", {
      roomId: selectedFriend.roomId,
      sender: myEmail,
      content: input.trim(),
      attachments,
    });

    setInput("");
    setPendingFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = "40px";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isMobile && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  if (!selectedFriend) return null;

  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(e.target as Node)
      ) {
        setShowAttachMenu(false);
      }
    };

    if (showAttachMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAttachMenu]);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalImageUrl(null);
    };

    if (modalImageUrl) {
      document.addEventListener("keydown", handleEsc);
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [modalImageUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setPendingFiles((prev) => [...prev, ...Array.from(files)]);
  };

  function formatBytes(bytes: number): string {
    if (!bytes || typeof bytes !== "number") return "0 Bytes";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = (bytes / Math.pow(1024, i)).toFixed(2);
    return `${value} ${sizes[i]}`;
  }

  const renderMessagesWithDateDividers = () => {
    let lastDate = "";
    return messages.map((msg) => {
      const isMine = msg.sender === myEmail;
      const dateStr = dayjs(msg.createdAt).format("YYYY-MM-DD");
      const showDivider = dateStr !== lastDate;
      lastDate = dateStr;

      return (
        <div key={`msg-${msg._id}`}>
          {modalImageUrl && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
              onClick={() => setModalImageUrl(null)}
            >
              <button
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-zinc-800/80 text-white hover:bg-zinc-700 text-xl flex items-center justify-center z-[110]"
                onClick={() => setModalImageUrl(null)}
              >
                ×
              </button>
              <div
                className="relative max-w-[90vw] max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={modalImageUrl}
                  alt="확대 이미지"
                  className="rounded-lg border border-white max-h-[90vh] object-contain"
                />
              </div>
            </div>
          )}
          {showDivider && (
            <div className="flex items-center justify-center my-4 text-xs text-zinc-500">
              <div className="flex-grow border-t border-zinc-300 dark:border-zinc-700"></div>
              <span className="px-3 whitespace-nowrap">
                {dayjs(msg.createdAt).format("YYYY년 M월 D일")}
              </span>
              <div className="flex-grow border-t border-zinc-300 dark:border-zinc-700"></div>
            </div>
          )}

          <div
            key={msg._id}
            className={`flex gap-3 flex-wrap items-start ${
              isMine ? "flex-row-reverse" : ""
            }`}
          >
            <UserAvatar
              profileImage={
                isMine ? myProfileImage : selectedFriend.profileImage
              }
              userStatus={isMine ? "online" : userStatus || "offline"}
              color={isMine ? undefined : selectedFriend.color}
              size={36}
              badgeOffsetX={-3}
              badgeOffsetY={-3}
            />
            <div
              className={`flex flex-col max-w-md min-w-0 ${
                isMine ? "items-end" : "items-start"
              }`}
            >
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {isMine ? (
                  <>
                    <span className="text-xs text-zinc-500">
                      {new Date(msg.createdAt).toLocaleString("ko-KR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>{" "}
                    {myName}
                  </>
                ) : (
                  <>
                    {selectedFriend.nickname}{" "}
                    <span className="text-xs text-zinc-500">
                      {new Date(msg.createdAt).toLocaleString("ko-KR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </>
                )}
              </div>
              <div
                className={`max-w-[180px] md:max-w-[320px] whitespace-pre-wrap break-words px-4 py-2 rounded-lg text-sm ${
                  isMine
                    ? "bg-indigo-500 text-white self-end"
                    : "bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white self-start"
                }`}
              >
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-col gap-2 my-2">
                    {msg.attachments.map((file, i) => {
                      const fileUrl = `${process.env.NEXT_PUBLIC_API_URL}${file.url}`;
                      const isLast = i === msg.attachments!.length - 1;
                      const key = `${msg._id}-${i}`;
                      if (file.type === "image") {
                        return (
                          <img
                            key={key}
                            src={fileUrl}
                            alt={file.filename}
                            onClick={() => setModalImageUrl(fileUrl)}
                            onLoad={() => {
                              if (!isLast) return;
                              const el = containerRef.current;
                              if (!el) return;

                              el.scrollTop = el.scrollHeight;
                            }}
                            className="cursor-pointer max-w-[180px] md:max-w-[320px] rounded-lg border border-zinc-300 dark:border-zinc-700"
                          />
                        );
                      }

                      return (
                        <div
                          key={key}
                          className="flex items-center gap-3 px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 max-w-[320px]"
                        >
                          <div className="w-10 h-10 rounded-md flex items-center justify-center bg-transparent">
                            <span className="text-4xl">📄</span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <a
                              href={fileUrl}
                              download={file.filename}
                              className="text-sm text-blue-400 hover:underline break-all truncate max-w-[240px]"
                            >
                              {file.filename}
                            </a>
                            <span className="text-xs text-zinc-400 mt-0.5">
                              {formatBytes(file.size)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {msg.content}
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  const handleStartCall = () => {
    if (!selectedFriend) {
      return;
    }
    if (
      call.roomId === selectedFriend.roomId &&
      (!call.callerEnded || !call.calleeEnded)
    ) {
      return;
    }
    startVoiceCall({
      socket,
      dispatch,
      caller: myEmail,
      target: selectedFriend.email,
      roomId: selectedFriend.roomId,
      nickname: myName,
      tag: myTag,
      profileImage: myProfileImage ?? undefined,
      color: myColor,
    });
  };

  const handleEndCall = () => {
    if (!selectedFriend) return;

    endVoiceCall({
      socket,
      dispatch,
      roomId: selectedFriend.roomId,
      targetEmail: selectedFriend.email,
    });
  };

  const handleJoinCall = async () => {
    const roomId = selectedFriend?.roomId;
    const target = selectedFriend?.email;
    if (!roomId || !myEmail || !target) return;
    await initOfferConnection({
      socket,
      target,
      onRemoteStream: (stream) => {
        const audio = document.getElementById(
          "remoteAudio"
        ) as HTMLAudioElement;
        if (audio) {
          audio.srcObject = stream;
          audio.autoplay = true;
        }
      },
    });
    socket.emit("call:reconn", {
      roomId,
      from: myEmail,
    });
    dispatch(clearIncomingCall());
  };

  useEffect(() => {
    if (call.callerEnded && call.calleeEnded) {
      dispatch(finalizeCall());
    }
  }, [call.callerEnded, call.calleeEnded, dispatch]);

  return (
    <div className="h-[90vh] md:h-[96vh] flex flex-col bg-white dark:bg-zinc-900">
      <div className="shrink-0">
        <DMHeader
          onStartCall={handleStartCall}
          {...selectedFriend}
          userStatus={userStatus || "offline"}
        />
      </div>

      {selectedFriend?.roomId === call.roomId &&
        (!call.callerEnded || !call.calleeEnded) && (
          <div className="relative bg-black text-white py-6 px-4 flex flex-col items-center justify-center shadow-md">
            <div className="flex items-center justify-center gap-10 mb-4">
              {/* 본인 아바타 */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`rounded-full ${
                    (call.isCaller && call.callerEnded) ||
                    (!call.isCaller && call.calleeEnded)
                      ? "grayscale blur-[2px] opacity-60"
                      : ""
                  }`}
                >
                  <UserAvatar
                    profileImage={myProfileImage}
                    userStatus={null}
                    size={64}
                    isMicActive={isMyMicActive}
                  />
                </div>
                <div className="text-xs">{myName}</div>
              </div>

              {/* 상대방 아바타 */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`rounded-full ${
                    (call.isCaller && call.calleeEnded) ||
                    (!call.isCaller && call.callerEnded)
                      ? "grayscale blur-[2px] opacity-60"
                      : ""
                  }`}
                >
                  <UserAvatar
                    profileImage={selectedFriend.profileImage}
                    userStatus={null}
                    size={64}
                    color={selectedFriend.color}
                    isMicActive={isTargetMicActive}
                  />
                </div>
                <div className="text-xs">{selectedFriend.nickname}</div>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4">
              {/* 본인이 아직 통화 참여 안한 상태면 참여 버튼 보여주기 */}
              {(call.isCaller && call.callerEnded) ||
              (!call.isCaller && call.calleeEnded) ? (
                <button
                  onClick={handleJoinCall}
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-green-600 hover:bg-green-700 transition"
                >
                  <Phone className="w-5 h-5 text-white" />
                </button>
              ) : (
                <>
                  {/* 화면 공유 버튼 */}
                  <button
                    onClick={() =>
                      dispatch(
                        showModal({ type: "alert", message: "화면공유 미구현" })
                      )
                    }
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 transition"
                  >
                    <Monitor className="w-5 h-5 text-white" />
                  </button>

                  {/* 통화 종료 버튼 */}
                  <button
                    onClick={handleEndCall}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 transition"
                  >
                    <PhoneOff className="w-5 h-5 text-white" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-4"
      >
        {renderMessagesWithDateDividers()}
        <div ref={scrollRef} />
      </div>
      {pendingFiles.length > 0 && (
        <div className="mx-3 mb-2 p-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg overflow-x-auto">
          <div className="flex gap-3">
            {pendingFiles.map((file, index) => {
              const isImage = file.type.startsWith("image/");
              const objectUrl = URL.createObjectURL(file);

              return (
                <div
                  key={index}
                  className="relative w-24 h-24 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 overflow-hidden flex items-center justify-center shrink-0"
                >
                  {isImage ? (
                    <img
                      src={objectUrl}
                      alt={file.name}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full text-zinc-500 dark:text-white text-3xl">
                      📄
                    </div>
                  )}
                  <button
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center"
                    onClick={() =>
                      setPendingFiles((prev) =>
                        prev.filter((_, i) => i !== index)
                      )
                    }
                  >
                    <Trash2 size={12} strokeWidth={2} />
                  </button>
                  <div className="absolute bottom-0 w-full bg-black/70 text-white text-[10px] px-1 truncate">
                    {file.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="shrink-0 border-t px-3 py-3 flex items-end gap-2 bg-white dark:bg-zinc-900 relative">
        <input
          id="dm-file-input"
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        {showAttachMenu && (
          <div
            ref={attachMenuRef}
            className="absolute bottom-16 [0.25rem] bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg z-50"
          >
            <button
              className="w-full text-left px-4 py-2 text-sm 
             bg-white dark:bg-zinc-800 
             hover:bg-zinc-100 dark:hover:bg-zinc-700 
             rounded-md hover:rounded-md"
              onClick={() => {
                document.getElementById("dm-file-input")?.click();
                setShowAttachMenu(false);
              }}
            >
              📎 파일 첨부
            </button>
          </div>
        )}
        <button
          className="w-9 h-9 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-white rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600"
          onClick={() => setShowAttachMenu((prev) => !prev)}
        >
          +
        </button>
        <textarea
          style={{ maxHeight: "120px" }}
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="메시지를 입력하세요"
          className="flex-1 resize-none overflow-hidden px-3 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-sm text-black dark:text-white border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {isMobile && (
          <button
            onClick={handleSend}
            className="px-3 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 text-sm"
          >
            보내기
          </button>
        )}
      </div>
    </div>
  );
}
