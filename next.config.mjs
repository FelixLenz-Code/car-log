import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // puppeteer (server-side 3D animation rendering) must stay external — it
  // resolves its own Chromium and must not be bundled by Next.
  serverExternalPackages: ["puppeteer", "puppeteer-core"],
  experimental: {
    serverActions: {
      // Allow image uploads (base64) and GLB model uploads (up to ~25MB) in the
      // action payload.
      bodySizeLimit: "30mb",
    },
  },
  webpack: (config) => {
    // tesseract.js is loaded only in the browser (OCR for odometer/fuel capture).
    // Stop webpack from following its Node worker path into the client bundle,
    // which would require Node-only modules (node-fetch, is-url) we don't ship.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "node-fetch": false,
      "is-url": false,
    };
    return config;
  },
};

export default withSerwist(nextConfig);
