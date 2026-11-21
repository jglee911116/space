import { galaxyAssociations, type GalaxyAssociation } from '@/constants/space/galaxy-associations';
import type { CatalogText } from '@/i18n/messages';
import { useLanguage } from '@/i18n/language';
import {
  type Supercluster,
  observableUniverse,
  type DistantObject,
  type FeaturedObject,
  localGroup,
  milkyWay,
  type Body,
  type Galaxy,
  type OortCloud,
  type ObservationStatus,
  type Source,
  type StarSystem,
} from '@/constants/space';
import { cosmologicalDistances } from './utils/cosmology';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { AU_PER_KPC, KM_PER_AU, KM_PER_LIGHT_YEAR, SOLAR_RADIUS_KM } from '@/constants/space/units';
import { bodySize, formatAxis, formatPeriod, formatSpin, kindLabel } from './utils/format';
import type { Target } from './scenes/system-scene';
import styles from './explore.module.scss';

/** 항성이 둘 이상이면 행성의 모항성 링크·항성의 행성 목록을 보여준다. */
export function isMultiStar(system: StarSystem) {
  return system.bodies.filter((body) => body.kind === 'star').length > 1;
}

export function Sources({ sources }: { sources: readonly Source[] }) {
  const { catalogText } = useLanguage();
  return sources.map((source, index) => (
    <span key={source.href}>
      {index > 0 && ' · '}
      <a href={source.href}>{catalogText(source.label)}</a>
    </span>
  ));
}

function DataRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function ObservationRow({ status }: { status?: ObservationStatus }) {
  const { t } = useLanguage();
  if (!status) return null;
  return <DataRow label={t('details.observationStatus')}>{t(status === 'observed' ? 'details.observed' : 'details.candidate')}</DataRow>;
}

