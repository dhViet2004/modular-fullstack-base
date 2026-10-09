"use client";

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { Button } from "./button";

export function DetailsDrawer({
  title,
  children,
  onClose,
  fallbackFocusRef,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  fallbackFocusRef: RefObject<HTMLElement | null>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = document.activeElement;
    const fallback = fallbackFocusRef.current;
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>("[data-details-close]")?.focus();
    return () => {
      dialog.close();
      if (
        trigger instanceof HTMLElement &&
        trigger.isConnected &&
        trigger.checkVisibility()
      )
        trigger.focus();
      else if (fallback?.isConnected && fallback.checkVisibility())
        fallback.focus();
    };
  }, [fallbackFocusRef]);
  return (
    <dialog
      ref={dialogRef}
      className="admin-details"
      aria-modal="true"
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const elements = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            "a[href], button, input, select, textarea, [tabindex]",
          ),
        ).filter(
          (element) =>
            element.tabIndex >= 0 &&
            !element.matches(":disabled") &&
            element.checkVisibility({ visibilityProperty: true }),
        );
        const first = elements[0];
        const last = elements.at(-1);
        if (
          event.shiftKey
            ? document.activeElement === first
            : document.activeElement === last
        ) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        }
      }}
    >
      <header className="admin-details-heading">
        <h2 id={id}>{title}</h2>
        <Button variant="ghost" data-details-close onClick={onClose}>
          {"\u0110\u00f3ng"}
        </Button>
      </header>
      {children}
    </dialog>
  );
}
