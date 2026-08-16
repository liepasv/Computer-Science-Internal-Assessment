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

// Handle CSV file selection — parse it and report how many questions were loaded
document.getElementById("csv-input").addEventListener("change", function (e) {
    const file = e.target.files[0];
    const statusEl = document.getElementById("load-status");

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (event) {
        const result = parseCSV(event.target.result);

        // Show an error if the file contained no valid questions
        if (!result || result.questions.length === 0) {
            statusEl.textContent = "No valid questions found. Please check the CSV file format.";
            statusEl.className = "mb-5 text-sm rounded-xl px-4 py-3 bg-red-50 text-red-700";
            statusEl.classList.remove("hidden");
            document.getElementById("start-btn").disabled = true;
            questions = [];
            refreshStartScreen();   // no bank means no mistakes can be practised
            return;
        }

        // Save the valid questions and report the count to the user
        questions = result.questions;

        let msg = "Loaded " + questions.length + " valid question" + (questions.length !== 1 ? "s" : "") + ".";
        if (result.skipped > 0) {
            msg += " Skipped " + result.skipped + " invalid row" + (result.skipped !== 1 ? "s" : "") + ".";
        }

        statusEl.textContent = msg;
        statusEl.className = "mb-5 text-sm rounded-xl px-4 py-3 bg-green-50 text-green-700";
        statusEl.classList.remove("hidden");

        // Enable the Start button now that at least one question is loaded
        document.getElementById("start-btn").disabled = false;

        // Past mistakes can now be matched against the loaded questions
        refreshStartScreen();
    };

    reader.onerror = function () {
        const statusEl = document.getElementById("load-status");
        statusEl.textContent = "Could not read the file. Please try again.";
        statusEl.className = "mb-5 text-sm rounded-xl px-4 py-3 bg-red-50 text-red-700";
        statusEl.classList.remove("hidden");
    };

    // Read the file as UTF-8 to support Lithuanian characters
    reader.readAsText(file, "UTF-8");
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
