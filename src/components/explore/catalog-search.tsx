'use client';

import { useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/i18n/language';
import type { StarSystem } from '@/constants/space';
import { createSearchCatalog, searchCatalog } from './utils/catalog-search';
import styles from './explore.module.scss';

const panelId = 'catalog-search';

export function CatalogSearch({ systems, onSelect }: { systems: readonly StarSystem[]; onSelect: (path: string) => void }) {
  const { t, catalogText } = useLanguage();
  const [query, setQuery] = useState('');
  const catalog = useMemo(() => createSearchCatalog(systems), [systems]);
  const results = useMemo(() => searchCatalog(catalog, query), [catalog, query]);
  const panel = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const firstResult = useRef<HTMLButtonElement>(null);

  function select(path: string) {
    panel.current?.hidePopover();
    onSelect(path);
  }

  return (
    <>
      <button className={styles.searchTrigger} type="button" popoverTarget={panelId} aria-label={t('search.title')} title={t('search.title')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="5.75" />
          <path d="m14.6 14.6 5 5" />
        </svg>
      </button>
      <section
        ref={panel}
        className={`${styles.exploreMenu} ${styles.searchPanel}`}
        id={panelId}
        popover="auto"
        aria-label={t('search.title')}
        onToggle={(event) => {
          if (event.newState === 'open') input.current?.focus();
        }}
      >
        <form
          className={styles.searchForm}
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            if (results[0]) select(results[0].path);
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
            <button className={styles.searchClear} type="button" aria-label={t('search.clear')}
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

        {results.length ? (
          <ul className={styles.searchResults}>
            {results.map((result, index) => {
              const name = catalogText(result.name);
              const designation = result.designation && catalogText(result.designation);
              const context = result.context && catalogText(result.context);
              return (
                <li key={result.path}>
                  <button ref={index === 0 ? firstResult : undefined} type="button" onClick={() => select(result.path)}>
                    <strong>{name}</strong>
                    <span>{[t(result.kind), context, designation !== name ? designation : undefined].filter(Boolean).join(' · ')}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.searchStatus} role="status">
            {t(query.trim() ? 'search.noResults' : 'search.examples')}
          </p>
        )}
      </section>
    </>
  );
}
