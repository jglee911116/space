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

test('검색어 지우기 버튼은 팝업을 유지하고 검색창에 포커스를 돌려준다', async ({ page }) => {
  await page.goto(milkyWay);
  await page.getByRole('button', { name: '천체 검색' }).click();
  const panel = page.getByRole('region', { name: '천체 검색' });
  const input = panel.getByRole('searchbox');
  const clear = panel.getByRole('button', { name: '검색어 지우기' });
  await expect(clear).toHaveCount(0);
  await input.fill('M42');
  await clear.click();
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
  await expect(clear).toHaveCount(0);
  await input.fill('M42');
  await input.press('Enter');
  await expect(page).toHaveURL(/target=orion-nebula$/);
});

test('검색 결과와 언어 전환은 선택한 천체를 유지한다', async ({ page }) => {
  await page.goto(milkyWay);
  await search(page, 'PSR B0531+21', /게성운/);
  await expect(details(page).getByRole('heading', { name: '게성운' })).toBeVisible();
  await expect(page.getByRole('button', { name: /게 펄서.*확대/ })).toHaveCount(0);
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
  await expect(page).toHaveURL(/\/en\/galaxies\/milky-way\?view=object&target=crab-nebula$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(details(page).getByRole('heading', { name: 'Crab Nebula' })).toBeVisible();
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

for (const [startPage, delta, scenario] of [
  ['/ko/superclusters/virgo', -500, '처녀자리 초은하단에서 확대'],
  [milkyWay, 500, '우리은하에서 축소'],
] as const) {
  test(`${scenario}하면 국부 은하군의 화면 중심에 우리은하가 놓인다`, async ({ page }) => {
    await page.goto(startPage);
    await waitForRenderedMap(page);
    const map = page.locator('main canvas');
    const bounds = await map.boundingBox();
    if (!bounds) throw new Error('Starting map canvas not mounted');
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);

    await expect.poll(async () => {
      if (new URL(page.url()).pathname !== '/ko/local-group') await page.mouse.wheel(0, delta);
      return new URL(page.url()).pathname;
    }, { intervals: [150], timeout: 12_000 }).toBe('/ko/local-group');
    await expect(page).toHaveURL('/ko/local-group?galaxy=milky-way');
    await waitForRenderedMap(page);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

    const groupCanvas = await map.boundingBox();
    if (!groupCanvas) throw new Error('Local Group canvas not mounted');
    // The Milky Way marker is anchored to the center with a fixed vertical label offset.
    await page.mouse.click(groupCanvas.x + groupCanvas.width / 2, groupCanvas.y + groupCanvas.height / 2 - 0.85 * 30);
    await expect(page).toHaveURL(milkyWay);
  });
}

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
  { query: 'Abell 3627', name: '노르마 은하단', member: 'ESO 137-001', id: 'eso-137-001', region: 'laniakea', association: 'norma' },
  { query: 'NGC 3109 Association', name: 'NGC 3109 은하군', member: 'Leo P', id: 'leo-p', region: 'virgo', association: 'ngc-3109-association' },
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

test('국부 은하군의 왜소은하와 두 위성은하 계열을 검색한다', async ({ page }) => {
  await page.goto('/ko/local-group?galaxy=wlm');
  await expect(details(page).getByText('WLM', { exact: false }).first()).toBeVisible();
  await waitForRenderedMap(page);
  for (const [query, name, id] of [
    ['바너드 은하', 'NGC 6822', 'ngc-6822'],
    ['궁수자리 왜소구형은하', 'Sagittarius dSph', 'sagittarius-dsph'],
    ['Cassiopeia III', 'Andromeda XXXII', 'andromeda-xxxii'],
  ]) {
    await search(page, query, new RegExp(name));
    await expect(page).toHaveURL(`/ko/galaxies/${id}`);
    await expect(details(page).getByRole('heading', { name, exact: true })).toBeVisible();
    await waitForRenderedMap(page);
  }
});

test('라니아케아에서 노르마 은하단 마커와 분광 관측 은하를 연다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /WebGLProgram|VALIDATE_STATUS/.test(message.text())) errors.push(message.text());
  });
  await page.goto('/ko/superclusters/laniakea');
  await waitForRenderedMap(page);
  const canvas = await page.locator('main canvas').boundingBox();
  if (!canvas) throw new Error('Laniakea canvas not mounted');
  const camera = new PerspectiveCamera(45, canvas.width / canvas.height);
  camera.position.set(0.29, 0.39, 1).normalize().multiplyScalar(275 * 2.65 * Math.max(1, canvas.height / canvas.width));
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const ra = 243.76597 * Math.PI / 180;
  const dec = -60.907114 * Math.PI / 180;
  const projected = new Vector3(Math.cos(dec) * Math.cos(ra), Math.sin(dec), -Math.cos(dec) * Math.sin(ra)).multiplyScalar(220).project(camera);
  await page.mouse.click(canvas.x + (projected.x + 1) * canvas.width / 2, canvas.y + (1 - projected.y) * canvas.height / 2 - 0.95 * 30);
  await expect(page).toHaveURL('/ko/superclusters/laniakea?view=cluster&cluster=norma');
  await waitForRenderedMap(page);
  await details(page).getByText('분광 관측 표본 (128)', { exact: true }).click();
  await details(page).getByRole('button', { name: 'WKK 5916', exact: true }).click();
  await expect(page).toHaveURL('/ko/galaxies/wkk-5916');
  await expect(details(page).getByRole('heading', { name: 'WKK 5916', exact: true })).toBeVisible();
  await waitForRenderedMap(page);
  expect(errors).toEqual([]);
});

