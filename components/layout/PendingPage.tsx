import Link from "next/link";
import type { ReactElement } from "react";

type PendingPageProps = {
  title: string;
  message: string;
};

export function PendingPage({ title, message }: PendingPageProps): ReactElement {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold leading-8 text-text-primary">{title}</h1>
      <div className="space-y-3 border-t border-border py-8">
        <h2 className="text-base font-semibold leading-6 text-text-primary">Coming soon</h2>
        <p className="max-w-xl text-sm leading-5 text-text-secondary">{message}</p>
        <Link href="/" className="landing-nav-link inline-block text-sm">Back to home</Link>
      </div>
    </section>
  );
}
