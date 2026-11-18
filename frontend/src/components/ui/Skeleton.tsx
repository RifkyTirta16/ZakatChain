import type { ReactNode } from 'react';

export interface SkeletonProps {
  className?: string;
  children?: ReactNode;
  lines?: number;
}

const LINE_HEIGHT_PX = 16;
const BLOCK_PADDING_PX = 32;

export const Skeleton = ({
  className,
  children,
  lines = 3,
}: SkeletonProps) => (
  <div
    className={`
      max-w-fit
      ${className || ''}
      bg-primary-bg
      animate-pulse
    `}
    style={{ minHeight: lines * LINE_HEIGHT_PX + BLOCK_PADDING_PX }}
  >
    {children ?? null}
  </div>
);
