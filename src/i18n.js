// ============================================================
// i18n.js — Interface Translations
// Every piece of text the user sees lives here, in both
// languages. Static markup is translated through data-i18n
// attributes; text built in JavaScript goes through t().
// ============================================================

const KEY_LANG = "dtp.lang.v1";
const LANGUAGES = ["en", "lt"];

// Keys are grouped by the screen they belong to. English is also the
// fallback: a key missing from Lithuanian shows the English wording
// rather than an empty space.
const TRANSLATIONS = {

    en: {
        "app.title": "Driving Theory Practice",
        "app.subtitle": "Lithuanian learner driver exam preparation",

        // ----- start screen -----
        "load.profile": "Profile",
        "load.profilePlaceholder": "Your name",
        "load.questions": "Questions",
        "load.builtin": "Built-in bank",
        "load.custom": "My own questions",
        "load.builtinLoading": "Loading the built-in question bank…",
        "load.builtinManual": "Select the question file manually",
        "load.customCsv": "Question file (.csv)",
        "load.customImages": "Images",
        "load.customImagesHint": "— optional, select them all at once",
        "load.pictureHelp": 'The <code class="bg-gray-100 px-1 rounded">picture</code> column holds the file name ' +
                            '(e.g. <code class="bg-gray-100 px-1 rounded">12.jpg</code>) or a full https:// link.',
        "load.timer": "Enable timer",
        "load.start": "Start Session",
        "load.drill": "Practise my mistakes",
        "load.drillCount": "Practise my mistakes ({n})",
        "load.history": "View history",
        "load.historyCount": "View history ({n})",
        "load.tip": 'Tip: use keys <kbd class="bg-gray-100 px-1 rounded">A</kbd> ' +
                    '<kbd class="bg-gray-100 px-1 rounded">B</kbd> ' +
                    '<kbd class="bg-gray-100 px-1 rounded">C</kbd> ' +
                    '<kbd class="bg-gray-100 px-1 rounded">D</kbd> to answer, ' +
                    '<kbd class="bg-gray-100 px-1 rounded">Enter</kbd> to continue, ' +
                    '<kbd class="bg-gray-100 px-1 rounded">Esc</kbd> to end',
        "load.storageBlocked": "This browser is not allowing local storage, so results cannot be saved. " +
                               "Private browsing blocks it, and opening the page through a local server " +
                               "(instead of straight from the file) usually fixes it.",

        // ----- question bank loading -----
        "bank.loaded": "Loaded {n} valid questions.",
        "bank.skipped": "Skipped {n} invalid rows.",
        "bank.noValid": "No valid questions found. Please check the CSV file format.",
        "bank.readError": "Could not read the file. Please try again.",
        "bank.builtinFailed": "The built-in bank could not be loaded automatically. This happens when the page " +
                              "is opened directly from a file — serve the folder over http " +
                              "(python3 -m http.server) or pick the file below.",
        "bank.noPictures": "None of these questions use a picture.",
        "bank.allPictures": "All {n} pictures were found.",
        "bank.missingPictures": "{n} images not found among the selected files: {list}.",
        "bank.andMore": " and {n} more",
        "bank.imagesReady": "{n} images ready. Now select your question file.",

        // ----- quiz -----
        "quiz.progress": "Question {n} of {total}",
        "quiz.score": "Score: {n}",
        "quiz.imageAlt": "Question illustration",
        "quiz.correct": "✓ Correct!",
        "quiz.incorrect": "✗ Incorrect",
        "quiz.next": "Next Question →",
        "quiz.seeResults": "See Results →",
        "quiz.quit": "End session early",
        "quiz.confirmQuit": "End this session now? Your {n} answers will be saved to your history " +
                            "and marked as ended early.",
        "quiz.confirmQuitEmpty": "End this session? Nothing has been answered yet, so no result will be saved.",
        "quiz.noMistakesYet": "There are no past mistakes to practise yet. Finish a session first.",

        "difficulty.1": "Easy",
        "difficulty.2": "Medium",
        "difficulty.3": "Hard",

        // ----- results -----
        "results.complete": "Session Complete",
        "results.ended": "Session Ended",
        "results.subtitle": "Here is how you did",
        "results.outOf": "out of {max} possible points ({pct}%)",
        "results.endedEarly": "Ended after {n} of {total} questions. The score covers only what was answered, " +
                              "and this session is left out of your best and average so it cannot distort them.",
        "results.saveFailed": "This result could not be saved to your history — the browser is blocking local storage.",
        "results.change": "Change since last session",
        "results.correct": "Correct answers",
        "results.incorrect": "Incorrect answers",
        "results.time": "Time taken",
        "results.answered": "Questions answered",
        "results.byDifficulty": "Performance by difficulty",
        "results.noData": "No data available",
        "results.restart": "Start New Session",

        // ----- history -----
        "history.title": "Your history",
        "history.profile": "Profile:",
        "history.back": "← Back",
        "history.export": "Export",
        "history.import": "Import",
        "history.clear": "Clear",
        "history.emptyTitle": "No sessions saved yet for this profile.",
        "history.emptyHint": "Finish a session and your score, progress and mistakes will be collected here.",
        "history.sessions": "Sessions",
        "history.completedCount": "{n} completed",
        "history.best": "Best",
        "history.average": "Average",
        "history.last": "Last",
        "history.totals": "{answered} questions answered, {correct} correct ({pct}%)",
        "history.practiceTime": " · {time} of timed practice",
        "history.chartTitle": "Score over time",
        "history.chartNeedsTwo": "Complete at least two sessions to see your progress here.",
        "history.weakTitle": "Questions you miss most",
        "history.weakNone": "No mistakes recorded yet — well done.",
        "history.weakWrong": "{wrong}/{seen} wrong",
        "history.drill": "Practise these {n} questions",
        "history.drillNeedsBank": "Load the matching question bank on the start screen to practise these again.",
        "history.allSessions": "All sessions",
        "history.correctOf": "{correct}/{total} correct",
        "history.points": "{score}/{max} pts",
        "history.endedEarlyOf": "ended early of {planned}",
        "history.mistakesDrill": "mistakes drill",
        "history.builtinBank": "built-in bank",
        "history.noMistakes": "No mistakes in this session.",
        "history.review": "Review mistakes ({n}) ▼",
        "history.hide": "Hide mistakes ({n}) ▲",
        "history.youAnswered": "✗ You answered: {answer}",
        "history.correctAnswer": "✓ Correct answer: {answer}",
        "history.loadBankForFull": "Load the question bank to see the full question and its explanation.",
        "history.answerNotStored": "(answer not stored)",
        "history.questionNumber": "Question #{id}",
        "history.confirmClear": 'Delete all {n} saved sessions for profile "{profile}"? This cannot be undone.',
        "history.cleared": "History cleared.",
        "history.imported": "Imported {n} new sessions.",
        "history.importedProfiles": " Profiles in the file: {list}.",
        "history.notBackup": "That file is not a results backup from this app.",
        "history.vsPrevious": "vs previous"
    },

    lt: {
        "app.title": "Vairavimo teorijos treniruoklis",
        "app.subtitle": "Pasiruošimas vairuotojo pažymėjimo teorijos egzaminui",

        // ----- pradžios ekranas -----
        "load.profile": "Profilis",
        "load.profilePlaceholder": "Jūsų vardas",
        "load.questions": "Klausimai",
        "load.builtin": "Įmontuotas bankas",
        "load.custom": "Mano klausimai",
        "load.builtinLoading": "Kraunamas įmontuotas klausimų bankas…",
        "load.builtinManual": "Pasirinkite klausimų failą rankiniu būdu",
        "load.customCsv": "Klausimų failas (.csv)",
        "load.customImages": "Paveikslėliai",
        "load.customImagesHint": "— neprivaloma, pažymėkite visus iš karto",
        "load.pictureHelp": 'Stulpelyje <code class="bg-gray-100 px-1 rounded">picture</code> nurodomas failo ' +
                            'pavadinimas (pvz. <code class="bg-gray-100 px-1 rounded">12.jpg</code>) ' +
                            'arba pilna https:// nuoroda.',
        "load.timer": "Įjungti laikmatį",
        "load.start": "Pradėti testą",
        "load.drill": "Kartoti savo klaidas",
        "load.drillCount": "Kartoti savo klaidas ({n})",
        "load.history": "Peržiūrėti istoriją",
        "load.historyCount": "Peržiūrėti istoriją ({n})",
        "load.tip": 'Patarimas: atsakymui spauskite <kbd class="bg-gray-100 px-1 rounded">A</kbd> ' +
                    '<kbd class="bg-gray-100 px-1 rounded">B</kbd> ' +
                    '<kbd class="bg-gray-100 px-1 rounded">C</kbd> ' +
                    '<kbd class="bg-gray-100 px-1 rounded">D</kbd>, toliau — ' +
                    '<kbd class="bg-gray-100 px-1 rounded">Enter</kbd>, ' +
                    'nutraukti — <kbd class="bg-gray-100 px-1 rounded">Esc</kbd>',
        "load.storageBlocked": "Ši naršyklė neleidžia naudoti vietinės saugyklos, todėl rezultatai nebus " +
                               "išsaugoti. Tai blokuoja privatus naršymas; paprastai padeda puslapį atidaryti " +
                               "per vietinį serverį, o ne tiesiai iš failo.",

        // ----- klausimų banko įkėlimas -----
        "bank.loaded": "Įkelta tinkamų klausimų: {n}.",
        "bank.skipped": "Praleista netinkamų eilučių: {n}.",
        "bank.noValid": "Tinkamų klausimų nerasta. Patikrinkite CSV failo formatą.",
        "bank.readError": "Nepavyko perskaityti failo. Bandykite dar kartą.",
        "bank.builtinFailed": "Įmontuoto banko nepavyko įkelti automatiškai. Taip nutinka, kai puslapis " +
                              "atidaromas tiesiai iš failo — paleiskite aplanką per http " +
                              "(python3 -m http.server) arba pasirinkite failą žemiau.",
        "bank.noPictures": "Nė vienas šių klausimų neturi paveikslėlio.",
        "bank.allPictures": "Rasti visi paveikslėliai ({n}).",
        "bank.missingPictures": "Tarp pasirinktų failų nerasta paveikslėlių ({n}): {list}.",
        "bank.andMore": " ir dar {n}",
        "bank.imagesReady": "Paveikslėliai paruošti ({n}). Dabar pasirinkite klausimų failą.",

        // ----- testas -----
        "quiz.progress": "{n} klausimas iš {total}",
        "quiz.score": "Taškai: {n}",
        "quiz.imageAlt": "Klausimo iliustracija",
        "quiz.correct": "✓ Teisingai!",
        "quiz.incorrect": "✗ Neteisingai",
        "quiz.next": "Kitas klausimas →",
        "quiz.seeResults": "Rezultatai →",
        "quiz.quit": "Nutraukti testą",
        "quiz.confirmQuit": "Nutraukti testą dabar? Jūsų atsakymai ({n}) bus išsaugoti istorijoje ir " +
                            "pažymėti kaip nutraukta sesija.",
        "quiz.confirmQuitEmpty": "Nutraukti testą? Dar neatsakyta nė į vieną klausimą, todėl rezultatas " +
                                 "nebus išsaugotas.",
        "quiz.noMistakesYet": "Kol kas nėra klaidų, kurias būtų galima kartoti. Pirma baikite testą.",

        "difficulty.1": "Lengvas",
        "difficulty.2": "Vidutinis",
        "difficulty.3": "Sunkus",

        // ----- rezultatai -----
        "results.complete": "Testas baigtas",
        "results.ended": "Testas nutrauktas",
        "results.subtitle": "Štai kaip sekėsi",
        "results.outOf": "iš {max} galimų taškų ({pct}%)",
        "results.endedEarly": "Nutraukta atsakius į {n} klausimus iš {total}. Rezultatas skaičiuojamas tik nuo " +
                              "atsakytų klausimų, o į geriausią ir vidutinį rezultatą ši sesija neįskaičiuojama, " +
                              "kad jų neiškraipytų.",
        "results.saveFailed": "Šio rezultato nepavyko išsaugoti istorijoje — naršyklė blokuoja vietinę saugyklą.",
        "results.change": "Pokytis nuo praėjusios sesijos",
        "results.correct": "Teisingi atsakymai",
        "results.incorrect": "Neteisingi atsakymai",
        "results.time": "Sugaišta laiko",
        "results.answered": "Atsakyta klausimų",
        "results.byDifficulty": "Rezultatai pagal sunkumą",
        "results.noData": "Duomenų nėra",
        "results.restart": "Pradėti naują testą",

        // ----- istorija -----
        "history.title": "Jūsų istorija",
        "history.profile": "Profilis:",
        "history.back": "← Atgal",
        "history.export": "Eksportuoti",
        "history.import": "Importuoti",
        "history.clear": "Išvalyti",
        "history.emptyTitle": "Šiam profiliui dar nėra išsaugotų sesijų.",
        "history.emptyHint": "Užbaikite testą ir čia atsiras rezultatas, progresas bei padarytos klaidos.",
        "history.sessions": "Sesijos",
        "history.completedCount": "baigtos: {n}",
        "history.best": "Geriausias",
        "history.average": "Vidurkis",
        "history.last": "Paskutinis",
        "history.totals": "atsakyta klausimų: {answered}, teisingai: {correct} ({pct}%)",
        "history.practiceTime": " · matuoto laiko: {time}",
        "history.chartTitle": "Rezultatai laikui bėgant",
        "history.chartNeedsTwo": "Užbaikite bent dvi sesijas, kad čia matytumėte progresą.",
        "history.weakTitle": "Dažniausiai klystami klausimai",
        "history.weakNone": "Klaidų dar neužfiksuota — puiku.",
        "history.weakWrong": "klaidingai: {wrong}/{seen}",
        "history.drill": "Kartoti šiuos klausimus ({n})",
        "history.drillNeedsBank": "Pradžios ekrane įkelkite atitinkamą klausimų banką, kad galėtumėte juos pakartoti.",
        "history.allSessions": "Visos sesijos",
        "history.correctOf": "teisingai: {correct}/{total}",
        "history.points": "{score}/{max} tšk.",
        "history.endedEarlyOf": "nutraukta, iš {planned}",
        "history.mistakesDrill": "klaidų kartojimas",
        "history.builtinBank": "įmontuotas bankas",
        "history.noMistakes": "Šioje sesijoje klaidų nėra.",
        "history.review": "Peržiūrėti klaidas ({n}) ▼",
        "history.hide": "Slėpti klaidas ({n}) ▲",
        "history.youAnswered": "✗ Jūsų atsakymas: {answer}",
        "history.correctAnswer": "✓ Teisingas atsakymas: {answer}",
        "history.loadBankForFull": "Įkelkite klausimų banką, kad matytumėte visą klausimą ir jo paaiškinimą.",
        "history.answerNotStored": "(atsakymas neišsaugotas)",
        "history.questionNumber": "{id} klausimas",
        "history.confirmClear": "Ištrinti visas išsaugotas profilio „{profile}“ sesijas ({n})? " +
                                "Šio veiksmo atšaukti nepavyks.",
        "history.cleared": "Istorija išvalyta.",
        "history.imported": "Importuota naujų sesijų: {n}.",
        "history.importedProfiles": " Faile esantys profiliai: {list}.",
        "history.notBackup": "Šis failas nėra šios programos rezultatų atsarginė kopija.",
        "history.vsPrevious": "nuo praėjusios"
    }
};


