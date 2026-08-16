#!/usr/bin/env python3
"""Build database/db.en.csv from the Lithuanian bank plus translation batches.

Only the wording comes from the translation files. Every structural
column - id, correct, difficulty, picture - is copied from db.lt.csv, so
a translation cannot move the correct answer or point at a missing
picture. Option counts are checked against the source for the same
reason.

Usage:
    python3 tools/build_en_bank.py            # build and verify
    python3 tools/build_en_bank.py --verify   # verify an existing build
"""

import csv
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "database", "db.lt.csv")
OUT = os.path.join(ROOT, "database", "db.en.csv")
BATCH_DIR = os.path.join(ROOT, "tools", "translations")
HEADER = ["id", "question", "option_a", "option_b", "option_c", "option_d",
          "correct", "difficulty", "explanation", "picture"]


def read_source():
    with open(SRC, encoding="utf-8-sig") as f:
        rows = [r for r in list(csv.reader(f))[1:] if any(c.strip() for c in r)]
    return [[c.strip() for c in (r + [""] * 10)[:10]] for r in rows]


def read_batches():
    """Merges every batch file into one {id: translation} mapping."""
    merged = {}
    if not os.path.isdir(BATCH_DIR):
        return merged

    for name in sorted(os.listdir(BATCH_DIR)):
        if not name.endswith(".json"):
            continue
        with open(os.path.join(BATCH_DIR, name), encoding="utf-8") as f:
            batch = json.load(f)
        for qid, entry in batch.items():
            if qid in merged:
                raise SystemExit("question %s translated twice (%s)" % (qid, name))
            merged[qid] = entry
    return merged


def build():
    source = read_source()
    translations = read_batches()

    rows = []
    problems = []

    for row in source:
        qid, correct, difficulty, picture = row[0], row[6], row[7], row[9]
        filled = [i for i in (2, 3, 4, 5) if row[i]]

        entry = translations.get(qid)
        if entry is None:
            problems.append("%s: not translated" % qid)
            continue

        options = entry.get("o", [])
        if len(options) != len(filled):
            problems.append("%s: %d options translated, source has %d"
                            % (qid, len(options), len(filled)))
            continue
        if not entry.get("q", "").strip():
            problems.append("%s: empty question" % qid)
            continue

        out = [""] * 10
        out[0] = qid
        out[1] = entry["q"].strip()
        for slot, text in zip(filled, options):
            out[slot] = str(text).strip()
        out[6] = correct
        out[7] = difficulty
        out[8] = entry.get("e", "").strip()
        out[9] = picture
        rows.append(out)

    if problems:
        print("NOT BUILT - %d problems:" % len(problems))
        for p in problems[:20]:
            print("  ", p)
        if len(problems) > 20:
            print("   ... and %d more" % (len(problems) - 20))
        return False

    with open(OUT, "w", encoding="utf-8", newline="\r\n") as f:
        writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
        writer.writerow(HEADER)
        writer.writerows(rows)

    print("built %s with %d questions" % (os.path.relpath(OUT, ROOT), len(rows)))
    return True


def verify():
    """Checks the built file against the Lithuanian one, field by field."""
    source = read_source()
    with open(OUT, encoding="utf-8-sig") as f:
        target = [[c.strip() for c in (r + [""] * 10)[:10]]
                  for r in list(csv.reader(f))[1:] if any(c.strip() for c in r)]

    errors = []
    if len(source) != len(target):
        errors.append("row count %d vs %d" % (len(source), len(target)))

    assets = set(os.listdir(os.path.join(ROOT, "assets")))
    by_id = {r[0]: r for r in target}

    for row in source:
        qid = row[0]
        other = by_id.get(qid)
        if other is None:
            errors.append("%s: missing in English file" % qid)
            continue
        for index, name in ((6, "correct"), (7, "difficulty"), (9, "picture")):
            if row[index] != other[index]:
                errors.append("%s: %s differs (%r vs %r)" % (qid, name, row[index], other[index]))
        for index in (2, 3, 4, 5):
            if bool(row[index]) != bool(other[index]):
                errors.append("%s: option %d filled in one file only" % (qid, index - 1))
        if not other[1]:
            errors.append("%s: empty question text" % qid)
        if other[9] and other[9] not in assets:
            errors.append("%s: picture %s not in assets" % (qid, other[9]))
        # the correct option must exist, which is what csv.js also demands
        correct = int(row[6])
        if not other[correct + 1]:
            errors.append("%s: correct option %d is empty" % (qid, correct))

    untranslated = [r[0] for r in target
                    if by_id[r[0]][1] == dict((s[0], s) for s in source)[r[0]][1]]

    print("questions: %d" % len(target))
    if errors:
        print("FAILED - %d problems:" % len(errors))
        for e in errors[:25]:
            print("  ", e)
        return False

    print("structure matches db.lt.csv exactly")
    if untranslated:
        print("note: %d questions still read identically in both files: %s"
              % (len(untranslated), ", ".join(untranslated[:15])))
    return True


if __name__ == "__main__":
    ok = True
    if "--verify" not in sys.argv:
        ok = build()
    if ok:
        ok = verify()
    sys.exit(0 if ok else 1)
