# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SignBlendingInterface is a web-based sign language animation sequencer that allows users to create sequences of sign language gestures with smooth blending between animations. Built with Babylon.js for 3D rendering and Vite for development.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture Overview

### Core Animation System
The animation system uses Babylon.js to load GLB models containing sign language animations. Key concepts:

1. **Animation Retargeting**: Animations from individual sign GLB files are retargeted onto a base character model (`glassesGuySignLab.glb`)
2. **Blending**: Smooth transitions between signs using Babylon.js animation blending (configurable blend duration)
3. **Frame Trimming**: Each sign can have custom start/end frames to remove unwanted parts of the animation

### Component Responsibilities

- **CharacterController** (`src/characterController.js`): Handles GLB loading, skeleton mapping, and animation retargeting. Critical for understanding how animations are transferred between models.
- **AnimationController** (`src/animationController.js`): Manages playback timing, blending between animations, and video recording functionality.
- **UIController** (`src/UIController.js`): Implements drag-and-drop interface, manages the visual sequence builder, and handles user interactions.
- **FrameEditor** (`src/frameEditor.js`): Modal component for adjusting animation frame ranges with real-time preview.

### Adding New Signs

1. Place GLB file in `public/signs/` directory
2. Add entry to `src/availableSigns.js`:
```javascript
{
    name: "Sign Name",
    file: "signs/filename.glb",
    start: 0,  // Optional: start frame
    end: null  // Optional: end frame (null = use full animation)
}
```

### Key Technical Details

- Uses Babylon.js v8.3.1 for 3D rendering
- Animations are stored as GLB files with embedded animations
- Video export uses MediaRecorder API to capture canvas as WebM
- Drag-and-drop uses HTML5 drag events with custom data transfer
- Animation blending interpolates between the last frame of one sign and first frame of the next