import { PostHog } from "posthog-node";

import { getPostHogConfig } from "@/lib/posthog-config";

type JobSearchStartedProperties = {
  userId: string;
  jobTitle: string;
  location: string;
};

type JobFoundProperties = {
  userId: string;
  source: "search" | "url";
  matchScore: number;
};

type ProfileCompletedProperties = {
  userId: string;
};

type CompanyResearchedProperties = {
  userId: string;
  jobId: string;
  company: string;
};

type PostHogEvent =
  | {
      event: "job_search_started";
      properties: JobSearchStartedProperties;
    }
  | {
      event: "job_found";
      properties: JobFoundProperties;
    }
  | {
      event: "profile_completed";
      properties: ProfileCompletedProperties;
    }
  | {
      event: "company_researched";
      properties: CompanyResearchedProperties;
    };

export function createPostHogServerClient(): PostHog | null {
  const config = getPostHogConfig();

  if (!config) return null;

  return new PostHog(config.projectToken, {
    host: config.host,
    flushAt: 1,
    flushInterval: 0,
    // These per-call clients must not register process-wide exception listeners.
    enableExceptionAutocapture: false,
  });
}

export async function capturePostHogServerEvent({
  event,
  properties,
}: PostHogEvent): Promise<void> {
  try {
    const posthog = createPostHogServerClient();

    if (!posthog) {
      return;
    }

    posthog.capture({
      distinctId: properties.userId,
      event,
      properties,
    });
    await posthog.shutdown();
  } catch (error) {
    console.error("[lib/posthog-server] PostHog capture failed", error);
  }
}

export async function identifyPostHogServerUser(
  userId: string,
  properties?: { email?: string; name?: string },
): Promise<void> {
  try {
    const posthog = createPostHogServerClient();

    if (!posthog) {
      return;
    }

    posthog.identify({
      distinctId: userId,
      properties,
    });
    await posthog.shutdown();
  } catch (error) {
    console.error("[lib/posthog-server] PostHog identify failed", error);
  }
}

export async function capturePostHogServerException(
  error: unknown,
  distinctId: string | null | undefined,
  properties?: Record<string, string | boolean | number>,
): Promise<void> {
  if (!distinctId) {
    return;
  }

  try {
    const posthog = createPostHogServerClient();

    if (!posthog) {
      return;
    }

    posthog.captureException(error, distinctId, properties);
    await posthog.shutdown();
  } catch (posthogError) {
    console.error(
      "[lib/posthog-server] PostHog exception capture failed",
      posthogError,
    );
  }
}
