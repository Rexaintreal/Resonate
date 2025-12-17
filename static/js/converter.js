export class AudioConverter {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    async convert(url, format) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            if (format === 'wav') {
                return this.encodeWAV(audioBuffer);
            } else if (format === 'mp3') {
                return this.encodeMP3(audioBuffer);
            }
            
            return null;
        } catch (error) {
            console.error('Conversion error:', error);
            throw error;
        }
    }

    encodeWAV(audioBuffer) {
        const numOfChan = audioBuffer.numberOfChannels;
        const length = audioBuffer.length * numOfChan * 2 + 44;
        const buffer = new ArrayBuffer(length);
        const view = new DataView(buffer);
        const channels = [];
        let i;
        let sample;
        let offset = 0;
        let pos = 0;

        // write WAVE header
        setUint32(0x46464952);
        setUint32(length - 8); 
        setUint32(0x45564157); 
        setUint32(0x20746d66); 
        setUint32(16); // length
        setUint16(1); 
        setUint16(numOfChan);
        setUint32(audioBuffer.sampleRate);
        setUint32(audioBuffer.sampleRate * 2 * numOfChan); // avg bytespersec
        setUint16(numOfChan * 2); // block align
        setUint16(16); // 16bit 

        setUint32(0x61746164); // datachunk
        setUint32(length - pos - 4); //chunk len
        for (i = 0; i < audioBuffer.numberOfChannels; i++)
            channels.push(audioBuffer.getChannelData(i));

        while (pos < audioBuffer.length) {
            for (i = 0; i < numOfChan; i++) {
                // interleave channels
                sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16bit signed int
                view.setInt16(44 + offset, sample, true); // write 16bit sample
                offset += 2;
            }
            pos++;
        }

        return new Blob([buffer], { type: 'audio/wav' });

        function setUint16(data) {
            view.setUint16(pos, data, true);
            pos += 2;
        }

        function setUint32(data) {
            view.setUint32(pos, data, true);
            pos += 4;
        }
    }

    encodeMP3(audioBuffer) {
        if (!window.lamejs) {
            throw new Error('LameJS library not loaded');
        }

        const channels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128); 
        const samples = audioBuffer.getChannelData(0); 
        const samplesRight = channels > 1 ? audioBuffer.getChannelData(1) : undefined;
        
        const sampleBlockSize = 1152;
        const mp3Data = [];
        
        const floatTo16BitPCM = (input, output) => {
            for (let i = 0; i < input.length; i++) {
                const s = Math.max(-1, Math.min(1, input[i]));
                output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
        };

        const leftData = new Int16Array(samples.length);
        floatTo16BitPCM(samples, leftData);
        
        let rightData;
        if (samplesRight) {
            rightData = new Int16Array(samplesRight.length);
            floatTo16BitPCM(samplesRight, rightData);
        }

        for (let i = 0; i < samples.length; i += sampleBlockSize) {
            const leftChunk = leftData.subarray(i, i + sampleBlockSize);
            let mp3buf;
            
            if (channels === 2) {
                const rightChunk = rightData.subarray(i, i + sampleBlockSize);
                mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
            } else {
                mp3buf = mp3encoder.encodeBuffer(leftChunk);
            }
            
            if (mp3buf.length > 0) {
                mp3Data.push(mp3buf);
            }
        }

        const mp3buf = mp3encoder.flush();
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }

        return new Blob(mp3Data, { type: 'audio/mp3' }); 
    } 
}


