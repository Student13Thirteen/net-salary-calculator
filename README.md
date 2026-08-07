# Quanto resta?

Calcolatore trasparente della retribuzione netta annuale a partire dalla RAL.

È un prototipo client-side costruito con Vite e TypeScript, senza framework, backend o
chiamate API. Non sostituisce un cedolino: rende leggibile e verificabile la pipeline
essenziale che porta dal lordo al netto in un caso standard.

## Demo live

[Apri il calcolatore su GitHub Pages](https://student13thirteen.github.io/jet-hr-net-salary-calculator/)

## Caso simulato

La stima usa il **periodo d'imposta 2026** e assume:

- dipendente privato, impiegato a tempo indeterminato;
- rapporto attivo per tutto l'anno;
- residenza fiscale nel Comune di Milano;
- nessun familiare a carico o altro reddito;
- nessun bonus, premio, benefit o agevolazione;
- nessun onere deducibile o detraibile;
- nessuna previdenza complementare;
- RAL usata come imponibile previdenziale semplificato.

Le mensilità, 12, 13 o 14, dividono soltanto il netto annuale per mostrare una media. Non
modificano contributi, imposte o netto annuale.

## Logica del calcolo

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

Le formule pure sono in `src/calculator.ts`. I parametri nazionali sono raccolti in
`src/tax-config.ts`; anno, aliquote locali e fonti di Milano sono nel profilo
`src/location-profiles.ts`.

### Contributi previdenziali

Assunzione adottata per la quota del lavoratore:

```text
RAL × 9,19% + 1% × parte di RAL oltre €56.224
```

Il 9,19% rappresenta la quota IVS ordinaria usata per la generalità degli iscritti FPLD;
la soglia di €56.224 è la prima fascia di retribuzione pensionabile INPS 2026. Settore,
dimensione aziendale e storia contributiva possono cambiare la trattenuta reale.

### Imponibile e IRPEF 2026

```text
imponibile fiscale = RAL − contributi previdenziali
```

| Quota di imponibile | Aliquota |
| --- | ---: |
| fino a €28.000 | 23% |
| oltre €28.000 e fino a €50.000 | 33% |
| oltre €50.000 | 43% |

Ogni aliquota si applica soltanto alla quota che ricade nel relativo scaglione.

### Detrazione da lavoro dipendente

- fino a €15.000: €1.955;
- da €15.000 a €28.000:
  `€1.910 + €1.190 × (€28.000 − reddito) / €13.000`;
- da €28.000 a €50.000:
  `€1.910 × (€50.000 − reddito) / €22.000`;
- oltre €50.000: zero;
- maggiorazione di €65 oltre €25.000 e fino a €35.000.

I quozienti sono troncati alla quarta cifra decimale. L'IRPEF netta è il massimo tra zero
e IRPEF lorda meno detrazione.

### Addizionali di Lombardia e Milano

L'addizionale regionale è progressiva: 1,23% fino a €15.000, 1,58% fino a €28.000,
1,72% fino a €50.000 e 1,73% oltre €50.000.

Milano applica lo 0,8% all'intero imponibile quando questo supera €23.000; fino alla
soglia l'addizionale è zero. Alla data della ricerca, 6 agosto 2026, il Dipartimento delle
Finanze non pubblicava una scheda 2026 separata: il prototipo dichiara l'assunzione di
continuità della regola comunale vigente.

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

Entrambi i risultati sono bloccati nei test automatici.

## Cosa non comprende

- trattamento integrativo e ulteriore detrazione collegata al cuneo fiscale;
- familiari, spese, deduzioni o altre detrazioni;
- bonus, premi, fringe benefit e welfare;
- TFR e contributi a carico del datore di lavoro;
- regole contributive specifiche per CCNL, settore o azienda;
- conguagli, acconti e calendario mensile delle addizionali;
- arrotondamenti e voci del singolo cedolino.

Queste esclusioni mantengono il modello controllabile. Un risultato reale richiederebbe
più input e regole.

## Architettura territoriale

Milano è l'unico scenario mostrato, ma non è inserita direttamente nelle formule. Il
motore riceve un `LocationProfile` con regione, comune, anno, addizionali e fonti. Un
profilo con anno diverso dalla configurazione nazionale viene rifiutato. I test mostrano
che un profilo alternativo riusa IRPEF e detrazione cambiando soltanto le imposte locali.

## Fonti ufficiali

- [Legge 30 dicembre 2025, n. 199](https://www.normattiva.it/eli/id/2025/12/30/25G00212/ORIGINAL), art. 1, comma 3: secondo scaglione IRPEF 2026 al 33%.
- [Legge 30 dicembre 2024, n. 207](https://www.normattiva.it/atto/caricaDettaglioAtto?atto.codiceRedazionale=24G00229&atto.dataPubblicazioneGazzetta=2024-12-31), art. 1, comma 2: struttura IRPEF e detrazione minima.
- [TUIR, art. 13](https://def.giustiziatributaria.gov.it/DocTribFrontend/getAttoNormativoDetail.do?ACTION=getArticolo&articolo=Articolo+13&codiceOrdinamento=0000000000000130000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000&id=%7B31D694E8-4398-4030-873B-FEAF5A6647F9%7D): detrazione da lavoro dipendente.
- [INPS, circolare n. 101/2024](https://www.inps.it/it/it/inps-comunica/atti/circolari-messaggi-e-normativa/dettaglio.circolari-e-messaggi.2024.11.circolare-numero-101-del-29-11-2024_14714.html): quota IVS ordinaria del lavoratore.
- [INPS, circolare n. 6/2026](https://www.inps.it/it/it/inps-comunica/atti/circolari-messaggi-e-normativa/dettaglio.circolari-e-messaggi.2026.01.circolare-numero-6-del-30-01-2026_15151.html): fascia 2026 per l'1% aggiuntivo.
- [Regione Lombardia](https://www.regione.lombardia.it/bollo-auto-e-tributi-regionali/red-addizionale-regionale-irpef): addizionale regionale.
- [Comune di Milano](https://www.comune.milano.it/aree-tematiche/tributi/addizionale-comunale-irpef): aliquota 0,8% ed esenzione.
- [Dipartimento delle Finanze, Milano F205](https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/risultato.htm?anno=9999&cc=F205&pr=MI&r=1): storico comunale.

Fonti consultate e ricontrollate il 6 agosto 2026.

## Avvio e verifica

Richiede Node.js 22 o successivo.

```bash
npm install
npm run dev
npm run verify
```

`npm run verify` esegue typecheck, 14 test e build. I test coprono validazione, soglie,
progressività, casi manuali, mensilità, identità contabile, profili territoriali e anno.

Il deploy GitHub Pages parte da `main` soltanto dopo il superamento della verifica.

## Disclaimer

> Questa simulazione è una stima semplificata a scopo informativo e non sostituisce il
> cedolino, il calcolo del datore di lavoro o una consulenza fiscale.
