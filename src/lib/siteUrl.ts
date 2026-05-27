const DEFAULT_SITE_URL = "https://appmta.vercel.app";

function normalizeSiteUrl(value?: string | null) {
  const trimmedValue = value?.trim();
  if (!trimmedValue) return DEFAULT_SITE_URL;

  try {
    return new URL(trimmedValue).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function getCanonicalSiteUrl() {
  return normalizeSiteUrl(import.meta.env.VITE_SITE_URL);
}

export function getCanonicalHost() {
  return new URL(getCanonicalSiteUrl()).host;
}

export function getAuthRedirectUrl() {
  if (typeof window === "undefined") return getCanonicalSiteUrl();

  const canonicalUrl = new URL(getCanonicalSiteUrl());
  canonicalUrl.pathname = window.location.pathname;
  canonicalUrl.search = window.location.search;

  return canonicalUrl.toString();
}

export function shouldRedirectToCanonicalHost(currentHost: string) {
  if (!currentHost) return false;

  const canonicalHost = getCanonicalHost();
  if (currentHost === canonicalHost) return false;

  return currentHost === "appmanuel.vercel.app";
}

export function buildCanonicalUrl(currentUrl: string) {
  const nextUrl = new URL(currentUrl);
  const canonical = new URL(getCanonicalSiteUrl());

  nextUrl.protocol = canonical.protocol;
  nextUrl.host = canonical.host;

  return nextUrl.toString();
}
