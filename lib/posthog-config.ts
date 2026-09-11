type PostHogConfig = {
  projectToken: string;
  host: string;
};

export function getPostHogConfig(): PostHogConfig | null {
  const projectToken =
    process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() ||
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();

  return projectToken && host ? { projectToken, host } : null;
}
