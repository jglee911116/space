import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { PerspectiveCamera, Vector3 } from 'three';

// @smoke: CI 가 빌드 뒤 돌리는 테스트 — 장면 종류마다 하나 이상(실제 브라우저로 셰이더 컴파일·페이지 오류 확인)과 라우팅(로케일 리다이렉트·404). 픽셀·휠 타이밍에 기대지 않는 것만.
const milkyWay = '/ko/galaxies/milky-way';
const details = (page: Page) => page.locator('section[aria-labelledby="body-name"]');

async function search(page: Page, query: string, result: RegExp) {
  await page.getByRole('button', { name: '천체·영역 찾기' }).click();
  const panel = page.getByRole('region', { name: '천체·영역 찾기' });
  await panel.getByRole('searchbox').fill(query);
  await panel.getByRole('button', { name: result }).click();
}

async function waitForRenderedMap(page: Page) {
  await expect(page.locator('main canvas')).toBeVisible();
  await expect(page.getByRole('group', { name: '화면 거리 축척' })).toContainText('화면 축척');
}

test('물병자리 R, HH 46/47, M94, IC 1623 및 MACS J0416을 탐색한다', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(milkyWay);
  const objects = [
    { query: 'R Aquarii', name: '물병자리 R', url: `${milkyWay}?view=object&target=r-aquarii`, image: '/r-aquarii/hubble.webp' },
    { query: 'HH 46', name: '헤르빅–아로 46/47', url: `${milkyWay}?view=object&target=hh-46-47`, image: '/hh-46-47/webb.webp' },
    { query: 'NGC 4736', name: 'M94 · NGC 4736', url: '/ko/galaxies/m94', image: '/m94/hubble.webp' },
    { query: 'VV 114', name: 'IC 1623', url: '/ko/universe?target=ic-1623', image: '/ic-1623/webb.webp' },
    { query: 'MACS J0416', name: 'MACS J0416.1−2403', url: '/ko/universe?target=macs-j0416' },
  ];
  for (const { query, name, url, image } of objects) {
    const observation = image && page.waitForResponse((response) => response.url().endsWith(image) && response.ok());
    await search(page, query, new RegExp(name.replaceAll('.', '\\.')));
    if (observation) await observation;
    await expect(page).toHaveURL(url);
    await expect(details(page).getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.locator('main canvas')).toBeVisible();
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }
});

