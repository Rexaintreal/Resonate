import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { Visualizer } from './visualizer.js';
import { Settings } from './settings.js';
import { AudioRecorder } from './recorder.js';

console.log('Home app initializing...');

window.settingsManager = new Settings();
const visualizer = new Visualizer();
const recorder = new AudioRecorder();

let isRunning = false;
let isRecording = false;
let statsInterval = null;
let timerInterval = null;

const startButton = document.getElementById('startButton');
const recordButton = document.getElementById('recordButton');
const recordingTimer = document.getElementById('recordingTimer');
const timerDisplay = document.getElementById('timerDisplay');
const volumeStat = document.getElementById('volumeStat');
const frequencyStat = document.getElementById('frequencyStat');
const bassStat = document.getElementById('bassStat');
const midStat = document.getElementById('midStat');
const trebleStat = document.getElementById('trebleStat');
const infoBox = document.getElementById('infoBox');
const modeButtons = document.querySelectorAll('.mode-btn');
const recordingsList = document.getElementById('recordingsList');
const emptyState = document.getElementById('emptyState');
const logoutIcon = document.getElementById('logoutIcon');
const logoutModal = document.getElementById('logoutModal');
const cancelLogout = document.getElementById('cancelLogout');
const confirmLogout = document.getElementById('confirmLogout');

logoutIcon.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    logoutModal.classList.remove('hidden');
    logoutModal.classList.add('flex');
});

cancelLogout.addEventListener('click', () => {
    logoutModal.classList.add('hidden');
    logoutModal.classList.remove('flex');
});

confirmLogout.addEventListener('click', async () => {
    try {
        const auth = getAuth();
        await signOut(auth);
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (error) {
        console.error('Error signing out:', error);
    }
});

logoutModal.addEventListener('click', (e) => {
    if (e.target === logoutModal) {
        logoutModal.classList.add('hidden');
        logoutModal.classList.remove('flex');
    }
});

modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        visualizer.setMode(btn.dataset.mode);
    });
});

async function loadRecordings() {
    try {
        const response = await fetch('/api/get-recordings');
        const data = await response.json();
        
        if (data.success && data.recordings) {
            updateRecordingsList(data.recordings);
        }
    } catch (error) {
        console.error('Error loading recordings:', error);
    }
}

