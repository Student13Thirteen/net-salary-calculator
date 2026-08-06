import { describe, expect, it } from "vitest";
import {
  calculateNetSalary,
  calculateProgressiveTax,
  validateGrossSalary,
} from "../src/calculator";
import { TAX_CONFIG } from "../src/tax-config";

describe("validazione della RAL", () => {
  it("rifiuta valori mancanti, non positivi o oltre il perimetro", () => {
    expect(validateGrossSalary(Number.NaN)).toBe("Inserisci una RAL valida.");
    expect(validateGrossSalary(0)).toBe("La RAL deve essere maggiore di zero.");
    expect(validateGrossSalary(250_001)).toContain("€250.000");
    expect(() => calculateNetSalary(-1, 13)).toThrow(RangeError);
  });
});

describe("IRPEF progressiva 2026", () => {
  it("applica soltanto il 23% sotto il primo scaglione", () => {
    const result = calculateProgressiveTax(20_000, TAX_CONFIG.irpefBrackets);

    expect(result.total).toBe(4_600);
    expect(result.breakdown).toHaveLength(1);
  });

  it("tassa soltanto l'eccedenza al 33% passando al secondo scaglione", () => {
    const result = calculateProgressiveTax(30_000, TAX_CONFIG.irpefBrackets);

    expect(result.total).toBe(7_100);
    expect(result.breakdown.map((bracket) => bracket.taxableAmount)).toEqual([
      28_000, 2_000,
    ]);
  });
});

describe("stima completa del netto", () => {
  it("rispetta l'esenzione comunale fino a €23.000 di imponibile", () => {
    const exempt = calculateNetSalary(25_000, 13);
    const notExempt = calculateNetSalary(26_000, 13);

    expect(exempt.taxableIncome).toBeLessThanOrEqual(23_000);
    expect(exempt.municipalTax).toBe(0);
    expect(notExempt.taxableIncome).toBeGreaterThan(23_000);
    expect(notExempt.municipalTax).toBeGreaterThan(0);
  });

  it("verifica manualmente il caso medio da €35.000", () => {
    const result = calculateNetSalary(35_000, 13);

    expect(result.socialSecurityContributions).toBe(3_216.5);
    expect(result.taxableIncome).toBe(31_783.5);
    expect(result.grossIrpef).toBe(7_688.56);
    expect(result.employeeDeduction).toBe(1_646.48);
    expect(result.netIrpef).toBe(6_042.08);
    expect(result.regionalTax).toBe(454.98);
    expect(result.municipalTax).toBe(254.27);
    expect(result.annualNetSalary).toBe(25_032.17);
  });

  it("verifica manualmente il caso elevato da €80.000", () => {
    const result = calculateNetSalary(80_000, 13);

    expect(result.socialSecurityContributions).toBe(7_589.76);
    expect(result.taxableIncome).toBe(72_410.24);
    expect(result.grossIrpef).toBe(23_336.4);
    expect(result.employeeDeduction).toBe(0);
    expect(result.regionalTax).toBe(1_156);
    expect(result.municipalTax).toBe(579.28);
    expect(result.annualNetSalary).toBe(47_338.56);
  });

  it.each([12, 13, 14] as const)(
    "mantiene invarianti annuale e controlli di coerenza con %i mensilità",
    (monthlyPayments) => {
      const result = calculateNetSalary(50_000, monthlyPayments);

      expect(result.annualNetSalary).toBeLessThan(result.grossAnnualSalary);
      expect(result.socialSecurityContributions).toBeGreaterThanOrEqual(0);
      expect(result.totalTaxes).toBeGreaterThanOrEqual(0);
      expect(
        result.annualNetSalary +
          result.socialSecurityContributions +
          result.totalTaxes,
      ).toBeCloseTo(result.grossAnnualSalary, 2);
      expect(result.averageNetPerPayment).toBeCloseTo(
        result.annualNetSalary / monthlyPayments,
        2,
      );
    },
  );

  it("il netto annuale non cambia tra 12, 13 e 14 mensilità", () => {
    const annualNets = ([12, 13, 14] as const).map(
      (monthlyPayments) =>
        calculateNetSalary(42_000, monthlyPayments).annualNetSalary,
    );

    expect(new Set(annualNets).size).toBe(1);
  });
});
