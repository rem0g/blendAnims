import { Grid } from "@babylonjs/gui";
import FrameEditor from "./frameEditor";
import { availableSignsMap } from "./availableSigns";
import SequencerAPI from "./sequencerAPI";

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
    
    // Initialize the API client
    this.sequencerAPI = new SequencerAPI();
    this.currentSequenceId = null; // Track current sequence for updates

    // Bind methods to maintain proper 'this' context
    this.filterSignLibrary = this.filterSignLibrary.bind(this);
    this.handleDragOver = this.handleDragOver.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
    this.updateSequenceUI = this.updateSequenceUI.bind(this);
    this.removeFromSequence = this.removeFromSequence.bind(this);
    this.addToSequence = this.addToSequence.bind(this);
  }

  init() {
    // Create UI
    this.animationController.init(this.sequenceItems);
    this.createDragDropUI();
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
    searchInput.placeholder = "Search signs...";
    searchInput.className = "search-input";
    searchInput.addEventListener("input", this.filterSignLibrary);
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
      recordSequenceButton.classList.toggle("active", this.isRecording);
      
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
    sequenceColumn.appendChild(sequenceControls);
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
        // Expand the folder content
        const folderContent = folderElement.querySelector('.folder-content');
        const folderIcon = folderElement.querySelector('.folder-icon');
        if (folderContent && folderIcon) {
          folderContent.style.display = "block";
          folderIcon.textContent = "▼";
        }
      }
    });
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
        <span class="folder-icon">▼</span>
        <span class="folder-name">${displayName}</span>
        <span class="folder-count">(${signs.length})</span>
      `;

      // Create folder content (collapsible)
      const folderContent = document.createElement("div");
      folderContent.className = "folder-content";

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
      return;
    }

    // Enable play and record buttons when sequence has items
    const controlButtons = document.querySelectorAll(".control-button");
    controlButtons.forEach((button) => {
      button.disabled = false;
    });

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
        // For sequence items, apply their specific frame range
        const animationGroup = await this.characterController.loadAnimation(item.sign.name);
        if (animationGroup && item.frameRange) {
          animationGroup.normalize(item.frameRange.start, item.frameRange.end);
        }
        this.animationController.playSign(item.sign.name, sequenceItem);
      };
      controls.appendChild(playButton);

      const editButton = document.createElement("button");
      editButton.className = "edit-button small-button";
      editButton.innerHTML = "⚙";
      editButton.title = `Edit frames for "${item.sign.name}"`;
      editButton.onclick = async (e) => {
        e.stopPropagation();
        console.log("Editing sign:", item);
        // Load animation to get actual frame count
        const animationGroup = await this.characterController.loadAnimation(item.sign.name);
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
    
    // Copy the frame values from availableSignsMap
    const frameData = availableSignsMap[sign.name];
    clonedSign.start = frameData.start;
    clonedSign.end = frameData.end;
    
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
      }
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
    
    // Copy the frame values from availableSignsMap
    const frameData = availableSignsMap[sign.name];
    clonedSign.start = frameData.start;
    clonedSign.end = frameData.end;
    
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
      }
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

    dialog.innerHTML = `
      <h3>Save Sequence</h3>
      <input type="text" id="sequence-name-input" placeholder="Enter sequence name" 
             value="${this.currentSequenceId ? 'Update existing' : 'My Sequence'}" 
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
        // Find the sign in available signs
        const sign = this.availableSigns.find(s => s.name === item.sign_name);
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
            }
          });
        }
      }
      
      // Update UI
      this.updateSequenceUI();
      this.showNotification(`Loaded sequence: ${sequence.sequence_name}`, "success");
      
    } catch (error) {
      this.showNotification(`Error loading sequence: ${error.message}`, "error");
    }
  }
}

export default UIController;
