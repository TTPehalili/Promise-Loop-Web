"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { MoreHorizontal, X } from "lucide-react";
import { LoopMark } from "@/components/marketing/graphics/LoopMark";
import { focusRing } from "./ui";

type MenuItem = { label: string; onSelect: () => void; disabled?: boolean };

export type DragHandlers = {
  onPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: PointerEvent<HTMLDivElement>) => void;
};

const iconButton = `inline-flex h-11 w-11 items-center justify-center rounded-lg text-brand transition-colors duration-150 hover:bg-paper-deep ${focusRing}`;

function Menu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const uid = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const itemsEls = () => Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not([disabled])") ?? []);

  useEffect(() => {
    if (!open) return;
    itemsEls()[0]?.focus();
    const onDown = (e: globalThis.PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function close(refocus: boolean) {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }

  function onMenuKey(e: KeyboardEvent<HTMLDivElement>) {
    const els = itemsEls();
    const i = els.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // Esc closes the menu, not the panel
      close(true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      els[(i + 1) % els.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      els[(i - 1 + els.length) % els.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      els[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      els[els.length - 1]?.focus();
    } else if (e.key === "Tab") {
      close(false);
    }
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        className={iconButton}
        aria-label="Chat options"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${uid}-menu` : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <MoreHorizontal size={20} strokeWidth={1.5} aria-hidden />
      </button>
      {open && (
        <div
          ref={menuRef}
          id={`${uid}-menu`}
          role="menu"
          aria-label="Chat options"
          onKeyDown={onMenuKey}
          className="absolute right-0 top-full z-10 mt-1 w-52 rounded-xl border border-line bg-surface p-1"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                close(false);
                item.onSelect();
              }}
              className={`flex min-h-[44px] w-full items-center rounded-lg px-3 text-left text-[15px] text-ink hover:bg-paper-deep disabled:cursor-not-allowed disabled:text-ink-muted ${focusRing}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PanelHeader({
  titleId,
  onClose,
  onStartFresh,
  onForget,
  onTalk,
  disabled,
  drag,
}: {
  titleId: string;
  onClose: () => void;
  onStartFresh: () => void;
  onForget: () => void;
  onTalk: () => void;
  /** Menu actions that need a live session. */
  disabled?: boolean;
  drag: DragHandlers;
}) {
  return (
    <div className="shrink-0 border-b border-line">
      {/* Mobile drag handle: swipe down to close. The close button is the keyboard path. */}
      <div aria-hidden className="flex touch-none justify-center pb-1 pt-2 sm:hidden" {...drag}>
        <span className="h-1 w-10 rounded-full bg-line" />
      </div>
      <div className="flex items-center gap-3 py-2 pl-4 pr-2 sm:py-3">
        <LoopMark size={28} />
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="truncate font-display text-[15px] font-semibold leading-tight text-brand">
            PromiseLoop Assistant
          </h2>
          <p className="text-[13px] leading-snug text-ink-muted">AI · usually answers instantly</p>
        </div>
        <Menu
          items={[
            { label: "Start fresh", onSelect: onStartFresh, disabled },
            { label: "Forget me", onSelect: onForget, disabled },
            { label: "Talk to a person", onSelect: onTalk, disabled },
          ]}
        />
        <button type="button" className={iconButton} aria-label="Close chat" onClick={onClose}>
          <X size={20} strokeWidth={1.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}
