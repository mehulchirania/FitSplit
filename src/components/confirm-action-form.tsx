"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import type { FormActionState } from "@/types/action-state";
import { initialFormActionState } from "@/types/action-state";
import * as Dialog from "@radix-ui/react-dialog";
import { FormActionContext } from "./form-action-context";

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
  requireConfirmation = true,
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
  requireConfirmation?: boolean;
  style?: CSSProperties;
  submitClassName?: string;
  submitLabel: string;
  successRedirect?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialFormActionState);
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dismissedMessage, setDismissedMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const isConfirmedSubmitRef = useRef(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (isConfirmedSubmitRef.current) {
      window.setTimeout(() => {
        isConfirmedSubmitRef.current = false;
      }, 0);
      return;
    }

    if (!event.currentTarget.reportValidity()) {
      event.preventDefault();
      return;
    }

    setDismissedMessage("");

    if (!requireConfirmation) {
      isConfirmedSubmitRef.current = true;
      return;
    }

    event.preventDefault();
    setIsDialogOpen(true);
  }

  function confirmSubmit() {
    setIsDialogOpen(false);
    isConfirmedSubmitRef.current = true;
    onBeforeConfirm?.();
    window.setTimeout(() => formRef.current?.requestSubmit(), 0);
  }

  const showResultModal = state.message && !isPending && dismissedMessage !== state.message;

  return (
    <FormActionContext.Provider value={state}>
      <form action={formAction} className={className} onSubmit={handleSubmit} ref={formRef} style={style}>
        {children}
        <button className={submitClassName ?? "button button-primary"} disabled={isPending} type="submit">
          {isPending ? pendingLabel : submitLabel}
        </button>
      </form>

      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-backdrop" />
          <Dialog.Content className="confirm-dialog">
            <Dialog.Title>{confirmTitle}</Dialog.Title>
            <Dialog.Description id="confirm-dialog-message">
              {confirmMessage}
            </Dialog.Description>
            <div className="quick-actions" style={{ marginTop: '1rem' }}>
              <Dialog.Close asChild>
                <button className="button button-secondary" type="button">
                  {cancelLabel}
                </button>
              </Dialog.Close>
              <button className="button button-primary" onClick={confirmSubmit} type="button">
                {confirmLabel}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={!!showResultModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-backdrop" />
          <Dialog.Content className="confirm-dialog">
            <Dialog.Title>
              {state.status === "success" ? "Update complete" : "Update failed"}
            </Dialog.Title>
            <Dialog.Description className={`form-message form-message-${state.status}`}>
              {state.message}
            </Dialog.Description>
            <div className="quick-actions" style={{ marginTop: '1rem' }}>
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
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </FormActionContext.Provider>
  );
}
