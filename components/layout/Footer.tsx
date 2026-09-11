import Image from "next/image";
import Link from "next/link";
import type { ReactElement } from "react";

export function Footer(): ReactElement {
  return (
    <footer className="landing-container flex flex-col items-center justify-between gap-6 border-x border-border px-6 py-10 sm:flex-row lg:min-h-[130px] lg:px-10">
      <Link href="/" aria-label="JobPilot home" className="landing-focus rounded-sm">
        <Image src="/logo.png" alt="JobPilot" width={494} height={168} className="h-auto w-[124px]" />
      </Link>
      <nav aria-label="Footer navigation" className="flex flex-wrap justify-center gap-6 text-sm text-text-dark lg:gap-8">
        <Link href="/dashboard" prefetch={false} className="landing-nav-link">Dashboard</Link>
      </nav>
    </footer>
  );
}
