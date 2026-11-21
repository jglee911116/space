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
  const language = page.getByRole('button', { name: '언어 한국어' });
  const choices = page.getByRole('group', { name: '언어', exact: true });
  await language.focus();
  await page.keyboard.press('Enter');
  await expect(choices.getByRole('button', { name: '한국어' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(choices).toBeHidden();
  await expect(language).toBeFocused();
  await language.click();
  await choices.getByRole('button', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/en\/galaxies\/milky-way\?view=object&target=crab-pulsar$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(details(page).getByRole('heading', { name: 'Crab Pulsar' })).toBeVisible();
});

test('우리은하의 태양 라벨은 항성 상세 화면을 열고 뒤로 가면 지도로 돌아온다', async ({ page }) => {
  await page.goto(`${milkyWay}?view=galaxy`);
  await waitForRenderedMap(page);
  await expect(details(page).getByRole('list', { name: '은하 공전 궤도 색' })).toHaveCount(0);

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

  const saturnRings = page.waitForResponse((response) => response.url().endsWith('/saturn/rings-sss.png') && response.ok());
  const jupiterMap = page.waitForResponse((response) => response.url().endsWith('/textures/galaxies/milky-way/systems/solar/jupiter/jupiter-cassini-pia07782.jpg') && (response.ok() || response.status() === 304));
  await page.goto(`${milkyWay}?system=solar&target=jupiter`);
  await Promise.all([jupiterMap, saturnRings]);
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

test('태양계 밖 성운의 관측 텍스처를 로드한다', async ({ page }) => {
  const shaderErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /THREE\.WebGLProgram|VALIDATE_STATUS/.test(message.text())) {
      shaderErrors.push(message.text());
    }
  });

  for (const target of ['m57', 'pillars-of-creation', 'crab-nebula']) {
    const image = page.waitForResponse((response) => response.url().endsWith(`/objects/${target}/webb.jpg`) && response.ok());
    await page.goto(`${milkyWay}?view=object&target=${target}`);
    await image;
    await expect(details(page)).toContainText('3D 가스 모형');
    await waitForRenderedMap(page);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }

  expect(shaderErrors).toEqual([]);
});

test('세레스를 검색하고 Dawn 지도를 로드한다', async ({ page }) => {
  await page.goto(milkyWay);
  const map = page.waitForResponse((response) => response.url().endsWith('/ceres/ceres-dawn.jpg') && response.ok());
  await search(page, '세레스', /^세레스 /);
  await map;
  await expect(page).toHaveURL(/system=solar&target=ceres$/);
  await expect(details(page).getByRole('heading', { name: '세레스', exact: true })).toBeVisible();
  await waitForRenderedMap(page);
});

test('새 Webb 천체 네 개를 검색하고 관측 텍스처와 3D 모형을 로드한다', async ({ page }) => {
  const shaderErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /THREE\.WebGLProgram|VALIDATE_STATUS/.test(message.text())) shaderErrors.push(message.text());
  });
  await page.goto(milkyWay);
  for (const [id, query, name] of [
    ['l1527-irs', 'LDN 1527', '원시별 L1527 IRS'],
    ['hh-211', 'HH211', '헤르빅–아로 211'],
    ['cassiopeia-a', 'CasA', '카시오페이아 A'],
    ['ngc-3132', 'C74', '남쪽고리성운'],
  ]) {
    const image = page.waitForResponse((response) => response.url().endsWith(`/objects/${id}/webb.jpg`) && response.ok());
    await search(page, query, new RegExp(name));
    await image;
    await expect(page).toHaveURL(new RegExp(`view=object&target=${id}$`));
    await expect(details(page).getByRole('heading', { name, exact: true })).toBeVisible();
    await waitForRenderedMap(page);
  }
  expect(shaderErrors).toEqual([]);
});

