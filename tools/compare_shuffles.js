// Compares the Fisher–Yates shuffle used in session.js with the common
// shortcut array.sort(() => Math.random() - 0.5).
// Each method shuffles [1, 2, 3] 60,000 times; an unbiased method gives
// each of the 6 orders about 10,000 times.
//
//   node tools/compare_shuffles.js

function fisherYates(array) {           // same algorithm as shuffle() in src/session.js
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function sortShuffle(array) {
    return [...array].sort(function () { return Math.random() - 0.5; });
}

function count(method) {
    const counts = {};
    for (let i = 0; i < 60000; i++) {
        const key = method([1, 2, 3]).join("");
        counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
}

console.log("Engine: Node.js " + process.version + " (V8)");
console.log("Fisher-Yates:      ", JSON.stringify(count(fisherYates)));
console.log("sort(random - 0.5):", JSON.stringify(count(sortShuffle)));
