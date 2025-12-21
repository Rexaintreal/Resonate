import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { Visualizer } from './visualizer.js';
import { Settings } from './settings.js';
import { AudioRecorder } from './recorder.js';
import { AudioConverter } from './converter.js';
import { PracticeTracker } from './practice_tracker.js';

/* console.log('Home app initializing...'); */

window.settingsManager = new Settings();
const visualizer = new Visualizer();
const recorder = new AudioRecorder();
const converter = new AudioConverter();
const practiceTracker = new PracticeTracker();

let isRunning = false;
let isRecording = false;
let statsInterval = null;
let timerInterval = null;
let currentAudio = null;
let currentPlayingItem = null;

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
const deleteModal = document.getElementById('deleteModal');
const cancelDelete = document.getElementById('cancelDelete');
const confirmDelete = document.getElementById('confirmDelete');
const formatModal = document.getElementById('formatModal');
const cancelFormat = document.getElementById('cancelFormat');
const formatOptions = document.getElementById('formatOptions');
const conversionLoading = document.getElementById('conversionLoading');
const uploadModal = document.getElementById('uploadModal');
const uploadFileName = document.getElementById('uploadFileName');
const uploadPercent = document.getElementById('uploadPercent');
const uploadProgressBar = document.getElementById('uploadProgressBar');
const uploadStatus = document.getElementById('uploadStatus');
const uploadComplete = document.getElementById('uploadComplete');
const uploadError = document.getElementById('uploadError');
const uploadErrorMessage = document.getElementById('uploadErrorMessage');
const closeUploadError = document.getElementById('closeUploadError');
const fileUploadInput = document.getElementById('fileUploadInput');
const renameModal = document.getElementById('renameModal');
const cancelRename = document.getElementById('cancelRename');
const confirmRename = document.getElementById('confirmRename');
const renameInput = document.getElementById('renameInput');

let pendingDeleteFilename = null;
let pendingDownloadUrl = null;
let pendingDownloadFilename = null;
let pendingRenameFilename = null;

function resetUploadModal() {
    uploadFileName.textContent = 'Preparing upload...';
    uploadPercent.textContent = '0%';
    uploadProgressBar.style.width = '0%';
    uploadStatus.classList.remove('hidden');
    uploadComplete.classList.add('hidden');
    uploadError.classList.add('hidden');
}

function showUploadModal() {
    resetUploadModal();
    uploadModal.classList.remove('hidden');
    uploadModal.classList.add('flex');
}

function hideUploadModal() {
    uploadModal.classList.add('hidden');
    uploadModal.classList.remove('flex');
}

function showUploadError(message) {
    uploadStatus.classList.add('hidden');
    uploadComplete.classList.add('hidden');
    uploadError.classList.remove('hidden');
    uploadErrorMessage.textContent = message || 'Upload failed';
    window.toast.error('Upload failed', message);
}

closeUploadError?.addEventListener('click', () => {
    hideUploadModal();
});

uploadModal?.addEventListener('click', (e) => {
    if (e.target === uploadModal) {
        if (!uploadComplete.classList.contains('hidden') || !uploadError.classList.contains('hidden')) {
            hideUploadModal();
        }
    }
});

fileUploadInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
        window.toast.error('Invalid file', 'Please select an audio file');
        fileUploadInput.value = '';
        return;
    }
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        window.toast.error('File too large', 'Maximum file size is 50MB');
        fileUploadInput.value = '';
        return;
    }

    showUploadModal();
    uploadFileName.textContent = file.name;
    const formData = new FormData();
    formData.append('audio', file);
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            uploadPercent.textContent = percentComplete + '%';
            uploadProgressBar.style.width = percentComplete + '%';
        }
    });

    xhr.addEventListener('load', async () => {
        if (xhr.status === 200) {
            try {
                const data = JSON.parse(xhr.responseText);
                if (data.success) {
                    uploadStatus.classList.add('hidden');
                    uploadComplete.classList.remove('hidden');
                    uploadPercent.textContent = '100%';
                    uploadProgressBar.style.width = '100%';
                    
                    window.toast.success('Upload complete', 'File added to your library');
                    await loadRecordings();
                    setTimeout(() => {
                        hideUploadModal();
                    }, 1500);
                } else {
                    throw new Error(data.error || 'Upload failed');
                }
            } catch (error) {
                showUploadError(error.message);
            }
        } else {
            showUploadError('Server error: ' + xhr.status);
        }
    });
    xhr.addEventListener('error', () => {
        showUploadError('Network error occurred');
    });

    xhr.addEventListener('abort', () => {
        showUploadError('Upload cancelled');
    });
    xhr.open('POST', '/api/upload-recording');
    xhr.send(formData);
    fileUploadInput.value = '';
});

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

