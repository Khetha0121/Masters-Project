const STORAGE_KEY = 'comp102-assignment-desk-v1';
const PROFILE_KEY = 'comp102-student-profile-v1';
const ROLE_KEY = 'comp102-user-role-v1';

const starterTasks = [
  { id: 'p1', title: 'Java Practical 1: Algorithms', type: 'Java practical', due: '2026-08-07', status: 'active', fileName: '' },
  { id: 'a1', title: 'Assignment 1: Problem solving', type: 'Assignment', due: '2026-08-14', status: 'active', fileName: '' },
  { id: 'p2', title: 'Java Practical 2: Variables & input', type: 'Java practical', due: '2026-08-21', status: 'ready', fileName: 'comp102_practical2.java' },
  { id: 'p3', title: 'Java Practical 3: Selection & loops', type: 'Java practical', due: '2026-08-28', status: 'active', fileName: '' },
  { id: 'a2', title: 'Assignment 2: Control flow', type: 'Assignment', due: '2026-09-04', status: 'active', fileName: '' },
  { id: 'p4', title: 'Java Practical 4: Methods', type: 'Java practical', due: '2026-09-11', status: 'active', fileName: '' },
  { id: 'p5', title: 'Java Practical 5: Arrays', type: 'Java practical', due: '2026-09-18', status: 'active', fileName: '' },
  { id: 'p6', title: 'Java Practical 6: Strings', type: 'Java practical', due: '2026-09-25', status: 'active', fileName: '' },
  { id: 'p7', title: 'Java Practical 7: File handling', type: 'Java practical', due: '2026-10-02', status: 'active', fileName: '' }
];

let state = loadState();
let currentFilter = 'all';
let academicFilter = 'all';
const taskList = document.querySelector('#taskList');
const assignmentSelect = document.querySelector('#assignmentSelect');
const fileInput = document.querySelector('#fileInput');
const fileName = document.querySelector('#fileName');
const toast = document.querySelector('#toast');
const studentName = document.querySelector('#studentName');

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored || !Array.isArray(stored.tasks)) return { tasks: starterTasks, submissions: [] };
    const savedIds = new Set(stored.tasks.map(task => task.id));
    return { ...stored, tasks: [...stored.tasks, ...starterTasks.filter(task => !savedIds.has(task.id))] };
  } catch { return { tasks: starterTasks, submissions: [] }; }
}

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadStudentName() { return localStorage.getItem(PROFILE_KEY) || 'Dalla'; }
function formatDate(value) { return new Intl.DateTimeFormat('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`)); }
function showToast(message) { toast.textContent = message; toast.classList.add('show'); window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 3500); }
function statusLabel(status) { return { active: 'In progress', ready: 'Ready', submitted: 'Submitted' }[status] || status; }

function renderAcademic() {
  document.querySelector('#academicTotal').textContent = state.tasks.length;
  document.querySelector('#academicReady').textContent = state.tasks.filter(task => task.status === 'ready').length;
  document.querySelector('#academicSubmitted').textContent = state.tasks.filter(task => task.status === 'submitted').length;
  const visibleTasks = state.tasks.filter(task => academicFilter === 'all' || task.status === academicFilter);
  document.querySelector('#academicList').innerHTML = visibleTasks.length ? visibleTasks.map(task => `
    <article class="review-row"><div><h3>${escapeHtml(task.title)}</h3><p>${escapeHtml(task.fileName || 'No file prepared')} · Due ${formatDate(task.due)}</p></div><span class="review-badge ${task.status}">${statusLabel(task.status)}</span>${task.status === 'ready' ? `<button class="review-action" data-review-id="${task.id}" type="button">Mark submitted →</button>` : '<span></span>'}</article>`).join('')
    : '<div class="empty-state">No tasks match this review filter.</div>';
}

function render() {
  const visible = state.tasks.filter(task => currentFilter === 'all' || task.status === currentFilter);
  taskList.innerHTML = visible.length ? visible.map((task, index) => `
    <article class="task-card ${task.status}" style="animation-delay:${index * 55}ms">
      <span class="task-indicator" aria-hidden="true"></span>
      <div class="task-info"><h3>${escapeHtml(task.title)}</h3><div class="task-meta"><span>${escapeHtml(task.type)}</span><span>Due ${formatDate(task.due)}</span></div></div>
      <div><div class="task-status ${task.status}">${statusLabel(task.status)}</div><button class="task-action" data-task-id="${task.id}" type="button">${task.status === 'submitted' ? 'View record' : 'Prepare →'}</button></div>
    </article>`).join('') : '<div class="empty-state">Nothing in this view yet.</div>';

  document.querySelector('#totalCount').textContent = state.tasks.length;
  document.querySelector('#readyCount').textContent = state.tasks.filter(task => task.status === 'ready').length;
  document.querySelector('#submittedCount').textContent = state.tasks.filter(task => task.status === 'submitted').length;
  const upcoming = state.tasks.filter(task => task.status !== 'submitted').sort((a, b) => a.due.localeCompare(b.due))[0];
  document.querySelector('#nextDeadline').textContent = upcoming ? formatDate(upcoming.due) : 'All caught up';

  assignmentSelect.innerHTML = state.tasks.filter(task => task.status !== 'submitted').map(task => `<option value="${task.id}">${escapeHtml(task.title)}</option>`).join('');
  if (!assignmentSelect.options.length) assignmentSelect.innerHTML = '<option value="">All tasks submitted</option>';
  renderAcademic();
}

function escapeHtml(value) { return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character])); }