function ModelNotes({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  return (
    <div className={styles.modelNotes}>
      <h3>{t('details.modelScale')}</h3>
      <p>{children}</p>
    </div>
  );
}

function DetailSources({ sources }: { sources: readonly Source[] }) {
  const { t } = useLanguage();
  const unique = [...new Map(sources.map((source) => [source.href, source])).values()];
  if (!unique.length) return null;
  return (
    <div className={styles.detailSources}>
      <h3>{t('details.sources')}</h3>
      <Sources sources={unique} />
    </div>
  );
}

export function BodyTooltip({ body, x, y }: { body: Body; x: number; y: number }) {
  const { t, catalogText, number } = useLanguage();
  const size = bodySize(body, t, number);
  return (
    <aside className={styles.bodyTooltip} style={{ '--pointer-x': `${x}px`, '--pointer-y': `${y}px` } as CSSProperties} aria-hidden="true">
      <strong>{catalogText(body.name)}</strong>
      {body.stellar && (
        <span>
          {catalogText(body.stellar.evolutionaryStage)} · {catalogText(body.stellar.spectralType)}
        </span>
      )}
      {size && (
        <span>
          {size.label} {size.value}
        </span>
      )}
      {body.orbit && <span>{t('details.orbitValue', [formatPeriod(body, t, number)])}</span>}
      <span>{t('details.rotationValue', [formatSpin(body, t, number, catalogText)])}</span>
    </aside>
  );
}

function DetailPanel({ name, children }: { name: CatalogText; children: ReactNode }) {
  const { t, catalogText } = useLanguage();
  const [closed, setClosed] = useState(false);
  if (closed) return null;

  return (
    <section className={styles.details} aria-labelledby="body-name">
      <div className={styles.detailsHeading}>
        <h2 id="body-name">{catalogText(name)}</h2>
        <button type="button" className={styles.closeDetails} aria-label={t('details.close')} onClick={() => setClosed(true)}>
          <span aria-hidden="true">×</span>
        </button>
      </div>
      {children}
    </section>
  );
}

export function BodyDetails({ system, body, onSelect }: { system: StarSystem; body: Body; onSelect: (target: Target) => void }) {
  const { t, catalogText, number, measurement } = useLanguage();
  const parent = system.bodies.find((other) => other.id === body.parent);
  const children = system.bodies.filter((other) => other.parent === body.id && (other.kind === 'moon' || isMultiStar(system)));
  const systemDistance = system.neighborhood;
  const size = bodySize(body, t, number);
  const irradiance = parent?.stellar && body.orbit ? parent.stellar.luminosityWatts / (4 * Math.PI * (body.orbit.axisAu * KM_PER_AU * 1000) ** 2) : null;

  return (
    <DetailPanel name={catalogText(body.name)}>
      <dl>
        {size && (
          <div>
            <dt>{size.label}</dt>
            <dd>{size.value}</dd>
          </div>
        )}
        {body.mass && (
          <div>
            <dt>{t('details.mass')}</dt>
            <dd>{catalogText(body.mass)}</dd>
          </div>
        )}
        {body.orbit && (
          <div>
            <dt>{t('details.orbitalPeriod')}</dt>
            <dd>{formatPeriod(body, t, number)}</dd>
          </div>
        )}
        <div>
          <dt>{t('details.rotationPeriod')}</dt>
          <dd>{formatSpin(body, t, number, catalogText)}</dd>
        </div>
        {body.orbit && (
          <>
            <DataRow label={t('details.orbitReference')}>{parent ? catalogText(parent.name) : t('details.binaryBarycenter')}</DataRow>
            <DataRow label={t('details.semimajorAxis')}>{formatAxis(body, parent, number)}</DataRow>
          </>
        )}
        {systemDistance && <DataRow label={t('details.systemDistance')}>{t('units.approxLightYears', [number(systemDistance.distanceLightYears, 2)])}</DataRow>}
        {irradiance !== null && (
          <div title={t('details.irradianceAtSemimajorAxis')}>
            <dt>{t('details.stellarIrradiance')}</dt>
            <dd>{number(irradiance, irradiance < 10 ? 1 : 0)} W/m²</dd>
          </div>
        )}
        {body.stellar && (
          <>
            <div>
              <dt>{t('details.evolutionStage')}</dt>
              <dd>{catalogText(body.stellar.evolutionaryStage)}</dd>
            </div>
            <div>
              <dt>{t('details.spectralType')}</dt>
              <dd>{catalogText(body.stellar.spectralType)}</dd>
            </div>
            <div>
              <dt>{t('details.effectiveTemperature')}</dt>
              <dd>{number(body.stellar.temperatureK, 0)} K</dd>
            </div>
            <div>
              <dt>{t('details.luminosity')}</dt>
              <dd>
                <RadiantPower watts={body.stellar.luminosityWatts} />
              </dd>
            </div>
          </>
        )}
        {body.galacticOrbit && (
          <div>
            <dt>{t('details.galacticOrbitalPeriod')}</dt>
            <dd>{t('units.approxYears', [measurement(body.galacticOrbit.periodYears, 1e8)])}</dd>
          </div>
        )}
      </dl>
      {parent && (parent.kind !== 'star' || isMultiStar(system)) && (
        <p>
          {catalogText(kindLabel[parent.kind])}{' '}
          <button type="button" onClick={() => onSelect(parent.id)}>
            {catalogText(parent.name)}
          </button>
        </p>
      )}
      {children.length > 0 && (
        <p>
          {body.kind === 'star' ? t('details.orbitingPlanets') : t('details.catalogedMoons')}{' '}
          {children.map((child) => (
            <button key={child.id} type="button" onClick={() => onSelect(child.id)}>
              {catalogText(child.name)}
            </button>
          ))}
        </p>
      )}
      {body.note && <p>{catalogText(body.note)}</p>}
      <ModelNotes>{t('details.systemModelScale')}</ModelNotes>
      <DetailSources sources={systemDistance ? [...body.sources, systemDistance.source] : body.sources} />
    </DetailPanel>
  );
}

function RadiantPower({ watts }: { watts: number }) {
  const [coefficient, exponent] = watts.toExponential(3).split('e');
  return (
    <>
      {Number(coefficient)} × 10<sup>{Number(exponent)}</sup> W
    </>
  );
}

export function BlackHoleDetails({ showPolarization, onPolarizationChange }: { showPolarization: boolean; onPolarizationChange: (visible: boolean) => void }) {
  const { t, catalogText, number, measurement } = useLanguage();
  const center = milkyWay.center;
  return (
    <DetailPanel name={catalogText(center.name)}>
      <dl>
        <div>
          <dt>{t('details.type')}</dt>
          <dd>{t('details.supermassiveBlackHole')}</dd>
        </div>
        <div>
          <dt>{t('details.distanceFromSolarSystem')}</dt>
          <dd>{t('units.approxLightYears', [number(center.distanceLightYears, 0)])}</dd>
        </div>
        <div>
          <dt>{t('details.mass')}</dt>
          <dd>{t('details.solarMassTenThousands', [measurement(center.massSolar, 1e4, 0)])}</dd>
        </div>
        <div>
          <dt>{t('details.emissionRingDiameter')}</dt>
          <dd>{t('units.approxMicroarcseconds', [center.shadowDiameterMicroarcseconds])}</dd>
        </div>
      </dl>
      <label className={styles.counterjetToggle}>
        <input type="checkbox" checked={showPolarization} onChange={(event) => onPolarizationChange(event.currentTarget.checked)} />
        {t('details.ehtPolarizationToggle')}
      </label>
      <ModelNotes>
        {t(showPolarization ? 'details.ehtPolarizationImage' : 'details.ehtIntensityImage')} {t('details.blackHoleShadow')} {t('details.blackHoleFlow')} {t('details.blackHoleFlares')} {t('details.blackHoleLensing')} {t('details.unscaledModel')}
      </ModelNotes>
      <DetailSources sources={center.sources} />
    </DetailPanel>
  );
}

export function GalaxyDetails({ systems }: { systems: readonly StarSystem[] }) {
  const { t, catalogText } = useLanguage();
  const modeled = systems.filter(({ galacticPath }) => galacticPath);
  return (
    <section className={styles.details} aria-labelledby="body-name">
      <h2 id="body-name">{catalogText(milkyWay.name)}</h2>
      <ModelNotes>
        {catalogText(milkyWay.summary)} {milkyWay.notes.map(catalogText).join(' ')}
        {modeled.length > 0 && ` ${t('details.modeledOrbits', [modeled.map(({ name }) => catalogText(name)).join(' · ')])}`}
      </ModelNotes>
      <DetailSources sources={[...milkyWay.sources, milkyWay.orbitSource, ...systems.flatMap(({ galacticPath }) => (galacticPath ? [galacticPath.source] : []))]} />
    </section>
  );
}

export function OortCloudDetails({ cloud }: { cloud: OortCloud }) {
  const { t, number } = useLanguage();
  return (
    <section className={styles.details} aria-labelledby="body-name">
      <h2 id="body-name">{t('navigation.oortCloud')}</h2>
      <dl>
        <div>
          <dt>{t('details.innerBoundary')}</dt>
          <dd>{cloud.innerEdgeAu.map((edge) => number(edge, 0)).join('–')} AU</dd>
        </div>
        <div>
          <dt>{t('details.outerBoundary')}</dt>
          <dd>{cloud.outerEdgeAu.map((edge) => number(edge, 0)).join('–')} AU</dd>
        </div>
      </dl>
      <ModelNotes>{t('details.oortCloudModel')}</ModelNotes>
      <DetailSources sources={[cloud.source]} />
    </section>
  );
}

export function OuterRegionDetails({ system, distant, onToggle }: { system: StarSystem; distant: boolean; onToggle: () => void }) {
  const { t, catalogText } = useLanguage();
  const region = system.outerRegion!;
  const count = system.bodies.filter((body) => body.region === 'outer').length;
  return (
    <section className={styles.details} aria-labelledby="body-name">
      <h2 id="body-name">{distant ? t('navigation.distantOrbits') : catalogText(region.name)}</h2>
      <p>{t('details.outerRegionCount', [count, catalogText(region.beltName), region.beltAu.join('–')])}</p>
      <ModelNotes>{t('details.auScale')}</ModelNotes>
      <p>
        <button type="button" onClick={onToggle}>
          {distant ? t('navigation.zoomTo', [catalogText(region.beltName)]) : t('navigation.viewDistantOrbits')}
        </button>
      </p>
      <DetailSources sources={[region.source]} />
    </section>
  );
}

export function SystemDetails({ system }: { system: StarSystem }) {
  const { t, catalogText } = useLanguage();
  const planetCount = system.bodies.filter((body) => body.kind === 'planet').length;
  return system.summary ? (
    <section className={styles.details} aria-labelledby="body-name">
      <h2 id="body-name">{catalogText(system.name)}</h2>
      <p>{catalogText(system.summary)}</p>
      <p>{t('details.starAndExoplanetCounts', [system.bodies.filter((body) => body.kind === 'star').length, planetCount])}</p>
      <ModelNotes>{t('details.auScaleEnlarged')}</ModelNotes>
      <DetailSources sources={system.sources} />
    </section>
  ) : (
    <section className={styles.details} aria-labelledby="body-name">
      <h2 id="body-name">{t('details.planetCount', [planetCount])}</h2>
      <ModelNotes>
        {t('details.commonScaleEnlarged')} · {t('details.fixedJ2000')}
      </ModelNotes>
      <DetailSources sources={system.sources} />
    </section>
  );
}

export function LocalGroupDetails({ focus }: { focus: Galaxy }) {
  const { t, catalogText } = useLanguage();
  return (
    <section className={styles.details} aria-labelledby="body-name">
      <h2 id="body-name">{catalogText(localGroup.name)}</h2>
      <p>{t('navigation.selectOrZoom', [catalogText(focus.name)])}</p>
      <ModelNotes>{catalogText(localGroup.summary)}</ModelNotes>
      <DetailSources sources={focus.distanceKpc > 0 ? [localGroup.source, ...focus.sources] : [localGroup.source]} />
    </section>
  );
}

export function GalaxySummaryDetails({ galaxy }: { galaxy: Galaxy }) {
  const { t, catalogText, number } = useLanguage();
  const distance = (galaxy.distanceKpc * (AU_PER_KPC * KM_PER_AU)) / KM_PER_LIGHT_YEAR;
  return (
    <section className={styles.details} aria-labelledby="body-name">
      <h2 id="body-name">{catalogText(galaxy.title ?? galaxy.name)}</h2>
      {distance > 0 && (
        <dl>
          <DataRow label={t('details.distanceFromSolarSystem')}>{t('units.approxLightYears', [number(Number(distance.toPrecision(3)), 0)])}</DataRow>
        </dl>
      )}
      <p>{catalogText(galaxy.summary)}</p>
      {galaxy.diskObservation && <p>{t('details.galaxyObservationDisk')}</p>}
      <ModelNotes>{t('details.galaxyModelScale')}</ModelNotes>
      <DetailSources sources={galaxy.sources} />
    </section>
  );
}

export function NeighborhoodDetails() {
  const { t, catalogText } = useLanguage();
  const { neighborhood } = milkyWay;
  return (
    <section className={styles.details} aria-labelledby="body-name">
      <h2 id="body-name">{t('details.starSystemDistances')}</h2>
      <p>{t('navigation.selectStarSystemHint')}</p>
      <ModelNotes>{catalogText(neighborhood.summary)}</ModelNotes>
      <DetailSources sources={[neighborhood.source]} />
    </section>
  );
}

export function FeaturedObjectDetails({ object }: { object: FeaturedObject }) {
  const { t, catalogText, number, measurement } = useLanguage();
  const radiusRatio = object.radiusSolar ?? (object.radiusKm === undefined ? undefined : object.radiusKm / SOLAR_RADIUS_KM);
  return (
    <section className={styles.details} aria-labelledby="body-name">
      <h2 id="body-name">{catalogText(object.name)}</h2>
      <p>{catalogText(object.designation)}</p>
      <dl>
        <ObservationRow status={object.observationStatus} />
        <DataRow label={t(object.distanceAssumed ? 'details.assumedDistance' : 'details.distanceFromSolarSystem')}>{t('units.approxLightYears', [number(object.distanceLightYears, 0)])}</DataRow>
        {object.radiusSolar !== undefined && (
          <DataRow label={t(object.radiusBasis === 'estimate' ? 'details.estimatedRadius' : 'details.radius')}>
            {object.radiusUncertaintySolar === undefined ? number(object.radiusSolar) : `${number(object.radiusSolar)} ± ${number(object.radiusUncertaintySolar)}`} R☉
          </DataRow>
        )}
        {object.radiusKm !== undefined && (
          <DataRow label={t(object.radiusBasis === 'model-assumption' ? 'details.assumedRadius' : object.radiusBasis === 'estimate' ? 'details.estimatedRadius' : 'details.radius')}>
            {number(object.radiusKm, 2)} km
          </DataRow>
        )}
        {object.blackHoleMassSolar !== undefined && (
          <DataRow label={t('details.estimatedBlackHoleMass')}>{t('details.solarMassHundredMillions', [measurement(object.blackHoleMassSolar, 1e8)])}</DataRow>
        )}
      </dl>
      <p>{catalogText(object.description)}</p>
      {object.observationImage && <p>{t('details.nebulaObservationVolume')}</p>}
      {radiusRatio !== undefined && (
        <div className={styles.radiusComparison}>
          <h3>{t('details.compareSolarRadius')}</h3>
          <p>
            {object.radiusKm === undefined
              ? t('details.solarRadiusRatio', [number(radiusRatio)])
              : object.radiusBasis === 'estimate'
                ? t('details.compactRadiusRatio', [number(1 / radiusRatio, 0)])
                : t('details.pulsarRadius', [number(object.radiusKm, 0), number(1 / radiusRatio, 0)])}
          </p>
          <div className={styles.radiusAxis} aria-hidden="true">
            <span style={{ left: '60%' }}>{t('details.sun')}</span>
            <i style={{ left: `${((Math.log10(radiusRatio) + 6) / 10) * 100}%`, backgroundColor: object.color }} />
          </div>
          <p>{t('details.logRadiusScale')}</p>
        </div>
      )}
      {object.spinSeconds !== undefined && (
        <p>
          {object.spinSeconds < 1
            ? t('details.rotationMilliseconds', [number(object.spinSeconds * 1000, object.spinSeconds < 0.01 ? 3 : 0)])
            : t('details.rotationSeconds', [number(object.spinSeconds, 3)])}
        </p>
      )}
      {object.variabilityDays !== undefined && <p>{t('details.variabilityPeriod', [number(object.variabilityDays, 0)])}</p>}
      {object.expansionPerYear !== undefined && <p>{t('details.expansionModel', [t(object.kind === 'ring-remnant' ? 'details.centralEjecta' : 'details.nebula')])}</p>}
      <ModelNotes>
        {object.kind === 'black-hole' && <>{t('details.blackHoleLensing')} </>}
        {t(
          object.kind === 'open-cluster' || object.kind === 'globular-cluster'
            ? 'details.clusterModelScale'
            : object.extentLightYears > 0 && object.kind !== 'black-hole'
              ? 'details.nebulaModelScale'
              : 'details.unscaledModel',
        )}
      </ModelNotes>
      <DetailSources sources={object.sources} />
    </section>
  );
}

export function UniverseDetails({ object, showCounterjet, onCounterjetChange }: { object?: DistantObject; showCounterjet: boolean; onCounterjetChange: (visible: boolean) => void }) {
  const { t, catalogText, number, measurement } = useLanguage();
  if (!object) {
    return (
      <section className={styles.details} aria-labelledby="body-name">
        <h2 id="body-name">{catalogText(observableUniverse.name)}</h2>
        <p>{t('details.universeRadius')}</p>
        <ModelNotes>{t('details.universeLayout')} {t('details.cosmicMapSymbols')}</ModelNotes>
        <DetailSources sources={observableUniverse.sources} />
      </section>
    );
  }
  const { comovingLightYears, lookbackYears } = cosmologicalDistances(object.redshift);
  return (
    <section className={styles.details} aria-labelledby="body-name">
      <h2 id="body-name">{catalogText(object.name)}</h2>
      <dl>
        <ObservationRow status={object.observationStatus} />
        <div>
          <dt>{t('details.type')}</dt>
          <dd>{t(object.kind === 'quasar' ? 'details.quasar' : object.kind === 'ring-galaxy' ? 'details.ringGalaxy' : 'details.earlyGalaxy')}</dd>
        </div>
        <div>
          <dt>{t('details.redshift')}</dt>
          <dd>{object.redshift}</dd>
        </div>
        <div>
          <dt>{t('details.lightTravelTime')}</dt>
          <dd>{t('units.approxYears', [measurement(lookbackYears, 1e8)])}</dd>
        </div>
        <div>
          <dt>{t('details.comovingDistance')}</dt>
          <dd>{t('units.approxComovingDistance', [measurement(comovingLightYears, 1e8)])}</dd>
        </div>
        {object.kind === 'quasar' && object.blackHoleMassSolar !== undefined && (
          <div>
            <dt>{t('details.estimatedBlackHoleMass')}</dt>
            <dd>{t('details.solarMassHundredMillions', [measurement(object.blackHoleMassSolar, 1e8, 0)])}</dd>
          </div>
        )}
        {object.kind === 'early-galaxy' && (
          <div>
            <dt>{t('details.uvHalfLightRadius')}</dt>
            <dd>{t('units.approxParsecs', [number(object.ultravioletHalfLightRadiusParsecs, 0)])}</dd>
          </div>
        )}
      </dl>
      <p>{catalogText(object.summary)}</p>
      {object.kind === 'quasar' && object.visibleJet && (
        <label className={styles.counterjetToggle}>
          <input type="checkbox" checked={showCounterjet} onChange={(event) => onCounterjetChange(event.currentTarget.checked)} />
          {t('details.showCounterjet')}
        </label>
      )}
      {object.kind === 'ring-galaxy' && <p>{t('details.webbRingGalaxyModel')}</p>}
      <ModelNotes>
        {object.kind === 'quasar' ? t('details.accretionModel') : t('details.galaxyModel')} {object.kind === 'quasar' && <>{t('details.blackHoleLensing')} </>}{t('details.cosmicModelScale')}
      </ModelNotes>
      <DetailSources sources={[...object.sources, observableUniverse.sources[1]]} />
    </section>
  );
}

export function SuperclusterDetails({
  region,
  association,
  onSelectCluster,
  onSelectGalaxy,
}: {
  region: Supercluster;
  association?: GalaxyAssociation;
  onSelectCluster: (id: string) => void;
  onSelectGalaxy: (id: string) => void;
}) {
  const { t, catalogText, measurement } = useLanguage();
  if (association) {
    return (
      <section className={styles.details} aria-labelledby="body-name">
        <h2 id="body-name">{catalogText(association.name)}</h2>
        {association.summary && <p>{catalogText(association.summary)}</p>}
        <p>{t('details.virgoClusterMembers')}</p>
        <p>
          {association.members.map(({ id, name, title }) => (
            <button type="button" key={id} onClick={() => onSelectGalaxy(id)}>
              {catalogText(title ?? name)}
            </button>
          ))}
        </p>
        <ModelNotes>{t('details.virgoClusterScale')} {t('details.cosmicMapSymbols')}</ModelNotes>
        <DetailSources sources={[...association.sources, ...association.members.flatMap(({ sources }) => sources)]} />
      </section>
    );
  }
  return (
    <section className={styles.details} aria-labelledby="body-name">
      <h2 id="body-name">{catalogText(region.name)}</h2>
      <p>{t('details.superclusterSpan', [measurement(region.spanMly * 1e6, 1e8)])}</p>
      <p>{catalogText(region.summary)}</p>
      <p>
        {galaxyAssociations
          .filter((item) => item.mapRegionId === region.id)
          .map((item) => (
            <button type="button" key={item.id} onClick={() => onSelectCluster(item.id)}>
              {catalogText(item.name)}
            </button>
          ))}
      </p>
      <ModelNotes>{t('details.superclusterBoundaries')} {t('details.cosmicMapSymbols')}</ModelNotes>
      <DetailSources sources={region.sources} />
    </section>
  );
}
