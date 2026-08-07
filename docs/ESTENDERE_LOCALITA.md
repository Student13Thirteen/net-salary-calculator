# Come aggiungere una nuova località senza riscrivere il calcolatore

Questa guida descrive il metodo usato per separare il motore nazionale dal profilo
territoriale. L'interfaccia pubblica usa soltanto **Milano, Lombardia**, ma il codice è
organizzato per aggiungere altri profili in modo controllato.

L'obiettivo non è riempire un menu con città non verificate. Una località è supportata
soltanto quando regole, anno, fonti e test sono completi.

## 1. Che cosa rimane uguale tra le località

Le funzioni nazionali restano in `src/calculator.ts` e i parametri nazionali in
`src/tax-config.ts`:

- contributi previdenziali adottati dal prototipo;
- imponibile fiscale;
- scaglioni IRPEF;
- detrazione da lavoro dipendente;
- arrotondamenti;
- calcolo del netto annuale e della media per mensilità.

Le informazioni che cambiano con la residenza fiscale sono raccolte in
`src/location-profiles.ts`:

- regione e comune;
- anno fiscale;
- aliquote regionali;
- aliquota o scaglioni comunali;
- soglia di esenzione comunale;
- fonti regionali, comunali e del Dipartimento delle Finanze;
- data dell'ultima verifica.

## 2. Prima di scrivere codice: definisci il caso

Compila questa scheda:

| Campo | Esempio |
| --- | --- |
| Comune | Milano |
| Regione | Lombardia |
| Anno fiscale | 2026 |
| Tipo di lavoratore | Dipendente privato, impiegato |
| Durata del rapporto | Intero anno |
| Agevolazioni considerate | Nessuna |
| Regola regionale | Scaglioni progressivi |
| Regola comunale | Aliquota unica oltre una soglia |

Se il nuovo profilo richiede anche familiari, disabilità, deduzioni o altri dati che
l'interfaccia non raccoglie, non inventare un valore. Scegli una delle due strade:

1. dichiara l'agevolazione fuori perimetro;
2. estendi prima input, modello, formule e test.

## 3. Dove cercare le fonti

Usa sempre pagine istituzionali e registra l'anno a cui si riferiscono.

### Addizionale regionale

1. Parti dalla [ricerca ufficiale del Dipartimento delle Finanze](https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/addregirpef/sceltaregione.htm).
2. Seleziona la regione e poi l'anno fiscale.
3. Apri anche la pagina tributi della regione.
4. Cerca la legge regionale o il provvedimento citato.
5. Trascrivi aliquote, scaglioni, detrazioni e condizioni particolari.

### Addizionale comunale

1. Apri la sezione **Fiscalità regionale e locale → Addizionale comunale IRPEF** del
   Dipartimento delle Finanze.
2. Cerca il comune usando nome, provincia o codice catastale.
3. Seleziona l'anno fiscale corretto.
4. Controlla delibera, data di pubblicazione, aliquote e soglia di esenzione.
5. Confronta il risultato con il sito istituzionale del comune e con la delibera.

Il [risultato ufficiale di Milano, codice F205](https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/risultato.htm?anno=9999&cc=F205&pr=MI&r=1)
è un esempio del tipo di scheda da consultare.

### Parametri nazionali e contributivi

