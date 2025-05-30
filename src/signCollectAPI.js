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