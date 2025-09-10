import os
from flask import Flask, render_template

# Get the absolute path of the project root, which is one level up from the api directory
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app = Flask(
    __name__,
    static_folder=os.path.join(project_root, 'static'),
    template_folder=os.path.join(project_root, 'templates')
)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    """
    This single route catches all requests and serves the index.html.
    This is necessary for a Single Page Application (SPA) where routing is handled by the frontend.
    """
    return render_template('index.html')

# This block is not used by Vercel, but it's good for local development
if __name__ == '__main__':
    app.run(debug=True)
