'use client';

import type { ReactNode } from 'react';

/**
 * Column-header label with a hover tooltip explaining the stat.
 * CSS-only: opacity keeps the text in the a11y tree, no JS needed.
 * Opens downward (top-full) so it is not clipped by sticky thead.
 */
export function ColTip({
  label,
  tip,
  align = 'left',
}: {
  label: ReactNode;
  tip?: string;
  align?: 'left' | 'center' | 'right';
}) {
  if (!tip) return <>{label}</>;
  const pos =
    align === 'right'
      ? 'right-0'
      : align === 'center'
        ? 'left-1/2 -translate-x-1/2'
        : 'left-0';
  return (
    <span className="group/tip relative inline-flex cursor-help">
      <span className="underline decoration-dotted decoration-disabled underline-offset-4">
        {label}
      </span>
      <span
        role="tooltip"
        className={`pointer-events-none absolute top-full ${pos} z-30 mt-1 w-max max-w-60 whitespace-normal rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-left text-[11px] font-normal normal-case tracking-normal text-secondary opacity-0 shadow-lg transition-opacity duration-150 group-hover/tip:opacity-100`}
      >
        {tip}
      </span>
    </span>
  );
}
