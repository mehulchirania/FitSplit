"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sendCoachMessage, markCoachThreadRead } from "@/lib/firebase/actions";
import type { CoachMessage } from "@/lib/firebase/read-models";

/**
 * Trainer/owner-side reader+composer for a member's coach thread. Drop this
 * into any staff page that already has `memberId` + the member's full name
 * in scope (e.g. the owner/trainer member detail page) — it fetches nothing
 * itself, so the host page must pass the initial thread down from a server
 * component via getCoachThreadForMember(memberId, gymId).
 *
 * Mirrors MemberCoachView's interaction model (optimistic send, pending +
 * failed-with-retry states) but with sides flipped: the CALLER's own
 * messages (senderRole "trainer") render on the right, the member's on the
 * left. This is the other half of the member Coach tab — without it, member
 * messages are sent into a void no staff member ever sees.
 */

interface CoachMessageThreadProps {
  memberId: string;
  memberName: string;
  initialMessages: CoachMessage[];
}

type PendingMessage = {
  localId: string;
  body: string;
  createdAt: string;
  status: "pending" | "failed";
};

let localMessageIdCounter = 0;
function nextLocalMessageId() {
  localMessageIdCounter += 1;
  return `local-${localMessageIdCounter}`;
}

function formatBubbleTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
  } catch {
    return "";
  }
}

function dayLabel(iso: string) {
  try {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (sameDay(date, today)) return "Today";
    if (sameDay(date, yesterday)) return "Yesterday";
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      timeZone: "Asia/Kolkata"
    });
  } catch {
    return "";
  }
}

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

export function CoachMessageThread({ memberId, memberName, initialMessages }: CoachMessageThreadProps) {
  const [replyText, setReplyText] = useState("");
  const [messages, setMessages] = useState<CoachMessage[]>(initialMessages);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    markCoachThreadRead(memberId).catch(() => {});
  }, [memberId]);

  useEffect(() => {
    if (!hasScrolledRef.current) {
      threadEndRef.current?.scrollIntoView({ behavior: "auto" });
      hasScrolledRef.current = true;
      return;
    }
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, pending.length]);

  async function sendMessage(text: string, retryLocalId?: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const localId = retryLocalId ?? nextLocalMessageId();
    const createdAt = new Date().toISOString();

    setPending((prev) => {
      const withoutStale = prev.filter((p) => p.localId !== localId);
      return [...withoutStale, { localId, body: trimmed, createdAt, status: "pending" }];
    });

    const result = await sendCoachMessage({ memberId, body: trimmed });

    if (result.status === "success") {
      setMessages((prev) => [...prev, result.coachMessage]);
      setPending((prev) => prev.filter((p) => p.localId !== localId));
    } else {
      setPending((prev) => prev.map((p) => (p.localId === localId ? { ...p, status: "failed" } : p)));
    }
  }

  function handleSend() {
    const text = replyText.trim();
    if (!text) return;
    setReplyText("");
    void sendMessage(text);
  }

  const groupedDays = useMemo(() => {
    type ThreadItem =
      | { kind: "sent"; key: string; createdAt: string; message: CoachMessage }
      | { kind: "pending" | "failed"; key: string; createdAt: string; pendingItem: PendingMessage };

    const items: ThreadItem[] = [
      ...messages.map((m) => ({ kind: "sent" as const, key: m.id, createdAt: m.createdAt, message: m })),
      ...pending.map((p) => ({
        kind: (p.status === "failed" ? "failed" : "pending") as "pending" | "failed",
        key: p.localId,
        createdAt: p.createdAt,
        pendingItem: p
      }))
    ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const groups: { key: string; label: string; items: ThreadItem[] }[] = [];
    for (const item of items) {
      const key = dayKey(item.createdAt);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.key === key) {
        lastGroup.items.push(item);
      } else {
        groups.push({ key, label: dayLabel(item.createdAt), items: [item] });
      }
    }
    return groups;
  }, [messages, pending]);

  const hasAnyMessages = messages.length > 0 || pending.length > 0;

  return (
    <div className="cmt-root">
      <div className="cmt-head">
        <h2>Messages</h2>
        {!hasAnyMessages && <span className="cmt-head-hint">No messages yet</span>}
      </div>

      <div className="cmt-thread">
        {!hasAnyMessages ? (
          <div className="cmt-empty">
            <p>
              {memberName.split(" ")[0]} hasn&apos;t messaged yet. Send the first message to open the
              conversation — it shows up in their Coach tab immediately.
            </p>
          </div>
        ) : (
          groupedDays.map((group) => (
            <div className="cmt-day-group" key={group.key}>
              <div className="cmt-day-separator">
                <span>{group.label}</span>
              </div>
              {group.items.map((item) => {
                if (item.kind === "sent") {
                  const m = item.message;
                  const isMine = m.senderRole === "trainer";
                  return (
                    <div
                      className={`cmt-bubble ${isMine ? "cmt-bubble--mine" : "cmt-bubble--member"}`}
                      key={item.key}
                    >
                      <p className="cmt-bubble__text">{m.body}</p>
                      <span className="cmt-bubble__time">
                        {isMine ? m.senderName.split(" ")[0] : memberName.split(" ")[0]} ·{" "}
                        {formatBubbleTime(m.createdAt)}
                      </span>
                    </div>
                  );
                }

                const p = item.pendingItem;
                return (
                  <div
                    className={`cmt-bubble cmt-bubble--mine${p.status === "pending" ? " cmt-bubble--pending" : " cmt-bubble--failed"}`}
                    key={item.key}
                  >
                    <p className="cmt-bubble__text">{p.body}</p>
                    <span className="cmt-bubble__time">
                      {p.status === "pending" ? (
                        "Sending…"
                      ) : (
                        <span className="cmt-bubble__failed-row">
                          Not delivered
                          <button
                            type="button"
                            className="cmt-retry-btn"
                            onClick={() => void sendMessage(p.body, p.localId)}
                          >
                            Retry
                          </button>
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={threadEndRef} />
      </div>

      <div className="cmt-composer">
        <textarea
          className="cmt-input"
          placeholder={`Message ${memberName.split(" ")[0]}…`}
          rows={2}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          type="button"
          className="cmt-send"
          onClick={handleSend}
          disabled={!replyText.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
