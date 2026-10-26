
/*
  SMART STUDENT SYSTEM
  This is a browser-based school project prototype.

  IMPORTANT:
  localStorage is NOT a secure school database.
  Use a server and database with server-side permissions
  before storing real student information.
*/

const KEYS = {
  accounts: "smartStudentAccounts",
  students: "smartStudentRecords",
  session: "smartStudentSession"
};

let accounts = load(KEYS.accounts, []);
let students = load(KEYS.students, []);
let user = null;

const $ = id => document.getElementById(id);

function load(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function save() {
  localStorage.setItem(KEYS.accounts, JSON.stringify(accounts));
  localStorage.setItem(KEYS.students, JSON.stringify(students));
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function average(student) {
  const grades = student.grades || [];
  if (!grades.length) return null;

  return Math.round(
    grades.reduce((total, item) => total + Number(item.grade), 0)
    / grades.length
  );
}

function risk(student) {
  const grade = average(student);
  const attendance = Number(student.attendance);

  if (grade === null) return "Not Assessed";
  if (grade < 70 || attendance < 80) return "High";
  if (grade < 80 || attendance < 90) return "Medium";
  return "Low";
}

function suggestions(student) {
  const result = [];

  if (average(student) === null) {
    result.push({
      title: "Grades Needed",
      text: "Enter grades to review academic progress."
    });
  } else if (average(student) < 75) {
    result.push({
      title: "Study Support",
      text: "Create a study schedule and ask the professor for help."
    });
  }

  if (Number(student.attendance) < 90) {
    result.push({
      title: "Attendance Support",
      text: "Review attendance and identify any problems."
    });
  }

  if (!result.length) {
    result.push({
      title: "Keep Improving",
      text: "Continue studying and maintaining good attendance."
    });
  }

  return result;
}

/* ---------------- LOGIN AND REGISTRATION ---------------- */

function showRegister(show) {
  $("loginPanel").classList.toggle("hidden", show);
  $("registerPanel").classList.toggle("hidden", !show);
}

function updateRegistrationFields() {
  const role = $("regRole").value;
  const isStudent = role === "student";
  const isParent = role === "parent";

  $("studentNumberBox").classList.toggle("hidden", !isStudent);
  $("parentNumberBox").classList.toggle("hidden", !isParent);

  $("regStudentNumber").required = isStudent;
  $("regChildNumber").required = isParent;
}

function registerAccount(event) {
  event.preventDefault();

  const role = $("regRole").value;
  const name = $("regName").value.trim();
  const username = $("regUsername").value.trim();
  const password = $("regPassword").value;
  const email = $("regEmail").value.trim();
  const message = $("registerMessage");

  message.textContent = "";

  if (!role || !name || !username || !password || !email) {
    message.textContent = "Please complete all required fields.";
    return;
  }

  if (accounts.some(a =>
    a.username.toLowerCase() === username.toLowerCase()
  )) {
    message.textContent = "That username is already registered.";
    return;
  }

  let studentNumber = "";
  let childNumber = "";

  if (role === "student") {
    studentNumber = $("regStudentNumber").value.trim();

    if (!studentNumber) {
      message.textContent = "Enter your student number.";
      return;
    }

    if (students.some(s => s.id === studentNumber)) {
      message.textContent =
        "That student number is already assigned to a student.";
      return;
    }

    /*
      A student account creates a blank student record.
      No grades or names are preloaded.
    */
    students.push({
      id: studentNumber,
      name,
      email,
      course: "",
      year: "",
      parentEmail: "",
      attendance: 100,
      grades: []
    });
  }

  if (role === "parent") {
    childNumber = $("regChildNumber").value.trim();

    if (!students.some(s => s.id === childNumber)) {
      message.textContent =
        "Student number not found. Ask the administrator to add the student first.";
      return;
    }
  }

  /*
    Registration here is for demonstration only.
    In a real deployment, admin accounts and professor
    accounts must be created or approved by an administrator.
  */
  accounts.push({
    id: createId(),
    role,
    name,
    username,
    password,
    email,
    studentNumber,
    childNumber
  });

  save();
  $("registerForm").reset();
  updateRegistrationFields();

  message.textContent =
    "Account created. You can now log in with your details.";
}

function createId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 9);
}

