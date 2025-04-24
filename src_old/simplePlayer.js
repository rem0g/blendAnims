import * as BABYLON from "babylonjs";
import "babylonjs-loaders";
import "./signSequencer.css";

import {createScene } from "./sceneAndMeshLoader.js";
import { 
  canvas, 
  engine, 
  scene, 
  globals, 
  availableSigns,
  isGroundVisible, 
  isDebugLayerVisible  
} from "./globals.js";

const asset = globals.asset;


var rotateMesh = function () {
  console.log("Rotating mesh...");
  console.log("Asset:", asset);
  // Use radians
  // asset.root.parent.rotation = new BABYLON.Vector3(Math.PI/2, 0, 0);
  asset.root.parent.rotation = new BABYLON.Vector3(-Math.PI/2, 0, 0);

};



async function playAnimation(signName) {
  const signFile = availableSigns.find((s) => s.name === signName)?.file;
  console.log(`Loading sign file: ${signFile}`);

  // Check if the sign file exists
  if (!signFile) {
    console.error(`Sign file not found for: ${signName}`);
    return;
  }

  // Load animations
  const animations = await BABYLON.SceneLoader.ImportAnimationsAsync(
    "",
    signFile,
    scene
  );

  console.log("Animations loaded:", animations);

  window.test = animations;

  const animationGroup = scene.animationGroups[0];

  // rotateMesh();

  if (scene.animationGroups && scene.animationGroups.length > 0) {
    console.log(`Found ${scene.animationGroups.length} animation groups`);
    // scene.animationGroups[0].stop();
    
  //   // First clear any existing observers to avoid duplicates
  //   animationGroup.onAnimationEndObservable.clear();
    
  //   // Then add the new observer
  //   let observer = animationGroup.onAnimationEndObservable.add(() => {
  //     console.log("Animation ended");
  //     // Only remove the observer after it has fired
  //     animationGroup.onAnimationEndObservable.remove(observer);
  //     animationGroup.stop();

  //     // Dispose the animation group
  //     animationGroup.dispose();
  //   });
    
  //   // Make sure we're not looping and start the animation
    // animationGroup.loopAnimation = false;
    animationGroup.start(false);
    console.log("Animation started");
  }
  
}

// Function to load multiple signs sequentially
function loadSigns(signNames) {
  // Remove any existing animations first
  if (scene.animationGroups) {
    for (let i = 0; i < scene.animationGroups.length; i++) {
      scene.animationGroups[i].dispose();
    }
  }

  // Make sure we have signs to load
  if (!signNames || signNames.length === 0) {
    console.error("No sign names provided to load");
    return;
  }

  // Load the first sign
  console.log("Loading sign: ", signNames[0]);
  loadNextSign(signNames, 0);
}

// Function to toggle the ground visibility
function toggleGround() {
  isGroundVisible = !isGroundVisible;
  const ground = scene.getMeshByName("ground");
  if (ground) {
    ground.isVisible = isGroundVisible;
  }
}

// Function to toggle the debug layer
function toggleDebugLayer() {
  globals.isDebugLayerVisible = !globals.isDebugLayerVisible;
  if (globals.isDebugLayerVisible) {
    scene.debugLayer.show();
  } else {
    scene.debugLayer.hide();
  }
}

// Create simple UI for playing the sign
function createSimpleUI() {
  // Create container for controls
  const container = document.createElement("div");
  container.className = "sequencer-controls";
  document.body.appendChild(container);

  // Title
  const title = document.createElement("h2");
  title.textContent = "Sign Player";
  container.appendChild(title);

  // Create toggle switches container
  const togglesContainer = document.createElement("div");
  togglesContainer.style.display = "flex";
  togglesContainer.style.justifyContent = "space-between";
  togglesContainer.style.marginBottom = "20px";
  container.appendChild(togglesContainer);

  // Ground visibility toggle
  const groundToggle = createToggleSwitch("Ground", isGroundVisible, (checked) => {
    toggleGround();
  });
  togglesContainer.appendChild(groundToggle);

  // Debug layer toggle
  const debugToggle = createToggleSwitch("Debug Layer", isDebugLayerVisible, (checked) => {
    toggleDebugLayer();
  });
  togglesContainer.appendChild(debugToggle);

  // Create buttons for each available sign
  availableSigns.forEach((sign) => {
    const button = document.createElement("button");
    button.className = "sign-button";
    button.textContent = sign.name;
    button.style.width = "100%";
    button.style.padding = "15px";
    button.style.marginBottom = "20px";
    button.style.fontSize = "16px";

    button.addEventListener("click", () => {
      console.log(`${sign.name} button clicked`);
      playAnimation(sign.name);
    });
    
    container.appendChild(button);
  });
}

// Helper function to create a toggle switch
function createToggleSwitch(label, initialState, onChange) {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.margin = "0 10px";
  
  // Create the switch input
  const toggle = document.createElement("label");
  toggle.className = "switch";
  toggle.style.position = "relative";
  toggle.style.display = "inline-block";
  toggle.style.width = "60px";
  toggle.style.height = "34px";
  
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = initialState;
  input.style.opacity = "0";
  input.style.width = "0";
  input.style.height = "0";
  
  const slider = document.createElement("span");
  slider.className = "slider round";
  slider.style.position = "absolute";
  slider.style.cursor = "pointer";
  slider.style.top = "0";
  slider.style.left = "0";
  slider.style.right = "0";
  slider.style.bottom = "0";
  slider.style.backgroundColor = initialState ? "#2196F3" : "#ccc";
  slider.style.transition = ".4s";
  slider.style.borderRadius = "34px";
  
  // Create the slider's moving circle
  const circle = document.createElement("span");
  circle.style.position = "absolute";
  circle.style.height = "26px";
  circle.style.width = "26px";
  circle.style.left = initialState ? "30px" : "4px";
  circle.style.bottom = "4px";
  circle.style.backgroundColor = "white";
  circle.style.transition = ".4s";
  circle.style.borderRadius = "50%";
  slider.appendChild(circle);
  
  // Style for checked state
  input.addEventListener("change", function() {
    if (this.checked) {
      slider.style.backgroundColor = "#2196F3";
      circle.style.left = "30px";
    } else {
      slider.style.backgroundColor = "#ccc";
      circle.style.left = "4px";
    }
    onChange(this.checked);
  });
  
  toggle.appendChild(input);
  toggle.appendChild(slider);
  
  // Create the label text
  const labelText = document.createElement("span");
  labelText.textContent = label;
  labelText.style.marginLeft = "10px";
  
  container.appendChild(toggle);
  container.appendChild(labelText);
  
  return container;
}

// Initialize
createScene(scene,canvas).then(() => {
  // Create UI after scene is ready
  createSimpleUI();

  // Start render loop
  engine.runRenderLoop(() => {
    scene.render();
  });

  // Handle window resize
  window.addEventListener("resize", () => {
    engine.resize();
  });
});
