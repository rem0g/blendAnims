import { Grid } from "@babylonjs/gui";
import FrameEditor from "./frameEditor";
import { availableSignsMap } from "./availableSigns";
import SequencerAPI from "./sequencerAPI";
import SignCollectAPI from "./signCollectAPI";
import TextToSignModal from "./textToSignModal";

// Class to handle UI elements and interactions, such as drag and drop
class UIController {
  constructor(
    scene,
    availableSigns,
    characterController,
    animationController,
    isPlaying
  ) {
    this.scene = scene;
    this.availableSigns = availableSigns;
    this.characterController = characterController;
    this.animationController = animationController;
    this.sequenceItems = [];
    this.isPlaying = isPlaying; // Flag to indicate if a sequence is currently playing
    this.nextItemId = 1; // For generating unique IDs for sequence items
    this.controlsEnabled = false; // Flag to enable/disable controls
    this.blending = true; // Blending flag
    this.isRecording = false; // Flag to indicate if recording is active
    this.dropPosition = null; // Track where to insert dropped items
    this.draggedItem = null; // Track what is being dragged
    this.frameEditor = new FrameEditor(
      this.scene,
      animationController,
      this.showNotification.bind(this),
      this.updateLibraryFrames.bind(this),
      this.updateSequenceUI.bind(this)
    );
    
    // Initialize the API clients
    this.sequencerAPI = new SequencerAPI();
    this.signCollectAPI = new SignCollectAPI();
    this.currentSequenceId = null; // Track current sequence for updates
    this.apiSearchResults = []; // Store API search results
    this.searchTimeout = null; // For debouncing search

    // Bind methods to maintain proper 'this' context
    this.filterSignLibrary = this.filterSignLibrary.bind(this);
    this.handleDragOver = this.handleDragOver.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
    this.updateSequenceUI = this.updateSequenceUI.bind(this);
    this.removeFromSequence = this.removeFromSequence.bind(this);
    this.addToSequence = this.addToSequence.bind(this);
    this.handleSearchInput = this.handleSearchInput.bind(this);
    
    // Autosave timer
    this.autosaveTimer = null;
    this.autosaveEnabled = true;
    
    // Initialize text to sign modal
    this.textToSignModal = null;
  }

  init() {
    // Create UI
    this.animationController.init(this.sequenceItems);
    this.createDragDropUI();
    
    // Initialize text to sign modal after UI is created
    this.textToSignModal = new TextToSignModal(this);
  }

  createDragDropUI() {
    this.createMainContainer();
    this.createHeader();
    this.createMainLayout();
  }

  createMainContainer() {
    // Create the main container
    this.container = document.createElement("div");
    this.container.className = "ui-container";
    document.body.appendChild(this.container);

    // Create bars to make the UI appear again
    const showButton = document.createElement("button");
    showButton.className = "show-button";
    showButton.innerHTML = "☰ Show UI";
    showButton.title = "Show UI";

    // Hide button when UI is open
    showButton.style.display = "none";
    showButton.onclick = () => {
      this.container.style.display = "block"; // Show the UI
      showButton.style.display = "none"; // Hide the show button
    };
    document.body.appendChild(showButton);
  }

  createHeader() {
    // Create the header with title and settings button
    const headerContainer = document.createElement("div");
    headerContainer.className = "ui-header";
    this.container.appendChild(headerContainer);

    // Create the title
    this.title = document.createElement("h1");
    this.title.className = "ui-title";
    this.title.textContent = "Sign Language Sequencer";
    headerContainer.appendChild(this.title);

    // Create the blending toggle button
    const blendingToggleButton = document.createElement("button");
    blendingToggleButton.className = "blending-toggle-button";
    blendingToggleButton.innerHTML = this.blending
      ? "Disable Blending"
      : "Enable Blending";
    blendingToggleButton.title = "Enable/Disable Blending";
    blendingToggleButton.onclick = () => {
      this.blending = !this.blending;
      blendingToggleButton.classList.toggle("active", this.blending);
      blendingToggleButton.innerHTML = this.blending
        ? "Disable Blending"
        : "Enable Blending";
    };
    headerContainer.appendChild(blendingToggleButton);

    // Create cross to close the UI
    const closeButton = document.createElement("button");
    closeButton.className = "close-button";
    closeButton.innerHTML = "✖"; // Cross icon
    closeButton.title = "Close UI";
    closeButton.onclick = () => {
      this.container.style.display = "none"; // Hide the UI
      document.querySelector(".show-button").style.display = "block"; // Show the show button
    };
    headerContainer.appendChild(closeButton);
  }

  createMainLayout() {
    // Create two-column layout
    const mainLayout = document.createElement("div");
    mainLayout.className = "main-layout";
    this.container.appendChild(mainLayout);

    this.createLibraryColumn(mainLayout);
    this.createSequenceColumn(mainLayout);
  }

  createLibraryColumn(mainLayout) {
    // ---- Left column: Sign Library ----
    const libraryColumn = document.createElement("div");
    libraryColumn.className = "library-column";
    mainLayout.appendChild(libraryColumn);

    const libraryTitle = document.createElement("h2");
    libraryTitle.textContent = "Sign Library";
    libraryColumn.appendChild(libraryTitle);

    // Search input for library
    const searchContainer = document.createElement("div");
    searchContainer.className = "search-container";

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search signs (local & online)...";
    searchInput.className = "search-input";
    searchInput.addEventListener("input", (e) => this.handleSearchInput(e.target.value));
    searchContainer.appendChild(searchInput);

    libraryColumn.appendChild(searchContainer);

    // Sign library container
    const signLibrary = document.createElement("div");
    signLibrary.id = "sign-library";
    signLibrary.className = "sign-library";
    libraryColumn.appendChild(signLibrary);

    // Populate library with available signs
    this.populateSignLibrary();
  }

  createSequenceColumn(mainLayout) {
    // ---- Right column: Sequence Builder ----
    const sequenceColumn = document.createElement("div");
    sequenceColumn.className = "sequence-column";
    mainLayout.appendChild(sequenceColumn);

    const sequenceTitle = document.createElement("h2");
    sequenceTitle.textContent = "Sign Sequence";
    sequenceColumn.appendChild(sequenceTitle);

    this.createSequenceControls(sequenceColumn);
    this.createSequenceDropArea(sequenceColumn);
  }

