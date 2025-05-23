# Sign Language Animation Interface

A comprehensive web application for editing, blending, and animating sign language sequences with real-time preview capabilities.

## Features

- **Interactive Animation Player**: Play, pause, and control sign language animations
- **Sequence Builder**: Create custom sequences by combining multiple signs
- **Frame Editor**: Fine-tune animation timing with intuitive slider controls
- **Real-time Preview**: Auto-testing with debounced updates for smooth editing
- **Persistent Storage**: Save changes to the signs database
- **Responsive Design**: Modern UI that works across different screen sizes

## Getting Started

### Prerequisites

- **Node.js** (version 14 or higher)
- **npm** (comes with Node.js)
- A modern web browser (Chrome, Firefox, Safari, or Edge)

### Installation

1. **Clone or download the project**:
   ```bash
   git clone https://github.com/rem0g/blendAnims
   cd SignBlendingInterface
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development environment**:
   
   **Option A: Full Development Setup (Recommended)**
   ```bash
   npm run dev-full
   ```
   This command starts both the Vite development server and the API server concurrently.

   **Option B: Manual Setup**
   
   Start the API server (required for save functionality):
   ```bash
   npm run api-server
   ```
   
   In a separate terminal, start the Vite development server:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to `http://localhost:5173` (Vite dev server) to access the application.
   
   **Server Endpoints:**
   - Frontend: `http://localhost:5173`
   - API Server: `http://localhost:3001`

### Project Structure

```
SignBlendingInterface/
├── src/
│   ├── UIController.js      # Main application logic and UI controls
│   ├── styles.css          # Application styling and animations
│   ├── signs.json          # Sign language animation database
│   └── index.html          # Main HTML page
├── assets/                 # Animation files and resources
├── package.json           # Node.js dependencies and scripts
└── README.md             # This file
```

## Usage Guide

### Basic Controls

- **Play/Pause**: Click the play button to start or stop animation playback
- **Speed Control**: Adjust playback speed using the speed slider
- **Sign Selection**: Choose from available signs in the dropdown menu

### Creating Sequences

1. **Select Signs**: Use the sign dropdown to choose signs for your sequence
2. **Add to Sequence**: Click "Add to Sequence" to build your animation chain
3. **Record Sequence**: Click "🎬 Record Sequence" to save your custom sequence
4. **Save Changes**: Use "💾 Save All" to persist your modifications

### Frame Editor

1. **Open Editor**: Click "✏️ Edit Frames" next to any sign in your sequence
2. **Adjust Timing**: Use the sliders to modify start and end frame values
3. **Real-time Preview**: Changes are automatically tested with 800ms debounce
4. **Apply Changes**: Click "Apply" to save your frame adjustments

### Saving Your Work

- **Auto-save**: Frame changes are automatically applied during editing
- **Manual Save**: Click "💾 Save All" to persist all changes to the server
- **Visual Feedback**: Save button shows loading states and success/error messages

## Technical Details

### Animation System

The application uses a frame-based animation system where each sign is defined by:
- **Start Frame**: Beginning frame of the animation sequence
- **End Frame**: Final frame of the animation sequence
- **Animation Files**: 3D model animations stored in the assets directory

### Data Format

Signs are stored in `src/signs.json` with the following structure:
```json
{
  "signName": {
    "start_frame": 0,
    "end_frame": 100
  }
}
```

### UI Components

- **Slider Controls**: Custom-styled range inputs for precise frame control
- **Debounced Auto-testing**: Prevents excessive API calls during rapid changes
- **Responsive Layout**: Flex-based design adapts to different screen sizes

## Development

### Running in Development Mode

**Full Development Environment (Recommended):**
```bash
npm run dev-full
```
This starts both the Vite development server (frontend) and the API server (backend) simultaneously.

**Manual Development Setup:**
```bash
# Terminal 1: Start API server
npm run api-server

# Terminal 2: Start frontend development server
npm run dev
```

### API Server Details

The API server (`api-server.js`) provides endpoints for:
- **Saving Signs**: `POST /api/signs` - Persists changes to `src/signs.json`
- **Health Check**: `GET /api/health` - Server status verification

**Server Configuration:**
- **Port**: 3001 (configurable via `PORT` environment variable)
- **CORS**: Enabled for all origins during development
- **Auto-backup**: Creates timestamped backups before saving changes

**Environment Variables:**
```bash
PORT=3001          # API server port (default: 3001)
NODE_ENV=development   # Environment mode
```

### Available Scripts

```bash
npm run dev-full        # Start both frontend and API server (recommended)
npm run dev            # Start only the frontend development server  
npm run api-server     # Start only the API server
npm run build          # Build the application for production
npm run preview        # Preview the production build
npm run update-signs   # Update signs database from external source
```

### Building for Production

```bash
npm run build
```

Creates an optimized production build in the `dist/` directory.

### Code Structure

- **UIController.js**: Main application controller handling UI interactions, animation playback, and data management
- **styles.css**: Comprehensive styling including custom slider designs and responsive layouts
- **index.html**: Application entry point and DOM structure

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Troubleshooting

### Common Issues

1. **Animation not loading**: Ensure animation files are present in the `public/signs/` directory
2. **Save button not working**: 
   - Check that the API server is running (`npm run api-server`)
   - Verify the API server is accessible at `http://localhost:3001`
   - Check browser console for network errors
3. **Sliders not responding**: Verify JavaScript is enabled in your browser
4. **CORS errors**: Ensure both servers are running on the correct ports

### Development Issues

1. **Port already in use**: 
   - Frontend (5173): Change the port in `vite.config.js` or kill the existing process
   - API Server (3001): Set `PORT` environment variable or kill the existing process
2. **Dependencies not installing**: Clear npm cache with `npm cache clean --force`
3. **Build failures**: Ensure Node.js version is 14 or higher
4. **API server not starting**: Check that ports 3001 is available and dependencies are installed

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built for sign language education and research
- Optimized for accessibility and ease of use
- Designed with modern web standards and best practices
