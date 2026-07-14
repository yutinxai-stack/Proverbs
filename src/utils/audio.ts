class AudioManager {
  private ctx: AudioContext | null = null;
  private bgm: HTMLAudioElement | null = null;
  public isMuted: boolean = false; // Default unmuted (enabled by default)

  // Playlist of MP3 files inside data folder
  private bgmPlaylist: string[] = [
    "Alex Productions - Christmas Countdown.mp3",
    "Glitch - West coast Rap Beat.mp3"
  ];
  private currentPlaylistIndex: number = 0;

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

    const baseUrl = import.meta.env.BASE_URL || "/Proverbs/";
    const fileName = this.bgmPlaylist[this.currentPlaylistIndex];
    const encodedFileName = encodeURIComponent(fileName);

    const paths = [
      `${baseUrl}data/${encodedFileName}`,
      `data/${encodedFileName}`,
      `${baseUrl}${encodedFileName}`,
      encodedFileName
    ];
    
    let currentPathIndex = 0;
    this.bgm = new Audio(paths[currentPathIndex]);
    this.bgm.loop = false; // Disable loop to allow playlist transition
    this.bgm.playbackRate = 0.5; // Play background music slower (0.5x) for relaxation
    this.bgm.volume = 0; // Initialize volume to 0 for fade-in

    // Set end listener to rotate to the next track automatically
    this.bgm.addEventListener("ended", () => {
      this.currentPlaylistIndex = (this.currentPlaylistIndex + 1) % this.bgmPlaylist.length;
      console.log(`BGM track ended. Next track index: ${this.currentPlaylistIndex}`);
      this.startBGM();
    });

    // Handle loading error and try fallbacks
    this.bgm.addEventListener("error", () => {
      currentPathIndex++;
      if (currentPathIndex < paths.length && this.bgm) {
        console.warn(`BGM path failed, trying fallback: ${paths[currentPathIndex]}`);
        this.bgm.src = paths[currentPathIndex];
        this.bgm.playbackRate = 0.5;
        if (!this.isMuted) {
          this.bgm.playbackRate = 0.5;
          this.bgm.play().then(() => this.fadeInBGM()).catch(e => console.log("Fallback BGM play failed:", e));
        }
      }
    });
    
    this.bgm.playbackRate = 0.5;
    this.bgm.play().then(() => {
      this.fadeInBGM();
    }).catch(err => {
      console.log("BGM play request blocked by browser autoplay policy:", err);
    });
  }

  // Smooth BGM volume fade-in transition to prevent shocking user
  private fadeInBGM() {
    if (!this.bgm || this.isMuted) return;
    this.bgm.volume = 0;
    const targetVolume = 0.5;
    const step = 0.02;
    const intervalTime = 100;

    const timer = setInterval(() => {
      if (!this.bgm || this.isMuted) {
        clearInterval(timer);
        return;
      }
      if (this.bgm.volume < targetVolume) {
        this.bgm.volume = Math.min(targetVolume, this.bgm.volume + step);
      } else {
        clearInterval(timer);
      }
    }, intervalTime);
  }

  public stopBGM() {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm.volume = 0;
      this.bgm = null;
    }
  }
}

export const audioManager = new AudioManager();
