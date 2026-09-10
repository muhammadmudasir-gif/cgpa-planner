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
  // Standard 4.0 grade scale. Universities vary slightly —
  // edit this map to match your own university's scale.
  const GRADE_POINTS = {
    A: 4.0,
    "A-": 3.7,
    "B+": 3.3,
    B: 3.0,
    "B-": 2.7,
    "C+": 2.3,
    C: 2.0,
    "C-": 1.7,
    "D+": 1.3,
    D: 1.0,
    F: 0.0,
  };

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

  return { GRADE_POINTS, gradePoint, qualityPoints, semesterGPA, cgpa, cgpaTrajectory, requiredGPA };
});
