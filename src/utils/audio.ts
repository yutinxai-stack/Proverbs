class AudioManager {
  private ctx: AudioContext | null = null;
  private bgm: HTMLAudioElement | null = null;
  public isMuted: boolean = false; // Default unmuted (enabled by default)

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    this.initContext();
    if (this.isMuted) {
      this.stopBGM();
    } else {
      this.startBGM();
      this.playCorrect(); // Play feedback audio upon unmuting
    }
    return this.isMuted;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    const now = this.ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.05); // Attack
    gainNode.gain.exponentialRampToValueAtTime(volume * 0.3, now + duration * 0.4); // Decay
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // Release

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  // Key click sound effect
  public playClick() {
    this.playTone(523.25, "sine", 0.08, 0.08); // C5
  }

  // Correct idiom sound effect (C major triad arp)
  public playCorrect() {
    const tones = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    tones.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, "triangle", 0.4, 0.08);
      }, idx * 100);
    });
  }

  // Error idiom sound effect (Descending dual tones)
  public playWrong() {
    this.playTone(196.00, "sawtooth", 0.15, 0.04); // G3
    setTimeout(() => {
      this.playTone(146.83, "sawtooth", 0.25, 0.04); // D3
    }, 120);
  }

  // Level cleared sound effect (Celebratory arpeggio)
  public playLevelClear() {
    const tones = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
    tones.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, "sine", 0.6, 0.08);
      }, idx * 80);
    });
  }

  // Loop play target BGM file
  public startBGM() {
    this.stopBGM();
    if (this.isMuted) return;

    if (!this.bgm) {
      const baseUrl = import.meta.env.BASE_URL || "/Proverbs/";
      this.bgm = new Audio(`${baseUrl}The_Way_the_River_Bends.mp3`);
      this.bgm.loop = true;
    }
    
    this.bgm.play().catch(err => {
      console.log("BGM play request blocked by browser autoplay policy:", err);
    });
  }

  public stopBGM() {
    if (this.bgm) {
      this.bgm.pause();
    }
  }
}

export const audioManager = new AudioManager();
