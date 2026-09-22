import { ScreenShareSettings, ScreenResolution } from '../types';
import { logger } from '../utils/logger';
import { stateManager } from './StateManager';

const STORAGE_KEY = 'mery_screen_share_settings';

const DEFAULT_SETTINGS: ScreenShareSettings = {
  enabled: true,
  resolution: '720p',
  frameRate: 1, // 1 frame per second for optimal Live API responsiveness & bandwidth
  jpegQuality: 0.7,
  autoShareOnLiveStart: false,
  sendAudioWithScreen: false,
};

export class ScreenShareService {
  private settings: ScreenShareSettings = { ...DEFAULT_SETTINGS };
  private stream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;
  private captureIntervalId: any = null;
  private listeners: Set<() => void> = new Set();
  private frameListeners: Set<(base64: string) => void> = new Set();
  private allowModalHandler: ((reason?: string) => void) | null = null;
  private latestSnapshot: string | null = null;
  private framesSentCount: number = 0;
  private lastError: string | null = null;
  private activeResolution: string = '0x0';

  constructor() {
    this.loadSettings();
    this.checkAutoShareParam();
  }

  private checkAutoShareParam() {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('autoshare') === '1' || urlParams.get('screen') === '1') {
          // Clean param from address bar without reloading
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
          setTimeout(() => {
            if (this.isSupported()) {
              this.startScreenShare();
            } else {
              this.requestAllowModal('Display capture restricted in preview mode. You can paste a screenshot (Ctrl+V) or launch a standalone tab.');
            }
          }, 800);
        }
      }
    } catch {}
  }

  public isInIframe(): boolean {
    try {
      return typeof window !== 'undefined' && window.self !== window.top;
    } catch {
      return true;
    }
  }

  public setAllowModalHandler(handler: (reason?: string) => void) {
    this.allowModalHandler = handler;
  }

  public requestAllowModal(reason?: string) {
    if (this.allowModalHandler) {
      this.allowModalHandler(reason);
    }
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  public saveSettings(newSettings: Partial<ScreenShareSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {}

    logger.log('INFO', 'system', 'Updated screen sharing settings', { settings: this.settings });
    this.notify();

    // If active and frame rate or resolution changed, update capture interval
    if (this.isSharing() && (newSettings.frameRate !== undefined || newSettings.jpegQuality !== undefined)) {
      this.restartCaptureLoop();
    }
  }

  public getSettings(): ScreenShareSettings {
    return { ...this.settings };
  }

  public isSharing(): boolean {
    return this.stream !== null && this.stream.active && this.stream.getVideoTracks().some(t => t.readyState === 'live');
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    return Boolean(
      (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') ||
      typeof (navigator as any).getDisplayMedia === 'function' ||
      typeof (navigator as any).webkitGetDisplayMedia === 'function'
    );
  }

  // Chrome for Android and Firefox for Android define getDisplayMedia() but never
  // actually implement it — calling it always rejects with NotAllowedError, on
  // every site, regardless of what the user does. Same for Safari/Chrome on iOS
  // (screen capture isn't exposed to web pages there at all). This is a mobile
  // browser platform limitation, not something any app's code can work around,
  // so we detect it up front and skip straight to an accurate message instead of
  // attempting the call and showing a misleading "you dismissed it, try again".
  public isMobilePlatform(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  }

  public hasVisualContext(): boolean {
    return this.isSharing() || Boolean(this.latestSnapshot);
  }

  public async pasteFromClipboard(): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.replace(/^data:image\/[a-z]+;base64,/, '');
                this.uploadStaticImage(base64);
                stateManager.notify('📸 Screenshot pasted from clipboard and shared with MERY', 'success');
                resolve(true);
              };
              reader.onerror = () => resolve(false);
              reader.readAsDataURL(blob);
            });
          }
        }
      }
    } catch (err) {
      console.warn('[ScreenShareService] Clipboard read error:', err);
    }
    return false;
  }

  public getStats() {
    return {
      isSupported: this.isSupported(),
      isSharing: this.isSharing(),
      hasVisualContext: this.hasVisualContext(),
      framesSent: this.framesSentCount,
      frameRate: this.settings.frameRate,
      resolution: this.settings.resolution,
      activeResolution: this.activeResolution,
      lastError: this.lastError,
      hasSnapshot: Boolean(this.latestSnapshot),
    };
  }

  public getLatestSnapshot(): string | null {
    return this.latestSnapshot;
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public onFrame(fn: (base64: string) => void): () => void {
    this.frameListeners.add(fn);
    return () => this.frameListeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error('[ScreenShareService] Listener error:', e);
      }
    });
  }

  private getDimensions(res: ScreenResolution): { width: number; height: number } {
    switch (res) {
      case '480p':
        return { width: 854, height: 480 };
      case '1080p':
        return { width: 1920, height: 1080 };
      case '720p':
      default:
        return { width: 1280, height: 720 };
    }
  }

  public async startScreenShare(): Promise<boolean> {
    this.lastError = null;

    if (this.isMobilePlatform()) {
      this.lastError =
        "Screen/display sharing isn't available in mobile browsers (Chrome on Android and Safari on iOS don't support it — it's a phone browser limitation). You can take a screenshot on your phone and upload it, paste it, or use camera vision.";
      logger.log('INFO', 'system', 'Screen capture attempted on mobile platform; falling back to modal.');
      this.notify();
      this.requestAllowModal(this.lastError);
      return false;
    }

    const getDisplayMediaFn =
      (navigator?.mediaDevices?.getDisplayMedia && navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices)) ||
      ((navigator as any)?.getDisplayMedia && (navigator as any).getDisplayMedia.bind(navigator)) ||
      ((navigator as any)?.webkitGetDisplayMedia && (navigator as any).webkitGetDisplayMedia.bind(navigator));

    if (!getDisplayMediaFn) {
      this.lastError = 'Direct display stream is restricted in this browser context. You can paste a screenshot (Ctrl+V), upload an image, or use camera vision.';
      logger.log('INFO', 'system', 'Screen capture API not natively present; opening vision fallback modal.');
      this.notify();
      this.requestAllowModal(this.lastError);
      return false;
    }

    try {
      const dim = this.getDimensions(this.settings.resolution);

      const displayMediaOptions: DisplayMediaStreamOptions = {
        video: {
          displaySurface: 'monitor',
          width: { ideal: dim.width, max: 1920 },
          height: { ideal: dim.height, max: 1080 },
          frameRate: { ideal: Math.max(5, this.settings.frameRate * 2), max: 15 },
        },
        audio: this.settings.sendAudioWithScreen,
      };

      const mediaStream = await getDisplayMediaFn(displayMediaOptions);

      this.stream = mediaStream;
      const videoTrack = mediaStream.getVideoTracks()[0];

      if (!videoTrack) {
        throw new Error('No video track returned from display capture.');
      }

      // Handle user stopping screen share via native browser UI bar
      videoTrack.onended = () => {
        logger.log('INFO', 'system', 'User stopped screen share via native browser controls');
        this.stopScreenShare();
      };

      // Set up hidden HTMLVideoElement to read frames
      if (!this.videoEl) {
        this.videoEl = document.createElement('video');
        this.videoEl.autoplay = true;
        this.videoEl.muted = true;
        this.videoEl.playsInline = true;
      }
      this.videoEl.srcObject = mediaStream;
      await this.videoEl.play().catch(() => {});

      // Set up offscreen canvas
      if (!this.canvasEl) {
        this.canvasEl = document.createElement('canvas');
      }

      const settings = videoTrack.getSettings();
      this.activeResolution = `${settings.width || dim.width}x${settings.height || dim.height}`;
      this.framesSentCount = 0;

      logger.log('INFO', 'system', `Screen share started (${this.activeResolution} @ ${this.settings.frameRate} FPS)`);
      stateManager.notify(`Screen vision active (${this.activeResolution})`, 'success');

      // Start capture loop
      this.restartCaptureLoop();
      this.notify();
      return true;
    } catch (err: any) {
      const errName = err?.name || '';
      const errMsg = err?.message || String(err);

      if (errName === 'NotAllowedError' || errMsg.includes('Permission denied') || errMsg.includes('permission')) {
        this.lastError = 'Screen capture was dismissed. You can paste a screenshot (Ctrl+V) or try again.';
        logger.log('INFO', 'system', 'Screen capture permission dismissed by user');
        stateManager.notify('Screen sharing cancelled', 'info');
      } else if (
        errMsg.includes('iframe') ||
        errName === 'SecurityError' ||
        errMsg.includes('display-capture') ||
        errMsg.includes('policy')
      ) {
        this.lastError = 'Preview iframe restricted display capture. Open MERY in a standalone tab or paste a screenshot (Ctrl+V).';
        logger.log('INFO', 'system', this.lastError);
        stateManager.notify('Preview iframe restricted display capture: open in standalone tab or paste screenshot', 'info');
      } else {
        this.lastError = `Screen share info: ${errMsg}`;
        logger.log('INFO', 'system', this.lastError);
        stateManager.notify(this.lastError, 'info');
      }

      this.stopScreenShare();
      // Prompt user with the Allow Screen Guide modal
      this.requestAllowModal(this.lastError);
      return false;
    }
  }

  public async setExternalStream(mediaStream: MediaStream): Promise<boolean> {
    this.stopScreenShare();
    this.stream = mediaStream;
    const videoTrack = mediaStream.getVideoTracks()[0];
    if (!videoTrack) return false;

    videoTrack.onended = () => {
      this.stopScreenShare();
    };

    if (!this.videoEl) {
      this.videoEl = document.createElement('video');
      this.videoEl.autoplay = true;
      this.videoEl.muted = true;
      this.videoEl.playsInline = true;
    }
    this.videoEl.srcObject = mediaStream;
    await this.videoEl.play().catch(() => {});

    if (!this.canvasEl) {
      this.canvasEl = document.createElement('canvas');
    }

    const settings = videoTrack.getSettings();
    this.activeResolution = `${settings.width || 1280}x${settings.height || 720}`;
    this.framesSentCount = 0;
    this.restartCaptureLoop();
    this.notify();
    return true;
  }

  public uploadStaticImage(base64Data: string) {
    this.latestSnapshot = base64Data;
    this.framesSentCount++;
    this.notify();

    // Broadcast frame to LiveSession subscribers immediately
    this.frameListeners.forEach((listener) => {
      try {
        listener(base64Data);
      } catch (e) {
        console.warn('[ScreenShareService] Frame listener error:', e);
      }
    });
  }

  public stopScreenShare() {
    if (this.captureIntervalId) {
      clearInterval(this.captureIntervalId);
      this.captureIntervalId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      this.stream = null;
    }

    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }

    this.latestSnapshot = null;
    this.activeResolution = '0x0';
    this.notify();
  }

  public clearVisualContext() {
    this.stopScreenShare();
    this.latestSnapshot = null;
    this.notify();
  }

  public toggleScreenShare(): Promise<boolean> {
    if (this.isSharing()) {
      this.stopScreenShare();
      stateManager.notify('Screen sharing stopped', 'info');
      return Promise.resolve(false);
    } else {
      return this.startScreenShare();
    }
  }

  private restartCaptureLoop() {
    if (this.captureIntervalId) {
      clearInterval(this.captureIntervalId);
      this.captureIntervalId = null;
    }

    if (!this.isSharing()) return;

    // Capture first frame immediately
    this.captureSingleFrame();

    const intervalMs = Math.max(500, Math.round(1000 / this.settings.frameRate));
    this.captureIntervalId = setInterval(() => {
      this.captureSingleFrame();
    }, intervalMs);
  }

  public captureSingleFrame(): string | null {
    if (!this.isSharing() || !this.videoEl || !this.canvasEl) {
      return this.latestSnapshot;
    }

    const video = this.videoEl;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return this.latestSnapshot;
    }

    const targetDim = this.getDimensions(this.settings.resolution);

    // Compute scaled dimensions maintaining aspect ratio
    let width = video.videoWidth;
    let height = video.videoHeight;
    const maxW = targetDim.width;
    const maxH = targetDim.height;

    if (width > maxW || height > maxH) {
      const ratio = Math.min(maxW / width, maxH / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    this.canvasEl.width = width;
    this.canvasEl.height = height;

    const ctx = this.canvasEl.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, width, height);

    // Extract JPEG data URL
    const dataUrl = this.canvasEl.toDataURL('image/jpeg', this.settings.jpegQuality);
    const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');

    this.latestSnapshot = base64Data;
    this.framesSentCount++;

    // Broadcast frame to LiveSession and any other subscribers
    this.frameListeners.forEach((listener) => {
      try {
        listener(base64Data);
      } catch (e) {
        console.warn('[ScreenShareService] Frame listener error:', e);
      }
    });

    return base64Data;
  }
}

export const screenShareService = new ScreenShareService();
