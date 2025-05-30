// Enhanced video recorder with better quality options
class VideoRecorder {
  constructor(engine, scene, canvas) {
    this.engine = engine;
    this.scene = scene;
    this.canvas = canvas;
    this.mediaRecorder = null;
    this.chunks = [];
    this.isRecording = false;
  }

  // Get optimal codec support
  getSupportedCodec() {
    // Note: Most browsers don't support MP4 recording directly
    // WebM with H264 codec is the closest we can get
    const codecs = [
      'video/mp4;codecs=h264', // Try MP4 first (rarely supported)
      'video/webm;codecs=h264', // WebM with H264 codec
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];

    for (const codec of codecs) {
      if (MediaRecorder.isTypeSupported(codec)) {
        console.log(`Using codec: ${codec}`);
        return codec;
      }
    }
    return 'video/webm'; // fallback
  }

  // Start recording with configurable quality
  async startRecording(filename, options = {}) {
    const {
      fps = 60,
      videoBitrate = 10000000, // 10 Mbps default
      audioBitrate = 128000,
      preset = 'high' // 'low', 'medium', 'high', 'ultra'
    } = options;

    // Quality presets
    const presets = {
      low: { videoBitrate: 2500000, scale: 0.5 },
      medium: { videoBitrate: 5000000, scale: 0.75 },
      high: { videoBitrate: 10000000, scale: 1.0 },
      ultra: { videoBitrate: 20000000, scale: 1.0 }
    };

    const settings = presets[preset] || presets.high;
    
    try {
      // Get canvas stream with high frame rate
      const stream = this.canvas.captureStream(fps);
      
      // Configure recorder options
      const recorderOptions = {
        mimeType: this.getSupportedCodec(),
        videoBitsPerSecond: settings.videoBitrate,
        audioBitsPerSecond: audioBitrate
      };

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, recorderOptions);
      
      // Reset chunks
      this.chunks = [];
      
      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };
      
      // Handle recording stop
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { 
          type: this.mediaRecorder.mimeType 
        });
        this.downloadVideo(blob, filename);
        this.chunks = [];
        this.isRecording = false;
      };

      // Handle errors
      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.isRecording = false;
      };

      // Apply canvas scaling if needed
      if (settings.scale < 1.0) {
        const originalWidth = this.canvas.width;
        const originalHeight = this.canvas.height;
        this.canvas.width = originalWidth * settings.scale;
        this.canvas.height = originalHeight * settings.scale;
        
        // Store original dimensions to restore later
        this.originalDimensions = { width: originalWidth, height: originalHeight };
      }

      // Ensure engine renders at target FPS
      this.engine.stopRenderLoop();
      this.engine.runRenderLoop(() => {
        this.scene.render();
      });

      // Start recording with small chunks for better performance
      this.mediaRecorder.start(100); // Capture data every 100ms
      this.isRecording = true;
      
      console.log(`Recording started at ${fps}fps with ${settings.videoBitrate / 1000000}Mbps bitrate`);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  // Stop recording
  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      
      // Restore original canvas dimensions if scaled
      if (this.originalDimensions) {
        this.canvas.width = this.originalDimensions.width;
        this.canvas.height = this.originalDimensions.height;
        this.originalDimensions = null;
      }
      
      console.log('Recording stopped');
    }
  }

  // Download the recorded video
  downloadVideo(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    // Keep the filename as provided (already has .mp4 extension)
    a.download = filename || 'recording.mp4';
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  // Alternative high-quality frame capture method
  async captureFramesAsVideo(filename, options = {}) {
    const {
      fps = 60,
      duration = 5000, // milliseconds
      format = 'webm',
      quality = 0.95
    } = options;

    const frames = [];
    const frameInterval = 1000 / fps;
    const totalFrames = Math.floor(duration / frameInterval);

    console.log(`Capturing ${totalFrames} frames at ${fps}fps...`);

    for (let i = 0; i < totalFrames; i++) {
      // Render frame
      this.scene.render();
      
      // Capture frame as blob
      const blob = await new Promise(resolve => {
        this.canvas.toBlob(resolve, 'image/webp', quality);
      });
      
      frames.push(blob);
      
      // Wait for next frame time
      await new Promise(resolve => setTimeout(resolve, frameInterval));
    }

    // Convert frames to video (requires additional processing)
    console.log(`Captured ${frames.length} frames`);
    // Note: You would need a library like ffmpeg.js to convert frames to video
    
    return frames;
  }
}

export default VideoRecorder;