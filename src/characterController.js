import {
  ImportMeshAsync,
  TransformNode,
  Vector3,
  SceneLoader,
  ImportAnimationsAsync,
  Animation,
  AnimationGroup,
  RuntimeAnimation,
  BoneLookController,
  Quaternion,
  Matrix,
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
    
    // Initialize mouse eye tracking
    this.initializeMouseEyeTracking();

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
      // Check if animation already exists
      const existingGroup = this.scene.animationGroups.find(
        (group) => group.name === signName
      );
      
      if (existingGroup) {
        // Check if this is a generated animation (like a hold animation)
        if (signName.includes('_hold_')) {
          // This is a generated static animation, return it directly
          if (shouldClone) {
            console.log(`Cloning existing generated animation: ${signName}`);
            const clonedGroup = existingGroup.clone(`${signName}_${Date.now()}`);
            clonedGroup.name = signName;
            clonedGroup.onAnimationGroupEndObservable.clear();
            return clonedGroup;
          } else {
            console.log(`Returning existing generated animation: ${signName}`);
            existingGroup.onAnimationGroupEndObservable.clear();
            return existingGroup;
          }
        }
        
        // Regular existing animation
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
      
      // Get the sign file from the availableSigns array or use API sign
      let sign = apiSign || availableSigns.find((sign) => sign.name === signName);

      if (!sign) {
        console.error(`Sign not found: ${signName}`, `apiSign:`, apiSign);
        console.error(`Available signs:`, availableSigns.map(s => s.name));
        return null;
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
                      // console.log("Targeted animation:", targetedAnim.target.name, targetedAnim.animation);

          //get list of all targetedAnim

          //morphtarget
          //0
                      console.log(targetedAnim.animation.targetProperty);

          if (targetedAnim.target.name === "LeftEye" || targetedAnim.target.name === "RightEye"
        ) {
            console.log(`Clearing eye animation channel: ${targetedAnim.target.name}`);
            // console.log()
            // Clear all animation keys to effectively disable the animation
            console.log(targetedAnim.animation);
         
            targetedAnim.animation._keys.forEach((key) => {
              console.log("Clearing key:", key);
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
  
  // Initialize mouse eye tracking system
  initializeMouseEyeTracking() {
    // Get both eye nodes by name from the scene
    this.leftEye = this.scene.getNodeByName("LeftEye");
    this.rightEye = this.scene.getNodeByName("RightEye");
    
    if (!this.leftEye && !this.rightEye) {
      console.warn("No eye nodes found in scene for tracking");
      return;
    }

    // Ensure we can rotate with quaternions for both eyes
    if (this.leftEye) {
      this.leftEye.rotationQuaternion ||= Quaternion.Identity();
    }
    if (this.rightEye) {
      this.rightEye.rotationQuaternion ||= Quaternion.Identity();
    }

    // Don't start automatically - wait for user to enable via button
    // this.startMouseEyeTracking();
  }

  // Start mouse eye tracking
  startMouseEyeTracking() {
    if (this.mouseEyeTrackingObserver) {
      // Already tracking
      return;
    }

    // Every frame: make both eyes look at the camera
    this.mouseEyeTrackingObserver = this.scene.onBeforeRenderObservable.add(() => {
      if (!this.scene.activeCamera) return;
      if (!this.leftEye && !this.rightEye) return;

      const camPos = this.scene.activeCamera.globalPosition;
      
      // Process left eye
      if (this.leftEye) {
        const eyeWorld = this.leftEye.getAbsolutePosition();
        
        // World-space direction from eye → camera
        const dir = camPos.subtract(eyeWorld).normalize();
        
        // Convert to the eye's *local* space
        const invParent = this.leftEye.getWorldMatrix().invert();
        const localDir = Vector3.TransformNormal(dir, invParent);
        
        const yaw = Math.atan2(localDir.x, localDir.z);   // left/right
        const pitch = Math.asin(-localDir.y);             // up/down
        
        // Build a quaternion without clamping (no limits)
        this.leftEye.rotationQuaternion.copyFrom(
          Quaternion.FromEulerAngles(pitch, yaw, 0)
        );
      }
      
      // Process right eye
      if (this.rightEye) {
        const eyeWorld = this.rightEye.getAbsolutePosition();
        
        // World-space direction from eye → camera
        const dir = camPos.subtract(eyeWorld).normalize();
        
        // Convert to the eye's *local* space
        const invParent = this.rightEye.getWorldMatrix().invert();
        const localDir = Vector3.TransformNormal(dir, invParent);
        
        const yaw = Math.atan2(localDir.x, localDir.z);   // left/right
        const pitch = Math.asin(-localDir.y);             // up/down
        
        // Build a quaternion without clamping (no limits)
        this.rightEye.rotationQuaternion.copyFrom(
          Quaternion.FromEulerAngles(pitch, yaw, 0)
        );
      }
    });

    console.log("Camera eye tracking started");
  }

  // Stop mouse eye tracking
  stopMouseEyeTracking() {
    if (this.mouseEyeTrackingObserver) {
      this.scene.onBeforeRenderObservable.remove(this.mouseEyeTrackingObserver);
      this.mouseEyeTrackingObserver = null;
      
      // Reset both eyes rotation to neutral
      if (this.leftEye && this.leftEye.rotationQuaternion) {
        this.leftEye.rotationQuaternion = Quaternion.Identity();
      }
      if (this.rightEye && this.rightEye.rotationQuaternion) {
        this.rightEye.rotationQuaternion = Quaternion.Identity();
      }
      
      console.log("Camera eye tracking stopped");
    }
  }
  
  // Toggle mouse eye tracking
  toggleMouseEyeTracking() {
    if (this.mouseEyeTrackingObserver) {
      this.stopMouseEyeTracking();
      return false;
    } else {
      this.startMouseEyeTracking();
      return true;
    }
  }
  
  // Manually set eye rotation for both eyes
  setEyeRotation(x, y, z) {
    // Get both eye nodes
    if (!this.leftEye) {
      this.leftEye = this.scene.getNodeByName("LeftEye");
      if (this.leftEye) {
        this.leftEye.rotationQuaternion ||= Quaternion.Identity();
      }
    }
    
    if (!this.rightEye) {
      this.rightEye = this.scene.getNodeByName("RightEye");
      if (this.rightEye) {
        this.rightEye.rotationQuaternion ||= Quaternion.Identity();
      }
    }
    
    if (!this.leftEye && !this.rightEye) {
      console.warn("Neither LeftEye nor RightEye nodes found");
      return false;
    }
    
    // Convert degrees to radians
    const xRad = x * (Math.PI / 180);
    const yRad = y * (Math.PI / 180);
    const zRad = z * (Math.PI / 180);
    
    // Create the rotation quaternion
    const rotation = Quaternion.FromEulerAngles(xRad, yRad, zRad);
    
    // Apply to both eyes
    if (this.leftEye) {
      this.leftEye.rotationQuaternion = rotation.clone();
    }
    
    if (this.rightEye) {
      this.rightEye.rotationQuaternion = rotation.clone();
    }
    
    return true;
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

  // Create a static animation from a single frame
  async createStaticFrameAnimation(sourceAnimationGroup, frameNumber, newName, duration = 10) {
    try {
      console.log(`Creating static animation from frame ${frameNumber} of ${sourceAnimationGroup.name}`);
      
      // Create a new animation group
      const staticAnimationGroup = new AnimationGroup(newName, this.scene);
      
      // Get the frame data for each targeted animation at the specified frame
      sourceAnimationGroup.targetedAnimations.forEach((targetedAnim) => {
        const animation = targetedAnim.animation;
        const target = targetedAnim.target;
        
        // Get the value at the specified frame
        const frameValue = this.getAnimationValueAtFrame(animation, frameNumber);
        if (frameValue === null) {
          console.warn(`No value found at frame ${frameNumber} for ${animation.targetProperty}`);
          return;
        }
        
        // Create a new animation with static keys
        const staticAnimation = new Animation(
          `${newName}_${animation.targetProperty}`,
          animation.targetProperty,
          animation.framePerSecond,
          animation.dataType,
          animation.loopMode
        );
        
        // Create keys for the static animation
        const keys = [];
        for (let i = 0; i <= duration; i++) {
          keys.push({
            frame: i,
            value: frameValue
          });
        }
        
        staticAnimation.setKeys(keys);
        
        // Enable blending for smooth transitions
        staticAnimation.enableBlending = true;
        staticAnimation.blendingSpeed = 0.01;
        
        // Add to the static animation group
        staticAnimationGroup.addTargetedAnimation(staticAnimation, target);
      });
      
      // Normalize the animation group
      staticAnimationGroup.normalize(0, duration);
      
      console.log(`Created static animation group: ${newName} with ${staticAnimationGroup.targetedAnimations.length} animations`);
      
      return staticAnimationGroup;
      
    } catch (error) {
      console.error("Error creating static frame animation:", error);
      return null;
    }
  }
  
  // Helper method to get animation value at a specific frame
  getAnimationValueAtFrame(animation, frame) {
    const keys = animation.getKeys();
    
    // Find the exact key or interpolate between keys
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].frame === frame) {
        // Clone the value to avoid reference issues
        return this.cloneValue(keys[i].value);
      } else if (i > 0 && keys[i-1].frame < frame && keys[i].frame > frame) {
        // Interpolate between two keys
        const ratio = (frame - keys[i-1].frame) / (keys[i].frame - keys[i-1].frame);
        return this.interpolateValues(keys[i-1].value, keys[i].value, ratio, animation.dataType);
      }
    }
    
    // If frame is after the last key, return the last value
    if (keys.length > 0 && frame >= keys[keys.length - 1].frame) {
      return this.cloneValue(keys[keys.length - 1].value);
    }
    
    return null;
  }
  
  // Clone a value based on its type
  cloneValue(value) {
    if (value === null || value === undefined) return value;
    
    // Handle Babylon.js types
    if (value.clone) {
      return value.clone();
    }
    
    // Handle numbers
    if (typeof value === 'number') {
      return value;
    }
    
    // Handle objects (shallow clone)
    if (typeof value === 'object') {
      return { ...value };
    }
    
    return value;
  }
  
  // Interpolate between two values
  interpolateValues(value1, value2, ratio, dataType) {
    // Handle numbers
    if (typeof value1 === 'number' && typeof value2 === 'number') {
      return value1 + (value2 - value1) * ratio;
    }
    
    // Handle Vector3
    if (value1.x !== undefined && value1.y !== undefined && value1.z !== undefined) {
      return new Vector3(
        value1.x + (value2.x - value1.x) * ratio,
        value1.y + (value2.y - value1.y) * ratio,
        value1.z + (value2.z - value1.z) * ratio
      );
    }
    
    // Handle Quaternion
    if (value1.x !== undefined && value1.y !== undefined && value1.z !== undefined && value1.w !== undefined) {
      return Quaternion.Slerp(value1, value2, ratio);
    }
    
    // Default: return the first value
    return this.cloneValue(value1);
  }
}

export default CharacterController;
