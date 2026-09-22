import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';

describe('AuditLogsController', () => {
  let controller: AuditLogsController;
  let service: any;

  beforeEach(async () => {
    const mockService = {
      list: jest.fn(),
      getDetail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [{ provide: AuditLogsService, useValue: mockService }],
    }).compile();

    controller = module.get<AuditLogsController>(AuditLogsController);
    service = module.get<AuditLogsService>(AuditLogsService);
  });

  const ctx: TenantContext = {
    userId: 'u1',
    organizationId: 'org-1',
    roles: [],
    permissions: []
  };

  it('should validate ParseUUIDPipe usage internally or via Nest (Unit level representation)', async () => {
    // In unit testing, pipes aren't automatically applied to controller methods.
    // E2E testing covers real pipe integration. However, we can assert the Pipe exists on the method.
    const getDetailParams = Reflect.getMetadata('routeArgsMetadata', AuditLogsController, 'getDetail');
    // NestJS parameter decorators inject metadata. We verify ParseUUIDPipe is used on the parameter.
    let hasUUIDPipe = false;
    for (const key in getDetailParams) {
      if (getDetailParams[key].pipes && getDetailParams[key].pipes.includes(ParseUUIDPipe)) {
        hasUUIDPipe = true;
      }
    }
    expect(hasUUIDPipe).toBe(true);
  });

  it('should call getDetail successfully if valid', async () => {
    service.getDetail.mockResolvedValue({ id: 'uuid' });
    const res = await controller.getDetail(ctx, 'uuid');
    expect(res).toEqual({ id: 'uuid' });
    expect(service.getDetail).toHaveBeenCalledWith(ctx, 'uuid');
  });
});
