// services/cbuService.ts
// Central Bank of Uzbekistan Exchange Rate API Integration

import { Currency, ExchangeRate } from '../types';
import { DB } from './db';

const CBU_API_URL = 'https://cbu.uz/uz/arkhiv-kursov-valyut/json/';

// Map CBU currency codes to our Currency enum
const CURRENCY_MAP: Record<string, Currency> = {
  'USD': Currency.USD,
  'EUR': Currency.EUR,
  'GBP': Currency.GBP,
  'RUB': Currency.RUB,
  'CNY': Currency.CNY,
  'JPY': Currency.JPY,
  'CHF': Currency.CHF,
  'KZT': Currency.KZT,
  'TRY': Currency.TRY,
  'AED': Currency.AED,
  'CAD': Currency.CAD,
  'AUD': Currency.AUD,
  'KRW': Currency.KRW,
  'INR': Currency.INR,
};

interface CBURateResponse {
  id: number;
  Code: string;
  Ccy: string;
  CcyNm_RU: string;
  CcyNm_UZ: string;
  CcyNm_UZC: string;
  CcyNm_EN: string;
  Nominal: string;
  Rate: string;
  Diff: string;
  Date: string;
}

export const CBUService = {
  /**
   * Fetch rates from CBU API (optionally for a specific date)
   * @param date - Optional date in YYYY-MM-DD format. If not provided, fetches current rates.
   */
  fetchRates: async (date?: string): Promise<CBURateResponse[]> => {
    // CBU API format: /json/ for current, /json/all/YYYY-MM-DD/ for historical
    const url = date
      ? `https://cbu.uz/uz/arkhiv-kursov-valyut/json/all/${date}/`
      : CBU_API_URL;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`CBU API error: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Parse CBU date format (DD.MM.YYYY) to ISO string
   */
  parseDate: (cbuDate: string): string => {
    const [day, month, year] = cbuDate.split('.');
    return `${year}-${month}-${day}`;
  },

  /**
   * Calculate effective rate (handles Nominal > 1)
   * e.g., if Nominal=10 and Rate=76.31, effective rate per 1 unit = 7.631
   */
  calculateEffectiveRate: (rate: string, nominal: string): number => {
    const rateNum = parseFloat(rate);
    const nominalNum = parseInt(nominal, 10) || 1;
    return rateNum / nominalNum;
  },

  /**
   * Sync rates from CBU to local database
   * @param date - Optional date in YYYY-MM-DD format. If not provided, syncs current rates.
   * Returns count of updated rates
   */
  syncRates: async (date?: string): Promise<{ updated: number; date: string }> => {
    const cbuRates = await CBUService.fetchRates(date);
    let updated = 0;
    let rateDate = '';

    for (const cbuRate of cbuRates) {
      const currency = CURRENCY_MAP[cbuRate.Ccy];
      if (!currency) continue; // Skip currencies we don't track

      const effectiveRate = CBUService.calculateEffectiveRate(cbuRate.Rate, cbuRate.Nominal);
      const parsedDate = CBUService.parseDate(cbuRate.Date);
      rateDate = parsedDate;

      const exchangeRate: ExchangeRate = {
        id: `cbu_${cbuRate.Ccy}_${parsedDate}`,
        currency,
        rate: effectiveRate,
        date: parsedDate,
      };

      await DB.saveExchangeRate(exchangeRate);
      updated++;
    }

    return { updated, date: rateDate };
  },

  /**
   * Get a specific currency rate from CBU (fresh fetch)
   * @param currency - The currency to get rate for
   * @param date - Optional date in YYYY-MM-DD format
   */
  getRate: async (currency: Currency, date?: string): Promise<number | null> => {
    const cbuRates = await CBUService.fetchRates(date);
    const cbuCode = Object.entries(CURRENCY_MAP).find(([_, v]) => v === currency)?.[0];

    if (!cbuCode) return null;

    const rate = cbuRates.find(r => r.Ccy === cbuCode);
    if (!rate) return null;

    return CBUService.calculateEffectiveRate(rate.Rate, rate.Nominal);
  },

  /**
   * Get all rates with full details from CBU (for display)
   * @param date - Optional date in YYYY-MM-DD format
   */
  fetchRatesWithDetails: async (date?: string): Promise<Array<{
    currency: Currency;
    code: string;
    name: string;
    rate: number;
    nominal: number;
    rawRate: number;
    diff: number;
    date: string;
  }>> => {
    const cbuRates = await CBUService.fetchRates(date);
    const result = [];

    for (const cbuRate of cbuRates) {
      const currency = CURRENCY_MAP[cbuRate.Ccy];
      if (!currency) continue;

      result.push({
        currency,
        code: cbuRate.Ccy,
        name: cbuRate.CcyNm_EN,
        rate: CBUService.calculateEffectiveRate(cbuRate.Rate, cbuRate.Nominal),
        nominal: parseInt(cbuRate.Nominal, 10) || 1,
        rawRate: parseFloat(cbuRate.Rate),
        diff: parseFloat(cbuRate.Diff),
        date: CBUService.parseDate(cbuRate.Date),
      });
    }

    return result;
  },
};
