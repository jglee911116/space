import { defineConfig } from '@playwright/test';

const port = 3328;
const baseURL = `http://127.0.0.1:${port}`;
// GitHub 러너는 GPU 가 없어 WebGL 을 SwiftShader(CPU)로 그린다 — 화면을 줄이고 기다림을 늘린다.
// 로그는 저장소 권한이 있어야 보이므로 실패는 github 리포터로 실행 요약 annotation 에도 남긴다.
const ci = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: ci ? 120_000 : 45_000,
  expect: { timeout: ci ? 20_000 : 5_000 },
  reporter: ci ? [['list'], ['github']] : 'list',
  use: {
    baseURL,
    viewport: ci ? { width: 800, height: 500 } : { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    channel: process.env.PLAYWRIGHT_CHANNEL,
    launchOptions: { args: ['--enable-unsafe-swiftshader'] },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm exec next start --hostname 127.0.0.1 --port ${port}`,
    url: `${baseURL}/ko`,
  },
});
