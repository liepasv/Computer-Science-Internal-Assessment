// ============================================================
// ui.js — Dynamic UI & Rendering
// All functions that read session state and update the DOM.
// ============================================================

// Shows one screen and hides all the others
function showScreen(name) {
    document.getElementById("screen-load").classList.add("hidden");
    document.getElementById("screen-quiz").classList.add("hidden");
    document.getElementById("screen-results").classList.add("hidden");
    document.getElementById("screen-history").classList.add("hidden");
    document.getElementById("screen-" + name).classList.remove("hidden");
}

// Returns the Tailwind colour classes for a given difficulty level
function getDifficultyColour(difficulty) {
    if (difficulty === 1) return "bg-green-100 text-green-700";
    if (difficulty === 2) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
}

// Renders the current question onto the quiz screen
function renderQuestion() {
    const q = sessionQuestions[currentIndex];
    answered = false;

    // Update progress label and current score
    document.getElementById("question-progress").textContent =
        t("quiz.progress", { n: currentIndex + 1, total: sessionQuestions.length });
    document.getElementById("score-display").textContent = t("quiz.score", { n: score });

    // Update the difficulty badge colour and label
    const badge = document.getElementById("difficulty-badge");
    badge.textContent = t("difficulty." + q.difficulty);
    badge.className = "text-xs font-semibold px-2 py-1 rounded-full " + getDifficultyColour(q.difficulty);

    // Show the question image if the question has one, otherwise hide the container
    const imgContainer = document.getElementById("question-image-container");
    const img = document.getElementById("question-image");

    // Where the picture comes from depends on the bank: the app's own
    // assets folder, a file the user picked, or a plain https:// link
    const src = resolveImageSrc(q.picture, currentBank);

    if (src) {
        img.src = src;
        imgContainer.classList.remove("hidden");
        // If the image file is missing, hide the container so it doesn't show a broken icon
        img.onerror = function () {
            imgContainer.classList.add("hidden");
        };
    } else {
        imgContainer.classList.add("hidden");
        img.src = "";
    }

    // Set the question text
    document.getElementById("question-text").textContent = q.text;

    // Build the answer buttons — only show options that are not empty
    const container = document.getElementById("answer-buttons");
    container.innerHTML = "";
    const labels = ["A", "B", "C", "D"];

    q.options.forEach(function (option, index) {
        // Skip empty options (some questions only have 2 or 3 choices)
        if (!option || option.length === 0) return;

        const btn = document.createElement("button");
        btn.dataset.index = index + 1; // store 1-based index for answer checking
        btn.className =
            "w-full text-left px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 " +
            "hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-start gap-3";
        btn.innerHTML =
            '<span class="font-bold text-blue-600 min-w-[18px]">' + labels[index] + "</span>" +
            "<span>" + option + "</span>";

        btn.addEventListener("click", function () {
            handleAnswer(index + 1); // pass 1-based index
        });

        container.appendChild(btn);
    });

    // Hide the feedback section until the user answers
    document.getElementById("feedback-area").classList.add("hidden");

    // Show or hide the timer display based on whether it is enabled
    const timerDisplay = document.getElementById("timer-display");
    if (timerEnabled) {
        timerDisplay.classList.remove("hidden");
    } else {
        timerDisplay.classList.add("hidden");
    }
}

