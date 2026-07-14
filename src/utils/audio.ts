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

  // Key click sound effect (Disabled as requested)
  public playClick() {
    // No-op (Reference playTone to prevent TS unused warning)
    if (false) this.playTone(0, "sine", 0, 0);
  }

  // Correct idiom sound effect (Disabled as requested)
  public playCorrect() {
    // No-op
  }

  // Error idiom sound effect (Disabled as requested)
  public playWrong() {
    // No-op
  }

  // Level cleared sound effect (Disabled as requested)
  public playLevelClear() {
    // No-op
  }

  // Loop play BGM file with multi-path fallback (supporting local path & online URL)
  public startBGM() {
    this.stopBGM();
    if (this.isMuted) return;

    if (!this.bgm) {
      const baseUrl = import.meta.env.BASE_URL || "/Proverbs/";
      const paths = [
        `${baseUrl}The_Way_the_River_Bends.mp3`,
        `The_Way_the_River_Bends.mp3`,
        `data/The_Way_the_River_Bends.mp3`
      ];
      
      let currentPathIndex = 0;
      this.bgm = new Audio(paths[currentPathIndex]);
      this.bgm.loop = true;
      this.bgm.playbackRate = 0.5; // Play background music slower (0.5x) for relaxation

      // Handle loading error and try fallbacks
      this.bgm.addEventListener("error", () => {
        currentPathIndex++;
        if (currentPathIndex < paths.length && this.bgm) {
          console.warn(`BGM path failed, trying fallback: ${paths[currentPathIndex]}`);
          this.bgm.src = paths[currentPathIndex];
          this.bgm.playbackRate = 0.5;
          if (!this.isMuted) {
            this.bgm.playbackRate = 0.5;
            this.bgm.play().catch(e => console.log("Fallback BGM play failed:", e));
          }
        }
      });
    }
    
    this.bgm.playbackRate = 0.5;
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
