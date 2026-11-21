/** 같은 seed 면 같은 수열을 내는 LCG 난수(0 ≤ x < 1) — 절차 생성 모양이 새로고침마다 바뀌지 않게 한다. */
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}