function login(event) {
  event.preventDefault();

  const role = $("loginRole").value;
  const username = $("loginUsername").value.trim();
  const password = $("loginPassword").value;

  const account = accounts.find(a =>
    a.role === role &&
    a.username.toLowerCase() === username.toLowerCase() &&
    a.password === password
  );

  if (!account) {
    $("loginMessage").textContent =
      "Account not found. Check your role, username, and password.";
    return;
  }

  sessionStorage.setItem(KEYS.session, JSON.stringify({
    id: account.id,
    role: account.role,
    name: account.name,
    username: account.username,
    email: account.email,
    studentNumber: account.studentNumber,
    childNumber: account.childNumber
  }));

  location.href = "dashboard.html";
}

function logout() {
  sessionStorage.removeItem(KEYS.session);
  location.href = "index.html";
}

/* ---------------- ROLE-BASED RECORD VISIBILITY ---------------- */

function visibleStudents() {
  if (!user) return [];

  if (user.role === "student") {
    return students.filter(s => s.id === user.studentNumber);
  }

  if (user.role === "parent") {
    return students.filter(s => s.id === user.childNumber);
  }

  if (user.role === "admin" || user.role === "professor") {
    return students;
  }

  return [];
}

function canManageStudents() {
  return user && user.role === "admin";
}

function canManageGrades() {
  return user &&
    (user.role === "admin" || user.role === "professor");
}

/* ---------------- DASHBOARD NAVIGATION ---------------- */

function getMenu() {
  const menu = [["overview", "⌂ Overview"]];

  if (user.role === "admin") {
    return menu.concat([
      ["students", "🎓 Student Information"],
      ["grades", "📊 Grade Monitoring"],
      ["analytics", "⚠️ Predictive Analytics"],
      ["attendance", "🗓️ Attendance"],
      ["resources", "🤝 Resource Matching"],
      ["database", "🗄️ Database Management"]
    ]);
  }

  if (user.role === "professor") {
    return menu.concat([
      ["students", "🎓 Student Information"],
      ["grades", "📊 Grade Monitoring"],
      ["analytics", "⚠️ Predictive Analytics"],
      ["attendance", "🗓️ Attendance"],
      ["resources", "🤝 Resource Matching"]
    ]);
  }

  if (user.role === "parent") {
    return menu.concat([
      ["grades", "📊 Child's Grades"],
      ["attendance", "🗓️ Attendance"],
      ["resources", "🤝 Support Suggestions"]
    ]);
  }

  return menu.concat([
    ["grades", "📊 My Grades"],
    ["attendance", "🗓️ My Attendance"],
    ["resources", "🤝 Study Support"]
  ]);
}

function drawNavigation(page) {
  $("navigation").innerHTML = getMenu().map(([id, title]) => `
    <button class="nav-button ${id === page ? "active" : ""}"
      data-page="${id}">${title}</button>
  `).join("");

  $("navigation").querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => renderPage(button.dataset.page));
  });
}

function pageHeading(title, description, action = "") {
  return `
    <div class="page-head">
      <div><h1>${title}</h1><p>${description}</p></div>
      ${action}
    </div>`;
}

function stat(title, value, icon, note) {
  return `
    <article class="stat">
      <label>${icon} ${title}</label>
      <strong>${value}</strong>
      <small>${note}</small>
    </article>`;
}

/* ---------------- STUDENT TABLES ---------------- */

