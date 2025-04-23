import * as BABYLON from "babylonjs";
import "babylonjs-loaders";
import "./dragDropSequencer.css";

// SINGLETON


// Canvas and engine setup
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

// Global variables
let availableSigns = [];
let scene;
let currentAnimation = null;
let currentMeshes = [];
let isPlaying = false;
let sequenceItems = [];

// Function to list all GLB files in the public folder and extract sign names
function parseSigns() {
  // Hardcoded list of sign files for now
  const signFiles = [
    "HALLO-C_250226_1.glb",
    "SCHOOL-D_250226_1.glb",
    "HAARLEM_250226_1.glb",
    "KIJKEN-NAAR-ELKAAR_250228_1.glb",
    "KRIJGEN-A_250228_5.glb",
    "LELYSTAD_250314_1.glb",
    "LES_250228_2.glb",
    "PROBEREN-E_250226_2.glb",
    "SCHULDGEVEN_250226_1.glb",
    "VRAGEN-A_250226_1.glb",
    "WACHTEN-B_250226_1.glb"
  ];

  const signs = [];
  
  // Process each file to extract the sign name
  signFiles.forEach(file => {
    // Extract sign name by taking everything before the first underscore
    // and replace dashes with spaces
    const name = file.split('_')[0];
    
    signs.push({
      name: name,
      file: file
    });
    
  });

  // console.log(`Parsed all signs`);
  // console.log(signs);
  return signs;
}


// Initialize the 3D scene
function createScene() {
  // Create basic scene
  scene = new BABYLON.Scene(engine);

  // Setup camera with a close up to the avatar
  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    -Math.PI / 2,
    Math.PI / 2.5,
    2.8,
    new BABYLON.Vector3(0, 1, 0)
  );
  camera.attachControl(canvas, true);

  // Max camera distance
  camera.upperRadiusLimit = 10;
  camera.lowerRadiusLimit = 2;

  // Basic lighting
  const light = new BABYLON.HemisphericLight(
    "light",
    new BABYLON.Vector3(1, 1, 0)
  );

  // Create ground
  const ground = BABYLON.MeshBuilder.CreateGround("ground", {
    width: 10,
    height: 10,
  });
  const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
  groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
  ground.material = groundMaterial;

  // Load the avatar model
  BABYLON.SceneLoader.ImportMesh(
    "",
    "./",
    "glassesGuySignLab.glb",
    scene,
    function (meshes) {
      const glassesGuy = meshes[0];
      glassesGuy.position = new BABYLON.Vector3(-0.5, 0, 0);
      glassesGuy.rotate(BABYLON.Axis.Y, Math.PI - 0.1, BABYLON.Space.WORLD);
    }
  );

  return scene;
}

// Clean up resources before loading a new sign
function cleanupResources() {
  // Stop and dispose current animation
  if (currentAnimation) {
    currentAnimation.stop();
    currentAnimation.dispose();
    currentAnimation = null;
  }
  
  // Clear all current meshes
  if (currentMeshes.length > 0) {
    currentMeshes.forEach(mesh => {
      if (mesh && mesh.dispose) {
        mesh.dispose();
      }
    });
    currentMeshes = [];
  }
  
  // Clean up any other animations
  if (scene.animationGroups) {
    for (let i = scene.animationGroups.length - 1; i >= 0; i--) {
      scene.animationGroups[i].dispose();
    }
  }
  
  // Remove any leftover meshes except ground, avatar, and camera
  for (let i = scene.meshes.length - 1; i >= 0; i--) {
    const mesh = scene.meshes[i];
    if (mesh.name !== "ground" && 
        !mesh.name.includes("camera") && 
        !mesh.name.includes("glassesGuy")) {
      mesh.dispose();
    }
  }
}

