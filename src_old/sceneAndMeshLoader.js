import * as BABYLON from "babylonjs";
import CameraController from "./cameraController.js";
import { globals } from "./globals.js";

const isGroundVisible = globals.isGroundVisible;
const isDebugLayerVisible = globals.isDebugLayerVisible;

// Initialize the 3D scene
export async function createScene(scene, canvas) {
  
    // Enable debug layer initially
    if (isDebugLayerVisible) {
      scene.debugLayer.show();
    }
    console.log("Scene created:", scene);
  
    // Create camera
    var camera = CameraController.getInstance(scene, canvas);
  
    // Max camera distance
    camera.upperRadiusLimit = 10;
    camera.lowerRadiusLimit = 2;
  
    // Basic lighting
    const light = new BABYLON.HemisphericLight(
      "light",
      new BABYLON.Vector3(0, 1, 0), 
      scene
    );
  
    // Create ground
    const ground = BABYLON.MeshBuilder.CreateGround("ground", {
      width: 10,
      height: 10,
    });
    const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    ground.material = groundMaterial;
    ground.isVisible = isGroundVisible;
  
    console.log("Scene before loading model:", scene);
    console.log("Scene engine:", scene.getEngine());
  
    globals.asset = await loadMesh(scene);
}

async function loadMesh (scene) {
    console.log("Loading avatar model...");
  
    const asset = {
      fetched: await BABYLON.SceneLoader.ImportMeshAsync(
        null,
        "./",
        "glassesGuySignLab.glb",
        scene
      ),
      root: null,
    };
  
    // asset.root = asset.fetched.meshes[0];
    // asset.fetched.meshes[0].position = new BABYLON.Vector3(0, 0, 0);
    // asset.fetched.meshes[0].rotation = new BABYLON.Vector3(0, 0, 0);
  
    // // Create a root transform node at origin
    // var rootTransformNode = new BABYLON.TransformNode("rootTransformNode", scene);
    // rootTransformNode.position = new BABYLON.Vector3(0, 0, 0);
  
    // asset.root.parent = rootTransformNode;
  
    // // Show the root transform node
    // rootTransformNode.isVisible = true;
  
    // console.log("Root parent:", asset.root.parent);
    // console.log("Root rotation:", asset.root.rotation);
    // console.log("Model loaded successfully:", asset);
  
    // // Get direct references to the mesh and skeleton
    // const rootMesh = asset.root;
    // const skeleton = asset.fetched.skeletons[0];
  
    // // Log debug info
    // console.log("Root mesh:", rootMesh);
    // console.log("Skeleton:", skeleton);
  
    // if (skeleton) {
    //   try {
    //     CameraController.setCameraOnBone(scene, rootMesh, skeleton);
    //     console.log("Camera attached to bone successfully");
    //   } catch (error) {
    //     console.error("Error attaching camera to bone:", error);
    //   }
    // } else {
    //   console.error("No skeleton found in model");
    // }
  
    // console.log("Waiting on input...");
  
    return asset;
  
  }