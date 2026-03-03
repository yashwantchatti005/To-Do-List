/* ================================================
   TASKFLOW PRO — Premium To-Do App Logic
   ================================================ */

// ============ STATE ============
let tasks = [];
let currentFilter = 'all';
let searchQuery = '';
let isDarkMode = false;
let isSoundEnabled = true;
let selectedPriority = 'low';
let draggedTaskId = null;
let audioContext = null;

// ============ DOM REFERENCES ============
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const taskInput = $('#taskInput');
const dueDateInput = $('#dueDateInput');
const addBtn = $('#addBtn');
const searchInput = $('#searchInput');
const taskList = $('#taskList');
const emptyState = $('#emptyState');
const themeToggle = $('#themeToggle');
const soundToggle = $('#soundToggle');
const clearCompletedBtn = $('#clearCompleted');
const fab = $('#fab');
const progressText = $('#progressText');
const progressPercent = $('#progressPercent');
const progressFill = $('#progressFill');
const filterTabs = $('#filterTabs');
const filterIndicator = $('#filterIndicator');
const priorityGroup = $('#priorityGroup');
const dateLabel = $('#dateLabel');
const datePicker = $('.date-picker');

// ============ LOCAL STORAGE ============

/** Save all tasks to localStorage */
function saveTasks() {
    localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));
}

/** Load tasks from localStorage */
function loadTasks() {
    try {
        const stored = localStorage.getItem('taskflow_tasks');
        tasks = stored ? JSON.parse(stored) : [];
    } catch {
        tasks = [];
    }
}

/** Save user preferences */
function savePreferences() {
    localStorage.setItem('taskflow_prefs', JSON.stringify({
        isDarkMode,
        isSoundEnabled
    }));
}

/** Load user preferences */
function loadPreferences() {
    try {
        const prefs = JSON.parse(localStorage.getItem('taskflow_prefs'));
        if (prefs) {
            isDarkMode = prefs.isDarkMode || false;
            isSoundEnabled = prefs.isSoundEnabled !== undefined ? prefs.isSoundEnabled : true;
        }
    } catch {
        // defaults
    }
}

// ============ AUDIO / SOUND EFFECTS ============

/** Lazily create AudioContext (requires user gesture) */
function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

/** Play a synthesized sound effect */
function playSound(type) {
    if (!isSoundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        osc.type = 'sine';

        switch (type) {
            case 'add':
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(1000, now + 0.08);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
                break;

            case 'complete':
                osc.frequency.setValueAtTime(523, now);
                osc.frequency.setValueAtTime(659, now + 0.07);
                osc.frequency.setValueAtTime(784, now + 0.14);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.start(now);
                osc.stop(now + 0.25);
                break;

            case 'delete':
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
                osc.start(now);
                osc.stop(now + 0.18);
                break;

            case 'click':
                osc.frequency.setValueAtTime(700, now);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
                osc.start(now);
                osc.stop(now + 0.04);
                break;
        }
    } catch (e) {
        /* Audio not supported – fail silently */
    }
}

// ============ CONFETTI ============