test('목성과 토성의 대기 특징을 표시하고 행성 셰이더를 컴파일한다', async ({ page }) => {
  const shaderErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /THREE\.WebGLProgram|VALIDATE_STATUS/.test(message.text())) {
      shaderErrors.push(message.text());
    }
  });

  const saturnRings = page.waitForResponse((response) => response.url().endsWith('/saturn/rings-sss.png') && response.ok());
  const jupiterMap = page.waitForResponse((response) => response.url().endsWith('/textures/star-systems/solar/planets/jupiter/jupiter-cassini-pia07782.jpg') && (response.ok() || response.status() === 304));
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

  for (const [target, description, directory, asset] of [
    ['sun', '아치형 홍염', 'stars', 'sun-sss.jpg'],
    ['mars', '올림푸스산', 'planets', 'mars-sss.jpg'],
    ['neptune', '보이저 2호가 1989년', 'planets', 'neptune-sss.jpg'],
    ['io', '어두운 화산 지대', 'moons', 'io-jpl.jpg'],
    ['europa', '길게 교차하는 균열', 'moons', 'europa-jpl.jpg'],
  ]) {
    const map = page.waitForResponse((response) => response.url().endsWith(`/textures/star-systems/solar/${directory}/${target}/${asset}`) && (response.ok() || response.status() === 304));
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

  for (const [target, category] of [['m57', 'planetary'], ['pillars-of-creation', 'star-forming'], ['crab-nebula', 'supernova-remnants']]) {
    const image = page.waitForResponse((response) => response.url().endsWith(`/textures/nebulae/${category}/${target}/webb.jpg`) && response.ok());
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
  for (const [id, query, name, category] of [
    ['l1527-irs', 'LDN 1527', '원시별 L1527 IRS', 'star-forming'],
    ['hh-211', 'HH211', '헤르빅–아로 211', 'star-forming'],
    ['cassiopeia-a', 'CasA', '카시오페이아 A', 'supernova-remnants'],
    ['ngc-3132', 'C74', '남쪽고리성운', 'planetary'],
  ]) {
    const image = page.waitForResponse((response) => response.url().endsWith(`/textures/nebulae/${category}/${id}/webb.jpg`) && response.ok());
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

test('새 천체 다섯 개를 검색해 관측 자료와 3D 장면을 연다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /THREE\.WebGLProgram|VALIDATE_STATUS/.test(message.text())) errors.push(message.text());
  });
  await page.goto(milkyWay);
  const objects = [
    { id: 'beta-pictoris', name: '베타 픽토리스', file: 'webb.jpg' },
    { id: 'vela-pulsar', name: '벨라 펄서', file: 'chandra.jpg' },
    { id: 'ngc-6302', name: '나비 성운', file: 'hubble.jpg' },
    { id: 'cygnus-x-1', name: '백조자리 X-1' },
    { id: 'stephans-quintet', name: '스테판의 오중주', file: 'webb.jpg', distant: true },
  ];
  for (const { id, name, file, distant } of objects) {
    const image = file && page.waitForResponse((response) => response.url().endsWith(`/${id}/${file}`) && response.ok());
    await search(page, id, new RegExp(name));
    if (image) await image;
    const destination = distant ? '/ko/universe?target=' : `${milkyWay}?view=object&target=`;
    await expect(page).toHaveURL((url) => url.pathname + url.search === destination + id);
    await expect(details(page).getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.locator('main canvas')).toBeVisible();
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }
  expect(errors).toEqual([]);
});