  createSequenceControls(sequenceColumn) {
    // Sequence controls
    const sequenceControls = document.createElement("div");
    sequenceControls.className = "sequence-controls";

    const playSequenceButton = document.createElement("button");
    playSequenceButton.id = "play-sequence-button";
    playSequenceButton.className = "control-button play-sequence-button";
    playSequenceButton.innerHTML = "Play Sequence";
    playSequenceButton.disabled = true;
    playSequenceButton.onclick = () => {
      this.isRecording = false;

      // Pass the sequence items to the animation controller
      this.animationController.sequenceItems = this.sequenceItems;
      
      // Blend animation for the sequence
      this.animationController.playSequence(
        this.sequenceItems.map((item) => item.sign.name),
        this.blending,
        this.isRecording
      );
    };
    sequenceControls.appendChild(playSequenceButton);

    const clearSequenceButton = document.createElement("button");
    clearSequenceButton.id = "clear-sequence-button";
    clearSequenceButton.className = "control-button clear-sequence-button";
    clearSequenceButton.innerHTML = "Clear All";
    clearSequenceButton.disabled = true;
    clearSequenceButton.onclick = () => {
      this.sequenceItems = [];
      this.updateSequenceUI();
    };
    sequenceControls.appendChild(clearSequenceButton);

    const recordSequenceButton = document.createElement("button");
    recordSequenceButton.id = "record-sequence-button";
    recordSequenceButton.className = "control-button record-sequence-button";
    recordSequenceButton.innerHTML = "Record Sequence";
    recordSequenceButton.disabled = true;
    recordSequenceButton.onclick = () => {
      this.isRecording = true;
      
      // Pass the sequence items to the animation controller
      this.animationController.sequenceItems = this.sequenceItems;
      
      this.animationController.playSequence(
        this.sequenceItems.map((item) => item.sign.name),
        this.blending,
        this.isRecording
      );
    };
    sequenceControls.appendChild(recordSequenceButton);

    // Add save button to the same row
    const saveSequenceButton = document.createElement("button");
    saveSequenceButton.id = "save-sequence-button";
    saveSequenceButton.className = "control-button save-sequence-button";
    saveSequenceButton.innerHTML = "💾 Save";
    saveSequenceButton.title = "Save sequence to database";
    saveSequenceButton.disabled = true;
    saveSequenceButton.onclick = () => this.showSaveDialog();
    sequenceControls.appendChild(saveSequenceButton);

    // Add load button to the same row
    const loadSequenceButton = document.createElement("button");
    loadSequenceButton.id = "load-sequence-button";
    loadSequenceButton.className = "control-button load-sequence-button";
    loadSequenceButton.innerHTML = "📂 Load";
    loadSequenceButton.title = "Load sequence from database";
    loadSequenceButton.onclick = () => this.showLoadDialog();
    sequenceControls.appendChild(loadSequenceButton);
    
    // Add camera eye tracking button
    const mouseEyeButton = document.createElement("button");
    mouseEyeButton.id = "mouse-eye-button";
    mouseEyeButton.className = "control-button mouse-eye-button";
    mouseEyeButton.innerHTML = "👁️ Camera Track";
    mouseEyeButton.title = "Toggle eye tracking to camera";
    mouseEyeButton.onclick = () => this.toggleMouseEyeTracking();
    sequenceControls.appendChild(mouseEyeButton);
    
    // Add text to sign button
    const textToSignButton = document.createElement("button");
    textToSignButton.id = "text-to-sign-button";
    textToSignButton.className = "control-button text-to-sign-button";
    textToSignButton.innerHTML = "🔤 Text to Signs";
    textToSignButton.title = "Convert Dutch text to sign language sequence";
    textToSignButton.onclick = () => this.openTextToSignModal();
    sequenceControls.appendChild(textToSignButton);
    
    sequenceColumn.appendChild(sequenceControls);
    
    // Add eye rotation controls after the buttons
    this.createEyeRotationControls(sequenceColumn);
  }
  
  createEyeRotationControls(sequenceColumn) {
    // Create eye rotation control section
    const eyeRotationSection = document.createElement("div");
    eyeRotationSection.className = "eye-rotation-section";
    eyeRotationSection.style.marginTop = "15px";
    eyeRotationSection.style.padding = "10px";
    eyeRotationSection.style.backgroundColor = "#f9f9f9";
    eyeRotationSection.style.borderRadius = "8px";
    eyeRotationSection.style.border = "1px solid #e0e0e0";
    
    const eyeRotationTitle = document.createElement("h4");
    eyeRotationTitle.textContent = "Eyes Rotation Control (Both)";
    eyeRotationTitle.style.margin = "0 0 10px 0";
    eyeRotationTitle.style.fontSize = "14px";
    eyeRotationSection.appendChild(eyeRotationTitle);
    
    // Create sliders for X, Y, Z rotation
    const axes = ['X', 'Y', 'Z'];
    const sliderValues = { X: 0, Y: 0, Z: 0 };
    
    axes.forEach(axis => {
      const sliderRow = document.createElement("div");
      sliderRow.style.display = "flex";
      sliderRow.style.alignItems = "center";
      sliderRow.style.marginBottom = "8px";
      sliderRow.style.gap = "8px";
      
      const label = document.createElement("label");
      label.textContent = `${axis}:`;
      label.style.fontWeight = "bold";
      label.style.width = "20px";
      label.style.fontSize = "12px";
      sliderRow.appendChild(label);
      
      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = "-180";
      slider.max = "180";
      slider.step = "1";
      slider.value = "0";
      slider.id = `eye-rotation-${axis.toLowerCase()}`;
      slider.className = "eye-rotation-slider";
      slider.style.flex = "1";
      slider.style.minWidth = "100px";
      
      const valueDisplay = document.createElement("span");
      valueDisplay.id = `eye-rotation-${axis.toLowerCase()}-value`;
      valueDisplay.textContent = "0°";
      valueDisplay.style.fontWeight = "bold";
      valueDisplay.style.minWidth = "40px";
      valueDisplay.style.textAlign = "right";
      valueDisplay.style.fontSize = "11px";
      valueDisplay.style.backgroundColor = "#e0e0e0";
      valueDisplay.style.padding = "2px 4px";
      valueDisplay.style.borderRadius = "3px";
      
      // Add real-time rotation update
      slider.oninput = () => {
        const value = parseInt(slider.value);
        valueDisplay.textContent = `${value}°`;
        sliderValues[axis] = value;
        this.updateEyeRotation(sliderValues.X, sliderValues.Y, sliderValues.Z);
      };
      
      sliderRow.appendChild(slider);
      sliderRow.appendChild(valueDisplay);
      eyeRotationSection.appendChild(sliderRow);
    });
    
    // Reset button
    const resetButton = document.createElement("button");
    resetButton.className = "control-button";
    resetButton.textContent = "Reset";
    resetButton.style.marginTop = "8px";
    resetButton.style.fontSize = "12px";
    resetButton.style.padding = "4px 12px";
    resetButton.onclick = () => {
      axes.forEach(axis => {
        const slider = document.getElementById(`eye-rotation-${axis.toLowerCase()}`);
        const valueDisplay = document.getElementById(`eye-rotation-${axis.toLowerCase()}-value`);
        if (slider && valueDisplay) {
          slider.value = "0";
          valueDisplay.textContent = "0°";
          sliderValues[axis] = 0;
        }
      });
      this.updateEyeRotation(0, 0, 0);
    };
    eyeRotationSection.appendChild(resetButton);
    
    sequenceColumn.appendChild(eyeRotationSection);
  }

  createSequenceDropArea(sequenceColumn) {
    // Sequence drop area
    const sequenceDropArea = document.createElement("div");
    sequenceDropArea.id = "sequence-drop-area";
    sequenceDropArea.className = "sequence-drop-area";
    sequenceDropArea.addEventListener("dragover", this.handleDragOver);
    sequenceDropArea.addEventListener("drop", this.handleDrop);

    // Container for sequence items
    const sequenceContainer = document.createElement("div");
    sequenceContainer.id   = "sequence-container";
    sequenceContainer.className = "sequence-container";

    /* ⭐ NEW: keep a reference so other methods can attach listeners */
    this.sequenceContainer = sequenceContainer;

    // Initialize with empty message
    const emptyMessage = document.createElement("div");
    emptyMessage.className = "empty-message";
    emptyMessage.textContent = "Drag signs here to create a sequence";
    sequenceContainer.appendChild(emptyMessage);

    sequenceDropArea.appendChild(sequenceContainer);
    sequenceColumn.appendChild(sequenceDropArea);

    /* ──────────────────────────────────────────────────────────────
       HTML-5 DnD only fires dragover on the element that the pointer
       is *currently* above.  
       When the pointer is over an existing .sequence-item we were no
       longer over #sequence-drop-area, so handleDragOver never ran,
       dropPosition stayed null, and items were appended to the end.

       Fix = register the same handlers on the container *as well as*
       the dynamically created drop indicators.
    ────────────────────────────────────────────────────────────── */
    sequenceContainer.addEventListener("dragover", this.handleDragOver);
    sequenceContainer.addEventListener("drop",     this.handleDrop);
  }