function studentTable(list, allowEdit = false) {
  if (!list.length) {
    return `<div class="empty">No student records found.
      ${canManageStudents() ? "Add a student to begin." : ""}</div>`;
  }

  return `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Student Number</th><th>Name</th><th>Course</th>
          <th>Average</th><th>Attendance</th><th>Risk</th>
          ${allowEdit ? "<th>Action</th>" : ""}
        </tr></thead>
        <tbody>
        ${list.map(s => `
          <tr>
            <td>${esc(s.id)}</td>
            <td>${esc(s.name)}</td>
            <td>${esc(s.course || "Not entered")}</td>
            <td>${average(s) === null ? "N/A" : average(s) + "%"}</td>
            <td>${Number(s.attendance)}%</td>
            <td><span class="tag ${risk(s).toLowerCase().replace(" ", "-")}">
              ${risk(s)}</span></td>
            ${allowEdit ? `<td><button class="secondary"
              data-edit-student="${esc(s.id)}">Edit</button></td>` : ""}
          </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function renderOverview() {
  const list = visibleStudents();
  const personal = user.role === "student" || user.role === "parent";
  const grades = list.map(average).filter(n => n !== null);

  const averageText = grades.length
    ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length) + "%"
    : "N/A";

  const attendanceText = list.length
    ? Math.round(list.reduce((a, s) => a + Number(s.attendance), 0)
        / list.length) + "%"
    : "N/A";

  return pageHeading(
    personal ? "My Academic Overview" : "Academic Overview",
    "Review academic records, performance, attendance, and learning support."
  ) + `
    <div class="stats">
      ${stat(personal ? "Grade Average" : "Student Records",
        personal ? averageText : list.length, "📊", "Current records")}
      ${stat("Attendance", attendanceText, "🗓️", "Average attendance")}
      ${stat("High Risk", list.filter(s => risk(s) === "High").length,
        "⚠️", "Needs review")}
      ${stat("Not Assessed", list.filter(s => risk(s) === "Not Assessed").length,
        "📘", "Grades needed")}
    </div>
    <div class="columns">
      <section class="panel">
        <h3>${personal ? "My Linked Record" : "Student Records"}</h3>
        ${studentTable(list)}
      </section>
      <section class="panel">
        <h3>Resource Matching</h3>
        ${recommendationList(list)}
      </section>
    </div>`;
}

/* ---------------- STUDENT INFORMATION ---------------- */

function renderStudents() {
  const action = canManageStudents()
    ? '<button class="primary" id="addStudentButton">+ Add Student</button>'
    : "";

  return pageHeading(
    "Student Information",
    "Search student records using unique student numbers.",
    action
  ) + `
    ${canManageStudents() ? `
      <section id="studentFormPanel" class="panel hidden">
        <h3>Enter Student Information</h3>
        <form id="studentForm">
          <div class="form-grid">
            <div><label>Student Number</label>
              <input id="sid" required></div>
            <div><label>Full Name</label>
              <input id="sname" required></div>
            <div><label>Course</label>
              <input id="scourse" required></div>
            <div><label>Year Level</label>
              <input id="syear" required></div>
            <div><label>Student Email</label>
              <input id="semail" type="email" required></div>
            <div><label>Parent Email (optional)</label>
              <input id="pemail" type="email"></div>
            <div><label>Attendance (%)</label>
              <input id="sattendance" type="number" min="0"
                max="100" value="100" required></div>
          </div>
          <div class="form-actions">
            <button class="primary" type="submit">Save Student</button>
            <button class="secondary" id="cancelStudent" type="button">Cancel</button>
          </div>
          <p id="studentMessage" class="message"></p>
        </form>
      </section>` : ""}

    <section class="panel">
      <div class="toolbar">
        <input id="studentSearch" placeholder="Search by student number or name">
        <select id="riskFilter">
          <option value="All">All risk levels</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Not Assessed">Not Assessed</option>
        </select>
      </div>
      <div id="studentTable">${studentTable(
        visibleStudents(), canManageStudents()
      )}</div>
    </section>`;
}

