export interface TenantContext {
  userId: string;
  organizationId: string;
  roleId?: string;
  permissions?: string[];
  entitlements?: Record<string, number | boolean>;
}