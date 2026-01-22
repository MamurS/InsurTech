import ExcelJS from 'exceljs';
import { Policy, ReinsuranceSlip, RecordType, Currency } from '../types';

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
      { header: 'Date', key: 'date', width: 15, align: 'center' },
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

  exportPolicies: async (policies: Policy[], type: RecordType) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`${type} Policies`);

    let columns: ColumnDef[] = [];

    if (type === 'Direct') {
      columns = [
        { header: 'Insured', key: 'insuredName', width: 30 },
        { header: 'Industry', key: 'industry', width: 20 },
        { header: 'Broker', key: 'brokerName', width: 20 },
        { header: 'Policy No', key: 'policyNumber', width: 25 },
        { header: 'Acc Date', key: 'accountingDate', width: 15, align: 'center' },
        { header: 'Class', key: 'classOfInsurance', width: 10, align: 'center' },
        { header: 'Type', key: 'typeOfInsurance', width: 15 },
        { header: 'Policy #', key: 'secondaryPolicyNumber', width: 15 },
        { header: 'Code', key: 'riskCode', width: 10, align: 'center' },
        { header: 'Country', key: 'territory', width: 15 },
        { header: 'City', key: 'city', width: 15 },
        { header: 'Curr', key: 'currency', width: 8, align: 'center' },
        { header: 'Exch Rate', key: 'exchangeRate', width: 12, format: '#,##0.00' },
        
        { header: 'Sum Insured (FC)', key: 'sumInsured', width: 20, fill: COLORS.blue, format: '#,##0.00' },
        { header: 'Sum Insured (Sums)', key: 'sumInsuredNational', width: 20, fill: COLORS.blue, format: '#,##0.00' },
        { header: 'Rate %', key: 'premiumRate', width: 10, format: '0.000%' },
        { header: 'Prem (FC)', key: 'grossPremium', width: 15, fill: COLORS.green, format: '#,##0.00' },
        { header: 'Prem (Sums)', key: 'premiumNationalCurrency', width: 20, fill: COLORS.green, format: '#,##0.00' },
        
        { header: 'Inception', key: 'inceptionDate', width: 15, align: 'center' },
        { header: 'Expiry', key: 'expiryDate', width: 15, align: 'center' },
        { header: 'Warranty', key: 'warrantyPeriod', width: 10, align: 'center' },
        
        { header: 'Paid (FC)', key: 'receivedPremiumForeign', width: 15, fill: COLORS.amber, format: '#,##0.00' },
        { header: 'Paid (Sums)', key: 'receivedPremiumNational', width: 20, fill: COLORS.amber, format: '#,##0.00' },
        { header: 'Pay Date', key: 'paymentDate', width: 15, fill: COLORS.amber, align: 'center' },
      ];
    } else if (type === 'Inward') {
      columns = [
        { header: 'Insured', key: 'insuredName', width: 25 },
        { header: 'Borrower', key: 'borrower', width: 20 },
        { header: 'Broker', key: 'brokerName', width: 15 },
        { header: 'Cedent', key: 'cedantName', width: 20, fill: COLORS.purple },
        { header: 'Retrocedent', key: 'retrocedent', width: 15 },
        { header: 'Slip No', key: 'slipNumber', width: 15 },
        { header: 'Ref', key: 'policyNumber', width: 20 },
        { header: 'Date Slip', key: 'dateOfSlip', width: 12 },
        { header: 'Acc Date', key: 'accountingDate', width: 12 },
        { header: 'Type', key: 'typeOfInsurance', width: 10 },
        { header: 'Class', key: 'classOfInsurance', width: 10 },
        { header: 'Risk', key: 'insuredRisk', width: 20 },
        { header: 'Industry', key: 'industry', width: 15 },
        { header: 'Territory', key: 'territory', width: 15 },
        { header: 'Agrmt No', key: 'agreementNumber', width: 15 },
        { header: 'Curr', key: 'currency', width: 8 },
        
        { header: 'Sum Insured (FC)', key: 'sumInsured', width: 18, fill: COLORS.blue, format: '#,##0.00' },
        { header: 'Inception', key: 'inceptionDate', width: 12 },
        { header: 'Expiry', key: 'expiryDate', width: 12 },
        { header: 'Limit (FC)', key: 'limitForeignCurrency', width: 15, format: '#,##0.00' },
        { header: 'Excess (FC)', key: 'excessForeignCurrency', width: 15, format: '#,##0.00' },
        
        { header: 'Gross Prem (FC)', key: 'grossPremium', width: 15, fill: COLORS.green, format: '#,##0.00' },
        { header: 'MIG %', key: 'ourShare', width: 8, format: '0.00%' },
        { header: 'Sum Reins (FC)', key: 'sumReinsuredForeign', width: 15, format: '#,##0.00' },
        { header: 'Comm %', key: 'reinsuranceCommission', width: 8, format: '0.00%' },
        { header: 'Net Prem', key: 'netReinsurancePremium', width: 15, format: '#,##0.00' },
        
        { header: 'Received', key: 'receivedPremiumForeign', width: 15, format: '#,##0.00' },
        { header: 'Pay Date', key: 'paymentDate', width: 12 },
        { header: 'Treaty', key: 'treatyPlacement', width: 15, fill: COLORS.amber },
        { header: 'AIC Prem', key: 'aicPremium', width: 15, fill: COLORS.amber, format: '#,##0.00' },
      ];
    } else {
        // Outward
        columns = [
            { header: 'Reinsurer', key: 'reinsurerName', width: 25 },
            { header: 'Broker', key: 'brokerName', width: 20 },
            { header: 'Our Ref', key: 'policyNumber', width: 25 },
            { header: 'Reins Slip No', key: 'slipNumber', width: 20, fill: COLORS.amber },
            { header: 'Insured', key: 'insuredName', width: 25 },
            { header: 'Class', key: 'classOfInsurance', width: 15 },
            { header: 'Type', key: 'typeOfInsurance', width: 15 },
            { header: 'Territory', key: 'territory', width: 15 },
            { header: 'Inception', key: 'inceptionDate', width: 12 },
            { header: 'Expiry', key: 'expiryDate', width: 12 },
            
            { header: 'Sum Insured 100%', key: 'sumInsured', width: 20, fill: COLORS.blue, format: '#,##0.00' },
            { header: 'Gross Prem 100%', key: 'grossPremium', width: 20, fill: COLORS.green, format: '#,##0.00' },
            
            { header: 'Ceded %', key: 'ourShare', width: 10, fill: COLORS.amber, format: '0.00%' },
            { header: 'Sum Reins', key: 'sumReinsuredForeign', width: 20, fill: COLORS.amber, format: '#,##0.00' },
            { header: 'Prem Ceded', key: 'cededPremiumForeign', width: 20, fill: COLORS.amber, format: '#,##0.00' },
            
            { header: 'Comm %', key: 'reinsuranceCommission', width: 10, format: '0.00%' },
            { header: 'Net Due', key: 'netReinsurancePremium', width: 20, format: '#,##0.00' },
            
            { header: 'Payment', key: 'paymentStatus', width: 12 },
            { header: 'Rating', key: 'reinsurerRating', width: 10 },
        ];
    }

    setupSheet(sheet, columns);

    policies.forEach(policy => {
        const rowData: any = { ...policy };
        // Pre-process percentages for Excel (e.g. 50 -> 0.5 for % format)
        // Actually, the app stores them as whole numbers (e.g. 50 for 50%).
        // Excel percentage format expects 0.5.
        // We will adjust the values for specific percentage keys if we use percentage format.
        // For simplicity, we'll keep numbers as is and remove '%' from format or divide by 100.
        // Let's divide by 100 for proper excel percent formatting
        if (rowData.premiumRate) rowData.premiumRate = rowData.premiumRate / 100;
        if (rowData.ourShare) rowData.ourShare = rowData.ourShare / 100;
        if (rowData.reinsuranceCommission) rowData.reinsuranceCommission = rowData.reinsuranceCommission / 100;
        if (rowData.aicCommission) rowData.aicCommission = rowData.aicCommission / 100;

        const row = sheet.addRow(rowData);
        styleRow(row, columns);
    });

    await saveWorkbook(workbook, `${type}_Policies_Export.xlsx`);
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
        fgColor: { argb: colDef.fill } // Light tint for body cells?
        // Using the same color might be too dark if it matches the header.
        // For now, let's keep body white or very faint.
        // Actually the requested design implies column-wide coloring. 
        // We will apply a lighter version of the header color or just transparency.
        // Let's modify the alpha of the definition color? 
        // Hex is ARGB. 
        // Let's keep it simple: Only color headers for column grouping indication, 
        // OR color the cells lightly.
        // Let's color the cells lightly using the defined colors (they are already light 50-shade colors).
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