/** Trigger a celebratory confetti burst */
function triggerConfetti() {
    const canvas = $('#confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';

    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
                    '#f97316', '#eab308', '#22c55e', '#06b6d4', '#a855f7'];

    const particles = Array.from({ length: 180 }, () => ({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.4,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 3 + 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 7 + 3,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        opacity: 1,
        wobble: Math.random() * 10,
        shape: Math.random() > 0.5 ? 'rect' : 'circle'
    }));

    let frame = 0;

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        frame++;

        for (const p of particles) {
            if (p.opacity <= 0 || p.y > canvas.height + 60) continue;
            alive = true;

            p.vy += 0.08;
            p.x += p.vx + Math.sin(frame * 0.015 + p.wobble) * 0.4;
            p.y += p.vy;
            p.rotation += p.rotationSpeed;
            p.vx *= 0.995;
            if (p.y > canvas.height * 0.75) p.opacity -= 0.015;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.globalAlpha = Math.max(0, p.opacity);
            ctx.fillStyle = p.color;

            if (p.shape === 'rect') {
                ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        if (alive && frame < 350) {
            requestAnimationFrame(animate);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.display = 'none';
        }
    }

    animate();
}

// ============ THEME TOGGLE ============

/** Apply the current theme to the DOM */
function applyTheme() {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');

    const sunIcon = themeToggle.querySelector('.icon-sun');
    const moonIcon = themeToggle.querySelector('.icon-moon');

    if (isDarkMode) {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    } else {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    }
}

/** Toggle between light and dark themes */
function toggleTheme() {
    isDarkMode = !isDarkMode;
    applyTheme();
    savePreferences();
    playSound('click');
}

// ============ SOUND TOGGLE ============

/** Apply sound toggle UI */
function applySoundUI() {
    const onIcon = soundToggle.querySelector('.sound-on');
    const offIcon = soundToggle.querySelector('.sound-off');

    if (isSoundEnabled) {
        onIcon.classList.remove('hidden');
        offIcon.classList.add('hidden');
    } else {
        onIcon.classList.add('hidden');
        offIcon.classList.remove('hidden');
    }
}

/** Toggle sound on/off */
function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    applySoundUI();
    savePreferences();
    if (isSoundEnabled) playSound('click');
}

// ============ TASK CRUD ============

/** Create a new task object */
function createTask(text, dueDate, priority) {
    return {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        text: text.trim(),
        completed: false,
        priority: priority || 'low',
        dueDate: dueDate || null,
        createdAt: Date.now()
    };
}

/** Add a new task */
function addTask() {
    const text = taskInput.value.trim();
    if (!text) {
        taskInput.focus();
        taskInput.classList.add('shake');
        setTimeout(() => taskInput.classList.remove('shake'), 400);
        return;
    }

    const task = createTask(text, dueDateInput.value, selectedPriority);
    tasks.unshift(task);
    saveTasks();
    renderTasks();
    updateProgress();

    // Reset inputs
    taskInput.value = '';
    dueDateInput.value = '';
    dateLabel.textContent = 'No date';
    datePicker.classList.remove('has-date');

    taskInput.focus();
    playSound('add');
}

/** Toggle task completed state */
function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    saveTasks();
    renderTasks();
    updateProgress();

    if (task.completed) {
        playSound('complete');
        checkAllCompleted();
    } else {
        playSound('click');
    }
}

/** Delete a task with animation */
function deleteTask(id) {
    const el = taskList.querySelector(`[data-id="${id}"]`);
    if (el) {
        el.classList.add('removing');
        el.addEventListener('animationend', () => {
            tasks = tasks.filter(t => t.id !== id);
            saveTasks();
            renderTasks();
            updateProgress();
        }, { once: true });
    } else {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTasks();
        updateProgress();
    }
    playSound('delete');
}

/** Begin inline editing of a task */
function startEdit(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const el = taskList.querySelector(`[data-id="${id}"]`);
    const textEl = el.querySelector('.task-text');
    const contentEl = el.querySelector('.task-content');

    // Replace text with input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'edit-input';
    input.value = task.text;

    // Hide meta and replace text
    const meta = contentEl.querySelector('.task-meta');
    if (meta) meta.style.display = 'none';
    textEl.replaceWith(input);
    input.focus();
    input.select();

    const finishEdit = (save = true) => {
        const newText = input.value.trim();
        if (save && newText && newText !== task.text) {
            task.text = newText;
            saveTasks();
        }
        renderTasks();
    };

    input.addEventListener('blur', () => finishEdit(true));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') finishEdit(false);
    });

    playSound('click');
}

/** Clear all completed tasks */
function clearCompleted() {
    const completedEls = taskList.querySelectorAll('.task-item.completed');
    if (completedEls.length === 0) return;

    completedEls.forEach((el, i) => {
        setTimeout(() => el.classList.add('removing'), i * 50);
    });

    setTimeout(() => {
        tasks = tasks.filter(t => !t.completed);
        saveTasks();
        renderTasks();
        updateProgress();
    }, completedEls.length * 50 + 300);

    playSound('delete');
}

