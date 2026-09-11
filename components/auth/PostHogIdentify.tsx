"use client";

import { useEffect } from "react";

import {
  capturePostHogClientException,
  hasPostHogBrowserConfig,
  identifyPostHogUser,
  resetPostHogUser,
} from "@/lib/posthog-client";

const identifiedUserStorageKey = "jobpilot_posthog_identified_user";

type PostHogIdentifyProps = {
  user: { id: string; email?: string; name?: string } | null;
};

export function PostHogIdentify({ user }: PostHogIdentifyProps) {
  const userId = user?.id;
  const email = user?.email;
  const name = user?.name;

  useEffect(() => {
    if (!hasPostHogBrowserConfig()) {
      return;
    }

    try {
      const previousUserId = localStorage.getItem(identifiedUserStorageKey);

      if (userId) {
        if (previousUserId && previousUserId !== "true" && previousUserId !== userId) {
          resetPostHogUser();
        }
        identifyPostHogUser(userId, { email, ...(name ? { name } : {}) });
        localStorage.setItem(identifiedUserStorageKey, userId);
      } else if (previousUserId) {
        resetPostHogUser();
        localStorage.removeItem(identifiedUserStorageKey);
      }
    } catch (error) {
      capturePostHogClientException(error);
    }
  }, [userId, email, name]);

  return null;
}
