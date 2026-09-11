import type { ReactElement } from "react";

import { ClosingCta } from "@/components/homepage/ClosingCta";
import { DashboardPreview } from "@/components/homepage/DashboardPreview";
import { Features } from "@/components/homepage/Features";
import { Hero } from "@/components/homepage/Hero";
import { Testimonial } from "@/components/homepage/Testimonial";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

export default function Home(): ReactElement {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main id="main-content" className="landing-container mt-8 border-x border-t border-border lg:mt-[60px]">
        <Hero />
        <DashboardPreview />
        <div aria-hidden="true" className="h-10 border-y border-border lg:h-[74px]" />
        <Features />
        <Testimonial />
        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
