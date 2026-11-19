import type { NextConfig } from "next";

const desktop = process.env.BUILD_TARGET === "desktop";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Desktop (Electron) build: self-contained server bundle that runs offline.
  ...(desktop ? { output: "standalone" as const, outputFileTracingIncludes: { "/**": ["./node_modules/@electric-sql/pglite/dist/**/*", "./drizzle/**/*"] } } : {}),
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  serverExternalPackages: ["@electric-sql/pglite"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        source: "/models/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
