import { expect, test as base } from '@playwright/test';

// 모든 테스트의 page 에서 페이지 예외와 WebGL 셰이더 컴파일 오류를 실패로 본다(직접 만든 context 의 page 는 제외).
export const test = base.extend({
  page: async ({ page }, run) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && /WebGLProgram|VALIDATE_STATUS/.test(message.text())) errors.push(message.text());
    });
    await run(page);
    expect(errors).toEqual([]);
  },
});

export { expect };
