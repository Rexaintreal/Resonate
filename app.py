from flask import Flask, render_template, session, redirect, url_for, request, jsonify
from functools import wraps
import os
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import uuid
from datetime import datetime
import traceback
import json

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-here')

UPLOAD_FOLDER = os.path.join('static', 'uploads')
ALLOWED_EXTENSIONS = {'webm', 'wav', 'mp3', 'ogg', 'm4a', 'aac', 'flac', 'opus'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024 

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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

@app.route('/pitch')
@login_required
def pitch():
    return render_template('pitch.html')

@app.route('/tuner')
@login_required
def tuner():
    return render_template('tuner.html')


@app.route('/chords') 
@login_required
def chords():
    return render_template('chords.html')  


@app.route('/spectrum')
@login_required
def spectrum():
    return render_template('spectrum.html')

@app.route('/metronome')
@login_required
def metronome():
    return render_template('metronome.html')


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
        print(f"Login error: {str(e)}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    try:
        session.pop('user', None)
        return jsonify({'success': True})
    except Exception as e:
        print(f"Logout error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/check-auth')
def check_auth():
    try:
        if 'user' in session:
            return jsonify({'authenticated': True, 'user': session['user']})
        return jsonify({'authenticated': False})
    except Exception as e:
        return jsonify({'authenticated': False, 'error': str(e)}), 500

@app.route('/api/upload-recording', methods=['POST'])
@login_required
def upload_recording():
    try:
        if 'audio' not in request.files:
            return jsonify({'success': False, 'error': 'No audio file provided'}), 400
        
        file = request.files['audio']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'File type not supported. Supported formats: ' + ', '.join(ALLOWED_EXTENSIONS)}), 400
        
        original_extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'webm'
        
        user_id = session['user']['uid']
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        filename = f"{user_id}_{timestamp}_{unique_id}.{original_extension}"
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        return jsonify({
            'success': True,
            'filename': filename,
            'url': url_for('static', filename=f'uploads/{filename}')
        })
    except Exception as e:
        print(f"Upload error: {str(e)}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/rename-recording', methods=['POST'])
@login_required
def rename_recording():
    try:
        data = request.get_json()
        filename = data.get('filename')
        new_name = data.get('newName', '').strip()
        
        print(f"Rename request - filename: {filename}, new_name: {new_name}") #debug
        
        if not filename or not new_name:
            return jsonify({'success': False, 'error': 'Filename and new name are required'}), 400
        
        user_id = session['user']['uid']
        
        if not filename.startswith(user_id):
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        if len(new_name) > 100:
            return jsonify({'success': False, 'error': 'Name too long (max 100 characters)'}), 400
        metadata_path = os.path.join(app.config['UPLOAD_FOLDER'], 'metadata.json')
        metadata = {}
        
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
            except:
                metadata = {}
        metadata[filename] = {
            'customName': new_name,
            'updatedAt': datetime.now().isoformat()
        }
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"Successfully renamed {filename} to {new_name}")
        return jsonify({'success': True, 'newName': new_name})
        
    except Exception as e:
        print(f"Rename error: {str(e)}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/delete-recording', methods=['POST'])
@login_required
def delete_recording():
    try:
        data = request.get_json()
        filename = data.get('filename')
        
        print(f"Delete request for filename: {filename}")
        
        if not filename:
            return jsonify({'success': False, 'error': 'No filename provided'}), 400
        
        user_id = session['user']['uid']
        print(f"User ID: {user_id}")
        
        if not filename.startswith(user_id):
            print(f"Unauthorized: filename doesn't start with user_id")
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
        if '..' in filename or '/' in filename or '\\' in filename:
            return jsonify({'success': False, 'error': 'Invalid filename'}), 400
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        print(f"Attempting to delete: {filepath}")
        print(f"File exists: {os.path.exists(filepath)}")
        
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
                print(f"Successfully deleted: {filepath}")
                metadata_path = os.path.join(app.config['UPLOAD_FOLDER'], 'metadata.json')
                if os.path.exists(metadata_path):
                    try:
                        with open(metadata_path, 'r') as f:
                            metadata = json.load(f)
                        if filename in metadata:
                            del metadata[filename]
                            with open(metadata_path, 'w') as f:
                                json.dump(metadata, f, indent=2)
                    except:
                        pass
                
                return jsonify({'success': True})
            except PermissionError as e:
                print(f"Permission error: {str(e)}")
                return jsonify({'success': False, 'error': 'Permission denied'}), 403
            except Exception as e:
                print(f"Error deleting file: {str(e)}")
                traceback.print_exc()
                return jsonify({'success': False, 'error': f'Error deleting file: {str(e)}'}), 500
        else:
            print(f"File not found: {filepath}")
            files = os.listdir(app.config['UPLOAD_FOLDER'])
            print(f"Files in upload folder: {files}")
            return jsonify({'success': False, 'error': 'File not found'}), 404
            
    except Exception as e:
        print(f"Delete recording error: {str(e)}") #debug
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/get-recordings')
@login_required
def get_recordings():
    try:
        user_id = session['user']['uid']
        recordings = []
        
        metadata_path = os.path.join(app.config['UPLOAD_FOLDER'], 'metadata.json')
        metadata = {}
        
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
            except:
                metadata = {}
        
        for filename in os.listdir(app.config['UPLOAD_FOLDER']):
            if filename.startswith(user_id) and any(filename.endswith(f'.{ext}') for ext in ALLOWED_EXTENSIONS):
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
                custom_name = metadata.get(filename, {}).get('customName')
                
                recordings.append({
                    'filename': filename,
                    'customName': custom_name,
                    'url': url_for('static', filename=f'uploads/{filename}'),
                    'timestamp': os.path.getctime(filepath)
                })
        
        recordings.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return jsonify({'success': True, 'recordings': recordings})
    except Exception as e:
        print(f"Get recordings error: {str(e)}") # remove later debug statement
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='localhost', port=5000, debug=True)