// ============ FILTERING & SEARCH ============

/** Get tasks after applying current filter and search query */
function getFilteredTasks() {
    let filtered = [...tasks];

    // Apply filter
    if (currentFilter === 'pending') {
        filtered = filtered.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(t => t.completed);
    }

    // Apply search
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(t => t.text.toLowerCase().includes(q));
    }

    return filtered;
}

// ============ DATE FORMATTING ============

/** Format a date string into a human-readable label and status */
function formatDueDate(dateStr) {
    if (!dateStr) return null;

    const due = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));

    let label, status;
    if (diffDays < 0) {
        label = 'Overdue';
        status = 'overdue';
    } else if (diffDays === 0) {
        label = 'Today';
        status = 'today';
    } else if (diffDays === 1) {
        label = 'Tomorrow';
        status = '';
    } else {
        label = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        status = '';
    }

    return { label, status };
}

// ============ RENDERING ============

/** Render the task list */
function renderTasks() {
    const filtered = getFilteredTasks();
    taskList.innerHTML = '';

    if (filtered.length === 0) {
        emptyState.classList.add('visible');
        taskList.style.display = 'none';
    } else {
        emptyState.classList.remove('visible');
        taskList.style.display = 'flex';

        filtered.forEach((task, index) => {
            const el = createTaskElement(task, index);
            taskList.appendChild(el);
        });
    }

    updateProgress();
}

/** Create a DOM element for a single task */
function createTaskElement(task, index) {
    const div = document.createElement('div');
    div.className = `task-item${task.completed ? ' completed' : ''}`;
    div.dataset.id = task.id;
    div.draggable = true;
    div.style.animationDelay = `${index * 0.04}s`;

    // Due date info
    const dateInfo = formatDueDate(task.dueDate);
    const dateHTML = dateInfo
        ? `<span class="due-date-badge ${dateInfo.status}">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                   <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
               </svg>
               ${dateInfo.label}
           </span>`
        : '';

    div.innerHTML = `
        <div class="drag-handle" title="Drag to reorder">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
                <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
            </svg>
        </div>
        <label class="custom-checkbox">
            <input type="checkbox" ${task.completed ? 'checked' : ''}>
            <span class="checkmark">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            </span>
        </label>
        <div class="task-content">
            <span class="task-text"><span class="task-text-inner">${escapeHTML(task.text)}</span></span>
            <div class="task-meta">
                <span class="priority-badge ${task.priority}">${capitalize(task.priority)}</span>
                ${dateHTML}
            </div>
        </div>
        <div class="task-actions">
            <button class="action-btn edit-btn" title="Edit task" aria-label="Edit">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
            <button class="action-btn delete-btn" title="Delete task" aria-label="Delete">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
            </button>
        </div>
    `;

    // Event: Toggle complete
    const checkbox = div.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => toggleTask(task.id));

    // Event: Edit
    div.querySelector('.edit-btn').addEventListener('click', () => startEdit(task.id));

    // Event: Delete
    div.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));

    // Drag & Drop Events
    div.addEventListener('dragstart', (e) => handleDragStart(e, task.id));
    div.addEventListener('dragend', handleDragEnd);
    div.addEventListener('dragover', handleDragOver);
    div.addEventListener('dragenter', (e) => handleDragEnter(e, div));
    div.addEventListener('dragleave', (e) => handleDragLeave(e, div));
    div.addEventListener('drop', (e) => handleDrop(e, task.id));

    return div;
}

/** Update progress bar and counter */
function updateProgress() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    progressText.textContent = `${completed} of ${total} completed`;
    progressPercent.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;
}

/** Check if all tasks are completed and trigger confetti */
function checkAllCompleted() {
    if (tasks.length > 0 && tasks.every(t => t.completed)) {
        setTimeout(triggerConfetti, 300);
    }
}

// ============ DRAG & DROP ============

