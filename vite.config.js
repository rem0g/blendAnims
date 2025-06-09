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
  },
  
  // Development server configuration
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 5173,
    allowedHosts: ['avatar.signcollect.nl'],
    hmr: {
      port: 5173,
      host: 'avatar.signcollect.nl'
    },
    proxy: {
      // Proxy requests to SignCollect API during development
      '/api/signcollect': {
        target: 'https://signcollect.nl',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/signcollect/, '')
      }
    }
  }
})