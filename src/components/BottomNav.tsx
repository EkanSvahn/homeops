"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Idag", href: "/", icon: "📅" },
  { label: "Boards", href: "/boards", icon: "📋" },
  { label: "Kalender", href: "/calendar", icon: "🗓️" },
  { label: "Inköp", href: "/shopping", icon: "🛒" },
];

export function BottomNav() {
  const pathname = usePathname() || "/";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-sm safe-area-bottom">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl px-4 py-2 text-xs font-medium transition ${
                isActive
                  ? "text-slate-900"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

