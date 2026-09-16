import Image from "next/image";
import Link from "next/link";
import type { ReactElement } from "react";

import { WorkspaceNav } from "@/components/layout/WorkspaceNav";

type NavbarProps = {
  isAuthenticated?: boolean;
};

export function Navbar({ isAuthenticated = false }: NavbarProps): ReactElement {
  if (isAuthenticated) {
    return (
      <header className="border-b border-border bg-surface">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:block focus:p-4 focus:text-accent">
          Skip to content
        </a>
        <div className="mx-auto flex min-h-16 w-full max-w-[1440px] flex-col items-center justify-between gap-1 px-5 sm:flex-row sm:px-8">
          <Link href="/" aria-label="JobPilot home" className="landing-focus w-fit rounded-sm py-4 sm:py-0">
            <Image src="/logo.png" alt="JobPilot" width={494} height={168} className="h-auto w-[124px]" />
          </Link>
          <WorkspaceNav />
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-border bg-surface">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:block focus:p-4 focus:text-accent">
        Skip to content
      </a>
      <div className="landing-container grid min-h-20 grid-cols-2 items-center gap-y-3 py-4 sm:grid-cols-[1fr_auto_1fr] sm:py-0">
        <Link href="/" aria-label="JobPilot home" className="landing-focus w-fit rounded-sm">
          <Image src="/logo.png" alt="JobPilot" width={494} height={168} className="h-auto w-[124px]" />
        </Link>
        <nav aria-label="Main navigation" className="col-span-2 row-start-2 flex justify-center gap-8 text-sm text-text-dark sm:col-span-1 sm:col-start-2 sm:row-start-1">
          <Link className="landing-nav-link" href="/dashboard" prefetch={false}>Dashboard</Link>
          <Link className="landing-nav-link" href="/find-jobs" prefetch={false}>Find Jobs</Link>
          <Link className="landing-nav-link" href="/profile" prefetch={false}>Profile</Link>
        </nav>
        <Link href={isAuthenticated ? "/dashboard" : "/login"} prefetch={false} className="landing-button-primary col-start-2 row-start-1 justify-self-end px-5 py-2.5 text-sm sm:col-start-3">
          {isAuthenticated ? "Dashboard" : "Start for free"}
        </Link>
      </div>
    </header>
  );
}
