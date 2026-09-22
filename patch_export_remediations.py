import os

service_file = r"apps\api\src\modules\reports\report-export.service.ts"
spec_file = r"apps\api\src\modules\reports\report-export.service.spec.ts"

# 1. Update report-export.service.ts
with open(service_file, "r") as f:
    content = f.read()

old_service_xlsx = """        // Formula injection mitigation for text fields
        if (/^[=+\-@]/.test(str)) {
          if (!isNaN(Number(str))) {
            return Number(str); // e.g., "-1250" should be an Excel numeric, not text
          }
          // Prepend a single quote so Excel interprets it strictly as text, neutralizing formulas
          return `'${str}`;
        }
        return str;"""

new_service_xlsx = """        // Formula injection mitigation for text fields
        if (/^[=+\-@]/.test(str)) {
          // Prepend a single quote so Excel interprets it strictly as text, neutralizing formulas
          // Genuine primitive numbers were already returned above. We do not coerce string identifiers into numbers.
          return `'${str}`;
        }
        return str;"""

if old_service_xlsx in content:
    content = content.replace(old_service_xlsx, new_service_xlsx)
    with open(service_file, "w") as f:
        f.write(content)
    print("Patched report-export.service.ts")
else:
    print("Could not find old_service_xlsx in report-export.service.ts")

# 2. Update report-export.service.spec.ts
with open(spec_file, "r") as f:
    spec_content = f.read()

old_test_block = """  describe('XLSX Generation', () => {
    it('should generate XLSX successfully with genuine numeric logic', async () => {
      reportsService.getFinancialSummary.mockResolvedValue({
        budget_total: 1000, actual_expense_total: 2000, paid_to_vendors: 500, outstanding_vendor_amount: 1500, variance: -1250
      });

      // We bypass the dynamic require by mocking the method so we can observe the input structure
      const generateSpy = jest.spyOn(service as any, 'generateXlsx').mockResolvedValue(Buffer.from('mock xlsx'));
      const result = await service.exportFinancial(ctx, 'proj-1', undefined, undefined, 'xlsx');
      
      expect(generateSpy).toHaveBeenCalledWith(
        ['Budget Total', 'Actual Expense Total', 'Paid To Vendors', 'Outstanding Vendor Amount', 'Variance'],
        [[1000, 2000, 500, 1500, -1250]]
      );
      
      expect(result.buffer.toString()).toBe('mock xlsx');
    });
  });"""

new_test_block = """  describe('XLSX Generation', () => {
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
  });"""

if old_test_block in spec_content:
    spec_content = spec_content.replace(old_test_block, new_test_block)
    with open(spec_file, "w") as f:
        f.write(spec_content)
    print("Patched report-export.service.spec.ts")
else:
    print("Could not find old_test_block in report-export.service.spec.ts")
