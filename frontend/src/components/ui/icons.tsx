/** Minimal inline icon set (stroke-based, 24px grid). Avoids an icon dependency. */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconDashboard = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Icon>
);

export const IconBuilding = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
    <path d="M14 9h4a2 2 0 0 1 2 2v10" />
    <path d="M8 7h2M8 11h2M8 15h2M3 21h18" />
  </Icon>
);

export const IconHome = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M9 21v-6h6v6" />
  </Icon>
);

export const IconDoc = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h6" />
  </Icon>
);

export const IconLedger = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </Icon>
);

export const IconBell = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </Icon>
);

export const IconHeart = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l1.7 1.7L12 21l7.1-7.1 1.7-1.7a5 5 0 0 0 0-7.1z" />
  </Icon>
);

export const IconShield = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </Icon>
);

export const IconUsers = (p: IconProps) => (
  <Icon {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
  </Icon>
);

export const IconLogout = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </Icon>
);

export const IconPlus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 13l4 4L19 7" />
  </Icon>
);

export const IconX = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const IconMapPin = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </Icon>
);

export const IconBed = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2 17v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5M2 17h20M2 17v3M22 17v3" />
    <path d="M6 10V8a2 2 0 0 1 2-2h3v4" />
  </Icon>
);

export const IconBath = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12V6a2 2 0 0 1 2-2 2 2 0 0 1 2 2M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" />
    <path d="M6 19l-1 2M18 19l1 2" />
  </Icon>
);

export const IconChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);

export const IconMenu = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Icon>
);

export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Icon>
);
