import * as BABYLON from "babylonjs";
import "babylonjs-loaders";

import { createScene } from "./sceneController.js";
import CharacterController from "./characterController.js";
import UIController from "./UIController.js";
import { availableSigns } from "./availableSigns.js";

// Make scene
const {canvas, engine, scene, cameraController, light, ground} = await createScene();
// scene.debugLayer.show();
console.log("Scene created:", scene);

const cameraPosition = cameraController.getPosition();

// TODO: Fix this so the camera is not hardcoded
cameraController.setPosition(cameraPosition.x, cameraPosition.y + 1, cameraPosition.z);

const characterController = new CharacterController(scene, cameraController);
await characterController.init();

// Initialize the UI controller
const uiController = new UIController(scene, availableSigns);
uiController.init();

// Render
engine.runRenderLoop(function () {
    scene.render();
});




