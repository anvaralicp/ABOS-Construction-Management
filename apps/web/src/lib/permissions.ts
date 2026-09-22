import { useAuth } from './auth-context';

export function usePermissions() {
  const { permissions } = useAuth();
  
  const hasPermission = (permission: string) => {
    // The backend remains the authoritative boundary.
    // This frontend helper only governs UI visibility (e.g. hiding a button).
    return permissions.includes(permission) || permissions.includes('*');
  };

  return { hasPermission };
}
