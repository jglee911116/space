'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLanguage } from '@/i18n/language';
import type { StarSystem } from '@/constants/space';
import { createSearchCatalog, searchCatalog } from './utils/catalog-search';
import { readGaiaSourceId, useGaiaSource } from './utils/gaia-catalog';
import { gaiaCounterpartsBySource } from './utils/gaia-counterparts';
import { gaiaSourcePath } from './utils/paths';
import styles from './explore.module.scss';

const panelId = 'catalog-search';

type Visit = { path: string; name: string };
type QuickLink = { label: string; onSelect: () => void };

function readVisits(key: string): Visit[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is Visit => typeof item?.path === 'string' && item.path.startsWith('/') && typeof item.name === 'string').slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function CatalogSearch({
  systems,
  onSelect,
  currentPath,
  currentName,
  quickLinks,
  children,
}: {
  systems: readonly StarSystem[];
  onSelect: (path: string) => void;
  currentPath: string;
  currentName: string;
  quickLinks: readonly QuickLink[];
  children: ReactNode;
}) {
  const { t, catalogText, locale } = useLanguage();
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [recent, setRecent] = useState<Visit[]>([]);
  const historyKey = `space-recent-visits-${locale}`;
  useEffect(() => {
    const visits = readVisits(historyKey).filter(({ path }) => path !== currentPath);
    try {
      localStorage.setItem(historyKey, JSON.stringify([{ path: currentPath, name: currentName }, ...visits].slice(0, 5)));
    } catch {
      // Search and quick navigation still work with storage disabled.
    }
  }, [currentPath, currentName, historyKey]);

  const catalog = useMemo(() => createSearchCatalog(systems), [systems]);
  const results = useMemo(() => searchCatalog(catalog, query), [catalog, query]);
  const exactGaia = query
    .normalize('NFKC')
    .trim()
    .match(/^(?:gaia\s+DR3\s+|gaia\s+)?([1-9]\d{9,18})$/i);
  const gaiaId = readGaiaSourceId(exactGaia?.[1] ?? null);
  const gaia = useGaiaSource(gaiaId);
  const gaiaName = gaiaId ? gaiaCounterpartsBySource.get(gaiaId)?.name : undefined;
  const panel = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const firstResult = useRef<HTMLButtonElement>(null);

  function closePanel() {
    panel.current?.hidePopover();
  }

  function select(path: string) {
    closePanel();
    onSelect(path);
  }

  return (
    <>
      <button className={styles.searchTrigger} type="button" popoverTarget={panelId} aria-label={t('search.title')} title={t('search.title')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="5.75" />
          <path d="m14.6 14.6 5 5" />
        </svg>
        <span>{t('search.title')}</span>
      </button>
      <section
        ref={panel}
        className={`${styles.exploreMenu} ${styles.searchPanel}`}
        id={panelId}
        popover="auto"
        aria-label={t('search.title')}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(`.${styles.searchResults} button`));
          const index = buttons.findIndex((button) => button === event.target);
          if (index < 0) return;
          event.preventDefault();
          if (event.key === 'ArrowUp' && index === 0) input.current?.focus();
          else buttons[index + (event.key === 'ArrowDown' ? 1 : -1)]?.focus();
        }}
        onToggle={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.newState === 'open') {
            setRecent(readVisits(historyKey).filter(({ path }) => path !== currentPath));
            if (!window.matchMedia('(max-width: 560px)').matches) input.current?.focus();
          } else {
            setQuery('');
            setShowAll(false);
          }
        }}
      >
        <div className={styles.searchHeader}>
          <button className={styles.searchClose} type="button" aria-label={t('search.close')} onClick={closePanel}>
            ×
          </button>
          <form
            className={styles.searchForm}
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              if (gaia?.source) select(gaiaSourcePath(gaia.source.id));
              else if (!gaiaId && results[0]) select(results[0].path);
            }}
          >
            <input
              ref={input}
              className={styles.searchInput}
              type="search"
              value={query}
              aria-label={t('search.title')}
              placeholder={t('search.placeholder')}
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown' && firstResult.current) {
                  event.preventDefault();
                  firstResult.current.focus();
                }
              }}
            />
            {query && (
              <button
                className={styles.searchClear}
                type="button"
                aria-label={t('search.clear')}
                onClick={() => {
                  setQuery('');
                  input.current?.focus();
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                  <path d="m4.5 4.5 7 7m0-7-7 7" />
                </svg>
              </button>
            )}
          </form>
        </div>

        <div className={styles.searchContent}>
          {!query.trim() ? (
            <div className={styles.searchBrowse}>
              {quickLinks.length > 0 && (
                <div className={styles.controls} role="group" aria-label={t('search.quickLinks')}>
                  <h2>{t('search.quickLinks')}</h2>
                  {quickLinks.map(({ label, onSelect: open }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        closePanel();
                        open();
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {recent.length > 0 && (
                <div className={styles.controls} role="group" aria-label={t('search.recent')}>
                  <h2>{t('search.recent')}</h2>
                  {recent.map(({ path, name }) => (
                    <button key={path} type="button" onClick={() => select(path)}>
                      {name}
                    </button>
                  ))}
                </div>
              )}
              <details className={styles.searchAll} open={showAll} onToggle={(event) => setShowAll(event.currentTarget.open)}>
                <summary>{t('search.allDestinations')}</summary>
                {showAll && (
                  <nav
                    aria-label={t('search.allDestinations')}
                    onClick={(event) => {
                      if (event.target instanceof Element && event.target.closest('button')) closePanel();
                    }}
                  >
                    {children}
                  </nav>
                )}
              </details>
            </div>
          ) : gaiaId ? (
            gaia?.source ? (
              <ul className={styles.searchResults}>
                <li>
                  <button ref={firstResult} type="button" onClick={() => select(gaiaSourcePath(gaiaId))}>
                    <strong>{gaiaName ? catalogText(gaiaName) : `Gaia DR3 ${gaiaId}`}</strong>
                    <span>{gaiaName ? `Gaia DR3 ${gaiaId}` : t('details.gaiaSource')}</span>
                  </button>
                </li>
              </ul>
            ) : (
              <p className={styles.searchStatus} role="status">
                {t(!gaia ? 'search.gaiaLoading' : gaia.failed ? 'search.gaiaUnavailable' : 'search.gaiaMissing')}
              </p>
            )
          ) : results.length ? (
            <ul className={styles.searchResults}>
              {results.map((result, index) => {
                const name = catalogText(result.name);
                const designation = result.designation && catalogText(result.designation);
                const context = result.context && catalogText(result.context);
                const parentContext = result.parentContext && catalogText(result.parentContext);
                const subtitle = [...new Set([t(result.kind), context, parentContext, designation].filter((value) => value && value !== name))].join(' · ');
                return (
                  <li key={result.path}>
                    <button ref={index === 0 ? firstResult : undefined} type="button" onClick={() => select(result.path)}>
                      <strong>{name}</strong>
                      <span>{subtitle}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={styles.searchStatus} role="status">
              {t('search.noResults')}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