function bindStudentPage() {
  $("addStudentButton")?.addEventListener("click", () =>
    $("studentFormPanel").classList.toggle("hidden"));

  $("cancelStudent")?.addEventListener("click", () =>
    $("studentFormPanel").classList.add("hidden"));

  $("studentForm")?.addEventListener("submit", event => {
    event.preventDefault();

    const id = $("sid").value.trim();
    const attendance = Number($("sattendance").value);

    if (students.some(s => s.id === id)) {
      $("studentMessage").textContent =
        "That student number already exists.";
      return;
    }

    if (attendance < 0 || attendance > 100) {
      $("studentMessage").textContent =
        "Attendance must be between 0 and 100.";
      return;
    }

    students.push({
      id,
      name: $("sname").value.trim(),
      course: $("scourse").value.trim(),
      year: $("syear").value.trim(),
      email: $("semail").value.trim(),
      parentEmail: $("pemail").value.trim(),
      attendance,
      grades: []
    });

    save();
    renderPage("students");
  });

  const filter = () => {
    const query = $("studentSearch").value.toLowerCase();
    const level = $("riskFilter").value;

    const list = visibleStudents().filter(s =>
      (s.id + " " + s.name).toLowerCase().includes(query) &&
      (level === "All" || risk(s) === level)
    );

    $("studentTable").innerHTML =
      studentTable(list, canManageStudents());
  };

  $("studentSearch")?.addEventListener("input", filter);
  $("riskFilter")?.addEventListener("change", filter);

  $("studentTable")?.addEventListener("click", event => {
    const button = event.target.closest("[data-edit-student]");
    if (!button || !canManageStudents()) return;

    const s = students.find(x => x.id === button.dataset.editStudent);
    if (!s) return;

    const name = prompt("Student name:", s.name);
    if (name === null || !name.trim()) return;

    const course = prompt("Course:", s.course || "");
    if (course === null) return;

    const attendance = prompt("Attendance (0–100):", s.attendance);
    if (attendance === null || !Number.isFinite(Number(attendance)) ||
        Number(attendance) < 0 || Number(attendance) > 100) {
      alert("Enter valid attendance from 0 to 100.");
      return;
    }

    s.name = name.trim();
    s.course = course.trim();
    s.attendance = Number(attendance);

    save();
    renderPage("students");
  });
}

/* ---------------- GRADE MONITORING ---------------- */

function gradeRows(rows, editable) {
  if (!rows.length) {
    return '<div class="empty">No grades have been entered yet.</div>';
  }

  return `<div class="table-wrap"><table>
    <thead><tr><th>Student Number</th><th>Name</th><th>Subject</th>
    <th>Grade</th><th>Status</th>${editable ? "<th>Action</th>" : ""}
    </tr></thead><tbody>
    ${rows.map(({ student, grade }) => `
      <tr>
        <td>${esc(student.id)}</td><td>${esc(student.name)}</td>
        <td>${esc(grade.subject)}</td><td>${grade.grade}%</td>
        <td>${grade.grade < 70 ? "Needs Support" :
          grade.grade < 80 ? "Developing" : "Satisfactory"}</td>
        ${editable ? `<td><button class="secondary"
          data-edit-grade="${esc(student.id)}"
          data-subject="${esc(grade.subject)}">Edit</button></td>` : ""}
      </tr>`).join("")}
    </tbody></table></div>`;
}

function renderGrades() {
  const editable = canManageGrades();
  const rows = visibleStudents().flatMap(student =>
    (student.grades || []).map(grade => ({ student, grade }))
  );

  return pageHeading(
    user.role === "student" ? "My Grades" :
    user.role === "parent" ? "Child's Grades" : "Grade Monitoring",
    "Grades are connected to individual student numbers."
  ) + `
    <div class="notice">
      Student accounts can only access their own linked record.
      Parent accounts can only access their linked child's record.
    </div>
    ${editable ? `
      <section class="panel">
        <h3>Add or Update Grade</h3>
        <form id="gradeForm">
          <div class="form-grid">
            <div><label>Student Number</label>
              <select id="gradeStudent" required>
                ${students.map(s => `<option value="${esc(s.id)}">
                  ${esc(s.id)} — ${esc(s.name)}</option>`).join("")}
              </select>
            </div>
            <div><label>Subject</label>
              <input id="gradeSubject" required></div>
            <div><label>Grade (0–100)</label>
              <input id="gradeValue" type="number" min="0" max="100"
                required></div>
          </div>
          <button class="primary" type="submit">Save Grade</button>
        </form>
      </section>` : ""}

    <section class="panel">
      <div class="toolbar">
        <input id="gradeSearch" placeholder="Search student number or subject">
      </div>
      <div id="gradeTable">${gradeRows(rows, editable)}</div>
    </section>`;
}

