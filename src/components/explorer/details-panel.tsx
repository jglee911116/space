import type { ClusterLayer } from '@/constants/space';
import {
  BlackHoleDetails,
  BodyDetails,
  FeaturedObjectDetails,
  GalaxyDetails,
  GalaxySummaryDetails,
  LocalGroupDetails,
  NeighborhoodDetails,
  OortCloudDetails,
  OuterRegionDetails,
  SuperclusterDetails,
  SystemDetails,
  UniverseDetails,
} from '../details';
import type { Target } from '../scenes/system-scene';
import type { ZoomScale } from '../utils/zoom';
import type { ExplorerViewState, RecordedView, SystemNavigation } from './view-state';

/** 지금 보는 화면에 맞는 정보 패널 내용. */
export function DetailsPanel({
  view,
  nav,
  scale,
  recenter,
  layers,
  onClose,
  onNavigate,
  onSelectCluster,
  onSelectGalaxy,
}: {
  view: ExplorerViewState;
  nav: SystemNavigation;
  scale: ZoomScale;
  recenter: number;
  layers: {
    showFlows: boolean;
    onFlowsChange: (show: boolean) => void;
    showCounterjet: boolean;
    onCounterjetChange: (show: boolean) => void;
    clusterLayer: ClusterLayer;
    onClusterLayerChange: (layer: ClusterLayer) => void;
    showPolarization: boolean;
    onPolarizationChange: (show: boolean) => void;
  };
  onClose: () => void;
  onNavigate: (next: Target, nextOverview?: RecordedView) => void;
  onSelectCluster: (id: string) => void;
  onSelectGalaxy: (id: string) => void;
}) {
  const {
    region,
    association,
    universeView,
    distantObject,
    featuredObject,
    groupView,
    activeGalaxy,
    extraView,
    neighborhoodView,
    focusBlackHole,
    body,
    galaxyView,
    target,
    system,
    galaxySystems,
    cloud,
    outerRegion,
  } = view;
  const { oortView } = nav;
  if (region)
    return (
      <SuperclusterDetails
        region={region}
        association={association}
        onSelectCluster={onSelectCluster}
        onSelectGalaxy={onSelectGalaxy}
        showFlows={layers.showFlows}
        onFlowsChange={layers.onFlowsChange}
      />
    );
  if (universeView)
    return (
      <UniverseDetails
        object={distantObject}
        showCounterjet={layers.showCounterjet}
        onCounterjetChange={layers.onCounterjetChange}
        clusterLayer={layers.clusterLayer}
        onClusterLayerChange={layers.onClusterLayerChange}
      />
    );
  if (featuredObject) return <FeaturedObjectDetails object={featuredObject} />;
  if (groupView) return <LocalGroupDetails focus={activeGalaxy} />;
  if (extraView) return <GalaxySummaryDetails galaxy={activeGalaxy} />;
  if (neighborhoodView) return <NeighborhoodDetails />;
  if (focusBlackHole) return <BlackHoleDetails key={recenter} onClose={onClose} showPolarization={layers.showPolarization} onPolarizationChange={layers.onPolarizationChange} />;
  if (body && !oortView && (galaxyView || target !== null)) return <BodyDetails key={`${body.id}:${recenter}`} system={system} body={body} onSelect={onNavigate} onClose={onClose} />;
  if (galaxyView) return <GalaxyDetails systems={galaxySystems} />;
  if (oortView && cloud) return <OortCloudDetails cloud={cloud} />;
  if ((scale === 'outer' || scale === 'distant') && outerRegion)
    return <OuterRegionDetails system={system} distant={scale === 'distant'} onToggle={() => onNavigate(null, scale === 'distant' ? 'outer' : 'distant')} />;
  return <SystemDetails system={system} onSelect={onNavigate} />;
}
