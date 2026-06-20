import { useNavigate } from 'react-router';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/Badge';
import {
  IconMapPin,
  IconBed,
  IconBath,
  IconMaximize,
  IconHeart,
  IconArrowRight,
  IconBuilding,
} from '@/components/ui/icons';
import { formatCedisDecimal, humanize, listingStatusTone } from '@/lib/format';
import type { Listing } from '@/lib/types';

interface ListingCardProps {
  listing: Listing;
  saved?: boolean;
  onSave?: (id: number) => void;
  onClick?: () => void;
  /** @deprecated pass onClick instead; kept for backward compat */
  to?: string;
  /** @deprecated use a wrapping element for footer content */
  footer?: React.ReactNode;
  showStatus?: boolean;
  className?: string;
}

export function ListingCard({
  listing,
  saved = false,
  onSave,
  onClick,
  to,
  footer,
  showStatus,
  className,
}: ListingCardProps) {
  const navigate = useNavigate();
  const handleClick = onClick ?? (to ? () => navigate(to) : undefined);
  const unit = listing.unit;
  const property = unit?.property;
  const location = property
    ? [property.city, property.state].filter(Boolean).join(', ')
    : null;

  return (
    <div
      className={cn(
        'group bg-surface rounded-2xl border border-ink-200 shadow-sm overflow-hidden ' +
        'transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer',
        className,
      )}
      onClick={handleClick}
    >
      {/* Image area */}
      <div className="relative overflow-hidden bg-brand-50" style={{ aspectRatio: '16/11' }}>
        {listing.primary_photo?.path ? (
          <img
            src={listing.primary_photo.path}
            alt={listing.primary_photo.alt_text ?? listing.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-brand-300">
            <IconBuilding size={48} className="opacity-40" />
          </div>
        )}

        {/* Status badge top-left */}
        {(showStatus !== false) && (
          <div className="absolute left-3 top-3">
            <Badge tone={listingStatusTone(listing.status)} size="sm">
              {humanize(listing.status)}
            </Badge>
          </div>
        )}

        {/* Save / Heart button top-right */}
        {onSave && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSave(listing.id);
            }}
            aria-label={saved ? 'Remove from saved' : 'Save listing'}
            className={cn(
              'absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full ' +
              'transition-all duration-150',
              saved
                ? 'bg-danger-500 text-white'
                : 'bg-surface/80 text-ink-500 hover:bg-surface hover:text-danger-500 backdrop-blur-sm',
            )}
          >
            <IconHeart size={15} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Location */}
        {location && (
          <p className="flex items-center gap-1 text-xs text-ink-500 mb-1.5">
            <IconMapPin size={12} />
            {location}
          </p>
        )}

        {/* Title */}
        <h3 className="font-display text-lg font-semibold text-ink-950 leading-snug line-clamp-1 group-hover:text-brand-700 transition-colors">
          {listing.title}
        </h3>

        {/* Beds / baths / size row */}
        {unit && (
          <div className="mt-2 flex items-center gap-3 text-xs text-ink-500">
            <span className="flex items-center gap-1">
              <IconBed size={13} />
              {unit.bedrooms} bed
            </span>
            <span className="flex items-center gap-1">
              <IconBath size={13} />
              {unit.bathrooms} bath
            </span>
            {unit.square_feet && (
              <span className="flex items-center gap-1">
                <IconMaximize size={13} />
                {unit.square_feet.toLocaleString()} sqft
              </span>
            )}
          </div>
        )}

        {/* Price + View button */}
        <div className="mt-4 flex items-center justify-between">
          {unit ? (
            <p
              className="font-display font-semibold text-[var(--color-money)]"
              style={{ fontSize: '1.2rem' }}
            >
              {formatCedisDecimal(unit.rent_amount)}
              <span className="text-xs font-normal text-ink-500 ml-0.5">/mo</span>
            </p>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClick?.();
            }}
            className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-600 transition-colors"
          >
            View
            <IconArrowRight size={13} />
          </button>
        </div>
        {footer && <div className="mt-2">{footer}</div>}
      </div>
    </div>
  );
}