function bindGrades() {
  $("gradeForm")?.addEventListener("submit", event => {
    event.preventDefault();

    const student = students.find(s => s.id === $("gradeStudent").value);
    const subject = $("gradeSubject").value.trim();
    const value = Number($("gradeValue").value);

    if (!student || !subject || !Number.isFinite(value) ||
        value < 0 || value > 100) {
      alert("Enter a valid student, subject, and grade from 0 to 100.");
      return;
    }

    const existing = student.grades.find(g =>
      g.subject.toLowerCase() === subject.toLowerCase()
    );

    if (existing) {
      existing.grade = value;
    } else {
      student.grades.push({ subject, grade: value });
    }

    save();
    renderPage("grades");
  });

  $("gradeSearch")?.addEventListener("input", () => {
    const query = $("gradeSearch").value.toLowerCase();

    const rows = visibleStudents().flatMap(student =>
      (student.grades || [])
        .filter(g => (student.id + " " + student.name + " " + g.subject)
          .toLowerCase().includes(query))
        .map(grade => ({ student, grade }))
    );

    $("gradeTable").innerHTML =
      gradeRows(rows, canManageGrades());
  });

  $("gradeTable")?.addEventListener("click", event => {
    const button = event.target.closest("[data-edit-grade]");
    if (!button || !canManageGrades()) return;

    const student = students.find(s => s.id === button.dataset.editGrade);
    const grade = student?.grades.find(
      g => g.subject === button.dataset.subject
    );

    if (!grade) return;

    const value = prompt("Enter the updated grade (0–100):", grade.grade);
    if (value === null) return;

    if (value.trim() === "" || !Number.isFinite(Number(value)) ||
        Number(value) < 0 || Number(value) > 100) {
      alert("Enter a valid grade from 0 to 100.");
      return;
    }

    grade.grade = Number(value);
    save();
    renderPage("grades");
  });
}

/* ---------------- ANALYTICS AND ALERTS ---------------- */

function renderAnalytics() {
  const list = visibleStudents();

  return pageHeading(
    "Predictive Analytics",
    "Review grade and attendance indicators."
  ) + `
    <div class="notice">
      This is a simple rule-based risk indicator, not a trained AI model.
      Results are suggestions for review, not guaranteed predictions.
    </div>
    <div class="stats">
      ${stat("High Risk", list.filter(s => risk(s) === "High").length,
        "🚨", "Needs attention")}
      ${stat("Medium Risk", list.filter(s => risk(s) === "Medium").length,
        "⚠️", "Monitor progress")}
      ${stat("Low Risk", list.filter(s => risk(s) === "Low").length,
        "✅", "Current status")}
      ${stat("Not Assessed",
        list.filter(s => risk(s) === "Not Assessed").length,
        "📘", "Grades needed")}
    </div>
    <section class="panel">
      <h3>Performance and Alerts</h3>
      ${studentTable(list)}
      ${list.map(s => `
        <div class="recommendation">
          <span>⚠️</span>
          <div>
            <strong>${esc(s.id)} — ${esc(s.name)}: ${risk(s)} Risk</strong>
            <p>Average: ${average(s) === null ? "N/A" : average(s) + "%"}
              · Attendance: ${s.attendance}%</p>
            ${canManageGrades() ? `<button class="primary"
              data-email-alert="${esc(s.id)}">Send Gmail Alert</button>` : ""}
          </div>
        </div>`).join("")}
    </section>`;
}

