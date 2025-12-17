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
        window.addEventListener('resize',  resizeCanvas);
    }

    async start() {
        this.audioCapture = new AudioCapture();
        await this.audioCapture.initialize(); 
        this.fftProcessor = new FFTProcessor(this.audioCapture);
        this.isRunning = true;
        this.animate();
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.audioCapture) {
            this.audioCapture.stop();
        }
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
     
    drawBars(width, height) {
        const bars = this.fftProcessor.getFrequencyBars(64);
        const barWidth = width / bars.length;
        const gradient = this.ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#14B8A6');
        gradient.addColorStop(1, '#2DD4BF');

        bars.forEach((bar, i) => {
            const barHeight = (bar / 100) * height * 0.8;
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
        this.ctx.lineWidth = 2;

        const sliceWidth = width / waveform.length;  
        let x = 0;
 
        waveform.forEach((value, i) => {
            const y = (value * 0.5 + 0.5) * height;
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            x += sliceWidth;
        });

        this.ctx.stroke();
    }

    drawCircular(width, height) {
        const bars = this.fftProcessor.getFrequencyBars(128);
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) * 0.4;
        const minRadius = maxRadius * 0.3;

        this.ctx.strokeStyle = '#262626';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, minRadius, 0, Math.PI * 2);
        this.ctx.stroke();

        bars.forEach((bar, i) => {
            const angle = (i / bars.length) * Math.PI * 2 - Math.PI / 2;
            const barHeight = (bar / 100) * (maxRadius - minRadius);
            
            const x1 = centerX + Math.cos(angle) * minRadius;
            const y1 = centerY + Math.sin(angle) * minRadius;
            const x2 = centerX + Math.cos(angle) * (minRadius + barHeight);
            const y2 = centerY + Math.sin(angle) * (minRadius + barHeight);

            const hue = (i / bars.length) * 60 + 170;
            this.ctx.strokeStyle = `hsl(${hue}, 70%, 60%)`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        });
    }

    drawLine(width, height) {
        const bars = this.fftProcessor.getFrequencyBars(64);
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#14B8A6';
        this.ctx.lineWidth = 3;
        this.ctx.lineJoin = 'round';

        const step = width / bars.length;

        bars.forEach((bar, i) => {
            const x = i * step;
            const y = height - (bar / 100) * height * 0.8;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });

        this.ctx.stroke();
        
        this.ctx.fillStyle = 'rgba(20, 184, 166, 0.1)';
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
