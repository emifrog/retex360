import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default withSentryConfig(nextConfig, {
  // Sentry options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  
  // Suppress logs during build
  silent: !process.env.CI,
  
  // Upload source maps for better stack traces
  widenClientFileUpload: true,
  
  // Source maps configuration
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  
  // Automatically tree-shake Sentry logger
  disableLogger: true,
  
  // Enable React component annotations
  reactComponentAnnotation: {
    enabled: true,
  },
});