  // Filter the sign library based on search input
  filterSignLibrary() {
    const searchInput = document.querySelector(".search-input");
    const searchTerm = searchInput.value.toLowerCase();

    if (!searchTerm) {
      // Show all items and folders when search is empty
      document.querySelectorAll(".sign-item").forEach(item => {
        item.style.display = "flex";
      });
      document.querySelectorAll(".folder-section").forEach(section => {
        section.style.display = "block";
      });
      return;
    }

    // Hide all folder sections first
    document.querySelectorAll(".folder-section").forEach(section => {
      section.style.display = "none";
    });

    // Show matching items and their parent folders
    const signItems = document.querySelectorAll(".sign-item");
    const visibleFolders = new Set();
    
    signItems.forEach((item) => {
      const signName = item.dataset.name.toLowerCase();
      const folder = item.dataset.folder;
      
      if (signName.includes(searchTerm)) {
        item.style.display = "flex";
        visibleFolders.add(folder);
      } else {
        item.style.display = "none";
      }
    });

    // Show folders that have visible items
    visibleFolders.forEach(folder => {
      const folderElement = document.querySelector(`[data-folder="${folder}"]`)?.closest('.folder-section');
      if (folderElement) {
        folderElement.style.display = "block";
        // Expand the folder content when searching
        const folderContent = folderElement.querySelector('.folder-content');
        const folderIcon = folderElement.querySelector('.folder-icon');
        if (folderContent && folderIcon) {
          folderContent.style.display = "block";
          folderIcon.textContent = "▼";
        }
      }
    });
  }

  // Handle search input with debouncing for API search
  handleSearchInput(searchTerm) {
    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Filter local signs immediately
    this.filterLocalSigns(searchTerm);

    // Set up debounced API search
    if (searchTerm.length >= 2) {
      this.searchTimeout = setTimeout(() => {
        this.searchAPIForSigns(searchTerm);
      }, 500); // 500ms delay
    } else {
      // Clear API results if search is too short
      this.clearAPIResults();
    }
  }

  // Perform combined local and API search
  async performSearch(searchTerm) {
    if (!searchTerm) {
      this.filterSignLibrary();
      this.clearAPIResults();
      return;
    }

    // Filter local signs
    this.filterLocalSigns(searchTerm);

    // Search API if term is long enough
    if (searchTerm.length >= 2) {
      await this.searchAPIForSigns(searchTerm);
    }
  }

  // Filter local signs (similar to filterSignLibrary but doesn't clear search)
  filterLocalSigns(searchTerm) {
    const lowerSearchTerm = searchTerm.toLowerCase();

    if (!lowerSearchTerm) {
      // Show all local signs
      document.querySelectorAll(".sign-item:not(.api-sign)").forEach(item => {
        item.style.display = "flex";
      });
      document.querySelectorAll(".folder-section").forEach(section => {
        section.style.display = "block";
      });
      return;
    }

    // Hide all folder sections first
    document.querySelectorAll(".folder-section").forEach(section => {
      section.style.display = "none";
    });

    // Show matching items and their parent folders
    const signItems = document.querySelectorAll(".sign-item:not(.api-sign)");
    const visibleFolders = new Set();
    
    signItems.forEach((item) => {
      const signName = item.dataset.name.toLowerCase();
      const folder = item.dataset.folder;
      
      if (signName.includes(lowerSearchTerm)) {
        item.style.display = "flex";
        visibleFolders.add(folder);
      } else {
        item.style.display = "none";
      }
    });

    // Show folders that have visible items
    visibleFolders.forEach(folder => {
      const folderElement = document.querySelector(`[data-folder="${folder}"]`)?.closest('.folder-section');
      if (folderElement) {
        folderElement.style.display = "block";
        // Expand the folder content when searching
        const folderContent = folderElement.querySelector('.folder-content');
        const folderIcon = folderElement.querySelector('.folder-icon');
        if (folderContent && folderIcon) {
          folderContent.style.display = "block";
          folderIcon.textContent = "▼";
        }
      }
    });
  }

  // Search API for signs
  async searchAPIForSigns(searchTerm) {
    try {
      this.showAPILoading();
      
      const results = await this.signCollectAPI.searchAnimations(searchTerm);
      
      if (results && results.animations && results.animations.length > 0) {
        // Filter out signs we already have locally
        const newSigns = results.animations.filter(apiSign => 
          !this.availableSigns.find(localSign => localSign.name === apiSign.glos)
        );
        
        this.apiSearchResults = newSigns;
        this.displayAPIResults(newSigns);
      } else {
        this.clearAPIResults();
        this.showAPIError("No results found");
      }
    } catch (error) {
      console.error("API search error:", error);
      this.showAPIError("Error searching online signs");
    }
  }

  // Clear API search results from the UI
  clearAPIResults() {
    const apiSection = document.querySelector(".api-results-section");
    if (apiSection) {
      apiSection.remove();
    }
    this.apiSearchResults = [];
  }

  // Show loading state for API search
  showAPILoading() {
    this.clearAPIResults();
    
    const library = document.getElementById("sign-library");
    const apiSection = document.createElement("div");
    apiSection.className = "api-results-section folder-section";
    apiSection.innerHTML = `
      <div class="folder-header">
        <span class="folder-icon">🔍</span>
        <span class="folder-name">Online Results</span>
        <span class="folder-count">Loading...</span>
      </div>
      <div class="folder-content" style="display: block;">
        <div class="loading-message" style="padding: 10px; text-align: center; color: #666;">
          Searching online signs...
        </div>
      </div>
    `;
    
    // Insert at the beginning of the library
    library.insertBefore(apiSection, library.firstChild);
  }

  // Show error message for API search
  showAPIError(message) {
    const apiSection = document.querySelector(".api-results-section");
    if (apiSection) {
      const content = apiSection.querySelector(".folder-content");
      content.innerHTML = `
        <div class="error-message" style="padding: 10px; text-align: center; color: #e74c3c;">
          ${message}
        </div>
      `;
    }
  }

  // Display API search results
  displayAPIResults(results) {
    this.clearAPIResults();
    
    if (results.length === 0) return;
    
    const library = document.getElementById("sign-library");
    const apiSection = document.createElement("div");
    apiSection.className = "api-results-section folder-section";
    
    // Create folder header
    const folderHeader = document.createElement("div");
    folderHeader.className = "folder-header";
    folderHeader.innerHTML = `
      <span class="folder-icon">▼</span>
      <span class="folder-name">🌐 Online Results</span>
      <span class="folder-count">(${results.length})</span>
    `;
    
    // Create folder content
    const folderContent = document.createElement("div");
    folderContent.className = "folder-content";
    folderContent.style.display = "block"; // Start expanded
    
    // Add each API result
    results.forEach(apiSign => {
      const signItem = this.createAPISignItem(apiSign);
      folderContent.appendChild(signItem);
    });
    
    // Toggle functionality
    folderHeader.onclick = () => {
      const isCollapsed = folderContent.style.display === 'none';
      folderContent.style.display = isCollapsed ? 'block' : 'none';
      folderHeader.querySelector('.folder-icon').textContent = isCollapsed ? '▼' : '▶';
    };
    
    apiSection.appendChild(folderHeader);
    apiSection.appendChild(folderContent);
    
    // Insert at the beginning of the library
    library.insertBefore(apiSection, library.firstChild);
  }