function handleDragStart(e, id) {
    draggedTaskId = id;
    e.dataTransfer.effectAllowed = 'move';
    // Needed for Firefox
    e.dataTransfer.setData('text/plain', id);
    requestAnimationFrame(() => {
        e.target.closest('.task-item')?.classList.add('dragging');
    });
}

function handleDragEnd(e) {
    draggedTaskId = null;
    $$('.task-item').forEach(el => {
        el.classList.remove('dragging', 'drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e, el) {
    e.preventDefault();
    if (el.dataset.id !== draggedTaskId) {
        el.classList.add('drag-over');
    }
}

function handleDragLeave(e, el) {
    // Only remove if leaving the element entirely
    if (!el.contains(e.relatedTarget)) {
        el.classList.remove('drag-over');
    }
}

function handleDrop(e, dropId) {
    e.preventDefault();

    if (!draggedTaskId || draggedTaskId === dropId) return;

    const dragIndex = tasks.findIndex(t => t.id === draggedTaskId);
    const dropIndex = tasks.findIndex(t => t.id === dropId);

    if (dragIndex === -1 || dropIndex === -1) return;

    const [movedTask] = tasks.splice(dragIndex, 1);
    tasks.splice(dropIndex, 0, movedTask);

    saveTasks();
    renderTasks();
    playSound('click');
}

// ============ FILTER INDICATOR ============

/** Position the sliding filter indicator behind the active filter button */
function updateFilterIndicator() {
    const activeBtn = filterTabs.querySelector('.filter-btn.active');
    if (!activeBtn || !filterIndicator) return;

    const tabsRect = filterTabs.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();

    filterIndicator.style.width = `${btnRect.width}px`;
    filterIndicator.style.left = `${btnRect.left - tabsRect.left}px`;
}

// ============ UTILITY FUNCTIONS ============

/** Escape HTML characters to prevent XSS */
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/** Capitalize first letter */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============ EVENT LISTENERS ============

function setupEventListeners() {
    // Add task
    addBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addTask();
    });

    // Search
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        renderTasks();
    });

    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);

    // Sound toggle
    soundToggle.addEventListener('click', toggleSound);

    // Clear completed
    clearCompletedBtn.addEventListener('click', clearCompleted);

    // FAB (mobile)
    fab.addEventListener('click', () => {
        taskInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => taskInput.focus(), 400);
    });

    // Filter tabs
    $$('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
            updateFilterIndicator();
            playSound('click');
        });
    });

    // Priority buttons
    $$('.priority-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.priority-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedPriority = btn.dataset.priority;
            playSound('click');
        });
    });

    // Date picker
    datePicker.addEventListener('click', () => {
        dueDateInput.showPicker?.() || dueDateInput.focus();
    });

    dueDateInput.addEventListener('change', () => {
        if (dueDateInput.value) {
            const info = formatDueDate(dueDateInput.value);
            dateLabel.textContent = info ? info.label : dueDateInput.value;
            datePicker.classList.add('has-date');
        } else {
            dateLabel.textContent = 'No date';
            datePicker.classList.remove('has-date');
        }
    });

    // Update filter indicator on resize
    window.addEventListener('resize', updateFilterIndicator);

    // Handle confetti canvas resize
    window.addEventListener('resize', () => {
        const canvas = $('#confetti-canvas');
        if (canvas.style.display !== 'none') {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    });
}

// ============ SHAKE ANIMATION (for empty input) ============
// Add CSS for shake dynamically
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-6px); }
        50% { transform: translateX(6px); }
        75% { transform: translateX(-4px); }
    }
    .shake {
        animation: shake 0.35s ease;
        border-color: var(--priority-high) !important;
    }
`;
document.head.appendChild(shakeStyle);

// ============ INITIALIZATION ============

function init() {
    loadPreferences();
    loadTasks();
    applyTheme();
    applySoundUI();
    renderTasks();
    updateProgress();

    // Position filter indicator after layout
    requestAnimationFrame(() => {
        updateFilterIndicator();
    });

    setupEventListeners();
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
