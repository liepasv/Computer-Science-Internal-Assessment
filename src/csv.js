// ============================================================
// csv.js — Data Ingestion & Validation
// Handles reading and validating questions from a CSV file.
// ============================================================

// This function parses the full CSV text into an array of question objects.
// It reads the text character by character so it correctly handles:
//   - commas inside quoted fields
//   - newlines inside quoted fields (some explanations span multiple lines)
// Returns { questions: [...], skipped: N }
function parseCSV(text) {
    // Normalise Windows line endings to Unix style
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Parse the entire text into rows of fields in one pass
    const rows = [];
    let fields = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === '"') {
            // Toggle quote mode — content inside quotes is treated as one field
            inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
            // Comma outside quotes ends the current field
            fields.push(current.trim());
            current = "";
        } else if (char === "\n" && !inQuotes) {
            // Newline outside quotes ends the current row
            fields.push(current.trim());
            current = "";
            // Only save rows that have at least some content
            if (fields.some(function (f) { return f.length > 0; })) {
                rows.push(fields);
            }
            fields = [];
        } else {
            // Any other character (including newlines inside quotes) is added to the field
            current += char;
        }
    }

    // Handle the very last field and row if the file does not end with a newline
    if (current.length > 0 || fields.length > 0) {
        fields.push(current.trim());
        if (fields.some(function (f) { return f.length > 0; })) {
            rows.push(fields);
        }
    }

    // Need at least a header row plus one data row
    if (rows.length < 2) {
        return { questions: [], skipped: 0 };
    }

    // CSV columns (0-based index):
    // 0=id, 1=question, 2=option_a, 3=option_b, 4=option_c, 5=option_d,
    // 6=correct(1-4), 7=difficulty(1-3), 8=explanation, 9=picture

    const parsed = [];
    let skipped = 0;

    // Start at index 1 to skip the header row
    for (let i = 1; i < rows.length; i++) {
        const f = rows[i];

        const q = {
            id:          f[0] || "",
            text:        f[1] || "",
            options:     [f[2] || "", f[3] || "", f[4] || "", f[5] || ""],
            correct:     parseInt(f[6]),   // 1-4: which option is correct
            difficulty:  parseInt(f[7]),   // 1=Easy, 2=Medium, 3=Hard
            explanation: f[8] || "",
            picture:     f[9] || ""
        };

        // Skip rows that do not contain all required fields
        if (!isValidQuestion(q)) {
            skipped++;
            continue;
        }

        parsed.push(q);
    }

    return { questions: parsed, skipped };
}

// Validates that a question object has all the data needed to be used in a session
function isValidQuestion(q) {
    // Question text must not be empty
    if (!q.text || q.text.length === 0) return false;

    // correct must be a number from 1 to 4
    if (isNaN(q.correct) || q.correct < 1 || q.correct > 4) return false;

    // difficulty must be 1, 2, or 3
    if (isNaN(q.difficulty) || q.difficulty < 1 || q.difficulty > 3) return false;

    // The option that is marked as correct must not be empty
    const correctOption = q.options[q.correct - 1];
    if (!correctOption || correctOption.length === 0) return false;

    return true;
}