test('말머리 성운, WR 124, 티코 잔해의 관측 텍스처와 3D 모형을 연다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /WebGLProgram|VALIDATE_STATUS/.test(message.text())) errors.push(message.text());
  });
  await page.goto(milkyWay);
  for (const [id, query, name, image] of [
    ['horsehead-nebula', 'Barnard 33', '말머리 성운', 'eso.jpg'],
    ['wr-124', 'M1-67', 'WR 124', 'webb.jpg'],
    ['tycho-remnant', 'SN 1572', '티코 초신성 잔해', 'chandra.jpg'],
  ]) {
    const texture = page.waitForResponse((response) => response.url().endsWith(`/${id}/${image}`) && response.ok());
    await search(page, query, new RegExp(name));
    await texture;
    await expect(page).toHaveURL(new RegExp(`view=object&target=${id}$`));
    await expect(details(page).getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.locator('main canvas')).toBeVisible();
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }
  expect(errors).toEqual([]);
});

test('나선 성운, SN 1006, 오메가 센타우리의 3D 장면을 연다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /WebGLProgram|VALIDATE_STATUS/.test(message.text())) errors.push(message.text());
  });
  await page.goto(milkyWay);
  for (const { id, query, name, image } of [
    { id: 'ngc-7293', query: 'Caldwell 63', name: '나선 성운', image: 'hubble.jpg' },
    { id: 'sn-1006', query: 'SN1006', name: 'SN 1006', image: 'chandra.jpg' },
    { id: 'ngc-5139', query: 'NGC 5139', name: '오메가 센타우리' },
  ]) {
    const texture = image && page.waitForResponse((response) => response.url().endsWith(`/${id}/${image}`) && response.ok());
    await search(page, query, new RegExp(name));
    await texture;
    await expect(page).toHaveURL(`${milkyWay}?view=object&target=${id}`);
    await expect(details(page).getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.locator('main canvas')).toBeVisible();
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }
  expect(errors).toEqual([]);
});

test('보석벌레 성운과 판도라 은하단을 포함한 새 천체 다섯 개를 연다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /WebGLProgram|VALIDATE_STATUS/.test(message.text())) errors.push(message.text());
  });
  await page.goto(milkyWay);
  for (const { query, name, path, texture } of [
    { query: 'NGC 7027', name: '보석벌레 성운', path: `${milkyWay}?view=object&target=ngc-7027`, texture: '/ngc-7027/hubble.jpg' },
    { query: 'NGC 104', name: '47 투카나이', path: `${milkyWay}?view=object&target=ngc-104` },
    { query: 'Spanish Dancer Galaxy', name: 'NGC 1566', path: '/ko/galaxies/ngc-1566', texture: '/ngc-1566/webb.jpg' },
    { query: '불사조자리 왜소은하', name: 'Phoenix Dwarf', path: '/ko/galaxies/phoenix-dwarf' },
    { query: 'Abell 2744', name: '판도라 은하단', path: '/ko/universe?target=abell-2744' },
  ]) {
    const image = texture && page.waitForResponse((response) => response.url().endsWith(texture) && response.ok());
    await search(page, query, new RegExp(name));
    await image;
    await expect(page).toHaveURL(path);
    await expect(details(page).getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.locator('main canvas')).toBeVisible();
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }
  await expect(details(page)).toContainText('은하 152개');
  expect(errors).toEqual([]);
});

test('NGC 346을 검색하고 소마젤란은하 지도와 3D 장면을 오간다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /WebGLProgram|VALIDATE_STATUS/.test(message.text())) errors.push(message.text());
  });
  await page.goto(milkyWay);
  const image = page.waitForResponse((response) => response.url().endsWith('/ngc-346/webb.jpg') && response.ok());
  await search(page, 'NGC346', /NGC 346/);
  await image;
  await expect(page).toHaveURL('/ko/galaxies/small-magellanic-cloud?view=object&target=ngc-346');
  await expect(details(page).getByRole('heading', { name: 'NGC 346', exact: true })).toBeVisible();
  await expect(page.locator('main canvas')).toBeVisible();
  await page.mouse.move(720, 450);
  await expect.poll(async () => {
    await page.mouse.wheel(0, 550);
    return new URL(page.url()).search;
  }, { intervals: [130], timeout: 12_000 }).toBe('?focus=ngc-346');
  await waitForRenderedMap(page);
  await expect.poll(async () => {
    await page.mouse.wheel(0, -550);
    return new URL(page.url()).search;
  }, { intervals: [130], timeout: 12_000 }).toBe('?view=object&target=ngc-346');
  expect(errors).toEqual([]);
});

