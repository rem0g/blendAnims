import {
    Engine,
    Scene,
    HemisphericLight,
    MeshBuilder,
    StandardMaterial,
    Color3,
    Vector3,
    ArcRotateCamera
} from "babylonjs";

import CameraController from "./cameraController.js";


export async function createScene() {

    const canvas = document.getElementById("renderCanvas");
    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);

    console.log("Scene created:", scene);
  
    // Create camera
    const cameraController = new CameraController(scene, canvas);

  
    // Basic lighting
    const light = new HemisphericLight(
      "light",
      new Vector3(0, 1, 0), 
      scene
    );
  
    // Create ground
    const ground = MeshBuilder.CreateGround("ground", {
      width: 10,
      height: 10,
      
    });
    const groundMaterial = new StandardMaterial("groundMat", scene);
    groundMaterial.diffuseColor = new Color3(0.2, 0.2, 0.2);
    ground.material = groundMaterial;
    ground.isVisible = true;

    return {canvas, engine, scene, cameraController, light, ground};
}