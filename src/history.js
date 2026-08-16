// ============================================================
// history.js — History, Statistics & Mistake Review
// Reads the sessions kept by storage.js and renders the history
// screen: progress over time, weakest questions, and a per-session
// review of exactly which answers were wrong.
// ============================================================

// Escapes text coming from the CSV before it is placed into HTML.
// Question texts contain quotation marks and could otherwise break
// the markup that is built here as strings.
function escapeHTML(text) {
    return String(text === undefined || text === null ? "" : text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// "16 Aug 2026, 10:32" — falls back to the raw value if the date is broken
function formatDateTime(iso) {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return String(iso || "Unknown date");
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
           ", " +
           date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// "16 Aug" — used for the two axis labels of the progress chart
function formatShortDate(iso) {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// Formats a percentage change as a signed string with an arrow
function formatDelta(delta) {
    if (delta === null || delta === undefined) return "";
    if (delta > 0) return "▲ +" + delta + "%";
    if (delta < 0) return "▼ " + delta + "%";
    return "= 0%";
}

// formatTime gives M:SS, which is confusing for a total that runs past an
// hour ("67:15"), so long totals are shown as hours and minutes instead
function formatDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    if (hours === 0) return formatTime(totalSeconds);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return hours + "h " + String(minutes).padStart(2, "0") + "m";
}

// Green when the score went up, red when it dropped, grey when unchanged
function deltaColour(delta) {
    if (delta === null || delta === undefined) return "text-gray-400";
    if (delta > 0) return "text-green-600";
    if (delta < 0) return "text-red-500";
    return "text-gray-400";
}


// ===== ENTRY POINT =====

function showHistoryScreen() {
    renderHistoryScreen();
    showScreen("history");
}

// Rebuilds the whole history screen from what is currently stored
function renderHistoryScreen() {
    const history = loadHistory(activeProfile);
    const summary = summariseHistory(history);

    document.getElementById("history-profile").textContent = activeProfile;

    const container = document.getElementById("history-content");

    // Nothing stored yet — explain what will appear here instead of
    // showing a screen full of empty tables
    if (history.length === 0) {
        container.innerHTML =
            '<div class="text-center py-10">' +
                '<p class="text-gray-500 mb-1">No sessions saved yet for this profile.</p>' +
                '<p class="text-sm text-gray-400">Finish a session and your score, progress and mistakes will be collected here.</p>' +
            "</div>";
        return;
    }

    container.innerHTML =
        renderStatTiles(summary) +

        '<h3 class="text-sm font-semibold text-gray-700 mb-3">Score over time</h3>' +
        '<div class="bg-gray-50 rounded-xl p-4 pt-6 mb-6">' + renderProgressChart(history) + "</div>" +

        '<h3 class="text-sm font-semibold text-gray-700 mb-3">Questions you miss most</h3>' +
        '<div class="bg-gray-50 rounded-xl px-4 py-1 mb-3">' + renderWeakQuestions(history) + "</div>" +
        renderDrillButton(history) +

        '<h3 class="text-sm font-semibold text-gray-700 mb-3">All sessions</h3>' +
        renderSessionList(history);

    attachHistoryHandlers(history);
}


// ===== STAT TILES =====

function renderStatTiles(summary) {
    // Values use the font's normal figures; tabular digits are kept for
    // the columns of numbers further down the screen
    function tile(label, value, extraHTML) {
        return '<div class="bg-gray-50 rounded-xl p-4">' +
                   '<div class="text-xs text-gray-500 mb-1">' + label + "</div>" +
                   '<div class="text-xl font-semibold text-gray-800">' + value + "</div>" +
                   (extraHTML || "") +
               "</div>";
    }

    const deltaHTML = summary.delta === null
        ? ""
        : '<div class="text-xs mt-0.5 whitespace-nowrap ' + deltaColour(summary.delta) + '">' +
          formatDelta(summary.delta) + "</div>";

    // Running totals across every stored session
    const accuracy = summary.answered > 0
        ? Math.round((summary.correct / summary.answered) * 100)
        : 0;

    let totalsText = summary.answered + " questions answered, " +
                     summary.correct + " correct (" + accuracy + "%)";
    if (summary.totalSeconds > 0) {
        totalsText += " · " + formatDuration(summary.totalSeconds) + " of timed practice";
    }

    return '<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">' +
               tile("Sessions", summary.sessions) +
               tile("Best", summary.best + "%") +
               tile("Average", summary.average + "%") +
               tile("Last", summary.last + "%", deltaHTML) +
           "</div>" +
           '<p class="text-xs text-gray-400 mb-6">' + totalsText + "</p>";
}


// ===== PROGRESS CHART =====

// A small column chart of the score percentage of recent sessions.
// There is only one series, so it uses a single colour and needs no
// legend, and only the newest column carries a value label — a number
// above every column would be unreadable, and the session list below
// already shows every value.
function renderProgressChart(history) {
    const recent = history.slice(-12);

    if (recent.length < 2) {
        return '<p class="text-sm text-gray-400">Finish at least two sessions to see your progress here.</p>';
    }

    let columnsHTML = "";

    recent.forEach(function (session, index) {
        const isLatest = index === recent.length - 1;
        // Clamp so a damaged record can never draw outside the plot
        const pct = Math.max(0, Math.min(100, Math.round(session.percent)));

        const tooltip = formatDateTime(session.date) + " — " + pct + "% (" +
                        session.correct + "/" + session.total + " correct)";

        // The label sits just above the top of its column; the padding on
        // the card leaves room for it even at 100%
        const labelHTML = isLatest
            ? '<span class="absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold text-gray-700 tabular-nums whitespace-nowrap" ' +
                    'style="bottom: calc(' + pct + '% + 4px)">' + pct + "%</span>"
            : "";

        columnsHTML +=
            '<div class="relative flex-1 h-full flex items-end justify-center" title="' + escapeHTML(tooltip) + '">' +
                labelHTML +
                '<div class="w-full max-w-[24px] rounded-t ' + (isLatest ? "bg-blue-600" : "bg-blue-500") + '" ' +
                     'style="height: ' + pct + '%"></div>' +
            "</div>";
    });

    return '<div class="flex items-start gap-2">' +
               // Y axis ticks at clean values
               '<div class="relative h-40 w-8 shrink-0 text-[10px] text-gray-400 tabular-nums">' +
                   '<span class="absolute right-0 top-0 -translate-y-1/2">100%</span>' +
                   '<span class="absolute right-0 top-1/2 -translate-y-1/2">50%</span>' +
                   '<span class="absolute right-0 bottom-0 translate-y-1/2">0%</span>' +
               "</div>" +

               '<div class="flex-1 min-w-0">' +
                   '<div class="relative h-40">' +
                       // Hairline gridlines, one shade off the surface so they stay recessive
                       '<div class="absolute inset-x-0 top-0 border-t border-gray-200"></div>' +
                       '<div class="absolute inset-x-0 top-1/2 border-t border-gray-200"></div>' +
                       '<div class="absolute inset-x-0 bottom-0 border-t border-gray-300"></div>' +
                       '<div class="absolute inset-0 flex items-end gap-[2px]">' + columnsHTML + "</div>" +
                   "</div>" +

                   // Only the first and last dates are labelled so they cannot collide
                   '<div class="flex justify-between text-[10px] text-gray-400 mt-2">' +
                       "<span>" + escapeHTML(formatShortDate(recent[0].date)) + "</span>" +
                       "<span>" + escapeHTML(formatShortDate(recent[recent.length - 1].date)) + "</span>" +
                   "</div>" +
               "</div>" +
           "</div>";
}


// ===== WEAKEST QUESTIONS =====

function renderWeakQuestions(history) {
    const weak = getWeakQuestions(history).slice(0, 8);

    if (weak.length === 0) {
        return '<p class="text-sm text-gray-400 py-3">No mistakes recorded yet — well done.</p>';
    }

    let rowsHTML = "";

    weak.forEach(function (stat) {
        const rate = Math.round((stat.wrong / stat.seen) * 100);

        // Prefer the full text from the loaded bank; fall back to the
        // snippet stored with the mistake when no CSV is loaded
        const question = findQuestionById(stat.qid);
        const label = question ? question.text : (stat.text || "Question #" + stat.qid);

        rowsHTML +=
            '<div class="py-3 border-b border-gray-100 last:border-0">' +
                '<div class="flex items-start justify-between gap-3 mb-2">' +
                    '<span class="text-sm text-gray-700 leading-snug">' + escapeHTML(truncate(label, 110)) + "</span>" +
                    '<span class="text-xs text-gray-500 tabular-nums whitespace-nowrap pt-0.5">' +
                        stat.wrong + "/" + stat.seen + " wrong</span>" +
                "</div>" +
                // Meter: the fill is the error rate, the track a lighter step of the same colour
                '<div class="h-1.5 rounded-full bg-red-100 overflow-hidden">' +
                    '<div class="h-full rounded-full bg-red-500" style="width: ' + rate + '%"></div>' +
                "</div>" +
            "</div>";
    });

    return rowsHTML;
}

// The "practice my mistakes" shortcut is only useful when the question
// bank is loaded, because the session is built from real questions
function renderDrillButton(history) {
    const available = countAvailableMistakes();

    if (available === 0) {
        if (getWeakQuestions(history).length === 0) return "";
        return '<p class="text-xs text-gray-400 mb-6">Load the question bank on the start screen to practise these again.</p>';
    }

    return '<button id="history-drill-btn" class="w-full mb-6 py-2.5 px-6 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">' +
               "Practise these " + available + " question" + (available !== 1 ? "s" : "") +
           "</button>";
}


// ===== SESSION LIST & MISTAKE REVIEW =====

function renderSessionList(history) {
    // Rows are built oldest-first so each one can be compared with the
    // session before it, then reversed so the newest appears at the top
    const rows = history.map(function (session, index) {
        const delta = index > 0 ? session.percent - history[index - 1].percent : null;

        const mistakes = (session.answers || []).filter(function (a) { return !a.ok; });

        const metaParts = [session.correct + "/" + session.total + " correct",
                           session.score + "/" + session.maxScore + " pts"];
        if (session.timerEnabled) metaParts.push(formatTime(session.seconds || 0));
        if (session.mode === "mistakes") metaParts.push("mistakes drill");

        const deltaHTML = delta === null
            ? ""
            : '<div class="text-xs ' + deltaColour(delta) + '">' + formatDelta(delta) + "</div>";

        // Sessions with no mistakes have nothing to review
        const reviewHTML = mistakes.length === 0
            ? '<div class="px-4 pb-3 text-xs text-green-600">No mistakes in this session.</div>'
            : '<button data-review="' + index + '" ' +
                      'class="w-full text-left px-4 pb-3 text-xs font-medium text-blue-600 hover:text-blue-700">' +
                  "Review " + mistakes.length + " mistake" + (mistakes.length !== 1 ? "s" : "") + " ▼" +
              "</button>" +
              '<div id="review-' + index + '" class="hidden px-4 pb-2 border-t border-gray-100 pt-1"></div>';

        return '<div class="border border-gray-100 rounded-xl mb-2">' +
                   '<div class="flex items-start justify-between gap-3 px-4 pt-3 pb-2">' +
                       "<div>" +
                           '<div class="text-sm font-medium text-gray-700">' + escapeHTML(formatDateTime(session.date)) + "</div>" +
                           '<div class="text-xs text-gray-400 mt-0.5">' + escapeHTML(metaParts.join(" · ")) + "</div>" +
                       "</div>" +
                       '<div class="text-right shrink-0">' +
                           '<div class="text-sm font-semibold text-gray-800 tabular-nums">' + session.percent + "%</div>" +
                           deltaHTML +
                       "</div>" +
                   "</div>" +
                   reviewHTML +
               "</div>";
    });

    return rows.reverse().join("");
}

// Builds the list of wrong answers for one stored session
function renderMistakes(session) {
    const letters = ["A", "B", "C", "D"];
    const mistakes = (session.answers || []).filter(function (a) { return !a.ok; });

    let html = "";

    mistakes.forEach(function (answer) {
        // Everything is shown from the loaded bank when possible, because
        // stored snippets are shortened and hold no explanation or picture
        const question = findQuestionById(answer.qid);

        const questionText = question ? question.text : (answer.text || "Question #" + answer.qid);
        const chosenText   = question ? question.options[answer.chosen - 1]  : answer.chosenText;
        const correctText  = question ? question.options[answer.correct - 1] : answer.correctText;

        const chosenLabel  = (letters[answer.chosen - 1]  || "?") + ". " + (chosenText  || "(answer not stored)");
        const correctLabel = (letters[answer.correct - 1] || "?") + ". " + (correctText || "(answer not stored)");

        let imageHTML = "";
        if (question && question.picture && question.picture.length > 0) {
            imageHTML = '<img src="assets/' + escapeHTML(question.picture) + '" alt="Question illustration" ' +
                        'data-hide-on-error class="max-h-24 rounded-lg border border-gray-100 mb-2">';
        }

        let explanationHTML = "";
        if (question && question.explanation && question.explanation.length > 0) {
            explanationHTML = '<p class="text-xs text-gray-500 leading-relaxed mt-2">' +
                              escapeHTML(question.explanation) + "</p>";
        } else if (!question) {
            explanationHTML = '<p class="text-xs text-gray-400 italic mt-2">' +
                              "Load the question bank to see the full question and its explanation.</p>";
        }

        html +=
            '<div class="py-3 border-b border-gray-100 last:border-0">' +
                imageHTML +
                '<p class="text-sm text-gray-700 leading-snug mb-2">' + escapeHTML(questionText) + "</p>" +
                '<p class="text-xs text-red-600">✗ You answered: ' + escapeHTML(chosenLabel) + "</p>" +
                '<p class="text-xs text-green-600 mt-0.5">✓ Correct answer: ' + escapeHTML(correctLabel) + "</p>" +
                explanationHTML +
            "</div>";
    });

    return html;
}

// Wires up the buttons that were just injected as HTML.
// The same history list used to build them is passed in, so the indexes
// on the buttons always point at the right session.
function attachHistoryHandlers(history) {
    // Expand or collapse the mistake list of one session.
    // The details are only built on the first click, so a long history
    // does not have to render every mistake it has ever stored.
    document.querySelectorAll("[data-review]").forEach(function (button) {
        button.addEventListener("click", function () {
            const index = parseInt(button.dataset.review);
            const panel = document.getElementById("review-" + index);
            const count = (history[index].answers || []).filter(function (a) { return !a.ok; }).length;

            if (panel.classList.contains("hidden")) {
                if (panel.innerHTML === "") {
                    panel.innerHTML = renderMistakes(history[index]);
                    hideBrokenImages(panel);
                }
                panel.classList.remove("hidden");
                button.textContent = "Hide " + count + " mistake" + (count !== 1 ? "s" : "") + " ▲";
            } else {
                panel.classList.add("hidden");
                button.textContent = "Review " + count + " mistake" + (count !== 1 ? "s" : "") + " ▼";
            }
        });
    });

    // Start a mistakes-only session straight from the weak spots list
    const drillBtn = document.getElementById("history-drill-btn");
    if (drillBtn) {
        drillBtn.addEventListener("click", function () {
            startSession("mistakes");
        });
    }
}

// Hides pictures whose file is missing so no broken icon is shown
function hideBrokenImages(container) {
    container.querySelectorAll("img[data-hide-on-error]").forEach(function (img) {
        img.onerror = function () {
            img.style.display = "none";
        };
    });
}


// ===== START SCREEN STATE =====

// How many of the user's past mistakes can actually be practised right
// now — a stored question id is only usable if the loaded CSV contains it
function countAvailableMistakes() {
    if (!questions || questions.length === 0) return 0;

    const weak = getWeakQuestions(loadHistory(activeProfile));
    let count = 0;

    weak.forEach(function (stat) {
        if (findQuestionById(stat.qid)) count++;
    });

    return count;
}

// Keeps the profile field, the history button and the mistakes button in
// step with what is stored and whether a question bank has been loaded
function refreshStartScreen() {
    // Keep the field showing whichever profile is actually active
    document.getElementById("profile-input").value = activeProfile;

    // Offer the profiles already used on this device as autocomplete
    const datalist = document.getElementById("profile-list");
    datalist.innerHTML = listProfiles().map(function (name) {
        return '<option value="' + escapeHTML(name) + '"></option>';
    }).join("");

    const sessionCount = loadHistory(activeProfile).length;
    document.getElementById("history-btn").textContent =
        sessionCount === 0 ? "View history" : "View history (" + sessionCount + ")";

    // The mistakes button needs both a loaded bank and some past mistakes
    const available = countAvailableMistakes();
    const drillBtn = document.getElementById("drill-btn");
    drillBtn.disabled = available === 0;
    drillBtn.textContent = available === 0
        ? "Practise my mistakes"
        : "Practise my mistakes (" + available + ")";
}


// ===== EXPORT / IMPORT / CLEAR =====

// Saves every profile's results as a JSON file the user can keep as a
// backup or move to another browser
function downloadExport() {
    const blob = new Blob([exportAllData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "driving-theory-results.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

// Reads a backup file and merges it into what is already stored
function handleImportFile(file) {
    const reader = new FileReader();

    reader.onload = function (event) {
        const result = importAllData(event.target.result);

        if (!result) {
            showHistoryStatus("That file is not a results backup from this app.", false);
            return;
        }

        let message = "Imported " + result.added + " new session" + (result.added !== 1 ? "s" : "") + ".";
        if (result.profiles.length > 0) {
            message += " Profiles in the file: " + result.profiles.join(", ") + ".";
        }

        showHistoryStatus(message, true);
        renderHistoryScreen();
        refreshStartScreen();
    };

    reader.onerror = function () {
        showHistoryStatus("Could not read the file. Please try again.", false);
    };

    reader.readAsText(file, "UTF-8");
}

// Small message strip under the history buttons
function showHistoryStatus(message, isSuccess) {
    const el = document.getElementById("history-status");
    el.textContent = message;
    el.className = "mt-4 text-sm rounded-xl px-4 py-3 " +
                   (isSuccess ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700");
    el.classList.remove("hidden");
}