test('아펩, HH 30, 수레바퀴 은하를 검색해 각자의 Webb 3D 장면을 연다', async ({ page }) => {
  const shaderErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /THREE\.WebGLProgram|VALIDATE_STATUS/.test(message.text())) shaderErrors.push(message.text());
  });

  await page.goto(milkyWay);
  for (const [id, query, name] of [
    ['apep', 'Apep', '아펩'],
    ['hh-30', 'HH30', '헤르빅–아로 30'],
    ['cartwheel-galaxy', 'ESO 350-40', '수레바퀴 은하'],
  ]) {
    const image = page.waitForResponse((response) => response.url().endsWith(`/${id}/webb.jpg`) && response.ok());
    await search(page, query, new RegExp(name));
    await image;
    const destination = id === 'cartwheel-galaxy' ? '/ko/universe?target=' : `${milkyWay}?view=object&target=`;
    await expect(page).toHaveURL((url) => url.pathname + url.search === destination + id);
    await expect(details(page).getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.locator('main canvas')).toBeVisible();
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }
  expect(shaderErrors).toEqual([]);
});

test('타이탄의 대기와 관측 지표를 전환한다', async ({ page }) => {
  await page.goto(`${milkyWay}?system=solar&target=titan`);
  await waitForRenderedMap(page);
  const toggle = page.getByRole('button', { name: '타이탄 지표 보기' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  const map = page.waitForResponse((response) => response.url().endsWith('/titan/titan-cassini.jpg') && response.ok());
  await toggle.click();
  await map;
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

test('궁수자리 A*에서 EHT 기본 영상과 편광 영상을 전환한다', async ({ page }) => {
  const shaderErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /THREE\.WebGLProgram|VALIDATE_STATUS/.test(message.text())) {
      shaderErrors.push(message.text());
    }
  });

  const intensity = page.waitForResponse((response) => response.url().endsWith('/sgr-a/eht-2022.jpg') && response.ok());
  await page.goto(`${milkyWay}?target=sgr-a`);
  await intensity;
  await expect(details(page)).toContainText('2017년 전파 관측');

  const toggle = details(page).getByRole('checkbox', { name: '편광 보기' });
  await expect(toggle).not.toBeChecked();
  const polarization = page.waitForResponse((response) => response.url().endsWith('/sgr-a/eht-polarized-2024.jpg') && response.ok());
  await toggle.check();
  await polarization;
  await expect(details(page)).toContainText('2024년에 공개한 편광 이미지');
  await toggle.uncheck();
  await expect(details(page)).toContainText('2017년 전파 관측');
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(shaderErrors).toEqual([]);
});

test('궁수자리 A* 편광 영상 로드 실패 후 다시 켜면 재시도한다', async ({ page }) => {
  const polarizationPath = '**/sgr-a/eht-polarized-2024.jpg';
  await page.route(polarizationPath, (route) => route.abort('failed'), { times: 1 });
  await page.goto(`${milkyWay}?target=sgr-a`);

  const toggle = details(page).getByRole('checkbox', { name: '편광 보기' });
  const failed = page.waitForEvent('requestfailed', (request) => request.url().endsWith('/sgr-a/eht-polarized-2024.jpg'));
  await toggle.check();
  await failed;

  await toggle.uncheck();
  const loaded = page.waitForResponse((response) => response.url().endsWith('/sgr-a/eht-polarized-2024.jpg') && response.ok());
  await toggle.check();
  await loaded;
});

test('M87*와 퀘이사의 중력렌즈 장면을 렌더링한다', async ({ page }) => {
  const shaderErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /THREE\.WebGLProgram|VALIDATE_STATUS/.test(message.text())) {
      shaderErrors.push(message.text());
    }
  });

  for (const path of ['/ko/galaxies/m87?view=object&target=m87-star', '/ko/universe?target=3c-273']) {
    await page.goto(path);
    await expect(details(page)).toContainText('중력렌즈');
    await expect(page.locator('main canvas')).toBeVisible();
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }
  expect(shaderErrors).toEqual([]);
});

test('궁수자리 A* 강착 흐름을 일시정지하고 다시 재생한다', async ({ page }) => {
  const intensity = page.waitForResponse((response) => response.url().endsWith('/sgr-a/eht-2022.jpg') && response.ok());
  await page.goto(`${milkyWay}?target=sgr-a`);
  await intensity;
  await expect(page.locator('main canvas')).toBeVisible();

  const clip = { x: 500, y: 200, width: 400, height: 180 };
  const frame = () => page.screenshot({ clip });
  await page.getByRole('button', { name: '시뮬레이션 일시정지' }).click();
  await expect(page.getByRole('button', { name: '시뮬레이션 재생' })).toBeVisible();
  const pausedFrame = await frame();
  expect((await frame()).equals(pausedFrame)).toBe(true);

  await page.getByRole('button', { name: '시뮬레이션 재생' }).click();
  await expect.poll(async () => (await frame()).equals(pausedFrame)).toBe(false);
});

