import { TenantGuard } from './tenant.guard';
import { ExecutionContext, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      organizationMembership: { findUnique: jest.fn() }
    };
    guard = new TenantGuard(prisma as any);
  });

  const mockContext = (headers: any, user: any) => ({
    switchToHttp: () => ({
      getRequest: () => ({ headers, user })
    })
  } as ExecutionContext);

  it('should throw BadRequest if x-organization-id is missing', async () => {
    const ctx = mockContext({}, { id: 'user1' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(BadRequestException);
  });

  it('should throw Forbidden if membership does not exist (cannot access another org/switch without membership)', async () => {
    prisma.organizationMembership.findUnique.mockResolvedValue(null);
    const ctx = mockContext({ 'x-organization-id': 'org1' }, { id: 'user1' });
    
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should throw Forbidden if organization is inactive (inactive membership establishes no context)', async () => {
    prisma.organizationMembership.findUnique.mockResolvedValue({
      organization: { status: 'SUSPENDED' },
      role: { permissions: [] }
    });
    const ctx = mockContext({ 'x-organization-id': 'org1' }, { id: 'user1' });
    
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should populate tenant context for authorized member', async () => {
    prisma.organizationMembership.findUnique.mockResolvedValue({
      organization_id: 'org1',
      role_id: 'role1',
      organization: { status: 'ACTIVE' },
      role: { permissions: [{ action: 'read' }] }
    });
    
    const req = { headers: { 'x-organization-id': 'org1' }, user: { id: 'user1' }, tenant: null };
    const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as any;

    await guard.canActivate(ctx);
    expect(req.tenant.organizationId).toBe('org1');
    expect(req.tenant.permissions).toContain('read');
  });
});
