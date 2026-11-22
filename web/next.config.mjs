/** @type {import('next').NextConfig} */
const nextConfig = {
  // The shared API client is TypeScript source inside the monorepo.
  transpilePackages: ["@upkept/api-client"],
};

export default nextConfig;
