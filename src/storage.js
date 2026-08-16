// ============================================================
// storage.js — Local Result Storage
// Saves finished sessions in the browser's own localStorage so
// results accumulate between visits. There is no server and no
// external database: every record stays on this device only.
// ============================================================

// Key names carry a version suffix so the stored format can be changed
// later without breaking data that is already on a user's machine.
const KEY_PROFILES = "dtp.profiles.v1";   // list of known profile names
const KEY_ACTIVE   = "dtp.activeProfile.v1";
const KEY_HISTORY  = "dtp.history.v1";    // real key is KEY_HISTORY + "." + profile

// Keep at most this many sessions per profile. One session is roughly
// 2-6 KB, so 100 sessions stay far below the ~5 MB localStorage limit.
const HISTORY_LIMIT = 100;

// Longest text snippets stored with a mistake. Snippets let the review
// screen work even when no CSV is loaded, while keeping records small.
const SNIPPET_QUESTION = 120;
const SNIPPET_OPTION   = 80;


// ===== LOW-LEVEL HELPERS =====

// Tests whether localStorage can actually be written to.
// It is missing or throws in some private-browsing modes and when a
// page is opened straight from disk, so this must never be assumed.
function isStorageAvailable() {
    try {
        localStorage.setItem("dtp.test", "1");
        localStorage.removeItem("dtp.test");
        return true;
    } catch (e) {
        return false;
    }
}

// Reads and parses a stored value, returning fallback if anything is wrong.
// Corrupted data must never stop the app from starting.
function readJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        const value = JSON.parse(raw);
        return value === null ? fallback : value;
    } catch (e) {
        return fallback;
    }
}

// Writes a value as JSON. Returns false instead of throwing when the
// browser refuses (storage disabled, or the 5 MB quota is full).
function writeJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        return false;
    }
}

// Shortens a string for storage, adding an ellipsis when it was cut
function truncate(text, maxLength) {
    const clean = String(text || "").trim();
    if (clean.length <= maxLength) return clean;
    return clean.slice(0, maxLength - 1) + "…";
}


// ===== PROFILES =====
// A "profile" is just a name typed on the start screen. It lets several
// people share one browser without mixing up their results — no login
// and no accounts are needed, because nothing leaves this device.

// Cleans a typed name so it is safe to use and never empty
function cleanProfileName(name) {
    const clean = String(name || "").trim().slice(0, 30);
    return clean.length > 0 ? clean : "Guest";
}

// Builds the storage key for one profile. encodeURIComponent stops names
// containing a dot from colliding with each other's keys.
function historyKey(profile) {
    return KEY_HISTORY + "." + encodeURIComponent(cleanProfileName(profile));
}

function getActiveProfile() {
    const name = readJSON(KEY_ACTIVE, "");
    return cleanProfileName(name);
}

function setActiveProfile(name) {
    const clean = cleanProfileName(name);
    writeJSON(KEY_ACTIVE, clean);
    rememberProfile(clean);
    return clean;
}

function listProfiles() {
    const list = readJSON(KEY_PROFILES, []);
    return Array.isArray(list) ? list : [];
}

// Adds a name to the list of known profiles if it is not there already
function rememberProfile(name) {
    const clean = cleanProfileName(name);
    const list = listProfiles();
    if (!list.includes(clean)) {
        list.push(clean);
        writeJSON(KEY_PROFILES, list);
    }
}


// ===== SESSION HISTORY =====

// Returns every stored session for a profile, oldest first
function loadHistory(profile) {
    const list = readJSON(historyKey(profile), []);
    if (!Array.isArray(list)) return [];
    // Ignore anything that does not look like a session record
    return list.filter(isValidRecord);
}

// Saves a whole history list, trimming the oldest sessions when needed.
// If the browser still refuses the write (quota full), it keeps halving
// the list and retrying so the newest results are never lost silently.
function saveHistory(profile, list) {
    let toSave = list.slice(-HISTORY_LIMIT);
    while (toSave.length > 0) {
        if (writeJSON(historyKey(profile), toSave)) return true;
        toSave = toSave.slice(Math.ceil(toSave.length / 2));
    }
    return false;
}

// Appends one finished session. Returns false if it could not be saved.
function saveSessionRecord(profile, record) {
    const history = loadHistory(profile);
    history.push(record);
    return saveHistory(profile, history);
}

// Deletes every stored session for one profile
function clearHistory(profile) {
    try {
        localStorage.removeItem(historyKey(profile));
        return true;
    } catch (e) {
        return false;
    }
}

