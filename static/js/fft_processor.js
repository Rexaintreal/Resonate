export class FFTProcessor {
    constructor(audioCapture) {
        this.audioCapture = audioCapture;
        this.barCount = 64;
    }

    getFrequencyBars(barCount = this.barCount) {
        const frequencyData = this.audioCapture.getFrequencyData();
        if (!frequencyData) return new Array(barCount).fill(0);

        const bars = [];
        const dataPerBar = Math.floor(frequencyData.length / barCount);

        for (let i = 0; i < barCount; i++) {
            let sum = 0;
            const start = i * dataPerBar;
            const end = start + dataPerBar;

            for (let j = start; j < end; j++) {
                sum += frequencyData[j];
            }

            const average = sum / dataPerBar;
            const normalized = (average / 255) * 100;
            const scaled = Math.pow(normalized / 100, 0.7) * 100;
            bars.push(Math.round(scaled));
        }

        return bars;
    }

    getDominantFrequency() {
        const frequencyData = this.audioCapture.getFrequencyData();
        if (!frequencyData) return { frequency: 0, amplitude: 0 };

        let maxAmplitude = 0;
        let maxIndex = 0;

        for (let i = 0; i < frequencyData.length; i++) {
            if (frequencyData[i] > maxAmplitude) {
                maxAmplitude = frequencyData[i];
                maxIndex = i;
            }
        }

        const frequency = this.audioCapture.indexToFrequency(maxIndex);
        return {
            frequency: Math.round(frequency),
            amplitude: maxAmplitude
        };
    }

    getFrequencyRanges() {
        const frequencyData = this.audioCapture.getFrequencyData();
        if (!frequencyData) return { bass: 0, mid: 0, treble: 0 };

        const sampleRate = this.audioCapture.getSampleRate();
        const nyquist = sampleRate / 2;
        const binCount = frequencyData.length;

        const bassMax = 250;
        const midMax = 2000;
        const trebleMax = nyquist;

        const bassEndIndex = Math.floor((bassMax / nyquist) * binCount);
        const midEndIndex = Math.floor((midMax / nyquist) * binCount);

        let bassSum = 0, midSum = 0, trebleSum = 0;
        let bassCount = 0, midCount = 0, trebleCount = 0;

        for (let i = 0; i < binCount; i++) {
            if (i < bassEndIndex) {
                bassSum += frequencyData[i];
                bassCount++;
            } else if (i < midEndIndex) {
                midSum += frequencyData[i];
                midCount++;
            } else {
                trebleSum += frequencyData[i];
                trebleCount++;
            }
        }

        return {
            bass: Math.round((bassSum / bassCount / 255) * 100),
            mid: Math.round((midSum / midCount / 255) * 100),
            treble: Math.round((trebleSum / trebleCount / 255) * 100)
        };
    }

    getWaveform(points = 512) {
        const waveformData = this.audioCapture.getWaveformData();
        if (!waveformData) return new Array(points).fill(0);

        const waveform = [];
        const step = Math.floor(waveformData.length / points);

        for (let i = 0; i < points; i++) {
            const index = i * step;
            const normalized = (waveformData[index] - 128) / 128;
            waveform.push(normalized);
        }

        return waveform;
    }

    isSoundDetected(threshold = 5) {
        const volume = this.audioCapture.getVolume();
        return volume > threshold;
    }

    getSpectrum(bands = 10) {
        const frequencyData = this.audioCapture.getFrequencyData();
        if (!frequencyData) return [];

        const spectrum = [];
        const dataPerBand = Math.floor(frequencyData.length / bands);

        for (let i = 0; i < bands; i++) {
            let sum = 0;
            const start = i * dataPerBand;
            const end = start + dataPerBand;

            for (let j = start; j < end; j++) {
                sum += frequencyData[j];
            }

            const average = sum / dataPerBand;
            const frequency = this.audioCapture.indexToFrequency(start + dataPerBand / 2);
            
            spectrum.push({
                frequency: Math.round(frequency),
                label: this.formatFrequency(frequency),
                amplitude: Math.round((average / 255) * 100)
            });
        }

        return spectrum;
    }

    formatFrequency(frequency) {
        if (frequency >= 1000) {
            return (frequency / 1000).toFixed(1) + ' kHz';
        }
        return Math.round(frequency) + ' Hz';
    }

    setBarCount(count) {
        this.barCount = count;
    }
}