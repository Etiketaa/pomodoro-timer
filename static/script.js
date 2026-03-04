const OPENWEATHER_API_KEY = 'da3a47826e358e332366c7dea4460ae6'; // ¡TU CLAVE API DE OpenWeatherMap!

// --- WEATHER WIDGET ---
async function initWeather() {
    if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === 'YOUR_OPENWEATHER_API_KEY') {
        console.warn('OpenWeatherMap API key no configurada. El widget del clima no funcionará.');
        return;
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            await getWeatherData(latitude, longitude);
        }, (error) => {
            console.error('Error obteniendo la ubicación:', error);
        });
    } else {
        console.warn('Geolocalización no soportada por el navegador.');
    }
}

async function getWeatherData(latitude, longitude) {
    const weatherWidget = document.getElementById('weather-widget');
    const temperatureElement = weatherWidget.querySelector('.temperature');
    const descriptionElement = weatherWidget.querySelector('.description');
    const locationElement = weatherWidget.querySelector('.location');
    const iconElement = weatherWidget.querySelector('.weather-icon');

    temperatureElement.textContent = 'Cargando...';
    descriptionElement.textContent = '';
    locationElement.textContent = '';
    iconElement.style.backgroundImage = '';

    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=es`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`No se pudo obtener los datos del clima. Estado: ${response.status}, Mensaje: ${errorText}`);
        }
        const data = await response.json();
        displayWeather(data);
    } catch (error) {
        console.error('Error al obtener el clima:', error);
        temperatureElement.textContent = 'Error';
    }
}

function displayWeather(data) {
    const weatherWidget = document.getElementById('weather-widget');
    const temperatureElement = weatherWidget.querySelector('.temperature');
    const descriptionElement = weatherWidget.querySelector('.description');
    const locationElement = weatherWidget.querySelector('.location');
    const iconElement = weatherWidget.querySelector('.weather-icon');

    temperatureElement.textContent = `${Math.round(data.main.temp)}°C`;
    descriptionElement.textContent = data.weather[0].description;
    locationElement.textContent = data.name;
    iconElement.style.backgroundImage = `url(https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png)`;
}

// --- LOCALSTORAGE & HELPERS ---
const getFromLS = (key, defaultValue) => JSON.parse(localStorage.getItem(key)) || defaultValue;
const saveToLS = (key, value) => localStorage.setItem(key, JSON.stringify(value));

document.addEventListener('DOMContentLoaded', () => {
    let deletionTimers = {}; // Global object to store setTimeout IDs

    // --- DOM ELEMENTS ---
    const timerDisplay = document.getElementById('timer-display');
    const modeDisplay = document.getElementById('mode-display');
    const startPauseBtn = document.getElementById('start-pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const skipBtn = document.getElementById('skip-btn');
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const settingsForm = document.getElementById('settings-form');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const statsBtn = document.getElementById('stats-btn');
    const feedbackBtn = document.getElementById('feedback-btn');
    const pomodorosTodaySpan = document.getElementById('pomodoros-today');
    const pomodorosWeekSpan = document.getElementById('pomodoros-week');
    const chartCanvas = document.getElementById('pomodoro-chart');

    const feedbackForm = document.getElementById('feedback-form');
    const reviewsList = document.getElementById('reviews-list');
    const currentTaskDisplay = document.getElementById('current-task-display');
    const currentTaskTextSpan = currentTaskDisplay.querySelector('span');
    const alarmSound = new Audio('/static/alarm.mp3');
    const radioPlayer = document.getElementById('radio-player');
    const taskDetailsModal = document.getElementById('task-details-modal');
    const closeTaskDetailsModalBtn = document.getElementById('close-task-details-modal-btn');
    const taskDetailsForm = document.getElementById('task-details-form');
    const statsModal = document.getElementById('stats-modal');
    const closeStatsModalBtn = document.getElementById('close-stats-modal-btn');
    const feedbackModal = document.getElementById('feedback-modal');
    const closeFeedbackModalBtn = document.getElementById('close-feedback-modal-btn');
    // New instructions modal elements
    const instructionsBtn = document.getElementById('instructions-btn');
    const instructionsModal = document.getElementById('instructions-modal');
    const closeInstructionsModalBtn = document.getElementById('close-instructions-modal-btn');


    // --- STATE ---
    let settings = {};
    let tasks = [];
    let stats = {};
    let timerId = null;
    let mode = 'pomodoro';
    let remainingTime = 0;
    let pomodorosInCycle = 0;
    let isPaused = true;
    let animationIntervalId = null;
    let dailyGoal = null;
    let ambientMixer = null;
    let userProfile = null;

    // --- INITIALIZATION ---
    function init() {
        loadTheme();
        loadSettings();
        loadTasks();
        // Reschedule deletions for 'done' tasks on load
        tasks.forEach(task => {
            if (task.status === 'done' && task.deletionTime) {
                scheduleTaskDeletion(task.id, task.deletionTime);
            }
        });
        loadStats();
        resetTimer();
        renderTasks();
        renderStats();
        setupMusicPlayer(); // Music player setup
        setupEventListeners();
        initSortable();
        initWeather();

        // Initialize Daily Goal
        if (window.DailyGoal) {
            dailyGoal = new DailyGoal();
        }

        // Wire up export button
        const exportCsvBtn = document.getElementById('export-csv-btn');
        if (exportCsvBtn && window.DataExport) {
            exportCsvBtn.addEventListener('click', () => DataExport.exportCSV());
        }

        // Initialize Ambient Sound Mixer
        if (window.AmbientSoundMixer) {
            ambientMixer = new AmbientSoundMixer();
        }

        // Set initial mode class
        document.body.classList.add('mode-pomodoro');

        // Initialize User Profile
        if (window.UserProfile) {
            userProfile = new UserProfile();
        }

        // Initialize Workspace Customizer
        if (window.WorkspaceCustomizer) {
            new WorkspaceCustomizer();
        }

        // Update companions widget from chat contacts
        updateCompanionsWidget();

        // Wire up profile modal
        const profileBtn = document.getElementById('profile-btn');
        const profileModal = document.getElementById('profile-modal');
        const closeProfileModal = document.getElementById('close-profile-modal');

        profileBtn?.addEventListener('click', () => {
            if (userProfile) userProfile.renderProfileModal('profile-content');
            profileModal?.classList.remove('hidden');
            document.getElementById('user-menu')?.classList.add('hidden');
        });
        closeProfileModal?.addEventListener('click', () => profileModal?.classList.add('hidden'));
        profileModal?.addEventListener('click', (e) => { if (e.target === profileModal) profileModal.classList.add('hidden'); });

        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => console.log('Service Worker registered! Scope: ', registration.scope))
                    .catch(err => console.log('Service Worker registration failed: ', err));
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

        updateCurrentTaskDisplay();
        const totalTime = settings[mode] * 60;
        timerId = setInterval(() => {
            remainingTime--;
            updateTimerDisplay();
            // Update circular progress
            if (window.PomodoroV2) {
                window.PomodoroV2.updateProgress(remainingTime, totalTime);
            }
            if (remainingTime <= 0) {
                clearInterval(timerId);
                alarmSound.play();
                // Pause ambient sounds during alarm
                if (ambientMixer) ambientMixer.pauseAll();
                if (mode === 'pomodoro') {
                    recordPomodoro();
                    pomodorosInCycle++;
                    // Update daily goal
                    if (dailyGoal) {
                        dailyGoal.recordPomodoro();
                    }
                    // Add XP to user profile
                    if (userProfile) {
                        const result = userProfile.addXP(25);
                        Toast.show(`+25 XP ✨ (Total: ${result.newTotal})`, 'info', 2000);
                    }
                    // Update session dots
                    if (window.PomodoroV2) {
                        window.PomodoroV2.updateSessionDots(pomodorosInCycle);
                    }
                    if (window.Toast) {
                        Toast.show('¡Pomodoro completado! Tomá un descanso 🎉', 'success');
                    }
                } else {
                    if (window.Toast) {
                        Toast.show('Descanso terminado. ¡A trabajar! 💪', 'info');
                    }
                }
                switchMode();
            }
        }, 1000);
    }

    function pauseTimer() {
        isPaused = true;
        startPauseBtn.textContent = 'INICIAR';

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
        modeDisplay.textContent = { pomodoro: 'Pomodoro', shortBreak: 'Descanso Corto', longBreak: 'Descanso Largo' }[mode];

        // Update mode transition class
        document.body.classList.remove('mode-pomodoro', 'mode-shortBreak', 'mode-longBreak');
        document.body.classList.add('mode-' + mode);

        // Resume ambient sounds
        if (ambientMixer) ambientMixer.resumeAll();
        // Update circular progress color
        if (window.PomodoroV2) {
            window.PomodoroV2.setMode(mode);
            window.PomodoroV2.updateProgress(0, 1); // Reset to 0%
        }
        resetTimer();
    }

    function getNextMode() {
        return mode === 'pomodoro' ? (pomodorosInCycle % 4 === 0 ? 'longBreak' : 'shortBreak') : 'pomodoro';
    }

    // --- TASKS (KANBAN BOARD) ---
    function loadTasks() { tasks = getFromLS('pomodoroTasks', []); }
    function saveTasks() { saveToLS('pomodoroTasks', tasks); }

    function renderTasks() {
        const todoColumnElement = document.querySelector('#grid-todo-column .task-list-column');
        const inProgressColumnElement = document.querySelector('#grid-inprogress-column .task-list-column');
        const doneColumnElement = document.querySelector('#grid-done-column .task-list-column');

        todoColumnElement.innerHTML = '';
        inProgressColumnElement.innerHTML = '';
        doneColumnElement.innerHTML = '';

        const statusOrder = ['todo', 'inProgress', 'done'];

        tasks.forEach(task => {
            let columnElement;
            if (task.status === 'todo') columnElement = todoColumnElement;
            else if (task.status === 'inProgress') columnElement = inProgressColumnElement;
            else if (task.status === 'done') columnElement = doneColumnElement;

            if (columnElement) {
                const card = document.createElement('div');
                card.className = 'task-card';
                if (task.status === 'done') {
                    card.classList.add('task-done'); // Add class for strikethrough
                    if (task.deletionTime) {
                        scheduleTaskDeletion(task.id, task.deletionTime); // Reschedule deletion on render
                    }
                }
                card.setAttribute('data-id', task.id);

                // Determine which move buttons to show
                const currentIdx = statusOrder.indexOf(task.status);
                const canMoveLeft = currentIdx > 0;
                const canMoveRight = currentIdx < statusOrder.length - 1;

                card.innerHTML = `
                    <div class="task-card-top">
                        <span class="task-text" contenteditable="true">${task.text}</span>
                        <button class="delete-btn" aria-label="Borrar tarea">&times;</button>
                    </div>
                    <div class="task-card-bottom">
                        <div class="task-indicators"></div>
                        <div class="task-move-buttons">
                            ${canMoveLeft ? `<button class="task-move-btn task-move-left" data-id="${task.id}" data-dir="left" title="Mover a ${statusOrder[currentIdx - 1] === 'todo' ? 'Por Hacer' : 'En Proceso'}">←</button>` : ''}
                            ${canMoveRight ? `<button class="task-move-btn task-move-right" data-id="${task.id}" data-dir="right" title="Mover a ${statusOrder[currentIdx + 1] === 'inProgress' ? 'En Proceso' : 'Hecho'}">→</button>` : ''}
                        </div>
                    </div>
                `;
                columnElement.appendChild(card);

                card.querySelector('.task-text').addEventListener('blur', (e) => updateTaskText(task.id, e.target.textContent));

                const indicators = card.querySelector('.task-indicators');
                if (task.description) indicators.innerHTML += '<span class="indicator">&#9776;</span>';
                if (task.dueDate) indicators.innerHTML += '<span class="indicator">&#128197;</span>';
                if (task.labels && task.labels.length > 0) indicators.innerHTML += '<span class="indicator">&#127991;</span>';

                // Bind move buttons
                card.querySelectorAll('.task-move-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const taskId = Number(btn.dataset.id);
                        const direction = btn.dataset.dir;
                        moveTask(taskId, direction);
                    });
                });
            }
        });
        updateCurrentTaskDisplay();
    }

    function moveTask(taskId, direction) {
        const statusOrder = ['todo', 'inProgress', 'done'];
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const currentIdx = statusOrder.indexOf(task.status);
        const newIdx = direction === 'right' ? currentIdx + 1 : currentIdx - 1;
        if (newIdx < 0 || newIdx >= statusOrder.length) return;

        task.status = statusOrder[newIdx];

        // Handle done status auto-deletion
        if (task.status === 'done') {
            task.deletionTime = Date.now() + 10 * 60 * 1000;
            scheduleTaskDeletion(task.id, task.deletionTime);
        } else {
            delete task.deletionTime;
            if (deletionTimers[task.id]) {
                clearTimeout(deletionTimers[task.id]);
                delete deletionTimers[task.id];
            }
        }

        saveTasks();
        renderTasks();

        // Show feedback
        const statusNames = { todo: 'Por Hacer', inProgress: 'En Proceso', done: 'Hecho ✓' };
        if (window.Toast) {
            Toast.show(`Tarea movida a "${statusNames[task.status]}"`, 'info', 1500);
        }
    }


    function addTask(e) {
        e.preventDefault();
        const text = taskInput.value.trim();
        if (text) {
            tasks.push({ id: Date.now(), text, status: 'todo', description: '', dueDate: '', labels: [] });
            taskInput.value = '';
            saveTasks();
            renderTasks();
        }
    }

    function deleteTask(id) {
        tasks = tasks.filter(t => t.id !== id);
        // Clear timer if task was scheduled for deletion
        if (deletionTimers[id]) {
            clearTimeout(deletionTimers[id]);
            delete deletionTimers[id];
        }
        saveTasks();
        renderTasks();
    }

    function scheduleTaskDeletion(taskId, deletionTime) {
        // Clear any existing timer for this task
        if (deletionTimers[taskId]) {
            clearTimeout(deletionTimers[taskId]);
            delete deletionTimers[taskId];
        }

        const delay = deletionTime - Date.now();

        if (delay > 0) {
            deletionTimers[taskId] = setTimeout(() => {
                deleteTask(taskId);
                delete deletionTimers[taskId]; // Clean up after deletion
            }, delay);
        } else {
            // If delay is 0 or negative, delete immediately (task should have been deleted)
            deleteTask(taskId);
        }
    }

    function updateTaskText(id, text) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.text = text;
            saveTasks();
        }
    }

    function openTaskDetailsModal(id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            document.getElementById('task-details-id').value = task.id;
            document.getElementById('task-details-text').value = task.text;
            document.getElementById('task-details-description').value = task.description;
            document.getElementById('task-details-due-date').value = task.dueDate;
            document.getElementById('task-details-labels').value = task.labels.join(', ');
            taskDetailsModal.classList.remove('hidden');
        }
    }

    function saveTaskDetails(e) {
        e.preventDefault();
        const id = Number(document.getElementById('task-details-id').value);
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.text = document.getElementById('task-details-text').value;
            task.description = document.getElementById('task-details-description').value;
            task.dueDate = document.getElementById('task-details-due-date').value;
            task.labels = document.getElementById('task-details-labels').value.split(',').map(l => l.trim()).filter(l => l);
            saveTasks();
            renderTasks();
            taskDetailsModal.classList.add('hidden');
        }
    }

    function initSortable() {
        const todoColumnElement = document.querySelector('#grid-todo-column .task-list-column');
        const inProgressColumnElement = document.querySelector('#grid-inprogress-column .task-list-column');
        const doneColumnElement = document.querySelector('#grid-done-column .task-list-column');

        [todoColumnElement, inProgressColumnElement, doneColumnElement].forEach(column => {
            new Sortable(column, {
                group: 'tasks',
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: (evt) => {
                    const taskId = Number(evt.item.dataset.id); // Ensure taskId is a number
                    const newStatus = evt.to.dataset.status;
                    const task = tasks.find(t => t.id === taskId); // Use strict equality

                    if (task) {
                        task.status = newStatus;
                        if (newStatus === 'done') {
                            task.deletionTime = Date.now() + 10 * 60 * 1000; // 10 minutes from now
                            scheduleTaskDeletion(task.id, task.deletionTime);
                        } else {
                            delete task.deletionTime; // Remove deletion time if moved out of done
                            if (deletionTimers[task.id]) { // Clear any pending timer
                                clearTimeout(deletionTimers[task.id]);
                                delete deletionTimers[task.id];
                            }
                        }
                    }

                    const newOrderedTasks = [];
                    [todoColumnElement, inProgressColumnElement, doneColumnElement].forEach(col => {
                        col.querySelectorAll('.task-card').forEach(card => {
                            const id = Number(card.dataset.id); // Ensure id is a number
                            const foundTask = tasks.find(t => t.id === id); // Use strict equality
                            if (foundTask) newOrderedTasks.push(foundTask);
                        });
                    });
                    tasks = newOrderedTasks;

                    saveTasks();
                    renderTasks();
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
        }
    }

    // --- FEEDBACK ---
    const FIREBASE_URL = 'https://pomodoro-feedback-default-rtdb.firebaseio.com';

    async function submitFeedback(e) {
        e.preventDefault();
        if (!FIREBASE_URL) {
            alert('La funcionalidad de Feedback no está configurada.');
            return;
        }

        const name = document.getElementById('feedback-name').value || 'Anónimo';
        const rating = feedbackForm.querySelector('input[name="rating"]:checked')?.value;
        const message = document.getElementById('feedback-message').value;

        if (!rating || !message) {
            if (window.Toast) Toast.show('Por favor, deja una calificación y un mensaje.', 'warning');
            else alert('Por favor, deja una calificación y un mensaje.');
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
            fetchReviews();
            if (window.Toast) Toast.show('¡Gracias por tu feedback! 💬', 'success');
            else alert('¡Gracias por tu feedback!');
        } catch (error) {
            console.error("Error enviando feedback:", error);
            if (window.Toast) Toast.show('Error al enviar feedback', 'error');
            else alert('Hubo un error al enviar tu feedback.');
        }
    }

    async function fetchReviews() {
        if (!FIREBASE_URL) return;

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
            reviewsList.innerHTML = '<p>Aún no hay reseñas. ¡Sé el primero!</p>';
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

    // --- MUSIC PLAYER ---
    const MUSIC_STATIONS = {
        'lofi1': { name: 'Lofi Girl Radio', url: 'https://streams.ilovemusic.de/iloveradio17.mp3' },
        'lofi2': { name: 'ChilledCow Lofi', url: 'https://stream.zeno.fm/f3wvbbqmdg8uv' },
        'chillhop': { name: 'Chillhop Radio', url: 'https://stream.zeno.fm/fyn8eh3h5f8uv' },
        'jazzhop': { name: 'Jazz Hop Café', url: 'https://stream.zeno.fm/0r0xa792kwzuv' },
        'ambient': { name: 'Ambient Sleeping Pill', url: 'https://radio.stereoscenic.com/asp-s' },
        'study': { name: 'Study Music 24/7', url: 'https://stream.zeno.fm/8m1kk0b8k48uv' },
        'piano': { name: 'Piano Relaxante', url: 'https://stream.zeno.fm/ey679v5u438uv' },
        'nature': { name: 'Nature Sounds', url: 'https://stream.zeno.fm/6jz6qw3cm5zuv' },
        'synthwave': { name: 'Synthwave Radio', url: 'https://stream.nightride.fm/nightride.m4a' },
        'classical': { name: 'Música Clásica', url: 'https://stream.zeno.fm/f3wvbbqmdg8uv' },
        'custom': { name: '🎵 URL Personalizada', url: '' }
    };

    const musicToggleBtn = document.getElementById('music-toggle-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const stationSelect = document.getElementById('music-station-select');
    const customStationInputContainer = document.getElementById('custom-station-input-container');
    const customStationUrlInput = document.getElementById('custom-station-url');
    const customStationBtn = document.getElementById('custom-station-btn');
    const radioStatus = document.getElementById('radio-status');

    function setupMusicPlayer() {
        Object.keys(MUSIC_STATIONS).forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = MUSIC_STATIONS[key].name;
            stationSelect.appendChild(option);
        });

        let lastStation = getFromLS('pomodoroLastStation', { key: 'lofi1', customUrl: '' });
        stationSelect.value = lastStation.key;

        if (lastStation.key === 'custom' && lastStation.customUrl) {
            MUSIC_STATIONS.custom.url = lastStation.customUrl;
            customStationUrlInput.value = lastStation.customUrl;
            radioPlayer.src = lastStation.customUrl;
            radioStatus.textContent = '🎵 Personalizada';
        } else {
            if (!MUSIC_STATIONS[lastStation.key]) lastStation.key = 'lofi1';
            radioPlayer.src = MUSIC_STATIONS[lastStation.key].url;
            radioStatus.textContent = MUSIC_STATIONS[lastStation.key].name;
        }

        customStationInputContainer.classList.toggle('hidden', lastStation.key !== 'custom');

        const initialVolume = getFromLS('pomodoroMusicVolume', 50);
        radioPlayer.volume = initialVolume / 100;
        volumeSlider.value = initialVolume;
        updatePlayPauseIcons();

        stationSelect.addEventListener('change', handleStationChange);
        customStationBtn.addEventListener('click', loadCustomStation);
        customStationUrlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                loadCustomStation();
            }
        });
        musicToggleBtn.addEventListener('click', toggleMusic);
        volumeSlider.addEventListener('input', setVolume);
        radioPlayer.addEventListener('play', updatePlayPauseIcons);
        radioPlayer.addEventListener('pause', updatePlayPauseIcons);

        // Add error handling for stream loading
        radioPlayer.addEventListener('error', (e) => {
            console.error('Error al cargar el stream de audio:', e);
            radioStatus.textContent = '❌ Error al cargar';
            setTimeout(() => {
                radioStatus.textContent = MUSIC_STATIONS[stationSelect.value]?.name || 'Selecciona una estación';
            }, 3000);
        });
    }

    function handleStationChange(e) {
        const selectedKey = e.target.value;
        const wasPaused = radioPlayer.paused;
        customStationInputContainer.classList.toggle('hidden', selectedKey !== 'custom');
        radioStatus.textContent = MUSIC_STATIONS[selectedKey].name;

        if (selectedKey !== 'custom') {
            radioPlayer.src = MUSIC_STATIONS[selectedKey].url;
            saveToLS('pomodoroLastStation', { key: selectedKey, customUrl: '' });
            if (!wasPaused) radioPlayer.play();
        }
    }

    function loadCustomStation() {
        const url = customStationUrlInput.value.trim();
        if (!url) {
            if (window.Toast) Toast.show('Ingresa una URL válida para el stream', 'warning');
            else alert('Por favor, ingresa una URL válida para el stream de audio.');
            return;
        }

        // Basic URL validation
        try {
            new URL(url);
        } catch (e) {
            if (window.Toast) Toast.show('URL no válida. Incluí http:// o https://', 'error');
            else alert('La URL ingresada no es válida. Asegúrate de incluir http:// o https://');
            return;
        }

        // Clear any existing embed
        const embedContainer = document.getElementById('music-embed-container');
        if (embedContainer) embedContainer.innerHTML = '';

        // Check if it's a Spotify URL
        const spotifyMatch = url.match(/open\.spotify\.com\/(playlist|track|album|artist)\/([a-zA-Z0-9]+)/);
        if (spotifyMatch) {
            const [, type, id] = spotifyMatch;
            radioPlayer.pause();
            radioPlayer.src = '';
            if (embedContainer) {
                embedContainer.innerHTML = `
                    <iframe src="https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0" 
                        width="100%" height="152" frameborder="0" allowfullscreen 
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                        loading="lazy" class="music-embed-iframe"></iframe>
                `;
                embedContainer.classList.remove('hidden');
            }
            radioStatus.textContent = '🎵 Spotify';
            MUSIC_STATIONS.custom.url = url;
            saveToLS('pomodoroLastStation', { key: 'custom', customUrl: url, embedType: 'spotify' });
            if (window.Toast) Toast.show('Spotify playlist cargada 🎧', 'success');

            _showLoadSuccess();
            return;
        }

        // Check if it's a YouTube URL
        const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|playlist\?list=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
        if (youtubeMatch) {
            const videoId = youtubeMatch[1];
            const isPlaylist = url.includes('playlist?list=');
            radioPlayer.pause();
            radioPlayer.src = '';

            let embedUrl;
            if (isPlaylist) {
                embedUrl = `https://www.youtube.com/embed/videoseries?list=${videoId}&autoplay=1`;
            } else {
                embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            }

            if (embedContainer) {
                embedContainer.innerHTML = `
                    <iframe src="${embedUrl}" width="100%" height="152" frameborder="0" 
                        allow="autoplay; encrypted-media" allowfullscreen 
                        class="music-embed-iframe"></iframe>
                `;
                embedContainer.classList.remove('hidden');
            }
            radioStatus.textContent = '▶️ YouTube';
            MUSIC_STATIONS.custom.url = url;
            saveToLS('pomodoroLastStation', { key: 'custom', customUrl: url, embedType: 'youtube' });
            if (window.Toast) Toast.show('YouTube cargado ▶️', 'success');

            _showLoadSuccess();
            return;
        }

        // Regular audio stream
        if (embedContainer) {
            embedContainer.classList.add('hidden');
            embedContainer.innerHTML = '';
        }

        const wasPaused = radioPlayer.paused;
        radioPlayer.src = url;
        MUSIC_STATIONS.custom.url = url;
        radioStatus.textContent = '🎵 Personalizada';
        saveToLS('pomodoroLastStation', { key: 'custom', customUrl: url, embedType: 'stream' });

        // Try to play and handle errors
        if (!wasPaused) {
            radioPlayer.play().catch(e => {
                console.error('Error al cargar stream personalizado:', e);
                if (window.Toast) Toast.show('Error al cargar el stream. Verificá la URL.', 'error');
            });
        }

        _showLoadSuccess();
    }

    function _showLoadSuccess() {
        const originalText = customStationBtn.textContent;
        customStationBtn.textContent = '✓ Cargado';
        customStationBtn.style.backgroundColor = '#10b981';
        setTimeout(() => {
            customStationBtn.textContent = originalText;
            customStationBtn.style.backgroundColor = '';
        }, 2000);
    }

    function toggleMusic() {
        if (!radioPlayer.src) {
            alert("Por favor, selecciona una estación o introduce una URL personalizada.");
            return;
        }
        if (radioPlayer.paused) {
            radioPlayer.play().catch(e => {
                console.error("Error al reproducir audio:", e);
                alert("No se pudo reproducir el audio. Verifica la URL del stream o los permisos del navegador.");
            });
        } else {
            radioPlayer.pause();
        }
    }

    function updatePlayPauseIcons() {
        const playIcon = document.getElementById('play-icon');
        const pauseIcon = document.getElementById('pause-icon');
        if (!playIcon || !pauseIcon) return;

        if (radioPlayer.paused) {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        } else {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        }
    }

    function setVolume(e) {
        const volume = e.target.value;
        radioPlayer.volume = volume / 100;
        saveToLS('pomodoroMusicVolume', volume);
    }

    // --- STATS ---
    function loadStats() { stats = getFromLS('pomodoroStats', {}); }
    function saveStats() { saveToLS('pomodoroStats', stats); }

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
    function openSettingsModal() { settingsModal.classList.remove('hidden'); }
    function closeSettingsModal() { settingsModal.classList.add('hidden'); }
    function openStatsModal() {
        statsModal.classList.remove('hidden');
        renderStats();
        // Render history
        if (window.DataExport) {
            DataExport.renderHistory('history-container');
        }
    }
    function closeStatsModal() { statsModal.classList.add('hidden'); }
    function openFeedbackModal() { feedbackModal.classList.remove('hidden'); fetchReviews(); }
    function closeFeedbackModal() { feedbackModal.classList.add('hidden'); }
    // New instructions modal functions
    function openInstructionsModal() { instructionsModal.classList.remove('hidden'); }
    function closeInstructionsModal() { instructionsModal.classList.add('hidden'); }

    function handleKeyboard(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
        if (e.code === 'Space') { e.preventDefault(); isPaused ? startTimer() : pauseTimer(); }
        if (e.code === 'KeyR') resetTimer();
        if (e.code === 'KeyN') switchMode();
    }

    function setupEventListeners() {
        startPauseBtn.addEventListener('click', () => isPaused ? startTimer() : pauseTimer());
        resetBtn.addEventListener('click', resetTimer);
        skipBtn.addEventListener('click', () => switchMode());

        taskForm.addEventListener('submit', addTask);
        document.querySelector('.app-container').addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-btn')) {
                const card = e.target.closest('.task-card');
                deleteTask(Number(card.dataset.id));
            } else if (e.target.closest('.task-card')) {
                openTaskDetailsModal(Number(e.target.closest('.task-card').dataset.id));
            }
        });

        settingsBtn.addEventListener('click', openSettingsModal);
        closeModalBtn.addEventListener('click', closeSettingsModal);
        settingsModal.addEventListener('click', (e) => e.target === settingsModal && closeSettingsModal());
        settingsForm.addEventListener('submit', saveSettings);

        taskDetailsForm.addEventListener('submit', saveTaskDetails);
        closeTaskDetailsModalBtn.addEventListener('click', () => taskDetailsModal.classList.add('hidden'));
        taskDetailsModal.addEventListener('click', (e) => e.target === taskDetailsModal && taskDetailsModal.classList.add('hidden'));

        feedbackForm.addEventListener('submit', submitFeedback);

        themeToggleBtn.addEventListener('click', toggleTheme);

        statsBtn.addEventListener('click', openStatsModal);
        closeStatsModalBtn.addEventListener('click', closeStatsModal);
        statsModal.addEventListener('click', (e) => e.target === statsModal && closeStatsModal());

        feedbackBtn.addEventListener('click', openFeedbackModal);
        closeFeedbackModalBtn.addEventListener('click', closeFeedbackModal);
        feedbackModal.addEventListener('click', (e) => e.target === feedbackModal && closeFeedbackModal());

        // New instructions modal event listeners
        instructionsBtn.addEventListener('click', openInstructionsModal);
        closeInstructionsModalBtn.addEventListener('click', closeInstructionsModal);
        instructionsModal.addEventListener('click', (e) => e.target === instructionsModal && closeInstructionsModal());

        document.addEventListener('keydown', handleKeyboard);
    }

    // --- COMPANIONS WIDGET ---
    function updateCompanionsWidget() {
        const list = document.getElementById('companions-list');
        const countEl = document.getElementById('companions-count');
        if (!list || !countEl) return;

        // Read contacts from chat localStorage (same key as user-chat.js)
        let contacts = [];
        try {
            contacts = JSON.parse(localStorage.getItem('pomodoroChat_contacts')) || [];
        } catch { contacts = []; }

        if (contacts.length === 0) {
            list.innerHTML = '<p class="companions-empty">Agregá compañeros desde el chat 💬</p>';
            countEl.textContent = '0 online';
            return;
        }

        // Render companion chips
        list.innerHTML = contacts.map(c => `
            <div class="companion-chip" title="ID: ${c.uid || ''}">
                <span class="companion-status online"></span>
                <span>${c.name || c.uid?.slice(0, 6) || 'Compañero'}</span>
            </div>
        `).join('');

        countEl.textContent = `${contacts.length} compañero${contacts.length !== 1 ? 's' : ''}`;
    }

    // Listen for chat contact changes
    window.addEventListener('storage', (e) => {
        if (e.key === 'pomodoroChat_contacts') updateCompanionsWidget();
    });

    // --- START THE APP ---
    init();
});

