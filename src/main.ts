import "@fontsource/wix-madefor-display/latin-400.css";
import "@fontsource/wix-madefor-display/latin-500.css";
import "@fontsource/wix-madefor-display/latin-600.css";
import "@fontsource/wix-madefor-display/latin-700.css";
import "@fontsource/wix-madefor-display/latin-800.css";
import "./styles.css";
import {
  calculateNetSalary,
  isSupportedMonthlyPayments,
  validateGrossSalary,
  type SalaryCalculation,
} from "./calculator";
import { DEFAULT_LOCATION_PROFILE } from "./location-profiles";

const currencyFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const inputCurrencyFormatter = new Intl.NumberFormat("it-IT", {
  maximumFractionDigits: 2,
});

const percentageFormatter = new Intl.NumberFormat("it-IT", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function getElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`Elemento non trovato: ${selector}`);
  }

  return element;
}

function parseItalianCurrency(value: string): number {
  const cleaned = value.replace(/[€\s]/g, "");

  if (cleaned === "") {
    return Number.NaN;
  }

  if (cleaned.includes(",")) {
    return Number(cleaned.replace(/\./g, "").replace(",", "."));
  }

  const dotParts = cleaned.split(".");
  const looksLikeThousands =
    dotParts.length > 2 ||
    (dotParts.length === 2 && dotParts[1]?.length === 3);

  return Number(looksLikeThousands ? cleaned.replace(/\./g, "") : cleaned);
}

function setInlineError(message: string): void {
  grossSalaryInput.setAttribute("aria-invalid", String(message !== ""));
  grossSalaryWrapper.classList.toggle("currency-field--invalid", message !== "");
  grossSalaryError.textContent = message;
}

function animateMoney(element: HTMLElement, target: number, prefix = ""): void {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) {
    element.textContent = `${prefix}${currencyFormatter.format(target)}`;
    return;
  }

  const duration = 320;
  const startTime = performance.now();

  const update = (time: number): void => {
    const progress = Math.min((time - startTime) / duration, 1);
    const easedProgress = 1 - (1 - progress) ** 3;
    element.textContent = `${prefix}${currencyFormatter.format(target * easedProgress)}`;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  };

  requestAnimationFrame(update);
}

function updateMoneyValues(calculation: SalaryCalculation): void {
  const values = calculation as unknown as Record<string, unknown>;

  document.querySelectorAll<HTMLElement>("[data-money]").forEach((element) => {
    const key = element.dataset.money;

    if (key !== undefined && typeof values[key] === "number") {
      animateMoney(element, values[key]);
    }
  });

  document
    .querySelectorAll<HTMLElement>("[data-money-negative]")
    .forEach((element) => {
      const key = element.dataset.moneyNegative;

      if (key !== undefined && typeof values[key] === "number") {
        animateMoney(element, values[key], "− ");
      }
    });

  document
    .querySelectorAll<HTMLElement>("[data-money-positive]")
    .forEach((element) => {
      const key = element.dataset.moneyPositive;

      if (key !== undefined && typeof values[key] === "number") {
        animateMoney(element, values[key], "+ ");
      }
    });
}

function formatBracketLabel(
  lowerBound: number,
  upperBound: number | null,
  rate: number,
): string {
  const range =
    upperBound === null
      ? `oltre ${currencyFormatter.format(lowerBound)}`
      : lowerBound === 0
        ? `fino a ${currencyFormatter.format(upperBound)}`
        : `${currencyFormatter.format(lowerBound)}–${currencyFormatter.format(upperBound)}`;

  return `${percentageFormatter.format(rate)} · ${range}`;
}

function updateBrackets(calculation: SalaryCalculation): void {
  bracketsBody.replaceChildren();

  calculation.irpefBreakdown.forEach((bracket) => {
    const row = document.createElement("tr");
    const labelCell = document.createElement("th");
    const taxableCell = document.createElement("td");
    const taxCell = document.createElement("td");

    labelCell.scope = "row";
    labelCell.textContent = formatBracketLabel(
      bracket.lowerBound,
      bracket.upperBound,
      bracket.rate,
    );
    taxableCell.textContent = currencyFormatter.format(bracket.taxableAmount);
    taxCell.textContent = currencyFormatter.format(bracket.tax);
    row.append(labelCell, taxableCell, taxCell);
    bracketsBody.append(row);
  });
}

function updateSalaryBar(calculation: SalaryCalculation): void {
  const netShare = calculation.annualNetSalary / calculation.grossAnnualSalary;
  const contributionsShare =
    calculation.socialSecurityContributions / calculation.grossAnnualSalary;
  const taxesShare = calculation.totalTaxes / calculation.grossAnnualSalary;

  salaryBar.style.setProperty("--net-share", `${netShare * 100}%`);
  salaryBar.style.setProperty(
    "--contributions-share",
    `${contributionsShare * 100}%`,
  );
  salaryBar.style.setProperty("--taxes-share", `${taxesShare * 100}%`);
  salaryBar.setAttribute(
    "aria-label",
    `Ripartizione RAL: netto ${percentageFormatter.format(netShare)}, contributi ${percentageFormatter.format(contributionsShare)}, imposte ${percentageFormatter.format(taxesShare)}.`,
  );
  netPercentage.textContent = percentageFormatter.format(netShare);
  contributionsPercentage.textContent = percentageFormatter.format(contributionsShare);
  taxesPercentage.textContent = percentageFormatter.format(taxesShare);
  contributionsRate.textContent = `${percentageFormatter.format(contributionsShare)} della RAL`;
  taxesRate.textContent = `${percentageFormatter.format(taxesShare)} della RAL`;
  withholdingsRate.textContent = `${percentageFormatter.format(contributionsShare + taxesShare)} trattenuto`;
}

