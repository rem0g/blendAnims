import {
  ImportMeshAsync,
  TransformNode,
  Vector3,
  SceneLoader,
} from "babylonjs";
import { availableSigns } from "./availableSigns.js";

// Class to load and control the character
class CharacterController {
  constructor(scene, cameraController, isPlaying) {
    this.scene = scene;
    this.cameraController = cameraController;
    this.isPlaying = isPlaying;
    this.animationQueue = [];
    this.currentAnimationGroup = null;
  }

  async init() {
    this.character = await this.loadMesh();
    this.characterMesh = this.character.meshes[0];
    this.rootMesh = this.makeRootMesh();

    console.log("Character loaded:", this.character);

    // Set camera on bone
    this.cameraController.setCameraOnBone(
      this.characterMesh,
      this.character.skeletons[0]
    );
  }

  async loadMesh() {
    const characterMesh = await ImportMeshAsync(
      "glassesGuySignLab.glb",
      this.scene
    );

    console.log("Character mesh loaded:", characterMesh);

    // Always select the character mesh as active mesh
    characterMesh.meshes.forEach((mesh) => {
      mesh.alwaysSelectAsActiveMesh = true;
    });

    return characterMesh;
  }

  async loadAnimation(signName) {
    try {
      // Get the sign file from the availableSigns array
      const sign = availableSigns.find((sign) => sign.name === signName);

      if (!sign) {
        console.error(`Sign not found: ${signName}`);
        return null;
      }

      const signFile = sign.file;

      const result = await SceneLoader.ImportAnimationsAsync(
        "",
        signFile,
        this.scene
      );

      console.log("Animation loaded:", result);

      return result;
    } catch (error) {
      console.error("Error in loadAnimation:", error.message);
      return null;
    }
  }

  async playAnimation() {
    return new Promise((resolve, reject) => {
      try {
        // Play the animation
        if (
          this.scene.animationGroups &&
          this.scene.animationGroups.length > 0
        ) {
          console.log(
            `Found ${this.scene.animationGroups.length} animation groups`
          );

          console.log("Current animation group", this.currentAnimationGroup);
          // Stop any currently playing animation
          if (this.currentAnimationGroup) {
            this.currentAnimationGroup.stop();
            console.log(
              `Stopped animation: ${this.currentAnimationGroup.name}`
            );
          }

          // Get the latest animation group (which should be the one we just loaded)
          const animationGroup =
            this.scene.animationGroups[this.scene.animationGroups.length - 1];
          this.currentAnimationGroup = animationGroup;

          // Set up position
          this.addAnimationToRootMesh(animationGroup);

          // Set up an onAnimationEnd observer to know when the animation completes
          const observer = animationGroup.onAnimationEndObservable.add(() => {
            console.log(`Animation ${animationGroup.name} ended`);
            // Remove the observer to prevent memory leaks
            animationGroup.onAnimationEndObservable.remove(observer);
            this.isPlaying = false;
            resolve();
          });

          

          // Start the animation (not looping)
          animationGroup.start(false);

          
          this.isPlaying = true;
          console.log(`Animation ${animationGroup.name} started`);
        } else {
          console.error("No animation groups found in the scene");
          this.isPlaying = false;
          reject("No animation groups found");
        }
      } catch (error) {
        console.error("Error playing animation:", error);
        this.isPlaying = false;
        reject(error);
      }
    });
  }

  addAnimationToRootMesh(animationGroup) {
    animationGroup.parent = this.rootMesh;

    // Rotate the root mesh 90 degrees on the X axis
    this.rootMesh.rotation = new Vector3(Math.PI / 2, Math.PI, 0);
    this.rootMesh.position = new Vector3(0, 0, -0.25);

    return animationGroup;
  }

  makeRootMesh() {
    const rootMesh = new TransformNode("rootMesh", this.scene);
    this.characterMesh.parent = rootMesh;

    rootMesh.rotation = new Vector3(0, Math.PI, 0);

    return rootMesh;
  }
}

export default CharacterController;
