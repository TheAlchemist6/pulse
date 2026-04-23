"use client";

import { useEffect, useRef } from "react";
import { NICHES_BY_GROUP, type Group, type Niche } from "@/lib/classification/taxonomy";

interface MoveDropdownProps {
  currentGroup: string | null;
  currentNiche: string | null;
  onMove: (newGroup: Group, newNiche: Niche) => void | Promise<void>;
  onClose: () => void;
}

export function MoveDropdown({
  currentGroup,
  currentNiche,
  onMove,
  onClose,
}: MoveDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [onClose]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleMove = async (group: Group, niche: Niche) => {
    await onMove(group, niche);
    onClose();
  };

  const groups = Object.keys(NICHES_BY_GROUP) as Group[];

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 w-[280px] max-h-[480px] overflow-y-auto border border-[var(--pulse-border-hi)] bg-[var(--pulse-surface)]"
    >
      {groups.map((group, groupIndex) => (
        <div key={group}>
          {groupIndex > 0 && (
            <div className="border-t border-[var(--pulse-border)]" />
          )}
          <div
            className="px-4 py-2 text-[9px] uppercase tracking-[0.15em] text-[var(--pulse-muted)]"
            style={{ fontFamily: "var(--font-dm-mono)" }}
          >
            {group}
          </div>
          {NICHES_BY_GROUP[group].map((niche) => {
            const isCurrent = niche === currentNiche && group === currentGroup;
            return (
              <button
                key={niche}
                type="button"
                disabled={isCurrent}
                onClick={() => handleMove(group, niche)}
                className={`w-full px-4 py-2 text-left text-[11px] text-[var(--pulse-text)] transition-colors ${
                  isCurrent
                    ? ""
                    : "hover:bg-[var(--pulse-amber-dim)] hover:text-[var(--pulse-amber)]"
                }`}
                style={{ fontFamily: "var(--font-dm-mono)" }}
              >
                <span className="inline-flex items-center gap-2">
                  {isCurrent && (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--pulse-amber)]" />
                  )}
                  <span>{niche}</span>
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
