import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Tắt service worker ở môi trường Dev tránh lỗi cache cục bộ
});

const nextConfig: NextConfig = {
  turbopack: {},
};

export default withPWA(nextConfig);
