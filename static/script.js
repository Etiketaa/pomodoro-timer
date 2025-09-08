    // Initial values, will be updated from inputs
    let WORK_TIME_MINUTES = 25;
    let SHORT_BREAK_TIME_MINUTES = 5;
    let LONG_BREAK_TIME_MINUTES = 15;

    const lofiTracks = [
        '/static/lo-fi-loop.mp3',
        '/static/fiesta-de-cumbia.mp3',
        '/static/carnaval-des-tromepetter.mp3',
        '/static/cumbia-de-celebracion.mp3',
        '/static/lofi-backround music.mp3',
        '/static/lofi-295209.mp3',
        '/static/lofi-lofi-chill.mp3',
        '/static/lofi-study-calm-peacefull-chill-hop.mp3',
        '/static/good-night-lofi-cozy-chill-music.mp3'
    ];
    let currentTrackIndex = 0;

    let timer = null;
    let timeLeft = WORK_TIME_MINUTES * 60;
    let isPaused = true;
    let mode = 'work'; // work, short, long
    let pomodoroCount = 0;
    let totalTimeForCurrentMode = WORK_TIME_MINUTES * 60; // To calculate scale
    let isAlertSoundEnabled = true; // New state for alert sound

    const timeDisplay = document.getElementById('time');
    const pomodoroButton = document.getElementById('pomodoro');
    const shortBreakButton = document.getElementById('short-break');
    const longBreakButton = document.getElementById('long-break');
    const startButton = document.getElementById('start');
    const pauseButton = document.getElementById('pause');
    const resetButton = document.getElementById('reset');
    const tomatoSvg = document.getElementById('tomato-svg');
    const lofiAudio = document.getElementById('lofi-audio');
    const alertAudio = document.getElementById('alert-audio');
    const toggleLofiButton = document.getElementById('toggle-lofi');
    const prevLofiButton = document.getElementById('prev-lofi');
    const nextLofiButton = document.getElementById('next-lofi');
    const toggleAlertButton = document.getElementById('toggle-alert');
    const volumeSlider = document.getElementById('volume-slider');

    // Settings inputs
    const workTimeInput = document.getElementById('work-time-input');
    const shortBreakInput = document.getElementById('short-break-input');
    const longBreakInput = document.getElementById('long-break-input');

    // Initialize audio source and volume
    lofiAudio.src = lofiTracks[currentTrackIndex];
    lofiAudio.volume = volumeSlider.value;

    function updateDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // Update tomato scale
        const initialScale = 0.1;
        const maxScale = 1.0;
        const progress = (totalTimeForCurrentMode - timeLeft) / totalTimeForCurrentMode;
        const currentScale = initialScale + (maxScale - initialScale) * progress;
        tomatoSvg.style.transform = `scale(${currentScale})`;
    }

    function applySettings() {
        WORK_TIME_MINUTES = parseInt(workTimeInput.value) || 25;
        SHORT_BREAK_TIME_MINUTES = parseInt(shortBreakInput.value) || 5;
        LONG_BREAK_TIME_MINUTES = parseInt(longBreakInput.value) || 15;

        // If timer is paused and not running, update current time based on new settings
        if (isPaused && timer === null) {
            if (mode === 'work') {
                timeLeft = WORK_TIME_MINUTES * 60;
                totalTimeForCurrentMode = WORK_TIME_MINUTES * 60;
            } else {
                timeLeft = SHORT_BREAK_TIME_MINUTES * 60;
                totalTimeForCurrentMode = SHORT_BREAK_TIME_MINUTES * 60;
            } else {
                timeLeft = LONG_BREAK_TIME_MINUTES * 60;
                totalTimeForCurrentMode = LONG_BREAK_TIME_MINUTES * 60;
            }
            updateDisplay();
        }
    }

    function setMode(newMode) {
        clearInterval(timer);
        isPaused = true;
        mode = newMode;

        // Remove active class from all buttons
        pomodoroButton.classList.remove('active');
        shortBreakButton.classList.remove('active');
        longBreakButton.classList.remove('active');

        // Set time and active class based on new mode
        if (mode === 'work') {
            timeLeft = WORK_TIME_MINUTES * 60;
            totalTimeForCurrentMode = WORK_TIME_MINUTES * 60;
            pomodoroButton.classList.add('active');
        } else if (mode === 'short') {
            timeLeft = SHORT_BREAK_TIME_MINUTES * 60;
            totalTimeForCurrentMode = SHORT_BREAK_TIME_MINUTES * 60;
            shortBreakButton.classList.add('active');
        } else {
            timeLeft = LONG_BREAK_TIME_MINUTES * 60;
            totalTimeForCurrentMode = LONG_BREAK_TIME_MINUTES * 60;
            longBreakButton.classList.add('active');
        }
        updateDisplay();
    }

    function switchMode() {
        clearInterval(timer);
        isPaused = true;

        if (isAlertSoundEnabled) {
            alertAudio.play(); // Play alert sound when timer ends
        }

        if (mode === 'work') {
            pomodoroCount++;
            if (pomodoroCount % 4 === 0) {
                setMode('long');
            } else {
                setMode('short');
            }
        } else {
            setMode('work');
        }
    }

    function startTimer() {
        if (isPaused) {
            isPaused = false;
            timer = setInterval(() => {
                if (timeLeft > 0) {
                    timeLeft--;
                    updateDisplay();
                } else {
                    switchMode();
                }
            }, 1000);
            lofiAudio.play();
        }
    }

    function pauseTimer() {
        isPaused = true;
        clearInterval(timer);
        lofiAudio.pause();
    }

    function resetTimer() {
        pauseTimer();
        // Reset to the current mode's initial time based on settings
        if (mode === 'work') {
            timeLeft = WORK_TIME_MINUTES * 60;
            totalTimeForCurrentMode = WORK_TIME_MINUTES * 60;
        } else if (mode === 'short') {
            timeLeft = SHORT_BREAK_TIME_MINUTES * 60;
            totalTimeForCurrentMode = SHORT_BREAK_TIME_MINUTES * 60;
        } else {
            timeLeft = LONG_BREAK_TIME_MINUTES * 60;
            totalTimeForCurrentMode = LONG_BREAK_TIME_MINUTES * 60;
        }
        updateDisplay();
    }

    function playNextTrack() {
        currentTrackIndex = (currentTrackIndex + 1) % lofiTracks.length;
        lofiAudio.src = lofiTracks[currentTrackIndex];
        lofiAudio.play();
    }

    function playPreviousTrack() {
        currentTrackIndex = (currentTrackIndex - 1 + lofiTracks.length) % lofiTracks.length;
        lofiAudio.src = lofiTracks[currentTrackIndex];
        lofiAudio.play();
    }

    toggleLofiButton.addEventListener('click', () => {
        if (lofiAudio.paused) {
            lofiAudio.play();
            toggleLofiButton.innerHTML = '&#10074;&#10074;'; // Pause icon
        } else {
            lofiAudio.pause();
            toggleLofiButton.innerHTML = '&#9654;'; // Play icon
        }
    });
    prevLofiButton.addEventListener('click', playPreviousTrack);
    nextLofiButton.addEventListener('click', playNextTrack);

    toggleAlertButton.addEventListener('click', () => {
        isAlertSoundEnabled = !isAlertSoundEnabled;
        toggleAlertButton.innerHTML = isAlertSoundEnabled ? '&#128266;' : '&#128265;'; // Bell or muted bell
    });

    volumeSlider.addEventListener('input', () => {
        lofiAudio.volume = volumeSlider.value;
    });

    // Event listeners for settings inputs
    workTimeInput.addEventListener('change', applySettings);
    shortBreakInput.addEventListener('change', applySettings);
    longBreakInput.addEventListener('change', applySettings);

    pomodoroButton.addEventListener('click', () => setMode('work'));
    shortBreakButton.addEventListener('click', () => setMode('short'));
    longBreakButton.addEventListener('click', () => setMode('long'));
    startButton.addEventListener('click', startTimer);
    pauseButton.addEventListener('click', pauseTimer);
    resetButton.addEventListener('click', resetTimer);

    // Initial setup
    applySettings(); // Apply initial settings from input values
    updateDisplay(); // Initial display
    toggleLofiButton.innerHTML = lofiAudio.paused ? '&#9654;' : '&#10074;&#10074;'; // Set initial play/pause icon
    toggleAlertButton.innerHTML = isAlertSoundEnabled ? '&#128266;' : '&#128265;'; // Set initial alert icon

    // Feedback Form Logic
    const feedbackForm = document.getElementById('feedback-form');
    const feedbackTextarea = document.getElementById('feedback-text');
    const feedbackMessageDiv = document.getElementById('feedback-message');

    feedbackForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission

        const feedbackText = feedbackTextarea.value;
        const selectedRating = document.querySelector('input[name="rating"]:checked');
        const rating = selectedRating ? parseInt(selectedRating.value) : null;

        if (!feedbackText || !rating) {
            feedbackMessageDiv.textContent = '{{ _('Please provide both feedback and a rating.') }}';
            feedbackMessageDiv.className = 'message error';
            return;
        }

        try {
            const response = await fetch('/submit_feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    feedback_text: feedbackText,
                    rating: rating
                }),
            });

            const result = await response.json();

            if (response.ok) {
                feedbackMessageDiv.textContent = result.message;
                feedbackMessageDiv.className = 'message success';
                feedbackTextarea.value = ''; // Clear textarea
                if (selectedRating) {
                    selectedRating.checked = false; // Uncheck rating
                }
            } else {
                feedbackMessageDiv.textContent = result.message || '{{ _('Failed to submit feedback.') }}';
                feedbackMessageDiv.className = 'message error';
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            feedbackMessageDiv.textContent = '{{ _('An error occurred. Please try again later.') }}';
            feedbackMessageDiv.className = 'message error';
        }
    });
