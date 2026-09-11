import { redirect } from "next/navigation";
import type { ReactElement, ReactNode } from "react";

import { Navbar } from "@/components/layout/Navbar";
import { hasInsforgePublicConfig } from "@/lib/insforge-config";
import { createInsforgeServer } from "@/lib/insforge-server";

type WorkspaceLayoutProps = {
  children: ReactNode;
};

export default async function WorkspaceLayout({
  children,
}: WorkspaceLayoutProps): Promise<ReactElement> {
  if (!hasInsforgePublicConfig()) redirect("/login");

  const insforge = await createInsforgeServer();
  const { data, error } = await insforge.auth.getCurrentUser();

  if (error || !data.user) redirect("/login");

  return (
    <>
      <Navbar isAuthenticated />
      <main id="main-content" className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8">
        {children}
      </main>
    </>
  );
}
