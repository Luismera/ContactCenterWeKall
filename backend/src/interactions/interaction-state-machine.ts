import { InteractionStatus } from '@prisma/client';

/**
 * Strict forward-only transitions: open -> in_progress -> resolved.
 * No skipping ahead (open -> resolved) and no moving backwards.
 */
const ALLOWED_TRANSITIONS: Record<InteractionStatus, InteractionStatus[]> = {
  open: ['in_progress'],
  in_progress: ['resolved'],
  resolved: [],
};

export function isValidTransition(
  from: InteractionStatus,
  to: InteractionStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
