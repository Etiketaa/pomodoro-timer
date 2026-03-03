/**
 * Data Export System for Pomodoro Timer v2
 * Export statistics to CSV and view detailed history
 */

class DataExport {
    /**
     * Export pomodoro stats as CSV file
     */
    static exportCSV() {
        const stats = JSON.parse(localStorage.getItem('pomodoroStats')) || {};
        const tasks = JSON.parse(localStorage.getItem('pomodoroTasks')) || [];

        if (Object.keys(stats).length === 0) {
            if (window.Toast) Toast.show('No hay datos para exportar', 'warning');
            return;
        }

        // Build CSV content
        let csv = 'Fecha,Pomodoros Completados\n';

        // Sort dates
        const sortedDates = Object.keys(stats).sort();
        sortedDates.forEach(date => {
            csv += `${date},${stats[date]}\n`;
        });

        // Add summary
        const totalPomodoros = Object.values(stats).reduce((a, b) => a + b, 0);
        const totalDays = sortedDates.length;
        const avgPerDay = totalDays > 0 ? (totalPomodoros / totalDays).toFixed(1) : 0;

        csv += `\nResumen\n`;
        csv += `Total Pomodoros,${totalPomodoros}\n`;
        csv += `Días activos,${totalDays}\n`;
        csv += `Promedio por día,${avgPerDay}\n`;

        // Add tasks section
        csv += `\nTareas\n`;
        csv += `Nombre,Estado,Fecha Vencimiento,Etiquetas\n`;
        tasks.forEach(task => {
            const status = { todo: 'Por Hacer', inProgress: 'En Proceso', done: 'Hecho' }[task.status] || task.status;
            const labels = (task.labels || []).join('; ');
            const dueDate = task.dueDate || '-';
            csv += `"${task.text.replace(/"/g, '""')}",${status},${dueDate},"${labels}"\n`;
        });

        // Trigger download
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const today = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `pomodoro-stats-${today}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        if (window.Toast) Toast.show('📊 Estadísticas exportadas', 'success');
    }

    /**
     * Render history table inside the stats modal
     */
    static renderHistory(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const stats = JSON.parse(localStorage.getItem('pomodoroStats')) || {};
        const sortedDates = Object.keys(stats).sort().reverse();

        if (sortedDates.length === 0) {
            container.innerHTML = '<p class="history-empty">Aún no hay historial. ¡Completá tu primer pomodoro!</p>';
            return;
        }

        const totalPomodoros = Object.values(stats).reduce((a, b) => a + b, 0);
        const bestDay = sortedDates.reduce((best, date) => stats[date] > (stats[best] || 0) ? date : best, sortedDates[0]);
        const bestDayFormatted = new Date(bestDay + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });

        let html = `
            <div class="history-summary-cards">
                <div class="history-card">
                    <span class="history-card-value">${totalPomodoros}</span>
                    <span class="history-card-label">Total</span>
                </div>
                <div class="history-card">
                    <span class="history-card-value">${sortedDates.length}</span>
                    <span class="history-card-label">Días</span>
                </div>
                <div class="history-card">
                    <span class="history-card-value">${(totalPomodoros / sortedDates.length).toFixed(1)}</span>
                    <span class="history-card-label">Promedio</span>
                </div>
                <div class="history-card">
                    <span class="history-card-value">${stats[bestDay]}</span>
                    <span class="history-card-label">Mejor día</span>
                </div>
            </div>
            <div class="history-table-wrapper">
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Pomodoros</th>
                            <th>Progreso</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Show last 30 days max
        const maxEntries = 30;
        const entriesToShow = sortedDates.slice(0, maxEntries);
        const maxPomodoros = Math.max(...Object.values(stats), 1);

        entriesToShow.forEach(date => {
            const count = stats[date];
            const barWidth = (count / maxPomodoros) * 100;
            const formatted = new Date(date + 'T12:00:00').toLocaleDateString('es-AR', {
                weekday: 'short', day: 'numeric', month: 'short'
            });

            html += `
                <tr>
                    <td>${formatted}</td>
                    <td class="history-count">${count}</td>
                    <td>
                        <div class="history-bar-container">
                            <div class="history-bar" style="width: ${barWidth}%"></div>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;

        if (sortedDates.length > maxEntries) {
            html += `<p class="history-note">Mostrando los últimos ${maxEntries} días. Exportá CSV para ver todo.</p>`;
        }

        container.innerHTML = html;
    }
}

window.DataExport = DataExport;
