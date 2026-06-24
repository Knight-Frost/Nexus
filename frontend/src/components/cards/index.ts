/**
 * Homecrest semantic card system — public surface.
 *
 * Levels:  NexusCard (1 quiet / 2 tinted) · StatusCard (metric) · CommandCard (3 featured)
 * Pieces:  IconTile · SemanticBadge
 * Layout:  DashboardSection · SectionHeader · DataCardGrid
 * Logic:   variants.ts — data-driven role mapping (the truthfulness firewall)
 */
export { NexusCard } from './NexusCard';
export { CommandCard } from './CommandCard';
export { StatusCard } from './StatusCard';
export { IconTile } from './IconTile';
export { SemanticBadge } from './SemanticBadge';
export {
  DashboardSection,
  SectionHeader,
  DataCardGrid,
} from './DashboardSection';
export * from './variants';
