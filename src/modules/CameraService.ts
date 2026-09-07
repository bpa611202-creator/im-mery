import { stateManager } from './StateManager';

export type CameraFacing = 'user' | 'environment';
export type CameraPermissionStatus = 'prompt' | 'granted' | 'denied' | 'unsupported';

export class CameraService {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private isActive: boolean = false;
  private facingMode: CameraFacing = 'environment';
  private permissionStatus: CameraPermissionStatus = 'prompt';
  private listeners: Set<(isActive: boolean) => void> = new Set();
  private frameListeners: Set<(base64: string) => void> = new Set();
  private streamInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined' && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
      this.permissionStatus = 'unsupported';
    }
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined' && !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
  }

  isCameraActive(): boolean {
    return this.isActive;
  }

  getFacingMode(): CameraFacing {
    return this.facingMode;
  }

  getPermissionStatus(): CameraPermissionStatus {
    return this.permissionStatus;
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  switchCamera(): Promise<{ success: boolean; error?: string }> {
    return this.toggleFacingMode();
  }

  subscribe(listener: (isActive: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onFrame(listener: (base64: string) => void): () => void {
    this.frameListeners.add(listener);
    return () => this.frameListeners.delete(listener);
  }

  async startCamera(facing: CameraFacing = 'environment'): Promise<{ success: boolean; error?: string }> {
    if (!this.isAvailable()) {
      this.permissionStatus = 'unsupported';
      return { success: false, error: 'Camera API is not supported on this browser or device.' };
    }

    // If already active with the same facing mode, return immediately
    if (this.isActive && this.stream && this.facingMode === facing) {
      return { success: true };
    }

    // Stop current stream if switching facing mode
    if (this.stream) {
      this.stopCamera();
    }

    try {
      this.facingMode = facing;
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream = mediaStream;
      this.permissionStatus = 'granted';

      // Attach to hidden or attached video element
      if (!this.videoElement) {
        this.videoElement = document.createElement('video');
        this.videoElement.autoplay = true;
        this.videoElement.playsInline = true;
        this.videoElement.muted = true;
      }
      this.videoElement.srcObject = mediaStream;
      await this.videoElement.play().catch(() => {});

      this.isActive = true;
      this.notifyListeners();
      stateManager.notify(`Camera active (${facing === 'user' ? 'Front' : 'Rear'})`, 'success');

      // Setup continuous interval to capture frames for live analysis if needed (1 fps)
      this.startFrameCaptureLoop();

      return { success: true };
    } catch (err: any) {
      console.warn('[CameraService] Permission or access error:', err);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        this.permissionStatus = 'denied';
        stateManager.notify('Camera permission was denied.', 'warning');
        return { success: false, error: 'Camera permission denied by user.' };
      }
      return { success: false, error: err?.message || 'Failed to start camera.' };
    }
  }

  stopCamera() {
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
      this.streamInterval = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    if (this.isActive) {
      this.isActive = false;
      this.notifyListeners();
      stateManager.notify('Camera turned off', 'info');
    }
  }

  toggleFacingMode(): Promise<{ success: boolean; error?: string }> {
    const nextFacing: CameraFacing = this.facingMode === 'user' ? 'environment' : 'user';
    return this.startCamera(nextFacing);
  }

  captureSingleFrame(quality: number = 0.85): string | null {
    if (!this.videoElement || !this.isActive || this.videoElement.readyState < 2) {
      return null;
    }

    const video = this.videoElement;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    if (!this.canvasElement) {
      this.canvasElement = document.createElement('canvas');
    }
    this.canvasElement.width = width;
    this.canvasElement.height = height;

    const ctx = this.canvasElement.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, width, height);
    return this.canvasElement.toDataURL('image/jpeg', quality);
  }

  private startFrameCaptureLoop() {
    if (this.streamInterval) clearInterval(this.streamInterval);
    this.streamInterval = setInterval(() => {
      if (this.isActive && this.frameListeners.size > 0) {
        const frame = this.captureSingleFrame(0.7);
        if (frame) {
          this.frameListeners.forEach((fn) => fn(frame));
        }
      }
    }, 1000);
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => fn(this.isActive));
  }
}

export const cameraService = new CameraService();