test('M87* 강착원반과 제트가 은하 지도로 축소해도 재생된다', async ({ page }) => {
  await page.goto('/ko/galaxies/m87?view=object&target=m87-star');
  await expect(page.locator('main canvas')).toBeVisible();
  await expect(page.getByText('이 화면은 고정된 관측 배치를 표시합니다.')).toBeHidden();
  await page.getByRole('button', { name: '시뮬레이션 일시정지' }).click();
  await expect(page.getByRole('button', { name: '시뮬레이션 재생' })).toBeVisible();

  const clip = { x: 575, y: 397, width: 95, height: 86 };
  const frame = () => page.screenshot({ clip });
  const stableFrame = async (capture: () => Promise<Buffer>) => {
    let previous = await capture();
    await expect.poll(async () => {
      const current = await capture();
      const stable = current.equals(previous);
      previous = current;
      return stable;
    }).toBe(true);
    return previous;
  };
  const pausedFrame = await stableFrame(frame);

  await page.getByRole('button', { name: '시뮬레이션 재생' }).click();
  await expect.poll(async () => (await frame()).equals(pausedFrame)).toBe(false);

  await page.getByRole('button', { name: '시뮬레이션 일시정지' }).click();
  await page.mouse.move(720, 450);
  await expect.poll(async () => {
    await page.mouse.wheel(0, 560);
    return new URL(page.url()).search;
  }, { intervals: [120], timeout: 12_000 }).toBe('?focus=m87-star');
  await waitForRenderedMap(page);
  await expect(page.getByText('이 화면은 고정된 관측 배치를 표시합니다.')).toBeHidden();
  const jetFrame = () => page.screenshot({ clip: { x: 714, y: 250, width: 105, height: 100 } });
  const pausedDisk = await stableFrame(frame);
  const pausedJet = await stableFrame(jetFrame);

  await page.getByRole('button', { name: '시뮬레이션 재생' }).click();
  await expect.poll(async () => (await frame()).equals(pausedDisk)).toBe(false);
  await expect.poll(async () => (await jetFrame()).equals(pausedJet)).toBe(false);
});

test('커서가 화면 중심에서 벗어나도 궁수자리 A*를 축소한 뒤 다시 확대한다', async ({ page }) => {
  await page.goto(`${milkyWay}?target=sgr-a`);
  await expect(details(page)).toContainText('편광 보기');
  await expect(page.locator('main canvas')).toBeVisible();
  await page.mouse.move(300, 260);

  await expect.poll(async () => {
    await page.mouse.wheel(0, 500);
    return details(page).getByText('편광 보기').isVisible();
  }).toBe(false);
  await expect(page).toHaveURL(/target=sgr-a$/);
  await expect(page.locator('main canvas')).toBeVisible();

  await expect.poll(async () => {
    await page.mouse.wheel(0, -500);
    return details(page).getByText('편광 보기').isVisible();
  }).toBe(true);
});

test('성운과 외부 은하의 블랙홀을 축소해도 은하 지도에서 같은 천체에 초점을 둔다', async ({ page }) => {
  for (const [galaxy, id] of [[milkyWay, 'orion-nebula'], ['/ko/galaxies/m87', 'm87-star']]) {
    const objectUrl = `${galaxy}?view=object&target=${id}`;
    await page.goto(objectUrl);
    await expect(page.locator('main canvas')).toBeVisible();
    await page.mouse.move(720, 450);

    await expect.poll(async () => {
      await page.mouse.wheel(0, 560);
      return new URL(page.url()).search;
    }, { intervals: [120], timeout: 12_000 }).toBe(`?focus=${id}`);
    await waitForRenderedMap(page);

    await expect.poll(async () => {
      await page.mouse.wheel(0, -560);
      return new URL(page.url()).search;
    }, { intervals: [120], timeout: 12_000 }).toBe(`?view=object&target=${id}`);
  }
});
