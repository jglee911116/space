# space — 구현 규약

3D 우주 뷰어(항성계 → 우리은하 → 국부은하군). 구조·도구는 gasp-web-front 와 맞춘다.

## 스택
Next.js 16.4 (App Router) · React 19 · TypeScript · three / @react-three/fiber · drei · SCSS · pnpm · **Node 22.23.4**(.nvmrc).

## 명령
```
source ~/.nvm/nvm.sh && nvm use
pnpm install
pnpm dev        # http://localhost:3000 (다른 앱이 쓰면 -p 3100)
pnpm lint
pnpm build
```

## 구조
- 라우트는 `src/app/[locale]/` — `/[locale]`(태양계 이웃·항성계, `?system`·`target`·`view`), `/local-group`, `/galaxies/[galaxy]`, `/superclusters/[region]`, `/universe`. `[locale]/layout.tsx` 가 탐색기를 한 번 마운트하고 page 는 메타데이터만. 경로 문자열은 `components/explore/utils/paths.ts` 에서만 만든다. 로케일 없는 주소·예전 `/explore/*` 는 `src/proxy.ts` 가 로케일 경로로 보낸다.
- 다국어는 `src/i18n/` — `ko.json`·`en.json` 키를 같게 유지. 데이터 문구는 `message(key)`(CatalogText), 화면은 `useLanguage()` 의 `t`·`catalogText`.
- 천체 데이터 단일 소스: `src/constants/space/` — 순수 값만(three 등 렌더링 의존성·계산 함수 금지, 계산은 `components/explore/utils/`). 포함 관계: **항성계·은하 속 천체 ⊂ 은하 ⊂ 국부은하군·은하군 ⊂ 초은하단 ⊂ 관측 가능한 우주**.
  - `types.ts` — 모든 데이터 타입. `units.ts` — 단위 상수·환산(`KM_PER_KPC`, `LIGHT_YEARS_PER_KPC`, `KPC_PER_MLY` 등, 파일마다 다시 정의하지 않는다).
  - `star-systems/<계>/` — `star-systems/index.ts` 의 `systems` 에 등록, **첫 항목이 기본 계**. `bodies` 는 **부모가 자식보다 먼저**, `validate` 가 순서·parent·orbit 누락을 검사. 다른 은하의 계는 `galaxyId`.
  - `featured-objects.ts` — 은하 속 성운·잔해·블랙홀(`galaxyId` 없으면 우리은하, 확대해 들어가는 하위 천체는 `parentObjectId`).
  - `galaxies/` — 은하마다 파일, `galaxies/index.ts` 의 `galaxies` 가 은하 경로 전체 목록. `milky-way.ts` 만 `HostGalaxy`(기준 항성계 `systemId`, 이웃 지도, 은하 중심).
  - `local-group.ts` — 국부은하군 소속 은하(첫 항목이 기준 은하, `dwarfs` 는 왜소은하). `galaxy-associations.ts` — 초은하단 지도 위 은하군·은하단(`mapRegionId`). `superclusters.ts` — **안쪽 → 바깥 순서**(줌 전환이 배열 위치를 따른다, id 로 분기하지 않는다). `observable-universe.ts` — 원거리 천체.
  - 바깥에서는 `index.ts` 로만 가져온다(`units` 제외). 계층 간 id 참조·중복 id·문구 키·검색 경로는 `components/explore/utils/validate-catalog.ts` 가 빌드 시(`[locale]/layout.tsx` 의 generateStaticParams) 검사한다 — 데이터 폴더는 components 를 import 하지 않는다.
  - 대상마다 다른 UI 문구·형태는 데이터에 둔다(`overviewLabel`, `wideOverview.label`, `outerRegion`, `summary`, `title`, `notes`, `diskTilt`, `embeddedCluster` 등). 모델 형태도 필드로: 은하 `structure`·`ramPressureTail`·`diskObservation.blendProcedural`, 은하 속 천체 `clusterModel`·`stellarWind`·`thermalSurface`·`accretionDisk`·`modelCameraDistance`, 천체 `stellar.prominences`·`surfaceEffect`·`surfaceMap.hidden`·`silhouette`·`rockySurface`, 항성계 `home`.
- 렌더링은 `src/components/explore/` — 천체·계·은하 id 로 분기하지 않고 데이터 필드만 읽는다. 특정 대상 전용 처리가 필요하면 필드를 추가.
  - `explorer.tsx` URL 상태와 화면 조립, `details.tsx` 정보 패널·툴팁, `language-select.tsx`.
  - `scenes/` — WebGL 장면(`system`·`galaxy`·`neighborhood`·`local-group`·`featured-object`·`universe`), `ssr:false` 로만 로드.
  - `three/` — 장면들이 공유하는 three 부품. `utils/` — 궤도·줌·거리 축척·좌표·우주론 거리·포맷·경로·seeded 난수(`random.ts`)·카탈로그 검증.
- 스타일은 `*.module.scss`, 공용 토큰은 `src/styles/_variables.scss`(모든 scss 에 자동 @use).
- 포맷은 Prettier(`printWidth 200`, singleQuote).
