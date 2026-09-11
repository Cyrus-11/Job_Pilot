import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { PostHogIdentify } from "@/components/auth/PostHogIdentify";
import { hasInsforgePublicConfig } from "@/lib/insforge-config";
import { createInsforgeServer } from "@/lib/insforge-server";
import { getPostHogConfig } from "@/lib/posthog-config";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JobPilot — Your next job starts here",
  description:
    "Job hunting is hard. Your tools shouldn’t be. Find relevant jobs, understand your match, and research companies with JobPilot.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  let analyticsUser: { id: string; email?: string; name?: string } | null = null;

  if (hasInsforgePublicConfig() && getPostHogConfig()) {
    const insforge = await createInsforgeServer();
    const { data: { user } } = await insforge.auth.getCurrentUser();

    if (user) {
      analyticsUser = {
        id: user.id,
        email: user.email,
        ...(user.profile?.name ? { name: user.profile.name } : {}),
      };
    }
  }

  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PostHogIdentify user={analyticsUser} />
        {children}
      </body>
    </html>
  );
}
