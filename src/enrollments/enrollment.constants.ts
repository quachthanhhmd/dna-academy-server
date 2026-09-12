/** Epic 4 v2 §2.1 — backed by the Postgres type `enrollment_source_enum`. */
export const ENROLLMENT_SOURCES = ['organic', 'admin', 'coupon'] as const;

export type EnrollmentSource = (typeof ENROLLMENT_SOURCES)[number];

/** `enrollment.status` lifecycle. */
export const ENROLLMENT_STATUSES = [
  'enrolled',
  'in_progress',
  'completed',
  'cancelled',
] as const;

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];
