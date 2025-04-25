

// import {animationController} from "./animationController.js";

// Class to handle UI elements and interactions
class UIController {
  constructor(scene, availableSigns) {
    this.scene = scene;
    this.availableSigns = availableSigns;
  }

  init() {
    // Add the stylesheet to the document head
    this.loadStylesheet();
    
    this.container = document.createElement("div");
    this.container.className = "ui-container";
    document.body.appendChild(this.container);

    this.createUI();
  }
  
  loadStylesheet() {
    // Check if stylesheet is already loaded
    if (!document.getElementById("ui-styles")) {
      const link = document.createElement("link");
      link.id = "ui-styles";
      link.rel = "stylesheet";
      link.type = "text/css";
      link.href = "/src/styles.css";
      document.head.appendChild(link);
    }
  }

  createUI() {
    // Title
    const title = document.createElement("h2");
    title.textContent = "Sign Player";
    title.className = "ui-title";
    this.container.appendChild(title);

    // Create buttons for each available sign
    this.availableSigns.forEach((sign) => {
      const button = document.createElement("button");
      button.className = "sign-button";
      button.textContent = sign.name;

      button.addEventListener("click", () => {
        console.log(`${sign.name} button clicked`);
        // playAnimation(sign.name);
      });

      this.container.appendChild(button);
    });
  }
}

export default UIController;