// Play a single sign
function playSign(sign, onComplete = null) {
  if (isPlaying) {
    console.log("Already playing a sign, please wait");
    return;
  }
  
  isPlaying = true;
  updatePlaybackState();
  
  // Clean up before loading new sign
  cleanupResources();
  
  console.log(`Playing sign: ${sign.name}`);
  
  // Load the sign animation model
  BABYLON.SceneLoader.ImportMesh(
    "",
    "./",
    sign.file,
    scene,
    (meshes, particleSystems, skeletons, animationGroups) => {
      // Store meshes for cleanup
      currentMeshes = [...meshes];
      
      // Hide the meshes - we only want the animation
      meshes.forEach(mesh => {
        mesh.isVisible = false;
      });
      
      if (!animationGroups || animationGroups.length === 0) {
        console.error(`No animations found for sign: ${sign.name}`);
        isPlaying = false;
        updatePlaybackState();
        if (onComplete) onComplete();
        return;
      }
      
      // Get the animation
      currentAnimation = animationGroups[0];
      console.log(`Playing animation: ${currentAnimation.name}`);
      
      // Make sure we're not playing it in a loop
      currentAnimation.loopAnimation = false;
      
      // Set up completion handler
      currentAnimation.onAnimationEndObservable.clear();
      currentAnimation.onAnimationEndObservable.add(() => {
        console.log(`Animation ended: ${currentAnimation.name}`);
        isPlaying = false;
        updatePlaybackState();
        if (onComplete) onComplete();
      });
      
      // Start the animation
      currentAnimation.play(false);
      
      // Update UI to show current sign
      updateCurrentPlayingSign(sign.name);
    },
    null,
    (scene, message) => {
      console.error(`Error loading sign: ${sign.name}`, message);
      isPlaying = false;
      updatePlaybackState();
      if (onComplete) onComplete();
    }
  );
}

// Play sequence of signs
function playSequence() {
  if (isPlaying || sequenceItems.length === 0) {
    return;
  }
  
  console.log("Playing sequence:", sequenceItems.map(item => item.sign.name));
  
  // Create a copy of the sequence to work with
  const sequence = [...sequenceItems];
  playNextInSequence(sequence);
}

// Play next sign in sequence
function playNextInSequence(sequence) {
  if (sequence.length === 0) {
    console.log("Sequence completed");
    return;
  }
  
  const nextItem = sequence.shift();
  
  // Highlight the current item in the sequence
  highlightSequenceItem(nextItem.id);
  
  // Play the sign and when complete, play the next one
  playSign(nextItem.sign, () => {
    // Short delay between signs
    setTimeout(() => {
      playNextInSequence(sequence);
    }, 500);
  });
}

// Update UI based on playback state
function updatePlaybackState() {
  const playButtons = document.querySelectorAll('.play-button');
  const sequencePlayButton = document.getElementById('play-sequence-button');
  
  if (isPlaying) {
    // Disable all play buttons during playback
    playButtons.forEach(btn => {
      btn.disabled = true;
    });
    sequencePlayButton.disabled = true;
  } else {
    // Enable buttons when not playing
    playButtons.forEach(btn => {
      btn.disabled = false;
    });
    sequencePlayButton.disabled = (sequenceItems.length === 0);
  }
}

// Update currently playing sign indicator
function updateCurrentPlayingSign(signName) {
  // Clear previous indicators
  clearCurrentPlayingIndicators();
  
  // Find and highlight the current sign in the library
  const signItems = document.querySelectorAll('.sign-item');
  signItems.forEach(item => {
    if (item.dataset.name === signName) {
      item.classList.add('playing');
    }
  });
}

// Clear playing indicators
function clearCurrentPlayingIndicators() {
  const items = document.querySelectorAll('.sign-item, .sequence-item');
  items.forEach(item => {
    item.classList.remove('playing');
  });
}

// Highlight the current sequence item
function highlightSequenceItem(itemId) {
  // Clear all highlights
  const sequenceItems = document.querySelectorAll('.sequence-item');
  sequenceItems.forEach(item => {
    item.classList.remove('playing');
  });
  
  // Highlight the current item
  const currentItem = document.getElementById(`sequence-item-${itemId}`);
  if (currentItem) {
    currentItem.classList.add('playing');
  }
}

// Handle dropping a sign into the sequence area
function handleDrop(e) {
  e.preventDefault();
  
  // Get the sign data
  const signName = e.dataTransfer.getData('text/plain');
  const sign = availableSigns.find(s => s.name === signName);
  
  if (!sign) return;
  
  // Add to sequence
  addToSequence(sign);
}

// Add a sign to the sequence
function addToSequence(sign) {
  // Generate a unique ID for this sequence item
  const itemId = Date.now();
  
  // Add to our sequence data
  sequenceItems.push({
    id: itemId,
    sign: sign
  });
  
  // Update the UI
  updateSequenceUI();
}

// Remove an item from the sequence
function removeFromSequence(itemId) {
  sequenceItems = sequenceItems.filter(item => item.id !== itemId);
  updateSequenceUI();
}

// Handle drag over
function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}

