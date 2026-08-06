# Quanto resta?

Calcolatore trasparente della retribuzione netta annuale a partire dalla RAL.

Il progetto è un prototipo client-side costruito con Vite e TypeScript, senza framework,
backend o chiamate API. L'obiettivo non è sostituire un cedolino, ma rendere leggibile la
pipeline essenziale che porta dal lordo al netto in un caso standard.

## Demo live

[Apri il calcolatore su GitHub Pages](https://student13thirteen.github.io/jet-hr-net-salary-calculator/)

## Caso standard simulato

La stima usa il **periodo d'imposta 2026** e assume:

- dipendente del settore privato;
- impiegato a tempo indeterminato;
- rapporto attivo per tutto l'anno;
- residenza fiscale nel Comune di Milano;
- nessun familiare a carico;
- nessun altro reddito;
- nessun bonus, premio, fringe benefit o agevolazione;
- nessun onere deducibile o detraibile;
- nessuna previdenza complementare;
- RAL usata come imponibile previdenziale semplificato.

Il numero di mensilità, 12, 13 o 14, divide soltanto il netto annuale per mostrare una
media. Non modifica il risultato annuale.

## Logica del calcolo

La pipeline è intenzionalmente lineare:

```text
RAL
→ contributi previdenziali
→ imponibile fiscale
→ IRPEF lorda progressiva
→ detrazione da lavoro dipendente
→ IRPEF netta
→ addizionale regionale
→ addizionale comunale
→ netto annuale
→ netto medio per mensilità
```

Tutte le formule sono funzioni pure in `src/calculator.ts`.
Aliquote, soglie e anno fiscale sono raccolti in `src/tax-config.ts`.

### 1. Contributi previdenziali

Assunzione adottata per la quota a carico del lavoratore:

```text
RAL × 9,19%
+ 1% × parte di RAL oltre €56.224
```

Il 9,19% rappresenta la quota IVS ordinaria usata per la generalità degli iscritti al
Fondo Pensioni Lavoratori Dipendenti. La soglia di €56.224 è la prima fascia di
retribuzione pensionabile INPS per il 2026.

È una scelta dichiarata: aliquote accessorie, settore, dimensione aziendale e storia
contributiva possono cambiare la trattenuta reale.

### 2. Imponibile fiscale

```text
imponibile fiscale = RAL − contributi previdenziali
```

### 3. IRPEF lorda 2026

L'imposta è progressiva: ogni aliquota si applica soltanto alla parte di imponibile
compresa nel relativo scaglione.

| Quota di imponibile | Aliquota |
| --- | ---: |
| fino a €28.000 | 23% |
| oltre €28.000 e fino a €50.000 | 33% |
| oltre €50.000 | 43% |

### 4. Detrazione da lavoro dipendente

La detrazione è calcolata sull'imponibile fiscale e rapportata a un anno intero:

- fino a €15.000: €1.955;
- oltre €15.000 e fino a €28.000:
  `€1.910 + €1.190 × (€28.000 − reddito) / €13.000`;
- oltre €28.000 e fino a €50.000:
  `€1.910 × (€50.000 − reddito) / €22.000`;
- oltre €50.000: zero;
- maggiorazione di €65 per redditi oltre €25.000 e fino a €35.000.

I quozienti sono troncati alla quarta cifra decimale e gli importi monetari sono
arrotondati ai centesimi. L'IRPEF netta non può essere negativa.

### 5. Addizionale regionale Lombardia

Il prototipo applica in modo progressivo le aliquote pubblicate dalla Regione:

- 1,23% fino a €15.000;
- 1,58% oltre €15.000 e fino a €28.000;
- 1,72% oltre €28.000 e fino a €50.000;
- 1,73% oltre €50.000.

### 6. Addizionale comunale Milano

Si applica l'aliquota unica dello 0,8% all'intero imponibile quando questo supera
€23.000. Fino alla soglia l'addizionale è zero.

La pagina del Comune indica la regola a decorrere dal 2020. Alla data della ricerca,
6 agosto 2026, la banca dati del Dipartimento delle Finanze non pubblicava ancora una
scheda 2026 separata per Milano: il prototipo assume esplicitamente la continuità della
regola comunale vigente.

## Due casi controllati a mano

### RAL €35.000, 13 mensilità

```text
Contributi:       €35.000 × 9,19%                         = €3.216,50
Imponibile:       €35.000 − €3.216,50                    = €31.783,50
IRPEF lorda:      €28.000 × 23% + €3.783,50 × 33%        = €7.688,56
Detrazione:       €1.910 × 0,8280 + €65                  = €1.646,48
IRPEF netta:      €7.688,56 − €1.646,48                  = €6.042,08
Regionale:        progressiva                             = €454,98
Comunale:         €31.783,50 × 0,8%                      = €254,27
Netto annuale:    RAL − contributi − imposte              = €25.032,17
Media mensile:    €25.032,17 / 13                        = €1.925,55
```

### RAL €80.000, 13 mensilità

```text
Contributi:       €80.000 × 9,19% + €23.776 × 1%         = €7.589,76
Imponibile:       €80.000 − €7.589,76                    = €72.410,24
IRPEF lorda:      €6.440 + €7.260 + €22.410,24 × 43%     = €23.336,40
Detrazione:       oltre €50.000                           = €0,00
Regionale:        progressiva                             = €1.156,00
Comunale:         €72.410,24 × 0,8%                      = €579,28
Netto annuale:    RAL − contributi − imposte              = €47.338,56
Media mensile:    €47.338,56 / 13                        = €3.641,43
```

Questi importi sono asseriti anche nei test automatici.

## Cosa non comprende

Il prototipo esclude volutamente:

- trattamento integrativo e ulteriore detrazione collegata al cuneo fiscale;
- detrazioni per familiari, spese o altri oneri;
- bonus, premi di produttività e imposte sostitutive;
- fringe benefit e welfare aziendale;
- TFR e contributi a carico del datore di lavoro;
- regole contributive dipendenti da CCNL, settore o dimensione aziendale;
- massimali legati all'anzianità contributiva;
- conguagli, acconti e calendario mensile delle addizionali;
- arrotondamenti e voci tipiche del singolo cedolino.

Queste esclusioni mantengono il modello coerente con la pipeline richiesta e rendono
ogni passaggio verificabile. Per un risultato reale servirebbero più input e regole.

## Fonti ufficiali

- [Normattiva — Legge 30 dicembre 2025, n. 199](https://www.normattiva.it/eli/id/2025/12/30/25G00212/ORIGINAL), art. 1, comma 3: aliquota IRPEF 2026 del 33% nel secondo scaglione.
- [Normattiva — Legge 30 dicembre 2024, n. 207](https://www.normattiva.it/atto/caricaDettaglioAtto?atto.codiceRedazionale=24G00229&atto.dataPubblicazioneGazzetta=2024-12-31), art. 1, comma 2: struttura IRPEF e aumento a €1.955 della detrazione.
- [TUIR — DPR 22 dicembre 1986, n. 917](https://def.giustiziatributaria.gov.it/DocTribFrontend/getAttoNormativoDetail.do?ACTION=getArticolo&articolo=Articolo+13&codiceOrdinamento=0000000000000130000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000&id=%7B31D694E8-4398-4030-873B-FEAF5A6647F9%7D), art. 13: formule della detrazione da lavoro dipendente.
- [INPS — Circolare n. 101 del 29 novembre 2024](https://www.inps.it/it/it/inps-comunica/atti/circolari-messaggi-e-normativa/dettaglio.circolari-e-messaggi.2024.11.circolare-numero-101-del-29-11-2024_14714.html): ripartizione IVS ordinaria, 9,19% lavoratore.
- [INPS — Circolare n. 6 del 30 gennaio 2026](https://www.inps.it/it/it/inps-comunica/atti/circolari-messaggi-e-normativa/dettaglio.circolari-e-messaggi.2026.01.circolare-numero-6-del-30-01-2026_15151.html): fascia 2026 per il contributo aggiuntivo dell'1%.
- [Regione Lombardia — Addizionale regionale IRPEF](https://www.regione.lombardia.it/bollo-auto-e-tributi-regionali/red-addizionale-regionale-irpef): base imponibile, scaglioni e aliquote.
- [Comune di Milano — Addizionale comunale IRPEF](https://www.comune.milano.it/aree-tematiche/tributi/addizionale-comunale-irpef): aliquota 0,8% ed esenzione fino a €23.000.
- [Dipartimento delle Finanze — Milano, codice F205](https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/risultato.htm?anno=9999&cc=F205&pr=MI&r=1): storico delle aliquote pubblicate.

Fonti consultate e ricontrollate il 6 agosto 2026.

## Avvio locale

Richiede Node.js 22 o successivo.

```bash
npm install
npm run dev
```

Vite mostrerà l'indirizzo locale da aprire nel browser.

## Test e verifica

```bash
npm run test
npm run typecheck
npm run build
npm run verify
```

`npm run verify` esegue typecheck, test e build in sequenza.

I test coprono validazione, progressività IRPEF, soglia comunale, reddito medio ed
elevato, identità tra RAL e componenti, valori non negativi e mensilità.

## Struttura essenziale

```text
src/calculator.ts  formule e pipeline del calcolo
src/tax-config.ts  aliquote, soglie e anno fiscale
src/main.ts        input, validazione e rendering
src/styles.css     interfaccia responsive e accessibile
tests/             casi automatici e controlli manuali
```

## Disclaimer

> Questa simulazione è una stima semplificata a scopo informativo e non sostituisce
> il cedolino, il calcolo del datore di lavoro o una consulenza fiscale.