cancelDelete.addEventListener('click', () => {
    deleteModal.classList.add('hidden');
    deleteModal.classList.remove('flex');
    pendingDeleteFilename = null;
});

confirmDelete.addEventListener('click', async () => {
    if (pendingDeleteFilename) {
        try {
            const response = await fetch('/api/delete-recording', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: pendingDeleteFilename })
            });
            
            const data = await response.json();
            if (data.success) {
                await loadRecordings();
                window.toast.success('Recording deleted', 'Successfully removed from library');
                infoBox.innerHTML = '<p class="text-green-400">Recording deleted successfully</p>';
                setTimeout(() => {
                    if (!isRunning) {
                        infoBox.innerHTML = '<p>Click microphone to begin</p>';
                    } else {
                        infoBox.innerHTML = '<p class="text-green-400">Microphone active</p>';
                    }
                }, 2000);
            } else {
                window.toast.error('Delete failed', 'Could not delete recording');
                infoBox.innerHTML = '<p class="text-red-400">Failed to delete recording</p>';
            }
        } catch (error) {
            console.error('Error deleting recording:', error);
            window.toast.error('Delete failed', 'An error occurred');
            infoBox.innerHTML = '<p class="text-red-400">Failed to delete recording</p>';
        }
    }
    deleteModal.classList.add('hidden');
    deleteModal.classList.remove('flex');
    pendingDeleteFilename = null;
});

deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
        deleteModal.classList.add('hidden');
        deleteModal.classList.remove('flex');
        pendingDeleteFilename = null;
    }
});
cancelRename?.addEventListener('click', () => {
    renameModal.classList.add('hidden');
    renameModal.classList.remove('flex');
    renameInput.value = '';
    pendingRenameFilename = null;
});

confirmRename?.addEventListener('click', async () => {
    const newName = renameInput.value.trim();
    
    if (!newName) {
        window.toast.warning('Name required', 'Please enter a name');
        return;
    }
    
    if (pendingRenameFilename) {
        try {
            const response = await fetch('/api/rename-recording', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    filename: pendingRenameFilename,
                    newName: newName
                })
            });
            
            const data = await response.json();
            if (data.success) {
                await loadRecordings();
                window.toast.success('Recording renamed', `Now called "${newName}"`);
            } else {
                window.toast.error('Rename failed', data.error || 'Could not rename recording');
            }
        } catch (error) {
            console.error('Error renaming recording:', error);
            window.toast.error('Rename failed', 'An error occurred');
        }
    }
    
    renameModal.classList.add('hidden');
    renameModal.classList.remove('flex');
    renameInput.value = '';
    pendingRenameFilename = null;
});

renameModal?.addEventListener('click', (e) => {
    if (e.target === renameModal) {
        renameModal.classList.add('hidden');
        renameModal.classList.remove('flex');
        renameInput.value = '';
        pendingRenameFilename = null;
    }
});

renameInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        confirmRename.click();
    }
});

cancelFormat.addEventListener('click', () => {
    formatModal.classList.add('hidden');
    formatModal.classList.remove('flex');
    formatOptions.classList.remove('hidden');
    conversionLoading.classList.add('hidden');
    conversionLoading.classList.remove('flex');
    pendingDownloadUrl = null;
    pendingDownloadFilename = null;
});

document.querySelectorAll('.format-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const format = btn.dataset.format;
        if (pendingDownloadUrl && pendingDownloadFilename) {
            formatOptions.classList.add('hidden');
            conversionLoading.classList.remove('hidden');
            conversionLoading.classList.add('flex');

            try {
                let downloadUrl = pendingDownloadUrl;
                let finalFilename = pendingDownloadFilename.replace(/\.\w+$/, '') + '.' + format;

                if (format !== 'webm' && !pendingDownloadFilename.endsWith('.' + format)) {
                    const blob = await converter.convert(pendingDownloadUrl, format);
                    if (blob) {
                        downloadUrl = URL.createObjectURL(blob);
                        window.toast.success('Conversion complete', `Ready to download as ${format.toUpperCase()}`);
                    } else {
                        throw new Error("Conversion returned null");
                    }
                } else {
                    window.toast.info('Download started', 'Downloading original file');
                }

                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = finalFilename;
                document.body.appendChild(a); 
                a.click();
                document.body.removeChild(a);

                if (downloadUrl !== pendingDownloadUrl) {
                    setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
                }

            } catch (error) {
                console.error('Conversion failed:', error);
                window.toast.error('Download failed', 'Could not convert audio format');
            }
        }
        formatModal.classList.add('hidden');
        formatModal.classList.remove('flex');
        setTimeout(() => {
            formatOptions.classList.remove('hidden');
            conversionLoading.classList.add('hidden');
            conversionLoading.classList.remove('flex');
        }, 300);

        pendingDownloadUrl = null;
        pendingDownloadFilename = null;
    });
});

