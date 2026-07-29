/**
 * Maps raw backend/auth errors to safe, user-friendly messages.
 * Full technical details stay in the browser console only.
 */

export const mapErrorToUserMessage = (error: unknown, context = 'complete this action'): string => {
  // eslint-disable-next-line no-console
  console.error(`[${context}]`, error);

  const raw = (error instanceof Error ? error.message : typeof error === 'string' ? error : '')
    .toLowerCase();

  if (!raw) return `Failed to ${context}. Please try again.`;

  if (raw.includes('invalid login credentials') || raw.includes('invalid email or password')) {
    return 'Invalid email or password.';
  }
  if (raw.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }
  if (raw.includes('already registered') || raw.includes('already been registered')) {
    return 'An account with this email already exists.';
  }
  if (raw.includes('signups not allowed') || raw.includes('signup is disabled')) {
    return 'New sign-ups are disabled. Please contact your administrator.';
  }
  if (raw.includes('rate limit') || raw.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (raw.includes('unique constraint') || raw.includes('duplicate key')) {
    return 'This record already exists.';
  }
  if (raw.includes('foreign key')) {
    return 'Cannot complete this action because related records exist.';
  }
  if (
    raw.includes('permission denied') ||
    raw.includes('row-level security') ||
    raw.includes('unauthorized') ||
    raw.includes('not authorized')
  ) {
    return 'You do not have permission for this action.';
  }
  if (raw.includes('jwt') || raw.includes('token') || raw.includes('session')) {
    return 'Your session expired. Please sign in again.';
  }
  if (raw.includes('failed to fetch') || raw.includes('network')) {
    return 'Network problem. Please check your connection and try again.';
  }

  return `Failed to ${context}. Please try again.`;
};

/** Convenience wrapper used by toast handlers. */
export const safeErrorMessage = (error: unknown, context: string): string =>
  mapErrorToUserMessage(error, context);
