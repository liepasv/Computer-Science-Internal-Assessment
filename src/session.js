// ============================================================
// session.js — Session Logic & Timer
// Handles question shuffling, timer functions, and starting/
// advancing the practice session.
// ============================================================

// Randomly shuffles an array without modifying the original.
// Uses the Fisher-Yates algorithm for true, unbiased randomness.
function shuffle(array) {
    const arr = [...array]; // copy so we don't modify the original
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        // Swap elements at positions i and j
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Starts the session timer
function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(updateTimerDisplay, 1000);
}

// Stops the timer and saves the total elapsed seconds
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (startTime) {
        elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    }
}

// Updates the visible timer display every second
function updateTimerDisplay() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById("timer-display").textContent = formatTime(elapsed);
}

// Formats a number of seconds into a M:SS string (e.g. 75 → "1:15")
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes + ":" + String(seconds).padStart(2, "0");
}

// Finds a loaded question by the id stored in a past result.
// Returns null when the current CSV does not contain that question.
function findQuestionById(qid) {
    for (let i = 0; i < questions.length; i++) {
        if (questions[i].id === qid) return questions[i];
    }
    return null;
}

// Builds the question list for a "practise my mistakes" session.
// getWeakQuestions returns the most frequently missed questions first.
// Only mistakes made on the bank that is loaded right now count, because
// the same question id means something different in another bank.
function buildMistakePool() {
    const weak = getWeakQuestions(loadHistory(activeProfile), currentBank);
    const pool = [];

    weak.forEach(function (stat) {
        const question = findQuestionById(stat.qid);
        if (question) pool.push(question);
    });

    return pool;
}

// Total points available for the questions that were actually answered.
// In a finished session that is every question; in one ended early it is
// only the part that was played, so the percentage stays fair instead of
// being measured against questions the user never saw.
function getMaxScore() {
    return sessionAnswers.reduce(function (sum, a) {
        return sum + DIFFICULTY_POINTS[a.difficulty];
    }, 0);
}

// Resets all session counters and starts a new practice session.
// mode is "all" for the whole bank or "mistakes" for past mistakes only.
function startSession(mode) {
    sessionMode = mode === "mistakes" ? "mistakes" : "all";

    if (sessionMode === "mistakes") {
        // Take the 30 most-missed questions, then shuffle so the order
        // is not the same predictable list every time
        const pool = buildMistakePool();
        if (pool.length === 0) {
            alert("There are no past mistakes to practise yet. Finish a session first.");
            return;
        }
        sessionQuestions = shuffle(pool.slice(0, 30));
    } else {
        // Shuffle all loaded questions and take up to 30 for this session
        const shuffled = shuffle(questions);
        sessionQuestions = shuffled.slice(0, Math.min(30, shuffled.length));
    }

    // Reset all session state variables before starting
    currentIndex = 0;
    score = 0;
    correctCount = 0;
    incorrectCount = 0;
    answered = false;
    elapsedSeconds = 0;
    sessionAnswers = [];
    saveFailed = false;
    sessionAbandoned = false;
    diffStats = {
        1: { correct: 0, total: 0 },
        2: { correct: 0, total: 0 },
        3: { correct: 0, total: 0 }
    };

    // Remember the last score now, so the results screen can show the
    // change. Only finished sessions are comparable, so ones that were
    // ended early are skipped.
    const completed = loadHistory(activeProfile).filter(function (s) { return !s.abandoned; });
    previousPercent = completed.length > 0 ? completed[completed.length - 1].percent : null;

    // Read the timer checkbox and start the timer if it is enabled
    timerEnabled = document.getElementById("timer-toggle").checked;
    if (timerEnabled) {
        startTimer();
    }

    showScreen("quiz");
    renderQuestion();
}

// Move to the next question after feedback is shown, or end the session
function nextQuestion() {
    currentIndex++;
    if (currentIndex >= sessionQuestions.length) {
        finishSession();
    } else {
        renderQuestion();
    }
}

// Lets the user stop part-way through. Answers already given are worth
// keeping — they hold the mistakes the whole statistics side is built
// on — so they are stored, but marked as an unfinished session.
function quitSession() {
    const answered = sessionAnswers.length;

    const message = answered === 0
        ? "End this session? Nothing has been answered yet, so no result will be saved."
        : "End this session now? Your " + answered + " answer" + (answered !== 1 ? "s" : "") +
          " will be saved to your history and marked as ended early.";

    if (!confirm(message)) return;

    if (timerEnabled) stopTimer();

    // With nothing answered there is no result worth storing
    if (answered === 0) {
        refreshStartScreen();
        showScreen("load");
        return;
    }

    sessionAbandoned = true;
    saveFailed = !saveSessionRecord(activeProfile, buildSessionRecord());
    showResults();
}

// Ends the session: stops the timer, stores the result, shows the summary
function finishSession() {
    if (timerEnabled) stopTimer();

    // saveSessionRecord returns false if the browser refuses to store,
    // which the results screen then tells the user about
    saveFailed = !saveSessionRecord(activeProfile, buildSessionRecord());

    showResults();
}

// Packs everything worth keeping about the finished session into one
// plain object. It has to be plain data because it is stored as JSON.
function buildSessionRecord() {
    const maxScore = getMaxScore();

    return {
        // Time plus a random part, so two records can never share an id
        id: "s-" + Date.now() + "-" + Math.floor(Math.random() * 100000),
        date: new Date().toISOString(),
        profile: activeProfile,
        // Which question source this was played on, so results from the
        // built-in bank and a user's own questions stay apart
        bank: currentBank || BUILTIN_BANK,
        mode: sessionMode,
        score: score,
        maxScore: maxScore,
        percent: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
        correct: correctCount,
        incorrect: incorrectCount,
        // How many were answered, and how many the session set out to ask
        total: sessionAnswers.length,
        planned: sessionQuestions.length,
        abandoned: sessionAbandoned,
        timerEnabled: timerEnabled,
        seconds: elapsedSeconds,
        // Copied rather than referenced, so the next session cannot alter it
        diffStats: {
            1: { correct: diffStats[1].correct, total: diffStats[1].total },
            2: { correct: diffStats[2].correct, total: diffStats[2].total },
            3: { correct: diffStats[3].correct, total: diffStats[3].total }
        },
        answers: sessionAnswers
    };
}