  // Create sign item for API result
  createAPISignItem(animation) {
    const signItem = document.createElement('div');
    signItem.className = 'sign-item api-sign';
    signItem.dataset.name = animation.glos || animation.filename;
    signItem.dataset.filename = animation.filename;
    signItem.dataset.fileUrl = animation.file_url;
    signItem.dataset.isApi = 'true';
    
    // Make draggable
    signItem.draggable = true;
    signItem.addEventListener('dragstart', async (e) => {
      // Download the file if not already cached
      try {
        signItem.classList.add('downloading');
        const cachedUrl = await this.signCollectAPI.getCachedFileUrl(animation);
        
        // Create a temporary sign object
        const apiSign = {
          name: animation.glos || animation.filename.replace(/\.(glb|fbx)$/i, ''),
          file: cachedUrl,
          isApi: true,
          originalUrl: animation.file_url,
          filename: animation.filename.replace(/\.fbx$/i, '.glb')
        };
        
        // Store in drag data
        e.dataTransfer.setData('text/plain', JSON.stringify(apiSign));
        signItem.classList.remove('downloading');
        signItem.classList.add('dragging');
      } catch (error) {
        console.error('Error preparing API sign for drag:', error);
        e.preventDefault();
        this.showNotification('Failed to download animation', 'error');
      }
    });
    
    signItem.addEventListener('dragend', () => {
      signItem.classList.remove('dragging');
      signItem.classList.remove('downloading');
    });
    
    // Sign info
    const signInfo = document.createElement('div');
    signInfo.className = 'sign-info';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'sign-name';
    nameSpan.textContent = animation.glos || animation.filename.replace(/\.(glb|fbx)$/i, '');
    signInfo.appendChild(nameSpan);
    
    const sourceSpan = document.createElement('span');
    sourceSpan.className = 'sign-description';
    const displayFilename = animation.filename.replace(/\.fbx$/i, '.glb');
    sourceSpan.textContent = 'Online: ' + displayFilename;
    signInfo.appendChild(sourceSpan);
    
    signItem.appendChild(signInfo);
    
    // Controls
    const controls = document.createElement('div');
    controls.className = 'sign-controls';
    
    // Download/Play button
    const playButton = document.createElement('button');
    playButton.className = 'play-button';
    playButton.innerHTML = '▶';
    playButton.title = 'Download & Play';
    playButton.onclick = async (e) => {
      e.stopPropagation();
      try {
        playButton.disabled = true;
        playButton.innerHTML = '⏳';
        
        const cachedUrl = await this.signCollectAPI.getCachedFileUrl(animation);
        console.log('Got cached URL for play:', cachedUrl);
        const apiSign = {
          name: animation.glos || animation.filename.replace(/\.(glb|fbx)$/i, ''),
          file: cachedUrl,
          isApi: true
        };
        
        playButton.innerHTML = '▶';
        await this.animationController.playSign(apiSign.name, signItem, apiSign);
        
        playButton.disabled = false;
      } catch (error) {
        console.error('Error playing API animation:', error);
        playButton.innerHTML = '❌';
        this.showNotification('Failed to load animation', 'error');
        setTimeout(() => {
          playButton.innerHTML = '▶';
          playButton.disabled = false;
        }, 2000);
      }
    };
    controls.appendChild(playButton);
    
    // Add to sequence button
    const addButton = document.createElement('button');
    addButton.className = 'add-button';
    addButton.innerHTML = '+';
    addButton.title = 'Add to sequence';
    addButton.onclick = async (e) => {
      e.stopPropagation();
      try {
        addButton.disabled = true;
        addButton.innerHTML = '⏳';
        
        const cachedUrl = await this.signCollectAPI.getCachedFileUrl(animation);
        const apiSign = {
          name: animation.glos || animation.filename.replace(/\.(glb|fbx)$/i, ''),
          file: cachedUrl,
          isApi: true,
          originalUrl: animation.file_url,
          filename: animation.filename.replace(/\.fbx$/i, '.glb')
        };
        
        // Add to sequence
        this.addToSequence(apiSign);
        
        addButton.innerHTML = '✓';
        this.showNotification(`Added "${apiSign.name}" to sequence`, 'success');
        
        setTimeout(() => {
          addButton.innerHTML = '+';
          addButton.disabled = false;
        }, 1000);
      } catch (error) {
        console.error('Error adding API animation to sequence:', error);
        addButton.innerHTML = '❌';
        this.showNotification('Failed to add animation', 'error');
        setTimeout(() => {
          addButton.innerHTML = '+';
          addButton.disabled = false;
        }, 2000);
      }
    };
    controls.appendChild(addButton);
    
    signItem.appendChild(controls);
    return signItem;
  }

  // Function to add the signs to the library with folder sections
  populateSignLibrary() {
    const library = document.getElementById("sign-library");

    // Group signs by folder
    const folderGroups = {};
    this.availableSigns.forEach(sign => {
      const folder = sign.folder || 'root';
      if (!folderGroups[folder]) {
        folderGroups[folder] = [];
      }
      folderGroups[folder].push(sign);
    });

    // Sort signs within each folder
    Object.keys(folderGroups).forEach(folderKey => {
      folderGroups[folderKey].sort((a, b) => {
        const getSortCategory = (name) => {
          const trimmed = name.trim();
          if (/^[A-Z]/.test(trimmed)) return 0; // Starts with a letter
          if (/^\d+$/.test(trimmed)) return 1; // Pure number
          if (/^\d+ /.test(trimmed)) return 2; // Number with words (e.g., "5 OVER")
          return 3; // Catch-all for anything else
        };
        const aCategory = getSortCategory(a.name);
        const bCategory = getSortCategory(b.name);

        if (aCategory !== bCategory) {
          return aCategory - bCategory; // Sort by category first
        }

        return a.name.localeCompare(b.name); // Sort alphabetically
      });
    });

    // Define folder display names and order
    const folderDisplayNames = {
      'root': '📁 General Signs',
      'trein': '🚂 Train Signs',
      'hh-gebaar': '👋 HH Gebaar',
      'hh-zin': '💬 HH Zinnen'
    };

    const folderOrder = ['root', 'trein', 'hh-gebaar', 'hh-zin'];

    // Create collapsible sections for each folder
    folderOrder.forEach(folderKey => {
      if (!folderGroups[folderKey]) return;

      const signs = folderGroups[folderKey];
      const displayName = folderDisplayNames[folderKey] || folderKey;

      // Create folder section
      const folderSection = document.createElement("div");
      folderSection.className = "folder-section";

      // Create folder header (clickable)
      const folderHeader = document.createElement("div");
      folderHeader.className = "folder-header";
      folderHeader.innerHTML = `
        <span class="folder-icon">▶</span>
        <span class="folder-name">${displayName}</span>
        <span class="folder-count">(${signs.length})</span>
      `;

      // Create folder content (collapsible)
      const folderContent = document.createElement("div");
      folderContent.className = "folder-content";
      folderContent.style.display = "none"; // Start closed

      // Add signs to folder content
      signs.forEach(sign => {
        const signItem = this.createSignItem(sign);
        folderContent.appendChild(signItem);
      });

      // Toggle functionality
      folderHeader.onclick = () => {
        const isCollapsed = folderContent.style.display === 'none';
        folderContent.style.display = isCollapsed ? 'block' : 'none';
        folderHeader.querySelector('.folder-icon').textContent = isCollapsed ? '▼' : '▶';
      };

      folderSection.appendChild(folderHeader);
      folderSection.appendChild(folderContent);
      library.appendChild(folderSection);
    });
  }

