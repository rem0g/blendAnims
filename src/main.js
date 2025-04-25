import * as BABYLON from "babylonjs";
import "babylonjs-loaders";

import { createScene } from "./sceneController.js";
import CharacterController from "./characterController.js";
import UIController from "./UIController.js";
import { availableSigns } from "./availableSigns.js";
import { GLTFLoaderAnimationStartMode } from "babylonjs-loaders";

// Set the animation start mode to NONE
// This is a workaround to fix the bug where the animation starts playing automatically
BABYLON.SceneLoader.OnPluginActivatedObservable.add(function (loader) {
  if (loader.name === "gltf") {
      loader.animationStartMode = GLTFLoaderAnimationStartMode.NONE;
  }
});

// Make scene
const {canvas, engine, scene, cameraController, light, ground} = await createScene();
// scene.debugLayer.show();
console.log("Scene created:", scene);

const cameraPosition = cameraController.getPosition();

// TODO: Fix this so the camera is not hardcoded
cameraController.setPosition(cameraPosition.x, cameraPosition.y + 1, cameraPosition.z);

// Initialize character controller
const characterController = new CharacterController(scene, cameraController);
await characterController.init();

// Initialize the UI controller and pass the character controller to it
const uiController = new UIController(scene, availableSigns, characterController);
uiController.init();

// Load an initial animation as an example (optional)
// await characterController.loadAnimation('HALLO');


// Render
engine.runRenderLoop(function () {
    scene.render();
});




