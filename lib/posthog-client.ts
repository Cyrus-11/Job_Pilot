import posthog from "posthog-js";

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

export function hasPostHogBrowserConfig(): boolean {
  return getPostHogConfig() !== null;
}

export function identifyPostHogUser(
  userId: string,
  properties?: { email?: string; name?: string },
): void {
  if (!hasPostHogBrowserConfig()) {
    return;
  }

  posthog.identify(userId, properties);
}

export function resetPostHogUser(): void {
  if (!hasPostHogBrowserConfig()) {
    return;
  }

  posthog.reset();
}

export function getPostHogDistinctId(): string | null {
  if (!hasPostHogBrowserConfig()) {
    return null;
  }

  return posthog.get_distinct_id();
}

export function capturePostHogEvent({ event, properties }: PostHogEvent): void {
  if (!hasPostHogBrowserConfig()) {
    return;
  }

  posthog.capture(event, properties);
}

export function capturePostHogClientException(error: unknown): void {
  if (!hasPostHogBrowserConfig()) {
    return;
  }

  posthog.captureException(error);
}
