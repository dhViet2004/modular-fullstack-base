"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Button } from "./ui/button";

export function Sidebar({
  items,
  pathname,
}: {
  items: readonly { href: string; label: string; disabled?: boolean }[];
  pathname: string;
}) {
  return (
    <nav className="shell-navigation" aria-label="Main navigation">
      {items.map((item) => {
        // ponytail: Text markers stand in for unavailable Figma icons; replace with verified assets.
        const content = (
          <>
            <span className="shell-nav-marker" aria-hidden="true">
              {item.label
                .split(/\s+/)
                .slice(0, 2)
                .map((word) => word[0])
                .join("")
                .toLocaleUpperCase("vi-VN")}
            </span>
            <span className="shell-nav-label">{item.label}</span>
          </>
        );

        return item.disabled ? (
          <span
            key={item.href}
            className="shell-nav-item"
            role="link"
            aria-disabled="true"
            aria-label={item.label}
            title={item.label}
          >
            {content}
          </span>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            className="shell-nav-item"
            aria-label={item.label}
            title={item.label}
            aria-current={pathname === item.href ? "page" : undefined}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  children,
  navigation,
  account,
  homeHref,
}: {
  children: ReactNode;
  navigation: ReactNode;
  account: ReactNode;
  homeHref: string;
}) {
  const pathname = usePathname();
  const id = useId();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDrawerOpen(false);
    shellRef.current
      ?.querySelector<HTMLElement>(":popover-open")
      ?.hidePopover();
  }, [pathname]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!drawerOpen || !dialog) return;

    // UI PROPOSAL: match the CSS tablet boundary; resizing must release the mobile modal.
    const desktop = window.matchMedia("(min-width: 768px)");
    if (desktop.matches) {
      setDrawerOpen(false);
      return;
    }
    const trigger = document.activeElement;
    const onResize = () => {
      if (desktop.matches) setDrawerOpen(false);
    };
    desktop.addEventListener("change", onResize);
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>("button")?.focus();

    return () => {
      desktop.removeEventListener("change", onResize);
      dialog.close();
      if (
        trigger instanceof HTMLElement &&
        trigger.isConnected &&
        trigger.checkVisibility()
      )
        trigger.focus();
    };
  }, [drawerOpen]);

  return (
    <div className="role-app-shell" ref={shellRef}>
      <aside className="shell-sidebar" aria-label="Sidebar">
        <Link href={homeHref} className="shell-brand" aria-label="CoreStack">
          <span className="shell-brand-mark" aria-hidden="true">
            CS
          </span>
          <span className="shell-brand-label">CORESTACK</span>
        </Link>
        {navigation}
      </aside>
      <header className="shell-topbar">
        <Button
          variant="ghost"
          className="shell-drawer-trigger"
          aria-label="Open navigation"
          aria-controls={id}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          Menu
        </Button>
        <Link href={homeHref} className="shell-topbar-brand">
          CORESTACK
        </Link>
        <div className="shell-account">{account}</div>
      </header>
      <div className="shell-main">{children}</div>
      <dialog
        ref={dialogRef}
        className="shell-drawer"
        id={id}
        aria-label="Main navigation"
        aria-modal="true"
        onCancel={(event) => {
          event.preventDefault();
          setDrawerOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const focusable = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              "a[href], button",
            ),
          ).filter(
            (element) =>
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
      >
        <div className="shell-drawer-heading">
          <span className="shell-brand-label">CORESTACK</span>
          <Button
            variant="ghost"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
          >
            Close
          </Button>
        </div>
        <div
          onClick={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest("a[href]")
            )
              setDrawerOpen(false);
          }}
        >
          {navigation}
        </div>
      </dialog>
    </div>
  );
}
