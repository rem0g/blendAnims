import {
  ImportMeshAsync,
  TransformNode,
  Vector3,
  SceneLoader,
  ImportAnimationsAsync,
} from "babylonjs";
import { availableSigns, availableSignsMap } from "./availableSigns.js";
import EyeBlinkController from "./eyeBlinkController.js";

// Class to load and control the character
class CharacterController {
  constructor(scene, cameraController, isPlaying) {
    this.scene = scene;
    this.cameraController = cameraController;
    this.isPlaying = isPlaying;
    this.animationGroup = null;
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

  lockHips() {
    console.log("Skeletons:", this.character.skeletons);
    if (this.character.skeletons[0]) {
      const hipBone = this.character.skeletons[0].bones.find(
        (bone) => bone.name === "Hips"
      );

      if (hipBone) {
        hipBone.setPosition(new Vector3(0, 1, 0), BABYLON.Space.WORLD);
        hipBone.setRotation(new Vector3(0, 0, 0), BABYLON.Space.WORLD);
      }

      // translatie van de hips verwijderen bij inladen
    }
  }

  async loadMesh() {
    const loadedResults = await ImportMeshAsync(
      "glassesGuySignLab.glb",
      this.scene
    );

    console.log("Character mesh loaded:", loadedResults);

    // Eye blinking does not work yet
    // const eyeBlinkController = new EyeBlinkController(loadedResults);
    // eyeBlinkController.createEyeBlinkAnimation(this.scene);

    // Always select the character mesh as active mesh
    loadedResults.meshes.forEach((mesh) => {
      mesh.alwaysSelectAsActiveMesh = true;
    });

    return loadedResults;
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

      // Check if the sign file is not already loaded, to prevent duplicates
      const loadedAnimationGroups = this.scene.animationGroups.filter(
        (group) => group.name === signName
      );
      if (loadedAnimationGroups.length > 0) {
        console.log(`Animation group already loaded: ${signName}`);
        return loadedAnimationGroups[0];
      }

      const signFile = sign.file;
      console.log("Loading animation:", signFile);

      const result = await SceneLoader.ImportAnimationsAsync(
        "",
        signFile,
        this.scene,
        false,
        BABYLON.SceneLoaderAnimationGroupLoadingMode.NoSync
      );

      // Find the animationgroup that was just loaded
      let myAnimation = result.animationGroups.find(
        (x, i) => x.name === "Unreal Take" && i != 0
      );

      // Non-destructive trim of the animation
      // myAnimation.normalize(availableSignsMap[signName].start, availableSignsMap[signName].end);

      const startFrame = availableSignsMap[signName].start;
      const endFrame = availableSignsMap[signName].end;
      // Hard trim of the animation
      myAnimation = this.hardTrim(myAnimation, startFrame, endFrame);

      // Remove the animation from the hips
      // console.log("Animation group before removing hips:", myAnimation);
      // myAnimation.targetedAnimations[0].animation.keys = [];
      myAnimation.targetedAnimations.forEach(targetedAnim => {
          if (targetedAnim.target !== null && targetedAnim.animation !== null) {
              if (targetedAnim.target.name === "Hips") {
                console.log("Removing hips animation:", targetedAnim);
                  if (targetedAnim.animation.targetProperty === "rotationQuaternion") {
                      targetedAnim.animation._keys.forEach(key => {
                          key.value.x = 0;
                          key.value.y = 0;
                          key.value.z = 0;
                      });

                      console.log("Hips rotation disabled.");
                  } else if (targetedAnim.animation.targetProperty === "position") {
                      targetedAnim.animation._keys.forEach(key => {
                          key.value.x = 0;
                          key.value.y = 0;
                          key.value.z = 1;
                      });

                      console.log("Hips position disabled.");
                  }
              }
          }
      });

                    
      
      console.log("Animation group after removing hips:", myAnimation);
      // Rename the animationgroup to the signName
      myAnimation.name = signName;

      return myAnimation;
    } catch (error) {
      console.error("Error in loadAnimation:", error.message);
      return null;
    }
  }

  // Delete the keyframes outside the start and end frames from the animationgroup
  hardTrim(animationGroup, start, end) {
    animationGroup.targetedAnimations.forEach((e) => {
      var keys = e.animation.getKeys();
      const startIndex = keys.findIndex((e) => e.frame >= start);
      const endIndex = keys.findIndex((e) => e.frame >= end);
      keys = e.animation.getKeys().slice(startIndex, endIndex);
      keys = keys.map((key) => ({
        ...key,
        frame: key.frame - start,
      }));

      e.animation.setKeys(keys);
    });
    animationGroup.normalize(0, end - start);

    return animationGroup;
  }

  // Load multiple animations and add them to the queue
  async loadMultipleAnimations(signNames) {
    const animationResult = [];

    for (const signName of signNames) {
      const result = await this.loadAnimation(signName);
      animationResult.push(result);
      console.log("Loaded:", signName);
    }

    return animationResult;
  }

  // Play a single animation (depricated)
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

  // Play the animationgroup
  async playAnimationGroup(animationGroup) {
    return new Promise((resolve, reject) => {
      try {
        // Stop any currently playing animation
        if (this.currentAnimationGroup) {
          this.currentAnimationGroup.stop();
          console.log(`Stopped animation: ${this.currentAnimationGroup.name}`);
        }

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
    // this.rootMesh.rotation = new Vector3(Math.PI / 2, Math.PI, 0);

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
