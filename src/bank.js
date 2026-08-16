// ============================================================
// bank.js — Question Sources & Image Resolution
// The questions can come from two places: the bank shipped with
// the app, or a CSV the user supplies together with their own
// image files. This module loads either one and works out where
// each question's picture should be read from.
// ============================================================

// Identifies the bank a session was played on. Custom banks are named
// after the file they came from, so results stay separated per bank.
const BUILTIN_BANK = "builtin";

// One file per language, sharing the same ids, correct answers,
// difficulty levels and pictures. Only the wording differs, so results
// carry across languages: question 5 is the same question in both.
function builtinCsvPath() {
    return "database/db." + currentLanguage + ".csv";
}


// ===== IMAGE RESOLUTION =====

// Works out the src for one question's picture.
// Three cases are supported:
//   - a full https:// link      -> used exactly as written
//   - the built-in bank         -> read from the app's assets folder
//   - the user's own bank       -> read from the files they selected
// A custom bank never falls back to assets/, because a file name like
// "5.jpg" could otherwise show a built-in picture belonging to a
// completely different question.
function resolveImageSrc(picture, bank) {
    if (!picture) return "";

    if (/^https?:\/\//i.test(picture)) return picture;

    if ((bank || BUILTIN_BANK) === BUILTIN_BANK) return "assets/" + picture;

    return customImages.get(picture) || "";
}

// Human-readable bank name for the history screen
function bankLabel(bank) {
    const name = bank || BUILTIN_BANK;
    return name === BUILTIN_BANK ? t("history.builtinBank") : name.replace(/^custom:/, "");
}

// Turns the picked image files into a name -> blob URL lookup.
// Blob URLs are released first, otherwise the browser holds on to the
// memory of every image the user selected earlier in this visit.
function setCustomImages(fileList) {
    clearCustomImages();

    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        customImages.set(file.name, URL.createObjectURL(file));
    }
}

function clearCustomImages() {
    customImages.forEach(function (url) {
        URL.revokeObjectURL(url);
    });
    customImages.clear();
}


// ===== LOADING A BANK =====

// Shared final step for both sources: store the questions, report what
// was loaded, and let the rest of the screen react.
// extra is an optional { text, warn } from the caller — the image
// coverage report for a custom bank.
// Returns true when at least one usable question was found.
function applyParsedBank(result, bank, extra) {
    const statusEl = document.getElementById("load-status");
    statusEl.classList.remove("hidden");

    if (!result || result.questions.length === 0) {
        questions = [];
        currentBank = null;
        statusEl.textContent = t("bank.noValid");
        statusEl.className = "mb-5 text-sm rounded-xl px-4 py-3 bg-red-50 text-red-700";
        document.getElementById("start-btn").disabled = true;
        refreshStartScreen();
        return false;
    }

    questions = result.questions;
    currentBank = bank;

    let message = t("bank.loaded", { n: questions.length });

    // Anything the user may want to act on turns the message amber, so a
    // skipped row or a missing picture does not read as a clean success
    let warn = result.skipped > 0;
    if (result.skipped > 0) {
        message += " " + t("bank.skipped", { n: result.skipped });
    }
    if (extra && extra.text) {
        message += " " + extra.text;
        if (extra.warn) warn = true;
    }

    statusEl.textContent = message;
    statusEl.className = "mb-5 text-sm rounded-xl px-4 py-3 " +
                         (warn ? "bg-yellow-50 text-yellow-800" : "bg-green-50 text-green-700");

    document.getElementById("start-btn").disabled = false;
    refreshStartScreen();
    return true;
}

