import { Grid } from "@babylonjs/gui";

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

    // Bind methods to maintain proper 'this' context
    this.filterSignLibrary = this.filterSignLibrary.bind(this);
    this.handleDragOver = this.handleDragOver.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
    this.updateSequenceUI = this.updateSequenceUI.bind(this);
    this.setupSequenceReordering = this.setupSequenceReordering.bind(this);
    this.removeFromSequence = this.removeFromSequence.bind(this);
    this.addToSequence = this.addToSequence.bind(this);
  }

  init() {
    // Create UI
    this.animationController.init(this.sequenceItems);
    this.createDragDropUI();
  }

  createDragDropUI() {
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

    // Create cross to close the UI
    const closeButton = document.createElement("button");
    closeButton.className = "close-button";
    closeButton.innerHTML = "✖"; // Cross icon
    closeButton.title = "Close UI";
    closeButton.onclick = () => {
      this.container.style.display = "none"; // Hide the UI
      showButton.style.display = "block"; // Show the show button
    };
    this.container.appendChild(closeButton);


    // Create the header with title and settings button
    const headerContainer = document.createElement("div");
    headerContainer.className = "ui-header";
    this.container.appendChild(headerContainer);

    // Create the title
    this.title = document.createElement("h1");
    this.title.className = "ui-title";
    this.title.textContent = "Sign Language Sequencer";
    this.container.appendChild(this.title);

    // Create the blending settings button
    const blendingSettingsButton = document.createElement("button");
    blendingSettingsButton.className = "blending-settings-button";
    blendingSettingsButton.innerHTML = "⚙️"; // Gear icon
    blendingSettingsButton.title = "Blending Settings";
    // blendingSettingsButton.onclick =
    headerContainer.appendChild(blendingSettingsButton);

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

    // Create the blending settings panel (hidden by default)
    this.blendingPanel = document.createElement("div");
    this.blendingPanel.className = "blending-settings-panel";
    this.blendingPanel.style.display = "none";
    this.container.appendChild(this.blendingPanel);

    // Add settings content
    // this.createBlendingSettingsPanel();
    this.createRootContainer();

    // Create two-column layout
    const mainLayout = document.createElement("div");
    mainLayout.className = "main-layout";
    this.container.appendChild(mainLayout);

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

    // ---- Right column: Sequence Builder ----
    const sequenceColumn = document.createElement("div");
    sequenceColumn.className = "sequence-column";
    mainLayout.appendChild(sequenceColumn);

    const sequenceTitle = document.createElement("h2");
    sequenceTitle.textContent = "Sign Sequence";
    sequenceColumn.appendChild(sequenceTitle);

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
      // Blend animation for the sequence
      this.animationController.playSequence(
        this.sequenceItems.map((item) => item.sign.name),
        this.blending,
        this.isRecording
      );
    };
    sequenceControls.appendChild(playSequenceButton);

    const clearSequenceButton = document.createElement("button");
    clearSequenceButton.className = "control-button clear-sequence-button";
    clearSequenceButton.innerHTML = "Clear All";
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
      this.animationController.playSequence(
        this.sequenceItems.map((item) => item.sign.name),
        this.blending,
        this.isRecording
      );
    };
    sequenceControls.appendChild(recordSequenceButton);

    sequenceColumn.appendChild(sequenceControls);

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

  createRootContainer() {
    this.rootContainer = new Grid("grid");
    // this.rootContainer =
  }

  // Create blending settings panel
  createBlendingSettingsPanel() {
    const panelTitle = document.createElement("h3");
    panelTitle.textContent = "Animation Blending Settings";
    this.blendingPanel.appendChild(panelTitle);

    // Blending speed slider using GUI
    this.slider = new BABYLON.GUI.Slider();
    this.slider.vericalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BELOW;
    this.slider.width = "50%";
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

    // Sort signs alphabetically
    this.availableSigns.sort((a, b) => a.name.localeCompare(b.name));

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

      signItem.appendChild(signInfo);

      // Play button
      const playButton = document.createElement("button");
      playButton.className = "play-button";
      playButton.innerHTML = "Play";
      playButton.onclick = async (e) => {
        e.stopPropagation(); // Prevent dragging when clicking play
        console.log(`Playing sign: ${sign.name}`);
        this.animationController.playSign(sign.name);
      };
      signItem.appendChild(playButton);

      // Add to library
      library.appendChild(signItem);
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

      // Disable play button when sequence is empty
      const playButton = document.getElementById("play-sequence-button");
      if (playButton) {
        playButton.disabled = true;
      }

      // Disable Record button when sequence is empty
      const recordButton = document.getElementById("record-sequence-button");
      if (recordButton) {
        recordButton.disabled = true;
      }

      return;
    }

    // Enable play button when sequence has items
    const playButton = document.getElementById("play-sequence-button");
    if (playButton && !this.isPlaying) {
      playButton.disabled = false;
    }

    // Enable record button when sequence has items
    const recordButton = document.getElementById("record-sequence-button");
    if (recordButton && !this.isPlaying) {
      recordButton.disabled = false;
    }

    // Create sequence items
    this.sequenceItems.forEach((item, index) => {
      const sequenceItem = document.createElement("div");
      sequenceItem.className = "sequence-item";
      sequenceItem.id = `sequence-item-${item.id}`;
      sequenceItem.dataset.id = item.id;

      // Add drag-to-reorder functionality
      sequenceItem.draggable = true;
      sequenceItem.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("application/sequence-item", item.id.toString());
        sequenceItem.classList.add("dragging");
      });

      sequenceItem.addEventListener("dragend", () => {
        sequenceItem.classList.remove("dragging");
      });

      // Add dragover handler for reordering
      sequenceItem.addEventListener("dragover", (e) => {
        e.preventDefault();
        const draggingItem = document.querySelector(".dragging");
        if (!draggingItem) return;

        const box = sequenceItem.getBoundingClientRect();
        const mouseY = e.clientY;

        if (mouseY < box.top + box.height / 2) {
          sequenceContainer.insertBefore(draggingItem, sequenceItem);
        } else {
          sequenceContainer.insertBefore(
            draggingItem,
            sequenceItem.nextSibling
          );
        }
      });

      // Sign name and info
      const signInfo = document.createElement("div");
      signInfo.className = "sequence-item-info";

      const nameSpan = document.createElement("span");
      nameSpan.className = "sequence-item-name";
      nameSpan.textContent = item.sign.name;
      signInfo.appendChild(nameSpan);

      // Index number displayed in sequence block
      const indexSpan = document.createElement("span");
      indexSpan.className = "sequence-item-index";
      indexSpan.textContent = `#${index + 1}`;
      signInfo.appendChild(indexSpan);

      sequenceItem.appendChild(signInfo);

      // Controls
      const controls = document.createElement("div");
      controls.className = "sequence-item-controls";

      // Play button
      const playButton = document.createElement("button");
      playButton.className = "play-button small-button";
      playButton.innerHTML = "▶";
      playButton.title = `Play "${item.sign.name}"`;
      playButton.onclick = () =>
        this.animationController.playSign(item.sign.name);
      controls.appendChild(playButton);

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

    // Add drop handler to sequence container for reordering
    sequenceContainer.addEventListener("drop", (e) => {
      e.preventDefault();
      const itemId = e.dataTransfer.getData("application/sequence-item");
      if (itemId) {
        // Reordering logic - already handled by the dragover event
        this.updateSequenceOrder();
      }
    });

    // Make the empty parts of the container accept drops too
    sequenceContainer.addEventListener("dragover", (e) => {
      e.preventDefault();
      const draggingItem = document.querySelector(".dragging");
      if (!draggingItem) return;

      // If not over another item, append to the end
      const items = Array.from(
        sequenceContainer.querySelectorAll(".sequence-item:not(.dragging)")
      );
      const mouseY = e.clientY;

      // Find the closest item below the cursor
      const closestItem = items.reduce(
        (closest, child) => {
          const box = child.getBoundingClientRect();
          const offset = mouseY - box.top - box.height / 2;

          if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
          } else {
            return closest;
          }
        },
        { offset: Number.NEGATIVE_INFINITY }
      ).element;

      if (closestItem) {
        sequenceContainer.insertBefore(draggingItem, closestItem);
      } else {
        sequenceContainer.appendChild(draggingItem);
      }
    });
  }

  // Update the sequence data order based on the DOM order
  updateSequenceOrder() {
    const newOrder = [];
    document.querySelectorAll(".sequence-item").forEach((item) => {
      const id = parseInt(item.dataset.id);
      const sequenceItem = this.sequenceItems.find((i) => i.id === id);
      if (sequenceItem) {
        newOrder.push(sequenceItem);
      }
    });

    this.sequenceItems = newOrder;
  }

  // Setup the logic for reordering sequence items via drag and drop
  setupSequenceReordering() {
    const sequenceContainer = document.getElementById("sequence-container");

    // Add drop handler to update the internal array order
    sequenceContainer.addEventListener("drop", (e) => {
      e.preventDefault();
      this.updateSequenceOrder();
    });
  }

  // Remove an item from the sequence
  removeFromSequence(itemId) {
    this.sequenceItems = this.sequenceItems.filter(
      (item) => item.id !== itemId
    );
    this.updateSequenceUI();
  }

  // Handle drag over
  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  // Handle dropping a sign into the sequence area
  handleDrop(e) {
    e.preventDefault();

    // Check if this is a reordering operation
    const sequenceItemId = e.dataTransfer.getData("application/sequence-item");
    if (sequenceItemId) {
      // Reordering is handled by the updateSequenceOrder method
      this.updateSequenceOrder();
      return;
    }

    // Otherwise, this is adding a new sign from the library
    const signName = e.dataTransfer.getData("text/plain");
    if (!signName) return;

    const sign = this.availableSigns.find((s) => s.name === signName);
    if (!sign) return;

    // Add to sequence
    this.addToSequence(sign);
  }

  // Add a sign to the sequence
  addToSequence(sign) {
    // Generate a unique ID for this sequence item
    const itemId = this.nextItemId++;

    // Add to our sequence data
    this.sequenceItems.push({
      id: itemId,
      sign: sign,
    });

    // Update the UI
    this.updateSequenceUI();
  }
}

export default UIController;
