import {
  ImportMeshAsync,
  TransformNode,
  Vector3,
  SceneLoader,
  ImportAnimationsAsync,
  Animation,
  RuntimeAnimation,
  BoneLookController,
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
    this.morphTargetManagers = [];
    this.eyeLookObserver = null;
    this.leftEyeLookController = null;
    this.rightEyeLookController = null;
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
    const loadedResults = await ImportMeshAsync(
      "glassesGuySignLab.glb",
      this.scene
    );

    const leftEyeBone = loadedResults.skeletons[0].bones.find(
      (bone) => bone.name === "LeftEye"
    );

    const rightEyeBone = loadedResults.skeletons[0].bones.find(
      (bone) => bone.name === "RightEye"
    );
    if (!leftEyeBone || !rightEyeBone) {
      console.error("Left or Right Eye bone not found in the skeleton");
    }

    // Initialize eye blink controller
    this.eyeBlinkController = new EyeBlinkController(loadedResults, this.scene);
    this.eyeBlinkController.leftEyeBone = leftEyeBone;
    this.eyeBlinkController.rightEyeBone = rightEyeBone;

    this.leftEyeLookController = new BoneLookController(
      loadedResults,
      leftEyeBone,
      this.cameraController.camera.position
    );

    this.rightEyeLookController = new BoneLookController(
      loadedResults,
      rightEyeBone,
      this.cameraController.camera.position
    );

    // todo, FIX THIS!
    // // Set the look controllers to update every frame
    // this.scene.onBeforeRenderObservable.add(() => {
    //   if (lookCtrLeft && lookCtrRight) {
    //     lookCtrLeft.update();
    //     lookCtrRight.update();
    //   }
    // });

    // Always select the character mesh as active mesh
    loadedResults.meshes.forEach((mesh) => {
      mesh.alwaysSelectAsActiveMesh = true;

      if (mesh.morphTargetManager) {
        this.morphTargetManagers.push(mesh.morphTargetManager);
      }
    });

    console.log("Morph target managers:", this.morphTargetManagers);

    return loadedResults;
  }

  // Load a single animation
  async loadAnimation(signName, shouldClone = false, apiSign = null) {
    try {
      // Get the sign file from the availableSigns array or use API sign
      let sign = apiSign || availableSigns.find((sign) => sign.name === signName);

      if (!sign) {
        console.error(`Sign not found: ${signName}`, `apiSign:`, apiSign);
        console.error(`Available signs:`, availableSigns.map(s => s.name));
        return null;
      }

      // Check if animation already exists
      const existingGroup = this.scene.animationGroups.find(
        (group) => group.name === signName
      );
      
      if (existingGroup) {
        if (shouldClone) {
          console.log(`Cloning existing animation: ${signName}`);
          // Clone the animation with a unique name including timestamp
          const clonedGroup = existingGroup.clone(`${signName}_${Date.now()}`);
          clonedGroup.name = signName; // Keep original name for reference
          clonedGroup.onAnimationGroupEndObservable.clear();
          return clonedGroup;
        } else {
          console.log(`Animation group already loaded: ${signName}`);
          existingGroup.onAnimationGroupEndObservable.clear();
          return existingGroup;
        }
      }

      const signFile = sign.file;
      console.log("Loading animation:", signFile, sign.isApi ? "(from API)" : "(local)");

      // For API signs, we need to specify the file extension for proper loading
      let loadUrl = signFile;
      if (sign.isApi && !signFile.includes('.glb')) {
        // Ensure .glb extension is in the URL for proper plugin detection
        loadUrl = signFile.includes('.fbx') ? signFile.replace(/\.fbx$/i, '.glb') : signFile + '.glb';
      }

      const result = await SceneLoader.ImportAnimationsAsync(
        "",
        loadUrl,
        this.scene,
        false,
        BABYLON.SceneLoaderAnimationGroupLoadingMode.NoSync
      );

      // Find the animationgroup that was just loaded
      let myAnimation = result.animationGroups.find(
        (x, i) => x.name === "Unreal Take" && i != 0
      );
      // myAnimation = this.retargetAnimWithBlendshapes(this.character, myAnimation);

      console.log("myAnimation:", myAnimation);

      if (!myAnimation) {
        console.error(`Animation group not found in ${signFile}`);
        return null;
      }

      const frameRange = this.getFrameRange(signName, myAnimation);

      console.log(
        `Frame range for ${signName}: start=${frameRange.start}, end=${frameRange.end}`
      );

      // Non-destructive trim of the animation
      myAnimation.normalize(frameRange.start, frameRange.end);

      // Hard trim of the animation, if needed
      // myAnimation = this.hardTrim(myAnimation, startFrame, endFrame);

      // const easingFunction = new BABYLON.BackEase(10);
      // easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEIN);

      // Remove the animation from the hips and eye channels
      // console.log("Animation group before removing hips:", myAnimation);
      // myAnimation.targetedAnimations[0].animation.keys = [];

      // Remove eye channel animations by clearing their keys
      myAnimation.targetedAnimations.forEach((targetedAnim) => {
        if (targetedAnim.target !== null && targetedAnim.animation !== null) {
          // Remove Unreal Take_channel8_0 and Unreal Take_channel9_0 (eye animations)
                      console.log("Targeted animation:", targetedAnim.target.name, targetedAnim.animation);

          //get list of all targetedAnim
          if (targetedAnim.target.name === "morphTarget0" || 
              targetedAnim.target.name === "morphTarget1" ||
              targetedAnim.target.name === "morphTarget2" ||
              targetedAnim.target.name === "morphTarget3" ||
              targetedAnim.target.name === "morphTarget4" ||
              targetedAnim.target.name === "morphTarget5" ||
              targetedAnim.target.name === "morphTarget6" ) {
            console.log(`Clearing eye animation channel: ${targetedAnim.target.name}`);

            // Clear all animation keys to effectively disable the animation
            targetedAnim.animation._keys.forEach((key) => {
                          key.value = 0;
                        });           
                      }
          // Remove the hips animation
          else if (targetedAnim.target.name === "Hips") {
            if (
              targetedAnim.animation.targetProperty === "rotationQuaternion"
            ) {
              targetedAnim.animation._keys.forEach((key) => {
                key.value.x = 0;
                key.value.y = 0;
                key.value.z = 0;
              });
            } else if (targetedAnim.animation.targetProperty === "position") {
              targetedAnim.animation._keys.forEach((key) => {
                key.value.x = 0;
                key.value.y = 0;
                key.value.z = 1;
              });
            }
          } else if (targetedAnim.target.name === "morphTarget57") {
            // console.log("morphTarget57", targetedAnim.animation._keys);
            // Remove the morph target animation
            // targetedAnim.animation._keys = [{}];
          } else if (targetedAnim.target.name === "morphTarget58") {
            // Remove the morph target animation
            // targetedAnim.animation._keys = [];
          }
        }
      });

      // Rename the animationgroup to the signName
      myAnimation.name = signName;

      // Blendshape van ogen uitzetten
      // console.log("Disabling eye blendshapes f/or animation:", targetedAnim.animation);
      // ogen zetten op camera

      return myAnimation;
    } catch (error) {
      console.error("Error in loadAnimation:", error.message);
      return null;
    }
  }

  // Get the frame range from the availableSignsMap, otherwise use the animationGroup's from and to values
  getFrameRange(signName, animationGroup) {
    const sign = availableSignsMap[signName];
    if (!sign) {
      // For API-loaded signs, use the full animation range
      console.log(`Sign not in local library: ${signName}, using full animation range`);
      return {
        start: animationGroup.from,
        end: animationGroup.to
      };
    }

    let startFrame;
    if (availableSignsMap[signName].start == null) {
      startFrame = animationGroup.from;
      console.warn(
        `No start frame defined for ${signName}, using animation start frame: ${startFrame}`
      );
      availableSignsMap[signName].start = startFrame;
    } else {
      startFrame = availableSignsMap[signName].start;
    }

    let endFrame;
    if (availableSignsMap[signName].end == null) {
      endFrame = animationGroup.to;
      console.warn(
        `No end frame defined for ${signName}, using animation end frame: ${endFrame}`
      );
      availableSignsMap[signName].end = endFrame;
    } else {
      endFrame = availableSignsMap[signName].end;
    }

    console.log(availableSignsMap);

    return {
      start: startFrame,
      end: endFrame,
    };
  }

  /*
    Function: retargetAnimWithBlendshapes

    Description:
    This function takes a target mesh and an animation group and retargets the animation group
    to the target mesh. Most importantly, it will also retarget the animation group to the blendshapes
    which babylon does not do by default.

    Parameters:
    - targetMeshAsset: The mesh to retarget the animation to.
    - animGroup: The animation group to retarget.
    - cloneName: The name of the cloned animation group.

    Returns:
    Void, but the animation group will be retargeted to the target mesh.
    And we are able to play this animation group on the target mesh through the scene object.
*/
  retargetAnimWithBlendshapes(targetMeshAsset, animGroup, cloneName = "anim") {
    console.log("Retargeting animation to target mesh...");

    let morphName = null;
    let curMTM = 0;
    let morphIndex = 0;
    let mtm;
    
    // Generate a unique clone name with timestamp to avoid conflicts
    const uniqueCloneName = `${cloneName}_${Date.now()}`;

    return animGroup.clone(uniqueCloneName, (target) => {
      if (!target) {
        console.log("No target.");
        return null;
      }

      // First set all bone targets to the linkedTransformNode
      let idx = targetMeshAsset.skeletons[0].getBoneIndexByName(target.name);
      let targetBone = targetMeshAsset.skeletons[0].bones[idx];
      if (targetBone) {
        return targetBone._linkedTransformNode;
      }

      // Iterate over morphManagers if we don't have a new morph target
      // Otherwise reset the index
      if (morphName !== target.name) {
        curMTM = 0;
        morphName = target.name;
      }

      // If we don't have bones anymore, we can assume we are in the morph target section
      morphIndex = this.getMorphTargetIndex(
        this.morphTargetManagers[curMTM],
        target.name
      );

      // Sometimes a mesh has extra bits of clothing like glasses, which are not part of the morph targets.
      // Because we don't know the order of the morph targets, we need to copy these values to the previous one.
      if (morphIndex === -1) {
        if (!mtm) {
          return null;
        } else {
          return mtm;
        }
      }

      mtm = this.morphTargetManagers[curMTM].getTarget(morphIndex);
      curMTM++;

      return mtm;
    });
  }

  // Helper function to get the morph target index, since babylon only provides
  // morph targets through the index. Which follow GLTF standards but is not useful for us.
  getMorphTargetIndex(morphTargetManager, targetName) {
    if (!morphTargetManager) {
      console.error("Morph target manager not found.");
      return -1;
    }

    for (let i = 0; i < morphTargetManager.numTargets; i++) {
      if (morphTargetManager.getTarget(i).name === targetName) {
        return i;
      }
    }

    return -1;
  }

  // Delete the keyframes outside the start and end frames from the animationgroup
  hardTrim(animationGroup, start, end) {
    animationGroup.targetedAnimations.forEach((e) => {
      let keys = e.animation.getKeys();
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
  async loadMultipleAnimations(signNames, sequenceItems = null) {
    const animationResult = [];

    for (let i = 0; i < signNames.length; i++) {
      const signName = signNames[i];
      const sequenceItem = sequenceItems ? sequenceItems[i] : null;
      
      // Check if this is an API sign
      let apiSign = null;
      if (sequenceItem && sequenceItem.sign && sequenceItem.sign.isApi) {
        apiSign = {
          name: sequenceItem.sign.name,
          file: sequenceItem.sign.file,
          isApi: true,
          originalUrl: sequenceItem.sign.originalUrl,
          filename: sequenceItem.sign.filename
        };
      }
      
      // Clone animations when loading for sequence playback
      const result = await this.loadAnimation(signName, true, apiSign);
      animationResult.push(result);
      console.log("Loaded:", signName, apiSign ? "(API)" : "(local)");
    }

    return animationResult;
  }

  // Play a single animation using the sign name
  async playAnimation(signName) {
    return new Promise((resolve, reject) => {
      try {
        // Play the animation
        if (
          this.scene.animationGroups &&
          this.scene.animationGroups.length > 0
        ) {
          console.log(
            `Found ${
              this.scene.animationGroups.length
            } animation groups: ${this.scene.animationGroups
              .map((group) => group.name)
              .join(", ")}`
          );

          // Stop any currently playing animation
          if (this.currentAnimationGroup) {
            this.currentAnimationGroup.stop();
            console.log(
              `Stopped animation: ${this.currentAnimationGroup.name}`
            );
          }

          // Get the correct animation group by name
          const animationGroup = this.scene.animationGroups.find(
            (group) => group.name === signName
          );
          
          if (!animationGroup) {
            console.error(`Animation group not found for sign: ${signName}`);
            this.isPlaying = false;
            reject(`Animation group not found for sign: ${signName}`);
            return;
          }
          
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

          // The animation has already been normalized in loadAnimation, no need to do it again

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

  // Play the given animation group
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
    // Animation groups don't have a parent property - they're applied to meshes/bones
    // The animation targets are already set during retargeting
    
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
  
  // Toggle eye movement and return the current state
  toggleEyeMovement() {
    if (!this.leftEyeLookController || !this.rightEyeLookController) {
      console.warn("Eye look controllers not initialized");
      return false;
    }
    
    if (this.eyeLookObserver) {
      // Disable eye movement
      this.scene.onBeforeRenderObservable.remove(this.eyeLookObserver);
      this.eyeLookObserver = null;
      return false;
    } else {
      // Enable eye movement
      this.eyeLookObserver = this.scene.onBeforeRenderObservable.add(() => {
        if (this.leftEyeLookController && this.rightEyeLookController) {
          // Update target to current camera position
          this.leftEyeLookController.target = this.cameraController.camera.position;
          this.rightEyeLookController.target = this.cameraController.camera.position;
          this.leftEyeLookController.update();
          this.rightEyeLookController.update();
        }
      });
      return true;
    }
  }
}

export default CharacterController;
