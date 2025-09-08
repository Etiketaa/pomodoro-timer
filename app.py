from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_babel import Babel, gettext
import csv
from datetime import datetime
import os

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

if __name__ == '__main__':
    app.run(debug=True)
