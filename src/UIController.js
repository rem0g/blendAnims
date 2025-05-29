import { Grid } from "@babylonjs/gui";
import FrameEditor from "./frameEditor";
import { availableSignsMap } from "./availableSigns";

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
    this.frameEditor = new FrameEditor(
      this.scene,
      animationController,
      this.showNotification.bind(this),
      this.updateLibraryFrames.bind(this),
      this.updateSequenceUI.bind(this)
    );

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
    sequenceContainer.id = "sequence-container";
    sequenceContainer.className = "sequence-container";

    // Initialize with empty message
    const emptyMessage = document.createElement("div");
    emptyMessage.className = "empty-message";
    emptyMessage.textContent = "Drag signs here to create a sequence";
    sequenceContainer.appendChild(emptyMessage);

    sequenceDropArea.appendChild(sequenceContainer);
    sequenceColumn.appendChild(sequenceDropArea);
  }

  // Filter the sign library based on search input
  filterSignLibrary() {
    const searchInput = document.querySelector(".search-input");
    const searchTerm = searchInput.value.toLowerCase();

    const signItems = document.querySelectorAll(".sign-item");
    signItems.forEach((item) => {
      const signName = item.dataset.name.toLowerCase();
      if (signName.includes(searchTerm)) {
        item.style.display = "flex";
      } else {
        item.style.display = "none";
      }
    });
  }

  // Funtion to add the signs to the library
  populateSignLibrary() {
    const library = document.getElementById("sign-library");

    // Sort signs alphabetically, then numbers, and then mixed
    this.availableSigns.sort((a, b) => {
      // Custom sorting logic to handle numbers and letters
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

      if (a.name < b.name) {
        return -1; // Sort alphabetically
      } else if (a.name > b.name) {
        return 1; // Sort alphabetically
      }
      return 0; // Names are equal
    });

    this.availableSigns.forEach((sign) => {
      const signItem = document.createElement("div");
      signItem.className = "sign-item";
      signItem.dataset.name = sign.name;

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

      // Add to library
      library.appendChild(signItem);
    });
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
      return;
    }

    // Enable play and record buttons when sequence has items
    const controlButtons = document.querySelectorAll(".control-button");
    controlButtons.forEach((button) => {
      button.disabled = false;
    });

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
    // Show a visual cue for the drop
    e.dataTransfer.dropEffect = "copy";
  }

  // Handle dropping a sign into the sequence area
  handleDrop(e) {
    e.preventDefault();

    // Get the sign name from the dragged item
    const signName = e.dataTransfer.getData("text/plain");
    if (!signName) return;

    const sign = this.availableSigns.find((s) => s.name === signName);
    if (!sign) return;

    this.addToSequence(sign);
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
}

export default UIController;