// Checks that a record has the fields the rest of the app relies on.
// This also protects against a hand-edited or outdated import file.
function isValidRecord(record) {
    if (!record || typeof record !== "object") return false;
    if (typeof record.id !== "string" || record.id.length === 0) return false;
    if (typeof record.date !== "string") return false;
    if (typeof record.percent !== "number" || isNaN(record.percent)) return false;
    if (!Array.isArray(record.answers)) return false;
    return true;
}


// ===== STATISTICS ACROSS SESSIONS =====

// Builds per-question statistics from the whole history.
// Statistics are always derived from the stored sessions rather than
// counted separately, so the two can never disagree.
//
// Question ids are only unique inside one bank: the built-in question 5
// and a user's own question 5 are different questions. Counters are
// therefore kept per bank, and a bank can be passed in to look at one
// source on its own. Sessions saved before banks existed came from the
// built-in bank, so that is what a missing value means.
// Returns { key: { qid, bank, seen, wrong, text, difficulty } }
function computeQuestionStats(history, bank) {
    const stats = {};

    history.forEach(function (session) {
        const sessionBank = session.bank || BUILTIN_BANK;
        if (bank && sessionBank !== bank) return;

        const answers = session.answers || [];
        answers.forEach(function (a) {
            // A newline cannot occur in either part, so it is a safe joiner
            const key = sessionBank + "\n" + a.qid;

            if (!stats[key]) {
                stats[key] = { qid: a.qid, bank: sessionBank, seen: 0, wrong: 0,
                               text: "", difficulty: a.difficulty };
            }
            const s = stats[key];
            s.seen++;
            if (!a.ok) {
                s.wrong++;
                // Keep the snippet saved with the most recent mistake
                if (a.text) s.text = a.text;
            }
        });
    });

    return stats;
}

// Returns the questions answered incorrectly at least once, ordered so
// the most frequently missed come first. This is both the "weak spots"
// list and the pool for the "practice my mistakes" mode.
// Pass a bank to restrict the list to that source.
function getWeakQuestions(history, bank) {
    const stats = computeQuestionStats(history, bank);

    return Object.keys(stats)
        .map(function (qid) { return stats[qid]; })
        .filter(function (s) { return s.wrong > 0; })
        .sort(function (a, b) {
            // Most mistakes first; ties broken by the higher error rate
            if (b.wrong !== a.wrong) return b.wrong - a.wrong;
            return (b.wrong / b.seen) - (a.wrong / a.seen);
        });
}

// Overall figures shown as the stat tiles on the history screen
function summariseHistory(history) {
    const summary = {
        sessions: history.length,
        best: 0,
        average: 0,
        last: 0,
        delta: null,          // change against the session before the last one
        answered: 0,
        correct: 0,
        totalSeconds: 0
    };

    if (history.length === 0) return summary;

    let percentSum = 0;
    history.forEach(function (s) {
        percentSum += s.percent;
        if (s.percent > summary.best) summary.best = s.percent;
        summary.answered += s.total || 0;
        summary.correct  += s.correct || 0;
        summary.totalSeconds += s.seconds || 0;
    });

    summary.average = Math.round(percentSum / history.length);
    summary.last = history[history.length - 1].percent;
    if (history.length >= 2) {
        summary.delta = summary.last - history[history.length - 2].percent;
    }

    return summary;
}


// ===== EXPORT / IMPORT =====
// A backup file is the answer to the one real weakness of localStorage:
// clearing the browser's data would otherwise wipe the history.

// Packs every profile into a JSON string ready to be downloaded
function exportAllData() {
    const data = {
        app: "driving-theory-practice",
        version: 1,
        exported: new Date().toISOString(),
        profiles: {}
    };

    listProfiles().forEach(function (name) {
        data.profiles[name] = loadHistory(name);
    });

    return JSON.stringify(data, null, 2);
}

// Merges a previously exported file back into storage.
// Sessions whose id is already stored are skipped, so importing the same
// file twice cannot create duplicates.
// Returns { added, profiles } on success, or null if the file is not ours.
function importAllData(text) {
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        return null;
    }

    if (!data || data.app !== "driving-theory-practice" || !data.profiles) return null;

    let added = 0;
    const touched = [];

    Object.keys(data.profiles).forEach(function (name) {
        const incoming = data.profiles[name];
        if (!Array.isArray(incoming)) return;

        const profile = cleanProfileName(name);
        const merged = loadHistory(profile);

        // Collect the ids already stored so duplicates can be skipped
        const knownIds = {};
        merged.forEach(function (s) { knownIds[s.id] = true; });

        incoming.forEach(function (s) {
            if (isValidRecord(s) && !knownIds[s.id]) {
                merged.push(s);
                knownIds[s.id] = true;
                added++;
            }
        });

        // Keep the list in chronological order after merging
        merged.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });

        saveHistory(profile, merged);
        rememberProfile(profile);
        touched.push(profile);
    });

    return { added: added, profiles: touched };
}
