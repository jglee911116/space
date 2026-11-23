import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // 로케일 세그먼트가 루트 레이아웃이라 일치하지 않는 주소는 app/global-not-found.tsx 가 받는다.
  experimental: { globalNotFound: true },
  // dev 서버는 localhost 외 출처의 HMR·chunk 요청을 막는다 — 127.0.0.1 로 열면 3D 장면 로딩이 멈춘다.
  allowedDevOrigins: ['127.0.0.1'],
  // ?v= 로 버전을 붙인 Gaia 표본은 다시 만들 때 gaiaVersion 을 올리므로 영구 캐시해도 된다.
  async headers() {
    return [{ source: '/catalog/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }];
  },
  sassOptions: {
    additionalData: `@use "@/styles/variables" as *;`,
  },
};

export default nextConfig;
