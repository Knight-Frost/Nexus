import { Link } from 'react-router';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { IconBath, IconBed, IconMapPin } from '@/components/ui/icons';
import { formatDollars, humanize, listingStatusTone } from '@/lib/format';
import type { Listing } from '@/lib/types';

export function ListingCard({
  listing,
  to,
  footer,
  showStatus,
}: {
  listing: Listing;
  to: string;
  footer?: React.ReactNode;
  showStatus?: boolean;
}) {
  const unit = listing.unit;
  const property = unit?.property;
  const location = property
    ? [property.city, property.state].filter(Boolean).join(', ')
    : null;

  return (
    <Card className="group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
      <Link to={to} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-brand-100 to-brand-50">
          {listing.primary_photo?.path ? (
            <img
              src={listing.primary_photo.path}
              alt={listing.primary_photo.alt_text ?? listing.title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-brand-700/30">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          {listing.featured && (
            <span className="absolute left-3 top-3">
              <Badge tone="brand">Featured</Badge>
            </span>
          )}
          {showStatus && (
            <span className="absolute right-3 top-3">
              <Badge tone={listingStatusTone(listing.status)}>{humanize(listing.status)}</Badge>
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link to={to}>
          <h3 className="line-clamp-1 font-semibold text-ink-900 transition group-hover:text-brand-800">
            {listing.title}
          </h3>
        </Link>
        {location && (
          <p className="mt-1 flex items-center gap-1 text-sm text-ink-500">
            <IconMapPin className="h-4 w-4" />
            {location}
          </p>
        )}

        {unit && (
          <div className="mt-3 flex items-center gap-4 text-sm text-ink-600">
            <span className="flex items-center gap-1.5">
              <IconBed className="h-4 w-4 text-ink-400" />
              {unit.bedrooms} bd
            </span>
            <span className="flex items-center gap-1.5">
              <IconBath className="h-4 w-4 text-ink-400" />
              {unit.bathrooms} ba
            </span>
          </div>
        )}

        <div className="mt-4 flex items-end justify-between pt-1">
          {unit && (
            <p className="text-lg font-bold text-ink-950">
              {formatDollars(unit.rent_amount)}
              <span className="text-sm font-normal text-ink-500">/mo</span>
            </p>
          )}
          {footer}
        </div>
      </div>
    </Card>
  );
}
