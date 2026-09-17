export enum RoleEnum {
  'admin' = 1,
  'user' = 2,
  'superAdmin' = 3,
  /**
   * Epic 7 D1 — teaching accounts, so they stop being counted as students.
   *
   * Carries no permissions of its own: `role_permission` has no row for it, on
   * purpose. An instructor gets admin-panel access when a feature needs it,
   * not as a side effect of being excluded from a dashboard count.
   */
  'instructor' = 4,
}
