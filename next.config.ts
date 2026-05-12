import path from "node:path";
import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Monorepo: `npm run build` sahifalarni to‘g‘ri yig‘ishi (hoisted `node_modules`) uchun.
 * Agar `next dev` da `Cannot find module './N.js'` (383 va h.k.) bo‘lsa: `npm run dev:clean`.
 */
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
