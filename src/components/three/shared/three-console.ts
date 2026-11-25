import { setConsoleFunction } from 'three';

// shortcut: @react-three/fiber 9.8.2(최신 안정판)가 Canvas 를 만들 때마다 three r183 에서 지원 종료된 THREE.Clock 을 생성해 같은 경고가 쌓인다.
// 이 한 줄만 거르고 나머지는 three 기본 출력과 똑같이 내보낸다. R3F 가 THREE.Timer 를 쓰는 판(v10)으로 올리면 이 파일과 import 를 지운다.
const clockDeprecation = 'THREE.Clock: This module has been deprecated';

setConsoleFunction((type, message, ...params) => {
  if (message.startsWith(clockDeprecation)) return;
  const [stackTrace] = params as [{ isStackTrace?: boolean; getError?: (message: string) => Error }?];
  if (stackTrace?.isStackTrace && stackTrace.getError) console[type](stackTrace.getError(message));
  else console[type](message, ...params);
});
