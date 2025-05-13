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

  // Load a single animation
  async loadAnimation(signName) {
    try {
      // Get the sign file from the availableSigns array
      const sign = availableSigns.find((sign) => sign.name === signName);

      if (!sign) {
        console.error(`Sign not found: ${signName}`);
        return null;
      }

      const signFile = sign.file;
      console.log("Loading animation:", signFile);

      const result = await SceneLoader.ImportAnimationsAsync(
        "",
        signFile,
        this.scene,
        {
          overwriteAnimations: false, // This prevents existing animations from being overwritten
          animationGroupNamePrefix: "Temp_" + Math.random().toString(36).slice(2)
        }
      );

      result.animationGroups[0].name = signName;

      console.log("Result before returning:", result);

      // Add to the animation queue
      if (result.animationGroups && result.animationGroups.length > 0) {
        // Set the animation group name to the sign name
        result.animationGroups[0].name = signName;
        this.animationQueue.push({
          SignName: signName,
          animationGroup: result.animationGroups[0],
        });
        console.log(
          `Animation ${signName} added to queue. Queue length: ${this.animationQueue.length}`
        );
      } else {
        console.warn(`No animation groups found in animation: ${signName}`);
      }
      return result;
    } catch (error) {
      console.error("Error in loadAnimation:", error.message);
      return null;
    }
  }

  // Load multiple animations and add them to the queue
  async loadMultipleAnimations(signNames) {

    // Create a new AnimationGroup to combine all animations
    const combinedAnimationGroup = new BABYLON.AnimationGroup("combinedAnimations");


    const animationResult = [];

    for (const signName of signNames) {
      console.log("Loading animation:", signName);
        console.log("Loading:", signName);
        const result = await this.loadAnimation(signName);
        animationResult.push(result);
        console.log("result after loadAnimation:", result);
        console.log("Loaded:", signName);
    }

    console.log("Loaded multiple animations:", animationResult);

    // result.forEach((res) => {
    //     if (res.animationGroups && res.animationGroups.length > 0) {
    //         console.log(res.animationGroups[0])
    //     }
    // });


    // console.log("All animations loaded:", this.animationQueue);
    // return this.animationQueue;
  }

  // Add the animation to the root mesh and play it
  async playBlendingAnimation(signName) {
    return new Promise((resolve, reject) => {
      try {
        // Play the animation
        if (this.animationQueue && this.animationQueue.length > 0) {
          console.log(`Found ${this.animationQueue.length} animation groups`);

          // Stop any currently playing animation
          if (this.currentAnimationGroup) {
            this.currentAnimationGroup.stop();
            console.log(
              `Stopped animation: ${this.currentAnimationGroup.name}`
            );
          }

          // Get the latest animation group (which should be the one we just loaded)
          // const animationGroup =
          //   this.scene.animationGroups[this.scene.animationGroups.length - 1];

          // Find the animation group by name
          const animationGroup2 = this.animationQueue.find(
            (group) => group.SignName === signName
          )?.animationGroup;
          console.log("Animation group found:", animationGroup2);

          if (!animationGroup2) {
            console.error(`Animation group not found: ${signName}`);
            this.isPlaying = false;
            reject(`Animation group not found: ${signName}`);
            return;
          }

          this.currentAnimationGroup = animationGroup2;
          console.log("Current animation group", this.currentAnimationGroup);

          // Set up position
          this.addAnimationToRootMesh(this.currentAnimationGroup);

          // Set up an onAnimationEnd observer to know when the animation completes
          const observer =
            this.currentAnimationGroup.onAnimationEndObservable.add(() => {
              console.log(`Animation ${this.currentAnimationGroup.name} ended`);
              // Remove the observer to prevent memory leaks
              this.currentAnimationGroup.onAnimationEndObservable.remove(
                observer
              );
              this.isPlaying = false;
              resolve();
            });

          // Start the animation (not looping)
          this.currentAnimationGroup.start(false);

          this.isPlaying = true;
          console.log(`Animation ${this.currentAnimationGroup.name} started`);
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

  // Add the animation to the root mesh and set its position
  addAnimationToRootMesh(animationGroup) {
    animationGroup.parent = this.rootMesh;

    // Rotate the root mesh 90 degrees on the X axis
    this.rootMesh.rotation = new Vector3(Math.PI / 2, Math.PI, 0);

    // Adjust the position of the root mesh to be in the center of the scene
    this.rootMesh.position = new Vector3(0, 0, -0.25);

    return animationGroup;
  }

  // Create a root mesh to hold the character and its animations
  makeRootMesh() {
    const rootMesh = new TransformNode("rootMesh", this.scene);
    this.characterMesh.parent = rootMesh;

    rootMesh.rotation = new Vector3(0, Math.PI, 0);

    return rootMesh;
  }

  getAnimationGroup(signName) {
    const animationGroup = this.animationQueue.find(
      (group) => group.SignName === signName
    )?.animationGroup;

    if (!animationGroup) {
      console.error(`Animation group not found: ${signName}`);
      return null;
    }

    return animationGroup;
  }
}

export default CharacterController;
