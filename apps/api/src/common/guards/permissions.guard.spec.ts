import { PermissionsGuard } from './permissions.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: any;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new PermissionsGuard(reflector);
  });

  const mockContext = (tenant: any) => ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ tenant })
    })
  } as unknown as ExecutionContext);

  it('should allow if no permissions required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(mockContext({}))).toBe(true);
  });

  it('should reject unauthorized member without required permission', () => {
    reflector.getAllAndOverride.mockReturnValue(['write']);
    expect(() => guard.canActivate(mockContext({ permissions: ['read'] }))).toThrow(ForbiddenException);
  });

  it('should allow authorized member with required permission', () => {
    reflector.getAllAndOverride.mockReturnValue(['write']);
    expect(guard.canActivate(mockContext({ permissions: ['read', 'write'] }))).toBe(true);
  });

  it('should allow authorized organization administrator (admin:all) always', () => {
    reflector.getAllAndOverride.mockReturnValue(['delete']);
    expect(guard.canActivate(mockContext({ permissions: ['admin:all'] }))).toBe(true);
  });
});