  // Helper method to create individual sign items
  createSignItem(sign) {
    const signItem = document.createElement("div");
    signItem.className = "sign-item";
    signItem.dataset.name = sign.name;
    signItem.dataset.folder = sign.folder || 'root';

    // Make the sign item draggable
    signItem.draggable = true;
    signItem.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", sign.name);
      signItem.classList.add("dragging");
    });

    signItem.addEventListener("dragend", () => {
      signItem.classList.remove("dragging");
    });

    // Sign name
    const signInfo = document.createElement("div");
    signInfo.className = "sign-info";

    const nameSpan = document.createElement("span");
    nameSpan.className = "sign-name";
    nameSpan.textContent = sign.name;
    signInfo.appendChild(nameSpan);

    // Frame info display
    const frameInfo = document.createElement("span");
    frameInfo.id = `frame-info-${sign.name}`;
    frameInfo.className = "sign-description";
    frameInfo.textContent = `Frames: ${availableSignsMap[sign.name].start} - ${availableSignsMap[sign.name].end}`;
    signInfo.appendChild(frameInfo);

    signItem.appendChild(signInfo);

    // Controls container
    const controls = document.createElement("div");
    controls.className = "sign-controls";

    // Play button
    const playButton = document.createElement("button");
    playButton.className = "play-button";
    playButton.innerHTML = "Play";
    playButton.onclick = async (e) => {
      e.stopPropagation();
      this.animationController.playSign(sign.name, signItem);
    };
    controls.appendChild(playButton);

    // Edit frames button
    const editButton = document.createElement("button");
    editButton.className = "edit-button";
    editButton.innerHTML = "⚙";
    editButton.title = `Edit frames for "${sign.name}"`;
    editButton.onclick = async (e) => {
      e.stopPropagation();
      const animationGroup = await this.characterController.loadAnimation(sign.name);
      this.showFrameEditor(sign, frameInfo, animationGroup);
    };
    controls.appendChild(editButton);

    signItem.appendChild(controls);
    return signItem;
  }

  updateLibraryFrames() {
    const signItems = document.querySelectorAll(".sign-item");
    signItems.forEach((item) => {
      const signName = item.dataset.name;
      const frameInfo = document.getElementById(`frame-info-${signName}`);
      if (frameInfo) {
        frameInfo.textContent = `Frames: ${availableSignsMap[signName].start} - ${availableSignsMap[signName].end}`;
      }
    });
  }

  // Update the sequence UI
  updateSequenceUI() {
    
    const sequenceContainer = document.getElementById("sequence-container");
    sequenceContainer.innerHTML = "";

    if (this.sequenceItems.length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.className = "empty-message";
      emptyMessage.textContent = "Drag signs here to create a sequence";
      sequenceContainer.appendChild(emptyMessage);

      // Disable control buttons when sequence is empty
      const controlButtons = document.querySelectorAll(".control-button");
      controlButtons.forEach((button) => {
        button.disabled = true;
      });
      // Except the load button which should always be enabled
      const loadButton = document.getElementById("load-sequence-button");
      if (loadButton) {
        loadButton.disabled = false;
      }
      // Mouse eye button should always be enabled
      const mouseEyeButton = document.getElementById("mouse-eye-button");
      if (mouseEyeButton) {
        mouseEyeButton.disabled = false;
      }
      // Text to sign button should always be enabled
      const textToSignButton = document.getElementById("text-to-sign-button");
      if (textToSignButton) {
        textToSignButton.disabled = false;
      }
      return;
    }

    // Enable play and record buttons when sequence has items
    const controlButtons = document.querySelectorAll(".control-button");
    controlButtons.forEach((button) => {
      button.disabled = false;
    });
    
    // Autosave when sequence changes
    this.autosave();

    // No drop indicators needed for button-based reordering

    // Create sequence items
    this.sequenceItems.forEach((item, index) => {
      const sequenceItem = document.createElement("div");
      sequenceItem.className = "sequence-item";
      sequenceItem.id = `sequence-item-${index + 1}`;
      sequenceItem.dataset.id = item.id;

      // Sign name and info
      const signInfo = document.createElement("div");
      signInfo.className = "sequence-item-info";

      const nameSpan = document.createElement("span");
      nameSpan.className = "sequence-item-name";
      nameSpan.textContent = item.sign.takeNumber > 1 ? `${item.sign.name} (Take ${item.sign.takeNumber})` : item.sign.name;
      signInfo.appendChild(nameSpan);

      // Frame range display
      const frameSpan = document.createElement("span");
      frameSpan.className = "sequence-item-frames";
      frameSpan.id = `sequence-frame-info-${item.id}`;

      // Use the item's own frame range instead of the global one
      frameSpan.textContent = `Frames: ${item.frameRange.start} - ${item.frameRange.end}`;
      signInfo.appendChild(frameSpan);
      
      // Blending speed control
      const blendingControl = document.createElement("div");
      blendingControl.className = "blending-speed-control";
      
      const blendingLabel = document.createElement("span");
      blendingLabel.className = "blending-label";
      blendingLabel.textContent = "Blend: ";
      blendingControl.appendChild(blendingLabel);
      
      const blendingSlider = document.createElement("input");
      blendingSlider.type = "range";
      blendingSlider.className = "blending-speed-slider";
      blendingSlider.min = "0.01";
      blendingSlider.max = "0.13";
      blendingSlider.step = "0.01";
      blendingSlider.value = item.blendingSpeed || "0.05";
      blendingSlider.id = `blending-slider-${item.id}`;
      
      const blendingValue = document.createElement("span");
      blendingValue.className = "blending-value";
      blendingValue.textContent = blendingSlider.value;
      blendingValue.id = `blending-value-${item.id}`;
      
      blendingSlider.oninput = (e) => {
        const value = parseFloat(e.target.value);
        blendingValue.textContent = value.toFixed(2);
        // Update the item's blending speed
        item.blendingSpeed = value;
        // Trigger autosave
        this.autosave();
      };
      
      blendingControl.appendChild(blendingSlider);
      blendingControl.appendChild(blendingValue);
      signInfo.appendChild(blendingControl);

      sequenceItem.appendChild(signInfo);

      // Controls
      const controls = document.createElement("div");
      controls.className = "sequence-item-controls";

      // Play button
      const playButton = document.createElement("button");
      playButton.className = "play-button small-button";
      playButton.innerHTML = "▶";
      playButton.title = `Play "${item.sign.name}"`;
      playButton.onclick = async () => {
        console.log("Playing sequence item:", item);
        console.log("Sign object:", item.sign);
        console.log("Is API?", item.sign.isApi);
        
        // Prepare API sign if needed
        let apiSign = null;
        if (item.sign.isApi) {
          apiSign = {
            name: item.sign.name,
            file: item.sign.file,
            isApi: true,
            originalUrl: item.sign.originalUrl,
            filename: item.sign.filename
          };
          console.log("Created API sign object:", apiSign);
        }
        
        // For sequence items, apply their specific frame range
        const animationGroup = await this.characterController.loadAnimation(item.sign.name, false, apiSign);
        if (animationGroup && item.frameRange) {
          animationGroup.normalize(item.frameRange.start, item.frameRange.end);
        }
        this.animationController.playSign(item.sign.name, sequenceItem, apiSign);
      };
      controls.appendChild(playButton);

      const editButton = document.createElement("button");
      editButton.className = "edit-button small-button";
      editButton.innerHTML = "⚙";
      editButton.title = `Edit frames for "${item.sign.name}"`;
      editButton.onclick = async (e) => {
        e.stopPropagation();
        console.log("Editing sign:", item);
        // Prepare API sign if needed
        let apiSign = null;
        if (item.sign.isApi) {
          apiSign = {
            name: item.sign.name,
            file: item.sign.file,
            isApi: true,
            originalUrl: item.sign.originalUrl,
            filename: item.sign.filename
          };
        }
        
        // Load animation to get actual frame count
        const animationGroup = await this.characterController.loadAnimation(item.sign.name, false, apiSign);
        this.showFrameEditor(item.sign, frameSpan, animationGroup, item);
      };
      controls.appendChild(editButton);

      // Move up button
      const moveUpButton = document.createElement("button");
      moveUpButton.className = "move-up-button small-button";
      moveUpButton.innerHTML = "↑";
      moveUpButton.title = "Move up";
      moveUpButton.disabled = index === 0; // Disable if first item
      moveUpButton.onclick = () => this.moveSequenceItemUp(item.id);
      controls.appendChild(moveUpButton);

      // Move down button
      const moveDownButton = document.createElement("button");
      moveDownButton.className = "move-down-button small-button";
      moveDownButton.innerHTML = "↓";
      moveDownButton.title = "Move down";
      moveDownButton.disabled = index === this.sequenceItems.length - 1; // Disable if last item
      moveDownButton.onclick = () => this.moveSequenceItemDown(item.id);
      controls.appendChild(moveDownButton);

      // Clone button
      const cloneButton = document.createElement("button");
      cloneButton.className = "clone-button small-button";
      cloneButton.innerHTML = "⎘";
      cloneButton.title = "Clone last frame as static hold";
      cloneButton.onclick = () => this.cloneLastFrameOfSign(item);
      controls.appendChild(cloneButton);

      // Remove button
      const removeButton = document.createElement("button");
      removeButton.className = "remove-button small-button";
      removeButton.innerHTML = "×";
      removeButton.title = "Remove from sequence";
      removeButton.onclick = () => this.removeFromSequence(item.id);
      controls.appendChild(removeButton);

      sequenceItem.appendChild(controls);
      sequenceContainer.appendChild(sequenceItem);
    });
  }

  // Handle drag over the sequence area
  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    
    // Find the closest sequence item to determine drop position
    const beforeElement = this.getDragBeforeElement(e.clientY);
    
    if (beforeElement == null) {
      // Drop at the end
      this.dropPosition = this.sequenceItems.length;
    } else {
      // Find the index of this element - we want to insert BEFORE it
      const allItems = [...document.querySelectorAll('.sequence-item')];
      const elementIndex = allItems.indexOf(beforeElement);
      this.dropPosition = elementIndex;
    }
    
    
    // Update visual indicators
    this.updateDropIndicator(this.dropPosition);
  }
  
  // Get the element before which we should insert
  getDragBeforeElement(y) {
    const draggableElements = [...document.querySelectorAll('.sequence-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
  
  // Update visual drop indicator
  updateDropIndicator(position) {
    // Remove all active indicators
    document.querySelectorAll(".drop-indicator").forEach((indicator) => {
      indicator.classList.remove("active");
      indicator.style.background = "transparent";
    });
    
    // Activate the appropriate indicator
    const indicators = document.querySelectorAll('.drop-indicator');
    if (indicators[position]) {
      indicators[position].classList.add("active");
      indicators[position].style.background = "#51a7ff";
    }
  }

  // Handle dropping a sign into the sequence area
  handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    
    // Remove any drop indicators
    document.querySelectorAll('.drop-indicator').forEach(indicator => {
      indicator.classList.remove('active');
    });

    // Check if this is a reorder operation
    const dragType = e.dataTransfer.getData("text/plain");
    
    // Only handle adding from library (reordering now uses buttons)
    {
      // Handle adding new sign from library
      const signName = dragType; // The drag type IS the sign name for library items
      if (!signName || signName === '') return;

      const sign = this.availableSigns.find((s) => s.name === signName);
      if (!sign) return;

      // Use the tracked drop position
      if (this.dropPosition !== null) {
        this.insertToSequence(sign, this.dropPosition);
      } else {
        // Fallback: add to the end
        this.addToSequence(sign);
      }
    }
    
    // Reset drop position
    this.dropPosition = null;
  }

  // Insert a sign at a specific position in the sequence
  insertToSequence(sign, position) {
    // Generate a unique ID for this sequence item
    const itemId = this.nextItemId++;
    
    // Create a deep clone of the sign to avoid modifying the original
    const clonedSign = { ...sign };
    
    // Copy the frame values from availableSignsMap or use defaults for API/generated signs
    if (sign.isApi || sign.isGenerated) {
      // For API signs and generated signs, use the provided values or defaults
      clonedSign.start = sign.start || 0;
      clonedSign.end = sign.end || null;
    } else {
      const frameData = availableSignsMap[sign.name];
      if (frameData) {
        clonedSign.start = frameData.start;
        clonedSign.end = frameData.end;
      } else {
        // Fallback if not in map
        clonedSign.start = sign.start || 0;
        clonedSign.end = sign.end || null;
      }
    }
    
    // Count how many times this sign appears in the sequence already
    const takeNumber = this.sequenceItems.filter(item => item.sign.name === sign.name).length + 1;
    
    // Add take number to the cloned sign
    clonedSign.takeNumber = takeNumber;
    
    // Insert at the specified position
    this.sequenceItems.splice(position, 0, {
      id: itemId,
      sign: clonedSign,
      frameRange: {
        start: clonedSign.start,
        end: clonedSign.end
      },
      blendingSpeed: 0.05 // Default blending speed
    });

    // Update the UI
    this.updateSequenceUI();
  }

  // Add a sign to the sequence
  addToSequence(sign) {
    // Generate a unique ID for this sequence item
    const itemId = this.nextItemId++;
    
    // Create a deep clone of the sign to avoid modifying the original
    const clonedSign = { ...sign };
    
    // Copy the frame values from availableSignsMap or use defaults for API/generated signs
    if (sign.isApi || sign.isGenerated) {
      // For API signs and generated signs, use the provided values or defaults
      clonedSign.start = sign.start || 0;
      clonedSign.end = sign.end || null;
    } else {
      const frameData = availableSignsMap[sign.name];
      if (frameData) {
        clonedSign.start = frameData.start;
        clonedSign.end = frameData.end;
      } else {
        // Fallback if not in map
        clonedSign.start = sign.start || 0;
        clonedSign.end = sign.end || null;
      }
    }
    
    // Count how many times this sign appears in the sequence already
    const takeNumber = this.sequenceItems.filter(item => item.sign.name === sign.name).length + 1;
    
    // Add take number to the cloned sign
    clonedSign.takeNumber = takeNumber;

    // Add to our sequence data with its own frame range
    this.sequenceItems.push({
      id: itemId,
      sign: clonedSign,
      frameRange: {
        start: clonedSign.start,
        end: clonedSign.end
      },
      blendingSpeed: 0.05 // Default blending speed
    });

    // Update the UI
    this.updateSequenceUI();
  }

  // Create a drop indicator element
  createDropIndicator(position) {
    const indicator = document.createElement("div");
    indicator.className = "drop-indicator";
    indicator.dataset.position = position;

    /* Small visual cue so the user sees the target */
    indicator.style.height = "4px";
    indicator.style.margin = "2px 0";
    indicator.style.background = "transparent";
    indicator.style.transition = "background 120ms";

    return indicator;
  }

  // Show frame editor modal for a specific sign
  showFrameEditor(sign, frameInfoElement, animationGroup, sequenceItem = null) {
    this.frameEditor.show(sign, frameInfoElement, animationGroup, sequenceItem);
  }

  // Remove an item from the sequence
  removeFromSequence(itemId) {
    this.sequenceItems = this.sequenceItems.filter(
      (item) => item.id !== itemId
    );
    this.updateSequenceUI();
  }
  
  // Generate sequence name from signs
  generateSequenceName() {
    // Generate name from first few signs in sequence
    if (this.sequenceItems.length === 0) {
      return "Empty Sequence";
    }
    
    // Take first 3 signs and join their names
    const signNames = this.sequenceItems
      .slice(0, 3)
      .map(item => item.sign.name)
      .join("-");
    
    // Add "..." if there are more than 3 signs
    const suffix = this.sequenceItems.length > 3 ? "..." : "";
    
    return signNames + suffix;
  }
  
  // Autosave functionality
  autosave() {
    if (!this.autosaveEnabled || this.sequenceItems.length === 0) {
      return;
    }
    
    // Clear existing timer
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
    }
    
    // Set new timer for autosave (2 seconds after last change)
    this.autosaveTimer = setTimeout(async () => {
      try {
        const autoSaveName = "Autosave: " + this.generateSequenceName();
        
        // Save to API with proper parameters
        const result = await this.sequencerAPI.saveSequence(
          autoSaveName,
          this.sequenceItems,
          { sequence_id: this.currentSequenceId }
        );
        if (result.success) {
          this.showNotification("Autosaved", "success");
          // Update current sequence ID for future saves
          if (result.id) {
            this.currentSequenceId = result.id;
          }
        }
      } catch (error) {
        console.error("Autosave failed:", error);
      }
    }, 2000); // 2 second delay
  }
  
  // Reorder a sequence item to a new position
  reorderSequenceItem(itemId, newPosition) {
    const currentIndex = this.sequenceItems.findIndex(item => item.id === itemId);
    if (currentIndex === -1) return;
    
    // Remove the item from its current position
    const [movedItem] = this.sequenceItems.splice(currentIndex, 1);
    
    // Adjust new position if necessary (if moving from before the target position)
    let adjustedPosition = newPosition;
    if (currentIndex < newPosition) {
      adjustedPosition = newPosition - 1;
    }
    
    // Insert at the new position
    this.sequenceItems.splice(adjustedPosition, 0, movedItem);
    
    // Update the UI
    this.updateSequenceUI();
  }
  
  // Move a sequence item up one position
  moveSequenceItemUp(itemId) {
    const currentIndex = this.sequenceItems.findIndex(item => item.id === itemId);
    if (currentIndex <= 0) return; // Can't move up if first item or not found
    
    // Swap with previous item
    [this.sequenceItems[currentIndex], this.sequenceItems[currentIndex - 1]] = 
    [this.sequenceItems[currentIndex - 1], this.sequenceItems[currentIndex]];
    
    this.updateSequenceUI();
  }
  
  // Move a sequence item down one position
  moveSequenceItemDown(itemId) {
    const currentIndex = this.sequenceItems.findIndex(item => item.id === itemId);
    if (currentIndex === -1 || currentIndex >= this.sequenceItems.length - 1) return; // Can't move down if last item or not found
    
    // Swap with next item
    [this.sequenceItems[currentIndex], this.sequenceItems[currentIndex + 1]] = 
    [this.sequenceItems[currentIndex + 1], this.sequenceItems[currentIndex]];
    
    this.updateSequenceUI();
  }

    // Show notification to user
  showNotification(message, type = "info") {
    // Remove any existing notifications
    const existingNotification = document.querySelector(".notification");
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add to body
    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }

  // Show save dialog
  showSaveDialog() {
    // Create modal
    const modal = document.createElement("div");
    modal.className = "save-load-modal";
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

    const dialog = document.createElement("div");
    dialog.className = "save-dialog";
    dialog.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      min-width: 300px;
    `;

    const autoGeneratedName = this.generateSequenceName();
    
    dialog.innerHTML = `
      <h3>Save Sequence</h3>
      <input type="text" id="sequence-name-input" placeholder="Enter sequence name" 
             value="${autoGeneratedName}" 
             style="width: 100%; padding: 8px; margin: 10px 0; box-sizing: border-box;">
      <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 15px;">
        <button class="cancel-button" style="padding: 8px 16px;">Cancel</button>
        <button class="save-button" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px;">Save</button>
      </div>
    `;

    modal.appendChild(dialog);
    document.body.appendChild(modal);

    // Focus on input
    const input = dialog.querySelector("#sequence-name-input");
    input.focus();
    input.select();

    // Handle save
    const saveBtn = dialog.querySelector(".save-button");
    const cancelBtn = dialog.querySelector(".cancel-button");

    const handleSave = async () => {
      const sequenceName = input.value.trim();
      if (!sequenceName) {
        this.showNotification("Please enter a sequence name", "error");
        return;
      }

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";

        const options = {};
        if (this.currentSequenceId) {
          options.sequence_id = this.currentSequenceId;
        }

        const response = await this.sequencerAPI.saveSequence(
          sequenceName,
          this.sequenceItems,
          options
        );

        if (response.success) {
          this.currentSequenceId = response.data.sequence_id;
          this.showNotification(
            `Sequence "${sequenceName}" saved successfully!`,
            "success"
          );
          document.body.removeChild(modal);
        } else {
          throw new Error(response.error || "Failed to save sequence");
        }
      } catch (error) {
        this.showNotification(`Error saving sequence: ${error.message}`, "error");
        saveBtn.disabled = false;
        saveBtn.textContent = "Save";
      }
    };

    saveBtn.onclick = handleSave;
    cancelBtn.onclick = () => document.body.removeChild(modal);
    input.onkeypress = (e) => {
      if (e.key === "Enter") handleSave();
    };
  }

  // Show load dialog
  async showLoadDialog() {
    // Create modal
    const modal = document.createElement("div");
    modal.className = "save-load-modal";
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

    const dialog = document.createElement("div");
    dialog.className = "load-dialog";
    dialog.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      min-width: 400px;
      max-width: 600px;
      max-height: 500px;
      display: flex;
      flex-direction: column;
    `;

    dialog.innerHTML = `
      <h3>Load Sequence</h3>
      <input type="text" id="search-sequences" placeholder="Search sequences..." 
             style="width: 100%; padding: 8px; margin: 10px 0; box-sizing: border-box;">
      <div id="sequences-list" style="flex: 1; overflow-y: auto; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; padding: 10px;">
        <p>Loading sequences...</p>
      </div>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button class="cancel-button" style="padding: 8px 16px;">Cancel</button>
      </div>
    `;

    modal.appendChild(dialog);
    document.body.appendChild(modal);

    const searchInput = dialog.querySelector("#search-sequences");
    const sequencesList = dialog.querySelector("#sequences-list");
    const cancelBtn = dialog.querySelector(".cancel-button");

    // Load sequences
    const loadSequences = async (search = "") => {
      try {
        const params = { limit: 20 };
        if (search) params.search = search;

        const response = await this.sequencerAPI.getSequences(params);
        
        if (response.success && response.data.sequences.length > 0) {
          sequencesList.innerHTML = response.data.sequences
            .map(
              (seq) => `
              <div class="sequence-item-load" style="padding: 10px; margin: 5px 0; border: 1px solid #eee; border-radius: 4px; cursor: pointer;" 
                   data-id="${seq.id}">
                <div style="font-weight: bold;">${seq.sequence_name}</div>
                <div style="font-size: 0.9em; color: #666;">
                  ${seq.items.length} signs • Created: ${new Date(seq.created_at).toLocaleDateString()}
                </div>
              </div>
            `
            )
            .join("");

          // Add click handlers
          dialog.querySelectorAll(".sequence-item-load").forEach((item) => {
            item.onmouseover = () => (item.style.backgroundColor = "#f0f0f0");
            item.onmouseout = () => (item.style.backgroundColor = "white");
            item.onclick = async () => {
              const sequenceId = parseInt(item.dataset.id);
              await this.loadSequence(sequenceId);
              document.body.removeChild(modal);
            };
          });
        } else {
          sequencesList.innerHTML = "<p>No sequences found</p>";
        }
      } catch (error) {
        sequencesList.innerHTML = `<p style="color: red;">Error loading sequences: ${error.message}</p>`;
      }
    };

    // Initial load
    loadSequences();

    // Search functionality
    let searchTimeout;
    searchInput.oninput = (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadSequences(e.target.value);
      }, 300);
    };

    cancelBtn.onclick = () => document.body.removeChild(modal);
  }

  // Load a sequence by ID
  async loadSequence(sequenceId) {
    try {
      const sequence = await this.sequencerAPI.getSequenceById(sequenceId);
      
      // Clear current sequence
      this.sequenceItems = [];
      this.currentSequenceId = sequenceId;
      
      // Load each item
      for (const item of sequence.items) {
        // Find the sign in available signs or reconstruct API sign
        let sign = this.availableSigns.find(s => s.name === item.sign_name);
        
        // If not found locally and has API metadata, reconstruct as API sign
        if (!sign && item.item_data && item.item_data.is_api) {
          // Create a minimal animation object for getCachedFileUrl
          const animation = {
            filename: item.item_data.filename,
            file_url: item.item_data.file_url
          };
          
          // Get cached URL (this will download if not already cached)
          const cachedUrl = await this.signCollectAPI.getCachedFileUrl(animation);
          
          sign = {
            name: item.sign_name,
            file: cachedUrl,
            isApi: true,
            originalUrl: item.item_data.file_url,
            filename: item.item_data.filename
          };
        }
        
        if (sign) {
          // Create sequence item with saved frame ranges
          const itemId = this.nextItemId++;
          const clonedSign = { ...sign };
          clonedSign.takeNumber = item.take_number;
          
          this.sequenceItems.push({
            id: itemId,
            sign: clonedSign,
            frameRange: {
              start: item.frame_start,
              end: item.frame_end
            },
            blendingSpeed: item.blending_speed || 0.05
          });
        } else {
          console.warn(`Sign "${item.sign_name}" not found in library`);
        }
      }
      
      // Update UI
      this.updateSequenceUI();
      this.showNotification(`Loaded sequence: ${sequence.sequence_name}`, "success");
      
    } catch (error) {
      this.showNotification(`Error loading sequence: ${error.message}`, "error");
    }
  }
  
  // Toggle mouse eye tracking
  toggleMouseEyeTracking() {
    try {
      if (!this.characterController) {
        this.showNotification("Character controller not initialized", "error");
        return;
      }
      
      // Toggle the mouse eye tracking
      const isTracking = this.characterController.toggleMouseEyeTracking();
      
      // Update button appearance
      const button = document.getElementById("mouse-eye-button");
      if (button) {
        if (isTracking) {
          button.classList.add("active");
          button.innerHTML = "👁️ Camera Track (ON)";
        } else {
          button.classList.remove("active");
          button.innerHTML = "👁️ Camera Track";
        }
      }
      
      this.showNotification(
        isTracking ? "Camera eye tracking enabled" : "Camera eye tracking disabled", 
        "success"
      );
      
    } catch (error) {
      console.error("Error toggling mouse eye tracking:", error);
      this.showNotification(`Error toggling mouse eye tracking: ${error.message}`, "error");
    }
  }
  
  // Update eye rotation
  updateEyeRotation(x, y, z) {
    if (!this.characterController) {
      console.warn("Character controller not initialized");
      return;
    }
    
    const success = this.characterController.setEyeRotation(x, y, z);
    if (!success) {
      console.warn("Failed to set eye rotation");
    }
  }

  // Clone the last frame of a specific sign to create a static hold animation
  async cloneLastFrameOfSign(sequenceItem) {
    const sign = sequenceItem.sign;
    const frameRange = sequenceItem.frameRange;
    
    try {
      // Load the animation to get the actual frame data
      let apiSign = null;
      if (sign.isApi) {
        apiSign = {
          name: sign.name,
          file: sign.file,
          isApi: true,
          originalUrl: sign.originalUrl,
          filename: sign.filename
        };
      }
      
      const animationGroup = await this.characterController.loadAnimation(sign.name, false, apiSign);
      if (!animationGroup) {
        this.showNotification("Failed to load animation for cloning", "error");
        return;
      }
      
      // Get the last frame number
      const lastFrame = frameRange.end || animationGroup.to;
      
      // Create a unique name for the hold animation
      const holdName = `${sign.name}_hold_${Date.now()}`;
      
      // Create a static animation from the last frame
      const staticAnimation = await this.characterController.createStaticFrameAnimation(
        animationGroup,
        lastFrame,
        holdName,
        10 // Duration in frames
      );
      
      if (!staticAnimation) {
        this.showNotification("Failed to create static animation", "error");
        return;
      }
      
      // Find the position of the current item
      const currentIndex = this.sequenceItems.findIndex(item => item.id === sequenceItem.id);
      
      // Create the static sign object
      const staticSign = {
        name: holdName,
        file: null, // This is a generated animation
        start: 0,
        end: 10,
        isGenerated: true,
        originalSign: sign.name
      };
      
      // Insert the static animation right after the current item
      if (currentIndex !== -1) {
        this.insertToSequence(staticSign, currentIndex + 1);
      } else {
        this.addToSequence(staticSign);
      }
      
      this.showNotification(`Added static hold for "${sign.name}"`, "success");
      
    } catch (error) {
      console.error("Error cloning last frame:", error);
      this.showNotification("Error cloning last frame", "error");
    }
  }
  
  // Open text to sign modal
  openTextToSignModal() {
    if (this.textToSignModal) {
      this.textToSignModal.open();
    } else {
      console.error("Text to sign modal not initialized");
    }
  }
}

export default UIController;
