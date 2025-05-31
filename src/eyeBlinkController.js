import { Animation, AnimationGroup, Vector3 } from "babylonjs";
import { eyeAnimationData } from "./eyeAnimationData.js";

class EyeBlinkController {
  constructor(loadedResults, scene) {
    this.loadedResults = loadedResults;
    this.scene = scene;
    this.leftEyeBone = null;
    this.rightEyeBone = null;
    this.blinkAnimationGroup = null;
    this.isBlinking = false;
  }

  createEyeBlinkAnimation() {
    if (!this.leftEyeBone || !this.rightEyeBone) {
      console.error("Eye bones not initialized");
      return;
    }

    // Stop any existing blink animation
    this.stopEyeBlinkAnimation();

    // Create animation group for eye blinks
    this.blinkAnimationGroup = new AnimationGroup("EyeBlinkAnimation", this.scene);

    // Import the eye animation from JSON data
    const eyeAnimData = eyeAnimationData.animations[0];
    
    // Create animation for left eye from the provided data
    const leftEyeAnimation = this.createEyeAnimationFromData(eyeAnimData, "leftEyeBlink");
    if (leftEyeAnimation) {
      this.blinkAnimationGroup.addTargetedAnimation(leftEyeAnimation, this.leftEyeBone);
    }

    // Create animation for right eye (using the same data)
    const rightEyeAnimation = this.createEyeAnimationFromData(eyeAnimData, "rightEyeBlink");
    if (rightEyeAnimation) {
      this.blinkAnimationGroup.addTargetedAnimation(rightEyeAnimation, this.rightEyeBone);
    }

    // Start the animation group in a loop
    this.blinkAnimationGroup.start(true);
    this.isBlinking = true;

    console.log("Eye blink animation started with custom animation data");
  }

  createEyeAnimationFromData(animData, animationName) {
    try {
      // Create animation based on the property type
      const animation = new Animation(
        animationName,
        animData.property, // "position" from the data
        animData.framePerSecond || 60,
        Animation.ANIMATIONTYPE_VECTOR3, // Since position is a Vector3
        animData.loopBehavior === 1 ? Animation.ANIMATIONLOOPMODE_CYCLE : Animation.ANIMATIONLOOPMODE_CONSTANT
      );

      // Convert the key data to Babylon.js format
      const keys = animData.keys.map(key => ({
        frame: key.frame,
        value: new Vector3(key.values[0], key.values[1], key.values[2])
      }));

      animation.setKeys(keys);
      
      // Enable blending if specified
      if (animData.enableBlending) {
        animation.enableBlending = true;
        animation.blendingSpeed = animData.blendingSpeed || 0.05;
      }

      return animation;
    } catch (error) {
      console.error("Error creating eye animation from data:", error);
      return null;
    }
  }

  createRandomBlinkAnimation(animationName) {
    const animation = new Animation(
      animationName,
      "rotation.x", // Rotate around X axis to close eyes
      30, // FPS
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const keys = [];
    let currentFrame = 0;
    
    // Create 10 seconds worth of animation (300 frames at 30fps)
    const totalFrames = 300;
    
    while (currentFrame < totalFrames) {
      // Eyes open
      keys.push({ frame: currentFrame, value: 0 });
      
      // Random wait between 30-120 frames (1-4 seconds)
      const waitFrames = Math.floor(Math.random() * 90) + 30;
      currentFrame += waitFrames;
      
      if (currentFrame >= totalFrames) break;
      
      // Blink pattern - sometimes single, sometimes double blink
      const isDoubleBlink = Math.random() > 0.7; // 30% chance of double blink
      
      // First blink
      keys.push({ frame: currentFrame, value: 0 }); // Start open
      keys.push({ frame: currentFrame + 3, value: 0.3 }); // Close eye (rotation value)
      keys.push({ frame: currentFrame + 6, value: 0.3 }); // Hold closed
      keys.push({ frame: currentFrame + 9, value: 0 }); // Open
      
      currentFrame += 12;
      
      if (isDoubleBlink && currentFrame < totalFrames - 12) {
        // Second blink for double blink
        keys.push({ frame: currentFrame + 3, value: 0.3 }); // Close again
        keys.push({ frame: currentFrame + 6, value: 0.3 }); // Hold closed
        keys.push({ frame: currentFrame + 9, value: 0 }); // Open
        currentFrame += 12;
      }
    }
    
    // Ensure we end with eyes open
    if (keys[keys.length - 1].value !== 0) {
      keys.push({ frame: totalFrames, value: 0 });
    }

    animation.setKeys(keys);
    return animation;
  }

  stopEyeBlinkAnimation() {
    if (this.blinkAnimationGroup) {
      this.blinkAnimationGroup.stop();
      this.blinkAnimationGroup.dispose();
      this.blinkAnimationGroup = null;
    }
    this.isBlinking = false;
    
    // Reset eye positions to default
    if (this.leftEyeBone) {
      this.leftEyeBone.position = new Vector3(0.030352698639035225,-0.08240616321563721,0.08783961832523346);
    }
    if (this.rightEyeBone) {
      // Mirror the X position for right eye
      this.rightEyeBone.position = new Vector3(-0.030352698639035225,-0.08240616321563721,0.08783961832523346);
    }
    
    console.log("Eye blink animation stopped");
  }

  // Toggle eye blink animation
  toggleEyeBlinkAnimation() {
    if (this.isBlinking) {
      this.stopEyeBlinkAnimation();
      return false;
    } else {
      this.createEyeBlinkAnimation();
      return true;
    }
  }
  
  // Toggle between custom data animation and random animation
  toggleAnimationType(useRandom = false) {
    this.useRandomAnimation = useRandom;
    if (this.isBlinking) {
      this.stopEyeBlinkAnimation();
      this.createEyeBlinkAnimation();
    }
  }
}

export default EyeBlinkController;