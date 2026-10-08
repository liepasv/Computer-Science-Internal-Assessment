// ============================================================
// record_video.js — records the IA demonstration video.
//
//   node tools/record_video.js <output-folder>
//
// Drives the real application in Chromium and records the screen.
// For every success criterion a caption first names the criterion,
// then the app is used to show it working; test numbers (F1–F24,
// S1–S31) refer to the test plan in Criterion C. A red dot shows
// where the mouse clicks and a badge shows each key press, because
// a recording made this way has no visible cursor.
// The result is a .webm file, converted to MP4 with ffmpeg.
// ============================================================

const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "tests", "data");
const OUT = path.resolve(process.argv[2] || ".");
const PORT = 8795;
const BASE = "http://localhost:" + PORT;
const SIZE = { width: 1280, height: 720 };

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".csv": "text/csv",
                ".jpg": "image/jpeg", ".png": "image/png", ".json": "application/json" };
function serve() {
    return new Promise(function (done) {
        const server = http.createServer(function (req, res) {
            const file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
            if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
            res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
            fs.createReadStream(file).pipe(res);
        });
        server.listen(PORT, function () { done(server); });
    });
}

const wait = ms => new Promise(r => setTimeout(r, ms));
let page;

// ----- overlays: caption bar, click marker, key badge -----
async function overlays() {
    await page.evaluate(function () {
        if (document.getElementById("__cap")) return;
        const style = document.createElement("style");
        style.textContent =
            "#__cap{position:fixed;left:0;right:0;bottom:0;z-index:99999;background:rgba(17,24,39,.92);color:#fff;" +
            "font:16px/1.4 Arial,sans-serif;padding:10px 24px;pointer-events:none;transition:opacity .3s}" +
            "#__cap b{display:block;font-size:20px;color:#93c5fd;margin-bottom:2px}" +
            "#__cap.side{left:14px;right:auto;bottom:auto;top:50%;transform:translateY(-50%);width:262px;border-radius:12px;padding:16px 18px;font-size:17px}" +
            "#__cap.side b{font-size:19px;margin-bottom:8px}" +
            "#__dot{position:fixed;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(220,38,38,.55);" +
            "border:2px solid #b91c1c;z-index:99998;pointer-events:none;transition:left .45s,top .45s;left:640px;top:360px}" +
            "#__key{position:fixed;right:24px;top:20px;z-index:99999;background:#111827;color:#fff;font:bold 22px Arial;" +
            "padding:8px 16px;border-radius:10px;opacity:0;transition:opacity .2s;pointer-events:none}";
        document.head.appendChild(style);
        ["__cap", "__dot", "__key"].forEach(function (id) { const d = document.createElement("div"); d.id = id; document.body.appendChild(d); });
        document.getElementById("__cap").style.opacity = 0;
    });
}
// Captions sit in a panel left of the app so they never cover it;
// on full-width pages (test results) they use a bar at the bottom.
// The pause grows with the length of the text so it can be read.
let captionMode = "side";
async function caption(title, text, ms) {
    await overlays();
    await page.evaluate(function (a) {
        const c = document.getElementById("__cap");
        c.className = a[2];
        c.innerHTML = "<b></b><span></span>";
        c.firstChild.textContent = a[0]; c.lastChild.textContent = a[1];
        c.style.opacity = 1;
    }, [title, text, captionMode]);
    const words = (title + " " + text).split(/\s+/).length;
    await wait(Math.max(ms || 2500, 160 * words));
}
async function click(selector, pause) {
    await overlays();
    const el = page.locator(selector).first();
    await el.scrollIntoViewIfNeeded();
    const box = await el.boundingBox();
    await page.evaluate(function (p) {
        const d = document.getElementById("__dot"); d.style.left = p[0] + "px"; d.style.top = p[1] + "px";
    }, [box.x + box.width / 2, box.y + box.height / 2]);
    await wait(500);
    await el.click();
    await wait(pause === undefined ? 700 : pause);
}
async function key(k, pause) {
    await overlays();
    await page.evaluate(function (k) {
        const b = document.getElementById("__key"); b.textContent = "⌨ " + k; b.style.opacity = 1;
        clearTimeout(window.__kt); window.__kt = setTimeout(function () { b.style.opacity = 0; }, 600);
    }, k === " " ? "Space" : k);
    await page.keyboard.press(k);
    await wait(pause === undefined ? 700 : pause);
}
async function scrollTo(selector) {
    await page.evaluate(function (s) { document.querySelector(s).scrollIntoView({ behavior: "smooth", block: "center" }); }, selector);
    await wait(900);
}
async function scrollTop() { await page.evaluate(function () { window.scrollTo({ top: 0, behavior: "smooth" }); }); await wait(700); }
async function upload(selector, files, label) {
    await caption(label[0], label[1], 1500);
    await page.setInputFiles(selector, files);
    await wait(1500);
}
async function card(lines, ms) {
    await page.setContent("<html><body style='margin:0;background:#1f3a68;color:#fff;font-family:Arial;display:flex;align-items:center;justify-content:center;height:100vh'>" +
        "<div style='text-align:center;max-width:1000px'>" + lines.map(function (l, i) {
            return "<div style='font-size:" + (i === 0 ? 40 : 22) + "px;margin:" + (i === 0 ? "0 0 24px" : "6px 0") + ";" + (i === 0 ? "font-weight:bold" : "") + "'>" + l + "</div>";
        }).join("") + "</div></body></html>");
    await wait(ms);
}
// The correct option of the question on screen, read from the CSV the
// tests use (only for the generated files, which have no quoted commas)
function keyFor(file) {
    const k = {};
    fs.readFileSync(file, "utf8").split(/\r?\n/).slice(1).filter(Boolean).forEach(function (l) {
        const f = l.split(","); k[f[1]] = { correct: +f[6], difficulty: +f[7] };
    });
    return k;
}
const fixedKey = keyFor(path.join(DATA, "fixed_30.csv"));
async function current() { return fixedKey[await page.textContent("#question-text")]; }
const letter = n => ["a", "b", "c", "d"][n - 1];
// After "End session early" the app shows results (if anything was
// answered) or goes straight back to the start screen
async function backToStart() {
    if (await page.isVisible("#screen-results")) await click("#restart-btn");
}


