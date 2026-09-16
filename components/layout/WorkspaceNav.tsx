"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";

type WorkspaceNavItem = {
  href: string;
  label: string;
  icon: "grid" | "search" | "user";
};

const navItems: WorkspaceNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/find-jobs", label: "Find Jobs", icon: "search" },
  { href: "/profile", label: "Profile", icon: "user" },
];

function WorkspaceIcon({ icon }: { icon: WorkspaceNavItem["icon"] }): ReactElement {
  if (icon === "grid") {
    return (
      <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none">
        <path d="M5 5h5v5H5V5Zm9 0h5v5h-5V5ZM5 14h5v5H5v-5Zm9 0h5v5h-5v-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === "search") {
    return (
      <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none">
        <path d="m20 20-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function WorkspaceNav(): ReactElement {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="flex min-h-16 flex-wrap items-center justify-center gap-6 text-base font-semibold sm:justify-end sm:gap-10">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex min-h-16 items-center gap-2 border-b-2 px-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
              isActive
                ? "border-accent text-accent"
                : "border-transparent text-text-dark hover:text-accent"
            }`}
          >
            <WorkspaceIcon icon={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