document.addEventListener('DOMContentLoaded', () => {
    // --- NEW ACCORDION MENU LOGIC ---
    const accordionToggle = document.getElementById('accordion-toggle');
    const accordionMenu = document.getElementById('accordion-menu');

    if (accordionToggle && accordionMenu) {
        accordionToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the window click event from firing immediately
            accordionMenu.classList.toggle('hidden');
        });

        // Close the menu if clicking outside of it
        window.addEventListener('click', (e) => {
            // Check if the menu is open and the click is not on the menu or the toggle button
            if (!accordionMenu.classList.contains('hidden') && !accordionMenu.contains(e.target) && !accordionToggle.contains(e.target)) {
                accordionMenu.classList.add('hidden');
            }
        });
    }
});

// --- PWA INSTALL PROMPT ---
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;

    // Check if user previously dismissed
    if (localStorage.getItem('pwaInstallDismissed')) return;

    // Show install banner
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
        setTimeout(() => banner.classList.remove('hidden'), 3000); // Show after 3s
    }
});

document.getElementById('pwa-install-btn')?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
        if (window.Toast) Toast.show('¡App instalada! 📱', 'success');
    }
    deferredInstallPrompt = null;
    document.getElementById('pwa-install-banner')?.classList.add('hidden');
});

document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
    document.getElementById('pwa-install-banner')?.classList.add('hidden');
    localStorage.setItem('pwaInstallDismissed', 'true');
});

window.addEventListener('appinstalled', () => {
    document.getElementById('pwa-install-banner')?.classList.add('hidden');
    deferredInstallPrompt = null;
    if (window.Toast) Toast.show('¡App instalada exitosamente! 🎉', 'success');
});
