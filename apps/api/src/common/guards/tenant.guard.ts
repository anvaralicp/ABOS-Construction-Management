import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // In a real implementation, this guard would extract the JWT/session,
    // look up the user's OrganizationMembership, and populate request.tenant.
    // We reject if there is no tenant context explicitly set by upstream auth.
    
    if (!request.tenant || !request.tenant.organizationId) {
      throw new ForbiddenException('Missing tenant context. Ensure you are accessing the API within a valid organization membership.');
    }
    
    return true;
  }
}