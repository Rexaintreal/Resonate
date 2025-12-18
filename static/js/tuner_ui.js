import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { AudioCapture } from './audio.js';
import { PitchDetector } from './pitch_detector.js';

const logoutIcon = document.getElementById('logoutIcon');
const logoutModal = document.getElementById('logoutModal');
const cancelLogout = document.getElementById('cancelLogout');
const confirmLogout = document.getElementById('confirmLogout');
const startButton = document.getElementById('startButton');
const tunerGaugeContainer = document.getElementById('tunerGaugeContainer');
const tunerNoteDisplay = document.getElementById('tunerNoteDisplay');
const tunerFrequencyDisplay = document.getElementById('tunerFrequencyDisplay');
const tunerCentsDisplay = document.getElementById('tunerCentsDisplay');
const tunerStatusDisplay = document.getElementById('tunerStatusDisplay');
const tunerNeedle = document.getElementById('tunerNeedle');
const infoBox = document.getElementById('infoBox');
const noteStat = document.getElementById('noteStat');
const freqStat = document.getElementById('freqStat');
const centsStat = document.getElementById('centsStat');
const statusStat = document.getElementById('statusStat');
const referenceNotesGrid = document.getElementById('referenceNotesGrid');
const instrumentButtons = document.querySelectorAll('.instrument-btn');

const audioCapture = new AudioCapture();
const pitchDetector = new PitchDetector();
let isRunning = false;
let detectionInterval = null;
let currentInstrument = 'chromatic';

const instruments = {
    chromatic: [
        { name: 'C', freq: 261.63 },
        { name: 'D', freq: 293.66 },
        { name: 'E', freq: 329.63 },
        { name: 'F', freq: 349.23 },
        { name: 'G', freq: 392.00 },
        { name: 'A', freq: 440.00 },
        { name: 'B', freq: 493.88 }
    ],
    guitar: [
        { name: 'E', freq: 82.41, string: '6th' },
        { name: 'A', freq: 110.00, string: '5th' },
        { name: 'D', freq: 146.83, string: '4th' },
        { name: 'G', freq: 196.00, string: '3rd' },
        { name: 'B', freq: 246.94, string: '2nd' },
        { name: 'E', freq: 329.63, string: '1st' }
    ],
    bass: [
        { name: 'E', freq: 41.20, string: '4th' },
        { name: 'A', freq: 55.00, string: '3rd' },
        { name: 'D', freq: 73.42, string: '2nd' },
        { name: 'G', freq: 98.00, string: '1st' }
    ],
    ukulele: [
        { name: 'G', freq: 392.00, string: '4th' },
        { name: 'C', freq: 261.63, string: '3rd' },
        { name: 'E', freq: 329.63, string: '2nd' },
        { name: 'A', freq: 440.00, string: '1st' }
    ],
    violin: [
        { name: 'G', freq: 196.00, string: '4th' },
        { name: 'D', freq: 293.66, string: '3rd' },
        { name: 'A', freq: 440.00, string: '2nd' },
        { name: 'E', freq: 659.25, string: '1st' }
    ]
};


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


function updateReferenceNotes() {
    const notes = instruments[currentInstrument];
    referenceNotesGrid.innerHTML = notes.map(note => `
        <div class="reference-note" data-freq="${note.freq}">
            <div class="reference-note-name">${note.name}${note.string ? '<sub style="font-size:10px">' + note.string + '</sub>' : ''}</div>
            <div class="reference-note-freq">${Math.round(note.freq)} Hz</div>
        </div>
    `).join('');

    document.querySelectorAll('.reference-note').forEach(noteEl => {
        noteEl.addEventListener('click', () => {
            const freq = parseFloat(noteEl.dataset.freq);
            playTone(freq);
            
            document.querySelectorAll('.reference-note').forEach(n => n.classList.remove('active'));
            noteEl.classList.add('active');
            
            setTimeout(() => {
                noteEl.classList.remove('active');
            }, 2000);
        });
    });
}





