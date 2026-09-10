// ============================================================
// app.js — UI, localStorage persistence, and the chart.
// All GPA math comes from gpa.js; this file only renders it.
// ============================================================

(function () {
  "use strict";

  // ---- State ----
  const STORAGE_KEY = "cgpa-planner-data-v1";
  let semesters = []; // [{ id, name, courses: [{ name, grade, credits }] }]
  let nextId = 1;

  // ---- Element refs ----
  const $ = (id) => document.getElementById(id);
  const semesterListEl = $("semesterList");
  const semesterNameEl = $("semesterName");
  const addSemesterBtn = $("addSemesterBtn");
  const cgpaValueEl = $("cgpaValue");
  const creditsValueEl = $("creditsValue");
  const semestersValueEl = $("semestersValue");
  const chartEl = $("chart");
  const targetCgpaEl = $("targetCgpa");
  const remainingCreditsEl = $("remainingCredits");
  const simulateBtn = $("simulateBtn");
  const simResultEl = $("simResult");
  const exportBtn = $("exportBtn");
  const importFileEl = $("importFile");
  const resetBtn = $("resetBtn");

  // ---- Persistence (localStorage) ----
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ semesters, nextId }));
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!Array.isArray(data.semesters)) return;
      semesters = data.semesters;
      nextId = data.nextId || semesters.length + 1;
    } catch {
      // corrupted data — start fresh rather than crash
      semesters = [];
    }
  }

  // ---- Helpers ----
  const fmt = (n) => (n === null || isNaN(n) ? "—" : n.toFixed(2));

  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  const GRADE_OPTIONS = Object.keys(GPA.GRADE_POINTS);

  // ---- Rendering ----
  function render() {
    renderSummary();
    renderSemesters();
    drawChart();
    save();
  }

  function renderSummary() {
    const totals = GPA.cgpa(semesters);
    cgpaValueEl.textContent = fmt(totals.cgpa);
    creditsValueEl.textContent = totals.credits;
    semestersValueEl.textContent = semesters.length;
  }

  function renderSemesters() {
    semesterListEl.innerHTML = "";

    if (semesters.length === 0) {
      semesterListEl.appendChild(
        el("p", "hint", "No semesters yet. Add your first one above 👆")
      );
      return;
    }

    semesters.forEach((sem, idx) => {
      const card = el("div", "semester-card");

      // --- header row: name, GPA badge, delete button ---
      const header = el("div", "semester-header");
      const stats = GPA.semesterGPA(sem.courses);
      header.appendChild(el("h3", "", sem.name || `Semester ${idx + 1}`));
      header.appendChild(el("span", "gpa-badge", `GPA: ${fmt(stats.gpa)} · ${stats.credits} cr`));
      const delSem = el("button", "btn small danger", "✕ Delete");
      delSem.addEventListener("click", () => {
        semesters.splice(idx, 1);
        render();
      });
      header.appendChild(delSem);
      card.appendChild(header);

      // --- course rows ---
      const list = el("div", "course-list");
      if (sem.courses.length === 0) {
        list.appendChild(el("p", "hint", "No courses yet."));
      }
      sem.courses.forEach((course, cIdx) => {
        const row = el("div", "course-row");
        row.appendChild(el("span", "course-name", course.name || "Untitled course"));
        row.appendChild(
          el("span", "course-meta", `${course.grade} · ${course.credits} cr · ${GPA.qualityPoints(course.credits, course.grade).toFixed(1)} QP`)
        );
        const delCourse = el("button", "btn small", "✕");
        delCourse.addEventListener("click", () => {
          sem.courses.splice(cIdx, 1);
          render();
        });
        row.appendChild(delCourse);
        list.appendChild(row);
      });
      card.appendChild(list);

      // --- add course form ---
      const form = el("div", "course-form");

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.placeholder = "Course name (e.g. Data Structures)";
      nameInput.maxLength = 60;
      form.appendChild(nameInput);

      const creditsSelect = document.createElement("select");
      [1, 2, 3, 4].forEach((c) => {
        const o = document.createElement("option");
        o.value = c;
        o.textContent = c + " credit" + (c > 1 ? "s" : "");
        creditsSelect.appendChild(o);
      });
      form.appendChild(creditsSelect);

      const gradeSelect = document.createElement("select");
      GRADE_OPTIONS.forEach((g) => {
        const o = document.createElement("option");
        o.value = g;
        o.textContent = `${g} (${GPA.gradePoint(g).toFixed(1)})`;
        gradeSelect.appendChild(o);
      });
      form.appendChild(gradeSelect);

      const addBtn = el("button", "btn primary small", "+ Course");
      addBtn.addEventListener("click", () => {
        sem.courses.push({
          name: nameInput.value.trim(),
          credits: Number(creditsSelect.value),
          grade: gradeSelect.value,
        });
        render();
      });
      form.appendChild(addBtn);

      card.appendChild(form);
      semesterListEl.appendChild(card);
    });
  }

  // ---- Chart (plain canvas, no libraries) ----
  function drawChart() {
    const ctx = chartEl.getContext("2d");
    const W = chartEl.width;
    const H = chartEl.height;
    ctx.clearRect(0, 0, W, H);

    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    // background + grid
    ctx.fillStyle = "#16213a";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#334155";
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px sans-serif";

    const yFor = (gpa) => pad.top + plotH - (gpa / 4) * plotH;
    for (let g = 0; g <= 4; g += 0.5) {
      const y = yFor(g);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
      if (g % 1 === 0) ctx.fillText(g.toFixed(1), 10, y + 4);
    }

    if (semesters.length === 0) {
      ctx.fillStyle = "#64748b";
      ctx.font = "15px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Add semesters to see your progress here", W / 2, H / 2);
      return;
    }

    const n = semesters.length;
    const slot = plotW / n;
    const barW = Math.min(40, slot * 0.5);

    // bars: per-semester GPA
    semesters.forEach((sem, i) => {
      const stats = GPA.semesterGPA(sem.courses);
      const x = pad.left + slot * i + (slot - barW) / 2;
      if (stats.gpa !== null) {
        const y = yFor(stats.gpa);
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(x, y, barW, pad.top + plotH - y);
        ctx.fillStyle = "#e2e8f0";
        ctx.textAlign = "center";
        ctx.fillText(stats.gpa.toFixed(2), x + barW / 2, y - 6);
      }
      // semester label
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(String(i + 1), x + barW / 2, H - pad.bottom + 20);
    });

    // line: running CGPA
    const traj = GPA.cgpaTrajectory(semesters);
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    traj.forEach((v, i) => {
      if (v === null) return;
      const x = pad.left + slot * i + slot / 2;
      const y = yFor(v);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  // ---- Simulator ----
  function runSimulation() {
    const target = parseFloat(targetCgpaEl.value);
    const remaining = parseInt(remainingCreditsEl.value, 10);
    const totals = GPA.cgpa(semesters);

    if (isNaN(target) || target < 0 || target > 4) {
      simResultEl.textContent = "Target CGPA must be between 0 and 4.";
      return;
    }
    if (isNaN(remaining) || remaining <= 0) {
      simResultEl.textContent = "Enter how many credit hours you have left (at least 1).";
      return;
    }

    if (totals.credits === 0) {
      simResultEl.textContent = `From a fresh start: you need a straight average GPA of ${target.toFixed(2)} in your remaining ${remaining} credit hours.`;
      return;
    }

    const needed = GPA.requiredGPA(target, totals.credits, totals.qualityPoints, remaining);
    if (needed === null) {
      simResultEl.textContent = `😅 Ouch — even with straight A's (4.0) in all ${remaining} remaining credit hours, a ${target.toFixed(2)} CGPA is mathematically out of reach. Try lowering the target or you still have options beyond CGPA — keep reading.`;
    } else if (needed === 0) {
      simResultEl.textContent = `🎉 You've already secured a ${target.toFixed(2)} CGPA! Even a 0.0 from here can't drag you below it (well, technically). Stay above ${((target * (totals.credits + remaining) - totals.qualityPoints) / remaining).toFixed(2)} to be safe and comfortable.`;
    } else {
      simResultEl.textContent = `From your current ${totals.cgpa.toFixed(2)} CGPA (${totals.credits} credit hours): you need an average GPA of ${needed.toFixed(2)} across your remaining ${remaining} credit hours to finish at ${target.toFixed(2)}. ${needed > 3.5 ? "Tough but doable 💪" : "Very achievable! 🚀"}`;
    }
  }

  // ---- Export / Import / Reset ----
  function exportData() {
    const blob = new Blob([JSON.stringify({ semesters }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cgpa-planner-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.semesters)) throw new Error("bad format");
        // basic validation: each semester has a courses array
        data.semesters.forEach((s) => {
          if (!Array.isArray(s.courses)) throw new Error("bad semester");
          s.id = s.id || nextId++;
          s.courses = s.courses.map((c) => ({
            name: String(c.name || ""),
            credits: Number(c.credits) || 1,
            grade: GPA.gradePoint(c.grade) !== undefined ? c.grade : "F",
          }));
        });
        semesters = data.semesters;
        render();
      } catch {
        simResultEl.textContent = "⚠ That file doesn't look like a CGPA Planner backup.";
        simResultEl.classList.add("error");
      }
    };
    reader.readAsText(file);
  }

  function resetAll() {
    if (!confirm("Delete ALL semesters and courses? This cannot be undone.")) return;
    semesters = [];
    nextId = 1;
    render();
  }

  // ---- Events & init ----
  addSemesterBtn.addEventListener("click", () => {
    semesters.push({
      id: nextId++,
      name: semesterNameEl.value.trim(),
      courses: [],
    });
    semesterNameEl.value = "";
    render();
  });

  simulateBtn.addEventListener("click", runSimulation);
  exportBtn.addEventListener("click", exportData);
  importFileEl.addEventListener("change", (e) => {
    if (e.target.files[0]) importData(e.target.files[0]);
    e.target.value = "";
  });
  resetBtn.addEventListener("click", resetAll);

  load();
  render();
})();
