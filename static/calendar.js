class PomodoroCalendar {
    constructor() {
        this.currentDate = new Date();
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
        this.selectedDate = null;

        this.modal = document.getElementById('calendar-modal');
        this.closeBtn = document.getElementById('close-calendar-modal-btn');
        this.prevBtn = document.getElementById('calendar-prev-month');
        this.nextBtn = document.getElementById('calendar-next-month');
        this.monthYearDisplay = document.getElementById('calendar-month-year');
        this.grid = document.getElementById('calendar-grid');
        this.dayPanel = document.getElementById('calendar-day-panel');
        this.dayPanelDate = document.getElementById('day-panel-date');
        this.dayPanelTasks = document.getElementById('day-panel-tasks');
        this.dayPanelAddBtn = document.getElementById('day-panel-add-task');
        this.calendarBtn = document.getElementById('calendar-btn');

        this.init();
    }

    init() {
        this.calendarBtn?.addEventListener('click', () => this.open());
        this.closeBtn?.addEventListener('click', () => this.close());
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
        this.prevBtn?.addEventListener('click', () => this.changeMonth(-1));
        this.nextBtn?.addEventListener('click', () => this.changeMonth(1));
        this.dayPanelAddBtn?.addEventListener('click', () => this.addTaskFromCalendar());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal?.classList.contains('hidden')) {
                this.close();
            }
        });

        this.render();
    }

    open() {
        this.modal?.classList.remove('hidden');
        this.currentDate = new Date();
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
        this.render();
    }

    close() {
        this.modal?.classList.add('hidden');
        this.dayPanel?.classList.add('hidden');
        this.selectedDate = null;
    }

    changeMonth(delta) {
        this.currentMonth += delta;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        } else if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.dayPanel?.classList.add('hidden');
        this.selectedDate = null;
        this.render();
    }

    getTasks() {
        try {
            return JSON.parse(localStorage.getItem('pomodoroTasks')) || [];
        } catch {
            return [];
        }
    }

    getStats() {
        try {
            return JSON.parse(localStorage.getItem('pomodoroStats')) || {};
        } catch {
            return {};
        }
    }

    getTasksForDate(dateStr) {
        return this.getTasks().filter(t => t.dueDate === dateStr);
    }

    hasPomodorosOnDate(dateStr) {
        const stats = this.getStats();
        return stats[dateStr] && stats[dateStr] > 0;
    }

    formatDateStr(year, month, day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    render() {
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        this.monthYearDisplay.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;

        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        const daysInMonth = lastDay.getDate();

        const today = new Date();
        const todayStr = this.formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());

        this.grid.innerHTML = '';

        for (let i = 0; i < startDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day empty';
            this.grid.appendChild(emptyCell);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = this.formatDateStr(this.currentYear, this.currentMonth, day);
            const cell = document.createElement('div');
            cell.className = 'calendar-day';

            if (dateStr === todayStr) {
                cell.classList.add('today');
            }
            if (dateStr === this.selectedDate) {
                cell.classList.add('selected');
            }

            const dayNum = document.createElement('span');
            dayNum.className = 'day-number';
            dayNum.textContent = day;
            cell.appendChild(dayNum);

            const tasks = this.getTasksForDate(dateStr);
            if (tasks.length > 0) {
                const taskDot = document.createElement('span');
                taskDot.className = 'calendar-task-dot';
                taskDot.title = `${tasks.length} tarea${tasks.length > 1 ? 's' : ''}`;
                cell.appendChild(taskDot);
            }

            if (this.hasPomodorosOnDate(dateStr)) {
                cell.classList.add('has-pomodoros');
                const pomDot = document.createElement('span');
                pomDot.className = 'calendar-pomodoro-dot';
                cell.appendChild(pomDot);
            }

            cell.addEventListener('click', () => this.selectDay(dateStr, day));
            this.grid.appendChild(cell);
        }
    }

    selectDay(dateStr, day) {
        this.selectedDate = dateStr;
        this.render();
        this.showDayPanel(dateStr);
    }

    showDayPanel(dateStr) {
        const [y, m, d] = dateStr.split('-');
        const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        this.dayPanelDate.textContent = `${dayNames[date.getDay()]} ${parseInt(d)} de ${monthNames[parseInt(m) - 1]}`;
        this.dayPanel?.classList.remove('hidden');

        this.renderDayTasks(dateStr);
    }

    renderDayTasks(dateStr) {
        const tasks = this.getTasksForDate(dateStr);
        const stats = this.getStats();
        const pomCount = stats[dateStr] || 0;

        this.dayPanelTasks.innerHTML = '';

        if (pomCount > 0) {
            const pomInfo = document.createElement('div');
            pomInfo.className = 'day-pomodoro-info';
            pomInfo.innerHTML = `<span class="pom-icon">🍅</span> ${pomCount} pomodoro${pomCount > 1 ? 's' : ''} completado${pomCount > 1 ? 's' : ''}`;
            this.dayPanelTasks.appendChild(pomInfo);
        }

        if (tasks.length === 0 && pomCount === 0) {
            const empty = document.createElement('p');
            empty.className = 'day-panel-empty';
            empty.textContent = 'Sin tareas para este día';
            this.dayPanelTasks.appendChild(empty);
            return;
        }

        tasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'day-task-card';

            const statusColors = { todo: '#f59e0b', inProgress: '#3b82f6', done: '#10b981' };
            const statusNames = { todo: 'Por Hacer', inProgress: 'En Proceso', done: 'Hecho' };

            card.innerHTML = `
                <div class="day-task-status" style="background: ${statusColors[task.status]}"></div>
                <div class="day-task-info">
                    <span class="day-task-text ${task.status === 'done' ? 'task-done-text' : ''}">${task.text}</span>
                    <span class="day-task-status-label">${statusNames[task.status]}</span>
                </div>
                <div class="day-task-actions">
                    ${task.status !== 'done' ? `<button class="day-task-done-btn" title="Marcar como hecho">✓</button>` : ''}
                    <button class="day-task-delete-btn" title="Eliminar tarea">&times;</button>
                </div>
            `;

            card.querySelector('.day-task-done-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.markTaskDone(task.id);
            });

            card.querySelector('.day-task-delete-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteTask(task.id);
            });

            this.dayPanelTasks.appendChild(card);
        });
    }

    addTaskFromCalendar() {
        if (!this.selectedDate) return;

        const text = prompt('Nombre de la tarea:');
        if (!text || !text.trim()) return;

        try {
            const tasks = JSON.parse(localStorage.getItem('pomodoroTasks')) || [];
            tasks.push({
                id: Date.now(),
                text: text.trim(),
                status: 'todo',
                description: '',
                dueDate: this.selectedDate,
                labels: []
            });
            localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
            this.render();
            this.renderDayTasks(this.selectedDate);

            if (window.Toast) {
                Toast.show('Tarea creada en el calendario', 'success');
            }
        } catch (e) {
            console.error('Error creando tarea:', e);
        }
    }

    markTaskDone(taskId) {
        try {
            const tasks = JSON.parse(localStorage.getItem('pomodoroTasks')) || [];
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.status = 'done';
                task.deletionTime = Date.now() + 10 * 60 * 1000;
                localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
                this.render();
                if (this.selectedDate) this.renderDayTasks(this.selectedDate);

                if (window.Toast) {
                    Toast.show('Tarea marcada como hecha', 'success');
                }
            }
        } catch (e) {
            console.error('Error actualizando tarea:', e);
        }
    }

    deleteTask(taskId) {
        try {
            let tasks = JSON.parse(localStorage.getItem('pomodoroTasks')) || [];
            tasks = tasks.filter(t => t.id !== taskId);
            localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
            this.render();
            if (this.selectedDate) this.renderDayTasks(this.selectedDate);

            if (window.Toast) {
                Toast.show('Tarea eliminada', 'info');
            }
        } catch (e) {
            console.error('Error eliminando tarea:', e);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.pomodoroCalendar = new PomodoroCalendar();
});
