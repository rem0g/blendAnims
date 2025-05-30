import {
  Engine,
  Scene,
  HemisphericLight,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
} from "babylonjs";

import CameraController from "./cameraController.js";

// Create the scene
export async function createScene() {
  const canvas = document.getElementById("renderCanvas");
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    antialias: true,
    powerPreference: "high-performance"
  });
  
  // Set engine hardware scaling level for better quality
  engine.setHardwareScalingLevel(1.0); // No scaling, full resolution
  
  const scene = new Scene(engine);

  console.log("Scene created:", scene);

  // Create camera
  const cameraController = new CameraController(scene, canvas);

  // Basic lighting
  const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
  light.intensity = 1.0;
  
  // Add ambient light for better visibility
  scene.ambientColor = new Color3(0.2, 0.2, 0.2);

  // Create ground
  const ground = MeshBuilder.CreateGround("ground", {
    width: 10,
    height: 10,
  });
  const groundMaterial = new StandardMaterial("groundMat", scene);
  groundMaterial.diffuseColor = new Color3(0.2, 0.2, 0.2);
  ground.material = groundMaterial;
  ground.isVisible = true;

  // Return everything just in case
  return { canvas, engine, scene, cameraController, light, ground };
}
