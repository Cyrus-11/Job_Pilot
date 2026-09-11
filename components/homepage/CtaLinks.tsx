import Link from "next/link";
import type { ReactElement } from "react";

export function CtaLinks(): ReactElement {
  return (
    <div className="flex flex-col items-stretch justify-center gap-4 min-[420px]:flex-row min-[420px]:items-center">
      <Link
        href="/login"
        prefetch={false}
        className="landing-button-primary gap-1.5 px-6 py-3 text-base"
      >
        Get Started
        <span aria-hidden="true" className="text-xs text-surface/65">▶</span>
      </Link>
      <Link
        href="/find-jobs"
        prefetch={false}
        className="landing-button-secondary px-6 py-3 text-base"
      >
        Find Your First Match
      </Link>
    </div>
  );
}
