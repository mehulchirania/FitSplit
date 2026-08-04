"use client";

import { useActionState, useState } from "react";
import type { GymNotice } from "@/types/domain";
import { addGymNotice, deleteGymNotice } from "@/lib/firebase/actions";
import { initialFormActionState } from "@/types/action-state";

const TYPE_OPTIONS = [
  { value: "tip",          label: "Training Tip",  color: "var(--brand)" },
  { value: "rule",         label: "Gym Rule",      color: "var(--danger)" },
  { value: "reminder",     label: "Reminder",      color: "var(--warning)" },
  { value: "announcement", label: "Notice",        color: "var(--info)" },
];

function NoticeRow({ notice }: { notice: GymNotice }) {
  const [state, action, isPending] = useActionState(deleteGymNotice, initialFormActionState);
  const typeConfig = TYPE_OPTIONS.find((t) => t.value === notice.type) ?? TYPE_OPTIONS[0];

  return (
    <li className="gnm-row">
      <span
        className="gnm-badge"
        style={{ color: typeConfig.color, borderColor: `color-mix(in srgb, ${typeConfig.color} 30%, transparent)`, background: `color-mix(in srgb, ${typeConfig.color} 10%, transparent)` }}
      >
        {typeConfig.label}
      </span>
      <div className="gnm-row-copy">
        <strong>{notice.title}</strong>
        {notice.body && <p>{notice.body}</p>}
      </div>
      <form action={action}>
        <input name="noticeId" type="hidden" value={notice.id} />
        <button
          className="button button-secondary gnm-delete"
          disabled={isPending}
          title="Remove notice"
          type="submit"
        >
          {isPending ? "…" : "✕"}
        </button>
        {state.status === "error" && (
          <p className="form-message form-message-error" style={{ fontSize: "0.75rem" }}>{state.message}</p>
        )}
      </form>
    </li>
  );
}

export function GymNoticeManager({ notices = [] }: { notices?: GymNotice[] }) {
  const [addState, addAction, isAdding] = useActionState(addGymNotice, initialFormActionState);
  const [formKey, setFormKey] = useState(0);

  // Reset form on success
  const displayedKey = addState.status === "success" ? formKey + 1 : formKey;

  return (
    <div className="gnm">
      <div className="panel-title" style={{ marginBottom: 12 }}>
        <h2>Gym Notices</h2>
        <span className="status-pill status-neutral">{notices.length} active</span>
      </div>

      {/* Existing notices */}
      {notices.length > 0 ? (
        <ul className="gnm-list">
          {notices.map((notice) => (
            <NoticeRow key={notice.id} notice={notice} />
          ))}
        </ul>
      ) : (
        <p className="gnm-empty">No notices yet. Add one below — members will see them on their workout page.</p>
      )}

      {/* Add notice form */}
      <form
        action={addAction}
        className="gnm-form"
        key={displayedKey}
        onSubmit={() => setFormKey((k) => k + 1)}
      >
        <div className="gnm-form-row">
          <select defaultValue="tip" name="type" required>
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <label>
          Notice text
          <input
            maxLength={160}
            name="title"
            placeholder="e.g. Re-rack all weights after use."
            required
          />
        </label>
        <label>
          Additional detail (optional)
          <input
            maxLength={260}
            name="body"
            placeholder="Short explanation or context"
          />
        </label>
        <button
          className="button button-primary"
          disabled={isAdding}
          style={{ justifyContent: "center" }}
          type="submit"
        >
          {isAdding ? "Adding…" : "+ Add notice"}
        </button>
        {addState.status === "error" && (
          <p className="form-message form-message-error">{addState.message}</p>
        )}
        {addState.status === "success" && (
          <p className="form-message form-message-success">{addState.message}</p>
        )}
      </form>
    </div>
  );
}