function selectTask(taskId) {
  assignmentSelect.value = taskId;
  document.querySelector('#submissionTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.querySelector('#fileInput').focus();
}

document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  currentFilter = button.dataset.filter;
  document.querySelectorAll('.filter').forEach(item => item.classList.toggle('active', item === button));
  render();
}));
taskList.addEventListener('click', event => { const button = event.target.closest('[data-task-id]'); if (button) selectTask(button.dataset.taskId); });

document.querySelector('#addTaskButton').addEventListener('click', () => document.querySelector('#taskDialog').showModal());
document.querySelector('#taskForm').addEventListener('submit', event => {
  event.preventDefault();
  const title = document.querySelector('#taskTitle').value.trim();
  const due = document.querySelector('#taskDue').value;
  const type = document.querySelector('#taskType').value;
  state.tasks.push({ id: `task-${Date.now()}`, title, due, type, status: 'active', fileName: '' });
  saveState(); render(); event.target.closest('dialog').close(); event.target.reset(); showToast('Task added to your COMP 102 queue.');
});

fileInput.addEventListener('change', () => { fileName.textContent = fileInput.files[0]?.name || 'Choose a file'; });
studentName.value = loadStudentName();
studentName.addEventListener('input', () => localStorage.setItem(PROFILE_KEY, studentName.value.trim()));
document.querySelector('#submissionForm').addEventListener('submit', event => {
  event.preventDefault();
  const task = state.tasks.find(item => item.id === assignmentSelect.value);
  const selectedFile = fileInput.files[0];
  if (!task || !selectedFile) return;
  task.status = 'ready'; task.fileName = selectedFile.name;
  state.submissions.push({ taskId: task.id, taskTitle: task.title, fileName: selectedFile.name, preparedAt: new Date().toISOString(), moodleStatus: 'Ready to upload when connected' });
  saveState(); render(); event.target.reset(); fileName.textContent = 'Choose a file';
  document.querySelector('#submissionState').textContent = 'Handoff prepared'; showToast(`${task.title} is ready for Moodle.`);
});

document.querySelector('#exportButton').addEventListener('click', () => {
  const payload = { course: 'COMP 102', institution: 'UKZN', exportedAt: new Date().toISOString(), tasks: state.tasks, submissions: state.submissions };
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  link.download = 'comp-102-moodle-handoff.json'; link.click(); URL.revokeObjectURL(link.href); showToast('Backup downloaded to your device.');
});

function setRole(role) {
  const academic = role === 'academic';
  document.body.classList.toggle('academic-mode', academic);
  document.querySelector('#roleSwitch').textContent = academic ? 'Student view' : 'Academic view';
  localStorage.setItem(ROLE_KEY, role);
}

document.querySelector('#roleSwitch').addEventListener('click', () => setRole(document.body.classList.contains('academic-mode') ? 'student' : 'academic'));
document.querySelector('#backToStudent').addEventListener('click', () => setRole('student'));
document.querySelector('#academicAddTask').addEventListener('click', () => document.querySelector('#taskDialog').showModal());
document.querySelectorAll('.academic-filter').forEach(button => button.addEventListener('click', () => {
  academicFilter = button.dataset.academicFilter;
  document.querySelectorAll('.academic-filter').forEach(item => item.classList.toggle('active', item === button));
  renderAcademic();
}));
document.querySelector('#academicList').addEventListener('click', event => {
  const button = event.target.closest('[data-review-id]');
  if (!button) return;
  const task = state.tasks.find(item => item.id === button.dataset.reviewId);
  if (!task) return;
  task.status = 'submitted';
  state.submissions = state.submissions.map(submission => submission.taskId === task.id ? { ...submission, moodleStatus: 'Submitted on Moodle' } : submission);
  saveState(); render(); showToast(`${task.title} marked as submitted.`);
});

window.addEventListener('online', () => { document.querySelector('#connectionLabel').textContent = 'Connected'; });
window.addEventListener('offline', () => { document.querySelector('#connectionLabel').textContent = 'Offline-ready'; });
setRole(localStorage.getItem(ROLE_KEY) || 'student');
render();
