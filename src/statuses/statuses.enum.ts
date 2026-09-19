export enum StatusEnum {
  'active' = 1,
  /** Registered, email not confirmed yet. Can still sign in. */
  'inactive' = 2,
  /**
   * Switched off by an admin (permission model D9). Cannot sign in or refresh,
   * and — unlike `inactive` — cannot be undone by confirming an email.
   */
  'deactivated' = 3,
}
