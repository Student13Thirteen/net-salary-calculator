import {
  SUPPORTED_MONTHLY_PAYMENTS,
  TAX_CONFIG,
  type MonthlyPayments,
  type OpenTaxBracket,
} from "./tax-config";

export interface AppliedTaxBracket {
  readonly lowerBound: number;
  readonly upperBound: number | null;
  readonly rate: number;
  readonly taxableAmount: number;
  readonly tax: number;
}

export interface SalaryCalculation {
  readonly grossAnnualSalary: number;
  readonly monthlyPayments: MonthlyPayments;
  readonly socialSecurityContributions: number;
  readonly taxableIncome: number;
  readonly grossIrpef: number;
  readonly employeeDeduction: number;
  readonly netIrpef: number;
  readonly regionalTax: number;
  readonly municipalTax: number;
  readonly totalTaxes: number;
  readonly totalWithholdings: number;
  readonly annualNetSalary: number;
  readonly averageNetPerPayment: number;
  readonly irpefBreakdown: readonly AppliedTaxBracket[];
}

const roundToCents = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const truncateToFourDecimals = (value: number): number =>
  Math.trunc(value * 10_000) / 10_000;

export const isSupportedMonthlyPayments = (
  value: number,
): value is MonthlyPayments =>
  SUPPORTED_MONTHLY_PAYMENTS.some((option) => option === value);

export function validateGrossSalary(value: number): string | null {
  if (!Number.isFinite(value)) {
    return "Inserisci una RAL valida.";
  }

  if (value < TAX_CONFIG.minimumGrossSalary) {
    return "La RAL deve essere maggiore di zero.";
  }

  if (value > TAX_CONFIG.maximumGrossSalary) {
    return "Per questa stima inserisci una RAL non superiore a €250.000.";
  }

  return null;
}

export function calculateProgressiveTax(
  taxableIncome: number,
  brackets: readonly OpenTaxBracket[],
): { readonly total: number; readonly breakdown: readonly AppliedTaxBracket[] } {
  let lowerBound = 0;
  let remainingIncome = Math.max(0, taxableIncome);
  const breakdown: AppliedTaxBracket[] = [];

  for (const bracket of brackets) {
    const bracketWidth =
      bracket.upTo === null ? remainingIncome : bracket.upTo - lowerBound;
    const taxableAmount = Math.min(remainingIncome, bracketWidth);

    if (taxableAmount > 0) {
      breakdown.push({
        lowerBound,
        upperBound: bracket.upTo,
        rate: bracket.rate,
        taxableAmount: roundToCents(taxableAmount),
        tax: roundToCents(taxableAmount * bracket.rate),
      });
    }

    remainingIncome -= taxableAmount;

    if (remainingIncome <= 0 || bracket.upTo === null) {
      break;
    }

    lowerBound = bracket.upTo;
  }

  return {
    total: roundToCents(
      breakdown.reduce((sum, bracket) => sum + bracket.tax, 0),
    ),
    breakdown,
  };
}

export function calculateSocialSecurityContributions(
  grossAnnualSalary: number,
): number {
  const { employeeRate, additionalRate, additionalRateThreshold } =
    TAX_CONFIG.socialSecurity;
  const ordinaryContribution = grossAnnualSalary * employeeRate;
  const additionalContribution =
    Math.max(0, grossAnnualSalary - additionalRateThreshold) * additionalRate;

  return roundToCents(ordinaryContribution + additionalContribution);
}

export function calculateEmployeeDeduction(taxableIncome: number): number {
  const config = TAX_CONFIG.employeeDeduction;
  let deduction = 0;

  if (taxableIncome <= config.firstThreshold) {
    deduction = config.firstAmount;
  } else if (taxableIncome <= config.secondThreshold) {
    const quotient = truncateToFourDecimals(
      (config.secondThreshold - taxableIncome) /
        (config.secondThreshold - config.firstThreshold),
    );
    deduction = config.baseAmount + config.variableAmount * quotient;
  } else if (taxableIncome <= config.lastThreshold) {
    const quotient = truncateToFourDecimals(
      (config.lastThreshold - taxableIncome) /
        (config.lastThreshold - config.secondThreshold),
    );
    deduction = config.baseAmount * quotient;
  }

  if (
    taxableIncome > config.middleBonusFrom &&
    taxableIncome <= config.middleBonusTo
  ) {
    deduction += config.middleBonus;
  }

  return roundToCents(Math.max(0, deduction));
}

export function calculateNetSalary(
  grossAnnualSalary: number,
  monthlyPayments: MonthlyPayments,
): SalaryCalculation {
  const validationError = validateGrossSalary(grossAnnualSalary);

  if (validationError !== null) {
    throw new RangeError(validationError);
  }

  if (!isSupportedMonthlyPayments(monthlyPayments)) {
    throw new RangeError("Il numero di mensilità deve essere 12, 13 o 14.");
  }

  const socialSecurityContributions =
    calculateSocialSecurityContributions(grossAnnualSalary);
  const taxableIncome = roundToCents(
    grossAnnualSalary - socialSecurityContributions,
  );
  const irpef = calculateProgressiveTax(
    taxableIncome,
    TAX_CONFIG.irpefBrackets,
  );
  const employeeDeduction = calculateEmployeeDeduction(taxableIncome);
  const netIrpef = roundToCents(
    Math.max(0, irpef.total - employeeDeduction),
  );
  const isIrpefDue = netIrpef > 0;
  const regionalTax = isIrpefDue
    ? calculateProgressiveTax(
        taxableIncome,
        TAX_CONFIG.lombardyRegionalBrackets,
      ).total
    : 0;
  const municipalTax =
    isIrpefDue &&
    taxableIncome > TAX_CONFIG.milanMunicipalTax.exemptionThreshold
      ? roundToCents(taxableIncome * TAX_CONFIG.milanMunicipalTax.rate)
      : 0;
  const totalTaxes = roundToCents(netIrpef + regionalTax + municipalTax);
  const totalWithholdings = roundToCents(
    socialSecurityContributions + totalTaxes,
  );
  const annualNetSalary = roundToCents(
    grossAnnualSalary - totalWithholdings,
  );

  return {
    grossAnnualSalary: roundToCents(grossAnnualSalary),
    monthlyPayments,
    socialSecurityContributions,
    taxableIncome,
    grossIrpef: irpef.total,
    employeeDeduction,
    netIrpef,
    regionalTax,
    municipalTax,
    totalTaxes,
    totalWithholdings,
    annualNetSalary,
    averageNetPerPayment: roundToCents(annualNetSalary / monthlyPayments),
    irpefBreakdown: irpef.breakdown,
  };
}
