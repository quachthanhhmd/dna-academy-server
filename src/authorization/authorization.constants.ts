export const PERMISSION_METADATA_KEY = 'permission';

export interface RequiredPermission {
  module: string;
  action: string;
}

export const ADMIN_MODULES: ReadonlyArray<{ name: string; label: string }> = [
  { name: 'master_data', label: 'Master Data' },
  { name: 'courses', label: 'Courses' },
  { name: 'instructors', label: 'Instructors' },
  { name: 'dashboard', label: 'Dashboard' },
  { name: 'users', label: 'Users' },
  { name: 'roles', label: 'Roles' },
];

export const PERMISSION_ACTIONS: ReadonlyArray<{
  action: string;
  label: string;
}> = [
  { action: 'view', label: 'View' },
  { action: 'create', label: 'Create' },
  { action: 'edit', label: 'Edit' },
  { action: 'delete', label: 'Delete' },
  { action: 'export', label: 'Export' },
  { action: 'publish', label: 'Publish' },
];

/**
 * Permission model §2.6 — permissions outside the module × action grid, each
 * guarding one thing the grid cannot express.
 */
export const EXTRA_PERMISSIONS: ReadonlyArray<{
  module: string;
  action: string;
  label: string;
}> = [
  // The ownership bypass in CourseAccessService, and dashboard scope "all".
  { module: 'courses', action: 'edit_any', label: 'Edit any course' },
  // Student-level rows on the dashboard: /students, /reflection/comments.
  { module: 'dashboard', action: 'view_students', label: 'View students' },
  // Creating a login account for an instructor, and re-sending its invite.
  {
    module: 'instructors',
    action: 'create_account',
    label: 'Create login account',
  },
  // PUT /admin/users/:id/roles.
  { module: 'users', action: 'assign_role', label: 'Assign role' },
];

/**
 * Permission model §0.3 — what the built-in Instructor role is granted. Admin
 * holds every permission; User holds none.
 */
export const INSTRUCTOR_PERMISSIONS: ReadonlyArray<RequiredPermission> = [
  { module: 'dashboard', action: 'view' },
  { module: 'courses', action: 'view' },
  { module: 'courses', action: 'edit' },
];
