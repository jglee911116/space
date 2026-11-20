import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // dev 서버는 localhost 외 출처의 HMR·chunk 요청을 막는다 — 127.0.0.1 로 열면 3D 장면 로딩이 멈춘다.
  allowedDevOrigins: ['127.0.0.1'],
  output: 'standalone',
  sassOptions: {
    additionalData: `@use "@/styles/variables" as *;`,
  },
};

export default nextConfig;