// ===== LOOKUP =====

// Returns the translated text for a key, with {name} placeholders
// replaced from params. An unknown key falls back to English and then to
// the key itself, so a gap shows up during testing instead of silently
// rendering an empty element.
function t(key, params) {
    const dictionary = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

    let text = dictionary[key];
    if (text === undefined) text = TRANSLATIONS.en[key];
    if (text === undefined) return key;

    if (params) {
        Object.keys(params).forEach(function (name) {
            text = text.split("{" + name + "}").join(params[name]);
        });
    }

    return text;
}


// ===== LANGUAGE CHOICE =====

// The stored choice wins; otherwise the browser's own language decides,
// so a Lithuanian visitor does not have to switch on every first visit.
function getStoredLanguage() {
    const stored = readJSON(KEY_LANG, "");
    if (LANGUAGES.indexOf(stored) !== -1) return stored;

    const browser = String(navigator.language || "en").toLowerCase();
    return browser.indexOf("lt") === 0 ? "lt" : "en";
}

function storeLanguage(lang) {
    const clean = LANGUAGES.indexOf(lang) !== -1 ? lang : "en";
    writeJSON(KEY_LANG, clean);
    return clean;
}


// ===== APPLYING TRANSLATIONS TO THE PAGE =====

// Walks the static markup and fills in every marked element. Text built
// in JavaScript is not covered here — those places call t() directly and
// are refreshed by re-rendering their screen.
function applyTranslations() {
    document.documentElement.lang = currentLanguage;
    document.title = t("app.title");

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
        el.textContent = t(el.dataset.i18n);
    });

    // A few strings carry markup of their own, such as the keyboard hint
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
        el.innerHTML = t(el.dataset.i18nHtml);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });

    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
        el.alt = t(el.dataset.i18nAlt);
    });

    // Keep the two language buttons showing which one is active
    LANGUAGES.forEach(function (lang) {
        const button = document.getElementById("lang-" + lang);
        if (!button) return;
        button.className = "px-3 py-1 text-xs font-semibold transition-colors " +
                           (lang === currentLanguage
                               ? "bg-blue-600 text-white"
                               : "bg-white text-gray-500 hover:bg-gray-50");
    });
}
