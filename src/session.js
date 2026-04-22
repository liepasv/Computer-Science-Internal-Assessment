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

// Resets all session counters and starts a new practice session
function startSession() {
    // Reset all session state variables before starting
    currentIndex = 0;
    score = 0;
    correctCount = 0;
    incorrectCount = 0;
    answered = false;
    elapsedSeconds = 0;
    diffStats = {
        1: { correct: 0, total: 0 },
        2: { correct: 0, total: 0 },
        3: { correct: 0, total: 0 }
    };

    // Shuffle all loaded questions and take up to 30 for this session
    const shuffled = shuffle(questions);
    sessionQuestions = shuffled.slice(0, Math.min(30, shuffled.length));

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
        // All questions answered — stop timer and show the results screen
        if (timerEnabled) stopTimer();
        showResults();
    } else {
        renderQuestion();
    }
}
