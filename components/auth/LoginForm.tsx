"use client";

import { useActionState } from "react";

import { signInWithOAuth, type AuthActionState } from "@/actions/auth";
import { getPostHogDistinctId } from "@/lib/posthog-client";

type ProviderButtonProps = {
  label: string;
  provider: "google" | "github";
  mark: string;
  onSelect: () => void;
};

function ProviderButton({ label, provider, mark, onSelect }: ProviderButtonProps) {
  return (
    <button
      className="flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
      name="provider"
      onClick={onSelect}
      type="submit"
      value={provider}
    >
      <span className="flex size-6 items-center justify-center rounded-full border border-border text-xs font-semibold text-text-dark">
        {mark}
      </span>
      {label}
    </button>
  );
}

type LoginFormProps = {
  isConfigured: boolean;
  initialError?: string;
};

export function LoginForm({ isConfigured, initialError }: LoginFormProps) {
  const initialState: AuthActionState = {
    success: !initialError,
    error: initialError,
  };
  const [state, action, pending] = useActionState(signInWithOAuth, initialState);

  const attachPostHogDistinctId = (): void => {
    const input = document.querySelector<HTMLInputElement>(
      'input[name="posthogDistinctId"]',
    );

    if (input) {
      input.value = getPostHogDistinctId() ?? "";
    }
  };

  return (
    <form action={action} className="space-y-3" aria-busy={pending}>
      <input name="posthogDistinctId" type="hidden" />
      <fieldset className="space-y-3" disabled={pending || !isConfigured}>
        <ProviderButton label="Continue with Google" provider="google" mark="G" onSelect={attachPostHogDistinctId} />
        <ProviderButton label="Continue with GitHub" provider="github" mark="GH" onSelect={attachPostHogDistinctId} />
      </fieldset>

      {!isConfigured ? (
        <p className="rounded-md border border-warning bg-surface px-3 py-2 text-sm font-medium text-text-secondary">
          InsForge auth is not configured yet.
        </p>
      ) : null}

      {state.error ? (
        <p role="alert" className="rounded-md border border-error bg-surface px-3 py-2 text-sm font-medium text-error">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