test('거품 성운, NGC 1512, AR Scorpii, G292 및 총알 은하단을 탐색한다', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(milkyWay);
  const objects = [
    { query: 'NGC7635', result: /거품 성운/, name: '거품 성운', image: '/ngc-7635/hubble.webp' },
    { query: 'G292', result: /G292\.0\+1\.8/, name: 'G292.0+1.8', image: '/g292/chandra.webp' },
    { query: 'NGC1512', result: /NGC 1512/, name: 'NGC 1512', image: '/ngc-1512/webb.webp' },
    { query: 'AR Scorpii', result: /^AR Scorpii (?!백색왜성|적색왜성)/, name: 'AR Scorpii' },
    { query: 'Bullet Cluster', result: /총알 은하단/, name: '총알 은하단', image: '/bullet-cluster/webb-sources.webp' },
  ];
  for (const { query, result, name, image } of objects) {
    const observation = image && page.waitForResponse((response) => response.url().endsWith(image) && response.ok());
    await search(page, query, result);
    if (observation) await observation;
    await expect(details(page).getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.locator('main canvas')).toBeVisible();
  }
  const layers = page.getByRole('group', { name: '은하단 보기' });
  for (const name of ['고온 가스', '렌즈로 추정한 질량', '은하']) {
    const button = layers.getByRole('button', { name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }
});

test('검색어 지우기 버튼은 팝업을 유지하고 검색창에 포커스를 돌려준다', async ({ page }) => {
  await page.goto(milkyWay);
  await page.getByRole('button', { name: '천체·영역 찾기' }).click();
  const panel = page.getByRole('region', { name: '천체·영역 찾기' });
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

    await expect
      .poll(
        async () => {
          if (new URL(page.url()).pathname !== '/ko/local-group') await page.mouse.wheel(0, delta);
          return new URL(page.url()).pathname;
        },
        { intervals: [150], timeout: 12_000 },
      )
      .toBe('/ko/local-group');
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

test('국부 은하군의 왜소은하와 두 위성은하 계열을 검색한다', { tag: '@smoke' }, async ({ page }) => {
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
  await page.goto('/ko/superclusters/laniakea');
  await waitForRenderedMap(page);
  await expect(details(page)).toContainText('5.2억 광년');
  const flows = details(page).getByRole('checkbox', { name: '은하 흐름선 보기' });
  await flows.check();
  await expect(flows).toBeChecked();
  const canvas = await page.locator('main canvas').boundingBox();
  if (!canvas) throw new Error('Laniakea canvas not mounted');
  const camera = new PerspectiveCamera(45, canvas.width / canvas.height);
  camera.position
    .set(0.29, 0.39, 1)
    .normalize()
    .multiplyScalar(275 * 3.18 * Math.max(1, canvas.height / canvas.width));
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const ra = (243.76597 * Math.PI) / 180;
  const dec = (-60.907114 * Math.PI) / 180;
  const projected = new Vector3(Math.cos(dec) * Math.cos(ra), Math.sin(dec), -Math.cos(dec) * Math.sin(ra)).multiplyScalar(220).project(camera);
  await page.mouse.click(canvas.x + ((projected.x + 1) * canvas.width) / 2, canvas.y + ((1 - projected.y) * canvas.height) / 2 - 0.95 * 30);
  await expect(page).toHaveURL('/ko/superclusters/laniakea?view=cluster&cluster=norma');
  await waitForRenderedMap(page);
  await details(page).getByText('분광 관측 표본 (128)', { exact: true }).click();
  await details(page).getByRole('button', { name: 'WKK 5916', exact: true }).click();
  await expect(page).toHaveURL('/ko/galaxies/wkk-5916');
  await expect(details(page).getByRole('heading', { name: 'WKK 5916', exact: true })).toBeVisible();
  await waitForRenderedMap(page);
});

test('오중주와 수레바퀴 은하 상세의 관측 기준과 광년 축척이 표시된다', { tag: '@smoke' }, async ({ page }) => {
  const objects = [
    { id: 'stephans-quintet', label: '관측 영상 시야 폭', value: '62만 광년' },
    { id: 'cartwheel-galaxy', label: '바깥 고리 지름', value: '15만 광년' },
  ];
  for (const { id, label, value } of objects) {
    await page.goto(`/ko/universe?target=${id}`);
    await waitForRenderedMap(page);
    await expect(details(page)).toContainText(label);
    await expect(details(page)).toContainText(value);
  }
});

test('목성과 토성의 대기 특징을 표시하고 행성 셰이더를 컴파일한다', { tag: '@smoke' }, async ({ page }) => {
  const saturnRings = page.waitForResponse((response) => response.url().endsWith('/saturn/rings-sss.png') && response.ok());
  const jupiterMap = page.waitForResponse(
    (response) => response.url().endsWith('/textures/star-systems/solar/planets/jupiter/jupiter-cassini-pia07782.webp') && (response.ok() || response.status() === 304),
  );
  await page.goto(`${milkyWay}?system=solar&target=jupiter`);
  await Promise.all([jupiterMap, saturnRings]);
  await expect(details(page)).toContainText('남위 약 22°에 대적점');
  await waitForRenderedMap(page);

  await search(page, '토성', /^토성 /);
  await expect(details(page)).toContainText('육각형 제트류');
  await waitForRenderedMap(page);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
});

test('태양 코로나와 새 행성·위성 표면의 설명을 열고 WebGL 오류를 확인한다', async ({ page }) => {
  for (const [target, description, directory, asset] of [
    ['sun', '아치형 홍염', 'stars', 'sun-sss.webp'],
    ['mars', '올림푸스산', 'planets', 'mars-sss.webp'],
    ['neptune', '보이저 2호가 1989년', 'planets', 'neptune-sss.webp'],
    ['io', '어두운 화산 지대', 'moons', 'io-jpl.webp'],
    ['europa', '길게 교차하는 균열', 'moons', 'europa-jpl.webp'],
  ]) {
    const map = page.waitForResponse((response) => response.url().endsWith(`/textures/star-systems/solar/${directory}/${target}/${asset}`) && (response.ok() || response.status() === 304));
    await page.goto(`${milkyWay}?system=solar&target=${target}`);
    await map;
    await expect(details(page)).toContainText(description);
    await waitForRenderedMap(page);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }
});

test('태양계 밖 성운의 관측 텍스처를 로드한다', { tag: '@smoke' }, async ({ page }) => {
  for (const [target, category] of [
    ['m57', 'planetary'],
    ['pillars-of-creation', 'star-forming'],
    ['crab-nebula', 'supernova-remnants'],
  ]) {
    const image = page.waitForResponse((response) => response.url().endsWith(`/textures/nebulae/${category}/${target}/webb.webp`) && response.ok());
    await page.goto(`${milkyWay}?view=object&target=${target}`);
    await image;
    await expect(details(page)).toContainText('3D 가스 모형');
    await waitForRenderedMap(page);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }
});

test('세레스를 검색하고 Dawn 지도를 로드한다', async ({ page }) => {
  await page.goto(milkyWay);
  const map = page.waitForResponse((response) => response.url().endsWith('/ceres/ceres-dawn.webp') && response.ok());
  await search(page, '세레스', /^세레스 /);
  await map;
  await expect(page).toHaveURL(/system=solar&target=ceres$/);
  await expect(details(page).getByRole('heading', { name: '세레스', exact: true })).toBeVisible();
  await waitForRenderedMap(page);
});

test('새 Webb 천체 네 개를 검색하고 관측 텍스처와 3D 모형을 로드한다', async ({ page }) => {
  await page.goto(milkyWay);
  for (const [id, query, name, category] of [
    ['l1527-irs', 'LDN 1527', '원시별 L1527 IRS', 'star-forming'],
    ['hh-211', 'HH211', '헤르빅–아로 211', 'star-forming'],
    ['cassiopeia-a', 'CasA', '카시오페이아 A', 'supernova-remnants'],
    ['ngc-3132', 'C74', '남쪽고리성운', 'planetary'],
  ]) {
    const image = page.waitForResponse((response) => response.url().endsWith(`/textures/nebulae/${category}/${id}/webb.webp`) && response.ok());
    await search(page, query, new RegExp(name));
    await image;
    await expect(page).toHaveURL(new RegExp(`view=object&target=${id}$`));
    await expect(details(page).getByRole('heading', { name, exact: true })).toBeVisible();
    await waitForRenderedMap(page);
  }
});

test('아펩, HH 30, 수레바퀴 은하를 검색해 각자의 Webb 3D 장면을 연다', async ({ page }) => {
  await page.goto(milkyWay);
  for (const [id, query, name] of [
    ['apep', 'Apep', '아펩'],
    ['hh-30', 'HH30', '헤르빅–아로 30'],
    ['cartwheel-galaxy', 'ESO 350-40', '수레바퀴 은하'],
  ]) {
    const image = page.waitForResponse((response) => response.url().endsWith(`/${id}/webb.webp`) && response.ok());
    await search(page, query, new RegExp(name));
    await image;
    const destination = id === 'cartwheel-galaxy' ? '/ko/universe?target=' : `${milkyWay}?view=object&target=`;
    await expect(page).toHaveURL((url) => url.pathname + url.search === destination + id);
    await expect(details(page).getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.locator('main canvas')).toBeVisible();
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }
});

test('새 천체 다섯 개를 검색해 관측 자료와 3D 장면을 연다', async ({ page }) => {
  await page.goto(milkyWay);
  const objects = [
    { id: 'beta-pictoris', name: '베타 픽토리스', file: 'webb.webp' },
    { id: 'vela-pulsar', name: '벨라 펄서', file: 'chandra.webp' },
    { id: 'ngc-6302', name: '나비 성운', file: 'hubble.webp' },
    { id: 'cygnus-x-1', name: '백조자리 X-1' },
    { id: 'stephans-quintet', name: '스테판의 오중주', file: 'webb.webp', distant: true },
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
});

test('말머리 성운, WR 124, 티코 잔해의 관측 텍스처와 3D 모형을 연다', async ({ page }) => {
  await page.goto(milkyWay);
  for (const [id, query, name, image] of [
    ['horsehead-nebula', 'Barnard 33', '말머리 성운', 'eso.webp'],
    ['wr-124', 'M1-67', 'WR 124', 'webb.webp'],
    ['tycho-remnant', 'SN 1572', '티코 초신성 잔해', 'chandra.webp'],
  ]) {
    const texture = page.waitForResponse((response) => response.url().endsWith(`/${id}/${image}`) && response.ok());
    await search(page, query, new RegExp(name));
    await texture;
    await expect(page).toHaveURL(new RegExp(`view=object&target=${id}$`));
    await expect(details(page).getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.locator('main canvas')).toBeVisible();
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }
});

test('나선 성운, SN 1006, 오메가 센타우리의 3D 장면을 연다', async ({ page }) => {
  await page.goto(milkyWay);
  for (const { id, query, name, image } of [
    { id: 'ngc-7293', query: 'Caldwell 63', name: '나선 성운', image: 'hubble.webp' },
    { id: 'sn-1006', query: 'SN1006', name: 'SN 1006', image: 'chandra.webp' },
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
});

test('보석벌레 성운과 판도라 은하단을 포함한 새 천체 다섯 개를 연다', async ({ page }) => {
  await page.goto(milkyWay);
  for (const { query, name, path, texture } of [
    { query: 'NGC 7027', name: '보석벌레 성운', path: `${milkyWay}?view=object&target=ngc-7027`, texture: '/ngc-7027/hubble.webp' },
    { query: 'NGC 104', name: '47 투카나이', path: `${milkyWay}?view=object&target=ngc-104` },
    { query: 'Spanish Dancer Galaxy', name: 'NGC 1566', path: '/ko/galaxies/ngc-1566', texture: '/ngc-1566/webb.webp' },
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
});

test('NGC 346을 검색하고 소마젤란은하 지도와 3D 장면을 오간다', async ({ page }) => {
  await page.goto(milkyWay);
  const image = page.waitForResponse((response) => response.url().endsWith('/ngc-346/webb.webp') && response.ok());
  await search(page, 'NGC346', /NGC 346/);
  await image;
  await expect(page).toHaveURL('/ko/galaxies/small-magellanic-cloud?view=object&target=ngc-346');
  await expect(details(page).getByRole('heading', { name: 'NGC 346', exact: true })).toBeVisible();
  await expect(page.locator('main canvas')).toBeVisible();
  await page.mouse.move(720, 450);
  await expect
    .poll(
      async () => {
        await page.mouse.wheel(0, 550);
        return new URL(page.url()).search;
      },
      { intervals: [130], timeout: 12_000 },
    )
    .toBe('?focus=ngc-346');
  await waitForRenderedMap(page);
  await expect
    .poll(
      async () => {
        await page.mouse.wheel(0, -550);
        return new URL(page.url()).search;
      },
      { intervals: [130], timeout: 12_000 },
    )
    .toBe('?view=object&target=ngc-346');
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
  await expect(moon).toHaveCSS('opacity', '0.8');
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
    return boxes.some((a, index) => boxes.slice(index + 1).some((b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom));
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
  const map = page.waitForResponse((response) => response.url().endsWith('/titan/titan-cassini.webp') && response.ok());
  await toggle.click();
  await map;
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

test('궁수자리 A*에서 EHT 기본 영상과 편광 영상을 전환한다', { tag: '@smoke' }, async ({ page }) => {
  const intensity = page.waitForResponse((response) => response.url().endsWith('/sgr-a/eht-2022.webp') && response.ok());
  await page.goto(`${milkyWay}?target=sgr-a`);
  await intensity;
  await expect(details(page)).toContainText('2017년 전파 관측');

  const toggle = details(page).getByRole('checkbox', { name: '편광 보기' });
  await expect(toggle).not.toBeChecked();
  const polarization = page.waitForResponse((response) => response.url().endsWith('/sgr-a/eht-polarized-2024.webp') && response.ok());
  await toggle.check();
  await polarization;
  await expect(details(page)).toContainText('2024년에 공개한 편광 이미지');
  await toggle.uncheck();
  await expect(details(page)).toContainText('2017년 전파 관측');
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
});

test('궁수자리 A* 편광 영상 로드 실패 후 다시 켜면 재시도한다', async ({ page }) => {
  const polarizationPath = '**/sgr-a/eht-polarized-2024.webp';
  await page.route(polarizationPath, (route) => route.abort('failed'), { times: 1 });
  await page.goto(`${milkyWay}?target=sgr-a`);

  const toggle = details(page).getByRole('checkbox', { name: '편광 보기' });
  const failed = page.waitForEvent('requestfailed', (request) => request.url().endsWith('/sgr-a/eht-polarized-2024.webp'));
  await toggle.check();
  await failed;

  await toggle.uncheck();
  const loaded = page.waitForResponse((response) => response.url().endsWith('/sgr-a/eht-polarized-2024.webp') && response.ok());
  await toggle.check();
  await loaded;
});

test('M87*와 퀘이사의 중력렌즈 장면을 렌더링한다', { tag: '@smoke' }, async ({ page }) => {
  for (const path of ['/ko/galaxies/m87?view=object&target=m87-star', '/ko/universe?target=3c-273']) {
    await page.goto(path);
    await expect(details(page)).toContainText('중력렌즈');
    await expect(page.locator('main canvas')).toBeVisible();
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }
});

test('궁수자리 A* 강착 흐름을 일시정지하고 다시 재생한다', async ({ page }) => {
  const intensity = page.waitForResponse((response) => response.url().endsWith('/sgr-a/eht-2022.webp') && response.ok());
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
    await expect
      .poll(async () => {
        const current = await capture();
        const stable = current.equals(previous);
        previous = current;
        return stable;
      })
      .toBe(true);
    return previous;
  };
  const pausedFrame = await stableFrame(frame);

  await page.getByRole('button', { name: '시뮬레이션 재생' }).click();
  await expect.poll(async () => (await frame()).equals(pausedFrame)).toBe(false);

  await page.getByRole('button', { name: '시뮬레이션 일시정지' }).click();
  await page.mouse.move(720, 450);
  await expect
    .poll(
      async () => {
        await page.mouse.wheel(0, 560);
        return new URL(page.url()).search;
      },
      { intervals: [120], timeout: 12_000 },
    )
    .toBe('?focus=m87-star');
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

  await expect
    .poll(async () => {
      await page.mouse.wheel(0, 500);
      return details(page).getByText('편광 보기').isVisible();
    })
    .toBe(false);
  await expect(page).toHaveURL(/target=sgr-a$/);
  await expect(page.locator('main canvas')).toBeVisible();

  await expect
    .poll(async () => {
      await page.mouse.wheel(0, -500);
      return details(page).getByText('편광 보기').isVisible();
    })
    .toBe(true);
});

test('성운과 외부 은하의 블랙홀을 축소해도 은하 지도에서 같은 천체에 초점을 둔다', async ({ page }) => {
  for (const [galaxy, id] of [
    [milkyWay, 'orion-nebula'],
    ['/ko/galaxies/m87', 'm87-star'],
  ]) {
    const objectUrl = `${galaxy}?view=object&target=${id}`;
    await page.goto(objectUrl);
    await expect(page.locator('main canvas')).toBeVisible();
    await page.mouse.move(720, 450);

    await expect
      .poll(
        async () => {
          await page.mouse.wheel(0, 560);
          return new URL(page.url()).search;
        },
        { intervals: [120], timeout: 12_000 },
      )
      .toBe(`?focus=${id}`);
    await waitForRenderedMap(page);

    await expect
      .poll(
        async () => {
          await page.mouse.wheel(0, -560);
          return new URL(page.url()).search;
        },
        { intervals: [120], timeout: 12_000 },
      )
      .toBe(`?view=object&target=${id}`);
  }
});

test('헤라클레스 성단과 백조자리 X-1의 축소 모형을 지도에서 열고 다시 확대한다', async ({ page }) => {
  for (const id of ['m13', 'cygnus-x-1']) {
    await page.goto(`${milkyWay}?view=object&target=${id}`);
    await expect(page.locator('main canvas')).toBeVisible();
    await page.mouse.move(720, 450);
    await expect
      .poll(
        async () => {
          await page.mouse.wheel(0, 560);
          return new URL(page.url()).search;
        },
        { intervals: [130], timeout: 12_000 },
      )
      .toBe(`?focus=${id}`);
    await waitForRenderedMap(page);
    await expect
      .poll(
        async () => {
          await page.mouse.wheel(0, -560);
          return new URL(page.url()).search;
        },
        { intervals: [130], timeout: 12_000 },
      )
      .toBe(`?view=object&target=${id}`);
  }
});

test('모바일에서 정보 버튼으로 천체와 우주 지도 패널을 열고 닫는다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const open = page.getByRole('button', { name: '정보 열기', exact: true });
  const hide = page.getByRole('button', { name: '정보 닫기', exact: true });

  await page.goto(`${milkyWay}?system=solar&target=earth`);
  await expect(open).toHaveAttribute('aria-expanded', 'false');
  await expect(details(page)).toBeHidden();
  await open.click();
  await expect(details(page).getByRole('heading', { name: '지구', exact: true })).toBeVisible();
  await details(page).getByRole('button', { name: '천체 정보 닫기', exact: true }).click();
  await expect(open).toBeFocused();
  await expect(details(page)).toBeHidden();

  await page.goto('/ko/universe');
  await expect(open).toHaveAttribute('aria-expanded', 'false');
  await open.click();
  await expect(details(page).getByRole('heading', { name: '관측 가능한 우주' })).toBeVisible();
  await hide.click();
  await expect(details(page)).toBeHidden();
});

test('모바일 핀치로 태양계에서 우주까지 이동하고 뒤로 돌아온다', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage();
    const touch = await context.newCDPSession(page);
    const canvas = page.locator('main canvas');
    async function pinch(from: number, to: number) {
      const bounds = await canvas.boundingBox();
      if (!bounds) throw new Error('Canvas not mounted');
      const x = Math.round(bounds.x + bounds.width / 2);
      const y = Math.round(bounds.y + bounds.height / 2);
      const fingers = (gap: number) => [
        { x: x - gap, y, id: 1 },
        { x: x + gap, y, id: 2 },
      ];
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: fingers(from) });
      for (let step = 1; step <= 5; step++) {
        await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: fingers(from + ((to - from) * step) / 5) });
      }
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    async function pinchTo(path: RegExp, from = 145, to = 22) {
      await expect
        .poll(
          async () => {
            if (!path.test(page.url())) await pinch(from, to);
            return page.url();
          },
          { intervals: [180], timeout: 15_000 },
        )
        .toMatch(path);
    }

    await page.goto(`${milkyWay}?system=solar&target=earth`);
    const scene = page.getByLabel('회전하고 확대할 수 있는 태양계 3D 모델');
    await scene.locator('button[aria-current="true"]').waitFor();
    const moon = scene.getByRole('button', { name: '달', exact: true });
    await expect
      .poll(
        async () => {
          if (!(await moon.isVisible())) await pinch(105, 76);
          return moon.isVisible();
        },
        { intervals: [150], timeout: 5000 },
      )
      .toBe(true);
    await moon.tap();
    await expect(page).toHaveURL(/target=moon$/);
    await page.goBack();
    await expect(page).toHaveURL(/target=earth$/);
    await page.getByRole('button', { name: '정보 열기', exact: true }).tap();
    await expect(details(page).getByRole('heading', { name: '지구', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '정보 닫기', exact: true }).tap();

    await pinchTo(/\/milky-way\?system=solar&view=galaxy$/);
    await pinchTo(/\/local-group\?galaxy=milky-way$/);
    await pinchTo(/\/superclusters\/virgo$/);
    await pinchTo(/\/superclusters\/laniakea$/);
    await pinchTo(/\/universe$/);
    await pinchTo(/\/superclusters\/laniakea$/, 22, 145);
    await page.goBack();
    await expect(page).toHaveURL('/ko/universe');
    await expect(details(page)).toBeHidden();
    for (const path of [/\/superclusters\/laniakea$/, /\/superclusters\/virgo$/, /\/local-group\?galaxy=milky-way$/, /\/milky-way\?system=solar&view=galaxy$/, /target=earth$/]) {
      await page.goBack();
      await expect(page).toHaveURL(path);
    }
    await page.goto('/ko/universe');
    await waitForRenderedMap(page);
    await pinchTo(/\/superclusters\/laniakea$/, 22, 145);
    await pinchTo(/\/superclusters\/virgo$/, 22, 145);
    await pinchTo(/\/local-group\?galaxy=milky-way$/, 22, 145);
    await pinchTo(/\/galaxies\/milky-way$/, 22, 145);
    await pinchTo(/\/ko\?view=neighborhood$/, 22, 145);
    await expect(page.getByLabel('태양계 이웃 3D 거리 지도')).toBeVisible();
    await pinchTo(/\/milky-way\?system=solar$/, 22, 145);
    await expect(page.getByLabel('회전하고 확대할 수 있는 태양계 3D 모델')).toBeVisible();
  } finally {
    await context.close();
  }
});

test('태양계는 가까이 보거나 선택한 천체의 텍스처를 로드한다', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(new URL(request.url()).pathname));
  const earth = page.waitForResponse((response) => response.url().endsWith('/earth/earth-sss.webp') && response.ok());
  await page.goto(`${milkyWay}?system=solar&target=earth`);
  await earth;
  await waitForRenderedMap(page);
  expect(requests.some((path) => path.endsWith('/mercury/mercury-sss.webp'))).toBe(false);

  const mercury = page.waitForResponse((response) => response.url().endsWith('/mercury/mercury-sss.webp') && response.ok());
  await search(page, '수성', /^수성 /);
  await mercury;
  await expect(details(page).getByRole('heading', { name: '수성', exact: true })).toBeVisible();
});

test('모바일 찾기 패널에서 빠른 이동, 전체 목록, 검색, 최근 방문을 사용할 수 있다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(milkyWay);
  const trigger = page.getByRole('button', { name: '천체·영역 찾기' });
  const panel = page.getByRole('region', { name: '천체·영역 찾기' });
  await expect(page.getByRole('button', { name: '탐색', exact: true })).toHaveCount(0);
  await trigger.click();
  await expect(panel).toBeVisible();
  expect((await panel.boundingBox())?.height).toBeGreaterThan(600);
  const quick = panel.getByRole('group', { name: '빠른 이동' });
  await expect(quick.getByRole('button', { name: '태양계 이웃' })).toBeVisible();
  const all = panel.getByRole('navigation', { name: '전체 목록' });
  await expect(all).toHaveCount(0);
  await panel.getByText('전체 목록', { exact: true }).click();
  await expect(all.getByRole('button', { name: '우리은하', exact: true }).first()).toBeVisible();
  await quick.getByRole('button', { name: '태양계 이웃' }).click();
  await expect(page).toHaveURL('/ko?view=neighborhood');
  await expect(panel).toBeHidden();

  await trigger.click();
  const recent = panel.getByRole('group', { name: '최근 방문' });
  await expect(recent.getByRole('button', { name: /우리은하/ })).toBeVisible();
  const input = panel.getByRole('searchbox');
  await input.fill('solar neighborhood');
  await expect(quick).toBeHidden();
  await input.press('ArrowDown');
  await expect(panel.getByRole('button', { name: /태양계 이웃/ })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('찾기에서 동의어, 카탈로그 번호와 이름이 같은 천체를 구분한다', async ({ page }) => {
  await page.goto(milkyWay);
  await page.getByRole('button', { name: '천체·영역 찾기' }).click();
  const panel = page.getByRole('region', { name: '천체·영역 찾기' });
  const input = panel.getByRole('searchbox');
  await input.fill('태양 근방');
  await expect(panel.getByRole('button', { name: /^태양계 이웃/ })).toBeVisible();
  for (const text of ['M42', 'M 42', 'Messier 0042', '메시에 42']) {
    await input.fill(text);
    await expect(panel.getByRole('list').getByRole('button').first()).toContainText('오리온성운');
  }
  await input.fill('로스 128');
  await expect(panel.getByRole('button', { name: '로스 128 항성계 · 우리은하', exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: '로스 128 항성 · 우리은하', exact: true })).toBeVisible();
  await input.fill('로스 128 항성');
  await input.press('Enter');
  await expect(page).toHaveURL(`${milkyWay}?system=ross-128&target=ross-128-star`);
});

test('찾기에서 카탈로그 이름만 입력해도 메시에 천체를 찾는다', async ({ page }) => {
  await page.goto(milkyWay);
  await page.getByRole('button', { name: '천체·영역 찾기' }).click();
  const panel = page.getByRole('region', { name: '천체·영역 찾기' });
  for (const text of ['Messier', '메시에']) {
    await panel.getByRole('searchbox').fill(text);
    await expect(
      panel
        .getByRole('list')
        .getByRole('button', { name: /메시에 87/ })
        .first(),
    ).toBeVisible();
  }
});

test('닫은 정보 패널은 다른 천체로 이동하면 다시 열린다', async ({ page }) => {
  await page.goto(`${milkyWay}?system=barnard-star&target=barnard`);
  await details(page).getByRole('button', { name: '천체 정보 닫기' }).click();
  await expect(details(page)).toBeHidden();
  await search(page, '시리우스', /^시리우스 항성계/);
  await expect(page).toHaveURL(/system=sirius/);
  await expect(details(page)).toBeVisible();
});

test('태양계 이웃 지도에서 등록된 항성계 거리를 보여 주고 이름을 누르면 그 항성계로 간다', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/ko');
  await expect(page.getByRole('group', { name: '태양계 이웃 3D 거리 지도' })).toBeVisible();
  await waitForRenderedMap(page);
  const sirius = page.getByRole('button', { name: /시리우스\s*8\.59광년/ });
  await expect(sirius).toBeVisible();
  await sirius.click();
  await expect(page).toHaveURL(/\/ko\/galaxies\/milky-way\?system=sirius$/);
});

test('로케일 없는 주소는 브라우저 언어로, lang 지정은 영구 이동으로 보낸다', { tag: '@smoke' }, async ({ request }) => {
  const english = await request.get('/', { maxRedirects: 0, headers: { 'accept-language': 'en-US,en;q=0.9' } });
  expect(english.status()).toBe(307);
  expect(new URL(english.headers().location, 'http://x').pathname).toBe('/en');
  const korean = await request.get('/universe?lang=ko', { maxRedirects: 0, headers: { 'accept-language': 'en' } });
  expect(korean.status()).toBe(308);
  expect(new URL(korean.headers().location, 'http://x').pathname).toBe('/ko/universe');
});

test('없는 주소는 두 언어 404 화면과 돌아갈 링크를 보여 준다', { tag: '@smoke' }, async ({ page }) => {
  const response = await page.goto('/ko/galaxies/not-a-galaxy');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  await page.getByRole('link', { name: /처음 화면/ }).click();
  await expect(page).toHaveURL('/ko');
});

test('움직이는 관측 볼륨에는 고정 배치 안내를 표시하지 않는다', async ({ page }) => {
  const fixedLayout = page.getByText('이 화면은 고정된 관측 배치를 표시합니다.');
  for (const id of ['r-aquarii', 'hh-46-47']) {
    await page.goto(`${milkyWay}?view=object&target=${id}`);
    await expect(page.locator('main canvas')).toBeVisible();
    await expect(fixedLayout).toBeHidden();
  }
  await page.goto(`${milkyWay}?view=object&target=orion-nebula`);
  await expect(fixedLayout).toBeVisible();
});

test('같은 천체를 다시 고르면 기록을 늘리지 않고 최근 방문은 위치마다 이름이 다르다', async ({ page }) => {
  await page.goto(`${milkyWay}?target=sgr-a`);
  await expect(page.getByRole('group', { name: '우리은하와 은하 중심 블랙홀 3D 장면' })).toBeVisible();
  // 검색이 만드는 주소와 예전에 만들던 주소(기본 계 system 생략) 모두 같은 화면으로 본다.
  for (const url of [`${milkyWay}?system=solar&target=earth`, `${milkyWay}?target=earth`]) {
    await page.goto(url);
    const earth = page.getByLabel('회전하고 확대할 수 있는 태양계 3D 모델').getByRole('button', { name: '지구', exact: true });
    await expect(earth).toHaveAttribute('aria-current', 'true');
    const entries = await page.evaluate(() => history.length);
    await earth.click();
    await expect(page).toHaveURL(url);
    expect(await page.evaluate(() => history.length)).toBe(entries);
  }

  await page.getByRole('button', { name: '천체·영역 찾기' }).click();
  const recent = page.getByRole('region', { name: '천체·영역 찾기' }).getByRole('group', { name: '최근 방문' });
  await expect(recent.getByRole('button', { name: '우리은하 · 궁수자리 A*', exact: true })).toBeVisible();
});

test('큰 수는 언어마다 알맞은 단위로 표시한다', async ({ page }) => {
  await page.goto(`${milkyWay}?system=solar&target=sun`);
  await expect(details(page)).toContainText('약 2.3억 년');
  await page.goto(`${milkyWay}?target=sgr-a`);
  await expect(page.getByText('태양 약 400만 배', { exact: true })).toBeVisible();
  await page.goto('/en/galaxies/milky-way?target=sgr-a');
  await expect(page.getByText('About 4 million solar masses', { exact: true })).toBeVisible();
});

test('방향키로 시점을 돌리고 검색창에 입력할 때는 시점이 그대로다', async ({ page }) => {
  await page.goto(`${milkyWay}?system=solar&target=earth`);
  const scene = page.getByLabel('회전하고 확대할 수 있는 태양계 3D 모델');
  await expect(scene.getByRole('button', { name: '지구', exact: true })).toHaveAttribute('aria-current', 'true');
  const moon = scene.getByRole('button', { name: '달', exact: true });
  const moonX = async () => (await moon.boundingBox())?.x ?? Number.NaN;
  const holdKey = async (key: string, milliseconds: number) => {
    await page.keyboard.down(key);
    await page.waitForTimeout(milliseconds);
    await page.keyboard.up(key);
  };
  // 첫 화면의 카메라 이동이 끝나 라벨이 멈출 때까지 기다린다.
  const settle = () =>
    expect
      .poll(async () => {
        const before = await moonX();
        await page.waitForTimeout(200);
        return Math.abs((await moonX()) - before);
      })
      .toBeLessThan(0.5);
  await settle();

  await page.getByRole('button', { name: '천체·영역 찾기' }).click();
  const searchbox = page.getByRole('region', { name: '천체·영역 찾기' }).getByRole('searchbox');
  await expect(searchbox).toBeFocused();
  const typing = await moonX();
  await holdKey('ArrowRight', 500);
  await settle();
  expect(Math.abs((await moonX()) - typing)).toBeLessThan(1);
  await page.keyboard.press('Escape');

  const start = await moonX();
  await holdKey('ArrowRight', 600);
  await expect.poll(async () => Math.abs((await moonX()) - start)).toBeGreaterThan(20);

  // 보조 입력처럼 프레임 사이에 눌렀다 떼도 한 번은 움직인다.
  await settle();
  const tap = await moonX();
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => Math.abs((await moonX()) - tap)).toBeGreaterThan(1);
});

test('정보 패널 안에서는 위아래 방향키가 패널을 스크롤하고 시점은 그대로다', async ({ page }) => {
  // 이 높이에서 지구 정보 패널(최대 58svh)이 넘쳐 스크롤된다.
  await page.setViewportSize({ width: 1440, height: 520 });
  await page.goto(`${milkyWay}?system=solar&target=earth`);
  const scene = page.getByLabel('회전하고 확대할 수 있는 태양계 3D 모델');
  await expect(scene.getByRole('button', { name: '지구', exact: true })).toHaveAttribute('aria-current', 'true');
  const moon = scene.getByRole('button', { name: '달', exact: true });
  const moonX = async () => (await moon.boundingBox())?.x ?? Number.NaN;
  const settle = () =>
    expect
      .poll(async () => {
        const before = await moonX();
        await page.waitForTimeout(200);
        return Math.abs((await moonX()) - before);
      })
      .toBeLessThan(0.5);
  const panel = details(page);
  await expect.poll(() => panel.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  await panel.getByRole('link').first().focus();
  await settle();
  const top = await panel.evaluate((element) => element.scrollTop);
  const camera = await moonX();
  // 링크에 포커스하면서 패널이 아래로 내려갔다면 위로, 아니면 아래로 스크롤해 본다.
  const key = top > 0 ? 'ArrowUp' : 'ArrowDown';
  await page.keyboard.down(key);
  await page.waitForTimeout(400);
  await page.keyboard.up(key);
  await expect.poll(() => panel.evaluate((element) => element.scrollTop)).not.toBe(top);
  await settle();
  expect(Math.abs((await moonX()) - camera)).toBeLessThan(1);
});

test('Shift+방향키와 +/−로 확대·축소하고 끝까지 축소하면 우리은하 지도로 넘어간다', async ({ page }) => {
  await page.goto(`${milkyWay}?system=solar`);
  await waitForRenderedMap(page);
  // 축척 글자는 깔끔한 수로 반올림되므로 막대 길이까지 함께 본다.
  const scale = page.getByRole('group', { name: '화면 거리 축척' });
  const reading = () => scale.evaluate((bar: HTMLElement) => `${bar.textContent} ${bar.style.getPropertyValue('--scale-width')}`);
  const overview = await reading();
  await page.keyboard.down('Shift');
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.up('Shift');
  await expect.poll(reading).not.toBe(overview);

  // 휠·핀치처럼 키를 뗄 때 축소 거리를 보고 상위 지도로 넘긴다.
  await expect
    .poll(
      async () => {
        await page.keyboard.down('-');
        await page.waitForTimeout(800);
        await page.keyboard.up('-');
        return new URL(page.url()).search;
      },
      { intervals: [100], timeout: 40_000 },
    )
    .toBe('?system=solar&view=galaxy');
  await expect(details(page).getByRole('heading', { name: '우리은하', exact: true })).toBeVisible();

  // 축소해 넘어온 직후엔 카메라가 하위 지도 진입 거리 안쪽이라, 회전만 하는 제스처를 확대로 읽으면 태양계 이웃으로 튄다.
  const canvas = await page.locator('main canvas').boundingBox();
  if (!canvas) throw new Error('Milky Way canvas not mounted');
  for (let turn = 0; turn < 6; turn++) {
    await page.keyboard.press(turn % 2 ? 'ArrowLeft' : 'ArrowRight');
    await page.waitForTimeout(120);
    await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvas.x + canvas.width / 2 + (turn % 2 ? -60 : 60), canvas.y + canvas.height / 2, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(120);
  }
  await expect(page).toHaveURL(/\?system=solar&view=galaxy$/);
});
