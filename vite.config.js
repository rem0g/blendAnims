import { defineConfig } from 'vite'

export default defineConfig({
  // Base URL for GitHub Pages
  // Replace 'SignBlendingInterface' with your actual repository name
  base: '/SignBlendingInterface/',
  
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