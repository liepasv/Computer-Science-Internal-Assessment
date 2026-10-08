#!/usr/bin/env python3
"""Builds the CSV files used by the test suite in tests/data/.

The files are generated rather than written by hand so that their
contents are exact and can be rebuilt at any time:

    python3 tools/make_test_data.py

Every file uses the same 10 columns as the real question bank:
id,question,option_a,option_b,option_c,option_d,correct,difficulty,explanation,picture
"""

import csv
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "tests", "data")
HEADER = ["id", "question", "option_a", "option_b", "option_c", "option_d",
          "correct", "difficulty", "explanation", "picture"]


def row(qid, difficulty, correct=1, options=4, text=None, picture=""):
    opts = ["Option A", "Option B", "Option C", "Option D"][:options]
    opts += [""] * (4 - options)
    return [str(qid), text or "Test question %d?" % qid, *opts,
            str(correct), str(difficulty), "Explanation for question %d." % qid, picture]


def write(name, rows, header=True, line_end="\n", final_newline=True):
    path = os.path.join(OUT, name)
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, lineterminator=line_end)
        if header:
            writer.writerow(HEADER)
        writer.writerows(rows)
    if not final_newline:
        with open(path, "rb+") as f:
            f.seek(-len(line_end), os.SEEK_END)
            f.truncate()


def main():
    os.makedirs(OUT, exist_ok=True)

    # 500 valid questions, difficulties 1-3 and correct options 1-4 in turn
    write("valid_500.csv", [row(i, (i - 1) % 3 + 1, (i - 1) % 4 + 1) for i in range(1, 501)])

    # 7 valid rows and 3 invalid ones: empty question text,
    # correct = 5 (no such option) and difficulty written as a word
    mixed = [row(i, (i - 1) % 3 + 1) for i in range(1, 8)]
    mixed.insert(2, row(101, 1, text=" "))
    mixed.insert(5, row(102, 2, correct=5))
    bad = row(103, 1)
    bad[7] = "Hard"
    mixed.append(bad)
    write("mixed_10.csv", mixed)

    # Exactly 30 questions: 10 Easy, 10 Medium, 10 Hard -> maximum 60 points
    write("fixed_30.csv", [row(i, (i - 1) // 10 + 1, (i - 1) % 4 + 1) for i in range(1, 31)])

    # Fewer than 30 questions available
    write("small_10.csv", [row(i, (i - 1) % 3 + 1) for i in range(1, 11)])

    # Parser edge cases: a comma, a line break and escaped quotes inside fields
    quoted = [
        row(1, 1, text="If a road is wet, icy or snowy, what must you do?"),
        row(2, 2, text="What does this sign mean?\n(look carefully)"),
        row(3, 3, text='The sign ""Cyclists"" warns of what?'.replace('""', '"')),
    ]
    write("quoted.csv", quoted)
    write("quoted_crlf.csv", quoted, line_end="\r\n")
    write("quoted_no_final_newline.csv", quoted, final_newline=False)

    # A custom bank whose questions use pictures; two of the three files
    # exist in tests/data/images, the third is missing on purpose
    write("with_images.csv", [
        row(1, 1, picture="sign1.jpg"),
        row(2, 2, picture="sign2.jpg"),
        row(3, 3, picture="missing.jpg"),
    ])

    img_dir = os.path.join(OUT, "images")
    os.makedirs(img_dir, exist_ok=True)
    shutil.copyfile(os.path.join(ROOT, "assets", "2.jpg"), os.path.join(img_dir, "sign1.jpg"))
    shutil.copyfile(os.path.join(ROOT, "assets", "5.jpg"), os.path.join(img_dir, "sign2.jpg"))

    # Error handling: a completely empty file and a header with no rows
    open(os.path.join(OUT, "empty.csv"), "w").close()
    write("header_only.csv", [])

    print("Test data written to", OUT)


if __name__ == "__main__":
    main()
