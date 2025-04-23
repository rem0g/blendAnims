import * as BABYLON from "babylonjs";
import "babylonjs-loaders";
import "./signSequencer.css";
import CameraController from "./cameraController.js";

// Canvas and engine setup
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

// Available sign animations
const availableSigns = [
  { name: "HALLO", file: "signs/HALLO-C_250226_1.glb" },
  { name: "SCHOOL", file: "signs/SCHOOL-D_250226_1.glb" },
];

// Global scene
const scene = new BABYLON.Scene(engine);

var rotateMesh = function (mesh) {
  mesh.rotation = new BABYLON.Vector3(0, Math.PI, 0);
}


// Initialize the 3D scene
async function createScene() {

  // asset.root.parent
  
  scene.debugLayer.show();
  console.log("Scene created:", scene);

  // Create camera
  var camera = CameraController.getInstance(scene, canvas);

  // Max camera distance
  camera.upperRadiusLimit = 10;
  camera.lowerRadiusLimit = 2;

  // Basic lighting
  const light = new BABYLON.HemisphericLight(
    "light",
    new BABYLON.Vector3(0, 1, 0)
  );

  // Create ground
  // const ground = BABYLON.MeshBuilder.CreateGround("ground", {
  //   width: 10,
  //   height: 10,
  // });
  // const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
  // groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
  // ground.material = groundMaterial;

  console.log("Scene before loading model:", scene);
  console.log("Scene engine:", scene.getEngine());

  loadMesh();
}

async function loadMesh() {
  console.log("Loading avatar model...");

  const asset = {
    fetched: await BABYLON.SceneLoader.ImportMeshAsync(null, "./", "glassesGuySignLab.glb", scene),
    root: null
  };

  asset.root = asset.fetched.meshes[0];
  asset.fetched.meshes[0].position = new BABYLON.Vector3(0, 0, 0);
  
  // Create a root transform node at origin
  var rootTransformNode = new BABYLON.TransformNode("rootTransformNode", scene);
  rootTransformNode.position = new BABYLON.Vector3(0, 0, 0);
  
  asset.root.parent = rootTransformNode;

  // Rotate the root transform node to face the camera
  // TODO: Rotate the root transform node to face the camera

  console.log("Root parent:", asset.root.parent);
  console.log("Root rotation:", asset.root.rotation);
  console.log("Model loaded successfully:", asset);
  
  // Get direct references to the mesh and skeleton
  const rootMesh = asset.root;
  const skeleton = asset.fetched.skeletons[0];

  // Log debug info
  console.log("Root mesh:", rootMesh);
  console.log("Skeleton:", skeleton);
  
  if (skeleton) {
    try {
      CameraController.setCameraOnBone(scene, rootMesh, skeleton);
      console.log("Camera attached to bone successfully");
    } catch (error) {
      console.error("Error attaching camera to bone:", error);
    }
  } else {
    console.error("No skeleton found in model");
  }


  console.log("Loading animations...");

  // Load animations
  // try {
  //   const animations = await BABYLON.SceneLoader.ImportAnimationsAsync(
  //     "",
  //     "signs/HALLO-C_250226_1.glb",
  //     scene
  //   );

  //   console.log("Animations loaded:", animations);
    
  //   if (scene.animationGroups && scene.animationGroups.length > 0) {
  //     console.log(`Found ${scene.animationGroups.length} animation groups`);
  //     scene.animationGroups[0].start(true);
  //     console.log("Animation started");
  //   }
  // } catch (animError) {
  //   console.error("Error loading animations:", animError);
  // }

  await playAnimation("HALLO");
  // await playAnimation("SCHOOL");
}

