"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface AppSidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    avatar_url?: string | null;
  };
}

const navItems = [
  { href: "/dashboard", label: "Subscriptions", mark: "◈" },
  { href: "/settings", label: "Settings", mark: "◎" },
];

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = React.useState(false);

  const width = expanded ? 180 : 52;
  const userInitial = (user.name?.charAt(0) || user.email?.charAt(0) || "U").toUpperCase();

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="sticky top-0 flex h-screen shrink-0 flex-col transition-[width] duration-200 ease-out"
      style={{
        width: `${width}px`,
        background: "var(--pulse-surface)",
        borderRight: "1px solid var(--pulse-border)",
      }}
    >
      <div
        className="flex h-[52px] items-center gap-[10px] overflow-hidden px-4"
        style={{ borderBottom: "1px solid var(--pulse-border)" }}
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center"
          style={{
            border: "1px solid var(--pulse-amber)",
            color: "var(--pulse-amber)",
            fontFamily: "var(--font-cormorant)",
            fontSize: "15px",
            fontWeight: 300,
          }}
        >
          P
        </div>
        <span
          className="overflow-hidden text-[14px] uppercase transition-opacity"
          style={{
            fontFamily: "var(--font-cormorant)",
            color: "var(--pulse-text)",
            fontWeight: 300,
            letterSpacing: "0.15em",
            opacity: expanded ? 1 : 0,
            whiteSpace: "nowrap",
          }}
        >
          ULSE
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-2 py-2 transition-colors"
              style={{
                color: isActive ? "var(--pulse-amber)" : "var(--pulse-muted)",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = "var(--pulse-text)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = "var(--pulse-muted)";
              }}
            >
              <span className="w-5 shrink-0 text-center text-[14px]">{item.mark}</span>
              <span
                className="overflow-hidden text-[10px] uppercase tracking-[0.12em] transition-opacity"
                style={{
                  fontFamily: "var(--font-dm-mono)",
                  opacity: expanded ? 1 : 0,
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer: user */}
      <div
        className="flex items-center gap-3 px-2 py-3"
        style={{ borderTop: "1px solid var(--pulse-border)" }}
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center text-[11px]"
          style={{
            border: "1px solid var(--pulse-border-hi)",
            color: "var(--pulse-text)",
            fontFamily: "var(--font-cormorant)",
          }}
          title={user.name || user.email || "User"}
        >
          {userInitial}
        </div>
        <div
          className="flex min-w-0 flex-1 items-center justify-between gap-2 overflow-hidden transition-opacity"
          style={{ opacity: expanded ? 1 : 0 }}
        >
          <span
            className="truncate text-[10px]"
            style={{
              fontFamily: "var(--font-dm-mono)",
              color: "var(--pulse-text)",
            }}
          >
            {user.name?.split(" ")[0] || "User"}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="shrink-0 text-[9px] uppercase tracking-[0.1em] transition-colors hover:text-[var(--pulse-amber)]"
            style={{
              fontFamily: "var(--font-dm-mono)",
              color: "var(--pulse-muted)",
              background: "transparent",
            }}
          >
            out
          </button>
        </div>
      </div>
    </aside>
  );
}
