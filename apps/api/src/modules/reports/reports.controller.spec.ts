import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: any;

  beforeEach(async () => {
    service = {
      getProjectSummary: jest.fn().mockResolvedValue({ success: true }),
      getFinancialSummary: jest.fn().mockResolvedValue({ success: true }),
      getExpensesReport: jest.fn().mockResolvedValue({ success: true }),
      getBudgetReport: jest.fn().mockResolvedValue({ success: true }),
      getVendorsReport: jest.fn().mockResolvedValue({ success: true }),
      getWorkforceReport: jest.fn().mockResolvedValue({ success: true }),
      getEquipmentReport: jest.fn().mockResolvedValue({ success: true }),
      getProgressReport: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        { provide: ReportsService, useValue: service },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
  });

  const mockContext: TenantContext = {
    organizationId: 'org-1',
    userId: 'user-1',
    permissions: [],
  };

  it('should route getProjectSummary', async () => {
    const res = await controller.getProjectSummary(mockContext, { project_id: 'proj-1' });
    expect(res.success).toBe(true);
    expect(service.getProjectSummary).toHaveBeenCalledWith(mockContext, { project_id: 'proj-1' });
  });

  it('should route getFinancialSummary', async () => {
    const res = await controller.getFinancialSummary(mockContext, 'proj-1');
    expect(res.success).toBe(true);
    expect(service.getFinancialSummary).toHaveBeenCalledWith(mockContext, 'proj-1', undefined, undefined);
  });

  it('should route getExpensesReport', async () => {
    const res = await controller.getExpensesReport(mockContext, {});
    expect(res.success).toBe(true);
  });
  
  it('should route getBudgetReport', async () => {
    const res = await controller.getBudgetReport(mockContext, {});
    expect(res.success).toBe(true);
  });

  it('should route getVendorsReport', async () => {
    const res = await controller.getVendorsReport(mockContext, {});
    expect(res.success).toBe(true);
  });

  it('should route getWorkforceReport', async () => {
    const res = await controller.getWorkforceReport(mockContext, {});
    expect(res.success).toBe(true);
  });

  it('should route getEquipmentReport', async () => {
    const res = await controller.getEquipmentReport(mockContext, {});
    expect(res.success).toBe(true);
  });

  it('should route getProgressReport', async () => {
    const res = await controller.getProgressReport(mockContext, {});
    expect(res.success).toBe(true);
  });
});
