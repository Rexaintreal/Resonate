import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { AudioCapture } from './audio.js';
import { FFTProcessor } from './fft_processor.js';

const logoutIcon = document.getElementById('logoutIcon');
const logoutModal = document.getElementById('logoutModal');
const cancelLogout = document.getElementById('cancelLogout');
const confirmLogout = document.getElementById('confirmLogout');
const startButton = document.getElementById('startButton');
const spectrumDisplay = document.getElementById('spectrumDisplay');
const spectrumBands = document.getElementById('spectrumBands');
const peakValue = document.getElementById('peakValue');
const peakNote = document.getElementById('peakNote');
const infoBox = document.getElementById('infoBox');
const peakStat = document.getElementById('peakStat');
const dominantStat = document.getElementById('dominantStat');
const energyStat = document.getElementById('energyStat');
const statusStat = document.getElementById('statusStat');
const audioCapture = new AudioCapture();
const fftProcessor = new FFTProcessor(audioCapture);

function getThemeColor(property) {
    return getComputedStyle(document.documentElement).getPropertyValue(property).trim();
}

let isRunning = false;
let animationId = null;

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const frequencyRanges = [
    { name: 'subBass', min: 20, max: 60, element: null, bar: null, value: null },
    { name: 'bass', min: 60, max: 250, element: null, bar: null, value: null },
    { name: 'lowMid', min: 250, max: 500, element: null, bar: null, value: null },
    { name: 'mid', min: 500, max: 2000, element: null, bar: null, value: null },
    { name: 'highMid', min: 2000, max: 4000, element: null, bar: null, value: null },
    { name: 'presence', min: 4000, max: 6000, element: null, bar: null, value: null },
    { name: 'brilliance', min: 6000, max: 20000, element: null, bar: null, value: null }
];

frequencyRanges.forEach(range => {
    range.bar = document.getElementById(`${range.name}Bar`);
    range.value = document.getElementById(`${range.name}Value`);
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

function frequencyToNote(frequency) {
    const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    const noteIndex = Math.round(noteNum) + 69;
    const octave = Math.floor(noteIndex / 12) - 1;
    const noteName = NOTE_NAMES[noteIndex % 12];
    return `${noteName}${octave}`;
}


function createSpectrumBands() {
    spectrumBands.innerHTML = '';
    const bandCount = 20;
    
    for (let i = 0; i < bandCount; i++) {
        const band = document.createElement('div');
        band.className = 'spectrum-band';
        band.style.height = '0%';
        
        const label = document.createElement('div');
        label.className = 'band-label';
        
        const minFreq = 20;
        const maxFreq = 8000;
        const logMin = Math.log10(minFreq);
        const logMax = Math.log10(maxFreq);
        const freq = Math.pow(10, logMin + (i / bandCount) * (logMax - logMin));
        
        if (freq < 1000) {
            label.textContent = Math.round(freq) + 'Hz';
        } else {
            label.textContent = (freq / 1000).toFixed(1) + 'k';
        }
        
        band.appendChild(label);
        spectrumBands.appendChild(band);
    }
}

function getFrequencyRangeAmplitude(min, max) {
    const frequencyData = audioCapture.getFrequencyData();
    if (!frequencyData) return 0;

    const sampleRate = audioCapture.getSampleRate();
    const nyquist = sampleRate / 2;
    const binCount = frequencyData.length;

    const startBin = Math.floor((min / nyquist) * binCount);
    const endBin = Math.floor((max / nyquist) * binCount);

    let sum = 0;
    let count = 0;

    for (let i = startBin; i < endBin && i < binCount; i++) {
        sum += frequencyData[i];
        count++;
    }

    const average = count > 0 ? sum / count : 0;
    return Math.round((average / 255) * 100);
}


function updateSpectrumDisplay() {
    if (!isRunning) return;

    const spectrum = fftProcessor.getSpectrum(20);
    const bands = spectrumBands.querySelectorAll('.spectrum-band');
    
    spectrum.forEach((band, index) => {
        if (bands[index]) {
            const height = Math.min(band.amplitude, 100);
            bands[index].style.height = height + '%';
        }
    });

    const dominant = fftProcessor.getDominantFrequency();
    if (dominant.frequency > 0) {
        peakValue.textContent = dominant.frequency + ' Hz';
        peakNote.textContent = frequencyToNote(dominant.frequency);
        peakStat.textContent = dominant.frequency + ' Hz';
    } else {
        peakValue.textContent = '-- Hz';
        peakNote.textContent = '--';
        peakStat.textContent = '-- Hz';
    }

    frequencyRanges.forEach(range => {
        const amplitude = getFrequencyRangeAmplitude(range.min, range.max);
        if (range.bar && range.value) {
            range.bar.style.width = amplitude + '%';
            range.value.textContent = amplitude + '%';
        }
    });

    const dominantRange = frequencyRanges.reduce((prev, curr) => {
        const prevAmp = getFrequencyRangeAmplitude(prev.min, prev.max);
        const currAmp = getFrequencyRangeAmplitude(curr.min, curr.max);
        return currAmp > prevAmp ? curr : prev;
    });
    
    dominantStat.textContent = dominantRange.name === 'subBass' ? 'Sub-Bass' :
                               dominantRange.name === 'lowMid' ? 'Low-Mid' :
                               dominantRange.name === 'highMid' ? 'High-Mid' :
                               dominantRange.name.charAt(0).toUpperCase() + dominantRange.name.slice(1);

    const volume = audioCapture.getVolume();
    energyStat.textContent = volume + '%';

    animationId = requestAnimationFrame(updateSpectrumDisplay);
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
            spectrumDisplay.classList.add('active');
            infoBox.innerHTML = '<p class="text-green-400">Spectrum analysis active</p>';
            statusStat.textContent = 'Analyzing';
            statusStat.style.color = getThemeColor('--color-success');

            createSpectrumBands();
            updateSpectrumDisplay();

        } catch (error) {
            console.error('Error:', error);
            startButton.innerHTML = '<i class="fas fa-microphone"></i>';
            startButton.classList.remove('active');
            startButton.disabled = false;
            infoBox.innerHTML = `<p class="text-red-400">${error.message}</p>`;
        }
    } else {
        isRunning = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        audioCapture.stop();
        
        startButton.innerHTML = '<i class="fas fa-microphone"></i>';
        startButton.classList.remove('active');
        spectrumDisplay.classList.remove('active');
        
        const bands = spectrumBands.querySelectorAll('.spectrum-band');
        bands.forEach(band => {
            band.style.height = '0%';
        });
        
        peakValue.textContent = '-- Hz';
        peakNote.textContent = '--';
        peakStat.textContent = '-- Hz';
        dominantStat.textContent = '--';
        energyStat.textContent = '0%';
        statusStat.textContent = 'Idle';
        statusStat.style.color = getThemeColor('--color-accent');
        
        frequencyRanges.forEach(range => {
            if (range.bar && range.value) {
                range.bar.style.width = '0%';
                range.value.textContent = '0%';
            }
        });
        
        infoBox.innerHTML = '<p>Click microphone to start spectrum analysis</p>';
    }
});

createSpectrumBands();

