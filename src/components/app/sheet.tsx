"use client";

import { useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CloseIcon } from "./icons";

/**
 * Bottom sheet. Radix supplies focus trapping, Escape, scroll lock and aria; the look is ours.
 * Drag the grabber or the title bar down to dismiss: the sheet tracks the finger 1:1, then
 * either flicks away (by distance or velocity) or settles back.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  footer
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; lastY: number; lastT: number; velocity: number } | null>(null);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, lastY: e.clientY, lastT: e.timeStamp, velocity: 0 };
    sheetRef.current?.style.setProperty("transition", "none");
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || !sheetRef.current) return;
    const dy = Math.max(0, e.clientY - d.startY);
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.velocity = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    sheetRef.current.style.setProperty("transform", `translateY(${dy}px)`);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    drag.current = null;
    const el = sheetRef.current;
    if (!d || !el) return;
    const dy = e.clientY - d.startY;
    el.style.removeProperty("transition");
    if (dy > 110 || d.velocity > 0.6) {
      onOpenChange(false);
    }
    el.style.removeProperty("transform");
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fs-scrim" />
        <Dialog.Content ref={sheetRef} className="fs-sheet" aria-describedby={undefined}>
          <div
            className="fs-sheet__top"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <span className="fs-sheet__grab" aria-hidden="true" />
            <div className="fs-sheet__bar">
              <Dialog.Title className="fs-sheet__title">{title}</Dialog.Title>
              <Dialog.Close className="fs-icon-btn" aria-label="Close">
                <CloseIcon size={20} />
              </Dialog.Close>
            </div>
          </div>
          <div className="fs-sheet__body">{children}</div>
          {footer && <div className="fs-sheet__foot">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
