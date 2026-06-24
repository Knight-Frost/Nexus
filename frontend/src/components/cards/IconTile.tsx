import { cn } from '@/lib/cn';
import { iconTileClass, type SemanticRole } from './variants';

interface IconTileProps {
  icon: React.ReactNode;
  role?: SemanticRole;
  /** rounded square (default) reads as "tile"; circle reads softer. */
  shape?: 'square' | 'circle';
  size?: 'sm' | 'md' | 'lg';
  /** On a deep command card, the tile is a translucent chip instead of a tint. */
  onCommand?: boolean;
  className?: string;
}

const sizePx: Record<NonNullable<IconTileProps['size']>, number> = {
  sm: 34,
  md: 44,
  lg: 52,
};

/**
 * The semantic icon chip from the design language: a rounded tile carrying a
 * role tint + the role's icon color. On command cards it switches to a
 * translucent white chip so it reads on the deep fill.
 */
export function IconTile({
  icon,
  role = 'neutral',
  shape = 'square',
  size = 'md',
  onCommand = false,
  className,
}: IconTileProps) {
  const px = sizePx[size];
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center shrink-0',
        shape === 'circle' ? 'rounded-full' : 'rounded-xl',
        !onCommand && iconTileClass[role],
        className,
      )}
      style={{
        width: px,
        height: px,
        ...(onCommand
          ? {
              backgroundColor: 'var(--nexus-cmd-chip)',
              color: 'var(--nexus-cmd-chip-fg)',
            }
          : null),
      }}
      aria-hidden="true"
    >
      {icon}
    </span>
  );
}
