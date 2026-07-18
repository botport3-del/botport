/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The shared `db` workspace package ships TypeScript source, so Next must
  // transpile it rather than expecting pre-built JS.
  transpilePackages: ['db'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.discordapp.com' }],
  },
};

export default nextConfig;
