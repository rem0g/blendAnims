import * as BABYLON from "babylonjs";
import { GLTFLoaderAnimationStartMode } from "babylonjs-loaders";

BABYLON.SceneLoader.OnPluginActivatedObservable.add(function (loader) {
  if (loader.name === "gltf") {
      loader.animationStartMode = GLTFLoaderAnimationStartMode.NONE;
  }
});

// Canvas and engine
export const canvas = document.getElementById("renderCanvas");
export const engine = new BABYLON.Engine(canvas, true);


// Scene
export const scene = new BABYLON.Scene(engine);

// Avatar asset
export let asset = null;

// Global state for toggles
export let isGroundVisible = false;
export let isDebugLayerVisible = false;

// Available sign animations
export const availableSigns = [
  { name: "HALLO", file: "signs/HALLO-C_250226_1.glb" },
  { name: "SCHOOL", file: "signs/SCHOOL-D_250226_1.glb" },
  { name: "HAARLEM", file: "signs/HAARLEM_250226_1.glb" },
  { name: "KIJKEN-NAAR-ELKAAR", file: "signs/KIJKEN-NAAR-ELKAAR_250228_1.glb" },
  { name: "KRIJGEN-A", file: "signs/KRIJGEN-A_250228_5.glb" },
  { name: "LELYSTAD", file: "signs/LELYSTAD_250314_1.glb" },
  { name: "LES", file: "signs/LES_250228_2.glb" },
  { name: "PROBEREN-E", file: "signs/PROBEREN-E_250226_2.glb" },
  { name: "SCHULDGEVEN", file: "signs/SCHULDGEVEN_250226_1.glb" },
  { name: "VRAGEN-A", file: "signs/VRAGEN-A_250226_1.glb" },
  { name: "WACHTEN-B", file: "signs/WACHTEN-B_250226_1.glb" },
];


export const globals = {
    canvas,
    engine,
    scene,
    asset,
    isGroundVisible,
    isDebugLayerVisible,
    availableSigns
}
