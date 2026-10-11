// Stress test for the question generators in index.html.
// Run from the repo root:  node tests/check.js
// Generates thousands of questions from every template and checks that each one
// is well formed: a finite answer, five distinct choices, the answer among them,
// probabilities inside [0, 1], and no broken text (NaN, undefined, bad ordinals).

const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const start = html.indexOf("/* ---------- math + random helpers");
const end = html.indexOf("/* ---------- persistence");
if (start < 0 || end < 0) throw new Error("Could not find the generator code in index.html");
const { TEMPLATES, buildChoices } = new Function(
  html.slice(start, end) + "\nreturn { TEMPLATES, buildChoices };"
)();

const PER_TEMPLATE = Number(process.argv[2]) || 2000;
let questions = 0, failures = 0;

for (const topic of Object.keys(TEMPLATES)) {
  for (const tpl of TEMPLATES[topic]) {
    const problems = new Set();
    for (let i = 0; i < PER_TEMPLATE; i++) {
      let p;
      try { p = tpl.gen(); } catch (e) { problems.add("threw: " + e.message); continue; }
      questions++;
      const text = p.stem + " " + p.steps.join(" ");
      if (!Number.isFinite(p.answer)) problems.add("answer is not a finite number");
      if (p.prob && (p.answer < 0 || p.answer > 1)) problems.add("probability outside [0, 1]");
      for (const bad of ["NaN", "undefined", "Infinity"]) if (text.includes(bad)) problems.add(`text contains ${bad}`);
      if (/\b(\d*[02-9])?(1th|2th|3th)\b/.test(text) || /\b1[123](st|nd|rd)\b/.test(text)) problems.add("bad ordinal");
      const { choices, correctIndex } = buildChoices(p);
      if (choices.length !== 5) problems.add(`${choices.length} choices instead of 5`);
      if (new Set(choices).size !== choices.length) problems.add("duplicate choices");
      if (correctIndex < 0) problems.add("correct answer missing from choices");
      if (choices.some((c) => /^-0\.0+$/.test(c))) problems.add("negative zero displayed");
    }
    const status = problems.size ? "FAIL" : "ok  ";
    if (problems.size) failures++;
    console.log(`${status} ${topic.padEnd(5)} ${tpl.id.padEnd(12)} ${[...problems].join("; ")}`);
  }
}

console.log(`\n${questions.toLocaleString()} questions generated, ${failures} template(s) with problems.`);
process.exit(failures ? 1 : 0);
