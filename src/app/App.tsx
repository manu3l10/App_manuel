import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { buildCanonicalUrl, shouldRedirectToCanonicalHost } from "../lib/siteUrl";
import { useViewportSync } from "../lib/useViewportSync";
import { router } from "./routes";

export default function App() {
  useViewportSync();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!shouldRedirectToCanonicalHost(window.location.host)) return;

    window.location.replace(buildCanonicalUrl(window.location.href));
  }, []);

  return <RouterProvider router={router} />;
}