function updateRecordingsList(recordings) {
    if (!recordings || recordings.length === 0) {
        recordingsList.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';
    recordingsList.innerHTML = recordings.map((rec, index) => {
        const date = new Date(rec.timestamp * 1000);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString();
        const recNumber = recordings.length - index;
        
        return `
            <div class="recording-item">
                <div class="recording-info">
                    <div class="recording-name">Recording ${recNumber}</div>
                    <div class="recording-meta">${dateStr} • ${timeStr}</div>
                </div>
                <div class="recording-actions">
                    <button class="action-btn play-btn" data-url="${rec.url}" title="Play">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="action-btn download-btn" data-url="${rec.url}" data-filename="${rec.filename}" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="action-btn delete-btn" data-filename="${rec.filename}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.play-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const audio = new Audio(btn.dataset.url);
            audio.play().catch(err => console.error('Playback error:', err));
        });
    });

    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const a = document.createElement('a');
            a.href = btn.dataset.url;
            a.download = btn.dataset.filename;
            a.click();
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Delete this recording?')) {
                try {
                    const response = await fetch('/api/delete-recording', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ filename: btn.dataset.filename })
                    });
                    
                    const data = await response.json();
                    if (data.success) {
                        await loadRecordings();
                    } else {
                        alert('Failed to delete recording');
                    }
                } catch (error) {
                    console.error('Error deleting recording:', error);
                }
            }
        });
    });
}

async function uploadRecording(blob) {
    if (blob.size === 0) {
        infoBox.innerHTML = '<p class="text-red-400">Recording failed - no audio data</p>';
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');
        
        infoBox.innerHTML = '<p>Saving recording...</p>';
        
        const response = await fetch('/api/upload-recording', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.success) {
            infoBox.innerHTML = '<p class="text-green-400">Recording saved successfully</p>';
            await loadRecordings();
            setTimeout(() => {
                infoBox.innerHTML = '<p>Microphone active</p>';
            }, 3000);
        } else {
            infoBox.innerHTML = `<p class="text-red-400">Upload failed: ${data.error}</p>`;
        }
    } catch (error) {
        console.error('Error uploading recording:', error);
        infoBox.innerHTML = '<p class="text-red-400">Failed to save recording</p>';
    }
}

startButton.addEventListener('click', async () => {
    if (!isRunning) {
        try {
            startButton.disabled = true;
            
            const settings = window.settingsManager.getSettings();
            await visualizer.start();
            await recorder.initialize();
            
            if (visualizer.audioCapture && visualizer.audioCapture.analyser) {
                visualizer.audioCapture.analyser.fftSize = settings.fftSize;
                visualizer.audioCapture.analyser.smoothingTimeConstant = settings.smoothing;
            }

            isRunning = true;
            startButton.innerHTML = '<i class="fas fa-stop"></i>';
            startButton.classList.add('active');
            recordButton.disabled = false;
            startButton.disabled = false;
            infoBox.innerHTML = '<p class="text-green-400">Microphone active</p>';

            statsInterval = setInterval(() => {
                const stats = visualizer.getStats();
                if (stats) {
                    volumeStat.textContent = stats.volume + '%';
                    frequencyStat.textContent = stats.dominant.frequency + ' Hz';
                    bassStat.textContent = stats.ranges.bass + '%';
                    midStat.textContent = stats.ranges.mid + '%';
                    trebleStat.textContent = stats.ranges.treble + '%';
                }
                
                if (visualizer.audioCapture && visualizer.audioCapture.analyser) {
                    const currentSettings = window.settingsManager.getSettings();
                    visualizer.audioCapture.analyser.smoothingTimeConstant = currentSettings.smoothing;
                }
            }, 50);
        } catch (error) {
            console.error('Error starting microphone:', error);
            startButton.innerHTML = '<i class="fas fa-microphone"></i>';
            startButton.classList.remove('active');
            startButton.disabled = false;
            infoBox.innerHTML = `<p class="text-red-400">${error.message}</p>`;
        }
    } else {
        isRunning = false;
        if (statsInterval) {
            clearInterval(statsInterval);
            statsInterval = null;
        }
        
        if (isRecording) {
            const blob = await recorder.stopRecording();
            isRecording = false;
            recordButton.classList.remove('active');
            recordingTimer.style.display = 'none';
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            
            if (blob && blob.size > 0) {
                await uploadRecording(blob);
            }
        }
        
        visualizer.stop();
        recorder.cleanup();
        startButton.innerHTML = '<i class="fas fa-microphone"></i>';
        startButton.classList.remove('active');
        recordButton.disabled = true;
        infoBox.innerHTML = '<p>Click microphone to begin</p>';
        
        volumeStat.textContent = '0%';
        frequencyStat.textContent = '0 Hz';
        bassStat.textContent = '0%';
        midStat.textContent = '0%';
        trebleStat.textContent = '0%';
    }
});

recordButton.addEventListener('click', async () => {
    if (!isRecording) {
        const started = recorder.startRecording();
        
        if (started) {
            isRecording = true;
            recordButton.classList.add('active');
            recordingTimer.style.display = 'block';
            
            timerInterval = setInterval(() => {
                const duration = recorder.getRecordingDuration();
                const minutes = Math.floor(duration / 60);
                const seconds = duration % 60;
                timerDisplay.textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }, 1000);
        } else {
            infoBox.innerHTML = '<p class="text-red-400">Failed to start recording</p>';
        }
    } else {
        const blob = await recorder.stopRecording();
        isRecording = false;
        recordButton.classList.remove('active');
        recordingTimer.style.display = 'none';
        
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        if (blob && blob.size > 0) {
            await uploadRecording(blob);
        } else {
            infoBox.innerHTML = '<p class="text-red-400">Recording failed - no data</p>';
        }
    }
});

loadRecordings();