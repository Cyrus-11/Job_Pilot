import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.JOBPILOT_TEST_DIST_DIR || ".next",
  // Keep PDF.js's worker and native dependencies resolvable from the package.
  serverExternalPackages: [
    "pdf-parse",
    "pdfjs-dist",
    "@react-pdf/renderer",
    "@react-pdf/font",
    "@react-pdf/layout",
    "@react-pdf/render",
    "@react-pdf/textkit",
    "yoga-layout",
  ],
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
