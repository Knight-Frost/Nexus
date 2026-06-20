/**
 * className combiner.
 *
 * Upgraded from the old plain-join helper to `clsx` + `tailwind-merge` so that
 * variant components can override base classes without specificity surprises.
 * `twMerge` resolves conflicting Tailwind utilities (e.g. `px-3` + `px-6` ->
 * `px-6`), which is what makes a `cva`-style component kit behave predictably.
 */
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type ClassValue = Parameters<typeof clsx>[number];

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
