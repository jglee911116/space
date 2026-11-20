import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';

/** Once the pointer chooses a zoom pivot, camera presets must stop recentering it. */
export function useCursorZoom() {
  const element = useThree((state) => state.events.connected || state.gl.domElement);
  const cursorZoomRef = useRef(false);

  useEffect(() => {
    const markCursorZoom = () => {
      cursorZoomRef.current = true;
    };
    element.addEventListener('wheel', markCursorZoom, { capture: true, passive: true });
    return () => element.removeEventListener('wheel', markCursorZoom, true);
  }, [element]);

  return cursorZoomRef;
}
