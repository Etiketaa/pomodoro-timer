from flask import Flask, render_template, request, jsonify, session, redirect, url_for, g
from flask_babel import Babel, gettext
import csv
from datetime import datetime
import os
import sqlite3
import random
import json
import pickle
import numpy as np
import nltk
from nltk.stem import PorterStemmer
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.linear_model import LogisticRegression

app = Flask(__name__, static_folder='static')
app.config['SECRET_KEY'] = 'your_secret_key_here' # Replace with a strong secret key
app.config['BABEL_DEFAULT_LOCALE'] = 'es'
app.config['BABEL_TRANSLATION_DIRECTORIES'] = 'translations'

babel = Babel(app)

stemmer = PorterStemmer()

# Load the scikit-learn model and vectorizer
classifier = pickle.load(open('chatbot_classifier.pkl', 'rb'))
vectorizer = pickle.load(open('vectorizer.pkl', 'rb'))
classes = pickle.load(open('classes.pkl', 'rb'))
intents = json.loads(open('intents.json').read())

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
    cursor = db.execute('SELECT id, title, description, due_date, status, priority FROM tasks')
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
    priority = data.get('priority', 'pendiente')

    if not title:
        return jsonify({'error': gettext('Title is required.')}), 400

    try:
        cursor = db.execute(
            'INSERT INTO tasks (title, description, due_date, status, priority) VALUES (?, ?, ?, ?, ?)',
            (title, description, due_date, status, priority)
        )
        db.commit()
        return jsonify({'message': gettext('Task added successfully!'), 'id': cursor.lastrowid}), 201
    except sqlite3.Error as e:
        return jsonify({'error': gettext('Database error: ') + str(e)}), 500

@app.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    db = get_db()
    data = request.get_json()
    
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
    if 'priority' in data:
        set_clauses.append('priority = ?')
        params.append(data['priority'])

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

def get_stem_words(word_list, ignore_words):
    stem_words = []
    for word in word_list:
        if word not in ignore_words:
            w = stemmer.stem(word.lower())
            stem_words.append(w)
    return stem_words

@app.route("/predict", methods=['POST'])
def predict():
    text = request.get_json().get("message")
    
    print(f"Received message: {text}") # Debugging line
    # Preprocess the input text
    stemmed_words = get_stem_words(nltk.word_tokenize(text), ['?', '!', '.', ',', "'s", "'m"])
    processed_text = ' '.join(stemmed_words)
    
    # Transform the processed text using the loaded vectorizer
    input_vector = vectorizer.transform([processed_text]).toarray()
    
    # Predict the intent using the loaded classifier
    predicted_class_index = classifier.predict(input_vector)[0]
    tag = classes[predicted_class_index]
    
    # Get a random response from the intent
    list_of_intents = intents['intents']
    result = "Lo siento, no entiendo tu pregunta." # Default fallback
    for i in list_of_intents:
        if(i['tag']==tag):
            result = random.choice(i['responses'])
            break
    
    message = {"answer": result}
    return jsonify(message)

# Meeting API Endpoints
@app.route('/meetings', methods=['GET'])
def get_meetings():
    db = get_db()
    cursor = db.execute('SELECT id, title, date, time, participants FROM meetings')
    meetings = cursor.fetchall()
    return jsonify([dict(meeting) for meeting in meetings])

@app.route('/meetings', methods=['POST'])
def add_meeting():
    db = get_db()
    data = request.get_json()
    title = data.get('title')
    date = data.get('date')
    time = data.get('time')
    participants = data.get('participants')

    if not title or not date or not time:
        return jsonify({'error': gettext('Title, date, and time are required.')}), 400

    try:
        cursor = db.execute(
            'INSERT INTO meetings (title, date, time, participants) VALUES (?, ?, ?, ?)',
            (title, date, time, participants)
        )
        db.commit()
        return jsonify({'message': gettext('Meeting added successfully!'), 'id': cursor.lastrowid}), 201
    except sqlite3.Error as e:
        return jsonify({'error': gettext('Database error: ') + str(e)}), 500

@app.route('/meetings/<int:meeting_id>', methods=['PUT'])
def update_meeting(meeting_id):
    db = get_db()
    data = request.get_json()
    
    set_clauses = []
    params = []
    
    if 'title' in data:
        set_clauses.append('title = ?')
        params.append(data['title'])
    if 'date' in data:
        set_clauses.append('date = ?')
        params.append(data['date'])
    if 'time' in data:
        set_clauses.append('time = ?')
        params.append(data['time'])
    if 'participants' in data:
        set_clauses.append('participants = ?')
        params.append(data['participants'])

    if not set_clauses:
        return jsonify({'error': gettext('No fields provided for update.')}), 400

    params.append(meeting_id)
    query = f"UPDATE meetings SET {", ".join(set_clauses)} WHERE id = ?"

    try:
        cursor = db.execute(query, tuple(params))
        db.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': gettext('Meeting not found.')}), 404
        return jsonify({'message': gettext('Meeting updated successfully!')}), 200
    except sqlite3.Error as e:
        return jsonify({'error': gettext('Database error: ') + str(e)}), 500

@app.route('/meetings/<int:meeting_id>', methods=['DELETE'])
def delete_meeting(meeting_id):
    db = get_db()
    try:
        cursor = db.execute('DELETE FROM meetings WHERE id = ?', (meeting_id,))
        db.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': gettext('Meeting not found.')}), 404
        return jsonify({'message': gettext('Meeting deleted successfully!')}), 200
    except sqlite3.Error as e:
        return jsonify({'error': gettext('Database error: ') + str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)

@app.cli.command('initdb')
def initdb_command():
    """Initializes the database."""
    init_db()
    print('Initialized the database.')

# Pomodoro Session API Endpoints
@app.route('/pomodoro_sessions', methods=['GET'])
def get_pomodoro_sessions():
    db = get_db()
    cursor = db.execute('SELECT id, start_time, end_time, duration_minutes, task_id FROM pomodoro_sessions')
    sessions = cursor.fetchall()
    return jsonify([dict(session) for session in sessions])

@app.route('/pomodoro_sessions', methods=['POST'])
def add_pomodoro_session():
    db = get_db()
    data = request.get_json()
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    duration_minutes = data.get('duration_minutes')
    task_id = data.get('task_id')

    if not start_time or not end_time or not duration_minutes:
        return jsonify({'error': gettext('Start time, end time, and duration are required.')}), 400

    try:
        cursor = db.execute(
            'INSERT INTO pomodoro_sessions (start_time, end_time, duration_minutes, task_id) VALUES (?, ?, ?, ?)',
            (start_time, end_time, duration_minutes, task_id)
        )
        db.commit()
        return jsonify({'message': gettext('Pomodoro session added successfully!'), 'id': cursor.lastrowid}), 201
    except sqlite3.Error as e:
        return jsonify({'error': gettext('Database error: ') + str(e)}), 500