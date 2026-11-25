import { Message } from '@/i18n/language';
import type { MessageKey } from '@/i18n/messages';
import dynamic from 'next/dynamic';
import { memo } from 'react';
import styles from '../explore.module.scss';

function SceneStatus({ id }: { id: MessageKey }) {
  return (
    <p className={styles.status} role="status">
      <Message id={id} />
    </p>
  );
}

// next/dynamic 이 ssr·loading 을 정적으로 읽으므로 옵션은 객체 리터럴 그대로 둔다.
export const SystemScene = memo(dynamic(() => import('../scenes/system-scene'), { ssr: false, loading: () => <SceneStatus id="canvas.loadingScene" /> }));

export const GalaxyScene = memo(dynamic(() => import('../scenes/galaxy-scene'), { ssr: false, loading: () => <SceneStatus id="canvas.loadingMilkyWay" /> }));

export const NeighborhoodScene = memo(dynamic(() => import('../scenes/neighborhood-scene'), { ssr: false, loading: () => <SceneStatus id="canvas.loadingDistanceMap" /> }));

export const LocalGroupScene = dynamic(() => import('../scenes/local-group-scene'), { ssr: false, loading: () => <SceneStatus id="canvas.loadingGalaxy" /> });

export const FeaturedObjectScene = dynamic(() => import('../scenes/featured-object-scene'), { ssr: false, loading: () => <SceneStatus id="canvas.loadingObject" /> });

export const UniverseScene = dynamic(() => import('../scenes/universe-scene'), { ssr: false, loading: () => <SceneStatus id="canvas.loadingUniverseMap" /> });
