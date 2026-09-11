import type { ReactElement } from "react";

import { CtaLinks } from "@/components/homepage/CtaLinks";

export function ClosingCta(): ReactElement {
  return (
    <>
      <div aria-hidden="true" className="landing-divider" />
      <section aria-labelledby="closing-heading" className="landing-gradient flex min-h-[410px] flex-col items-center justify-center border-y border-border px-5 py-16 text-center">
        <h2 id="closing-heading" className="max-w-[860px] text-[34px] leading-[1.08] font-semibold tracking-[-0.05em] text-text-slate sm:text-[44px] lg:text-[54px]">
          Your next job search can feel a<br className="hidden lg:block" /> lot less overwhelming
        </h2>
        <p className="mt-7 text-base leading-relaxed text-text-dark lg:text-lg">Set up your profile, upload your resume, and start finding matches in minutes.</p>
        <div className="mt-7"><CtaLinks /></div>
      </section>
      <div aria-hidden="true" className="landing-divider border-b border-border" />
    </>
  );
}
