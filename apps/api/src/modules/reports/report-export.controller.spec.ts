import { Test, TestingModule } from '@nestjs/testing';
import { ReportExportController } from './report-export.controller';
import { ReportExportService } from './report-export.service';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';

describe('ReportExportController', () => {
  let controller: ReportExportController;
  let service: any;

  beforeEach(async () => {
    service = {
      exportProjectSummary: jest.fn(),
      exportFinancial: jest.fn(),
      exportExpenses: jest.fn(),
      exportBudget: jest.fn(),
      exportVendors: jest.fn(),
      exportWorkforce: jest.fn(),
      exportEquipment: jest.fn(),
      exportProgress: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportExportController],
      providers: [{ provide: ReportExportService, useValue: service }],
    }).compile();

    controller = module.get<ReportExportController>(ReportExportController);
  });

  const ctx: TenantContext = {
    userId: 'u1',
    organizationId: 'org-1',
    roles: [],
    permissions: []
  };

  const mockResponse = {
    set: jest.fn(),
    send: jest.fn(),
  } as any;

  it('should call exportFinancial with appropriate tenant context and format', async () => {
    service.exportFinancial.mockResolvedValue({ buffer: Buffer.from('test'), contentType: 'text/csv', filename: 'test.csv' });
    await controller.exportFinancialSummary(ctx, { format: 'csv' } as any, 'proj-1', undefined, undefined, mockResponse);
    expect(service.exportFinancial).toHaveBeenCalledWith(ctx, 'proj-1', undefined, undefined, 'csv');
    expect(mockResponse.set).toHaveBeenCalledWith({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="test.csv"',
    });
    expect(mockResponse.send).toHaveBeenCalled();
  });
});
