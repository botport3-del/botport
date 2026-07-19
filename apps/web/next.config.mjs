import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The shared `db` workspace package ships TypeScript source, so Next must
  // transpile it rather than expecting pre-built JS.
  transpilePackages: ['db', 'core'],
  // In a pnpm monorepo, trace files from the repo root so the Prisma query
  // engine (a native .node binary in the hoisted store) is bundled into the
  // serverless function on Vercel.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  outputFileTracingIncludes: {
    '/api/**': ['../../node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/**'],
  },
  serverExternalPackages: ['@prisma/client', 'prisma'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.discordapp.com' }],
  },
};

export default nextConfig;
