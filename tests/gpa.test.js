// ============================================================
// gpa.test.js — run with:  node tests/gpa.test.js
// No test framework. Validates the GPA math against
// hand-calculated values and edge cases.
// ============================================================

const GPA = require("../js/gpa.js");

let passed = 0;
let failed = 0;

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    console.log(`  ✔ ${label}`);
  } else {
    failed++;
    console.log(`  ✘ ${label}`);
    console.log(`      expected: ${JSON.stringify(expected)}`);
    console.log(`      actual:   ${JSON.stringify(actual)}`);
  }
}

const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

function checkClose(label, actual, expected) {
  if (actual === null || !close(actual, expected)) {
    failed++;
    console.log(`  ✘ ${label} (expected ~${expected}, got ${actual})`);
  } else {
    passed++;
    console.log(`  ✔ ${label}`);
  }
}

console.log("\nRunning GPA math tests…\n");

// ---- semesterGPA ----
console.log("semesterGPA:");
// Hand-calculated (IIUI scale): (3×4.0 + 4×3.5 + 3×2.0) / 10 = 32/10 = 3.2
const sem1 = GPA.semesterGPA([
  { name: "DSA", grade: "A", credits: 3 },
  { name: "DSA Lab", grade: "B+", credits: 4 },
  { name: "Islamiat", grade: "C", credits: 3 },
]);
checkClose("mixed grades → 3.2", sem1.gpa, 3.2);
check("quality points sum", sem1.qualityPoints, 3 * 4 + 4 * 3.5 + 3 * 2);
check("credits sum", sem1.credits, 10);

check("empty semester → gpa null", GPA.semesterGPA([]).gpa, null);
check("empty semester → 0 credits", GPA.semesterGPA([]).credits, 0);

// ---- cgpa ----
console.log("\ncgpa:");
const semesters = [
  { name: "S1", courses: [{ grade: "A", credits: 15 }] }, // 4.0 × 15
  { name: "S2", courses: [{ grade: "B", credits: 15 }] }, // 3.0 × 15
];
// (60 + 45) / 30 = 3.5
checkClose("two semesters → 3.5", GPA.cgpa(semesters).cgpa, 3.5);
check("total credits 30", GPA.cgpa(semesters).credits, 30);
check("no semesters → null", GPA.cgpa([]).cgpa, null);

// ---- cgpaTrajectory ----
console.log("\ncgpaTrajectory:");
const traj = GPA.cgpaTrajectory(semesters);
checkClose("after S1 → 4.0", traj[0], 4.0);
checkClose("after S2 → 3.5", traj[1], 3.5);

// Trajectory must always end at the full CGPA
checkClose("trajectory ends at cgpa", traj[traj.length - 1], GPA.cgpa(semesters).cgpa);

// ---- requiredGPA (the simulator math) ----
console.log("\nrequiredGPA:");
// Current: 2.7 over 20 cr (QP = 54). Target 3.0 with 40 cr left:
// (3.0 × 60 − 54) / 40 = 126/40 = 3.15
checkClose("2.7 → 3.0 needs 3.15", GPA.requiredGPA(3.0, 20, 54, 40), 3.15);

// Impossible: fresh-ish start, huge target, few credits
// (4.0 × (2 + 3) − 0)/3 = 6.67 > 4 → null
check("impossible target → null", GPA.requiredGPA(4.0, 2, 0, 3), null);

// Already achieved: 3.9 over 30 cr (QP = 117), target 2.0 with 10 cr left.
// (2.0 × 40 − 117) / 10 = −3.7 → clamps to 0 (even a 0.0 keeps you above)
check("already achieved → 0", GPA.requiredGPA(2.0, 30, 117, 10), 0);

// Zero remaining credits → null (nothing left to take)
check("zero remaining credits → null", GPA.requiredGPA(3.0, 20, 54, 0), null);

// Fresh start: 0 credits so far, target 3.5 → exactly 3.5 needed
checkClose("fresh start needs target itself", GPA.requiredGPA(3.5, 0, 0, 80), 3.5);

// ---- grade scale sanity ----
console.log("\ngrade scale (IIUI):");
check("A = 4.0", GPA.gradePoint("A"), 4);
check("B+ = 3.5", GPA.gradePoint("B+"), 3.5);
check("D+ = 1.5", GPA.gradePoint("D+"), 1.5);
check("D = 1.0", GPA.gradePoint("D"), 1);
check("F = 0.0", GPA.gradePoint("F"), 0);
check("unknown grade = undefined", GPA.gradePoint("Z"), undefined);
check("A- is not on the IIUI scale", GPA.gradePoint("A-"), undefined);

// ---- gradeFromMarks (IIUI marks → letter grade) ----
console.log("\ngradeFromMarks:");
check("100 → A", GPA.gradeFromMarks(100), "A");
check("80 → A (boundary)", GPA.gradeFromMarks(80), "A");
check("79.99 → B+", GPA.gradeFromMarks(79.99), "B+");
check("75 → B+ (boundary)", GPA.gradeFromMarks(75), "B+");
check("70 → B (boundary)", GPA.gradeFromMarks(70), "B");
check("65 → C+ (boundary)", GPA.gradeFromMarks(65), "C+");
check("60 → C (boundary)", GPA.gradeFromMarks(60), "C");
check("55 → D+ (boundary)", GPA.gradeFromMarks(55), "D+");
check("50 → D (boundary)", GPA.gradeFromMarks(50), "D");
check("49.99 → F", GPA.gradeFromMarks(49.99), "F");
check("0 → F", GPA.gradeFromMarks(0), "F");
check("negative marks → null", GPA.gradeFromMarks(-5), null);
check("marks over 100 → null", GPA.gradeFromMarks(101), null);
check("non-numeric marks → null", GPA.gradeFromMarks("eighty"), null);

// ---- Summary ----
console.log("");
if (failed === 0) {
  console.log(`✅ All ${passed} checks passed!\n`);
  process.exit(0);
} else {
  console.log(`❌ ${failed} of ${passed + failed} checks failed.\n`);
  process.exit(1);
}
