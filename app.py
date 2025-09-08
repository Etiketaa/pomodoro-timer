from flask import Flask, render_template, request, jsonify, session, redirect, url_for, g, send_from_directory
from flask_babel import Babel, gettext
import csv
from datetime import datetime
import os
import sqlite3

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key_here' # Replace with a strong secret key
app.config['BABEL_DEFAULT_LOCALE'] = 'en'
app.config['BABEL_TRANSLATION_DIRECTORIES'] = 'translations'

babel = Babel(app)

def get_locale():
    # Try to guess the language from the user accept header first
    # then from the session, then from the default
    lang = request.accept_languages.best_match(['en', 'es'])
    if 'lang' in session:
        return session['lang']
    return lang if lang else 'en'

babel.localeselector = get_locale # Assign the function to the attribute

# Database setup
DATABASE = 'database.db'

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row # This makes rows behave like dicts
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        with app.open_resource('schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/submit_feedback', methods=['POST'])
def submit_feedback():
    data = request.get_json()
    feedback_text = data.get('feedback_text')
    rating = data.get('rating')
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    feedback_file = 'feedback.csv'
    file_exists = os.path.isfile(feedback_file)

    with open(feedback_file, 'a', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['timestamp', 'feedback_text', 'rating']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        if not file_exists:
            writer.writeheader()

        writer.writerow({
            'timestamp': timestamp,
            'feedback_text': feedback_text,
            'rating': rating
        })

    return jsonify({'message': gettext('Feedback submitted successfully!')}), 200

@app.route('/set_language/<lang>')
def set_language(lang):
    session['lang'] = lang
    return redirect(request.referrer or url_for('index'))

# Task API Endpoints
@app.route('/tasks', methods=['GET'])
def get_tasks():
    db = get_db()
    cursor = db.execute('SELECT id, title, description, due_date, status FROM tasks')
    tasks = cursor.fetchall()
    return jsonify([dict(task) for task in tasks])

@app.route('/tasks', methods=['POST'])
def add_task():
    db = get_db()
    data = request.get_json()
    title = data.get('title')
    description = data.get('description')
    due_date = data.get('due_date')
    status = data.get('status', 'todo')

    if not title:
        return jsonify({'error': gettext('Title is required.')}), 400

    try:
        cursor = db.execute(
            'INSERT INTO tasks (title, description, due_date, status) VALUES (?, ?, ?, ?)',
            (title, description, due_date, status)
        )
        db.commit()
        return jsonify({'message': gettext('Task added successfully!'), 'id': cursor.lastrowid}), 201
    except sqlite3.Error as e:
        return jsonify({'error': gettext('Database error: ') + str(e)}), 500

@app.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    db = get_db()
    data = request.get_json()
    
    # Build update query dynamically based on provided fields
    set_clauses = []
    params = []
    
    if 'title' in data:
        set_clauses.append('title = ?')
        params.append(data['title'])
    if 'description' in data:
        set_clauses.append('description = ?')
        params.append(data['description'])
    if 'due_date' in data:
        set_clauses.append('due_date = ?')
        params.append(data['due_date'])
    if 'status' in data:
        set_clauses.append('status = ?')
        params.append(data['status'])

    if not set_clauses:
        return jsonify({'error': gettext('No fields provided for update.')}), 400

    params.append(task_id)
    query = f"UPDATE tasks SET {", ".join(set_clauses)} WHERE id = ?"

    try:
        cursor = db.execute(query, tuple(params))
        db.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': gettext('Task not found.')}), 404
        return jsonify({'message': gettext('Task updated successfully!')}), 200
    except sqlite3.Error as e:
        return jsonify({'error': gettext('Database error: ') + str(e)}), 500

@app.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    db = get_db()
    try:
        cursor = db.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
        db.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': gettext('Task not found.')}), 404
        return jsonify({'message': gettext('Task deleted successfully!')}), 200
    except sqlite3.Error as e:
        return jsonify({'error': gettext('Database error: ') + str(e)}), 500

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    init_db() # Initialize the database when the app starts
    app.run(debug=True)
