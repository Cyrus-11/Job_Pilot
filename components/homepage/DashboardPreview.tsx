import Image from "next/image";
import type { ReactElement } from "react";

export function DashboardPreview(): ReactElement {
  return (
    <section aria-label="JobPilot dashboard preview" className="border-t border-border bg-surface-tertiary/60 px-4 py-6 sm:px-10 lg:px-10 lg:py-6">
      <Image
        src="/images/jobs-lists.png"
        alt="JobPilot dashboard showing 284 jobs found, an 82% average match rate, 35 companies researched, recent activity, and company research analytics."
        width={4788}
        height={2416}
        sizes="(max-width: 767px) 92vw, (max-width: 1439px) 84vw, 1192px"
        loading="eager"
        className="h-auto w-full"
      />
    </section>
  );
}
