import type { ReactElement } from "react";

import { ClosingCta } from "@/components/homepage/ClosingCta";
import { DashboardPreview } from "@/components/homepage/DashboardPreview";
import { Features } from "@/components/homepage/Features";
import { Hero } from "@/components/homepage/Hero";
import { Testimonial } from "@/components/homepage/Testimonial";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { hasInsforgePublicConfig } from "@/lib/insforge-config";
import { createInsforgeServer } from "@/lib/insforge-server";

async function getHomepageAuthState(): Promise<boolean> {
  if (!hasInsforgePublicConfig()) {
    return false;
  }

  const insforge = await createInsforgeServer();
  const {
    data: { user },
  } = await insforge.auth.getCurrentUser();

  return Boolean(user);
}

export default async function Home(): Promise<ReactElement> {
  const isAuthenticated = await getHomepageAuthState();

  return (
    <div className="min-h-screen bg-surface">
      <Navbar isAuthenticated={isAuthenticated} />
      <main id="main-content" className="landing-container mt-8 border-x border-t border-border lg:mt-[60px]">
        <Hero isAuthenticated={isAuthenticated} />
        <DashboardPreview />
        <div aria-hidden="true" className="h-10 border-y border-border lg:h-[74px]" />
        <Features />
        <Testimonial />
        <ClosingCta isAuthenticated={isAuthenticated} />
      </main>
      <Footer />
    </div>
  );
}
