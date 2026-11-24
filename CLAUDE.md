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
- 천체 데이터 단일 소스: `src/constants/space/` — 순수 값만(three 등 렌더링 의존성·렌더링 계산 금지, 공용 계산은 `components/explore/utils/`. 논문의 궤도 요소·물리량을 카탈로그 타입으로 바꾸는 파일 안의 작은 헬퍼는 허용). 포함 관계: **항성계·은하 속 천체 ⊂ 은하 ⊂ 국부은하군·은하군 ⊂ 초은하단 ⊂ 관측 가능한 우주**.
  - `types.ts` — 모든 데이터 타입. `units.ts` — 단위·물리 상수와 환산(`KM_PER_KPC`, `LIGHT_YEARS_PER_KPC`, `KPC_PER_MLY`, `EARTH_RADIUS_KM`, `SOLAR_TEMPERATURE_K` 등, 파일마다 다시 정의하지 않는다).
  - `star-systems/<계>/` — `star-systems/index.ts` 의 `systems` 에 등록, **첫 항목이 기본 계**. 통과 관측 모형만 있는 적색왜성 계(LHS 1140·Gliese 12)는 `star-systems/nearby-exoplanets.ts` 에서 `redDwarf`·`transitPlanet` 헬퍼로 함께 정의한다. `bodies` 는 **부모가 자식보다 먼저**, `validate` 가 순서·parent·orbit 누락을 검사. 다른 은하의 계는 `galaxyId`.
  - `featured-objects/` — 종류별 파일(nebulae·stellar-outflows·stars·star-clusters·compact-objects), 순서는 `index.ts`. 은하 속 성운·잔해·블랙홀(`galaxyId` 없으면 우리은하, 확대해 들어가는 하위 천체는 `parentObjectId`).
  - `galaxies/` — 은하 정의 파일(한 파일에 여러 은하도 둔다, 등록용 index 없음). `/galaxies/[id]` 경로가 열리는 전체 목록 `galaxies` 는 `constants/space/index.ts` 가 `local-group.ts`·`nearbyShowcase`·`galaxy-associations.ts` 구성원을 합쳐 만든다 — **새 은하는 이 셋 중 하나에 넣어야 경로·마커가 생긴다**. `milky-way.ts` 만 `HostGalaxy`(기준 항성계 `systemId`, 이웃 지도, 은하 중심).
  - `local-group.ts` — 국부은하군 소속 은하(첫 항목이 기준 은하, `dwarfs` 는 왜소은하). `galaxy-associations.ts` — 초은하단 지도 위 은하군·은하단(`mapRegionId`). `superclusters.ts` — **안쪽 → 바깥 순서**(줌 전환이 배열 위치를 따른다, id 로 분기하지 않는다). `observable-universe.ts` — 원거리 천체. 은하단 관측 표본은 `constants/space/` 의 `*-survey.ts`(pandora·bullet·macs-j0416)·`bullet-webb-sources.ts`, 노르마 은하단 표본은 `galaxies/norma-survey.ts`.
  - `gaia-counterparts.ts` — 항성계 별 ↔ Gaia DR3 source_id. Gaia 표본 자체는 `public/catalog/gaia-dr3-nearby/`(`scripts/build-gaia-preview.py` 가 생성, README 의 쿼리), 읽기는 `utils/gaia-catalog.ts`. 검증기가 각 대응 ID 가 실제로 그 항성계 위치(1광년 이내)에 있는지와 표본 반경을 검사한다. 표본을 다시 만들면 `utils/gaia-format.ts` 의 `gaiaVersion` 을 올린다(`/catalog` 는 1년 immutable 캐시).
  - 바깥에서는 `index.ts` 로만 가져온다(`units` 제외). 계층 간 id 참조·중복 id·문구 키·검색 경로·`/textures`·`/models` 파일 존재·궤도 요소(0 ≤ e < 1)·항성계 지도 배치·이름과 별칭으로 검색되는지는 `components/explore/utils/validate-catalog.ts` 가 빌드 시(`[locale]/layout.tsx` 의 generateStaticParams) 검사한다 — 데이터 폴더는 components 를 import 하지 않는다.
  - 대상마다 다른 UI 문구·형태는 데이터에 둔다(`overviewLabel`, `wideOverview.label`, `outerRegion`, `summary`, `title`, `notes`, `diskTilt`, `embeddedCluster` 등). 모델 형태도 필드로: 은하 `structure`·`ramPressureTail`·`diskObservation.blendProcedural`, 은하 속 천체 `clusterModel`·`stellarWind`·`thermalSurface`·`accretionDisk`·`modelCameraDistance`, 천체 `stellar.prominences`·`surfaceEffect`·`surfaceMap.hidden`·`silhouette`·`rockySurface`, 항성계 `home`, 초은하단 `flowModel`·`flowAnchors`, 원거리 은하 `observationModel`(관측 영상·볼륨 `shape`·설명 `note`). 출처도 데이터에: 이웃 지도 `gaiaSource`, 우주론 거리 `observableUniverse.cosmologySource`.
