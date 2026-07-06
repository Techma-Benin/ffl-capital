/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/feeding-platform",
        destination: "/feeding-platform/index.html",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