// Called when the user selects an answer (by click or keyboard)
function handleAnswer(selectedIndex) {
    // Prevent answering the same question twice
    if (answered) return;
    answered = true;

    const q = sessionQuestions[currentIndex];
    const isCorrect = selectedIndex === q.correct;

    // Update per-difficulty stats for the results breakdown
    diffStats[q.difficulty].total++;

    // Record the answer so the session can be stored and reviewed later.
    // Text snippets are kept only for mistakes: that is all the review
    // needs, and it keeps every stored session small.
    const answerRecord = {
        qid: q.id,
        chosen: selectedIndex,
        correct: q.correct,
        difficulty: q.difficulty,
        ok: isCorrect
    };
    if (!isCorrect) {
        answerRecord.text        = truncate(q.text, SNIPPET_QUESTION);
        answerRecord.chosenText  = truncate(q.options[selectedIndex - 1], SNIPPET_OPTION);
        answerRecord.correctText = truncate(q.options[q.correct - 1], SNIPPET_OPTION);
    }
    sessionAnswers.push(answerRecord);

    // Add points based on difficulty level if the answer is correct
    if (isCorrect) {
        score += DIFFICULTY_POINTS[q.difficulty];
        correctCount++;
        diffStats[q.difficulty].correct++;
    } else {
        incorrectCount++;
    }

    // Update score display immediately after answering
    document.getElementById("score-display").textContent = t("quiz.score", { n: score });

    // Apply colour highlighting to all answer buttons
    const buttons = document.getElementById("answer-buttons").querySelectorAll("button");
    buttons.forEach(function (btn) {
        const idx = parseInt(btn.dataset.index);
        btn.disabled = true; // prevent further clicks on this question

        if (idx === q.correct) {
            // Always highlight the correct answer in green
            btn.className =
                "w-full text-left px-4 py-3 rounded-xl border text-sm flex items-start gap-3 " +
                "border-green-500 bg-green-50 text-green-800";
            btn.querySelector("span:first-child").className = "font-bold text-green-700 min-w-[18px]";
        } else if (idx === selectedIndex && !isCorrect) {
            // Highlight the wrong selection in red
            btn.className =
                "w-full text-left px-4 py-3 rounded-xl border text-sm flex items-start gap-3 " +
                "border-red-400 bg-red-50 text-red-700";
            btn.querySelector("span:first-child").className = "font-bold text-red-500 min-w-[18px]";
        } else {
            // Dim all other options
            btn.className =
                "w-full text-left px-4 py-3 rounded-xl border text-sm flex items-start gap-3 " +
                "border-gray-100 text-gray-400";
        }
    });

    // Show the correct/incorrect feedback message
    const feedbackMsg = document.getElementById("feedback-message");
    if (isCorrect) {
        feedbackMsg.textContent = t("quiz.correct");
        feedbackMsg.className = "font-semibold text-base mb-2 text-green-600";
    } else {
        feedbackMsg.textContent = t("quiz.incorrect");
        feedbackMsg.className = "font-semibold text-base mb-2 text-red-600";
    }

    // Show the explanation text if the question has one
    const explanationEl = document.getElementById("explanation-text");
    if (q.explanation && q.explanation.length > 0) {
        explanationEl.textContent = q.explanation;
        explanationEl.classList.remove("hidden");
    } else {
        explanationEl.classList.add("hidden");
    }

    // Change the Next button label on the very last question
    const nextBtn = document.getElementById("next-btn");
    if (currentIndex === sessionQuestions.length - 1) {
        nextBtn.textContent = t("quiz.seeResults");
    } else {
        nextBtn.textContent = t("quiz.next");
    }

    document.getElementById("feedback-area").classList.remove("hidden");
}

