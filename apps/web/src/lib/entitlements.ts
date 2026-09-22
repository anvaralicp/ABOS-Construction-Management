import { useAuth } from './auth-context';

export function useEntitlements() {
  const { entitlements } = useAuth();
  
  const hasFeature = (feature: string) => {
    // UI-level entitlement check. The backend enforces subscription billing restrictions.
    return entitlements.includes(feature);
  };

  return { hasFeature };
}
