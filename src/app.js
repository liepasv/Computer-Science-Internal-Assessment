// ============================================================
// app.js — Application State & Event Listeners
// Defines all global session variables and wires up the UI
// controls to the functions in the other modules.
// ============================================================

// ===== GLOBAL SESSION STATE =====
// These variables are shared across all modules via the global scope

let questions = [];         // all valid questions loaded from the CSV
let sessionQuestions = [];  // the up-to-30 questions selected for this session
let currentIndex = 0;       // index of the question currently being shown
let score = 0;              // running total score for this session
let correctCount = 0;       // number of correctly answered questions
let incorrectCount = 0;     // number of incorrectly answered questions
let answered = false;       // whether the current question has been answered yet

// Timer state
let timerEnabled = false;
let timerInterval = null;
let startTime = null;
let elapsedSeconds = 0;

// Tracks correct/total answered per difficulty level for the results breakdown
let diffStats = {
    1: { correct: 0, total: 0 },
    2: { correct: 0, total: 0 },
    3: { correct: 0, total: 0 }
};

// ===== RESULT HISTORY STATE =====

let activeProfile = "Guest";   // whose results the stored history belongs to
let sessionMode = "all";       // "all" = whole bank, "mistakes" = past mistakes only
let sessionAnswers = [];       // one record per answer, saved with the session
let previousPercent = null;    // score of the session before this one, for the change line
let saveFailed = false;        // true when the finished session could not be stored

// ===== QUESTION SOURCE STATE =====

let currentBank = null;              // BUILTIN_BANK, or "custom:<file name>"
let customImages = new Map();        // picture file name -> blob URL, for custom banks

// Difficulty labels and point values used throughout the app
// Easy = 1 point, Medium = 2 points, Hard = 3 points
const DIFFICULTY_NAMES  = { 1: "Easy", 2: "Medium", 3: "Hard" };
const DIFFICULTY_POINTS = { 1: 1, 2: 2, 3: 3 };


// ===== START-UP =====

// Restores the profile used last time and warns if nothing can be stored
function initialiseApp() {
    activeProfile = getActiveProfile();
    rememberProfile(activeProfile);

    if (!isStorageAvailable()) {
        const warning = document.getElementById("storage-warning");
        warning.textContent =
            "This browser is not allowing local storage, so results cannot be saved. " +
            "Private browsing blocks it, and opening the page through a local server " +
            "(instead of straight from the file) usually fixes it.";
        warning.classList.remove("hidden");
    }

    refreshStartScreen();

    // Start on the built-in bank so the app is usable straight away.
    // This also paints the selected state on the two source buttons.
    setSource("builtin");
}

initialiseApp();


// ===== EVENT LISTENERS =====

// Switching profile changes which history is read and written.
// "change" fires when the field loses focus or a suggestion is picked.
document.getElementById("profile-input").addEventListener("change", function (e) {
    activeProfile = setActiveProfile(e.target.value);
    e.target.value = activeProfile;   // show the cleaned-up name back to the user
    refreshStartScreen();
});

// ===== QUESTION SOURCE =====

// Switches between the built-in bank and the user's own questions.
// Whatever was loaded is dropped, so a half-finished switch can never
// leave the previous bank's questions on screen.
function setSource(source) {
    questions = [];
    currentBank = null;
    clearCustomImages();

    document.getElementById("start-btn").disabled = true;
    document.getElementById("load-status").classList.add("hidden");

    const builtinPanel = document.getElementById("source-builtin");
    const customPanel  = document.getElementById("source-custom");

    const active   = "py-2.5 px-4 text-sm font-medium rounded-xl border transition-colors " +
                     "bg-blue-600 text-white border-blue-600";
    const inactive = "py-2.5 px-4 text-sm font-medium rounded-xl border transition-colors " +
                     "bg-white text-gray-600 border-gray-200 hover:bg-gray-50";

    if (source === "custom") {
        builtinPanel.classList.add("hidden");
        customPanel.classList.remove("hidden");
        document.getElementById("mode-builtin").className = inactive;
        document.getElementById("mode-custom").className = active;
        refreshCustomBank();   // re-use files that are still selected
    } else {
        customPanel.classList.add("hidden");
        builtinPanel.classList.remove("hidden");
        document.getElementById("mode-builtin").className = active;
        document.getElementById("mode-custom").className = inactive;
        loadBuiltinBank();
    }

    refreshStartScreen();
}

