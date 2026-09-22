import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { TenantContext } from '../interfaces/tenant-context.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions explicitly required on this route
    }

    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant as TenantContext;

    if (!tenant) {
      throw new ForbiddenException('Tenant context missing. Unable to verify permissions.');
    }

    if (!tenant.permissions) {
      throw new ForbiddenException('No permissions assigned to current role.');
    }

    const hasPermission = requiredPermissions.every(permission => 
      tenant.permissions.includes(permission) || tenant.permissions.includes('admin:all')
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions to perform this action.');
    }

    return true;
  }
}