"use client";

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

import { Button, type ButtonProps } from "./button";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: Extract<ButtonProps["variant"], "primary" | "danger">;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  loading = false,
  onConfirm,
  onClose,
  fallbackFocusRef,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;

    const trigger = document.activeElement;
    const fallback = fallbackFocusRef?.current;
    // Native modal dialogs provide the top layer and inert background.
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>("[data-dialog-cancel]")?.focus();

    return () => {
      dialog.close();
      if (
        trigger instanceof HTMLElement &&
        trigger.isConnected &&
        trigger.checkVisibility()
      )
        trigger.focus();
      else if (fallback?.isConnected) fallback.focus();
    };
  }, [open, fallbackFocusRef]);

  useEffect(() => {
    if (open && loading) {
      dialogRef.current
        ?.querySelector<HTMLButtonElement>("[data-dialog-cancel]")
        ?.focus();
    }
  }, [open, loading]);

  return (
    <dialog
      ref={dialogRef}
      className="ui-dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const focusable = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            "a[href], button, input, select, textarea, [tabindex]",
          ),
        ).filter(
          (element) =>
            element.tabIndex >= 0 &&
            !element.matches(":disabled") &&
            element.checkVisibility({ visibilityProperty: true }),
        );
        const first = focusable[0];
        const last = focusable.at(-1);
        if (
          event.shiftKey
            ? document.activeElement === first
            : document.activeElement === last
        ) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <h2 id={`${id}-title`}>{title}</h2>
      <div id={`${id}-description`}>{description}</div>
      <div className="ui-dialog-actions">
        <Button variant="secondary" data-dialog-cancel onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button variant={confirmVariant} loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