// Builds and displays the end-of-session results summary
function showResults() {
    showScreen("results");

    // Calculate the maximum possible score for the questions in this session
    const maxScore = getMaxScore();
    const scorePercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    // Only offer the mistakes drill when this session produced mistakes
    const drillBtn = document.getElementById("results-drill-btn");
    if (incorrectCount > 0) {
        drillBtn.classList.remove("hidden");
    } else {
        drillBtn.classList.add("hidden");
    }

    // Build the performance breakdown rows for each difficulty level
    let diffRowsHTML = "";
    [1, 2, 3].forEach(function (d) {
        const stat = diffStats[d];
        if (stat.total === 0) return; // skip difficulty levels not present in this session
        const pct = Math.round((stat.correct / stat.total) * 100);
        diffRowsHTML +=
            '<div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">' +
            '<span class="text-sm text-gray-600">' + t("difficulty." + d) + "</span>" +
            '<span class="text-sm font-medium">' + stat.correct + "/" + stat.total + " (" + pct + "%)</span>" +
            "</div>";
    });

    // Build the elapsed time row if the timer was used
    let timerRowHTML = "";
    if (timerEnabled) {
        timerRowHTML =
            '<div class="flex justify-between items-center py-2 border-b border-gray-100">' +
            '<span class="text-sm text-gray-600">' + t("results.time") + "</span>" +
            '<span class="text-sm font-medium">' + formatTime(elapsedSeconds) + "</span>" +
            "</div>";
    }

    // Compare against the previous stored session, captured before this
    // one was saved. Nothing is shown when this is the first session.
    // A part-played session is not comparable with a full one, so the
    // change line is left out for it
    let changeRowHTML = "";
    if (previousPercent !== null && !sessionAbandoned) {
        const delta = scorePercent - previousPercent;
        changeRowHTML =
            '<div class="flex justify-between items-center py-2 border-b border-gray-100">' +
            '<span class="text-sm text-gray-600">' + t("results.change") + "</span>" +
            '<span class="text-sm font-medium ' + deltaColour(delta) + '">' + formatDelta(delta) + "</span>" +
            "</div>";
    }

    // Say plainly that this session was not played to the end, and adjust
    // the heading so the screen does not claim otherwise
    let endedEarlyHTML = "";
    document.getElementById("results-title").textContent =
        sessionAbandoned ? t("results.ended") : t("results.complete");

    if (sessionAbandoned) {
        endedEarlyHTML =
            '<div class="mb-6 text-sm rounded-xl px-4 py-3 bg-gray-50 text-gray-600">' +
            t("results.endedEarly", { n: sessionAnswers.length, total: sessionQuestions.length }) +
            "</div>";
    }

    // Tell the user if the result could not be stored, rather than
    // letting them believe it was added to their history
    let saveWarningHTML = "";
    if (saveFailed) {
        saveWarningHTML =
            '<div class="mb-6 text-sm rounded-xl px-4 py-3 bg-yellow-50 text-yellow-800">' +
            t("results.saveFailed") +
            "</div>";
    }

    // Inject the full results layout into the results container
    document.getElementById("results-content").innerHTML =
        '<div class="text-center mb-8">' +
            '<div class="text-5xl font-bold text-blue-600 mb-1">' + score + "</div>" +
            '<div class="text-sm text-gray-400">' + t("results.outOf", { max: maxScore, pct: scorePercent }) + "</div>" +
        "</div>" +

        endedEarlyHTML +
        saveWarningHTML +

        '<div class="bg-gray-50 rounded-xl p-4 mb-6">' +
            changeRowHTML +
            '<div class="flex justify-between items-center py-2 border-b border-gray-100">' +
                '<span class="text-sm text-gray-600">' + t("results.correct") + "</span>" +
                '<span class="text-sm font-medium text-green-600">' + correctCount + "</span>" +
            "</div>" +
            '<div class="flex justify-between items-center py-2 border-b border-gray-100">' +
                '<span class="text-sm text-gray-600">' + t("results.incorrect") + "</span>" +
                '<span class="text-sm font-medium text-red-500">' + incorrectCount + "</span>" +
            "</div>" +
            timerRowHTML +
            '<div class="flex justify-between items-center py-2">' +
                '<span class="text-sm text-gray-600">' + t("results.answered") + "</span>" +
                '<span class="text-sm font-medium">' + sessionAnswers.length + "</span>" +
            "</div>" +
        "</div>" +

        '<h3 class="text-sm font-semibold text-gray-700 mb-3">' + t("results.byDifficulty") + "</h3>" +
        '<div class="bg-gray-50 rounded-xl p-4">' +
            (diffRowsHTML || '<p class="text-sm text-gray-400">' + t("results.noData") + "</p>") +
        "</div>";
}
