export class ChordDetector {
    constructor() {
        this.noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        
        //chord templates
        this.chordTemplates = {
            'Major': [0, 4, 7],
            'Minor': [0, 3, 7],
            'Diminished': [0, 3, 6],
            'Augmented': [0, 4, 8],
            'Sus2': [0, 2, 7],
            'Sus4': [0, 5, 7],
            'Major 7': [0, 4, 7, 11],
            'Dominant 7': [0, 4, 7, 10],
            'Minor 7': [0, 3, 7, 10],
            'Minor Major 7': [0, 3, 7, 11],
            'Diminished 7': [0, 3, 6, 9],
            'Half Diminished': [0, 3, 6, 10],
            'Augmented 7': [0, 4, 8, 10],
            'Major 6': [0, 4, 7, 9],
            'Minor 6': [0, 3, 7, 9],
            'Major 9': [0, 4, 7, 11, 14],
            'Dominant 9': [0, 4, 7, 10, 14],
            'Add 9': [0, 4, 7, 14]
        };
    }

    frequencyToNote(frequency) {
        const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
        const noteIndex = Math.round(noteNum) + 69;
        const octave = Math.floor(noteIndex / 12) - 1;
        const noteName = this.noteNames[noteIndex % 12];
        
        return {
            name: noteName,
            octave: octave,
            midiNote: noteIndex,
            frequency: frequency
        };
    }

     
     
    detectNotes(audioCapture, threshold = 10) {
        const frequencyData = audioCapture.getFrequencyData();
        if (!frequencyData) return [];

        const sampleRate = audioCapture.getSampleRate();
        const nyquist = sampleRate / 2;
        const binCount = frequencyData.length;
        
        const detectedNotes = [];
        const minFreq = 80;   
        const maxFreq = 1200; 
        for (let i = 1; i < binCount - 1; i++) {
            const freq = (i * nyquist) / binCount;
            
            if (freq < minFreq || freq > maxFreq) continue;
            
            const amplitude = frequencyData[i];
            const prevAmp = frequencyData[i - 1];
            const nextAmp = frequencyData[i + 1];
            
            if (amplitude > threshold && 
                amplitude > prevAmp && 
                amplitude > nextAmp) {
                
                const note = this.frequencyToNote(freq);
                
                const existingNote = detectedNotes.find(n => 
                    n.name === note.name && Math.abs(n.octave - note.octave) <= 1
                );
                
                if (!existingNote || amplitude > existingNote.amplitude) {
                    if (existingNote) {
                        detectedNotes.splice(detectedNotes.indexOf(existingNote), 1);
                    }
                    detectedNotes.push({
                        ...note,
                        amplitude: amplitude
                    });
                }
            }
        }
        return detectedNotes.sort((a, b) => b.amplitude - a.amplitude).slice(0, 6);
    }

    detectChord(audioCapture) {
        const notes = this.detectNotes(audioCapture, 15);
        
        if (notes.length < 2) {
            return null;
        }
        const uniqueNotes = [...new Set(notes.map(n => n.name))];
        
        if (uniqueNotes.length < 2) {
            return null;
        }
        
        const rootNote = uniqueNotes[0];
        const rootIndex = this.noteNames.indexOf(rootNote);
        
        const intervals = uniqueNotes.map(noteName => {
            const noteIndex = this.noteNames.indexOf(noteName);
            return (noteIndex - rootIndex + 12) % 12;
        }).sort((a, b) => a - b);
        
        let bestMatch = null;
        let bestScore = 0;
        
        for (const [chordType, template] of Object.entries(this.chordTemplates)) {
            const score = this.matchChordTemplate(intervals, template);
            
            if (score > bestScore && score >= 0.7) {
                bestScore = score;
                bestMatch = {
                    root: rootNote,
                    type: chordType,
                    notes: uniqueNotes,
                    intervals: intervals,
                    confidence: Math.round(score * 100)
                };
            }
        }
        

        if (!bestMatch) {
            if (intervals.length === 2 && intervals.includes(7)) {
                bestMatch = {
                    root: rootNote,
                    type: 'Power Chord',
                    notes: uniqueNotes,
                    intervals: intervals,
                    confidence: 80
                };
            } else {
                bestMatch = {
                    root: rootNote,
                    type: 'Unknown',
                    notes: uniqueNotes,
                    intervals: intervals,
                    confidence: 50
                };
            }
        }
        
        return bestMatch;
    }

    matchChordTemplate(intervals, template) {
        if (intervals.length < template.length) return 0;
        
        let matches = 0;
        for (const templateInterval of template) {
            if (intervals.includes(templateInterval)) {
                matches++;
            }
        }
        
        const extraNotes = intervals.length - template.length;
        const score = (matches / template.length) - (extraNotes * 0.1);
        
        return Math.max(0, Math.min(1, score));
    }

    getChordSymbol(chord) {
        if (!chord) return '--';
        
        const symbols = {
            'Major': '',
            'Minor': 'm',
            'Diminished': 'dim',
            'Augmented': 'aug',
            'Sus2': 'sus2',
            'Sus4': 'sus4',
            'Major 7': 'maj7',
            'Dominant 7': '7',
            'Minor 7': 'm7',
            'Minor Major 7': 'm(maj7)',
            'Diminished 7': 'dim7',
            'Half Diminished': 'm7♭5',
            'Augmented 7': 'aug7',
            'Major 6': '6',
            'Minor 6': 'm6',
            'Major 9': 'maj9',
            'Dominant 9': '9',
            'Add 9': 'add9',
            'Power Chord': '5',
            'Unknown': '?'
        };

        return chord.root + (symbols[chord.type] || '');
    }

    getChordFullName(chord) {
        if (!chord) return 'No chord detected';
        return `${chord.root} ${chord.type}`;  
    }
} 


