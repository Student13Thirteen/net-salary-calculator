export interface TaxBracket {
  readonly upTo: number;
  readonly rate: number;
}

export interface OpenTaxBracket {
  readonly upTo: number | null;
  readonly rate: number;
}

/** Configurazione della stima per il periodo d'imposta 2026. */
export const TAX_CONFIG = {
  taxYear: 2026,
  minimumGrossSalary: 1,
  maximumGrossSalary: 250_000,
  socialSecurity: {
    employeeRate: 0.0919,
    additionalRate: 0.01,
    additionalRateThreshold: 56_224,
  },
  irpefBrackets: [
    { upTo: 28_000, rate: 0.23 },
    { upTo: 50_000, rate: 0.33 },
    { upTo: null, rate: 0.43 },
  ] satisfies readonly OpenTaxBracket[],
  employeeDeduction: {
    firstThreshold: 15_000,
    secondThreshold: 28_000,
    lastThreshold: 50_000,
    firstAmount: 1_955,
    baseAmount: 1_910,
    variableAmount: 1_190,
    middleBonus: 65,
    middleBonusFrom: 25_000,
    middleBonusTo: 35_000,
  },
  lombardyRegionalBrackets: [
    { upTo: 15_000, rate: 0.0123 },
    { upTo: 28_000, rate: 0.0158 },
    { upTo: 50_000, rate: 0.0172 },
    { upTo: null, rate: 0.0173 },
  ] satisfies readonly OpenTaxBracket[],
  milanMunicipalTax: {
    exemptionThreshold: 23_000,
    rate: 0.008,
  },
} as const;

export const SUPPORTED_MONTHLY_PAYMENTS = [12, 13, 14] as const;

export type MonthlyPayments = (typeof SUPPORTED_MONTHLY_PAYMENTS)[number];
