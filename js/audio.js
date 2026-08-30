// High Reliability Audio Manager
class AudioController {
    constructor() {
        this.audio = document.getElementById('bgm-audio') || new Audio('assets/audio/bgm.mp3');
        this.audio.loop = true;
        this.audio.volume = 1.0; // 100% volume
        this.audio.muted = false;
        this.audio.autoplay = true;

        this.isPlaying = false;
        this.bassEnergy = 0.0;
        this.reactivePulse = true;
        this.ctx = null;
        this.analyser = null;

        this.init();
    }

    init() {
        this.audio.loop = true;
        this.audio.volume = 1.0;

        // Restart loop if ended
        this.audio.addEventListener('ended', () => {
            this.audio.currentTime = 0;
            this.audio.play().catch(() => {});
        });

        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
        });

        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            // Immediate retry to keep music playing
            if (!this.manuallyPaused) {
                setTimeout(() => this.audio.play().catch(() => {}), 100);
            }
        });

        // Trigger play immediately
        this.play();

        // Any interaction unblocks browser sound
        const unblock = () => {
            if (this.audio.paused || !this.isPlaying) {
                this.play();
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
        };

        ['click', 'pointerdown', 'mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'wheel'].forEach(evt => {
            window.addEventListener(evt, unblock, { passive: true });
        });
    }

    play() {
        this.manuallyPaused = false;
        this.audio.muted = false;
        this.audio.volume = 1.0;

        const playPromise = this.audio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                this.isPlaying = true;
                this.tryInitAnalyser();
            }).catch(() => {
                this.isPlaying = false;
            });
        }
        return playPromise;
    }

    pause() {
        this.manuallyPaused = true;
        this.audio.pause();
        this.isPlaying = false;
    }

    tryInitAnalyser() {
        if (this.analyser) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            this.ctx = new AudioContext();
            if (this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }

            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 256;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

            const source = this.ctx.createMediaElementSource(this.audio);
            source.connect(this.analyser);
            this.analyser.connect(this.ctx.destination);
        } catch (e) {
            // If Web Audio routing fails, normal audio tag still plays to speakers cleanly!
        }
    }

    update() {
        if (!this.analyser || !this.isPlaying || !this.dataArray) {
            return 0.0;
        }

        try {
            this.analyser.getByteFrequencyData(this.dataArray);
            let sum = 0;
            for (let i = 1; i <= 8; i++) {
                sum += this.dataArray[i];
            }
            const currentBass = (sum / 8) / 255;
            this.bassEnergy = this.bassEnergy * 0.7 + currentBass * 0.3;
            return this.reactivePulse ? this.bassEnergy : 0.0;
        } catch (e) {
            return 0.0;
        }
    }
}

window.AudioController = AudioController;