function playTone(frequency) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1);
}

instrumentButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        instrumentButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentInstrument = btn.dataset.instrument;
        updateReferenceNotes();
    });
});



function updateNeedle(cents) {
    const maxCents = 50;
    const clampedCents = Math.max(-maxCents, Math.min(maxCents, cents));
    const angle = (clampedCents / maxCents) * 90;
    tunerNeedle.setAttribute('transform', `rotate(${angle} 200 180)`);
    
    let needleColor = '#14B8A6';
    if (Math.abs(cents) <= 5) {
        needleColor = '#10B981';
    } else if (Math.abs(cents) > 25) {
        needleColor = cents > 0 ? '#F59E0B' : '#3B82F6';
    }
    
    const needleLine = tunerNeedle.querySelector('line');
    const needleCircles = tunerNeedle.querySelectorAll('circle');
    needleLine.setAttribute('stroke', needleColor);
    needleLine.setAttribute('filter', `drop-shadow(0 0 8px ${needleColor}99)`);
    needleCircles[0].setAttribute('fill', needleColor);
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
            tunerGaugeContainer.classList.add('active');
            infoBox.innerHTML = '<p class="text-green-400">Tuner active - Play your instrument</p>';

            detectionInterval = setInterval(() => {
                const pitchData = pitchDetector.detect(audioCapture);
                
                if (pitchData) {
                    tunerNoteDisplay.textContent = pitchData.note.fullName;
                    tunerFrequencyDisplay.textContent = Math.round(pitchData.frequency) + ' Hz';
                    tunerCentsDisplay.textContent = (pitchData.cents > 0 ? '+' : '') + pitchData.cents + '¢';
                    
                    noteStat.textContent = pitchData.note.fullName;
                    freqStat.textContent = Math.round(pitchData.frequency) + ' Hz';
                    centsStat.textContent = (pitchData.cents > 0 ? '+' : '') + pitchData.cents + '¢';
                    
                    updateNeedle(pitchData.cents);
                    
                    tunerGaugeContainer.classList.remove('in-tune');
                    
                    if (pitchDetector.isInTune(pitchData.cents, 5)) {
                        tunerGaugeContainer.classList.add('in-tune');
                        tunerStatusDisplay.textContent = '✓ Perfect Tune!';
                        statusStat.textContent = 'In Tune';
                        statusStat.style.color = '#10B981';
                    } else if (pitchData.cents > 0) {
                        tunerStatusDisplay.textContent = 'Too Sharp ♯ - Tune Down';
                        statusStat.textContent = 'Sharp';
                        statusStat.style.color = '#F59E0B';
                    } else {
                        tunerStatusDisplay.textContent = 'Too Flat ♭ - Tune Up';
                        statusStat.textContent = 'Flat';
                        statusStat.style.color = '#3B82F6';
                    }
                } else {
                    tunerNoteDisplay.textContent = '--';
                    tunerFrequencyDisplay.textContent = '-- Hz';
                    tunerCentsDisplay.textContent = '0¢';
                    tunerStatusDisplay.textContent = 'Listening...';
                    tunerGaugeContainer.classList.remove('in-tune');
                    updateNeedle(0);
                    
                    statusStat.textContent = 'Listening';
                    statusStat.style.color = '#14B8A6';
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
        tunerGaugeContainer.classList.remove('active', 'in-tune');
        
        tunerNoteDisplay.textContent = '--';
        tunerFrequencyDisplay.textContent = '-- Hz';
        tunerCentsDisplay.textContent = '0¢';
        tunerStatusDisplay.textContent = 'Play a note to begin';
        updateNeedle(0);
        
        noteStat.textContent = '--';
        freqStat.textContent = '-- Hz';
        centsStat.textContent = '0¢';
        statusStat.textContent = 'Idle';
        statusStat.style.color = '#14B8A6';
        
        infoBox.innerHTML = '<p>Click microphone to start tuning</p>';
    }
});

updateReferenceNotes();