(async function main() {
    const server = await serve();
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: SIZE, recordVideo: { dir: OUT, size: SIZE } });
    page = await context.newPage();
    page.on("dialog", function (d) { d.accept(); });
    const t0 = Date.now();

    // ----- Title -----
    await card(["Driving Theory Practice", "IB Diploma Programme Computer Science — Internal Assessment video",
                "Candidate: Liepa Šveikauskaitė", "Each success criterion (CfS) is named first, then shown working in the real application.",
                "Test numbers (F = functional, S = structural) refer to the test plan in Criterion C."], 5500);

    // ----- CfS 1: CSV import -----
    await page.goto(BASE + "/index.html");
    await page.waitForSelector("#load-status:not(.hidden)");
    await caption("CfS 1 — CSV import (test F1)", "On start-up the built-in bank (database/db.en.csv) is loaded and the number of valid questions is reported.", 4000);
    await click("#mode-custom");
    await upload("#custom-csv-input", path.join(DATA, "mixed_10.csv"),
        ["CfS 1 — invalid rows are skipped (test F2)", "File selected: tests/data/mixed_10.csv — 7 valid rows and 3 invalid ones."]);
    await caption("CfS 1 — invalid rows are skipped (test F2)", "7 questions loaded, 3 invalid rows skipped and reported; the session can start.", 3500);

    // ----- Reliability -----
    await upload("#custom-csv-input", path.join(DATA, "empty.csv"),
        ["Reliability — invalid file (test F16)", "File selected: tests/data/empty.csv (0 bytes)."]);
    await caption("Reliability — invalid file (test F16)", "Error message, Start stays disabled, the app does not crash.", 3000);
    await upload("#custom-csv-input", path.join(DATA, "fixed_30.csv"),
        ["Reliability — retry (test F16)", "A valid file can be chosen straight away: tests/data/fixed_30.csv (10 Easy, 10 Medium, 10 Hard)."]);
    await wait(1000);

    // ----- CfS 6 timer on, CfS 2/3/4/5 in a session -----
    await caption("CfS 6 — optional timer", "The timer is switched on before the session starts.", 1500);
    await click("#timer-toggle");
    await click("#start-btn");
    await caption("CfS 2 — 30 unique questions in random order (test F3)", "“Question 1 of 30”; the order is shuffled with Fisher–Yates. The timer starts at 0:00 (CfS 6).", 3500);
    let q = await current();
    await caption("CfS 3 — difficulty and weighted scoring (test F6)", "The difficulty is shown above the question. A correct answer scores 1 (Easy), 2 (Medium) or 3 (Hard) points.", 2500);
    await click('#answer-buttons button[data-index="' + q.correct + '"]', 1200);
    await caption("CfS 4 — immediate feedback (test F8)", "Correct: the option turns green, “✓ Correct!”, the explanation is shown and the score rises by the question's points.", 4000);
    await click("#next-btn");
    q = await current();
    await click('#answer-buttons button[data-index="' + (q.correct % 4 + 1) + '"]', 1200);
    await caption("CfS 4 — immediate feedback (test F7)", "Wrong: the chosen option is red, the correct one green, all options are locked; the score does not change.", 4500);
    await click("#next-btn");
    await caption("Accessibility — keyboard only (tests F17, S18–S20)", "Keys A–D answer, Enter or Space moves on. The key hint is shown on every question (F15).", 2500);
    for (let i = 0; i < 4; i++) {
        q = await current();
        await key(letter(q.correct), 900);
        await key("Enter", 700);
    }
    await caption("CfS 2 and 5 — the rest of the session", "The remaining questions are answered quickly: all Hard and Medium ones correctly, the Easy ones wrongly.", 1500);
    while (await page.isVisible("#screen-quiz")) {
        q = await current();
        await key(letter(q.difficulty === 1 ? q.correct % 4 + 1 : q.correct), 250);
        await key("Enter", 250);
    }

    // ----- CfS 5, 6, 7: results -----
    await wait(500);
    await caption("CfS 5 and 7 — results (tests F9, F12)", "Total score and percentage of the points available, correct and incorrect counts, correct/total and % per difficulty.", 5000);
    await caption("CfS 6 — time taken (test F10)", "The time from the first question to the end, to the second.", 3000);
    await scrollTo("#restart-btn");

    // ----- CfS 8: restart -----
    await caption("CfS 8 — restart without reloading (test F13)", "“Start New Session” returns to the start screen; Start reshuffles and resets every counter and the timer.", 2500);
    await click("#restart-btn");
    await click("#start-btn");
    await caption("CfS 8 — restart without reloading (test F13)", "“Question 1 of 30”, score 0, timer 0:00 — the page was not reloaded.", 3500);
    for (let i = 0; i < 3; i++) {
        q = await current();
        await click('#answer-buttons button[data-index="' + q.correct + '"]', 300);
        await click("#next-btn", 300);
    }
    await caption("CfS 7 — ending a session early (test F23)", "After 3 answers the session is ended with “End session early”; the result covers the questions answered.", 2500);
    await click("#quit-btn", 2000);
    await wait(1500);

    // ----- CfS 9: history and mistakes -----
    await caption("CfS 9 — history (test F20)", "Every session is saved on this device under the profile name: statistics, a progress chart and the most-missed questions.", 2000);
    await click("#results-history-btn", 2500);
    await scrollTo("#history-content h3:nth-of-type(2)");
    await wait(2500);
    await scrollTo("[data-review]");
    await click("[data-review]", 3000);
    await caption("CfS 9 — practise my mistakes (test F20)", "A session made only of the questions answered wrongly before; its button shows how many there are.", 2000);
    await scrollTop();
    await click("#history-back-btn");
    await click("#drill-btn");
    await wait(2500);
    await click("#quit-btn", 2500);
    await backToStart();

    // ----- CfS 10: own bank with images -----
    await scrollTop();
    await caption("CfS 10 — own question bank with own pictures (test F21)", "Images sign1.jpg and sign2.jpg are selected, then with_images.csv, which also names missing.jpg.", 2000);
    await page.setInputFiles("#custom-images-input", [path.join(DATA, "images", "sign1.jpg"), path.join(DATA, "images", "sign2.jpg")]);
    await wait(1200);
    await page.setInputFiles("#custom-csv-input", path.join(DATA, "with_images.csv"));
    await wait(1500);
    await caption("CfS 10 — own question bank with own pictures (test F21)", "3 questions loaded; the missing picture is named so the user can fix it.", 3500);
    await click("#start-btn");
    for (let i = 0; i < 3; i++) {
        if (await page.isVisible("#question-image")) { await caption("CfS 10 — own pictures (test F21)", "A picture chosen by the user is shown with its question.", 3000); break; }
        await click("#answer-buttons button >> nth=0", 300); await click("#next-btn", 300);
    }
    await click("#quit-btn", 1800);
    await backToStart();

    // ----- Usability: language -----
    await click("#mode-builtin", 1500);
    await caption("Usability — Lithuanian and English (test F22)", "The interface and the built-in bank switch to Lithuanian; the same question ids keep the history.", 1500);
    await click("#lang-lt", 2500);
    await click("#start-btn", 3000);
    await click("#quit-btn", 1500);
    await backToStart();
    await click("#lang-en", 1500);

    // ----- Testing examples -----
    await card(["Examples of testing", "1. Structural tests S1–S31 running inside the real application (tests/test.html)",
                "2. Working without an internet connection (test F24)", "3. Results of all functional tests F1–F24 (tests/results.json)"], 4000);
    captionMode = "bottom";
    await page.goto(BASE + "/tests/test.html");
    await page.addStyleTag({ content: "body{padding-bottom:120px}" });
    await overlays();
    await caption("Structural tests (tests/test.html)", "Each major function is called with valid, extreme and invalid data while the app runs in the frame below.", 1000);
    await page.waitForFunction(function () { return window.testsFinished === true; }, null, { timeout: 120000 });
    await caption("Structural tests: " + await page.textContent("#summary"), "S4 found the escaped-quote defect in csv.js; it failed on commit 12a16ba and passes after the fix.", 3500);
    await page.evaluate(function () { window.scrollTo({ top: 0 }); });
    for (let y = 0; y < 6; y++) { await page.mouse.wheel(0, 260); await wait(700); }

    // Offline: every request that leaves the computer is blocked
    captionMode = "side";
    await page.route("**/*", function (route) { return route.request().url().startsWith(BASE) ? route.continue() : route.abort(); });
    await page.goto(BASE + "/index.html");
    await page.waitForSelector("#load-status:not(.hidden)");
    await caption("Reliability — no internet connection (test F24)", "All requests outside this computer are blocked. Only the start screen shows and the bank loads (before the fix all four screens appeared).", 3500);
    await click("#start-btn");
    q = await page.textContent("#question-progress");
    await click("#answer-buttons button >> nth=0", 2500);
    await page.unroute("**/*");

    // Functional results table
    const results = JSON.parse(fs.readFileSync(path.join(ROOT, "tests", "results.json"), "utf8"));
    const rows = results.functional.slice().sort(function (a, b) { return +a.id.slice(1) - +b.id.slice(1); }).map(function (r) {
        const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
        return "<tr><td>" + r.id + "</td><td>" + esc(r.criterion) + "</td><td>" + esc(r.actual) + "</td><td style='color:" + (r.pass ? "#15803d" : "#b91c1c") + ";font-weight:bold'>" + (r.pass ? "Pass" : "Fail") + "</td></tr>";
    }).join("");
    captionMode = "bottom";
    await page.setContent("<html><body style='font:13px Arial;margin:20px 20px 120px'><h2 style='margin:0 0 8px'>Functional tests F1–F24 — tests/results.json (" + results.date.slice(0, 10) + ", " + results.browser + ")</h2>" +
        "<table style='border-collapse:collapse;width:100%'><tr style='background:#e8eef7'><th>No.</th><th>Criterion</th><th>Actual result</th><th>Result</th></tr>" + rows + "</table>" +
        "<style>td,th{border:1px solid #ccc;padding:3px 6px;text-align:left}</style></body></html>");
    await overlays();
    await caption("Functional tests (tests/run_tests.js)", "Each test drives the interface only — clicks, keys and file uploads — and compares the result with the expected outcome.", 4000);
    for (let y = 0; y < 4; y++) { await page.mouse.wheel(0, 220); await wait(1500); }

    await card(["End of demonstration", "All 10 success criteria and the non-functional criteria were shown working,", "with examples of structural and functional testing."], 3000);

    const seconds = (Date.now() - t0) / 1000;
    const video = page.video();
    await context.close();
    const webm = await video.path();
    await browser.close();
    server.close();
    console.log("Recorded " + seconds.toFixed(1) + " s → " + webm);
})();
