import { defineConfig } from 'vite'

export default defineConfig({
  // Base URL for GitHub Pages
  // Update this to match your GitHub repository name
  // For example: if your repo is https://github.com/username/my-repo
  // then use: base: '/my-repo/'
  // If deploying to https://username.github.io/, use base: '/'
  base: '/blendAnims/',
  
  build: {
    // Output directory
    outDir: 'dist',
    
    // Generate sourcemaps for debugging
    sourcemap: true,
    
    // Ensure assets are handled correctly
    assetsDir: 'assets',
    
    // Rollup options
    rollupOptions: {
      output: {
        // Manual chunks to optimize loading
        manualChunks: {
          babylon: ['babylonjs', 'babylonjs-loaders', '@babylonjs/gui']
        }
      }
    }
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['babylonjs', 'babylonjs-loaders', '@babylonjs/gui']
  }
})