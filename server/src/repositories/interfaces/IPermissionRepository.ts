export interface IPermissionRepository {
  loadRolePermissions(): Promise<Map<string, Set<string>>>;
}
