// API client for SignCollect animation database
class SignCollectAPI {
  constructor() {
    this.baseURL = 'https://signcollect.nl/animDB/';
    this.glbBaseURL = 'https://signcollect.nl/gebarenoverleg_media/fbx/';
    this.cache = new Map(); // Cache for search results
    this.downloadedFiles = new Map(); // Cache for downloaded GLB files
  }

  // Search animations from the API
  async searchAnimations(searchTerm = '', limit = 50, offset = 0) {
    try {
      const url = new URL(`${this.baseURL}getAnims.php`);
      if (searchTerm) {
        url.searchParams.set('search', searchTerm);
      }
      url.searchParams.set('limit', limit);
      url.searchParams.set('offset', offset);

      // Check cache first
      const cacheKey = url.toString();
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        // Process animations to convert frame times
        if (data.data.animations) {
          for (let animation of data.data.animations) {
            if (animation.startTime !== undefined && animation.endTime !== undefined) {
              // Store original frame numbers from API
              animation.originalStartTime = animation.startTime;
              animation.originalEndTime = animation.endTime;
              animation.apiFrameRate = 24; // API uses 24fps
              console.log(`Animation ${animation.glos}: start=${animation.startTime}, end=${animation.endTime}`);
            }
          }
        }
        
        // Cache the results
        this.cache.set(cacheKey, data.data);
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to fetch animations');
      }
    } catch (error) {
      console.error('Error fetching animations:', error);
      throw error;
    }
  }

  // Get specific animation by ID
  async getAnimation(id) {
    try {
      const url = new URL(`${this.baseURL}getAnims.php`);
      url.searchParams.set('id', id);

      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.data.animations.length > 0) {
        return data.data.animations[0];
      } else {
        throw new Error('Animation not found');
      }
    } catch (error) {
      console.error('Error fetching animation:', error);
      throw error;
    }
  }

  // Get direct URL for GLB file (no download needed)
  async getDirectUrl(fileUrl, filename) {
    try {
      // For browser environment, we'll use the direct URL
      // The server should have CORS enabled for these requests
      console.log(`Using direct URL for ${filename}: ${fileUrl}`);
      
      // Just return an object with the URL
      return {
        url: fileUrl,
        originalUrl: fileUrl,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error getting GLB file URL:', error);
      throw error;
    }
  }

  // Get cached file URL or use direct URL
  async getCachedFileUrl(animation) {
    let fileUrl = animation.file_url || `${this.glbBaseURL}${animation.filename}`;
    let filename = animation.filename;
    
    // Convert FBX to GLB URLs
    if (fileUrl.endsWith('.fbx') || fileUrl.endsWith('.FBX')) {
      fileUrl = fileUrl.replace(/\.fbx$/i, '.glb');
      filename = filename.replace(/\.fbx$/i, '.glb');
    }

    // Check cache first
    if (this.downloadedFiles.has(filename)) {
      return this.downloadedFiles.get(filename).url;
    }

    // Store the direct URL in cache for consistency
    this.downloadedFiles.set(filename, {
      url: fileUrl,
      originalUrl: fileUrl,
      timestamp: Date.now()
    });

    return fileUrl;
  }

  // Convert time string (HH:MM:SS) to frame number at given fps
  timeToFrames(timeString, fps = 24) {
    if (!timeString) return null;
    
    const parts = timeString.split(':');
    if (parts.length !== 3) return null;
    
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return Math.round(totalSeconds * fps);
  }

  // Convert frames from one fps to another
  convertFrameRate(frames, fromFps, toFps) {
    if (!frames || !fromFps || !toFps) return frames;
    return Math.round((frames / fromFps) * toFps);
  }

  // Get animation frame rate from GLB file
  async getAnimationFrameRate(animationGroup) {
    if (!animationGroup || !animationGroup.targetedAnimations || animationGroup.targetedAnimations.length === 0) {
      return 60; // Default assumption for GLB files
    }

    try {
      // Get the first animation to determine frame rate
      const firstAnimation = animationGroup.targetedAnimations[0].animation;
      const keys = firstAnimation.getKeys();
      
      if (keys.length < 2) return 60;
      
      // Most sign language animations are at 60fps
      return 60; // Most GLB animations are 60fps
    } catch (error) {
      console.warn('Could not determine animation frame rate, using default 60fps:', error);
      return 60;
    }
  }

  // Convert API timing data to actual animation frames
  async convertTimingToFrames(animation, animationGroup = null) {
    if (animation.originalStartTime === undefined || animation.originalEndTime === undefined) {
      return { start: null, end: null };
    }

    // Check if the timing data is already in frame format (numbers)
    const startValue = animation.originalStartTime;
    const endValue = animation.originalEndTime;
    
    console.log(`Converting timing for animation: start=${startValue}, end=${endValue}`);
    
    let apiStartFrames, apiEndFrames;
    
    // If the values are numbers or numeric strings, treat them as frame numbers
    if (!isNaN(startValue) && !isNaN(endValue)) {
      apiStartFrames = parseInt(startValue, 10);
      apiEndFrames = parseInt(endValue, 10);
      console.log(`Treating as frame numbers: ${apiStartFrames} - ${apiEndFrames}`);
    } else {
      // Otherwise, parse as time strings (HH:MM:SS format)
      apiStartFrames = this.timeToFrames(startValue, 24);
      apiEndFrames = this.timeToFrames(endValue, 24);
      console.log(`Parsed as time strings: ${apiStartFrames} - ${apiEndFrames}`);
    }

    // Determine actual animation frame rate
    const actualFps = animationGroup ? await this.getAnimationFrameRate(animationGroup) : 60;
    
    // Convert from API's 24fps to actual animation fps
    const actualStartFrames = this.convertFrameRate(apiStartFrames, 24, actualFps);
    const actualEndFrames = this.convertFrameRate(apiEndFrames, 24, actualFps);
    
    console.log(`Final frames (${actualFps}fps): ${actualStartFrames} - ${actualEndFrames}`);

    return {
      start: actualStartFrames,
      end: actualEndFrames,
      originalStartTime: animation.originalStartTime,
      originalEndTime: animation.originalEndTime,
      apiFps: 24,
      actualFps: actualFps
    };
  }

  // Clear cache (optional memory management)
  clearCache() {
    // Just clear the cache maps
    this.downloadedFiles.clear();
    this.cache.clear();
  }

  // Get sequences from API
  async getSequences(params = {}) {
    try {
      const url = new URL(`${this.baseURL}getSequencer.php`);
      
      // Add parameters if provided
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.set(key, params[key]);
        }
      });

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to fetch sequences');
      }
    } catch (error) {
      console.error('Error fetching sequences:', error);
      throw error;
    }
  }
}

export default SignCollectAPI;