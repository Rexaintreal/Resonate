export class AudioCapture {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.bufferLen = 0;
        this.isActive = false;
    }

    async initialize() {
        try {
            //REQUEST Microphone
            // no noise supression for better fft results
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,  //raw audio
                    autoGainControl: false    //no automatic volume adjustment
                } 
            });

            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;  //DEFAULT (change in settings)
            this.analyser.smoothingTimeConstant = 0.8; //smothing
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.microphone.connect(this.analyser);
            
            this.bufferLen = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLen);
            this.isActive = true;
            
            return true;
        } catch (error) {
            console.error('Error accessing microphone:', error);
            if (error.name === 'NotAllowedError') {
                throw new Error('Microphone access denied');
            } else if (error.name === 'NotFoundError') {
                throw new Error('No microphone found');
            } else {
                throw new Error('Failed to access microphone: ' + error.message);
            }
        }
    }

    getFrequencyData() {
        if (!this.isActive || !this.analyser) {
            return null;
        }
        //data array update
        this.analyser.getByteFrequencyData(this.dataArray);
        return this.dataArray;
    }

    getWaveformData() {
        if (!this.isActive || !this.analyser) {
            return null;
        }
        this.analyser.getByteTimeDomainData(this.dataArray); //domain data
        return this.dataArray;
    }

    getVolume() {
        const data = this.getFrequencyData();
        if (!data) return 0;
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data[i];
        }
        const average = sum / data.length;        
        return Math.round((average / 255) * 100);
    }

    stop() {
        if (this.microphone && this.microphone.mediaStream) {
            this.microphone.mediaStream.getTracks().forEach(track => track.stop());
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.isActive = false;
    }

    isReady() {
        return this.isActive;
    }

    getFrequencyAtIndex(index) {
        const data = this.getFrequencyData();
        if (!data || index >= data.length) return 0;
        return data[index];
    }

    getSampleRate() {
        // depends on hardware and browser
        return this.audioContext ? this.audioContext.sampleRate : 0;
    }

    indexToFrequency(index) {
        // fft to hz
        const nyquist = this.getSampleRate() / 2; 
        return (index * nyquist) / this.bufferLen;
    }
}

