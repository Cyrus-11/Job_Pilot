import posthog from "posthog-js";

import { getPostHogConfig } from "@/lib/posthog-config";

const config = getPostHogConfig();

if (config) {
  posthog.init(config.projectToken, {
    api_host: config.host,
    capture_pageview: false,
    defaults: "2026-05-30",
    capture_exceptions: true,
    tracing_headers: [window.location.hostname],
    debug: process.env.NODE_ENV === "development",
  });
} else if (process.env.NODE_ENV === "development") {
  console.warn(
    "[PostHog] Analytics disabled. Set NEXT_PUBLIC_POSTHOG_KEY and NEXT_PUBLIC_POSTHOG_HOST to enable tracking.",
  );
}
