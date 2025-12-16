from flask import Flask, render_template, session, redirect, url_for, request, jsonify
from functools import wraps
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-here')

@app.context_processor
def inject_firebase_config():
    return dict(
        config={
            'FIREBASE_API_KEY': os.getenv('FIREBASE_API_KEY', ''),
            'FIREBASE_AUTH_DOMAIN': os.getenv('FIREBASE_AUTH_DOMAIN', ''),
            'FIREBASE_PROJECT_ID': os.getenv('FIREBASE_PROJECT_ID', ''),
            'FIREBASE_STORAGE_BUCKET': os.getenv('FIREBASE_STORAGE_BUCKET', ''),
            'FIREBASE_MESSAGING_SENDER_ID': os.getenv('FIREBASE_MESSAGING_SENDER_ID', ''),
            'FIREBASE_APP_ID': os.getenv('FIREBASE_APP_ID', '')
        }
    )

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('auth'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/auth')
def auth():
    if 'user' in session:
        return redirect(url_for('home'))
    return render_template('auth.html')

@app.route('/home')
@login_required
def home():
    return render_template('home.html')

@app.route('/tuner')
@login_required
def tuner():
    return render_template('tuner.html')

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        required_fields = ['email', 'uid']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
        
        session['user'] = {
            'email': data.get('email'),
            'name': data.get('name', ''),
            'uid': data.get('uid')
        }
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    try:
        session.pop('user', None)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/check-auth')
def check_auth():
    try:
        if 'user' in session:
            return jsonify({'authenticated': True, 'user': session['user']})
        return jsonify({'authenticated': False})
    except Exception as e:
        return jsonify({'authenticated': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='localhost', port=5000, debug=True)