function recommendationList(list) {
  if (!list.length) {
    return '<p class="muted">No student records available yet.</p>';
  }

  return list.map(s => `
    <div class="recommendation">
      <span>🤝</span>
      <div>
        <strong>${esc(s.id)} — ${esc(s.name)}</strong>
        ${suggestions(s).map(t => `
          <p><b>${esc(t.title)}:</b> ${esc(t.text)}</p>
        `).join("")}
      </div>
    </div>`).join("");
}

function renderResources() {
  return pageHeading(
    "Resource Matching",
    "Study and attendance suggestions based on current records."
  ) + `<div class="columns">
    ${visibleStudents().map(s => `
      <section class="panel">
        <h3>🤝 ${esc(s.id)} — ${esc(s.name)}</h3>
        <p class="sub">Average: ${average(s) === null ?
          "N/A" : average(s) + "%"} · Attendance: ${s.attendance}%</p>
        ${suggestions(s).map(t => `
          <div class="recommendation"><span>📘</span><div>
            <b>${esc(t.title)}</b><p>${esc(t.text)}</p>
          </div></div>`).join("")}
      </section>`).join("") ||
      '<section class="panel">No records available.</section>'}
  </div>`;
}

function renderAttendance() {
  const list = visibleStudents();

  return pageHeading(
    user.role === "student" ? "My Attendance" : "Attendance Monitoring",
    "Attendance is displayed for records linked to your account."
  ) + `<section class="panel">
    ${list.map(s => `
      <div class="recommendation">
        <span>🗓️</span><div style="width:100%">
          <strong>${esc(s.id)} — ${esc(s.name)}</strong>
          <p>Attendance: ${Number(s.attendance)}%</p>
          <div class="bar"><span style="width:${
            Math.max(0, Math.min(100, Number(s.attendance)))
          }%"></span></div>
          ${canManageStudents() ? `<button class="secondary"
            data-edit-attendance="${esc(s.id)}">Update Attendance</button>` : ""}
        </div>
      </div>`).join("") ||
      '<div class="empty">No attendance records found.</div>'}
  </section>`;
}

function bindAttendance() {
  $("dashboardContent").querySelectorAll("[data-edit-attendance]")
    .forEach(button => button.addEventListener("click", () => {
      if (!canManageStudents()) return;

      const student = students.find(s =>
        s.id === button.dataset.editAttendance
      );
      if (!student) return;

      const value = prompt("Attendance percentage (0–100):",
        student.attendance);

      if (value === null) return;
      if (value.trim() === "" || !Number.isFinite(Number(value)) ||
          Number(value) < 0 || Number(value) > 100) {
        alert("Enter a valid percentage.");
        return;
      }

      student.attendance = Number(value);
      save();
      renderPage("attendance");
    }));
}

/*
  EmailJS setup:
  1. Create an EmailJS account.
  2. Set up an email service and an email template.
  3. Put your actual public key, service ID, and template ID below.
  4. Configure the template with fields such as to_email,
     student_number, student_name, grade_average, attendance,
     risk_level, and message.
*/
const EMAILJS_PUBLIC_KEY = "NM0Wtg6QtTH4o81Mg";
const EMAILJS_SERVICE_ID = "service_e7dumj4";
const EMAILJS_TEMPLATE_ID = "template_p0xpqs8";

async function sendEmailAlert(student) {
  if (
    !window.emailjs ||
    EMAILJS_PUBLIC_KEY === "YOUR_PUBLIC_KEY" ||
    EMAILJS_SERVICE_ID === "YOUR_SERVICE_ID" ||
    EMAILJS_TEMPLATE_ID === "YOUR_TEMPLATE_ID"
  ) {
    alert("EmailJS is not configured yet. Add your EmailJS keys in app.js.");
    return;
  }

  const recipient = prompt("Enter the authorized recipient's email address:");
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    alert("Enter a valid email address.");
    return;
  }

  try {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: recipient,
      student_number: student.id,
      student_name: student.name,
      grade_average: average(student) ?? "Not entered",
      attendance: student.attendance,
      risk_level: risk(student),
              message: suggestions(student).map(t => `${t[0]} ${t[1]}: ${t[2]}`).join(" ")
      });
      

    alert("Email alert sent successfully.");
  } catch (error) {
    console.error(error);
    alert("Email failed. Check your EmailJS service, template, and keys.");
  }
}

