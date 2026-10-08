# Tests

| File | What it is |
|---|---|
| `test.html` | Structural (white-box) tests S1–S31. Open it through a local server (`python3 -m http.server`, then `http://localhost:8000/tests/test.html`) and the results table appears in the page. |
| `run_tests.js` | Runs `test.html` and the functional (black-box) tests F1–F23 in Chromium and writes `results.json`. Needs Node.js and the `playwright` package: `node tests/run_tests.js` |
| `data/` | Test CSV files, rebuilt by `python3 tools/make_test_data.py` |
| `results.json` | Results of the last full run |
| `results_before_fix.txt` | The structural tests run against commit `12a16ba`, before the escaped-quote fix in `csv.js` (S4 fails there) |

The functional tests only click, type and upload files, as a user would. The
correct answers are looked up in the CSV file that was loaded, never read from
the application's variables.
