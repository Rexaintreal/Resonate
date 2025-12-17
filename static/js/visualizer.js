import { AudioCapture } from './audio.js';
import { FFTProcessor } from './fft_processor.js';

export class Visualizer {
    constructor() {
        this.canvas = document.getElementById('visualizerCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.audioCapture = null;
        this.fftProcessor = null;
        this.isRunning = false;
        this.animationId = null;
        this.currentMode = 'bars';
        this.audioElement = null;
        this.audioContext = null;
        this.sourceNode = null;
        
        this.setupCanvas();
    }

    setupCanvas() {
        const resizeCanvas = () => {
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * window.devicePixelRatio;
            this.canvas.height = rect.height * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }


    async start() {
        this.audioCapture = new AudioCapture();
        await this.audioCapture.initialize();
        this.fftProcessor = new FFTProcessor(this.audioCapture);
        this.isRunning = true;
        this.animate();
    }

    async startWithAudio(audioElement) {
        this.audioElement = audioElement;
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.8;
        
        this.sourceNode = this.audioContext.createMediaElementSource(audioElement);
        this.sourceNode.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        
        this.audioCapture = {
            getFrequencyData: () => {
                this.analyser.getByteFrequencyData(this.dataArray);
                return this.dataArray;
            },
            getWaveformData: () => {
                this.analyser.getByteTimeDomainData(this.dataArray);
                return this.dataArray;
            },
            getVolume: () => {
                this.analyser.getByteFrequencyData(this.dataArray);
                let sum = 0;
                for (let i = 0; i < this.dataArray.length; i++) {
                    sum += this.dataArray[i];
                }
                const average = sum / this.dataArray.length;
                return Math.round((average / 255) * 100);
            },
            getSampleRate: () => this.audioContext.sampleRate,
            indexToFrequency: (index) => {
                const nyquist = this.audioContext.sampleRate / 2;
                return (index * nyquist) / this.bufferLength;
            },
            analyser: this.analyser
        };
        
        this.fftProcessor = new FFTProcessor(this.audioCapture);
        this.isRunning = true;
        this.animate();
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.audioCapture && this.audioCapture.stop) {
            this.audioCapture.stop();
        }
        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.audioElement = null;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    setMode(mode) {
        this.currentMode = mode;
    }


    animate() {
        if (!this.isRunning) return;

        const width = this.canvas.offsetWidth;
        const height = this.canvas.offsetHeight;
        
        this.ctx.clearRect(0, 0, width, height);

        switch(this.currentMode) {
            case 'bars':
                this.drawBars(width, height);
                break;
            case 'wave':
                this.drawWaveform(width, height);
                break;
            case 'circular':
                this.drawCircular(width, height);
                break;
            case 'line':
                this.drawLine(width, height);
                break;
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    getLogFrequencyData(barCount) {
        const frequencyData = this.audioCapture.getFrequencyData();
        if (!frequencyData) return new Array(barCount).fill(0);

        const sampleRate = this.audioCapture.getSampleRate();
        const nyquist = sampleRate / 2;
        const bars = [];
        
        const minFreq = 20;
        const maxFreq = 8000;
        
        const sensitivity = window.settingsManager ? 
            window.settingsManager.getSettings().sensitivity / 100 : 1;
        
        for (let i = 0; i < barCount; i++) {
            const logMin = Math.log10(minFreq);
            const logMax = Math.log10(maxFreq);
            const logRange = logMax - logMin;
            
            const freq1 = Math.pow(10, logMin + (i / barCount) * logRange);
            const freq2 = Math.pow(10, logMin + ((i + 1) / barCount) * logRange);
            
            const bin1 = Math.floor((freq1 / nyquist) * frequencyData.length);
            const bin2 = Math.floor((freq2 / nyquist) * frequencyData.length);
            
            let sum = 0;
            let count = 0;
            for (let j = bin1; j < bin2; j++) {
                if (j < frequencyData.length) {
                    sum += frequencyData[j];
                    count++;
                }
            }
            
            const average = count > 0 ? sum / count : 0;
            const normalized = (average / 255) * 100;
            
            const baseBoost = 0.8 + (i / barCount) * 0.4;
            const scaled = Math.pow(normalized / 100, 0.7) * 100 * baseBoost * sensitivity;
            
            bars.push(Math.min(100, scaled));
        }
        
        return bars;
    }

    drawBars(width, height) {
        const barCount = window.settingsManager ? window.settingsManager.getSettings().barCount : 64;
        const bars = this.getLogFrequencyData(barCount);
        const barWidth = width / bars.length;
        const gradient = this.ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#14B8A6');
        gradient.addColorStop(0.5, '#2DD4BF');
        gradient.addColorStop(1, '#5EEAD4');

        const maxHeight = height * 0.90;

        bars.forEach((bar, i) => {
            const normalizedBar = Math.min(bar, 100);
            const barHeight = (normalizedBar / 100) * maxHeight;
            const x = i * barWidth;
            const y = height - barHeight;

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, y, barWidth - 2, barHeight);
        });
    }


    drawWaveform(width, height) {
        const waveform = this.fftProcessor.getWaveform(512);
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#14B8A6';
        this.ctx.lineWidth = 2.5;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#14B8A6';

        const sliceWidth = width / waveform.length;
        let x = 0;

        waveform.forEach((value, i) => {
            const y = (value * 0.7 + 0.5) * height;
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            x += sliceWidth;
        });

        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }

    drawCircular(width, height) {
        const barCount = window.settingsManager ? Math.floor(window.settingsManager.getSettings().barCount * 1.5) : 100;
        const bars = this.getLogFrequencyData(barCount);
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) * 0.42;
        const minRadius = maxRadius * 0.25;

        this.ctx.strokeStyle = '#262626';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, minRadius, 0, Math.PI * 2);
        this.ctx.stroke();

        const angleStep = (Math.PI * 2) / bars.length;
        
        bars.forEach((bar, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const barHeight = (bar / 100) * (maxRadius - minRadius);
            
            const x1 = centerX + Math.cos(angle) * minRadius;
            const y1 = centerY + Math.sin(angle) * minRadius;
            const x2 = centerX + Math.cos(angle) * (minRadius + barHeight);
            const y2 = centerY + Math.sin(angle) * (minRadius + barHeight);

            const progress = i / bars.length;
            let hue;
            if (progress < 0.33) {
                hue = 174 + progress * 30;
            } else if (progress < 0.66) {
                hue = 184 + (progress - 0.33) * 20;
            } else {
                hue = 174 - (progress - 0.66) * 20;
            }
            
            this.ctx.strokeStyle = `hsl(${hue}, 65%, 55%)`;
            this.ctx.lineWidth = 2.5;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        });
        
        this.ctx.fillStyle = 'rgba(20, 184, 166, 0.05)';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, minRadius, 0, Math.PI * 2);
        this.ctx.fill();
    }


    drawLine(width, height) {
        const barCount = window.settingsManager ? 
            Math.floor(window.settingsManager.getSettings().barCount * 1.25) : 80;
        const bars = this.getLogFrequencyData(barCount);
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#14B8A6';
        this.ctx.lineWidth = 3;
        this.ctx.lineJoin = 'round';
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = '#14B8A6';

        const step = width / bars.length;
        const maxHeight = height * 0.90;

        bars.forEach((bar, i) => {
            const normalizedBar = Math.min(bar, 100);
            const x = i * step;
            const y = height - (normalizedBar / 100) * maxHeight;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });

        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(20, 184, 166, 0.3)');
        gradient.addColorStop(1, 'rgba(20, 184, 166, 0.05)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.lineTo(width, height);
        this.ctx.lineTo(0, height);
        this.ctx.closePath();
        this.ctx.fill();
    }

    getStats() {
        if (!this.fftProcessor) return null;

        return {
            volume: this.audioCapture.getVolume(),
            dominant: this.fftProcessor.getDominantFrequency(),
            ranges: this.fftProcessor.getFrequencyRanges()
        };
    }
}
