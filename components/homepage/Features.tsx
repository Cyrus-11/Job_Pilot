import Image from "next/image";
import type { ReactElement } from "react";

import { FeatureDetails } from "@/components/homepage/FeatureDetails";

export function Features(): ReactElement {
  return (
    <>
      <section aria-labelledby="search-heading" className="grid border-b border-border lg:grid-cols-2">
        <FeatureDetails
          heading={<>Manage Your Job<br />Search With Ease</>}
          headingId="search-heading"
          accent="search"
          items={[
            { title: "Find jobs that actually fit", description: "Search by title and location or paste a job link. Get matched roles you can quickly scan." },
            { title: "Know the Company Before You Apply", description: "Stop guessing what a company is about. JobPilot browses their site and gives you everything you need to apply with confidence." },
            { title: "Keep track of every application", description: "Keep a clear view of every job you’ve found, tailored. Your activity and progress all stay in one simple place." },
          ]}
        />
        <div className="flex items-center justify-center border-t border-border bg-background px-6 py-12 lg:border-t-0 lg:border-l">
          <Image src="/images/user-icon.png" alt="Example job matches for Vercel, Stripe, Linear, Notion, OpenAI, and Figma, with match scores and salary estimates." width={2364} height={1778} sizes="(max-width: 767px) 85vw, (max-width: 1439px) 42vw, 588px" className="h-auto w-full" />
        </div>
      </section>
      <div aria-hidden="true" className="landing-divider" />
      <section aria-labelledby="matching-heading" className="grid border-y border-border lg:grid-cols-2">
        <div className="order-2 flex items-center justify-center border-t border-border bg-background px-10 py-12 lg:order-1 lg:border-t-0 lg:border-r lg:px-[50px]">
          <Image src="/images/dashboard-demo.png" alt="Illustration of the JobPilot agent log finding matching roles and preparing application materials." width={2144} height={1656} sizes="(max-width: 767px) 80vw, (max-width: 1439px) 38vw, 536px" className="h-auto w-full" />
        </div>
        <div className="order-1 lg:order-2">
          <FeatureDetails
            heading={<>Apply With More<br />Confidence, Every Time</>}
            headingId="matching-heading"
            accent="matching"
            items={[
              { title: "Understand your match score", description: "See how your profile lines up with each role before you apply. Get a clear breakdown of what fits and what’s missing." },
              { title: "AI-Powered Job Matching", description: "Stop guessing which jobs are worth applying to. JobPilot scores every role against your actual skills so you focus on the ones that matter." },
              { title: "Focus on the right roles", description: "Filter out low fit jobs and stay on the ones that actually matter. Spend less time sorting and more time applying." },
            ]}
          />
        </div>
      </section>
      <div aria-hidden="true" className="landing-divider" />
    </>
  );
}
