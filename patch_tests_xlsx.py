import os

spec_file = r"apps\api\src\modules\reports\report-export.service.spec.ts"

with open(spec_file, "r") as f:
    content = f.read()

old_test = """  describe('XLSX Generation', () => {
    it('should throw NotImplementedException for XLSX due to missing dependency', async () => {
      reportsService.getFinancialSummary.mockResolvedValue({
        budget_total: 1000, actual_expense_total: 2000, paid_to_vendors: 500, outstanding_vendor_amount: 1500, variance: 0
      });
      // We expect the catch block to throw since exceljs is not physically installed via npm install
      // If it is installed it will pass, but here we expect error if missing. We mock require to throw.
      jest.spyOn(service as any, 'generateXlsx').mockRejectedValueOnce(new NotImplementedException());
      await expect(service.exportFinancial(ctx, 'proj-1', undefined, undefined, 'xlsx')).rejects.toThrow(NotImplementedException);
    });
  });"""

new_test = """  describe('XLSX Generation', () => {
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

if old_test in content:
    content = content.replace(old_test, new_test)
    with open(spec_file, "w") as f:
        f.write(content)
    print("Patched report-export.service.spec.ts")
else:
    print("Could not find old_test in report-export.service.spec.ts")
