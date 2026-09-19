/**
 * The built-in roles. Id 3 (Super Admin) was merged into Admin by the
 * permission model (D1) and must not be reused.
 *
 * Authorization never compares against these — it checks permissions (D4).
 * They exist for assigning a role, and for the dashboard's definition of a
 * student.
 */
export enum RoleEnum {
  /** Holds every permission. */
  'admin' = 1,
  /** A learner. Holds no permission. */
  'user' = 2,
  /**
   * A teaching account (Epic 7 D1), kept out of the student count. Holds
   * `dashboard:view`, `courses:view` and `courses:edit` — §0.3.
   */
  'instructor' = 4,
}
