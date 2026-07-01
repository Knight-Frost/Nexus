import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/cn';
import { IconX } from './icons';

/**
 * Right-side creation/edit drawer — a premium alternative to a centered modal
 * for primary workflows. Built on Radix Dialog so focus-trap, focus-return,
 * Escape, scroll-lock, portalling and aria wiring come for free.
 *
 * Soft veil (not a heavy black blur). The page stays visible behind it.
 * Reusable for Add listing / Add unit / Create maintenance request / etc.
 */
interface DrawerProps {
  open: boolean;
  /** Routed from Radix: fires on Escape, outside-press, and X. Guard here. */
  onOpenChange: (open: boolean) => void;
  /** When false, an outside press will NOT close (e.g. unsaved-changes guard owns it). */
  dismissibleOnOutside?: boolean;
  /** When true, the drawer ignores its OWN Escape/outside (a nested confirm owns them). */
  blockInteractions?: boolean;
  widthClass?: string;
  children: React.ReactNode;
}

export function Drawer({
  open,
  onOpenChange,
  dismissibleOnOutside = true,
  blockInteractions = false,
  widthClass = 'sm:max-w-[620px]',
  children,
}: DrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Soft veil — a light dim, never near-black; works in light + dark. */}
        <Dialog.Overlay
          className="fixed inset-0 z-50 animate-fade-in"
          style={{ background: 'rgba(20, 17, 13, 0.30)', backdropFilter: 'blur(2px)' }}
        />
        <Dialog.Content
          aria-describedby={undefined}
          onEscapeKeyDown={(e) => {
            if (blockInteractions) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (blockInteractions || !dismissibleOnOutside) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (blockInteractions || !dismissibleOnOutside) e.preventDefault();
          }}
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex h-dvh w-full flex-col overflow-hidden',
            'border-l border-ink-200 bg-surface shadow-lg outline-none',
            'animate-slide-in-right sm:rounded-l-2xl',
            widthClass,
          )}
        >
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface DrawerHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  onClose: () => void;
  /** Slot under the title/description — e.g. a StepIndicator. */
  accessory?: React.ReactNode;
}

export function DrawerHeader({ title, description, onClose, accessory }: DrawerHeaderProps) {
  return (
    <div className="shrink-0 border-b border-ink-200 px-6 pb-5 pt-6 sm:px-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Dialog.Title className="font-display text-2xl font-semibold leading-tight text-ink-950">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="mt-1 text-sm text-ink-500">
              {description}
            </Dialog.Description>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-800 focus-visible:outline-2"
        >
          <IconX size={18} />
        </button>
      </div>
      {accessory && <div className="mt-5">{accessory}</div>}
    </div>
  );
}

export function DrawerBody({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex-1 overflow-y-auto px-6 py-6 sm:px-7', className)}>
      {children}
    </div>
  );
}

export function DrawerFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="shrink-0 border-t border-ink-200 bg-surface px-6 py-4 sm:px-7">
      <div className="flex items-center justify-between gap-3">{children}</div>
    </div>
  );
}

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Small uppercase context label above the title (e.g. "LISTING", "TENANT"). */
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Slot under the title (e.g. a status badge or step indicator). */
  accessory?: React.ReactNode;
  /** Sticky footer — typically primary/secondary actions. */
  footer?: React.ReactNode;
  /** Override drawer width. Default ~620px; pass a wider class for galleries. */
  widthClass?: string;
  /** When false, outside-press won't dismiss (unsaved-changes guard). */
  dismissibleOnOutside?: boolean;
  children: React.ReactNode;
}

/**
 * The one-call detail / edit / review panel — the premium replacement for the
 * centered Modal on every NON-destructive workflow. Composes Drawer + header +
 * scrollable body + sticky footer, so callers pass content and actions only.
 * Focus-trap, Escape, scroll-lock and aria come from the underlying Radix Drawer.
 */
export function DetailDrawer({
  open,
  onClose,
  eyebrow,
  title,
  description,
  accessory,
  footer,
  widthClass,
  dismissibleOnOutside = true,
  children,
}: DetailDrawerProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      widthClass={widthClass}
      dismissibleOnOutside={dismissibleOnOutside}
    >
      <DrawerHeader
        onClose={onClose}
        title={
          <span className="block">
            {eyebrow && (
              <span className="mb-1 block font-sans text-xs font-semibold uppercase tracking-wider text-ink-500">
                {eyebrow}
              </span>
            )}
            {title}
          </span>
        }
        description={description}
        accessory={accessory}
      />
      <DrawerBody>{children}</DrawerBody>
      {footer && <DrawerFooter>{footer}</DrawerFooter>}
    </Drawer>
  );
}