// Loads the bank that ships with the app. This is a network request even
// on a local machine, so it only works when the page is served over
// http; opening index.html straight from disk makes the browser block it.
function loadBuiltinBank() {
    const statusEl = document.getElementById("builtin-status");

    // The questions on screen are about to be replaced — on a language
    // switch by the very same questions in the other language. Clearing
    // them first means a session cannot be started in the short window
    // before the new file arrives, which would otherwise mix a freshly
    // translated interface with the previous language's questions.
    questions = [];
    currentBank = null;
    document.getElementById("start-btn").disabled = true;
    document.getElementById("load-status").classList.add("hidden");

    statusEl.textContent = t("load.builtinLoading");
    statusEl.className = "text-sm rounded-xl px-4 py-3 bg-gray-50 text-gray-500";
    statusEl.classList.remove("hidden");

    refreshStartScreen();

    return fetch(builtinCsvPath())
        .then(function (response) {
            if (!response.ok) throw new Error("HTTP " + response.status);
            return response.text();
        })
        .then(function (text) {
            const result = parseCSV(text);
            if (!result || result.questions.length === 0) throw new Error("empty bank");

            // The count is reported once, by applyParsedBank; this panel
            // only exists to explain a delay or a failure
            statusEl.classList.add("hidden");
            document.getElementById("builtin-fallback").classList.add("hidden");

            // The built-in bank never uses picked images
            clearCustomImages();
            applyParsedBank(result, BUILTIN_BANK, null);
        })
        .catch(function () {
            // Offer the manual picker rather than leaving a dead screen
            statusEl.classList.remove("hidden");
            statusEl.textContent = t("bank.builtinFailed");
            statusEl.className = "text-sm rounded-xl px-4 py-3 bg-yellow-50 text-yellow-800";
            document.getElementById("builtin-fallback").classList.remove("hidden");
        });
}

// Reads a CSV the user picked. bank identifies which source it was, so
// the built-in fallback picker and the custom picker can share this.
function loadBankFromFile(file, bank, extraMessageBuilder) {
    const reader = new FileReader();

    reader.onload = function (event) {
        const result = parseCSV(event.target.result);
        const extra = extraMessageBuilder ? extraMessageBuilder(result) : "";
        applyParsedBank(result, bank, extra);
    };

    reader.onerror = function () {
        const statusEl = document.getElementById("load-status");
        statusEl.textContent = t("bank.readError");
        statusEl.className = "mb-5 text-sm rounded-xl px-4 py-3 bg-red-50 text-red-700";
        statusEl.classList.remove("hidden");
    };

    // Read as UTF-8 so Lithuanian characters survive
    reader.readAsText(file, "UTF-8");
}


// ===== IMAGE COVERAGE REPORT =====

// Lists picture names a custom bank asks for that were not among the
// selected files. Without this the app would simply hide the picture and
// the user would never learn that anything was missing.
function findMissingImages(questionList) {
    const missing = [];

    questionList.forEach(function (q) {
        if (!q.picture) return;
        if (/^https?:\/\//i.test(q.picture)) return;   // links are not our files
        if (customImages.has(q.picture)) return;
        if (missing.indexOf(q.picture) === -1) missing.push(q.picture);
    });

    return missing;
}

// One sentence about how well the picked images cover the questions.
// warn is true when the user still has something to fix.
function describeImageCoverage(questionList) {
    const withPicture = questionList.filter(function (q) { return !!q.picture; });
    if (withPicture.length === 0) {
        return { text: t("bank.noPictures"), warn: false };
    }

    const missing = findMissingImages(questionList);
    if (missing.length === 0) {
        return { text: t("bank.allPictures", { n: withPicture.length }), warn: false };
    }

    const shown = missing.slice(0, 5).join(", ") +
                  (missing.length > 5 ? t("bank.andMore", { n: missing.length - 5 }) : "");
    return { text: t("bank.missingPictures", { n: missing.length, list: shown }), warn: true };
}

// Re-reads the custom CSV and images together. Either can be picked
// first, so the report is rebuilt whenever one of them changes.
function refreshCustomBank() {
    const csvFile = document.getElementById("custom-csv-input").files[0];

    if (!csvFile) {
        // Images picked but no questions yet — say so instead of staying silent
        if (customImages.size > 0) {
            const statusEl = document.getElementById("load-status");
            statusEl.textContent = t("bank.imagesReady", { n: customImages.size });
            statusEl.className = "mb-5 text-sm rounded-xl px-4 py-3 bg-gray-50 text-gray-600";
            statusEl.classList.remove("hidden");
        }
        return;
    }

    loadBankFromFile(csvFile, "custom:" + csvFile.name, function (result) {
        return describeImageCoverage(result.questions);
    });
}