document.getElementById("mode-builtin").addEventListener("click", function () {
    setSource("builtin");
});

document.getElementById("mode-custom").addEventListener("click", function () {
    setSource("custom");
});

// Fallback picker, used when the built-in bank could not be fetched
document.getElementById("builtin-csv-input").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) loadBankFromFile(file, BUILTIN_BANK, null);
});

// The user's own question file
document.getElementById("custom-csv-input").addEventListener("change", refreshCustomBank);

// The user's own images. The report is rebuilt because the questions may
// already be loaded, in which case we can say what is still missing.
document.getElementById("custom-images-input").addEventListener("change", function (e) {
    setCustomImages(e.target.files);
    refreshCustomBank();
});

// Start button — begin a new practice session over the whole bank.
// Wrapped in a function so the click event is not passed in as the mode.
document.getElementById("start-btn").addEventListener("click", function () {
    startSession("all");
});

// Practise only the questions this profile has answered wrongly before
document.getElementById("drill-btn").addEventListener("click", function () {
    startSession("mistakes");
});

// Next button — advance to the next question (or show results on the last one)
document.getElementById("next-btn").addEventListener("click", nextQuestion);

// Restart button — go back to the load screen without reloading the page
document.getElementById("restart-btn").addEventListener("click", function () {
    // Stop any running timer before leaving the quiz screen
    if (timerInterval) stopTimer();
    refreshStartScreen();
    showScreen("load");
});

// Repeat the mistakes straight from the results screen
document.getElementById("results-drill-btn").addEventListener("click", function () {
    startSession("mistakes");
});


// ===== HISTORY SCREEN LISTENERS =====

document.getElementById("history-btn").addEventListener("click", showHistoryScreen);
document.getElementById("results-history-btn").addEventListener("click", showHistoryScreen);

document.getElementById("history-back-btn").addEventListener("click", function () {
    refreshStartScreen();
    showScreen("load");
});

// Download every profile's results as a backup file
document.getElementById("export-btn").addEventListener("click", downloadExport);

// The visible Import button forwards the click to the hidden file input
document.getElementById("import-btn").addEventListener("click", function () {
    document.getElementById("import-input").click();
});

document.getElementById("import-input").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) handleImportFile(file);
    // Reset the input so the same file can be picked again straight away
    e.target.value = "";
});

// Deleting results cannot be undone, so it is confirmed first
document.getElementById("clear-btn").addEventListener("click", function () {
    const count = loadHistory(activeProfile).length;
    if (count === 0) return;

    const message = "Delete all " + count + " saved session" + (count !== 1 ? "s" : "") +
                    " for profile \"" + activeProfile + "\"? This cannot be undone.";

    if (confirm(message)) {
        clearHistory(activeProfile);
        renderHistoryScreen();
        refreshStartScreen();
        showHistoryStatus("History cleared.", true);
    }
});

// Keyboard interaction logic
// A/B/C/D keys answer the current question; Enter or Space advances to the next
document.addEventListener("keydown", function (e) {
    // Only respond to keyboard when the quiz screen is visible
    if (document.getElementById("screen-quiz").classList.contains("hidden")) return;

    const key = e.key.toUpperCase();

    // Map A/B/C/D key presses to answer indices 1-4
    if (["A", "B", "C", "D"].includes(key) && !answered) {
        const index = ["A", "B", "C", "D"].indexOf(key) + 1; // convert to 1-based
        const q = sessionQuestions[currentIndex];
        // Only answer if this option actually exists (not an empty slot)
        if (q.options[index - 1] && q.options[index - 1].length > 0) {
            handleAnswer(index);
        }
    }

    // Enter or Space moves to the next question once the current one is answered
    if ((e.key === "Enter" || e.key === " ") && answered) {
        e.preventDefault(); // prevent Space from scrolling the page
        nextQuestion();
    }
});
