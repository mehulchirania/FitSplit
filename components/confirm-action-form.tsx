"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import type { FormActionState } from "@/types/action-state";
import { initialFormActionState } from "@/types/action-state";

type ConfirmAction = (
  previousState: FormActionState,
  formData: FormData
) => Promise<FormActionState>;

export function ConfirmActionForm({
  action,
  cancelLabel = "Cancel",
  children,
  className,
  confirmLabel = "Confirm",
  confirmMessage,
  confirmTitle = "Confirm update",
  onBeforeConfirm,
  pendingLabel = "Saving...",
  style,
  submitClassName,
  submitLabel,
  successRedirect
}: {
  action: ConfirmAction;
  cancelLabel?: string;
  children: ReactNode;
  className?: string;
  confirmLabel?: string;
  confirmMessage: string;
  confirmTitle?: string;
  onBeforeConfirm?: () => void;
  pendingLabel?: string;
  style?: CSSProperties;
  submitClassName?: string;
  submitLabel: string;
  successRedirect?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialFormActionState);
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmedSubmit, setIsConfirmedSubmit] = useState(false);
  const [dismissedMessage, setDismissedMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isPending) {
      setIsConfirmedSubmit(false);
    }
  }, [isPending]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (isConfirmedSubmit) {
      return;
    }

    event.preventDefault();
    setDismissedMessage("");

    if (!event.currentTarget.reportValidity()) {
      return;
    }

    setIsDialogOpen(true);
  }

  function confirmSubmit() {
    setIsDialogOpen(false);
    setIsConfirmedSubmit(true);
    onBeforeConfirm?.();
    window.setTimeout(() => formRef.current?.requestSubmit(), 0);
  }

  return (
    <>
      <form action={formAction} className={className} onSubmit={handleSubmit} ref={formRef} style={style}>
        {children}
        <button className={submitClassName ?? "button button-primary"} disabled={isPending} type="submit">
          {isPending ? pendingLabel : submitLabel}
        </button>
      </form>

      {isDialogOpen ? (
        <div className="dialog-backdrop" role="presentation">
          <div
            aria-describedby="confirm-dialog-message"
            aria-modal="true"
            className="confirm-dialog"
            role="dialog"
          >
            <h2>{confirmTitle}</h2>
            <p id="confirm-dialog-message">{confirmMessage}</p>
            <div className="quick-actions">
              <button
                className="button button-secondary"
                onClick={() => setIsDialogOpen(false)}
                type="button"
              >
                {cancelLabel}
              </button>
              <button className="button button-primary" onClick={confirmSubmit} type="button">
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {state.message && !isPending && dismissedMessage !== state.message ? (
        <div className="dialog-backdrop" role="presentation">
          <div aria-live="polite" aria-modal="true" className="confirm-dialog" role="dialog">
            <h2>{state.status === "success" ? "Update complete" : "Update failed"}</h2>
            <p className={`form-message form-message-${state.status}`}>{state.message}</p>
            <div className="quick-actions">
              <button
                className="button button-primary"
                onClick={() => {
                  setDismissedMessage(state.message);
                  if (state.status === "success") {
                    if (successRedirect) {
                      router.push(successRedirect);
                    } else {
                      router.refresh();
                    }
                  }
                }}
                type="button"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
