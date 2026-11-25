const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "studyflow-activities-v1";
let activities = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let editingId = null;

const today = new Date();
const localDate = (date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};
const todayString = localDate(today);
$("todayLabel").textContent = today.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
$("longDate").textContent = today.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
$("dateFilter").value = todayString;
$("activityDate").value = todayString;

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
  render();
}
function minutesBetween(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}
function formatTime(value) {
  return new Date(`2000-01-01T${value}`).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}
function formatDuration(minutes) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}
function render() {
  const selectedDate = $("dateFilter").value;
  const dayItems = activities.filter(item => item.date === selectedDate).sort((a,b) => a.start.localeCompare(b.start));
  const totalMinutes = dayItems.reduce((sum, item) => sum + minutesBetween(item.start, item.end), 0);
  const completed = dayItems.filter(item => item.done).length;
  const rate = dayItems.length ? Math.round(completed / dayItems.length * 100) : 0;

  $("plannedHours").textContent = formatDuration(totalMinutes);
  $("completedCount").textContent = `${completed} / ${dayItems.length}`;
  $("completionRate").textContent = `${rate}%`;
  $("progressText").textContent = `${rate}%`;
  $("progressBar").style.width = `${rate}%`;

  $("scheduleList").innerHTML = dayItems.map(item => `
    <article class="activity ${item.done ? "done" : ""}">
      <div class="time"><strong>${formatTime(item.start)}</strong>to ${formatTime(item.end)}</div>
      <div class="activity-line"></div>
      <div class="activity-info">
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.notes || "Stay focused and do your best.")}</p>
        <span class="category">${escapeHTML(item.subject)}</span>
      </div>
      <div class="activity-actions">
        <button class="icon-btn" title="${item.done ? "Mark pending" : "Mark complete"}" aria-label="Toggle complete" data-action="toggle" data-id="${item.id}">${item.done ? "↶" : "✓"}</button>
        <button class="icon-btn" title="Edit" aria-label="Edit activity" data-action="edit" data-id="${item.id}">✎</button>
        <button class="icon-btn" title="Delete" aria-label="Delete activity" data-action="delete" data-id="${item.id}">×</button>
      </div>
    </article>`).join("");

  $("emptyState").classList.toggle("hidden", dayItems.length > 0);
  $("scheduleList").classList.toggle("hidden", dayItems.length === 0);
}
function resetForm() {
  editingId = null;
  $("activityForm").reset();
  $("activityDate").value = $("dateFilter").value || todayString;
  $("startTime").value = "09:00";
  $("endTime").value = "10:00";
  $("formTitle").textContent = "Add activity";
  $("saveBtn").textContent = "＋ Save activity";
  $("cancelEdit").classList.add("hidden");
  $("formError").textContent = "";
}
$("activityForm").addEventListener("submit", event => {
  event.preventDefault();
  const start = $("startTime").value;
  const end = $("endTime").value;
  if (minutesBetween(start, end) <= 0) {
    $("formError").textContent = "End time must be later than start time.";
    return;
  }
  const item = {
    id: editingId || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    title: $("title").value.trim(),
    subject: $("subject").value,
    start, end,
    date: $("activityDate").value,
    notes: $("notes").value.trim(),
    done: editingId ? activities.find(a => a.id === editingId).done : false
  };
  if (!item.title || !item.date) return;
  if (editingId) activities = activities.map(a => a.id === editingId ? item : a);
  else activities.push(item);
  $("dateFilter").value = item.date;
  save();
  resetForm();
});
$("scheduleList").addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const item = activities.find(a => a.id === button.dataset.id);
  if (!item) return;
  if (button.dataset.action === "toggle") {
    item.done = !item.done;
    save();
  } else if (button.dataset.action === "delete") {
    if (confirm(`Delete "${item.title}" from your timetable?`)) {
      activities = activities.filter(a => a.id !== item.id);
      if (editingId === item.id) resetForm();
      save();
    }
  } else if (button.dataset.action === "edit") {
    editingId = item.id;
    $("title").value = item.title;
    $("subject").value = item.subject;
    $("startTime").value = item.start;
    $("endTime").value = item.end;
    $("activityDate").value = item.date;
    $("notes").value = item.notes;
    $("formTitle").textContent = "Edit activity";
    $("saveBtn").textContent = "Save changes";
    $("cancelEdit").classList.remove("hidden");
    $("formError").textContent = "";
    $("formPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  }
});
$("dateFilter").addEventListener("change", () => {
  $("activityDate").value = $("dateFilter").value;
  render();
});
$("cancelEdit").addEventListener("click", resetForm);
$("emptyAddBtn").addEventListener("click", () => $("title").focus());
$("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  $("themeBtn").textContent = document.body.classList.contains("dark") ? "☀" : "☾";
  localStorage.setItem("studyflow-dark", document.body.classList.contains("dark"));
});
if (localStorage.getItem("studyflow-dark") === "true") {
  document.body.classList.add("dark");
  $("themeBtn").textContent = "☀";
}
render();
