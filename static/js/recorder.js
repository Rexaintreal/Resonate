export class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.stream = null;
        this.recordingStartTime = null;
    }

    async initialize() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });
            return true;
        } catch (error) {
            console.error('Failed to initialize recorder:', error);
            throw new Error('Microphone access denied for recording');
        }
    }

    startRecording() {
        if (!this.stream) {
            return false;
        }
        
        if (this.isRecording) {
            return false;
        }

        this.audioChunks = [];
        
        try {
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
        } catch(e) {
            console.error('MediaRecorder error:', e);
            return false;
        }

        this.mediaRecorder.addEventListener('dataavailable', (e) => {
            if (e.data.size > 0) {
                this.audioChunks.push(e.data);
            }
        });

        this.mediaRecorder.start();
        this.isRecording = true;
        this.recordingStartTime = Date.now();
        return true;
    }

    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            return null;
        }

        return new Promise((resolve) => {
            this.mediaRecorder.addEventListener('stop', () => {
                const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.isRecording = false;
                resolve(blob);
            }, { once: true });

            this.mediaRecorder.stop();
        });
    }

    getRecordingDuration() {
        if (!this.isRecording || !this.recordingStartTime) return 0;
        return Math.floor((Date.now() - this.recordingStartTime) / 1000);
    }

    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
        }
        
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
    }
}