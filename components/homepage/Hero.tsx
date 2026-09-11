import type { ReactElement } from "react";

import { CtaLinks } from "@/components/homepage/CtaLinks";

export function Hero(): ReactElement {
  return (
    <section aria-labelledby="hero-heading" className="landing-gradient flex min-h-[410px] flex-col items-center justify-center px-5 py-14 text-center lg:py-[60px]">
      <h1 id="hero-heading" className="max-w-[900px] text-[38px] leading-[1.08] font-bold tracking-[-0.055em] text-landing-heading sm:text-[52px] lg:text-[64px]">
        Job hunting is hard.<br />Your tools shouldn’t be.
      </h1>
      <p className="mt-6 max-w-[630px] text-base leading-[1.65] text-text-secondary lg:text-lg">
        Stop applying blind. JobPilot finds the jobs, researches the companies, and gives you everything you need to stand out.
      </p>
      <div className="mt-6"><CtaLinks /></div>
    </section>
  );
}