formatModal.addEventListener('click', (e) => {
    if (e.target === formatModal) {
        formatModal.classList.add('hidden');
        formatModal.classList.remove('flex');
        formatOptions.classList.remove('hidden');
        conversionLoading.classList.add('hidden');
        conversionLoading.classList.remove('flex');
        pendingDownloadUrl = null;
        pendingDownloadFilename = null;
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

function stopCurrentAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    if (currentPlayingItem) {
        currentPlayingItem.classList.remove('playing');
        const playBtn = currentPlayingItem.querySelector('.play-btn');
        if (playBtn) {
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            playBtn.classList.remove('playing');
        }
        currentPlayingItem = null;
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
        const displayName = rec.customName || `Recording ${recNumber}`;
        
        return `
            <div class="recording-item" data-filename="${rec.filename}">
                <div class="recording-info">
                    <div class="recording-name">${displayName}</div>
                    <div class="recording-meta">${dateStr} • ${timeStr}</div>
                </div>
                <div class="recording-actions">
                    <button class="action-btn play-btn" data-url="${rec.url}" title="Play">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="action-btn rename-btn" data-filename="${rec.filename}" data-current-name="${displayName}" title="Rename">
                        <i class="fas fa-edit"></i>
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
        btn.addEventListener('click', async () => {
            const recordingItem = btn.closest('.recording-item');
            const url = btn.dataset.url;
            
            if (currentAudio && currentPlayingItem === recordingItem) {
                if (currentAudio.paused) {
                    currentAudio.play();
                    btn.innerHTML = '<i class="fas fa-pause"></i>';
                } else {
                    currentAudio.pause();
                    btn.innerHTML = '<i class="fas fa-play"></i>';
                }
                return;
            }
            
            stopCurrentAudio();
            
            if (isRunning) {
                isRunning = false;
                if (statsInterval) {
                    clearInterval(statsInterval);
                    statsInterval = null;
                }
                visualizer.stop();
                startButton.innerHTML = '<i class="fas fa-microphone"></i>';
                startButton.classList.remove('active');
                recordButton.disabled = true;
            }
            
            try {
                currentAudio = new Audio(url);
                currentPlayingItem = recordingItem;
                
                await visualizer.startWithAudio(currentAudio);
                
                recordingItem.classList.add('playing');
                btn.innerHTML = '<i class="fas fa-pause"></i>';
                btn.classList.add('playing');
                
                currentAudio.addEventListener('ended', () => {
                    stopCurrentAudio();
                    visualizer.stop();
                    volumeStat.textContent = '0%';
                    frequencyStat.textContent = '0 Hz';
                    bassStat.textContent = '0%';
                    midStat.textContent = '0%';
                    trebleStat.textContent = '0%';
                    infoBox.innerHTML = '<p>Click microphone to begin</p>';
                });
                
                currentAudio.addEventListener('pause', () => {
                    if (currentAudio && !currentAudio.ended) {
                        btn.innerHTML = '<i class="fas fa-play"></i>';
                    }
                });
                
                currentAudio.addEventListener('play', () => {
                    btn.innerHTML = '<i class="fas fa-pause"></i>';
                });
                
                await currentAudio.play();
                
                infoBox.innerHTML = '<p class="text-green-400">Playing recording</p>';
                
                statsInterval = setInterval(() => {
                    const stats = visualizer.getStats();
                    if (stats) {
                        volumeStat.textContent = stats.volume + '%';
                        frequencyStat.textContent = stats.dominant.frequency + ' Hz';
                        bassStat.textContent = stats.ranges.bass + '%';
                        midStat.textContent = stats.ranges.mid + '%';
                        trebleStat.textContent = stats.ranges.treble + '%';
                    }
                }, 50);
                
            } catch (err) {
                console.error('Playback error:', err);
                stopCurrentAudio();
                visualizer.stop();
                window.toast.error('Playback failed', 'Could not play recording');
                infoBox.innerHTML = '<p class="text-red-400">Failed to play recording</p>';
            }
        });
    });
    document.querySelectorAll('.rename-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            pendingRenameFilename = btn.dataset.filename;
            const currentName = btn.dataset.currentName;
            if (!currentName.startsWith('Recording ')) {
                renameInput.value = currentName;
            } else {
                renameInput.value = '';
            }
            
            renameModal.classList.remove('hidden');
            renameModal.classList.add('flex');
            setTimeout(() => {
                renameInput.focus();
                renameInput.select();
            }, 100);
        });
    });

    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            pendingDownloadUrl = btn.dataset.url;
            pendingDownloadFilename = btn.dataset.filename;
            formatModal.classList.remove('hidden');
            formatModal.classList.add('flex');
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            pendingDeleteFilename = btn.dataset.filename;
            deleteModal.classList.remove('hidden');
            deleteModal.classList.add('flex');
        });
    });
}

async function uploadRecording(blob) {
    if (blob.size === 0) {
        window.toast.error('Recording too short', 'No audio data captured');
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
            window.toast.success('Recording saved', 'Added to your library');
            infoBox.innerHTML = '<p class="text-green-400">Recording saved successfully</p>';
            await loadRecordings();
            timerDisplay.textContent = '00:00';
            setTimeout(() => {
                infoBox.innerHTML = '<p class="text-green-400">Microphone active</p>';
            }, 3000);
        } else {
            window.toast.error('Save failed', data.error || 'Could not save recording');
            infoBox.innerHTML = `<p class="text-red-400">Upload failed: ${data.error}</p>`;
        }
    } catch (error) {
        console.error('Error uploading recording:', error);
        window.toast.error('Upload failed', 'Could not save recording');
        infoBox.innerHTML = '<p class="text-red-400">Failed to save recording</p>';
    }
}

function updatePracticeDisplay() {
    const todayStats = practiceTracker.getTodayStats();
    const weekStats = practiceTracker.getWeekStats();
    
    const todayEl = document.getElementById('todayPractice');
    const weekEl = document.getElementById('weekPractice');
    
    if (todayEl) {
        todayEl.textContent = practiceTracker.formatMinutes(todayStats.minutes);
    }
    
    if (weekEl) {
        weekEl.textContent = practiceTracker.formatMinutes(weekStats.minutes);
    }
    
    if (practiceTracker.isActive()) {
        setTimeout(updatePracticeDisplay, 60000);
    }
}

startButton.addEventListener('click', async () => {
    if (!isRunning) {
        stopCurrentAudio();
        visualizer.stop();
        if (statsInterval) {
            clearInterval(statsInterval);
            statsInterval = null;
        }
        
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
            
            practiceTracker.startSession('visualizer');
            updatePracticeDisplay();

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
            if (error.message.includes('denied')) {
                window.toast.error('Microphone denied', 'Please allow access in browser settings');
                infoBox.innerHTML = `<p class="text-red-400">Microphone access denied. Please allow access in browser settings.</p>`;
            } else if (error.message.includes('not found')) {
                window.toast.error('No microphone found', 'Please connect a microphone');
                infoBox.innerHTML = `<p class="text-red-400">No microphone found. Please connect a microphone.</p>`;
            } else {
                window.toast.error('Microphone error', error.message);
                infoBox.innerHTML = `<p class="text-red-400">${error.message}</p>`;
            }
        }
    } else {
        isRunning = false;
        
        const session = practiceTracker.endSession();
        if (session) {
            const duration = practiceTracker.formatMinutes(Math.floor(session.duration / 60));
            window.toast.success('Session saved', `Practiced for ${duration}`);
            updatePracticeDisplay();
        }
        
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
            timerDisplay.textContent = '00:00';
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
        if (!isRunning) {
            window.toast.warning('Start microphone first', 'Click the microphone button to begin');
            return;
        }
        const started = recorder.startRecording();
        if (started) {
            isRecording = true;
            recordButton.classList.add('active');
            recordingTimer.style.display = 'block';
            window.toast.info('Recording started', 'Capturing audio...');
            
            timerInterval = setInterval(() => {
                const duration = recorder.getRecordingDuration();
                const minutes = Math.floor(duration / 60);
                const seconds = duration % 60;
                timerDisplay.textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }, 1000);
        } else {
            window.toast.error('Recording failed', 'Could not start recording');
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
            window.toast.success('Recording stopped', 'Saving to library...');
            await uploadRecording(blob);
        } else {
            window.toast.error('Recording failed', 'No audio data captured');
            infoBox.innerHTML = '<p class="text-red-400">Recording failed - no data</p>';
        }
    }
});

loadRecordings();
updatePracticeDisplay();
