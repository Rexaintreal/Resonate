export class Settings {
    constructor() {
        this.currentSettings = {
            fftSize: 2048,
            smoothing: 0.8,
            sensitivity: 100,
            barCount: 64
        };
        
        this.init();
    }

    init() {
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsPanel = document.getElementById('settingsPanel');
        const closeSettings = document.getElementById('closeSettings');
        const fftSizeSelect = document.getElementById('fftSize');
        const smoothingSlider = document.getElementById('smoothing');
        const sensitivitySlider = document.getElementById('sensitivity');
        const barCountSlider = document.getElementById('barCount');
        const resetSettingsBtn = document.getElementById('resetSettings');

        settingsBtn?.addEventListener('click', () => {
            settingsPanel.classList.toggle('open');
        });

        closeSettings?.addEventListener('click', () => {
            settingsPanel.classList.remove('open');
        });

        smoothingSlider?.addEventListener('input', (e) => {
            document.getElementById('smoothingValue').textContent = e.target.value;
            this.currentSettings.smoothing = parseFloat(e.target.value);
        });

        sensitivitySlider?.addEventListener('input', (e) => {
            document.getElementById('sensitivityValue').textContent = e.target.value + '%';
            this.currentSettings.sensitivity = parseInt(e.target.value);
        });

        barCountSlider?.addEventListener('input', (e) => {
            document.getElementById('barCountValue').textContent = e.target.value;
            this.currentSettings.barCount = parseInt(e.target.value);
        });

        fftSizeSelect?.addEventListener('change', (e) => {
            this.currentSettings.fftSize = parseInt(e.target.value);
        });

        resetSettingsBtn?.addEventListener('click', () => {
            this.resetToDefaults();
        });
    }

    resetToDefaults() {
        this.currentSettings = {
            fftSize: 2048,
            smoothing: 0.8,
            sensitivity: 100,
            barCount: 64
        };
        
        const fftSizeSelect = document.getElementById('fftSize');
        const smoothingSlider = document.getElementById('smoothing');
        const sensitivitySlider = document.getElementById('sensitivity');
        const barCountSlider = document.getElementById('barCount');
        
        if(fftSizeSelect) fftSizeSelect.value = '2048';
        if(smoothingSlider) smoothingSlider.value = '0.8';
        if(sensitivitySlider) sensitivitySlider.value = '100';
        if(barCountSlider) barCountSlider.value = '64';
        
        document.getElementById('smoothingValue').textContent = '0.8';
        document.getElementById('sensitivityValue').textContent = '100%';
        document.getElementById('barCountValue').textContent = '64';
    }

    getSettings() {
        return this.currentSettings;
    }
}