export class BPMDetector {
    constructor(audioCapture) {
        this.audioCapture = audioCapture;
        this.beatTimes = [];
        this.energyHistory = [];
        this.historySize = 43; 
        this.threshold = 1.5;
        this.minTimeBetweenBeats = 300;
        this.lastBeatTime = 0;
        this.detectedBPM = 0;
        this.confidence = 0;
    }

    analyze() {
        const frequencyData = this.audioCapture.getFrequencyData();
        if (!frequencyData) return null;
        const sampleRate = this.audioCapture.getSampleRate();
        const nyquist = sampleRate / 2;
        const binCount = frequencyData.length;
        
        const lowFreq = 60;
        const highFreq = 250;
        const startBin = Math.floor((lowFreq / nyquist) * binCount);
        const endBin = Math.floor((highFreq / nyquist) * binCount);

        let energy = 0;
        for (let i = startBin; i < endBin; i++) {
            energy += frequencyData[i] * frequencyData[i];
        }
        energy = Math.sqrt(energy / (endBin - startBin));

        this.energyHistory.push(energy);
        if (this.energyHistory.length > this.historySize) {
            this.energyHistory.shift();
        }

        const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;

        const now = Date.now();
        let beatDetected = false;

        if (energy > avgEnergy * this.threshold && 
            now - this.lastBeatTime > this.minTimeBetweenBeats) {
            beatDetected = true;
            this.lastBeatTime = now;
            this.beatTimes.push(now);

            if (this.beatTimes.length > 8) {
                this.beatTimes.shift();
            }

            if (this.beatTimes.length >= 2) {
                const intervals = [];
                for (let i = 1; i < this.beatTimes.length; i++) {
                    intervals.push(this.beatTimes[i] - this.beatTimes[i - 1]);
                }

                const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
                this.detectedBPM = Math.round(60000 / avgInterval);
                const variance = intervals.reduce((sum, interval) => {
                    return sum + Math.pow(interval - avgInterval, 2);
                }, 0) / intervals.length;
                const stdDev = Math.sqrt(variance);
                const cv = stdDev / avgInterval;
                this.confidence = Math.max(0, Math.min(100, (1 - cv) * 100));
            }
        }

        return {
            beatDetected: beatDetected,
            bpm: this.detectedBPM,
            confidence: Math.round(this.confidence),
            energy: Math.round((energy / 255) * 100)
        };
    }

    reset() {
        this.beatTimes = [];
        this.energyHistory = [];
        this.detectedBPM = 0;
        this.confidence = 0;
        this.lastBeatTime = 0;
    }

    getBPM() {
        return this.detectedBPM;
    }

    getConfidence() {
        return Math.round(this.confidence);
    }

    isReady() {
        return this.beatTimes.length >= 2;
    }
}