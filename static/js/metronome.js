import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const logoutIcon = document.getElementById('logoutIcon');
const logoutModal = document.getElementById('logoutModal');
const cancelLogout = document.getElementById('cancelLogout');
const confirmLogout = document.getElementById('confirmLogout');
const startButton = document.getElementById('startButton');
const metronomeDisplay = document.getElementById('metronomeDisplay');
const bpmDisplay = document.getElementById('bpmDisplay');
const bpmSlider = document.getElementById('bpmSlider');
const beatIndicator = document.getElementById('beatIndicator');
const tapTempoBtn = document.getElementById('tapTempoBtn');
const infoBox = document.getElementById('infoBox');
const tempoStat = document.getElementById('tempoStat');
const timeSigStat = document.getElementById('timeSigStat');
const beatStat = document.getElementById('beatStat');
const statusStat = document.getElementById('statusStat');
const timeSigButtons = document.querySelectorAll('.time-sig-btn');

let audioContext = null;
let isRunning = false;
let currentBeat = 0;
let bpm = 120;
let beatsPerMeasure = 4;
let nextNoteTime = 0;
let scheduleAheadTime = 0.1;
let timerID = null;
let tapTimes = [];

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

function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playClick(time, isAccent) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    if (isAccent) {
        osc.frequency.value = 1000;
        gain.gain.value = 0.5;
    } else {
        osc.frequency.value = 800;
        gain.gain.value = 0.3;
    }
    
    osc.start(time);
    osc.stop(time + 0.05);
    
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
}




function nextNote() {
    const secondsPerBeat = 60.0 / bpm;
    nextNoteTime += secondsPerBeat;
    
    currentBeat++;
    if (currentBeat >= beatsPerMeasure) {
        currentBeat = 0;
    }
}

function scheduleNote(beatNumber, time) {
    const isAccent = beatNumber === 0;
    playClick(time, isAccent);
    
    setTimeout(() => {
        updateBeatIndicator(beatNumber);
        beatStat.textContent = beatNumber + 1;
    }, (time - audioContext.currentTime) * 1000);
}

function scheduler() {
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
        scheduleNote(currentBeat, nextNoteTime);
        nextNote();
    }
    timerID = setTimeout(scheduler, 25);
}

function updateBeatIndicator(beat) {
    const dots = beatIndicator.querySelectorAll('.beat-dot');
    dots.forEach((dot, index) => {
        dot.classList.remove('active');
        if (index === beat) {
            dot.classList.add('active');
        }
    });
}

function updateBeatDots() {
    const dots = beatIndicator.querySelectorAll('.beat-dot');
    
    dots.forEach((dot, index) => {
        if (index < beatsPerMeasure) {
            dot.style.display = 'block';
        } else {
            dot.style.display = 'none';
        }
    });
}

function getTempoMarking(bpm) {
    if (bpm < 60) return 'Largo';
    if (bpm < 76) return 'Adagio';
    if (bpm < 108) return 'Andante';
    if (bpm < 120) return 'Moderato';
    if (bpm < 168) return 'Allegro';
    if (bpm < 200) return 'Presto';
    return 'Prestissimo';
}


bpmSlider.addEventListener('input', (e) => {
    bpm = parseInt(e.target.value);
    bpmDisplay.textContent = bpm;
    tempoStat.textContent = bpm + ' BPM';
    infoBox.innerHTML = `<p>${getTempoMarking(bpm)} tempo</p>`;
});


timeSigButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        timeSigButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        beatsPerMeasure = parseInt(btn.dataset.signature);
        const sigText = btn.textContent;
        timeSigStat.textContent = sigText;
        
        updateBeatDots();
        
        if (isRunning) {
            currentBeat = 0;
        }
    });
});



tapTempoBtn.addEventListener('click', () => {
    const now = Date.now();
    tapTimes.push(now);
    
    if (tapTimes.length > 1) {
        const recentTaps = tapTimes.filter(time => now - time < 3000);
        tapTimes = recentTaps;
        
        if (tapTimes.length >= 2) {
            const intervals = [];
            for (let i = 1; i < tapTimes.length; i++) {
                intervals.push(tapTimes[i] - tapTimes[i - 1]);
            }
            
            const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
            const calculatedBpm = Math.round(60000 / avgInterval);
            
            if (calculatedBpm >= 40 && calculatedBpm <= 240) {
                bpm = calculatedBpm;
                bpmDisplay.textContent = bpm;
                bpmSlider.value = bpm;
                tempoStat.textContent = bpm + ' BPM';
                infoBox.innerHTML = `<p class="text-green-400">Tempo set to ${bpm} BPM</p>`;
            }
        }
    }
    
    tapTempoBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        tapTempoBtn.style.transform = 'scale(1)';
    }, 100);
});



startButton.addEventListener('click', () => {
    if (!isRunning) {
        initAudioContext();
        
        isRunning = true;
        currentBeat = 0;
        nextNoteTime = audioContext.currentTime;
        
        startButton.innerHTML = '<i class="fas fa-stop"></i>';
        startButton.classList.add('active');
        metronomeDisplay.classList.add('active');
        statusStat.textContent = 'Playing';
        statusStat.style.color = '#10B981';
        infoBox.innerHTML = '<p class="text-green-400">Metronome running</p>';
        
        scheduler();
    } else {
        isRunning = false;
        
        if (timerID) {
            clearTimeout(timerID);
            timerID = null;
        }
        
        startButton.innerHTML = '<i class="fas fa-play"></i>';
        startButton.classList.remove('active');
        metronomeDisplay.classList.remove('active');
        statusStat.textContent = 'Stopped';
        statusStat.style.color = '#14B8A6';
        infoBox.innerHTML = '<p>Click play to start metronome</p>';
        
        const dots = beatIndicator.querySelectorAll('.beat-dot');
        dots.forEach(dot => dot.classList.remove('active'));
        beatStat.textContent = '1';
    }
});



updateBeatDots();