// Update the sequence UI
function updateSequenceUI() {
  const sequenceContainer = document.getElementById('sequence-container');
  sequenceContainer.innerHTML = '';
  
  if (sequenceItems.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-message';
    emptyMessage.textContent = 'Drag signs here to create a sequence';
    sequenceContainer.appendChild(emptyMessage);
    
    // Disable play button when sequence is empty
    const playButton = document.getElementById('play-sequence-button');
    if (playButton) {
      playButton.disabled = true;
    }
    
    return;
  }
  
  // Enable play button when sequence has items
  const playButton = document.getElementById('play-sequence-button');
  if (playButton && !isPlaying) {
    playButton.disabled = false;
  }
  
  // Create sequence items
  sequenceItems.forEach((item, index) => {
    const sequenceItem = document.createElement('div');
    sequenceItem.className = 'sequence-item';
    sequenceItem.id = `sequence-item-${item.id}`;
    sequenceItem.dataset.id = item.id;
    
    // Add drag-to-reorder functionality
    sequenceItem.draggable = true;
    sequenceItem.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/sequence-item', item.id.toString());
      sequenceItem.classList.add('dragging');
    });
    
    sequenceItem.addEventListener('dragend', () => {
      sequenceItem.classList.remove('dragging');
    });
    
    // Sign name and info
    const signInfo = document.createElement('div');
    signInfo.className = 'sequence-item-info';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'sequence-item-name';
    nameSpan.textContent = item.sign.name;
    signInfo.appendChild(nameSpan);
    
    const indexSpan = document.createElement('span');
    indexSpan.className = 'sequence-item-index';
    indexSpan.textContent = `#${index + 1}`;
    signInfo.appendChild(indexSpan);
    
    sequenceItem.appendChild(signInfo);
    
    // Controls
    const controls = document.createElement('div');
    controls.className = 'sequence-item-controls';
    
    // Play button
    const playButton = document.createElement('button');
    playButton.className = 'play-button small-button';
    playButton.innerHTML = '▶';
    playButton.title = `Play "${item.sign.name}"`;
    playButton.onclick = () => playSign(item.sign);
    controls.appendChild(playButton);
    
    // Remove button
    const removeButton = document.createElement('button');
    removeButton.className = 'remove-button small-button';
    removeButton.innerHTML = '×';
    removeButton.title = 'Remove from sequence';
    removeButton.onclick = () => removeFromSequence(item.id);
    controls.appendChild(removeButton);
    
    sequenceItem.appendChild(controls);
    sequenceContainer.appendChild(sequenceItem);
  });
  
  // Update drag-drop reordering logic
  setupSequenceReordering();
}

// Setup the logic for reordering sequence items via drag and drop
function setupSequenceReordering() {
  const sequenceItems = document.querySelectorAll('.sequence-item');
  
  sequenceItems.forEach(item => {
    item.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      const draggingItem = document.querySelector('.dragging');
      if (!draggingItem) return;
      
      const mouseY = e.clientY;
      const items = [...document.querySelectorAll('.sequence-item:not(.dragging)')];
      
      // Find position to insert
      const nextItem = items.find(otherItem => {
        const box = otherItem.getBoundingClientRect();
        return mouseY < box.top + box.height / 2;
      });
      
      if (nextItem) {
        item.parentNode.insertBefore(draggingItem, nextItem);
      } else {
        item.parentNode.appendChild(draggingItem);
      }
    });
    
    item.addEventListener('drop', e => {
      e.preventDefault();
      const itemId = parseInt(e.dataTransfer.getData('application/sequence-item'));
      if (!itemId) return;
      
      // Update the sequence order based on the new DOM order
      const newOrder = [];
      document.querySelectorAll('.sequence-item').forEach(item => {
        const id = parseInt(item.dataset.id);
        const sequenceItem = sequenceItems.find(i => i.id === id);
        if (sequenceItem) {
          newOrder.push(sequenceItem);
        }
      });
      
      sequenceItems = newOrder;
      updateSequenceUI();
    });
  });
}

