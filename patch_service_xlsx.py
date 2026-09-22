import os

service_file = r"apps\api\src\modules\reports\report-export.service.ts"

with open(service_file, "r") as f:
    content = f.read()

old_xlsx = """  private async generateXlsx(headers: string[], rows: any[][]): Promise<Buffer> {
    let ExcelJS;
    try {
      ExcelJS = require('exceljs');
    } catch (e) {
      throw new NotImplementedException('XLSX format generation pending exceljs dependency installation (blocked by environment limit).');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Export');

    worksheet.addRow(headers);
    for (const row of rows) {
      const formattedRow = row.map(val => {
        if (typeof val === 'string' && /^[=+\-@]/.test(val) && isNaN(Number(val))) {
          // In exceljs, we just write the string with a single quote prefix so Excel interprets it as text
          return `'${val}`;
        }
        return val;
      });
      worksheet.addRow(formattedRow);
    }

    return await workbook.xlsx.writeBuffer() as Buffer;
  }"""

new_xlsx = """  private async generateXlsx(headers: string[], rows: any[][]): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ExcelJS = require('exceljs');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Export');

    // Add headers and style them
    worksheet.addRow(headers);
    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    for (const row of rows) {
      const formattedRow = row.map(val => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'number') return val; // Genuine numeric values remain Excel numerics
        if (val instanceof Date) return val; // Genuine dates remain Excel dates

        const str = String(val);
        // Formula injection mitigation for text fields
        if (/^[=+\-@]/.test(str)) {
          if (!isNaN(Number(str))) {
            return Number(str); // e.g., "-1250" should be an Excel numeric, not text
          }
          // Prepend a single quote so Excel interprets it strictly as text, neutralizing formulas
          return `'${str}`;
        }
        return str;
      });
      worksheet.addRow(formattedRow);
    }

    return await workbook.xlsx.writeBuffer() as Buffer;
  }"""

if old_xlsx in content:
    content = content.replace(old_xlsx, new_xlsx)
    with open(service_file, "w") as f:
        f.write(content)
    print("Patched report-export.service.ts")
else:
    print("Could not find old_xlsx in report-export.service.ts")
