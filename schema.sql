DROP TABLE IF EXISTS tasks;

CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'todo', -- 'todo', 'in_progress', 'done'
    priority TEXT NOT NULL DEFAULT 'pendiente' -- 'urgente', 'en proceso', 'pendiente'
);

DROP TABLE IF EXISTS meetings;

CREATE TABLE meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    participants TEXT
);

DROP TABLE IF EXISTS pomodoro_sessions;

CREATE TABLE pomodoro_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    task_id INTEGER,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);