- usa [Normattiva](https://www.normattiva.it/) per leggi, TUIR e modifiche normative;
- usa [INPS — circolari, messaggi e normativa](https://www.inps.it/it/it/inps-comunica/atti/circolari-messaggi-e-normativa.html)
  per soglie e parametri contributivi;
- verifica sempre data di efficacia, categoria di lavoratore e periodo d'imposta.

Per il 2026, ad esempio, la [circolare INPS n. 6 del 30 gennaio 2026](https://www.inps.it/it/it/inps-comunica/atti/circolari-messaggi-e-normativa/dettaglio.circolari-e-messaggi.2026.01.circolare-numero-6-del-30-01-2026_15151.html)
pubblica la prima fascia di retribuzione pensionabile usata dal prototipo.

## 4. Registra la ricerca prima di implementare

Prepara una tabella di controllo:

| Voce | Valore | Anno | Fonte primaria | Fonte di conferma | Verificata il |
| --- | ---: | ---: | --- | --- | --- |
| Regionale, primo scaglione | ... | ... | URL | URL | AAAA-MM-GG |
| Regionale, scaglioni successivi | ... | ... | URL | URL | AAAA-MM-GG |
| Comunale | ... | ... | URL | URL | AAAA-MM-GG |
| Esenzione comunale | ... | ... | URL | URL | AAAA-MM-GG |

Non passare al codice se:

- l'anno non è esplicito;
- le due fonti si contraddicono;
- non è chiaro se l'aliquota è unica o progressiva;
- non è chiaro se, superata l'esenzione, l'aliquota colpisce tutto l'imponibile;
- esistono condizioni che richiedono input non presenti nel prototipo.

## 5. Traduci la regola nel profilo

### Comune con aliquota unica

```ts
const EXAMPLE_PROFILE: LocationProfile = {
  id: "example-region",
  taxYear: 2026,
  municipality: "Comune esempio",
  region: "Regione esempio",
  displayName: "Comune esempio, Regione esempio",
  regionalTaxBrackets: [
    { upTo: 15_000, rate: 0.0123 },
    { upTo: null, rate: 0.0173 },
  ],
  municipalTax: {
    kind: "flat",
    exemptionThreshold: 15_000,
    rate: 0.008,
  },
  verifiedOn: "2026-08-07",
  sources: {
    regionalTax: { label: "Fonte regionale", url: "https://..." },
    municipalTax: { label: "Fonte comunale", url: "https://..." },
    financeDepartment: { label: "Dipartimento Finanze", url: "https://..." },
  },
};
```

### Comune con scaglioni progressivi

```ts
municipalTax: {
  kind: "progressive",
  exemptionThreshold: 12_000,
  brackets: [
    { upTo: 15_000, rate: 0.004 },
    { upTo: 28_000, rate: 0.006 },
    { upTo: 50_000, rate: 0.007 },
    { upTo: null, rate: 0.008 },
  ],
}
```

Se la disposizione locale usa un meccanismo diverso da questi due, non forzarla dentro
il modello esistente. Aggiungi un nuovo tipo di regola e una funzione dedicata, oppure
dichiara esplicitamente il caso non supportato.

## 6. Aggiungi il profilo all'elenco

In `src/location-profiles.ts`:

```ts
export const LOCATION_PROFILES = {
  milan: MILAN_LOCATION_PROFILE,
  example: EXAMPLE_PROFILE,
} as const;
```

Questo passaggio rende il profilo disponibile al codice. Non aggiungere ancora una voce
nell'interfaccia se i test non sono pronti.

## 7. Scrivi i test prima di mostrare la località

Per ogni profilo servono almeno:

1. un caso sotto la soglia comunale;
2. un caso appena sopra la soglia;
3. un caso che attraversa gli scaglioni regionali;
4. un calcolo manuale completo su una RAL media;
5. il controllo che `netto + contributi + imposte = RAL`;
6. il controllo dell'anno fiscale;
7. un confronto con il calcolatore o esempio ufficiale, se disponibile.

Esegui poi:

```bash
npm run verify
```

## 8. Calcola un caso a mano

Non limitarti a verificare che il software produca un numero. Scrivi la sequenza:

```text
RAL
− contributi
= imponibile fiscale
→ IRPEF lorda per scaglioni
− detrazione
= IRPEF netta
+ addizionale regionale
+ addizionale comunale
= totale imposte
→ netto annuale
```

Il caso manuale deve essere riportato nei test o nella documentazione con gli importi
intermedi. È il controllo più importante contro errori di interpretazione.

## 9. Solo alla fine modifica l'interfaccia

Una futura selezione della località dovrebbe:

- mostrare soltanto profili completamente verificati;
- indicare sempre comune, regione e anno;
- aggiornare automaticamente etichette e link alle fonti;
- non lasciare intendere una copertura nazionale se esistono solo pochi profili;
- mantenere visibili assunzioni e limiti.

## 10. Metodo assistito con Codex

Codex può accelerare ricerca e implementazione, ma la validazione deve restare umana.
È meglio lavorare in tre fasi separate.

### Prompt 1 — ricerca, senza modificare il codice

```text
Devo aggiungere [COMUNE, REGIONE] per l'anno [ANNO] a un calcolatore del netto.
Non modificare ancora il codice. Cerca soltanto fonti istituzionali: Dipartimento
delle Finanze, sito della Regione, sito del Comune, delibere e normativa ufficiale.
Restituisci una tabella con aliquote, scaglioni, soglia di esenzione, modalità di
applicazione, anno, data di pubblicazione e URL diretto. Evidenzia ogni ambiguità e
non colmarla con supposizioni.
```

Controlla manualmente ogni link e ogni numero prima di continuare.

### Prompt 2 — implementazione dopo l'approvazione dei dati

```text
I dati territoriali allegati sono stati verificati. Aggiungi un nuovo LocationProfile
senza modificare le formule nazionali. Riusa i tipi flat o progressive quando
descrivono davvero la regola; altrimenti fermati e proponi un'estensione esplicita del
modello. Aggiungi test per soglia, scaglioni, anno fiscale, identità contabile e un
caso manuale. Aggiorna README e guida, poi esegui npm run verify.
```

### Prompt 3 — revisione indipendente

```text
Revisiona il nuovo profilo come se non lo avessi implementato tu. Confronta ogni valore
con le fonti indicate, controlla l'anno e cerca errori al confine delle soglie. Non
modificare i file: restituisci prima un report con gravità, prova e correzione proposta.
```

## 11. Definition of done

Una località è pronta soltanto quando:

- [ ] il profilo indica l'anno corretto;
- [ ] tutte le fonti sono istituzionali e apribili;
- [ ] aliquote e soglie sono state controllate due volte;
- [ ] le condizioni particolari sono implementate o dichiarate fuori perimetro;
- [ ] esiste almeno un caso completo calcolato a mano;
- [ ] i test di soglia e progressività passano;
- [ ] `npm run verify` è verde;
- [ ] interfaccia, README e guide riportano lo stesso perimetro;
- [ ] un'altra persona può spiegare il calcolo senza leggere il codice riga per riga.