test('선택한 태양계 천체에서 다른 천체의 라벨과 실제 중심 간 거리를 표시한다', async ({ page }) => {
  const rootWarnings: string[] = [];
  page.on('console', (message) => {
    if (/synchronously unmount a root/i.test(message.text())) rootWarnings.push(message.text());
  });
  await page.goto(`${milkyWay}?system=solar&target=earth`);
  const scene = page.getByLabel('회전하고 확대할 수 있는 태양계 3D 모델');
  const earth = scene.getByRole('button', { name: '지구', exact: true });
  const moon = scene.getByRole('button', { name: '달', exact: true });
  await expect(earth).toHaveAttribute('aria-current', 'true');
  await expect(earth).toHaveCSS('opacity', '1');
  await expect(moon).toHaveCSS('opacity', '0.66');
  await moon.hover();
  const distance = page.locator('aside[data-distance="true"]');
  await expect(distance).toContainText('지구 기준 중심 간 거리');
  const value = await distance.locator('strong').last().innerText();
  const km = Number(value.match(/[\d,]+/)?.[0].replaceAll(',', ''));
  expect(km).toBeGreaterThan(350_000);
  expect(km).toBeLessThan(410_000);
  await moon.click();
  await expect(page).toHaveURL(/target=moon$/);
  await search(page, '화성', /^화성 /);
  await expect(page).toHaveURL(/target=mars$/);
  await expect(scene.getByRole('button', { name: '화성', exact: true })).toHaveAttribute('aria-current', 'true');
  expect(rootWarnings).toEqual([]);
});

test('좁은 화면으로 축소해도 선택한 태양계 라벨과 주변 라벨이 겹치지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 840 });
  await page.goto(`${milkyWay}?system=solar&target=saturn`);
  const scene = page.getByLabel('회전하고 확대할 수 있는 태양계 3D 모델');
  const selected = scene.locator('button[aria-current="true"]');
  await expect(selected).toHaveText('토성');
  for (let step = 0; step < 12; step++) {
    await scene.locator('canvas').dispatchEvent('wheel', { deltaY: 100, clientX: 240, clientY: 420, cancelable: true, bubbles: true });
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }
  await expect(selected).toBeVisible();
  await expect.poll(async () => scene.getByRole('button').count()).toBeGreaterThan(2);
  const overlaps = await scene.getByRole('button').evaluateAll((buttons) => {
    const boxes = buttons.map((button) => button.getBoundingClientRect());
    return boxes.some((a, index) => boxes.slice(index + 1).some((b) =>
      a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom));
  });
  expect(overlaps).toBe(false);
});

test('터치로 달까지의 거리를 비교해도 기준 천체가 유지된다', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 480, height: 900 }, hasTouch: true });
  try {
    const page = await context.newPage();
    await page.goto(`${milkyWay}?system=solar&target=earth`);
    const toggle = page.getByRole('button', { name: '거리 비교', exact: true });
    const scene = page.getByLabel('회전하고 확대할 수 있는 태양계 3D 모델');
    const moon = scene.getByRole('button', { name: '달', exact: true });
    await toggle.tap({ timeout: 6_000 });
    await expect(page.getByText('거리를 잴 천체나 라벨을 선택하세요.')).toBeVisible();
    for (let step = 0; step < 9; step++) {
      await scene.locator('canvas').dispatchEvent('wheel', { deltaY: 100, clientX: 240, clientY: 340, cancelable: true, bubbles: true });
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    }
    await moon.tap({ timeout: 6_000 });
    await expect(page.getByText('지구 기준 중심 간 거리')).toBeVisible();
    await expect(moon).toHaveAttribute('data-comparison-target', 'true');
    await expect(page).toHaveURL(/target=earth$/);
    await toggle.tap();
    await expect(page.getByText('지구 기준 중심 간 거리')).toHaveCount(0);
    await moon.tap({ timeout: 6_000 });
    await expect(page).toHaveURL(/target=moon$/);
  } finally {
    await context.close();
  }
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

test('헤라클레스 성단과 백조자리 X-1의 축소 모형을 지도에서 열고 다시 확대한다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /WebGLProgram|VALIDATE_STATUS/.test(message.text())) errors.push(message.text());
  });
  for (const id of ['m13', 'cygnus-x-1']) {
    await page.goto(`${milkyWay}?view=object&target=${id}`);
    await expect(page.locator('main canvas')).toBeVisible();
    await page.mouse.move(720, 450);
    await expect.poll(async () => {
      await page.mouse.wheel(0, 560);
      return new URL(page.url()).search;
    }, { intervals: [130], timeout: 12_000 }).toBe(`?focus=${id}`);
    await waitForRenderedMap(page);
    await expect.poll(async () => {
      await page.mouse.wheel(0, -560);
      return new URL(page.url()).search;
    }, { intervals: [130], timeout: 12_000 }).toBe(`?view=object&target=${id}`);
  }
  expect(errors).toEqual([]);
});