async function playAnimation(signName) {
  const signFile = availableSigns.find((s) => s.name === signName)?.file;
  console.log(`Loading sign file: ${signFile}`);

  // Check if the sign file exists
  if (!signFile) {
    console.error(`Sign file not found for: ${signName}`);
    return;
  }

  // Load animations
  try {
    const animations = await BABYLON.SceneLoader.ImportAnimationsAsync(
      "",
      signFile,
      scene
    );

    console.log("Animations loaded:", animations);

    const animationGroup = scene.animationGroups[0];
    
    if (scene.animationGroups && scene.animationGroups.length > 0) {
      console.log(`Found ${scene.animationGroups.length} animation groups`);
      animationGroup.loopAnimation = false;
      animationGroup.start(false);
      console.log("Animation started");
    }

    let observer = animationGroup.onAnimationEndObservable.add(() => {
      console.log("Animation ended");
      animationGroup.stop();
    });

    // Remove observer
    animationGroup.onAnimationEndObservable.remove(observer);

  } catch (animError) {
    console.error("Error loading animations:", animError);
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

// Helper function to load signs one after another
function loadNextSign(signNames, index) {
  // Check if we've processed all signs
  console.log("Index: ", index);
  console.log("Sign names length: ", signNames.length);
  if (index >= signNames.length) {
    console.log("All signs loaded and played");
    return;
  }

  // Clean up any existing animations and meshes
  if (scene.animationGroups) {
    for (let i = scene.animationGroups.length - 1; i >= 0; i--) {
      scene.animationGroups[i].dispose();
    }
  }

  // Remove any leftover meshes with specific names
  for (let i = scene.meshes.length - 1; i >= 0; i--) {
    const mesh = scene.meshes[i];
    // Only dispose meshes that aren't the ground or other permanent scene elements
    if (mesh.name !== "ground" && !mesh.name.includes("camera")) {
      mesh.dispose();
    }
  }

  const signName = signNames[index];
  console.log(`Loading sign ${index + 1}/${signNames.length}: ${signName}`);

  // Find the sign file based on the name
  const signFile = availableSigns.find((s) => s.name === signName)?.file;
  console.log(`Loading sign file: ${signFile}`);

  // Check if the sign file exists
  if (!signFile) {
    console.error(`Sign file not found for: ${signName}`);
    // Continue to the next sign
    loadNextSign(signNames, index + 1);
    return;
  }

  // Load the sign animation model
  BABYLON.SceneLoader.ImportMesh(
    "",
    "./",
    signFile,
    scene,
    (meshes, particleSystems, skeletons, animationGroups) => {
      console.log(`${signName} sign loaded`);

      // Rotate the sign model to face the camera
      const root = meshes[0];
      root.position = new BABYLON.Vector3(0, 0, 0);
      root.rotate(BABYLON.Axis.Y, Math.PI, BABYLON.Space.WORLD);

      // If animations were loaded, play the first one
      if (animationGroups && animationGroups.length > 0) {
        console.log(`Found ${animationGroups.length} animations`);

        // Get the first animation
        const signAnimation = animationGroups[0];
        console.log(`Playing animation: ${signAnimation.name}`);

        // Make sure we're not playing it in a loop
        signAnimation.loopAnimation = false;

        loadNextSign(signNames, index + 1);
      } else {
        console.error(`No animations found in the ${signName} model`);
        // Dispose meshes since we won't be using them
        meshes.forEach((mesh) => mesh.dispose());
        // Continue to next sign even if this one had no animations
        loadNextSign(signNames, index + 1);
      }
    },
    null,
    (scene, message) => {
      console.error(`Error loading ${signName} model: ${message}`);
      // Continue to next sign even if this one failed
      loadNextSign(signNames, index + 1);
    }
  );
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

  // Simple button to play SCHOOL
  const schoolButton = document.createElement("button");
  schoolButton.className = "sign-button";
  schoolButton.textContent = "Play";
  schoolButton.style.width = "100%";
  schoolButton.style.padding = "15px";
  schoolButton.style.marginBottom = "20px";
  schoolButton.style.fontSize = "16px";

  // Add click handler
  schoolButton.addEventListener("click", () => {
    console.log("SCHOOL button clicked");
    loadSigns(["SCHOOL"]);
  });

  container.appendChild(schoolButton);
}

// Initialize
createScene().then(() => {
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
