import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '../interfaces/tenant-context.interface';

/**
 * Extracts the strict TenantContext from the authenticated request.
 * The context must have been securely populated by the Auth Guard,
 * never blindly read from body or arbitrary queries.
 */
export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.tenant) {
      throw new Error('CurrentTenant decorator used on route without TenantContext populated by AuthGuard');
    }
    return request.tenant as TenantContext;
  },
);