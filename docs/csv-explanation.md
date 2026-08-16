# `csv.js` — detalus paaiškinimas

Šis failas atlieka **vieną aiškią užduotį**: paima CSV failo tekstą ir grąžina validuotų klausimų masyvą.

---

## Funkcija `parseCSV(text)`

Pagrindinis tikslas — paversti žalią CSV tekstą į JavaScript objektų masyvą, kurį galima naudoti programoje.

### 1 žingsnis — line endings normalizavimas (13 eilutė)

```js
text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
```

Windows kompiuteriai saugo eilučių pabaigą kaip `\r\n` (du simboliai), o Mac/Linux — kaip `\n` (vienas). Ši eilutė visus skirtingus variantus paverčia į vieną `\n`, kad tolesnė logika veiktų vienodai.

---

### 2 žingsnis — simbolis po simbolio skaitymas (21–44 eilutės)

Tai yra pagrindinis algoritmo žingsnis. Kodas **nedalina teksto pagal eilutes iš anksto** — vietoj to eina per kiekvieną simbolį po vieną, nes kai kurie CSV laukai (pvz. paaiškinimai) gali turėti `\n` viduje kabutėse.

Naudojamos 4 kintamosios:

| Kintamoji | Tipas | Paskirtis |
|-----------|-------|-----------|
| `rows` | masyvas | visų eilučių sąrašas |
| `fields` | masyvas | dabartinės eilutės laukų sąrašas |
| `current` | tekstas | šiuo metu renkami simboliai (vienas laukas) |
| `inQuotes` | boolean | ar esame viduje kabutėse |

Logika kiekvienam simboliui:

| Simbolis | Sąlyga | Kas daroma |
|----------|--------|------------|
| `"` | visada | perjungia `inQuotes` (įjungia arba išjungia) |
| `,` | kai `inQuotes = false` | baigia dabartinį lauką, įrašo į `fields` |
| `\n` | kai `inQuotes = false` | baigia eilutę, įrašo į `rows` |
| bet kas kitas | — | prideda prie `current` |

**Pavyzdys** kaip tai veikia su šia CSV eilute:

```
"Ar leidžiama, jei...",Taip,Ne,,1,2
```

1. Sutinka `"` → `inQuotes = true`
2. Sutinka `,` — bet `inQuotes = true`, todėl koma **ignoruojama**, pridedama prie `current`
3. Sutinka `"` → `inQuotes = false`
4. Sutinka `,` — dabar `inQuotes = false`, todėl laukas baigiamas ✓

---

### 3 žingsnis — paskutinė eilutė (47–52 eilutės)

```js
if (current.length > 0 || fields.length > 0) { ... }
```

Jei failas baigiasi be `\n` (dažnas atvejis), paskutinis laukas ir eilutė nebūtų išsaugoti. Šis blokas juos prideda rankiniu būdu.

---

### 4 žingsnis — klausimų objektų kūrimas (67–87 eilutės)

Pereina per visas eilutes, pradedant nuo `i = 1` (praleidžia pirmą — antraštę `id, question, option_a...`).

Kiekvienai eilutei sukuria JavaScript objektą:

```js
const q = {
    id:          f[0],                       // eilutės numeris
    text:        f[1],                       // klausimo tekstas
    options:     [f[2], f[3], f[4], f[5]],  // variantai A, B, C, D
    correct:     parseInt(f[6]),             // teisingas variantas (skaičius 1–4)
    difficulty:  parseInt(f[7]),             // sunkumas (1, 2 arba 3)
    explanation: f[8],                       // paaiškinimas
    picture:     f[9]                        // nuotraukos failo pavadinimas
};
```

`parseInt()` reikalingas nes CSV viską saugo kaip tekstą — `"2"` ≠ `2`. `parseInt("2")` paverčia tekstą į skaičių.

Jei klausimas nepraeina validacijos — `skipped++` ir `continue` (pereina prie kito).

---

### Grąžinamas rezultatas

```js
return { questions: parsed, skipped };
```

Du laukai viename objekte — validių klausimų masyvas ir praleistų eilučių skaičius. `app.js` naudoja šį skaičių parodydamas pranešimą vartotojui:

```
Loaded 59 valid questions. Skipped 1 invalid row.
```

---

## Funkcija `isValidQuestion(q)`

Ši funkcija patikrina ar klausimas turi visus reikiamus duomenis. Grąžina `true` arba `false`.

Keturios tikrinamos sąlygos:

| Nr. | Sąlyga | Kodėl |
|-----|--------|-------|
| 1 | Klausimo tekstas nėra tuščias | Be teksto klausimas neturi prasmės |
| 2 | `correct` yra skaičius nuo 1 iki 4 | `isNaN()` patikrina ar `parseInt` negrąžino `NaN` (nutinka kai laukas tuščias arba ne skaičius) |
| 3 | `difficulty` yra 1, 2 arba 3 | Ta pati logika kaip aukščiau |
| 4 | Teisingas variantas faktiškai egzistuoja | Kai kurių klausimų yra tik 2 variantai — jei `correct = 3` bet `option_c` tuščia, klausimas nevalidus |

---

## Kodėl toks sudėtingas parseris?

Paprastesnis būdas būtų:

```js
const lines = text.split("\n");
```

Tačiau mūsų CSV duomenų bazėje **9 klausimai turi `\n` simbolius paaiškinimo lauke** (viduje kabutėse). `split("\n")` sulaužytų tas eilutes į kelias dalis ir duomenys sugadintų. Simbolis po simbolio metodas šią problemą išsprendžia teisingai.
