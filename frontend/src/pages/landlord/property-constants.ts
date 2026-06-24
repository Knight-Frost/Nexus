import type { PropertyType } from '@/lib/types';

/** Property types the backend enum accepts (shared by the page filter + drawer). */
export const PROPERTY_TYPES: PropertyType[] = [
  'single_family',
  'multi_family',
  'apartment',
  'condo',
  'townhouse',
  'commercial',
  'other',
];
