// import {animationController} from "./animationController.js";

// Class to handle UI elements and interactions
class UIController {
  constructor(scene, availableSigns, characterController) {
    this.scene = scene;
    this.availableSigns = availableSigns;
    this.characterController = characterController;
    this.sequenceItems = [];
  }

  init() {
    // Create UI
    this.createDragDropUI();
    // this.createUI();
  }

  createUI() {
    // Title
    this.container = document.createElement("div");
    this.container.className = "ui-container";
    document.body.appendChild(this.container);

    const title = document.createElement("h2");
    title.textContent = "Sign Player";
    title.className = "ui-title";
    this.container.appendChild(title);

    // Create buttons for each available sign
    this.availableSigns.forEach((sign) => {
      const button = document.createElement("button");
      button.className = "sign-button";
      button.textContent = sign.name;
      button.dataset.signFile = sign.file; // Store the file path in a data attribute

      // Add click handler to play the sign animation
      button.addEventListener("click", async () => {
        console.log(`${sign.name} button clicked`);

        if (this.characterController) {
          try {
            // Load and queue the animation
            await this.characterController.loadAnimation(sign.name);
          } catch (error) {
            console.error(`Error loading animation for ${sign.name}:`, error);
          }
        } else {
          console.warn("Character controller not available for animation");
        }
      });

      this.container.appendChild(button);
    });
  }

  createDragDropUI() {
    // Create the main container
    this.container = document.createElement("div");
    this.container.className = "ui-container";
    document.body.appendChild(this.container);

    // Create the title
    this.title = document.createElement("h1");
    this.title.className = "ui-title";
    this.title.textContent = "Sign Language Sequencer";
    this.container.appendChild(this.title);

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
    // playSequenceButton.onclick = playSequence;
    sequenceControls.appendChild(playSequenceButton);

    const clearSequenceButton = document.createElement("button");
    clearSequenceButton.className = "control-button clear-sequence-button";
    clearSequenceButton.innerHTML = "Clear All";
    clearSequenceButton.onclick = () => {
      sequenceItems = [];
    //   updateSequenceUI();
    };
    sequenceControls.appendChild(clearSequenceButton);

    sequenceColumn.appendChild(sequenceControls);

    // Sequence drop area
    const sequenceDropArea = document.createElement("div");
    sequenceDropArea.id = "sequence-drop-area";
    sequenceDropArea.className = "sequence-drop-area";
    // sequenceDropArea.addEventListener("dragover", handleDragOver);
    // sequenceDropArea.addEventListener("drop", handleDrop);

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
        console.log(`${sign.name} button clicked`);

        if (this.characterController) {
          try {
            // Load and queue the animation
            await this.characterController.loadAnimation(sign.name);
          } catch (error) {
            console.error(`Error loading animation for ${sign.name}:`, error);
          }
        } else {
          console.warn("Character controller not available for animation");
        }
      };
      signItem.appendChild(playButton);

      // Add to library
      library.appendChild(signItem);
    });
  }
}

export default UIController;
