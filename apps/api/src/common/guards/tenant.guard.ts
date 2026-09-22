import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      throw new UnauthorizedException('Authentication required before establishing tenant context.');
    }

    const orgId = request.headers['x-organization-id'];
    if (!orgId) {
      throw new BadRequestException('x-organization-id header is required for this operation.');
    }

    // Look up active membership in DB securely enforcing Tenant boundaries
    const membership = await this.prisma.organizationMembership.findUnique({
      where: {
        organization_id_user_id: {
          organization_id: orgId,
          user_id: user.id,
        },
      },
      include: {
        organization: true,
        role: {
          include: {
            permissions: true,
          }
        }
      }
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of the requested organization.');
    }

    if (membership.organization.status !== 'ACTIVE') {
      throw new ForbiddenException('The requested organization is not active.');
    }

    // Map permissions to flat array of action strings
    const permissions = membership.role.permissions.map(p => p.action);

    // Populate strict TenantContext securely
    request.tenant = {
      userId: user.id,
      organizationId: orgId,
      roleId: membership.role_id,
      permissions,
    };
    
    return true;
  }
}