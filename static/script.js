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

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const timerDisplay = document.getElementById('timer-display');
    const modeDisplay = document.getElementById('mode-display');
    const startPauseBtn = document.getElementById('start-pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const skipBtn = document.getElementById('skip-btn');

    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');

    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const settingsForm = document.getElementById('settings-form');

    const musicToggleBtn = document.getElementById('music-toggle-btn');
    const volumeSlider = document.getElementById('volume-slider');

    const tabs = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    const pomodorosTodaySpan = document.getElementById('pomodoros-today');
    const pomodorosWeekSpan = document.getElementById('pomodoros-week');
    const chartCanvas = document.getElementById('pomodoro-chart');

    const currentTaskDisplay = document.getElementById('current-task-display');
    const currentTaskTextSpan = currentTaskDisplay.querySelector('span');

    const alarmSound = new Audio('static/alarm.mp3');

    // --- STATE ---
    let settings = {};
    let tasks = [];
    let stats = {};

    let timerId = null;
    let mode = 'pomodoro'; // pomodoro, shortBreak, longBreak
    let remainingTime = 0;
    let pomodorosInCycle = 0;
    let isPaused = true;

    // --- INITIALIZATION ---
    function init() {
        loadSettings();
        loadTasks();
        loadStats();
        resetTimer();
        renderTasks();
        renderStats();
        setupEventListeners();
    }

    // --- LOCALSTORAGE HELPERS ---
    const getFromLS = (key, defaultValue) => JSON.parse(localStorage.getItem(key)) || defaultValue;
    const saveToLS = (key, value) => localStorage.setItem(key, JSON.stringify(value));

    // --- SETTINGS ---
    function loadSettings() {
        settings = getFromLS('pomodoroSettings', {
            pomodoro: 25,
            shortBreak: 5,
            longBreak: 15,
        });
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
            document.body.classList.add('focus-mode');
            updateCurrentTaskDisplay();
        }
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
        document.body.classList.remove('focus-mode');
        clearInterval(timerId);
    }

    function resetTimer() {
        pauseTimer();
        remainingTime = settings[mode] * 60;
        updateTimerDisplay();
    }

    function switchMode(nextMode) {
        pauseTimer();
        mode = nextMode || getNextMode();
        modeDisplay.textContent = {
            pomodoro: 'Pomodoro',
            shortBreak: 'Descanso Corto',
            longBreak: 'Descanso Largo'
        }[mode];
        resetTimer();
    }

    function getNextMode() {
        if (mode === 'pomodoro') {
            return pomodorosInCycle % 4 === 0 ? 'longBreak' : 'shortBreak';
        } else {
            return 'pomodoro';
        }
    }

    // --- TASKS ---
    function loadTasks() {
        tasks = getFromLS('pomodoroTasks', []);
    }

    function saveTasks() {
        saveToLS('pomodoroTasks', tasks);
    }

    function renderTasks() {
        taskList.innerHTML = '';
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.setAttribute('data-id', task.id);
            li.innerHTML = `
                <input type="checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text ${task.completed ? 'completed' : ''}" contenteditable="false">${task.text}</span>
                <div class="task-actions">
                    <button class="edit-btn">Editar</button>
                    <button class="delete-btn">Borrar</button>
                </div>
            `;
            taskList.appendChild(li);
        });
        updateCurrentTaskDisplay();
    }

    function addTask(e) {
        e.preventDefault();
        const text = taskInput.value.trim();
        if (text) {
            tasks.push({ id: Date.now(), text, completed: false });
            taskInput.value = '';
            saveTasks();
            renderTasks();
        }
    }

    function handleTaskAction(e) {
        const li = e.target.closest('li');
        if (!li) return;
        const id = Number(li.dataset.id);

        if (e.target.type === 'checkbox') {
            const task = tasks.find(t => t.id === id);
            task.completed = e.target.checked;
        } else if (e.target.classList.contains('delete-btn')) {
            tasks = tasks.filter(t => t.id !== id);
        } else if (e.target.classList.contains('edit-btn')) {
            const span = li.querySelector('.task-text');
            const isEditing = span.isContentEditable;
            span.contentEditable = !isEditing;
            span.focus();
            e.target.textContent = isEditing ? 'Editar' : 'Guardar';
            if (isEditing) {
                const task = tasks.find(t => t.id === id);
                task.text = span.textContent.trim();
            }
        }
        saveTasks();
        renderTasks();
    }

    function updateCurrentTaskDisplay() {
        const firstUncompleted = tasks.find(t => !t.completed);
        if (firstUncompleted) {
            currentTaskTextSpan.textContent = firstUncompleted.text;
            currentTaskDisplay.classList.remove('hidden');
        } else {
            currentTaskDisplay.classList.add('hidden');
        }
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
        taskList.addEventListener('click', handleTaskAction);

        settingsBtn.addEventListener('click', openSettingsModal);
        closeModalBtn.addEventListener('click', closeSettingsModal);
        settingsModal.addEventListener('click', (e) => e.target === settingsModal && closeSettingsModal());
        settingsForm.addEventListener('submit', saveSettings);

        musicToggleBtn.addEventListener('click', toggleMusic);
        volumeSlider.addEventListener('input', setVolume);

        tabs.forEach(tab => tab.addEventListener('click', () => showTab(tab.dataset.tab)));
        document.addEventListener('keydown', handleKeyboard);
    }

    // --- START THE APP ---
    init();
});
