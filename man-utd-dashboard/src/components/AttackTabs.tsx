'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/I18nContext';

export function AttackTabs({
  view,
  season,
}: {
  view: 'overview' | 'shooting';
  season?: string;
}) {
  const { t } = useI18n();
  const seasonQ = season ? `season=${encodeURIComponent(season)}` : '';
  const tabs = [
    {
      id: 'overview',
      href: `/attack${seasonQ ? `?${seasonQ}` : ''}`,
      label: t('attack.tabs.overview'),
    },
    {
      id: 'shooting',
      href: `/attack?view=shooting${seasonQ ? `&${seasonQ}` : ''}`,
      label: t('matchLog.tabs.shooting'),
    },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 pt-6 lg:px-10">
      <nav className="flex items-center gap-2 overflow-x-auto" aria-label={t('nav.attack')}>
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
