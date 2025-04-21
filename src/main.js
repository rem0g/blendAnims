import * as BABYLON from 'babylonjs';

const canvas = document.getElementById("renderCanvas"); // Get the canvas element
const engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine

// Add your code here matching the playground format
const createScene = function () {
  const scene = new BABYLON.Scene(engine);
  
  const box1 = BABYLON.MeshBuilder.CreateBox("box", {width: 1, height: 1, depth: 1});
  box1.position = new BABYLON.Vector3(0, 0.5, 0);

  // const box2 = BABYLON.MeshBuilder.CreateBox("box", {width: 2, height: 1.5, depth: 3});
  // box2.position = new BABYLON.Vector3(2, 0.75, 0.1);

  // box1.rotation.y = Math.PI / 4;

  const roof = BABYLON.MeshBuilder.CreateCylinder("roof", {diameter: 1.3, height: 1.2, tessellation: 3});
  roof.scaling.x = 0.75;
  roof.rotation.z = Math.PI / 2;
  roof.position.y = 1.22;

  const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 15, new BABYLON.Vector3(0, 0, 0));
  camera.attachControl(canvas, true);
  const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1, 1, 0));
  
  const ground = BABYLON.MeshBuilder.CreateGround("ground", {width:10, height:10});

  const groundMat = new BABYLON.StandardMaterial("groundMat");
  groundMat.diffuseColor = new BABYLON.Color3(0, 1, 0);
  ground.material = groundMat; //Place the material property of the ground

  const roofMat = new BABYLON.StandardMaterial("roofMat");
  roofMat.diffuseTexture = new BABYLON.Texture("https://assets.babylonjs.com/environments/roof.jpg");
  const boxMat = new BABYLON.StandardMaterial("boxMat");
  boxMat.diffuseTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/floor.png");

  roof.material = roofMat;
  box1.material = boxMat;

  return scene;
};


const scene = createScene(); //Call the createScene function

// Register a render loop to repeatedly render the scene
engine.runRenderLoop(function () {
  scene.render();
});

// Watch for browser/canvas resize events
window.addEventListener("resize", function () {
  engine.resize();
});