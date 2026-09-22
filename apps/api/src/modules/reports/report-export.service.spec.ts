import { Test, TestingModule } from '@nestjs/testing';
import { ReportExportService } from './report-export.service';
import { ReportsService } from './reports.service';
import { AuditService } from '../../core/audit/audit.service';
import { BadRequestException, NotImplementedException } from '@nestjs/common';

describe('ReportExportService', () => {
  let service: ReportExportService;
  let reportsService: any;
  let auditService: any;

  beforeEach(async () => {
    reportsService = {
      getProjectSummary: jest.fn(),
      getFinancialSummary: jest.fn(),
      getExpensesReport: jest.fn(),
      getBudgetReport: jest.fn(),
      getVendorsReport: jest.fn(),
      getWorkforceReport: jest.fn(),
      getEquipmentReport: jest.fn(),
      getProgressReport: jest.fn(),
    };
    auditService = { logEvent: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportExportService,
        { provide: ReportsService, useValue: reportsService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<ReportExportService>(ReportExportService);
  });

  const ctx: any = { organizationId: 'org-1' };

  describe('CSV Security: Formula Injection Mitigation', () => {
    it('should NOT escape legitimate negative numbers', async () => {
      reportsService.getFinancialSummary.mockResolvedValue({
        budget_total: 1000,
        actual_expense_total: 2000,
        paid_to_vendors: 500,
        outstanding_vendor_amount: 1500,
        variance: -1250 // Authentic negative number
      });
      const result = await service.exportFinancial(ctx, 'proj-1', undefined, undefined, 'csv');
      const csvString = result.buffer.toString('utf8');
      expect(csvString).toContain('-1250');
      expect(csvString).not.toContain("'-1250");
    });

    it('should NOT escape negative string numbers', async () => {
      reportsService.getFinancialSummary.mockResolvedValue({
        budget_total: 1000,
        actual_expense_total: 2000,
        paid_to_vendors: 500,
        outstanding_vendor_amount: 1500,
        variance: "-1250.50" // Authentic string negative number
      });
      const result = await service.exportFinancial(ctx, 'proj-1', undefined, undefined, 'csv');
      const csvString = result.buffer.toString('utf8');
      expect(csvString).toContain('-1250.50');
      expect(csvString).not.toContain("'-1250.50");
    });

    it('should escape strings starting with =, +, -, @', async () => {
      reportsService.getExpensesReport.mockResolvedValue({
        data: [
          {
            id: 'exp-1',
            item: '=SUM(A1:A2)',
            category: { name: '+12345' },
            vendor: { name: '@attacker' },
            status: '-formula',
            total_amount: 500,
            created_at: new Date('2026-09-23T00:00:00Z')
          }
        ]
      });
      const result = await service.exportExpenses(ctx, {}, 'csv');
      const csvString = result.buffer.toString('utf8');
      expect(csvString).toContain("'=SUM(A1:A2)");
      expect(csvString).toContain("'+12345");
      expect(csvString).toContain("'@attacker");
      expect(csvString).toContain("'-formula");
    });
  });

  describe('CSV Features', () => {
    it('should correctly escape quotes and commas in strings', async () => {
      reportsService.getExpensesReport.mockResolvedValue({
        data: [
          {
            id: 'exp-1',
            item: 'Item with, comma',
            category: { name: 'Cat "Quote"' },
            vendor: null,
            status: 'OK',
            total_amount: 100,
            created_at: new Date('2026-09-23T00:00:00Z')
          }
        ]
      });
      const result = await service.exportExpenses(ctx, {}, 'csv');
      const csvString = result.buffer.toString('utf8');
      expect(csvString).toContain('"Item with, comma"');
      expect(csvString).toContain('"Cat ""Quote"""');
    });
  });

  describe('Export Limits', () => {
    it('should throw BadRequestException if limit exceeded', async () => {
      reportsService.getExpensesReport.mockResolvedValue({
        data: new Array(10001).fill({ id: 'exp', item: 'x' })
      });
      await expect(service.exportExpenses(ctx, {}, 'csv')).rejects.toThrow(BadRequestException);
    });
  });

  describe('XLSX Generation', () => {
    it('should correctly format numeric, text, formula, and date values securely via ExcelJS', async () => {
      const mockAddRow = jest.fn();
      const mockWorkbook = {
        addWorksheet: jest.fn().mockReturnValue({
          addRow: mockAddRow,
          getRow: jest.fn().mockReturnValue({ font: {} }),
          views: []
        }),
        xlsx: {
          writeBuffer: jest.fn().mockResolvedValue(Buffer.from('mocked buffer'))
        }
      };

      jest.doMock('exceljs', () => ({
        Workbook: jest.fn(() => mockWorkbook)
      }));

      // We need to re-require the service to ensure the dynamically loaded 'exceljs' utilizes the mock
      const LocalReportExportService = require('./report-export.service').ReportExportService;
      const localService = new LocalReportExportService(reportsService, auditService);

      const testDate = new Date('2026-09-23T00:00:00Z');
      
      // Simulate raw report returning an array of diverse data types
      reportsService.getExpensesReport.mockResolvedValue({
        data: [
          {
            id: 'exp-1',
            item: '=SUM(A1:A2)',          // Formula text
            category: { name: '+12345678901234567890' }, // Long identifier starting with +
            vendor: { name: '-1250' },    // Identifier that looks like negative number
            status: '001234',             // Identifier looking like leading-zero number
            total_amount: -1250,          // Genuine negative numeric value
            created_at: testDate          // Date object
          }
        ]
      });

      const result = await localService.exportExpenses(ctx, {}, 'xlsx');
      
      // The headers are written first
      expect(mockAddRow).toHaveBeenNthCalledWith(1, ['ID', 'Item', 'Category', 'Vendor', 'Status', 'Total Amount', 'Created At']);
      
      // Then the formatted data row
      expect(mockAddRow).toHaveBeenNthCalledWith(2, [
        'exp-1',
        "'=SUM(A1:A2)",
        "'+12345678901234567890",
        "'-1250",
        "001234",
        -1250, // Remains a native primitive number
        testDate // Remains a Date object
      ]);

      expect(result.buffer.toString()).toBe('mocked buffer');
      
      // Cleanup the doMock to not pollute other suites if necessary, though jest usually handles it
      jest.dontMock('exceljs');
    });
  });

  describe('Audit Logging', () => {
    it('should log audit event upon successful export', async () => {
      reportsService.getFinancialSummary.mockResolvedValue({
        budget_total: 1000, actual_expense_total: 2000, paid_to_vendors: 500, outstanding_vendor_amount: 1500, variance: 0
      });
      await service.exportFinancial(ctx, 'proj-1', undefined, undefined, 'csv');
      expect(auditService.logEvent).toHaveBeenCalledWith(ctx, {
        action: 'REPORT_EXPORT',
        entity_type: 'Report',
        entity_id: 'financial',
        metadata: { format: 'csv', recordCount: 1 }
      });
    });
  });
});
