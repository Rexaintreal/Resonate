import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { AudioCapture } from './audio.js';
import { ChordDetector } from './chord_detector.js';

const logoutIcon = document.getElementById('logoutIcon');
const logoutModal = document.getElementById('logoutModal');
const cancelLogout = document.getElementById('cancelLogout');
const confirmLogout = document.getElementById('confirmLogout');
const startButton = document.getElementById('startButton');
const chordDisplay = document.getElementById('chordDisplay');
const chordName = document.getElementById('chordName');
const chordType = document.getElementById('chordType');
const chordNotes = document.getElementById('chordNotes');
const confidenceDisplay = document.getElementById('confidenceDisplay');
const confidenceValue = document.getElementById('confidenceValue');
const noteWheel = document.getElementById('noteWheel');
const chordHistoryList = document.getElementById('chordHistoryList');
const infoBox = document.getElementById('infoBox');
const chordStat = document.getElementById('chordStat');     
const notesStat = document.getElementById('notesStat');
const qualityStat = document.getElementById('qualityStat');
const statusStat = document.getElementById('statusStat');
const audioCapture = new AudioCapture();
const chordDetector = new ChordDetector();


let isRunning = false;
let detectionInterval = null;
let chordHistory = [];
let lastChordSymbol = '';
let stabilityCounter = 0;



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



function updateNoteWheel(notes) {
    const wheelNotes = noteWheel.querySelectorAll('.wheel-note');
    wheelNotes.forEach(noteEl => {
        const noteName = noteEl.dataset.note;
        if (notes && notes.includes(noteName)) {
            noteEl.classList.add('active');
        } else {
            noteEl.classList.remove('active');
        }
    });
}


function updateChordHistory(chordSymbol) {
    if (chordSymbol && chordSymbol !== '--' && chordSymbol !== lastChordSymbol) {
        chordHistory.unshift(chordSymbol);
        if (chordHistory.length > 5) {
            chordHistory.pop();
        }
        
        chordHistoryList.innerHTML = chordHistory.length > 0 
            ? chordHistory.map(c => `<div class="history-chord">${c}</div>`).join('')
            : '<div class="history-chord">--</div>';
        
        lastChordSymbol = chordSymbol;
        stabilityCounter = 0;
    }
}


function updateNoteBadges(notes) {
    if (!notes || notes.length === 0) {
        chordNotes.innerHTML = '<div class="note-badge">--</div>';
        return;
    }
    
    chordNotes.innerHTML = notes.map(note => 
        `<div class="note-badge active">${note}</div>`
    ).join('');
}



function getConfidenceClass(confidence) {
    if (confidence >= 80) return 'high';
    if (confidence >= 60) return 'medium';
    return 'low';
}


startButton.addEventListener('click', async () => {
    if (!isRunning) {
        try {
            startButton.disabled = true;
            startButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            await audioCapture.initialize();

            isRunning = true;
            startButton.innerHTML = '<i class="fas fa-stop"></i>';
            startButton.classList.add('active');
            startButton.disabled = false;
            chordDisplay.classList.add('active');
            infoBox.innerHTML = '<p class="text-green-400">Chord recognition active</p>';
            statusStat.textContent = 'Listening';
            statusStat.style.color = '#14B8A6';

            let noChordCounter = 0;

            detectionInterval = setInterval(() => {
                const chord = chordDetector.detectChord(audioCapture);
                
                if (chord && chord.confidence > 50) {
                    noChordCounter = 0;
                    
                    const chordSymbol = chordDetector.getChordSymbol(chord);
                    const chordFullName = chordDetector.getChordFullName(chord);
                    
                    if (chordSymbol === lastChordSymbol) {
                        stabilityCounter++;
                    } else {
                        stabilityCounter = 0;
                    }
                    
                    if (stabilityCounter >= 3) {
                        chordName.textContent = chordSymbol;
                        chordType.textContent = chordFullName;
                        
                        updateNoteBadges(chord.notes);
                        updateNoteWheel(chord.notes);
                        confidenceValue.textContent = chord.confidence + '%';
                        confidenceDisplay.className = 'confidence-display ' + getConfidenceClass(chord.confidence);
                        
                        chordStat.textContent = chordSymbol;
                        notesStat.textContent = chord.notes.join(', ');
                        qualityStat.textContent = chord.type;
                        statusStat.textContent = 'Detected';
                        statusStat.style.color = '#10B981';
                        
                        updateChordHistory(chordSymbol);
                    }
                    
                    lastChordSymbol = chordSymbol;
                } else {
                    noChordCounter++;
                    
                    if (noChordCounter > 10) {
                        chordName.textContent = '--';
                        chordType.textContent = 'Play a chord';
                        updateNoteBadges(null);
                        updateNoteWheel(null);
                        confidenceValue.textContent = '0%';
                        confidenceDisplay.className = 'confidence-display';
                        statusStat.textContent = 'Listening';
                        statusStat.style.color = '#14B8A6';
                        lastChordSymbol = '';
                        stabilityCounter = 0;
                    }
                }
            }, 100);

        } catch (error) {
            console.error('Error:', error);
            startButton.innerHTML = '<i class="fas fa-microphone"></i>';
            startButton.classList.remove('active');
            startButton.disabled = false;
            infoBox.innerHTML = `<p class="text-red-400">${error.message}</p>`;
        }
    } else {
        isRunning = false;
        if (detectionInterval) clearInterval(detectionInterval);
        audioCapture.stop();
        
        startButton.innerHTML = '<i class="fas fa-microphone"></i>';
        startButton.classList.remove('active');
        chordDisplay.classList.remove('active');
        
        chordName.textContent = '--';
        chordType.textContent = 'Play a chord to begin';
        updateNoteBadges(null);
        updateNoteWheel(null);
        confidenceValue.textContent = '0%';
        confidenceDisplay.className = 'confidence-display';
        
        chordStat.textContent = '--';
        notesStat.textContent = '--';
        qualityStat.textContent = '--';
        statusStat.textContent = 'Idle';
        statusStat.style.color = '#14B8A6';
        
        infoBox.innerHTML = '<p>Click microphone to start chord recognition</p>';
        lastChordSymbol = '';
        stabilityCounter = 0;   
    }
});

