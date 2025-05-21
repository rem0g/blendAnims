import * as BABYLON from "babylonjs";
import "babylonjs-loaders";

import { createScene } from "./sceneController.js";
import CharacterController from "./characterController.js";
import AnimationController from "./animationController.js";
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

console.log("Scene created:", scene);

const cameraPosition = cameraController.getPosition();

cameraController.setPosition(cameraPosition.x, cameraPosition.y + 1, cameraPosition.z);

const isPlaying = false;

const recorder = new BABYLON.VideoRecorder(engine, scene, {
  fps: 60,
  mimeType: "video/webm" // or "video/webm;codecs=vp9"
});


// This can be used to record the scene 
// // Start recording
// recorder.startRecording();

// // Stop after 5 seconds and download the video
// setTimeout(() => {
//   recorder.stopRecording().then((blob) => {
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = "animation.webm";
//     a.click();
//   });
// }, 5000);

// Initialize character controller
const characterController = new CharacterController(scene, cameraController, isPlaying);
await characterController.init();

const animationController = new AnimationController(scene, characterController, isPlaying);

// Initialize the UI controller and pass the character controller to it
const uiController = new UIController(scene, availableSigns, characterController, animationController, isPlaying);
uiController.init();

// Load an initial animation as an example (optional)
// await characterController.loadAnimation('HALLO');

// await animationController.blendAnimations(['HALLO', 'LELYSTAD', 'SCHOOL']);


scene.debugLayer.show();

// Render
engine.runRenderLoop(function () {
    scene.render();
});




