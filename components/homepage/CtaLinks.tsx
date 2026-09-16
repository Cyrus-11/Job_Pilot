import Link from "next/link";
import type { ReactElement } from "react";

type CtaLinksProps = {
  isAuthenticated?: boolean;
};

export function CtaLinks({
  isAuthenticated = false,
}: CtaLinksProps): ReactElement {
  const primaryHref = isAuthenticated ? "/dashboard" : "/login";
  const primaryLabel = isAuthenticated ? "Go to Dashboard" : "Get Started";

  return (
    <div className="flex flex-col items-stretch justify-center gap-4 min-[420px]:flex-row min-[420px]:items-center">
      <Link
        href={primaryHref}
        prefetch={false}
        className="landing-button-primary gap-1.5 px-6 py-3 text-base"
      >
        {primaryLabel}
        <span aria-hidden="true" className="text-xs text-surface/65">{"\u25b6"}</span>
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
