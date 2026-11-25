# 우주 지도

태양계에서 관측 가능한 우주까지 탐색하는 3D 지도입니다. 한국어는 `/ko`, 영어는 `/en`에서 열립니다.

## 천체 리소스 구조

| 위치 | 내용 |
| --- | --- |
| `src/constants/space/star-systems`, `galaxies` | 항성계와 은하의 카탈로그 |
| `src/constants/space/featured-objects` | 성단, 항성, 콤팩트 천체, 성운 카탈로그 |
| `src/components/three` | 블랙홀, 은하, 성운, 항성·성단, 행성계 렌더러와 지도·공용 코드 |
| `public/textures` | 은하, 성운, 블랙홀, 퀘이사, 항성계의 텍스처 |
| `public/models` | 관측 기반 3D 형상 파일 |

태양계 파일은 `star-systems/solar/<분류>/<천체 ID>/`에 둡니다. 성운 이미지는 `textures/nebulae/<분류>/<천체 ID>/`에 둡니다. 소속 은하, 관측 출처 및 사용 파일은 카탈로그에서 연결합니다.

## 천체 등록

1. `src/constants/space`에서 천체 유형에 맞는 카탈로그를 선택합니다. 경로에 사용하는 ID는 기존 값과 겹치지 않도록 합니다.
2. 소속 은하 또는 지도 구역, 적경·적위(도), 거리나 적색편이와 그 기준을 기록합니다. 추정 거리나 모형 가정은 설명에 명시하고, 주요 천체에는 관측 상태와 출처를 넣습니다. 화면 크기에는 별도의 모형 값을 사용합니다.
3. 이름과 설명을 `src/i18n/ko.json`과 `en.json`에 같은 메시지 키로 추가합니다. 통용 별칭은 `aliases`에 등록합니다. 검색은 카탈로그와 공통 경로 생성 함수를 사용합니다.
4. 은하군이나 은하단은 `galaxy-associations.ts`에 구성 은하와 상위 지도 구역을 등록합니다. 국부은하군은 별도 목록으로 관리합니다.
5. `pnpm build`로 출처 URL, 좌표 범위, 번역과 치환 변수, 검색 경로를 검증합니다. 출처의 원문과 수치의 의미는 등록 시 확인합니다.

## 탐색 회귀 테스트

프로덕션 빌드를 만든 뒤 `pnpm exec playwright install chromium`과 `pnpm test:e2e`를 실행합니다. 설치된 Google Chrome을 쓰려면 `PLAYWRIGHT_CHANNEL=chrome pnpm test:e2e`로 실행합니다. 테스트용 서버는 로컬 포트 3328에서 시작합니다. CI는 빌드 뒤 `@smoke` 태그 테스트만 실행합니다. 장면 종류마다 하나 이상과 라우팅(로케일 리다이렉트·404)을 확인합니다(`pnpm exec playwright test --grep @smoke`).