function renderLocationProfile(): void {
  document
    .querySelectorAll<HTMLElement>("[data-location-display]")
    .forEach((element) => {
      element.textContent = DEFAULT_LOCATION_PROFILE.displayName;
    });

  document
    .querySelectorAll<HTMLElement>("[data-location-municipality]")
    .forEach((element) => {
      element.textContent = DEFAULT_LOCATION_PROFILE.municipality;
    });

  document
    .querySelectorAll<HTMLElement>("[data-location-region]")
    .forEach((element) => {
      element.textContent = DEFAULT_LOCATION_PROFILE.region;
    });

  const sourceBindings = [
    ["#regional-source", DEFAULT_LOCATION_PROFILE.sources.regionalTax],
    ["#municipal-source", DEFAULT_LOCATION_PROFILE.sources.municipalTax],
    ["#finance-source", DEFAULT_LOCATION_PROFILE.sources.financeDepartment],
  ] as const;

  sourceBindings.forEach(([selector, source]) => {
    const anchor = getElement<HTMLAnchorElement>(selector);
    anchor.href = source.url;
    anchor.textContent = source.label;
  });
}

function renderCalculation(calculation: SalaryCalculation): void {
  updateMoneyValues(calculation);
  updateBrackets(calculation);
  updateSalaryBar(calculation);
  resultContext.textContent = `${calculation.locationDisplayName} · RAL ${currencyFormatter.format(calculation.grossAnnualSalary)} · ${calculation.monthlyPayments} mensilità`;
  monthlyCaption.textContent = `Media su ${calculation.monthlyPayments} mensilità.`;

  if (results.hidden) {
    results.hidden = false;
  }

  results.dataset.visible = "true";
  window.setTimeout(() => {
    delete results.dataset.visible;
  }, 400);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  results.scrollIntoView({
    behavior: reducedMotion ? "auto" : "smooth",
    block: "start",
  });
}

const form = getElement<HTMLFormElement>("#salary-form");
const grossSalaryInput = getElement<HTMLInputElement>("#gross-salary");
const grossSalaryWrapper = getElement<HTMLDivElement>("#gross-salary-wrapper");
const grossSalaryError = getElement<HTMLParagraphElement>("#gross-salary-error");
const monthlyPaymentsSelect = getElement<HTMLSelectElement>("#monthly-payments");
const results = getElement<HTMLElement>("#results");
const resultContext = getElement<HTMLParagraphElement>("#result-context");
const monthlyCaption = getElement<HTMLSpanElement>("#monthly-caption");
const salaryBar = getElement<HTMLDivElement>("#salary-bar");
const netPercentage = getElement<HTMLElement>("#net-percentage");
const contributionsPercentage = getElement<HTMLElement>(
  "#contributions-percentage",
);
const taxesPercentage = getElement<HTMLElement>("#taxes-percentage");
const contributionsRate = getElement<HTMLElement>("#contributions-rate");
const taxesRate = getElement<HTMLElement>("#taxes-rate");
const withholdingsRate = getElement<HTMLElement>("#withholdings-rate");
const bracketsBody = getElement<HTMLTableSectionElement>("#brackets-body");

renderLocationProfile();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const grossAnnualSalary = parseItalianCurrency(grossSalaryInput.value);
  const validationError = validateGrossSalary(grossAnnualSalary);

  if (validationError !== null) {
    setInlineError(validationError);
    grossSalaryInput.focus();
    return;
  }

  const monthlyPayments = Number(monthlyPaymentsSelect.value);

  if (!isSupportedMonthlyPayments(monthlyPayments)) {
    return;
  }

  setInlineError("");
  grossSalaryInput.value = inputCurrencyFormatter.format(grossAnnualSalary);
  renderCalculation(calculateNetSalary(grossAnnualSalary, monthlyPayments));
});

grossSalaryInput.addEventListener("input", () => {
  if (grossSalaryInput.getAttribute("aria-invalid") === "true") {
    setInlineError("");
  }
});

grossSalaryInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    form.requestSubmit();
  }
});

grossSalaryInput.addEventListener("blur", () => {
  const value = parseItalianCurrency(grossSalaryInput.value);

  if (Number.isFinite(value) && value > 0) {
    grossSalaryInput.value = inputCurrencyFormatter.format(value);
  }
});

document.querySelectorAll<HTMLButtonElement>("[data-quick-value]").forEach((button) => {
  button.addEventListener("click", () => {
    const quickValue = Number(button.dataset.quickValue);
    grossSalaryInput.value = inputCurrencyFormatter.format(quickValue);
    setInlineError("");
    grossSalaryInput.focus();
  });
});