function bindAlerts() {
  $("dashboardContent").querySelectorAll("[data-email-alert]")
    .forEach(button => button.addEventListener("click", () => {
      if (!canManageGrades()) return;

      const student = students.find(s =>
        s.id === button.dataset.emailAlert
      );
      if (student) sendEmailAlert(student);
    }));
}

/* ---------------- ADMIN DATABASE ---------------- */

function databaseTable(list) {
  if (!list.length) {
    return '<div class="empty">No student records in the database yet.</div>';
  }

  return `<div class="table-wrap"><table>
    <thead><tr><th>Student Number</th><th>Name</th><th>Course</th>
      <th>Average</th><th>Attendance</th><th>Actions</th></tr></thead>
    <tbody>${list.map(s => `
      <tr>
        <td>${esc(s.id)}</td><td>${esc(s.name)}</td>
        <td>${esc(s.course || "Not entered")}</td>
        <td>${average(s) === null ? "N/A" : average(s) + "%"}</td>
        <td>${s.attendance}%</td>
        <td>
          <button class="secondary" data-db-edit="${esc(s.id)}">Edit</button>
          <button class="secondary" data-db-delete="${esc(s.id)}">Delete</button>
        </td>
      </tr>`).join("")}
    </tbody></table></div>`;
}

function renderDatabase() {
  if (user.role !== "admin") {
    return '<section class="panel">Access denied.</section>';
  }

  const gradeCount = students.reduce(
    (total, s) => total + (s.grades || []).length, 0
  );

  return pageHeading(
    "Database Management",
    "Manage records and create a backup of the student database."
  ) + `
    <div class="stats">
      ${stat("Student Records", students.length, "🎓", "Saved records")}
      ${stat("Grade Entries", gradeCount, "📊", "Saved subjects")}
      ${stat("Accounts", accounts.length, "👤", "Registered accounts")}
      ${stat("Parent Emails", students.filter(s => s.parentEmail).length,
        "👨‍👩‍👧", "Linked contacts")}
    </div>
    <section class="panel">
      <h3>Database Actions</h3>
      <div class="toolbar">
        <input id="databaseSearch" placeholder="Search student number or name">
        <button class="primary" id="exportDatabase">Export Backup</button>
        <button class="secondary" id="importDatabaseButton">Import Backup</button>
        <input type="file" id="importDatabaseFile"
          accept=".json,application/json" class="hidden">
      </div>
      <p class="sub">Export a backup before importing or deleting records.
        Imports with matching student numbers replace those records.</p>
    </section>
    <section class="panel">
      <h3>Student Database</h3>
      <div id="databaseTable">${databaseTable(students)}</div>
    </section>`;
}

