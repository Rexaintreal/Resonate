<div align="center">
  <img src="static/assets/logo.png" alt="Resonate Logo" width="200"/>
  
  # Resonate

  **A real time audio analysis toolkit for musicians with visualization, tuning, chord detection, and spectrum analysis**
  
  [![GitHub](https://img.shields.io/badge/GitHub-Resonate-blue?logo=github)](https://github.com/Rexaintreal/Resonate)
  [![Axiom](https://img.shields.io/badge/Built%20for-Axiom%20YSWS-orange)](https://axiom.hackclub.com/)
  [![Hackatime](https://hackatime-badge.hackclub.com/U09B8FXUS78/Resonate)](https://hackatime-badge.hackclub.com/U09B8FXUS78/Resonate)
  [![Flask](https://img.shields.io/badge/Flask-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
  [![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
  [![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## About

Resonate is a web app built using HTML, Tailwind CSS, Javascript and Flask for [Axiom (Hack Club YSWS)](https://axiom.hackclub.com/) it uses signal processing algorithms like Fast Fourier Transform (FFT) and auto correlation to analyze audio in realtime form user's mic or uplaoded audio files. It also comes with many professional musician tools like tuners, chord detection, spectrum analyzer and a metronome with automatic BPM (beats per minutes) detection while processing everything on the client side using the Web Audio API for 0 latency.

---

## Live Demo

- Resonate is Live at [resonate.pythonanywhere.com](https://resonate.pythonanywhere.com) 
- Demo Video: [Watch on Google Drive](https://drive.google.com/)

---

## Features

- **Real-time Audio Visualizer** - with four visualization modes (bars, waveform, circular, line) with customizable FFT size and sensitivity
- **Multi Instrument Tuner** - which supports guitar, bass, ukulele, violin with multiple tuning presets (standard, drop D, DADGAD, etc.)
- **Chord Detection** - real-time chord recognition supporting 18+ chord types including extended chords (maj7, dom7, dim7, etc.)
- **Spectrum Analyzer** - frequency spectrum visualization with 7 distinct frequency bands from sub-bass to brilliance
- **Smart Metronome** - variable BPM, multiple time signatures, tap tempo, and automatic BPM detection from audio
- **Audio Recording** - record, save, and manage practice sessions with support for multiple audio formats
- **Format Converter** - convert recordings between WebM, WAV, and MP3 formats to downlaod it 
- **Practice Tracker** - automatic session tracking with daily and weekly statistics
- **Theme Support** - dark and light modes with system preference detection
- **Keyboard Shortcuts** - efficient navigation and control with comprehensive hotkeys shortcuts
- **User Authentication** - secure and easy Firebase authentication with Google Sign-In

---

## Tech Stack

**Frontend**
- **HTML**
- **Tailwind CSS** (via CDN)
- **Vanilla JavaScript** - Modular architecture with classes
- **Web APIs**:
  - Web Audio API (AudioContext, AnalyserNode, OscillatorNode)
  - MediaRecorder API - to record audio
  - MediaDevices API (getUserMedia) - to get mic access
  - Canvas API - for real time visualizations
  - LocalStorage API - for practice data persistence

**Backend**
- **Flask** (Python) 
- **Werkzeug** - for secure file handling
- **Python-dotenv** - for env mgmt

**Authentication & Storage**
- **Firebase Authentication** - secure user authentication with Google OAuth
- **Server-side File Storage** - recording mgmt with metadata tracking (JSON)

**Audio Processing Algorithms**
- **Fast Fourier Transform (FFT)** - for frequency domain analysis
- **Autocorrelation** - for pitch detection
- **Peak Detection** - for frequency identification
- **Energy-based Beat Detection** - for BPM analysis

---

## How It Works

### Audio Visualization
1. **Microphone Access**: first request user for permission via `navigator.mediaDevices.getUserMedia()` function
2. **Audio Context Setup**: then create an AudioContext and connect microphone stream to AnalyserNode
3. **FFT Analysis**: Configurable FFT size (512-16384) will transform time domain audio to frequency domain data
4. **Logarithmic Scaling**: will map frequency bins to perceptually linear scale for better visualization
5. **Rendering**: RequestAnimationFrame loop draws visualizations to HTML5 Canvas with optimized 30fps throttling (good for lowendpc too!)

### Pitch Detection
1. **Waveform Capture**: Capture raw audio samples using `getByteTimeDomainData()`
2. **Autocorrelation**: Find periodic patterns in the waveform to determine fundamental frequency
3. **Peak Finding**: Identify the strongest correlation peak above 0.9 threshold
4. **Frequency Calculation**: Convert sample offset to frequency: `f = sampleRate / offset`
5. **Note Mapping**: Map frequency to musical note using: `noteNum = 12 * log₂(f / 440)`
6. **Cents Deviation**: Calculate tuning accuracy in cents for precise instrument tuning

### Chord Recognition
1. **Multi-Peak Detection**: Identifies multiple frequency peaks simultaneously (up to 6 notes)
2. **Note Extraction**: Converts each peak frequency to its corresponding musical note
3. **Interval Analysis**: Calculates semitone intervals between detected notes
4. **Template Matching**: Compares interval pattern against 18 chord templates
5. **Confidence Scoring**: Rates match quality based on exact interval matches and extra notes penalty
6. **Chord Identification**: Returns best match with root note, chord type, and confidence percentage

### Beat Detection (BPM)
1. **Frequency Filtering**: Isolates low frequency range (60-250 Hz) where beats are strongest
2. **Energy Calculation**: Computes RMS energy of filtered signal
3. **Threshold Detection**: Compares current energy against rolling average (43-sample window)
4. **Beat Timing**: Records timestamps when energy exceeds 1.5x average with 300ms minimum spacing
5. **Interval Analysis**: Calculates average time between beats with variance-based confidence
6. **BPM Calculation**: Converts interval to BPM: `BPM = 60000 / avgInterval`

### Audio Recording & Conversion
1. **MediaRecorder**: Captures microphone audio to WebM/Opus format chunks
2. **Blob Creation**: Combines audio chunks into single Blob object
3. **Server Upload**: Sends Blob via FormData POST request with unique filename
4. **Format Conversion**: 
   - **WAV**: Decodes audio buffer, creates PCM data, writes RIFF/WAVE headers
   - **MP3**: Uses LameJS encoder to compress audio with 128kbps bitrate
5. **Download**: Generates temporary Object URL for browser download

### Practice Tracking
1. **Session Monitoring**: Tracks start/end timestamps for each tool usage
2. **Duration Calculation**: Computes session length in seconds
3. **LocalStorage Persistence**: Stores up to 100 most recent sessions as JSON
4. **Statistics Aggregation**: Calculates daily and weekly totals from stored sessions
5. **Activity Feed**: Displays recent practice sessions with formatted timestamps

---

## Project Structure  

```
Resonate/
├── static/
│   ├── assets/           # Images, icons, and static files
│   │   ├── logo.png
│   │   ├── favicon.ico
│   │   └── ...
│   ├── css/              # Stylesheets
│   │   ├── styles.css    # Global styles
│   │   ├── theme.css     # Theme variables
│   │   ├── visualizer.css
│   │   ├── tuner.css
│   │   ├── chords.css
│   │   ├── spectrum.css
│   │   ├── metronome.css
│   │   ├── pitch.css
│   │   └── profile.css
│   ├── js/               # JavaScript modules
│   │   ├── audio.js              # AudioCapture class
│   │   ├── visualizer.js         # Visualization engine
│   │   ├── pitch_detector.js     # Autocorrelation pitch detection
│   │   ├── chord_detector.js     # Chord recognition
│   │   ├── fft_processor.js      # FFT analysis utilities
│   │   ├── bpm_detector.js       # Beat detection
│   │   ├── tuner_ui.js           # Tuner interface
│   │   ├── chords.js             # Chord detector UI
│   │   ├── spectrum.js           # Spectrum analyzer UI
│   │   ├── metronome.js          # Metronome logic
│   │   ├── recorder.js           # Audio recording
│   │   ├── converter.js          # Format conversion (WAV/MP3)
│   │   ├── practice_tracker.js   # Practice session tracking
│   │   ├── settings.js           # Settings manager
│   │   ├── theme.js              # Theme switching
│   │   ├── home.js               # Home page logic
│   │   ├── profile.js            # Profile management
│   │   └── main.js               # Firebase auth & app init
│   └── uploads/          # User recordings storage
│       └── metadata.json # Recording metadata
├── templates/            # HTML templates
│   ├── index.html        # Landing page
│   ├── auth.html         # Authentication page
│   ├── home.html         # Visualizer page
│   ├── tuner.html        # Tuner tool
│   ├── chords.html       # Chord detector
│   ├── spectrum.html     # Spectrum analyzer
│   ├── metronome.html    # Metronome
│   ├── pitch.html        # Pitch detection
│   ├── profile.html      # User profile
│   ├── 404.html          # 404 error page
│   └── 500.html          # 500 error page
├── app.py                # Flask application
├── requirements.txt      # Python dependencies
├── .env                  # Environment variables (not in repo)
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
├── LICENSE               # MIT License
└── README.md             # This file hehe -_-
```

---

## Setup and Installation

### Prerequisites
- Python 3.8 or higher (Mostly front end heavy with basic flask i used 3.12.10)
- pip (to install required packages)
- A web browser with Web Audio API support
- Firebase account (for authentication setup)

### Installation Steps

1. **Clone the repository**
```bash
git clone https://github.com/Rexaintreal/Resonate.git
cd Resonate
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment variables**

Create a `.env` file in the root directory (use `.env.example` as template):

```env
SECRET_KEY=your-secret-key-here
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-app-id
```

5. **Set up Firebase**
   - Create a new Firebase project at [firebase.google.com](https://firebase.google.com)
   - Enable Google Authentication in Firebase Console -> Authentication -> Sign-in method
   - Get your Firebase config from Project Settings -> General
   - Add your Firebase config values to `.env`

6. **Run the application**
```bash
python app.py
```

7. **Access the application**

Open your browser and navigate to:
```
http://localhost:5000 

(if you need temporary https use sslcontent=adhoc in the main function)
```
    app.run(ssl_context='adhoc')

```
```

### Configuration Options

**Audio Settings** (adjustable in-app):
- FFT Size: 512, 1024, 2048 (default), 4096, 8192, 16384
- Smoothing: 0.0 - 1.0 (default: 0.8)
- Sensitivity: 0% - 200% (default: 100%)
- Visualization Bar Count: 16 - 128 (default: 64)

**Upload Limits**:
- Max file size: 50 MB
- Supported formats: WebM, WAV, MP3, OGG, M4A, AAC, FLAC, OPUS
- Hosted on Pythonanywhere's free plan so MAX 500MB Storage

---

## Usage

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Start/Stop audio capture |
| `Esc` | Stop everything |
| `?` or `H` | Show keyboard shortcuts |
| `1` | Navigate to Visualizer |
| `2` | Navigate to Pitch Detection |
| `3` | Navigate to Tuner |
| `4` | Navigate to Metronome |
| `5` | Navigate to Chord Detector |
| `6` | Navigate to Spectrum Analyzer |

### Tools

**Visualizer**
- Click microphone icon or press Space to start
- Choose visualization mode (Bars, Wave, Circular, Line)
- Adjust settings via gear icon (FFT size, smoothing, bar count)
- Record audio sessions with the record button

**Tuner**
- Select your instrument (Guitar, Bass, Ukulele, Violin, Chromatic)
- Choose tuning preset if available (Standard, Drop D, Open G, etc.)
- Play a note and tune until the needle centers
- Click reference notes to hear target pitches

**Chord Detector**
- Start detection with microphone button
- Play chords on your instrument
- View detected chord name, notes, and confidence
- Check chord history for progression tracking

**Spectrum Analyzer**
- Start analysis to view real-time frequency spectrum
- Monitor frequency bands from sub-bass to brilliance
- View dominant frequency and peak detection
- Track energy distribution across frequency ranges

**Metronome**
- Set BPM (40-240) manually or use tap tempo
- Choose time signature (2/4, 3/4, 4/4, 5/4, 6/8, 7/8)
- Use auto-detect BPM to match music tempo
- Sync detected BPM to metronome automatically

---

## Credits

### Libraries & Tools
- **LameJS** - MP3 encoding library
- **Firebase** - Authentication and user management
- **Flask** - Python web framework
- **Tailwind CSS** - Utility-first CSS framework
- **Font Awesome** - Icon library

### Resources
- **WAV Format Documentation** - [soundfile.sapp.org](http://soundfile.sapp.org/doc/WaveFormat/)
- **Web Audio API** - [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- **FFT Algorithm** - Fast Fourier Transform for frequency analysis
- **Autocorrelation** - Pitch detection algorithm

### Inspiration
- Landing Page Design - [CodePen by techgirldiaries](https://codepen.io/techgirldiaries/pen/LYWPJPN)
- Visual Elements - [CodePen by andyfitz](https://codepen.io/andyfitz/pen/aZrKdV)

---

## References

### Web Audio API
- [AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext)
- [AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode)
- [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)

### Signal Processing
- [Fast Fourier Transform (FFT)](https://en.wikipedia.org/wiki/Fast_Fourier_transform)
- [Autocorrelation Pitch Detection](https://en.wikipedia.org/wiki/Autocorrelation)
- [Musical Note Frequencies](https://pages.mtu.edu/~suits/notefreqs.html)

### Audio Formats
- [WAV File Format](https://en.wikipedia.org/wiki/WAV)
- [MP3 Encoding](https://en.wikipedia.org/wiki/MP3)
- [WebM Container](https://www.webmproject.org/)

---

## Other Projects you might like...

- [LeetCohort](https://github.com/Rexaintreal/LeetCohort) - Free Competitive Python DSA Practice Platform
- [Sorta](https://github.com/Rexaintreal/Sorta) - Sorting Algorithm Visualizer
- [Ziks](https://github.com/Rexaintreal/Ziks) - Physics Simulator with 21 Simulations
- [Eureka](https://github.com/Rexaintreal/Eureka) - Discover Local Hidden Spots
- [DawnDuck](https://github.com/Rexaintreal/DawnDuck) - USB HID Automation Tool
- [Lynx](https://github.com/Rexaintreal/lynx) - OpenCV Image Manipulation WebApp
- [Libro Voice](https://github.com/Rexaintreal/Libro-Voice) - PDF to Audio Converter
- [Snippet Vision](https://github.com/Rexaintreal/Snippet-Vision) - YouTube Video Summarizer
- [Syna](https://github.com/Rexaintreal/syna) - Social Music App with Spotify
- [Apollo](https://github.com/Rexaintreal/Apollo) - Minimal Music Player
- [Notez](https://github.com/Rexaintreal/Notez) - Clean Android Notes App

[View all projects →](https://github.com/Rexaintreal?tab=repositories)

---

## Contributing

feel free to submit a pull request!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Author

**Saurabh Tiwari**

- Portfolio: [saurabhcodesawfully.pythonanywhere.com](https://saurabhcodesawfully.pythonanywhere.com/)
- Email: [saurabhtiwari7986@gmail.com](mailto:saurabhtiwari7986@gmail.com)
- Twitter: [@Saurabhcodes01](https://x.com/Saurabhcodes01)
- Instagram: [@saurabhcodesawfully](https://instagram.com/saurabhcodesawfully)
- GitHub: [@Rexaintreal](https://github.com/Rexaintreal)

---
