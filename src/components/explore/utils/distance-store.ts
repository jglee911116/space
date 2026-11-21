import { useSyncExternalStore } from 'react';

type Sample = { origin: string; body: string; au: number };

/** 장면이 125ms 마다 재는 두 천체 사이 거리 — Explorer 상태 대신 여기 두어 구독하는 표시만 다시 그린다. */
export function createDistanceStore() {
  let sample: Sample | null = null;
  const listeners = new Set<() => void>();
  return {
    set(origin: string, body: string, au: number) {
      if (sample?.origin === origin && sample.body === body && sample.au === au) return;
      sample = { origin, body, au };
      listeners.forEach((listener) => listener());
    },
    get: () => sample,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type DistanceStore = ReturnType<typeof createDistanceStore>;

/** origin → body 거리(AU). 마지막 측정이 다른 쌍이면 undefined. */
export function useDistance(store: DistanceStore, origin: string, body: string | null) {
  const sample = useSyncExternalStore(store.subscribe, store.get, store.get);
  return sample && sample.origin === origin && sample.body === body ? sample.au : undefined;
}
