import { useEffect, useRef } from 'react';
import { Field, Input, Select } from '@/components/ui/Field';
import { IconSearch } from '@/components/ui/icons';

const AREAS = [
  'Access', 'Users', 'Listings', 'Properties', 'Contracts',
  'Ledger', 'Applications', 'Maintenance', 'Documents', 'Messages',
  'Settings', 'System',
];

export interface AuditFilters {
  severity: '' | 'info' | 'warning' | 'critical';
  area: string;
  actor_role: '' | 'admin' | 'landlord' | 'tenant' | 'user' | 'system';
  from_date: string;
  to_date: string;
  search: string;
  sort: 'newest' | 'oldest';
}

interface AuditFilterBarProps {
  filters: AuditFilters;
  searchInput: string;
  onSearchInputChange: (v: string) => void;
  onChange: (partial: Partial<AuditFilters>) => void;
}

export function AuditFilterBar({
  filters,
  searchInput,
  onSearchInputChange,
  onChange,
}: AuditFilterBarProps) {
  // Debounce search into the filters.search state
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ search: searchInput.trim() });
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-ink-200 bg-surface p-4 shadow-sm">
      {/* Severity */}
      <div className="w-40">
        <Field label="Severity">
          {(id) => (
            <Select
              id={id}
              value={filters.severity}
              onChange={(e) => onChange({ severity: e.target.value as AuditFilters['severity'] })}
              aria-label="Filter by severity"
            >
              <option value="">All severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </Select>
          )}
        </Field>
      </div>

      {/* Area */}
      <div className="w-44">
        <Field label="Area">
          {(id) => (
            <Select
              id={id}
              value={filters.area}
              onChange={(e) => onChange({ area: e.target.value })}
              aria-label="Filter by area"
            >
              <option value="">All areas</option>
              {AREAS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      {/* Actor role */}
      <div className="w-40">
        <Field label="Actor role">
          {(id) => (
            <Select
              id={id}
              value={filters.actor_role}
              onChange={(e) => onChange({ actor_role: e.target.value as AuditFilters['actor_role'] })}
              aria-label="Filter by actor role"
            >
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="landlord">Landlord</option>
              <option value="tenant">Tenant</option>
              <option value="user">User</option>
              <option value="system">System</option>
            </Select>
          )}
        </Field>
      </div>

      {/* From date */}
      <div className="w-40">
        <Field label="From date">
          {(id) => (
            <Input
              id={id}
              type="date"
              value={filters.from_date}
              onChange={(e) => onChange({ from_date: e.target.value })}
              aria-label="Filter from date"
            />
          )}
        </Field>
      </div>

      {/* To date */}
      <div className="w-40">
        <Field label="To date">
          {(id) => (
            <Input
              id={id}
              type="date"
              value={filters.to_date}
              onChange={(e) => onChange({ to_date: e.target.value })}
              aria-label="Filter to date"
            />
          )}
        </Field>
      </div>

      {/* Search */}
      <div className="min-w-[200px] flex-1">
        <Field label="Search">
          {(id) => (
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-400">
                <IconSearch size={15} />
              </span>
              <Input
                id={id}
                type="search"
                className="pl-9"
                value={searchInput}
                onChange={(e) => onSearchInputChange(e.target.value)}
                placeholder="Action, actor, summary…"
                aria-label="Search audit logs"
              />
            </div>
          )}
        </Field>
      </div>

      {/* Sort */}
      <div className="w-44">
        <Field label="Sort">
          {(id) => (
            <Select
              id={id}
              value={filters.sort}
              onChange={(e) => onChange({ sort: e.target.value as 'newest' | 'oldest' })}
              aria-label="Sort order"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </Select>
          )}
        </Field>
      </div>
    </div>
  );
}
