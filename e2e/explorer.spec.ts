import { expect, test, type Page } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';

const milkyWay = '/ko/galaxies/milky-way';
const details = (page: Page) => page.locator('section[aria-labelledby="body-name"]');

async function search(page: Page, query: string, result: RegExp) {
  await page.getByRole('button', { name: '천체 검색' }).click();
  const panel = page.getByRole('region', { name: '천체 검색' });
  await panel.getByRole('searchbox').fill(query);
  await panel.getByRole('button', { name: result }).click();
}

async function waitForRenderedMap(page: Page) {
  await expect(page.locator('main canvas')).toBeVisible();
  await expect(page.getByRole('group', { name: '화면 거리 축척' })).toContainText('화면 축척');
}

test('검색 결과와 언어 전환은 선택한 천체를 유지한다', async ({ page }) => {
  await page.goto(milkyWay);
  await search(page, 'PSR B0531+21', /게 펄서/);
  await expect(details(page).getByRole('heading', { name: '게 펄서' })).toBeVisible();
  await page.getByRole('combobox', { name: '언어' }).selectOption('en');
  await expect(page).toHaveURL(/\/en\/galaxies\/milky-way\?view=object&target=crab-pulsar$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(details(page).getByRole('heading', { name: 'Crab Pulsar' })).toBeVisible();
});

test('우리은하의 태양 라벨은 항성 상세 화면을 열고 뒤로 가면 지도로 돌아온다', async ({ page }) => {
  await page.goto(`${milkyWay}?view=galaxy`);
  await waitForRenderedMap(page);

  const canvas = await page.locator('main canvas').boundingBox();
  if (!canvas) throw new Error('Milky Way canvas not mounted');
  // Project the Sun in the map's default 45-degree camera. Its label has no screen offset.
  const camera = new PerspectiveCamera(45, canvas.width / canvas.height);
  camera.position.set(0, 36, 28);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const sun = new Vector3(8 * Math.cos(0.36), 0, 8 * Math.sin(0.36)).project(camera);
  await page.mouse.click(canvas.x + ((sun.x + 1) * canvas.width) / 2, canvas.y + ((1 - sun.y) * canvas.height) / 2);

  await expect(page).toHaveURL(/\/ko\/galaxies\/milky-way\?system=solar&target=sun$/);
  await expect(details(page).getByRole('heading', { name: '태양', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/ko\/galaxies\/milky-way\?view=galaxy$/);
  await expect(details(page).getByRole('heading', { name: '우리은하', exact: true })).toBeVisible();
});

test('새 성단과 근거리 외계행성의 검색 결과에서 상세 화면을 연다', async ({ page }) => {
  await page.goto(milkyWay);
  await search(page, 'M45', /플레이아데스/);
  await expect(details(page).getByRole('heading', { name: /플레이아데스/ })).toBeVisible();
  await waitForRenderedMap(page);

  await search(page, 'Gliese 12 b', /Gliese 12 b/);
  await expect(details(page).getByRole('heading', { name: 'Gliese 12 b', exact: true })).toBeVisible();
});

const associationCases = [
  { query: 'M51 pair', name: '소용돌이 은하 쌍', member: 'M51 · NGC 5194', id: 'm51', region: 'virgo', association: 'm51-pair' },
  { query: 'M81 은하군', name: 'M81 은하군', member: 'M81 · NGC 3031', id: 'm81', region: 'virgo', association: 'm81-group' },
  { query: 'M96 Group', name: '사자자리 I 은하군', member: 'M96 · NGC 3368', id: 'm96', region: 'virgo', association: 'leo-i' },
  { query: 'Abell 1060', name: '바다뱀자리 I 은하단', member: 'NGC 3311', id: 'ngc-3311', region: 'laniakea', association: 'hydra-i' },
];

for (const { query, name, member, id, region, association } of associationCases) {
  test(`${name}에서 개별 은하를 열고 휠로 상위 지도로 돌아온다`, async ({ page }) => {
    await page.goto(milkyWay);
    await search(page, query, new RegExp(name));
    await expect(page).toHaveURL(`/ko/superclusters/${region}?view=cluster&cluster=${association}`);
    await expect(details(page).getByRole('heading', { name })).toBeVisible();
    await details(page).getByRole('button', { name: member, exact: true }).click();
    const galaxy = `/ko/galaxies/${id}`;
    await expect(page).toHaveURL(galaxy);
    await expect(details(page).getByRole('heading', { name: member, exact: true })).toBeVisible();
    await waitForRenderedMap(page);

    const canvas = await page.locator('main canvas').boundingBox();
    if (!canvas) throw new Error(`${member} canvas not mounted`);
    await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
    for (let step = 0; step < 20 && page.url().endsWith(galaxy); step++) {
      await page.mouse.wheel(0, 160);
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    }
    await expect(page).toHaveURL(`/ko/superclusters/${region}?view=cluster&cluster=${association}`);
    await expect(details(page).getByRole('heading', { name })).toBeVisible();
  });
}

test('목성과 토성의 대기 특징을 표시하고 행성 셰이더를 컴파일한다', async ({ page }) => {
  const shaderErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /THREE\.WebGLProgram|VALIDATE_STATUS/.test(message.text())) {
      shaderErrors.push(message.text());
    }
  });

  const jupiterMap = page.waitForResponse((response) => response.url().endsWith('/textures/galaxies/milky-way/systems/solar/jupiter/jupiter-cassini-pia07782.jpg') && (response.ok() || response.status() === 304));
  await page.goto(`${milkyWay}?system=solar&target=jupiter`);
  await jupiterMap;
  await expect(details(page)).toContainText('남위 약 22°에 대적점');
  await waitForRenderedMap(page);

  await search(page, '토성', /^토성 /);
  await expect(details(page)).toContainText('육각형 제트류');
  await waitForRenderedMap(page);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(shaderErrors).toEqual([]);
});

test('태양 코로나와 새 행성·위성 표면의 설명을 열고 WebGL 오류를 확인한다', async ({ page }) => {
  const shaderErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /THREE\.WebGLProgram|VALIDATE_STATUS/.test(message.text())) {
      shaderErrors.push(message.text());
    }
  });

  for (const [target, description, asset] of [
    ['sun', '아치형 홍염', 'sun-sss.jpg'],
    ['mars', '올림푸스산', 'mars-sss.jpg'],
    ['neptune', '보이저 2호가 1989년', 'neptune-sss.jpg'],
    ['io', '어두운 화산 지대', 'io-jpl.jpg'],
    ['europa', '길게 교차하는 균열', 'europa-jpl.jpg'],
  ]) {
    const map = asset && page.waitForResponse((response) => response.url().endsWith(`/textures/galaxies/milky-way/systems/solar/${target}/${asset}`) && (response.ok() || response.status() === 304));
    await page.goto(`${milkyWay}?system=solar&target=${target}`);
    await map;
    await expect(details(page)).toContainText(description);
    await waitForRenderedMap(page);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }

  expect(shaderErrors).toEqual([]);
});
