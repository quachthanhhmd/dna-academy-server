export const PERMISSION_METADATA_KEY = 'permission';

export interface RequiredPermission {
  module: string;
  action: string;
}

export const ADMIN_MODULES: ReadonlyArray<{ name: string; label: string }> = [
  { name: 'master_data', label: 'Master Data' },
  { name: 'courses', label: 'Courses' },
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
