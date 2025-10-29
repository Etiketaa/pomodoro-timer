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
                card.innerHTML = `
                    <span class="task-text" contenteditable="true">${task.text}</span>
                    <div class="task-indicators"></div>
                    <button class="delete-btn" aria-label="Borrar tarea">&times;</button>
                `;
                columnElement.appendChild(card);

                card.querySelector('.task-text').addEventListener('blur', (e) => updateTaskText(task.id, e.target.textContent));
                
                const indicators = card.querySelector('.task-indicators');
                if (task.description) indicators.innerHTML += '<span class="indicator">&#9776;</span>';
                if (task.dueDate) indicators.innerHTML += '<span class="indicator">&#128197;</span>';
                if (task.labels && task.labels.length > 0) indicators.innerHTML += '<span class="indicator">&#127991;</span>';
            }
        });
        updateCurrentTaskDisplay();
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
                            if(foundTask) newOrderedTasks.push(foundTask);
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
            fetchReviews();
            alert('¡Gracias por tu feedback!');
        } catch (error) {
            console.error("Error enviando feedback:", error);
            alert('Hubo un error al enviar tu feedback.');
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
        'aspen': { name: 'FM Aspen', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/ASPEN.mp3' },
        'lofi': { name: 'Lofi / Chillhop', url: 'https://stream.zeno.fm/umhxwwtke0hvv' }, // Updated Lo-fi URL
        'synthwave': { name: 'Synthwave', url: 'https://stream.nightride.fm/nightride.m4a' },
        'classical': { name: 'Clásica (Barroca)', url: 'http://wshu.streamguys.org/wshu-baroque-mp3' },
        'custom': { name: 'URL Personalizada', url: '' }
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

        let lastStation = getFromLS('pomodoroLastStation', { key: 'aspen', customUrl: '' });
        stationSelect.value = lastStation.key;
        
        if (lastStation.key === 'custom' && lastStation.customUrl) {
            MUSIC_STATIONS.custom.url = lastStation.customUrl;
            customStationUrlInput.value = lastStation.customUrl;
            radioPlayer.src = lastStation.customUrl;
            radioStatus.textContent = 'Personalizada';
        } else {
            if (!MUSIC_STATIONS[lastStation.key]) lastStation.key = 'aspen';
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
        musicToggleBtn.addEventListener('click', toggleMusic);
        volumeSlider.addEventListener('input', setVolume);
        radioPlayer.addEventListener('play', updatePlayPauseIcons);
        radioPlayer.addEventListener('pause', updatePlayPauseIcons);
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
        if (url) {
            const wasPaused = radioPlayer.paused;
            radioPlayer.src = url;
            radioStatus.textContent = 'Personalizada';
            saveToLS('pomodoroLastStation', { key: 'custom', customUrl: url });
            if (!wasPaused) radioPlayer.play();
        }
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
    function openStatsModal() { statsModal.classList.remove('hidden'); renderStats(); }
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
