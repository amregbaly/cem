/**
 * api-client.ts
 * Centralized API base URL helper.
 *
 * Always returns an empty string so that all fetch calls use relative URLs
 * (e.g. `/api/v1/...`). This guarantees that:
 *  - In development: Next.js rewrites in next.config.mjs proxy /api/* → http://127.0.0.1:8001/api/*
 *  - In production behind Nginx: Nginx proxies /api/* → http://127.0.0.1:8001/api/*
 *  - No mixed-content errors: requests inherit the page's protocol (https/http)
 *
 * IMPORTANT: Never use NEXT_PUBLIC_API_URL with an absolute URL in production
 * when the site is behind an HTTPS reverse proxy — it causes Mixed Content errors.
 */

/**
 * Returns the API base URL prefix. Always empty string for relative paths.
 * Use as: `fetch(\`${getApiBase()}/api/v1/...\`)`
 */
export function getApiBase(): string {
  // Always use relative URLs — never hardcode the host.
  // next.config.mjs rewrites handle /api/* → backend in dev.
  // Nginx handles /api/* → backend in production.
  return "";
}

/**
 * Convenience helper: build a full API path.
 * Usage: apiPath("/api/v1/portal/config")
 */
export function apiPath(path: string): string {
  return `${getApiBase()}${path}`;
}
