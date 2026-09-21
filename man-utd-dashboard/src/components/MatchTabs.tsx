'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/I18nContext';

export function MatchTabs({
  view,
  narrow,
}: {
  view: 'latest' | 'scores';
  narrow?: boolean;
}) {
  const { t } = useI18n();
  const tabs = [
    { id: 'latest', href: '/matches', label: t('nav.lastmatch') },
    { id: 'scores', href: '/matches?view=scores', label: t('matchLog.tabs.scores') },
  ] as const;

  return (
    <div
      className={`mx-auto w-full pt-6 ${
        narrow
          ? 'max-w-[960px] px-4 sm:px-6 lg:px-10'
          : 'max-w-[1440px] px-6 lg:px-10'
      }`}
    >
      <nav className="flex items-center gap-2 overflow-x-auto" aria-label={t('nav.matches')}>
        {tabs.map((tab) => {
          const active = tab.id === view;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                active
                  ? 'bg-brand-soft text-brand'
                  : 'border border-border bg-surface text-secondary hover:text-primary'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