// Create the drag-drop sequencer UI
function createDragDropUI() {
  // Create main container
  const appContainer = document.createElement('div');
  appContainer.className = 'app-container';
  document.body.appendChild(appContainer);
  
  // Create title
  const title = document.createElement('h1');
  title.className = 'app-title';
  title.textContent = 'Sign Language Sequencer';
  appContainer.appendChild(title);
  
  // Create two-column layout
  const mainLayout = document.createElement('div');
  mainLayout.className = 'main-layout';
  appContainer.appendChild(mainLayout);
  
  // ---- Left column: Sign Library ----
  const libraryColumn = document.createElement('div');
  libraryColumn.className = 'library-column';
  mainLayout.appendChild(libraryColumn);
  
  const libraryTitle = document.createElement('h2');
  libraryTitle.textContent = 'Sign Library';
  libraryColumn.appendChild(libraryTitle);
  
  // Search input for library
  const searchContainer = document.createElement('div');
  searchContainer.className = 'search-container';
  
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search signs...';
  searchInput.className = 'search-input';
  searchInput.addEventListener('input', filterSignLibrary);
  searchContainer.appendChild(searchInput);
  
  libraryColumn.appendChild(searchContainer);
  
  // Sign library container
  const signLibrary = document.createElement('div');
  signLibrary.id = 'sign-library';
  signLibrary.className = 'sign-library';
  libraryColumn.appendChild(signLibrary);
  
  // Populate library with available signs
  populateSignLibrary();
  
  // ---- Right column: Sequence Builder ----
  const sequenceColumn = document.createElement('div');
  sequenceColumn.className = 'sequence-column';
  mainLayout.appendChild(sequenceColumn);
  
  const sequenceTitle = document.createElement('h2');
  sequenceTitle.textContent = 'Sign Sequence';
  sequenceColumn.appendChild(sequenceTitle);
  
  // Sequence controls
  const sequenceControls = document.createElement('div');
  sequenceControls.className = 'sequence-controls';
  
  const playSequenceButton = document.createElement('button');
  playSequenceButton.id = 'play-sequence-button';
  playSequenceButton.className = 'control-button play-sequence-button';
  playSequenceButton.innerHTML = 'Play Sequence';
  playSequenceButton.disabled = true;
  playSequenceButton.onclick = playSequence;
  sequenceControls.appendChild(playSequenceButton);
  
  const clearSequenceButton = document.createElement('button');
  clearSequenceButton.className = 'control-button clear-sequence-button';
  clearSequenceButton.innerHTML = 'Clear All';
  clearSequenceButton.onclick = () => {
    sequenceItems = [];
    updateSequenceUI();
  };
  sequenceControls.appendChild(clearSequenceButton);
  
  sequenceColumn.appendChild(sequenceControls);
  
  // Sequence drop area
  const sequenceDropArea = document.createElement('div');
  sequenceDropArea.id = 'sequence-drop-area';
  sequenceDropArea.className = 'sequence-drop-area';
  sequenceDropArea.addEventListener('dragover', handleDragOver);
  sequenceDropArea.addEventListener('drop', handleDrop);
  
  // Container for sequence items
  const sequenceContainer = document.createElement('div');
  sequenceContainer.id = 'sequence-container';
  sequenceContainer.className = 'sequence-container';
  
  // Initialize with empty message
  const emptyMessage = document.createElement('div');
  emptyMessage.className = 'empty-message';
  emptyMessage.textContent = 'Drag signs here to create a sequence';
  sequenceContainer.appendChild(emptyMessage);
  
  sequenceDropArea.appendChild(sequenceContainer);
  sequenceColumn.appendChild(sequenceDropArea);
}

// Filter the sign library based on search input
function filterSignLibrary() {
  const searchInput = document.querySelector('.search-input');
  const searchTerm = searchInput.value.toLowerCase();
  
  const signItems = document.querySelectorAll('.sign-item');
  signItems.forEach(item => {
    const signName = item.dataset.name.toLowerCase();
    if (signName.includes(searchTerm)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

// Populate the sign library with available signs
function populateSignLibrary() {
  const library = document.getElementById('sign-library');
  
  // Sort signs alphabetically
  availableSigns.sort((a, b) => a.name.localeCompare(b.name));
  
  availableSigns.forEach(sign => {
    const signItem = document.createElement('div');
    signItem.className = 'sign-item';
    signItem.dataset.name = sign.name;
    
    // Make the sign item draggable
    signItem.draggable = true;
    signItem.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', sign.name);
      signItem.classList.add('dragging');
    });
    
    signItem.addEventListener('dragend', () => {
      signItem.classList.remove('dragging');
    });
    
    // Sign name
    const signInfo = document.createElement('div');
    signInfo.className = 'sign-info';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'sign-name';
    nameSpan.textContent = sign.name;
    signInfo.appendChild(nameSpan);
    
    signItem.appendChild(signInfo);
    
    // Play button
    const playButton = document.createElement('button');
    playButton.className = 'play-button';
    playButton.innerHTML = 'Play';
    playButton.onclick = (e) => {
      e.stopPropagation(); // Prevent dragging when clicking play
      playSign(sign);
    };
    signItem.appendChild(playButton);
    
    // Add to library
    library.appendChild(signItem);
  });
}


// Initialize scene and UI
availableSigns = parseSigns();
scene = createScene();
createDragDropUI();

// Start render loop
engine.runRenderLoop(() => {
  scene.render();
});

// Handle window resize
window.addEventListener('resize', () => {
  engine.resize();
}); 