function bindDatabase() {
  $("databaseSearch")?.addEventListener("input", () => {
    const q = $("databaseSearch").value.toLowerCase();
    $("databaseTable").innerHTML = databaseTable(
      students.filter(s => (s.id + " " + s.name).toLowerCase().includes(q))
    );
  });

  $("exportDatabase")?.addEventListener("click", () => {
    const backup = {
      format: "SmartStudentDatabase",
      version: 1,
      exportedAt: new Date().toISOString(),
      students
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "student-database-backup.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $("importDatabaseButton")?.addEventListener("click", () =>
    $("importDatabaseFile").click()
  );

  $("importDatabaseFile")?.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = JSON.parse(await file.text());

      if (data.format !== "SmartStudentDatabase" ||
          !Array.isArray(data.students)) {
        throw new Error("This is not a valid system backup.");
      }

      const valid = data.students.every(s =>
        typeof s.id === "string" &&
        s.id.trim() &&
        typeof s.name === "string" &&
        Array.isArray(s.grades) &&
        Number.isFinite(Number(s.attendance)) &&
        Number(s.attendance) >= 0 &&
        Number(s.attendance) <= 100 &&
        s.grades.every(g =>
          typeof g.subject === "string" &&
          Number.isFinite(Number(g.grade)) &&
          Number(g.grade) >= 0 &&
          Number(g.grade) <= 100
        )
      );

      const ids = data.students.map(s => s.id);

      if (!valid || new Set(ids).size !== ids.length) {
        throw new Error("Invalid or duplicate student records.");
      }

      if (!confirm("Import this backup? Matching student numbers will be replaced.")) {
        return;
      }

      const combined = new Map(students.map(s => [s.id, s]));

      data.students.forEach(s => combined.set(s.id, s));
      students = [...combined.values()];

      save();
      renderPage("database");
    } catch (error) {
      alert("Import failed: " + error.message);
    } finally {
      event.target.value = "";
    }
  });

  $("databaseTable")?.addEventListener("click", event => {
    if (user.role !== "admin") return;

    const editButton = event.target.closest("[data-db-edit]");
    const deleteButton = event.target.closest("[data-db-delete]");

    if (editButton) {
      const s = students.find(x => x.id === editButton.dataset.dbEdit);
      if (!s) return;

      const name = prompt("Student name:", s.name);
      if (name === null || !name.trim()) return;

      const course = prompt("Course:", s.course || "");
      if (course === null) return;

      const attendance = prompt("Attendance (0–100):", s.attendance);
      if (attendance === null || !Number.isFinite(Number(attendance)) ||
          Number(attendance) < 0 || Number(attendance) > 100) {
        alert("Enter valid attendance.");
        return;
      }

      s.name = name.trim();
      s.course = course.trim();
      s.attendance = Number(attendance);

      save();
      renderPage("database");
    }

    if (deleteButton) {
      const id = deleteButton.dataset.dbDelete;
      const student = students.find(s => s.id === id);

      if (!student || !confirm(
        `Delete ${student.id} — ${student.name} and their grades?`
      )) return;

      students = students.filter(s => s.id !== id);

      accounts = accounts.filter(a =>
        !(a.role === "student" && a.studentNumber === id) &&
        !(a.role === "parent" && a.childNumber === id)
      );

      save();
      renderPage("database");
    }
  });
}

/* ---------------- PAGE RENDERING ---------------- */

function renderPage(page) {
  if (page === "database" && user.role !== "admin") {
    page = "overview";
  }

  drawNavigation(page);

  const pages = {
    overview: renderOverview,
    students: renderStudents,
    grades: renderGrades,
    analytics: renderAnalytics,
    attendance: renderAttendance,
    resources: renderResources,
    database: renderDatabase
  };

  $("dashboardContent").innerHTML =
    (pages[page] || renderOverview)();

  if (page === "students") bindStudentPage();
  if (page === "grades") bindGrades();
  if (page === "analytics") bindAlerts();
  if (page === "attendance") bindAttendance();
  if (page === "database") bindDatabase();
}

/* ---------------- START THE WEBSITE ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  if ($("loginForm")) {
    $("loginForm").addEventListener("submit", login);
    $("registerForm").addEventListener("submit", registerAccount);

    $("showRegister").addEventListener("click", () => showRegister(true));
    $("showLogin").addEventListener("click", () => showRegister(false));
    $("regRole").addEventListener("change", updateRegistrationFields);

    updateRegistrationFields();
  }

  if ($("dashboardContent")) {
    try {
      user = JSON.parse(sessionStorage.getItem(KEYS.session));
    } catch {
      user = null;
    }

    if (!user) {
      location.href = "index.html";
      return;
    }

    $("userName").textContent = user.name;
    $("userRole").textContent = user.role.toUpperCase();
    $("userAvatar").textContent = user.name
      .split(/\s+/).map(part => part[0]).slice(0, 2).join("")
      .toUpperCase();

    $("logoutButton").addEventListener("click", logout);

    renderPage("overview");
  }
});
