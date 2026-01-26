
import ExcelJS from 'exceljs';
import { Policy, ReinsuranceSlip } from '../types';

// Colors based on Tailwind classes used in Dashboard
const COLORS = {
  headerGray: 'FFEEEFEF', // gray-200
  blue: 'FFEFF6FF', // blue-50
  green: 'FFF0FDF4', // green-50
  amber: 'FFFFFBEB', // amber-50
  purple: 'FFFAF5FF', // purple-50
  white: 'FFFFFFFF',
  border: 'FFD1D5DB' // gray-300
};

const BORDER_STYLE: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLORS.border } },
  left: { style: 'thin', color: { argb: COLORS.border } },
  bottom: { style: 'thin', color: { argb: COLORS.border } },
  right: { style: 'thin', color: { argb: COLORS.border } }
};

interface ColumnDef {
  header: string;
  key: string;
  width: number;
  fill?: string;
  format?: string;
  align?: 'left' | 'center' | 'right';
}

const saveWorkbook = async (workbook: ExcelJS.Workbook, fileName: string) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

export const ExcelService = {
  exportSlips: async (slips: ReinsuranceSlip[]) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reinsurance Slips');

    const columns: ColumnDef[] = [
      { header: 'Slip Number', key: 'slipNumber', width: 25 },
      { header: 'Date', key: 'date', width: 15, align: 'center', format: 'dd.mm.yyyy' },
      { header: 'Insured', key: 'insuredName', width: 30 },
      { header: 'Broker / Reinsurer', key: 'brokerReinsurer', width: 30 },
    ];

    setupSheet(sheet, columns);

    slips.forEach(slip => {
      const row = sheet.addRow(slip);
      styleRow(row, columns);
    });

    await saveWorkbook(workbook, 'Reinsurance_Slips_Registry.xlsx');
  },

  exportPolicies: async (policies: Policy[]) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Policy_Register`);

    const columns: ColumnDef[] = [
        // Identifiers
        { header: 'Channel', key: 'channel', width: 15, fill: COLORS.headerGray },
        { header: 'Ref No', key: 'policyNumber', width: 20 },
        { header: 'Secondary Ref', key: 'secondaryPolicyNumber', width: 20 },
        { header: 'Agreement No', key: 'agreementNumber', width: 20 },
        { header: 'Bordereau No', key: 'bordereauNo', width: 15 },
        { header: 'Status', key: 'status', width: 15 },

        // Dates (Formatted as dd.mm.yyyy)
        { header: 'Inception', key: 'inceptionDate', width: 15, align: 'center', format: 'dd.mm.yyyy' },
        { header: 'Expiry', key: 'expiryDate', width: 15, align: 'center', format: 'dd.mm.yyyy' },
        { header: 'Date of Slip', key: 'dateOfSlip', width: 15, align: 'center', format: 'dd.mm.yyyy' },
        { header: 'Accounting Date', key: 'accountingDate', width: 15, align: 'center', format: 'dd.mm.yyyy' },
        { header: 'Payment Date', key: 'paymentDate', width: 15, align: 'center', format: 'dd.mm.yyyy' },
        { header: 'Warranty (Days)', key: 'warrantyPeriod', width: 10 },

        // Parties
        { header: 'Insured Name', key: 'insuredName', width: 30 },
        { header: 'Insured Address', key: 'insuredAddress', width: 30 },
        { header: 'Cedant', key: 'cedantName', width: 25 },
        { header: 'Intermediary Type', key: 'intermediaryType', width: 15 },
        { header: 'Intermediary Name', key: 'intermediaryName', width: 25 },
        { header: 'Borrower', key: 'borrower', width: 20 },
        { header: 'Retrocedent', key: 'retrocedent', width: 20 },
        { header: 'Performer', key: 'performer', width: 20 },
        
        // Risk
        { header: 'Class', key: 'classOfInsurance', width: 15 },
        { header: 'Risk Code', key: 'riskCode', width: 10 },
        { header: 'Territory', key: 'territory', width: 15 },
        { header: 'City', key: 'city', width: 15 },
        { header: 'Insured Risk', key: 'insuredRisk', width: 30 },
        
        // Financials
        { header: 'Currency', key: 'currency', width: 8, align: 'center' },
        { header: 'Sum Insured', key: 'sumInsured', width: 20, fill: COLORS.blue, format: '#,##0.00' },
        { header: 'Sum Insured (Nat)', key: 'sumInsuredNational', width: 20, fill: COLORS.blue, format: '#,##0.00' },
        { header: 'Gross Premium', key: 'grossPremium', width: 20, fill: COLORS.green, format: '#,##0.00' },
        { header: 'Premium (Nat)', key: 'premiumNationalCurrency', width: 20, fill: COLORS.green, format: '#,##0.00' },
        { header: 'Exchange Rate', key: 'exchangeRate', width: 12, format: '0.00' },
        { header: 'Equivalent USD', key: 'equivalentUSD', width: 18, format: '#,##0.00' },
        
        // Limits
        { header: 'Limit (FC)', key: 'limitForeignCurrency', width: 18, format: '#,##0.00' },
        { header: 'Excess (FC)', key: 'excessForeignCurrency', width: 18, format: '#,##0.00' },
        
        // Our Share
        { header: 'Our Share %', key: 'ourShare', width: 12, format: '0.00' },
        { header: 'Net Premium', key: 'netPremium', width: 18, format: '#,##0.00' },
        { header: 'Commission %', key: 'commissionPercent', width: 12, format: '0.00' },
        
        // Outward Details
        { header: 'Reinsured Out?', key: 'hasOutwardReinsurance', width: 12 },
        { header: 'Reinsurer', key: 'reinsurerName', width: 25, fill: COLORS.amber },
        { header: 'Ceded Share %', key: 'cededShare', width: 12, fill: COLORS.amber, format: '0.00' },
        { header: 'Ceded Prem (FC)', key: 'cededPremiumForeign', width: 18, fill: COLORS.amber, format: '#,##0.00' },
        { header: 'Reins Comm %', key: 'reinsuranceCommission', width: 12, fill: COLORS.amber, format: '0.00' },
        { header: 'Net Payable', key: 'netReinsurancePremium', width: 18, fill: COLORS.amber, format: '#,##0.00' },
        
        // Treaty / Inward
        { header: 'Treaty Placement', key: 'treatyPlacement', width: 20 },
        { header: 'Treaty Prem', key: 'treatyPremium', width: 18, format: '#,##0.00' },
        { header: 'AIC Commission', key: 'aicCommission', width: 18, format: '#,##0.00' },
      ];

    setupSheet(sheet, columns);

    policies.forEach(policy => {
        const rowData: any = { ...policy };
        // Pre-process for better display
        if (rowData.hasOutwardReinsurance) {
            rowData.hasOutwardReinsurance = 'Yes';
        } else {
            rowData.hasOutwardReinsurance = 'No';
            rowData.cededShare = 0;
            rowData.reinsurerName = '-';
            rowData.cededPremiumForeign = 0;
        }

        const row = sheet.addRow(rowData);
        styleRow(row, columns);
    });

    await saveWorkbook(workbook, `InsurTech_Full_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
};

function setupSheet(sheet: ExcelJS.Worksheet, columns: ColumnDef[]) {
  sheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width
  }));

  // Style Header
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.height = 25;
  
  headerRow.eachCell((cell, colNumber) => {
    const colDef = columns[colNumber - 1];
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colDef.fill || COLORS.headerGray }
    };
    cell.border = BORDER_STYLE;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
}

function styleRow(row: ExcelJS.Row, columns: ColumnDef[]) {
  row.eachCell((cell, colNumber) => {
    const colDef = columns[colNumber - 1];
    cell.border = BORDER_STYLE;
    
    if (colDef.fill) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colDef.fill } 
      };
    }

    if (colDef.format) {
      cell.numFmt = colDef.format;
    }
    
    if (colDef.align) {
        cell.alignment = { horizontal: colDef.align };
    }
  });
}
