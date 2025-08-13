// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "reovcaxdkizsjddgacee.supabase.co",
        pathname: "/storage/v1/object/public/listing-images/**",
      },
    ],
  },
};

export default nextConfig;