- 렌더링은 `src/components/explore/` — 천체·계·은하 id 로 분기하지 않고 데이터 필드만 읽는다. 특정 대상 전용 처리가 필요하면 필드를 추가.
  - `explorer.tsx` URL 상태와 화면 조립, `details.tsx` 정보 패널·툴팁, `language-select.tsx`.
  - `scenes/` — WebGL 장면(`system`·`galaxy`·`neighborhood`·`local-group`·`featured-object`·`universe`), `ssr:false` 로만 로드.
  - `three/` — 장면들이 공유하는 three 부품. `utils/` — 궤도·줌·거리 축척·좌표·우주론 거리·포맷·경로·seeded 난수(`random.ts`)·카탈로그 검증.
- 스타일은 `*.module.scss`, 공용 토큰은 `src/styles/_variables.scss`(모든 scss 에 자동 @use).
- 포맷은 Prettier(`printWidth 200`, singleQuote).

## 작업 체크리스트

### 천체 추가
- [ ] 종류에 맞는 `src/constants/space/` 파일에 등록하고, 경로 id 가 기존 값과 겹치지 않는지 확인
- [ ] 좌표·거리·적색편이·출처 URL 은 원문(SIMBAD·NASA·논문)에서 직접 확인(그럴듯한 오값이 섞인다)
- [ ] 약 163광년 이내 항성계면 `gaia-counterparts.ts` 에 Gaia DR3 source_id 연결(SIMBAD 에서 확인)
- [ ] `ko.json`·`en.json` 에 같은 키로 이름·설명, 통용 별칭은 `aliases`
- [ ] 새 은하는 `local-group.ts`·`nearbyShowcase`·`galaxy-associations.ts`(은하군·은하단) 중 하나에 넣어야 경로가 생긴다. 은하 속 하위 천체면 `galaxyId`·`parentObjectId`. 새 항성계는 우리은하면 `neighborhood`, 다른 은하면 `galaxyMarkerKpc` 로 지도에 놓는다
- [ ] 텍스처는 WebP(`cwebp -q 82` 항성계, `-q 85` 관측 이미지)로 정해진 폴더에, 원본보다 작은지 확인(데이터의 `/textures`·`/models` 경로는 빌드가 실제 파일과 대조)
- [ ] 대상 전용 모양·문구는 데이터 필드로 — 렌더러에서 id 로 분기하지 않는다(원거리 은하의 3D 볼륨은 `observationModel.shape` 로 고르고, 맞는 모형이 없으면 렌더러에 새 shape 를 추가)

### 기능 추가
- [ ] 경로 문자열은 `utils/paths.ts` 로만, 화면 문구는 ko/en 양쪽
- [ ] WebGL 장면은 `ssr:false` 로만 로드, 서버 코드(page·layout·validate-catalog)는 훅 있는 모듈을 import 하지 않는다
- [ ] 새 데이터 필드에 참조·형식 규칙이 있으면 `validate-catalog.ts` 에 검사 추가
- [ ] 브라우저에서 확인: 콘솔 WebGL 오류, 모바일(560px 이하), `prefers-reduced-motion`
- [ ] 새 필드·파일·규칙은 이 문서의 구조 설명에도 반영

### 마무리
- [ ] `pnpm lint && pnpm typecheck && pnpm format:check && pnpm build`(빌드가 카탈로그를 검증)
- [ ] 새 천체·기능마다 e2e 하나 추가(검색 → 열기 → 텍스처 로드). `e2e/fixtures.ts` 의 `test` 가 페이지 예외·WebGL 셰이더 오류를 자동으로 실패 처리한다
- [ ] `PLAYWRIGHT_CHANNEL=chrome pnpm test:e2e` — CI 는 `@smoke` 태그 테스트(장면 종류마다 하나 이상과 라우팅 — 로케일 리다이렉트·404)만 돌리므로 전체는 푸시 전 로컬에서. 새 장면 종류를 만들면 대표 테스트에 `{ tag: '@smoke' }` 를 단다
- [ ] 데이터 추가와 렌더링 변경은 커밋을 나누고, 푸시 후 GitHub Actions CI 결과 확인
