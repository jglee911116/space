import { expect, test, type Page } from '@playwright/test';

const milkyWay = '/ko/galaxies/milky-way';

async function countWindPixels(page: Page, screenshot: Buffer, warm: boolean, inner: number, outer: number) {
  return page.evaluate(
    async ({ png, warm, inner, outer }) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob());
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext('2d')!;
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      const { width, height, data } = context.getImageData(0, 0, canvas.width, canvas.height);
      let pixels = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const radiusSquared = (x - width / 2) ** 2 + (y - height / 2) ** 2;
          if (radiusSquared < inner ** 2 || radiusSquared > outer ** 2) continue;
          const index = (y * width + x) * 4;
          const [red, green, blue] = data.subarray(index, index + 3);
          if (warm ? red > 47 && red - blue > 18 && red - green > 8 : blue > 51 && blue - red > 18 && green > 36) pixels++;
        }
      }
      return pixels;
    },
    { png: screenshot.toString('base64'), warm, inner, outer },
  );
}

for (const [id, warm, surfaceEdge] of [
  ['betelgeuse', true, 151],
  ['rigel-a', false, 192],
] as const) {
  test(`${id}의 항성풍은 회전 후에도 보이고 지도에서 서서히 작아진다`, async ({ page }, testInfo) => {
    await page.goto(`${milkyWay}?view=object&target=${id}`);
    await expect(page.locator('main canvas')).toBeVisible();
    await page.getByRole('button', { name: '시뮬레이션 일시정지' }).click();

    const capture = async (name: string) => {
      const png = await page.screenshot({ clip: { x: 480, y: 210, width: 480, height: 480 } });
      await testInfo.attach(name, { body: png, contentType: 'image/png' });
      return png;
    };

    const front = await capture('detail-front');
    expect(await countWindPixels(page, front, warm, surfaceEdge, 224)).toBeGreaterThan(100);
    await page.mouse.move(660, 430);
    await page.mouse.down();
    await page.mouse.move(770, 466, { steps: 8 });
    await page.mouse.up();
    const side = await capture('detail-turned');
    expect(await countWindPixels(page, side, warm, surfaceEdge, 224)).toBeGreaterThan(100);

    await page.mouse.move(720, 450);
    await expect
      .poll(
        async () => {
          await page.mouse.wheel(0, 530);
          return new URL(page.url()).search;
        },
        { intervals: [135], timeout: 12_000 },
      )
      .toBe(`?focus=${id}`);
    await expect(page.getByRole('group', { name: '화면 거리 축척' })).toContainText('화면 축척');
    const overview = await capture('map-handoff');
    const overviewWind = await countWindPixels(page, overview, warm, 96, 217);
    expect(overviewWind).toBeGreaterThan(100);

    for (let step = 0; step < 5; step++) {
      await page.mouse.wheel(0, 430);
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    }
    const far = await capture('map-zoomed-out');
    expect(await countWindPixels(page, far, warm, 96, 217)).toBeLessThan(overviewWind * 0.4);
  });
}

test('백조자리 X-1을 축소해도 화면 바깥에 푸른 고리가 생기지 않는다', async ({ page }) => {
  await page.goto(`${milkyWay}?focus=cygnus-x-1`);
  await expect(page.getByRole('group', { name: '화면 거리 축척' })).toContainText('화면 축척');
  await page.mouse.move(720, 450);
  for (let group = 0; group < 4; group++) {
    for (let step = 0; step < 3; step++) {
      await page.mouse.wheel(0, 140);
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    }
    const png = await page.screenshot({ clip: { x: 345, y: 75, width: 750, height: 750 } });
    expect(await countWindPixels(page, png, false, 200, 360)).toBeLessThan(700);
  }
});
