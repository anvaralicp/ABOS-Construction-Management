import { Test, TestingModule } from '@nestjs/testing';
import { TaxController } from './tax.controller';
import { TaxService } from './tax.service';

const mockTaxService = {
  createConfig: jest.fn(),
  getConfigs: jest.fn(),
  getConfig: jest.fn(),
  updateConfig: jest.fn(),
  deleteConfig: jest.fn(),
  validateGstin: jest.fn(),
  getSummaryReport: jest.fn(),
  getVendorsReport: jest.fn(),
  getProjectsReport: jest.fn(),
};

const mockContext = {
  userId: 'user-1',
  organizationId: 'org-1',
  roles: ['admin']
};

describe('TaxController', () => {
  let controller: TaxController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaxController],
      providers: [
        { provide: TaxService, useValue: mockTaxService },
      ],
    }).compile();

    controller = module.get<TaxController>(TaxController);
    jest.clearAllMocks();
  });

  it('should create config', async () => {
    mockTaxService.createConfig.mockResolvedValue({ id: 'conf-1' });
    const res = await controller.createConfig(mockContext, { name: 'GST 18', rate_percentage: 18 });
    expect(res.id).toBe('conf-1');
  });

  it('should query summary report', async () => {
    mockTaxService.getSummaryReport.mockResolvedValue({ tax_amount: 100 });
    const res = await controller.getSummaryReport(mockContext, { project_id: 'proj-1' });
    expect(res.tax_amount).toBe(100);
  });
});
