let ytPlayer;
function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('youtube-player', {
        height: '0',
        width: '0',
        videoId: 'jfKfPfyJRdk', // Lofi Girl Video ID
        playerVars: {
            'autoplay': 0,
            'controls': 0,
            'loop': 1,
            'playlist': 'jfKfPfyJRdk' // Required for loop to work
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    const volumeSlider = document.getElementById('volume-slider');
    const initialVolume = getFromLS('pomodoroMusicVolume', 50);
    volumeSlider.value = initialVolume;
    event.target.setVolume(initialVolume);
}

function onPlayerStateChange(event) {
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    if (event.data === YT.PlayerState.PLAYING) {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
    } else {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
    }
}

// --- LOCALSTORAGE & HELPERS ---
const getFromLS = (key, defaultValue) => JSON.parse(localStorage.getItem(key)) || defaultValue;
const saveToLS = (key, value) => localStorage.setItem(key, JSON.stringify(value));

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const timerDisplay = document.getElementById('timer-display');
    const modeDisplay = document.getElementById('mode-display');
    const startPauseBtn = document.getElementById('start-pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const skipBtn = document.getElementById('skip-btn');

    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskColumns = document.querySelectorAll('.task-list-column');

    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const settingsForm = document.getElementById('settings-form');

    const musicToggleBtn = document.getElementById('music-toggle-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');

    const tabs = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    const pomodorosTodaySpan = document.getElementById('pomodoros-today');
    const pomodorosWeekSpan = document.getElementById('pomodoros-week');
    const chartCanvas = document.getElementById('pomodoro-chart');

    const pomodoroImage = document.getElementById('pomodoro-image');

    const feedbackForm = document.getElementById('feedback-form');
    const reviewsList = document.getElementById('reviews-list');

    const currentTaskDisplay = document.getElementById('current-task-display');
    const currentTaskTextSpan = currentTaskDisplay.querySelector('span');

    const alarmSound = new Audio('/static/alarm.mp3');

    // --- STATE ---
    let settings = {};
    let tasks = []; // Single array for all tasks
    let stats = {};

    let timerId = null;
    let mode = 'pomodoro';
    let remainingTime = 0;
    let pomodorosInCycle = 0;
    let isPaused = true;
    let animationIntervalId = null;

    // --- INITIALIZATION ---
    function init() {
        loadTheme();
        loadSettings();
        loadTasks();
        loadStats();
        resetTimer();
        renderTasks();
        renderStats();
        setupEventListeners();
        initSortable();

        // Register Service Worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('Service Worker registered! Scope: ', registration.scope);
                    })
                    .catch(err => {
                        console.log('Service Worker registration failed: ', err);
                    });
            });
        }
    }

    // --- THEME ---
    function loadTheme() {
        const theme = localStorage.getItem('pomodoroTheme') || 'light';
        document.body.classList.toggle('dark-mode', theme === 'dark');
        updateThemeIcons(theme);
    }

    function toggleTheme() {
        const isDark = document.body.classList.toggle('dark-mode');
        const theme = isDark ? 'dark' : 'light';
        localStorage.setItem('pomodoroTheme', theme);
        updateThemeIcons(theme);
    }

    function updateThemeIcons(theme) {
        const sunIcon = document.getElementById('theme-sun-icon');
        const moonIcon = document.getElementById('theme-moon-icon');
        sunIcon.classList.toggle('hidden', theme === 'dark');
        moonIcon.classList.toggle('hidden', theme === 'light');
    }

    // --- SETTINGS ---
    function loadSettings() {
        settings = getFromLS('pomodoroSettings', { pomodoro: 25, shortBreak: 5, longBreak: 15 });
        document.getElementById('pomodoro-duration').value = settings.pomodoro;
        document.getElementById('short-break-duration').value = settings.shortBreak;
        document.getElementById('long-break-duration').value = settings.longBreak;
    }

    function saveSettings(e) {
        e.preventDefault();
        settings.pomodoro = parseInt(document.getElementById('pomodoro-duration').value, 10);
        settings.shortBreak = parseInt(document.getElementById('short-break-duration').value, 10);
        settings.longBreak = parseInt(document.getElementById('long-break-duration').value, 10);
        saveToLS('pomodoroSettings', settings);
        closeSettingsModal();
        resetTimer();
    }

    // --- TIMER LOGIC ---
    function updateTimerDisplay() {
        const minutes = Math.floor(remainingTime / 60).toString().padStart(2, '0');
        const seconds = (remainingTime % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `${minutes}:${seconds}`;
        document.title = `${minutes}:${seconds} - Pomodoro`;
    }

    function startTimer() {
        isPaused = false;
        startPauseBtn.textContent = 'PAUSAR';
        if (mode === 'pomodoro') {
            // Inicia la animación del tomate
            pomodoroImage.src = '/static/images/pomo-2.png'; // Asegura que empieza en pomo-2
            animationIntervalId = setInterval(() => {
                if (pomodoroImage.src.includes('pomo-1.png')) {
                    pomodoroImage.src = '/static/images/pomo-2.png';
                } else {
                    pomodoroImage.src = '/static/images/pomo-1.png';
                }
            }, 500); // Alterna cada 0.5 segundos
        }
        updateCurrentTaskDisplay();
        timerId = setInterval(() => {
            remainingTime--;
            updateTimerDisplay();
            if (remainingTime <= 0) {
                clearInterval(timerId);
                alarmSound.play();
                if (mode === 'pomodoro') {
                    recordPomodoro();
                    pomodorosInCycle++;
                }
                switchMode();
            }
        }, 1000);
    }

    function pauseTimer() {
        isPaused = true;
        startPauseBtn.textContent = 'INICIAR';
        clearInterval(animationIntervalId); // Detiene la animación
        pomodoroImage.src = '/static/images/pomo-1.png'; // Vuelve a la imagen inicial
        clearInterval(timerId);
    }

    function resetTimer() {
        pauseTimer();
        remainingTime = settings[mode] * 60;
        pomodoroImage.src = '/static/images/pomo-1.png';
        updateTimerDisplay();
    }

    function switchMode(nextMode) {
        pauseTimer();
        mode = nextMode || getNextMode();
        modeDisplay.textContent = { pomodoro: 'Pomodoro', shortBreak: 'Descanso Corto', longBreak: 'Descanso Largo' }[mode];
        pomodoroImage.src = '/static/images/pomo-1.png';
        resetTimer();
    }

    function getNextMode() {
        return mode === 'pomodoro' ? (pomodorosInCycle % 4 === 0 ? 'longBreak' : 'shortBreak') : 'pomodoro';
    }

    // --- TASKS (KANBAN BOARD) ---
    function loadTasks() {
        tasks = getFromLS('pomodoroTasks', []);
    }

    function saveTasks() {
        saveToLS('pomodoroTasks', tasks);
    }

    function renderTasks() {
        taskColumns.forEach(col => col.innerHTML = '');
        tasks.forEach(task => {
            const column = document.querySelector(`.task-list-column[data-status='${task.status}']`);
            if (column) {
                const card = document.createElement('div');
                card.className = 'task-card';
                card.setAttribute('data-id', task.id);
                card.innerHTML = `
                    <span class="task-text">${task.text}</span>
                    <button class="delete-btn" aria-label="Borrar tarea">&times;</button>
                `;
                column.appendChild(card);
            }
        });
        updateCurrentTaskDisplay();
    }

    function addTask(e) {
        e.preventDefault();
        const text = taskInput.value.trim();
        if (text) {
            tasks.push({ id: Date.now(), text, status: 'todo' });
            taskInput.value = '';
            saveTasks();
            renderTasks();
        }
    }

    function deleteTask(id) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTasks();
    }

    function initSortable() {
        taskColumns.forEach(column => {
            new Sortable(column, {
                group: 'tasks',
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: (evt) => {
                    const taskId = evt.item.dataset.id;
                    const newStatus = evt.to.dataset.status;
                    const task = tasks.find(t => t.id == taskId);
                    if (task) {
                        task.status = newStatus;
                    }
                    
                    // Reorder tasks array based on DOM
                    const newOrderedTasks = [];
                    taskColumns.forEach(col => {
                        const status = col.dataset.status;
                        col.querySelectorAll('.task-card').forEach(card => {
                            const id = card.dataset.id;
                            const foundTask = tasks.find(t => t.id == id);
                            if(foundTask) newOrderedTasks.push(foundTask);
                        });
                    });
                    tasks = newOrderedTasks;

                    saveTasks();
                    renderTasks(); // Re-render to ensure consistency
                }
            });
        });
    }

    function updateCurrentTaskDisplay() {
        const firstInProgress = tasks.find(t => t.status === 'inProgress');
        const firstTodo = tasks.find(t => t.status === 'todo');
        const currentTask = firstInProgress || firstTodo;

        if (currentTask) {
            currentTaskTextSpan.textContent = currentTask.text;
            currentTaskDisplay.classList.remove('hidden');
        } else {
            currentTaskDisplay.classList.add('hidden');
        }
    }

    // --- FEEDBACK ---
    const FIREBASE_URL = 'https://pomodoro-feedback-default-rtdb.firebaseio.com'; // <-- AQUÍ VA TU URL DE FIREBASE

    async function submitFeedback(e) {
        e.preventDefault();
        if (!FIREBASE_URL) {
            alert('La funcionalidad de Feedback no está configurada. El desarrollador debe añadir la URL de Firebase.');
            return;
        }

        const name = document.getElementById('feedback-name').value || 'Anónimo';
        const rating = feedbackForm.querySelector('input[name="rating"]:checked')?.value;
        const message = document.getElementById('feedback-message').value;

        if (!rating || !message) {
            alert('Por favor, deja una calificación y un mensaje.');
            return;
        }

        const feedbackData = { name, rating, message, createdAt: new Date().toISOString() };

        try {
            const response = await fetch(`${FIREBASE_URL}/feedback.json`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(feedbackData)
            });
            if (!response.ok) throw new Error('No se pudo enviar el feedback.');
            
            feedbackForm.reset();
            fetchReviews(); // Refresh reviews list
            alert('¡Gracias por tu feedback!');
        } catch (error) {
            console.error("Error enviando feedback:", error);
            alert('Hubo un error al enviar tu feedback. Inténtalo de nuevo.');
        }
    }

    async function fetchReviews() {
        if (!FIREBASE_URL) return; // No hacer nada si la URL no está configurada

        reviewsList.innerHTML = '<p>Cargando reseñas...</p>';
        try {
            const response = await fetch(`${FIREBASE_URL}/feedback.json`);
            if (!response.ok) throw new Error('No se pudieron cargar las reseñas.');
            
            const data = await response.json();
            renderReviews(data);
        } catch (error) {
            console.error("Error cargando reseñas:", error);
            reviewsList.innerHTML = '<p>No se pudieron cargar las reseñas.</p>';
        }
    }

    function renderReviews(reviews) {
        reviewsList.innerHTML = '';
        if (!reviews) {
            reviewsList.innerHTML = '<p>Aún no hay reseñas. ¡Sé el primero!</p>'
            return;
        }

        Object.values(reviews).reverse().forEach(review => {
            const card = document.createElement('div');
            card.className = 'review-card';
            const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
            card.innerHTML = `
                <div class="review-header">
                    <span class="review-name">${review.name}</span>
                    <span class="review-rating">${stars}</span>
                </div>
                <p class="review-message">${review.message}</p>
            `;
            reviewsList.appendChild(card);
        });
    }

    // --- STATS ---
    function loadStats() {
        stats = getFromLS('pomodoroStats', {});
    }

    function saveStats() {
        saveToLS('pomodoroStats', stats);
    }

    function recordPomodoro() {
        const today = new Date().toISOString().slice(0, 10);
        stats[today] = (stats[today] || 0) + 1;
        saveStats();
        renderStats();
    }

    let pomodoroChart = null;
    function renderStats() {
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);
        pomodorosTodaySpan.textContent = stats[todayStr] || 0;

        let weekCount = 0;
        const labels = [];
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().slice(0, 10);
            const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
            labels.push(dayName);
            const count = stats[dateStr] || 0;
            data.push(count);
            const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
            if (i <= dayOfWeek) {
                weekCount += count;
            }
        }
        pomodorosWeekSpan.textContent = weekCount;

        if (pomodoroChart) pomodoroChart.destroy();
        pomodoroChart = new Chart(chartCanvas, {
            type: 'bar',
            data: { labels, datasets: [{ data, backgroundColor: 'rgba(59, 130, 246, 0.5)', borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 1, borderRadius: 4 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                plugins: { legend: { display: false } }
            }
        });
    }

    // --- UI & EVENT LISTENERS ---
    function toggleMusic() {
        if (!ytPlayer || typeof ytPlayer.getPlayerState !== 'function') return;
        const playerState = ytPlayer.getPlayerState();
        if (playerState === YT.PlayerState.PLAYING) {
            ytPlayer.pauseVideo();
        } else {
            ytPlayer.playVideo();
        }
    }

    function setVolume(e) {
        const volume = e.target.value;
        if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
            ytPlayer.setVolume(volume);
            saveToLS('pomodoroMusicVolume', volume);
        }
    }

    function openSettingsModal() { settingsModal.classList.remove('hidden'); }
    function closeSettingsModal() { settingsModal.classList.add('hidden'); }

    function showTab(tabId) {
        tabContents.forEach(content => content.classList.remove('active'));
        tabs.forEach(tab => tab.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        if (tabId === 'stats-section') renderStats();
        if (tabId === 'feedback-section') fetchReviews();
    }

    function handleKeyboard(e) {
        if (e.target.tagName === 'INPUT' || e.target.isContentEditable) return;
        if (e.code === 'Space') { e.preventDefault(); isPaused ? startTimer() : pauseTimer(); }
        if (e.code === 'KeyR') resetTimer();
        if (e.code === 'KeyN') switchMode();
    }

    function setupEventListeners() {
        startPauseBtn.addEventListener('click', () => isPaused ? startTimer() : pauseTimer());
        resetBtn.addEventListener('click', resetTimer);
        skipBtn.addEventListener('click', () => switchMode());

        taskForm.addEventListener('submit', addTask);
        document.getElementById('task-board').addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-btn')) {
                const card = e.target.closest('.task-card');
                const id = Number(card.dataset.id);
                deleteTask(id);
            }
        });

        settingsBtn.addEventListener('click', openSettingsModal);
        closeModalBtn.addEventListener('click', closeSettingsModal);
        settingsModal.addEventListener('click', (e) => e.target === settingsModal && closeSettingsModal());
        settingsForm.addEventListener('submit', saveSettings);

        feedbackForm.addEventListener('submit', submitFeedback);

        musicToggleBtn.addEventListener('click', toggleMusic);
        volumeSlider.addEventListener('input', setVolume);
        themeToggleBtn.addEventListener('click', toggleTheme);

        tabs.forEach(tab => tab.addEventListener('click', () => showTab(tab.dataset.tab)));
        document.addEventListener('keydown', handleKeyboard);
    }

    // --- START THE APP ---
    init();
});