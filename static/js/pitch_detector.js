export class PitchDetector {
    constructor() {
        this.noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        this.sampleRate = 44100;
    }

    autoCorrelate(buffer, sampleRate) {
        const SIZE = buffer.length;
        const MAX_SAMPLES = Math.floor(SIZE / 2);
        let best_offset = -1;
        let best_correlation = 0;
        let rms = 0;
        let foundGoodCorrelation = false;

        for (let i = 0; i < SIZE; i++) {
            const val = buffer[i];
            rms += val * val;
        }
        rms = Math.sqrt(rms / SIZE);

        if (rms < 0.01) return -1;

        let lastCorrelation = 1;
        for (let offset = 1; offset < MAX_SAMPLES; offset++) {
            let correlation = 0;

            for (let i = 0; i < MAX_SAMPLES; i++) {
                correlation += Math.abs(buffer[i] - buffer[i + offset]);
            }

            correlation = 1 - (correlation / MAX_SAMPLES);

            if (correlation > 0.9 && correlation > lastCorrelation) {
                foundGoodCorrelation = true;
                if (correlation > best_correlation) {
                    best_correlation = correlation;
                    best_offset = offset;
                }
            } else if (foundGoodCorrelation) {
                break;
            }

            lastCorrelation = correlation;
        }

        if (best_correlation > 0.01) {
            return sampleRate / best_offset;
        }

        return -1;
    }

    detect(audioCapture) {
        const buffer = audioCapture.getWaveformData();
        if (!buffer) return null;

        const float32Buffer = new Float32Array(buffer.length);
        for (let i = 0; i < buffer.length; i++) {
            float32Buffer[i] = (buffer[i] - 128) / 128;
        }

        const sampleRate = audioCapture.getSampleRate();
        const frequency = this.autoCorrelate(float32Buffer, sampleRate);

        if (frequency === -1 || frequency < 50 || frequency > 2000) {
            return null;
        }

        return {
            frequency: frequency,
            note: this.frequencyToNote(frequency),
            cents: this.getCentsOffPitch(frequency)
        };
    }

    frequencyToNote(frequency) {
        const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
        const noteIndex = Math.round(noteNum) + 69;
        const octave = Math.floor(noteIndex / 12) - 1;
        const noteName = this.noteStrings[noteIndex % 12];
        
        return {
            name: noteName,
            octave: octave,
            fullName: noteName + octave
        };
    }

    getCentsOffPitch(frequency) {
        const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
        const nearestNote = Math.round(noteNum);
        const cents = Math.floor((noteNum - nearestNote) * 100);
        return cents;
    }

    isInTune(cents, threshold = 5) {
        return Math.abs(cents) < threshold;
    }

    getNoteFrequency(noteName, octave) {
        const noteIndex = this.noteStrings.indexOf(noteName);
        if (noteIndex === -1) return null;
        
        const noteNum = (octave + 1) * 12 + noteIndex;
        return 440 * Math.pow(2, (noteNum - 69) / 12);
    }
}


