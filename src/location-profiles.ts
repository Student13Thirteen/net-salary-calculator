import type { OpenTaxBracket } from "./tax-config";

export interface LocationSource {
  readonly label: string;
  readonly url: string;
}

export type MunicipalTaxRule =
  | {
      readonly kind: "flat";
      readonly exemptionThreshold: number;
      readonly rate: number;
    }
  | {
      readonly kind: "progressive";
      readonly exemptionThreshold: number;
      readonly brackets: readonly OpenTaxBracket[];
    };

export interface LocationProfile {
  readonly id: string;
  readonly taxYear: number;
  readonly municipality: string;
  readonly region: string;
  readonly displayName: string;
  readonly regionalTaxBrackets: readonly OpenTaxBracket[];
  readonly municipalTax: MunicipalTaxRule;
  readonly verifiedOn: string;
  readonly sources: {
    readonly regionalTax: LocationSource;
    readonly municipalTax: LocationSource;
    readonly financeDepartment: LocationSource;
  };
}

export const MILAN_LOCATION_PROFILE: LocationProfile = {
  id: "milan-lombardy",
  taxYear: 2026,
  municipality: "Milano",
  region: "Lombardia",
  displayName: "Milano, Lombardia",
  regionalTaxBrackets: [
    { upTo: 15_000, rate: 0.0123 },
    { upTo: 28_000, rate: 0.0158 },
    { upTo: 50_000, rate: 0.0172 },
    { upTo: null, rate: 0.0173 },
  ],
  municipalTax: {
    kind: "flat",
    exemptionThreshold: 23_000,
    rate: 0.008,
  },
  verifiedOn: "2026-08-06",
  sources: {
    regionalTax: {
      label: "Regione Lombardia — Addizionale regionale",
      url: "https://www.regione.lombardia.it/bollo-auto-e-tributi-regionali/red-addizionale-regionale-irpef",
    },
    municipalTax: {
      label: "Comune di Milano — Addizionale comunale",
      url: "https://www.comune.milano.it/aree-tematiche/tributi/addizionale-comunale-irpef",
    },
    financeDepartment: {
      label: "Dipartimento delle Finanze — Storico Milano",
      url: "https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/risultato.htm?anno=9999&cc=F205&pr=MI&r=1",
    },
  },
};

export const LOCATION_PROFILES = {
  milan: MILAN_LOCATION_PROFILE,
} as const;

export type LocationProfileId = keyof typeof LOCATION_PROFILES;

export const DEFAULT_LOCATION_PROFILE_ID: LocationProfileId = "milan";
export const DEFAULT_LOCATION_PROFILE =
  LOCATION_PROFILES[DEFAULT_LOCATION_PROFILE_ID];

export function getLocationProfile(
  id: LocationProfileId,
): LocationProfile {
  return LOCATION_PROFILES[id];
}
