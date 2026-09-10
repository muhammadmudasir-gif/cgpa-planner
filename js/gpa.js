// ============================================================
// gpa.js — pure GPA math. Zero DOM, zero storage.
//
// Separated from app.js for the same reason as in the
// algorithm-visualizer: the math can be unit-tested in Node,
// and the UI code stays clean. Same algorithm works in the
// browser (window.GPA) and in the tests (module.exports).
// ============================================================

(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory(); // Node (tests)
  } else {
    window.GPA = factory(); // Browser
  }
})(this, function () {
  // IIUI (International Islamic University Islamabad) grade
  // scale, as per the official Academic Regulations. This is
  // the standard Pakistani 0–4 scale — no minus grades.
  const GRADE_POINTS = {
    A: 4.0,
    "B+": 3.5,
    B: 3.0,
    "C+": 2.5,
    C: 2.0,
    "D+": 1.5,
    D: 1.0,
    F: 0.0,
  };

  // Marks range for each grade (for the UI + docs).
  const GRADE_MARKS = {
    A: "80–100%",
    "B+": "75–79.99%",
    B: "70–74.99%",
    "C+": "65–69.99%",
    C: "60–64.99%",
    "D+": "55–59.99%",
    D: "50–54.99%",
    F: "below 50%",
  };

  // IIUI marks → letter grade. Marks are percentages (0–100).
  // Returns null for invalid input (out of range or not a number).
  function gradeFromMarks(marks) {
    if (typeof marks !== "number" || Number.isNaN(marks) || marks < 0 || marks > 100) return null;
    if (marks >= 80) return "A";
    if (marks >= 75) return "B+";
    if (marks >= 70) return "B";
    if (marks >= 65) return "C+";
    if (marks >= 60) return "C";
    if (marks >= 55) return "D+";
    if (marks >= 50) return "D";
    return "F";
  }

  const gradePoint = (grade) => GRADE_POINTS[grade];

  // Quality points for one course = credits × grade point.
  // This is the core of every GPA calculation.
  const qualityPoints = (credits, grade) => credits * gradePoint(grade);

  // GPA of one semester's courses.
  // Returns { gpa, credits, qualityPoints }; gpa is null if
  // the semester has no credits (division by zero is not GPA).
  function semesterGPA(courses) {
    let credits = 0;
    let qp = 0;
    for (const c of courses) {
      credits += c.credits;
      qp += qualityPoints(c.credits, c.grade);
    }
    return {
      gpa: credits > 0 ? qp / credits : null,
      credits,
      qualityPoints: qp,
    };
  }

  // CGPA across all semesters: total quality points / total credits.
  function cgpa(semesters) {
    let credits = 0;
    let qp = 0;
    for (const sem of semesters) {
      const s = semesterGPA(sem.courses);
      credits += s.credits;
      qp += s.qualityPoints;
    }
    return {
      cgpa: credits > 0 ? qp / credits : null,
      credits,
      qualityPoints: qp,
    };
  }

  // Running CGPA after each semester — for the chart line.
  function cgpaTrajectory(semesters) {
    let credits = 0;
    let qp = 0;
    return semesters.map((sem) => {
      const s = semesterGPA(sem.courses);
      credits += s.credits;
      qp += s.qualityPoints;
      return credits > 0 ? qp / credits : null;
    });
  }

  // ---- The what-if simulator ----
  // You currently have `qualityPoints` over `credits` hours.
  // If you take `remainingCredits` more hours, what average GPA
  // do you need so your final CGPA hits `target`?
  //
  //   (qp + g × R) / (credits + R) = target
  //   g = (target × (credits + R) − qp) / R
  //
  // Returns the required GPA, or null if it's impossible
  // (would need more than 4.0).
  function requiredGPA(target, credits, qualityPoints, remainingCredits) {
    if (!remainingCredits || remainingCredits <= 0) return null;
    const g = (target * (credits + remainingCredits) - qualityPoints) / remainingCredits;
    if (g > 4.0) return null; // impossible, even with straight A's
    return Math.max(0, g); // already achieved → any passing GPA keeps it
  }

  return { GRADE_POINTS, GRADE_MARKS, gradePoint, gradeFromMarks, qualityPoints, semesterGPA, cgpa, cgpaTrajectory, requiredGPA };
});
