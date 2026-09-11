import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";

import { LoginForm } from "@/components/auth/LoginForm";
import { hasInsforgePublicConfig } from "@/lib/insforge-config";
import { createInsforgeServer } from "@/lib/insforge-server";

type LoginPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps): Promise<ReactElement> {
  const isConfigured = hasInsforgePublicConfig();

  if (isConfigured) {
    const insforge = await createInsforgeServer();
    const {
      data: { user },
    } = await insforge.auth.getCurrentUser();

    if (user) {
      redirect("/dashboard");
    }
  }

  const { error } = await searchParams;
  const initialError =
    error === "oauth_callback"
      ? "We couldn't complete your sign-in. Please try again."
      : undefined;

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[440px] flex-col justify-center">
        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <Link href="/" aria-label="JobPilot home" className="landing-focus mb-8 block w-fit rounded-sm">
            <Image src="/logo.png" alt="JobPilot" width={494} height={168} className="h-auto w-[132px]" priority />
          </Link>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold leading-8 text-text-primary">
              Sign in to JobPilot
            </h1>
            <p className="mt-2 text-sm font-medium leading-5 text-text-secondary">
              Use your Google or GitHub account to continue.
            </p>
          </div>

          <LoginForm isConfigured={isConfigured} initialError={initialError} />
        </section>
      </div>
    </main>
  );
}
