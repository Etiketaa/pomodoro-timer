class Chatbox {
    constructor() {
        this.args = {
            openButton: document.querySelector('.chatbox__button'),
            chatBox: document.querySelector('.chatbox__support'),
            sendButton: document.querySelector('.send__button'),
            backdrop: document.querySelector('.chatbox-backdrop')
        }

        this.state = false;
        this.messages = [];
        this.conversationHistory = [];
        this.storageKey = 'pomodoroChat_history';
        this.maxHistory = 50;
    }

    display() {
        const { openButton, chatBox, sendButton, backdrop } = this.args;

        openButton.addEventListener('click', () => this.toggleState(chatBox, backdrop))

        sendButton.addEventListener('click', () => this.onSendButton(chatBox))

        const node = chatBox.querySelector('input');
        node.addEventListener("keyup", ({ key }) => {
            if (key === "Enter") {
                this.onSendButton(chatBox)
            }
        })

        // Load persisted history
        this.loadHistory();
        
        // Add welcome message if no history
        if (this.messages.length === 0) {
            this.addWelcomeMessage();
        }
        
        this.updateChatText(chatbox);
    }

    addWelcomeMessage() {
        const welcomeMsg = {
            name: "Assistant",
            message: "¡Hola! 👋 Soy **Pomo**, tu asistente de productividad.\n\nPuedo ayudarte a:\n• 📋 Crear y organizar tareas\n• 🔴 Clasificar por prioridad (Matriz de Eisenhower)\n• ⏱️ Controlar el timer\n• 📊 Ver tus estadísticas\n• ⚙️ Cambiar configuración\n\n¿En qué te ayudo?"
        };
        this.messages.push(welcomeMsg);
    }

    toggleState(chatbox, backdrop) {
        this.state = !this.state;

        if (this.state) {
            chatbox.classList.add('chatbox--active')
            backdrop.classList.add('chatbox-backdrop--active')
            this.updateChatText(chatbox);
        } else {
            chatbox.classList.remove('chatbox--active')
            backdrop.classList.remove('chatbox-backdrop--active')
        }
    }

    // ============================================
    // PERSISTENCE
    // ============================================
    
    loadHistory() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const data = JSON.parse(saved);
                this.messages = data.messages || [];
                this.conversationHistory = data.conversationHistory || [];
            }
        } catch (e) {
            console.warn('Error loading chat history:', e);
            this.messages = [];
            this.conversationHistory = [];
        }
    }

    saveHistory() {
        try {
            // Keep only last N messages
            const messagesToSave = this.messages.slice(-this.maxHistory);
            const historyToSave = this.conversationHistory.slice(-this.maxHistory);
            
            localStorage.setItem(this.storageKey, JSON.stringify({
                messages: messagesToSave,
                conversationHistory: historyToSave,
                lastSaved: Date.now()
            }));
        } catch (e) {
            console.warn('Error saving chat history:', e);
        }
    }

    clearHistory() {
        this.messages = [];
        this.conversationHistory = [];
        localStorage.removeItem(this.storageKey);
        this.addWelcomeMessage();
    }

    // ============================================
    // CONTEXT GATHERING
    // ============================================

    getUserTasks() {
        try {
            const tasks = JSON.parse(localStorage.getItem('pomodoroTasks')) || [];
            return tasks.map(task => ({
                id: task.id,
                text: task.text,
                status: task.status,
                description: task.description || '',
                dueDate: task.dueDate || '',
                labels: task.labels || []
            }));
        } catch (e) {
            return [];
        }
    }

    getPomodorosToday() {
        try {
            const stats = JSON.parse(localStorage.getItem('pomodoroStats')) || {};
            const today = new Date().toISOString().slice(0, 10);
            return stats[today] || 0;
        } catch (e) {
            return 0;
        }
    }

    getWeekStats() {
        try {
            const stats = JSON.parse(localStorage.getItem('pomodoroStats')) || {};
            const today = new Date();
            let weekTotal = 0;
            
            for (let i = 0; i < 7; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dateStr = date.toISOString().slice(0, 10);
                weekTotal += stats[dateStr] || 0;
            }
            
            return { weekTotal };
        } catch (e) {
            return { weekTotal: 0 };
        }
    }

    getTimerState() {
        // Try to get timer state from the app
        try {
            // Check if timer display exists to infer state
            const timerDisplay = document.getElementById('timer-display');
            const modeDisplay = document.getElementById('mode-display');
            const startPauseBtn = document.getElementById('start-pause-btn');
            
            if (!timerDisplay) return null;
            
            const timeParts = timerDisplay.textContent.split(':');
            const remainingTime = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
            
            let mode = 'pomodoro';
            if (modeDisplay) {
                const modeText = modeDisplay.textContent.toLowerCase();
                if (modeText.includes('corto')) mode = 'shortBreak';
                else if (modeText.includes('largo')) mode = 'longBreak';
            }
            
            const isPaused = startPauseBtn ? startPauseBtn.textContent === 'INICIAR' : true;
            
            return { mode, remainingTime, isPaused };
        } catch (e) {
            return null;
        }
    }

    getConfig() {
        try {
            return JSON.parse(localStorage.getItem('pomodoroSettings')) || { pomodoro: 25, shortBreak: 5, longBreak: 15 };
        } catch (e) {
            return { pomodoro: 25, shortBreak: 5, longBreak: 15 };
        }
    }

    // ============================================
    // ACTION EXECUTION
    // ============================================

    async executeAction(action) {
        const { action: actionType, ...params } = action;
        
        switch (actionType) {
            case 'crear_tarea':
                return this.actionCrearTarea(params);
            case 'borrar_tarea':
                return this.actionBorrarTarea(params);
            case 'mover_tarea':
                return this.actionMoverTarea(params);
            case 'iniciar_timer':
                return this.actionIniciarTimer();
            case 'pausar_timer':
                return this.actionPausarTimer();
            case 'reiniciar_timer':
                return this.actionReiniciarTimer();
            case 'config':
                return this.actionConfig(params);
            default:
                return null;
        }
    }

    actionCrearTarea(params) {
        const { text, priority, dueDate } = params;
        if (!text) return null;
        
        try {
            const tasks = JSON.parse(localStorage.getItem('pomodoroTasks')) || [];
            const newTask = {
                id: Date.now(),
                text: text,
                status: 'todo',
                description: '',
                dueDate: dueDate || '',
                labels: []
            };
            tasks.push(newTask);
            localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
            
            // Show toast
            if (window.Toast) {
                Toast.show(`Tarea "${text}" creada ✓`, 'success');
            }
            
            return { success: true, task: newTask };
        } catch (e) {
            console.error('Error creating task:', e);
            return null;
        }
    }

    actionBorrarTarea(params) {
        const { id } = params;
        if (!id) return null;
        
        try {
            let tasks = JSON.parse(localStorage.getItem('pomodoroTasks')) || [];
            const task = tasks.find(t => t.id === id);
            tasks = tasks.filter(t => t.id !== id);
            localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
            
            if (window.Toast) {
                Toast.show(`Tarea "${task?.text || 'desconocida'}" eliminada`, 'info');
            }
            
            return { success: true };
        } catch (e) {
            console.error('Error deleting task:', e);
            return null;
        }
    }

    actionMoverTarea(params) {
        const { id, status } = params;
        if (!id || !status) return null;
        
        try {
            const tasks = JSON.parse(localStorage.getItem('pomodoroTasks')) || [];
            const task = tasks.find(t => t.id === id);
            if (task) {
                task.status = status;
                if (status === 'done') {
                    task.deletionTime = Date.now() + 10 * 60 * 1000;
                }
                localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
                
                const statusNames = { todo: 'Por Hacer', inProgress: 'En Proceso', done: 'Hecho' };
                if (window.Toast) {
                    Toast.show(`"${task.text}" → ${statusNames[status]}`, 'info');
                }
                
                return { success: true };
            }
        } catch (e) {
            console.error('Error moving task:', e);
        }
        return null;
    }

    actionIniciarTimer() {
        const btn = document.getElementById('start-pause-btn');
        if (btn && btn.textContent === 'INICIAR') {
            btn.click();
            if (window.Toast) Toast.show('Timer iniciado ▶️', 'success');
            return { success: true };
        }
        return null;
    }

    actionPausarTimer() {
        const btn = document.getElementById('start-pause-btn');
        if (btn && btn.textContent === 'PAUSAR') {
            btn.click();
            if (window.Toast) Toast.show('Timer pausado ⏸️', 'info');
            return { success: true };
        }
        return null;
    }

    actionReiniciarTimer() {
        const btn = document.getElementById('reset-btn');
        if (btn) {
            btn.click();
            if (window.Toast) Toast.show('Timer reiniciado 🔄', 'info');
            return { success: true };
        }
        return null;
    }

    actionConfig(params) {
        try {
            const current = JSON.parse(localStorage.getItem('pomodoroSettings')) || {};
            const updated = {
                pomodoro: params.pomodoro || current.pomodoro || 25,
                shortBreak: params.shortBreak || current.shortBreak || 5,
                longBreak: params.longBreak || current.longBreak || 15
            };
            localStorage.setItem('pomodoroSettings', JSON.stringify(updated));
            
            // Update UI inputs
            const pomInput = document.getElementById('pomodoro-duration');
            const shortInput = document.getElementById('short-break-duration');
            const longInput = document.getElementById('long-break-duration');
            if (pomInput) pomInput.value = updated.pomodoro;
            if (shortInput) shortInput.value = updated.shortBreak;
            if (longInput) longInput.value = updated.longBreak;
            
            if (window.Toast) {
                Toast.show(`Config: Pomodoro ${updated.pomodoro}min | Descanso ${updated.shortBreak}min`, 'success');
            }
            
            return { success: true };
        } catch (e) {
            console.error('Error updating config:', e);
            return null;
        }
    }

    // ============================================
    // MAIN CHAT LOGIC
    // ============================================

    onSendButton(chatbox) {
        var textField = chatbox.querySelector('input');
        let text1 = textField.value.trim();
        if (text1 === "") {
            return;
        }

        // Handle /clear command
        if (text1.toLowerCase() === '/clear') {
            this.clearHistory();
            this.updateChatText(chatbox);
            textField.value = '';
            return;
        }

        let msg1 = { name: "User", message: text1 }
        this.messages.push(msg1);
        this.conversationHistory.push({ role: "user", content: text1 });

        // Show typing indicator
        this.showTypingIndicator(chatbox);
        textField.value = '';

        // Get full context
        const userTasks = this.getUserTasks();
        const pomodorosToday = this.getPomodorosToday();
        const timerState = this.getTimerState();
        const config = this.getConfig();
        const weekStats = this.getWeekStats();

        fetch('/api/chatbot', {
            method: 'POST',
            body: JSON.stringify({
                message: text1,
                history: this.conversationHistory.slice(-10),
                tasks: userTasks,
                pomodoros_today: pomodorosToday,
                timer_state: timerState,
                config: config,
                week_stats: weekStats
            }),
            headers: {
                'Content-Type': 'application/json'
            },
        })
            .then(r => r.json())
            .then(async r => {
                this.hideTypingIndicator(chatbox);
                
                let msg2 = { name: "Assistant", message: r.answer };
                this.messages.push(msg2);
                this.conversationHistory.push({ role: "assistant", content: r.answer });
                
                // Execute actions if any
                if (r.actions && r.actions.length > 0) {
                    for (const action of r.actions) {
                        await this.executeAction(action);
                    }
                }
                
                this.updateChatText(chatbox);
                this.saveHistory();

            }).catch((error) => {
                console.error('Error:', error);
                this.hideTypingIndicator(chatbox);
                let errorMsg = {
                    name: "Assistant",
                    message: "Lo siento, hubo un error de conexión. ¿Podés intentar de nuevo? 😅"
                };
                this.messages.push(errorMsg);
                this.updateChatText(chatbox);
            });
    }

    showTypingIndicator(chatbox) {
        const chatmessage = chatbox.querySelector('.chatbox__messages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = '<span></span><span></span><span></span>';
        chatmessage.insertBefore(typingDiv, chatmessage.firstChild);
    }

    hideTypingIndicator(chatbox) {
        const typingIndicator = chatbox.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    updateChatText(chatbox) {
        var html = '';
        this.messages.slice().reverse().forEach(function (item, index) {
            if (item.name === "Assistant") {
                // Simple markdown-like formatting
                let formatted = item.message
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br>');
                html += '<div class="messages__item messages__item--visitor">' + formatted + '</div>'
            }
            else {
                html += '<div class="messages__item messages__item--operator">' + item.message + '</div>'
            }
        });

        const chatmessage = chatbox.querySelector('.chatbox__messages');
        chatmessage.innerHTML = html;
    }
}


document.addEventListener('DOMContentLoaded', function () {
    const chatbox = new Chatbox();
    chatbox.display();
});
