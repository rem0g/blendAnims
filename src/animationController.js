// Class to contol the animations of the avatar
class AnimationController {
  constructor(scene, characterController, isPlaying, recorder) {
    this.scene = scene;
    this.characterController = characterController;
    this.isPlaying = isPlaying;
    this.transitionDuration = 0.5; // Duration for blending animations hardcoded for now
    this.recorder = recorder;

    console.log("this.recorder", this.recorder);
  }

  // Initialize the AnimationController
  init(sequenceItems) {
    this.sequenceItems = sequenceItems;
  }

  // Clean up any existing observers and reset state
  cleanup() {
    if (this._currentAnimObserver) {
      // Try to remove the observer if it exists
      try {
        // We can't easily track which animation group the observer belongs to,
        // so we'll just set it to null and let the new sequence handle cleanup
        this._currentAnimObserver = null;
      } catch (error) {
        console.warn("Error cleaning up animation observer:", error);
      }
    }
    this.isPlaying = false;
  }

  // Play a single sign animation
  async playSign(signName) {
    console.log(`Playing sign: ${signName}`);

    if (this.characterController) {
      try {
        // Load and queue the animation
        await this.characterController.loadAnimation(signName);
        await this.characterController.playAnimation(signName);
      } catch (error) {
        console.error(`Error loading animation for ${signName}:`, error);
      }
    } else {
      console.warn("Character controller not available for animation");
    }
  }

  async playSequence(signNames, blending = false, isRecording) {
    if (!this.characterController) {
      console.warn("Character controller not available for blending");
      return;
    }

    if (this.isPlaying) {
      console.warn("Animation is already playing, cannot blend");
      return;
    }

    // Clean up any previous state
    this.cleanup();

    // Disable play button during playback
    const playButton = document.getElementById("play-sequence-button");
    if (playButton) {
      playButton.disabled = true;
      playButton.innerHTML = "Playing...";
    }

    this.isPlaying = true;

    try {
      // Load all animation groups for blending
      const animationGroups =
        await this.characterController.loadMultipleAnimations(signNames);

      if (!animationGroups || animationGroups.length == 0) {
        console.warn("No animation groups loaded for blending");
        this.isPlaying = false;
        
        // Re-enable play button
        if (playButton) {
          playButton.disabled = false;
          playButton.innerHTML = "Play Sequence";
        }
        return;
      }

      let currentIndex = 0;

      // Function to handle sequence completion
      const onSequenceComplete = () => {
        console.log("Finished playing all animations in sequence");
        this.isPlaying = false;
        
        // Re-enable play button
        if (playButton) {
          playButton.disabled = false;
          playButton.innerHTML = "Play Sequence";
        }
      };

      // Function to play the next animation in sequence
      const playNextAnimation = () => {
        // Remove any existing observer
        if (this._currentAnimObserver && currentIndex > 0) {
          const previousAnimation = animationGroups[currentIndex - 1];
          if (previousAnimation && previousAnimation.onAnimationGroupEndObservable) {
            previousAnimation.onAnimationGroupEndObservable.remove(this._currentAnimObserver);
          }
          this._currentAnimObserver = null;
        }

        // If we've played all animations, we're done
        if (currentIndex >= animationGroups.length) {
          onSequenceComplete();
          return;
        }

        // Get the current animation group
        const currentAnimation = animationGroups[currentIndex];

        // Validate that the animation group exists and has the required observable
        if (!currentAnimation || !currentAnimation.onAnimationGroupEndObservable) {
          console.error(`Invalid animation group at index ${currentIndex}`);
          onSequenceComplete();
          return;
        }

        if (blending) {
          // this.scene.animationPropertiesOverride =
          //   new BABYLON.AnimationPropertiesOverride();
          // this.scene.animationPropertiesOverride.enableBlending = true;
          // this.scene.animationPropertiesOverride.blendingSpeed = 0.05;

          // Enable blending for all targeted animations
          currentAnimation.targetedAnimations.forEach((targetedAnim) => {
            const anim = targetedAnim.animation;

            anim.enableBlending = true;
            anim.blendingSpeed = 0.05;
          });

          console.log("Animation", currentAnimation);
        }

        // Highlight the current item
        const sequenceItem = document.getElementById(
          `sequence-item-${currentIndex + 1}`
        );
        if (sequenceItem) {
          sequenceItem.classList.add("playing");
        }

        // Set up observer for when this animation ends
        if (currentIndex < animationGroups.length - 1) {
          this._currentAnimObserver =
            currentAnimation.onAnimationGroupEndObservable.add(() => {
              // Remove highlight
              if (sequenceItem) {
                sequenceItem.classList.remove("playing");
              }
              currentIndex++;
              playNextAnimation();
            });
        } else {
          // Last animation, remove highlight when it ends
          this._currentAnimObserver =
            currentAnimation.onAnimationGroupEndObservable.add(() => {
              if (sequenceItem) {
                sequenceItem.classList.remove("playing");
                // Stop recording when recording
                // if (isRecording) {
                //   this.recorder.stopRecording().then((blob) => {
                //     const url = URL.createObjectURL(blob);
                //     const a = document.createElement("a");
                //     a.href = url;
                //     a.download = "animation.webm";
                //     a.click();
                //   });
                // }
              }
              onSequenceComplete();
            });
        }

        // if (!isRecording) {
        //   console.log("Recorder", this.recorder);
        //   // Start recording the scene
        //   this.recorder.startRecording();
        // }
        // Play the current animation
        this.characterController.playAnimationGroup(currentAnimation);
      };

      // Start the animation sequence
      playNextAnimation();
    } catch (error) {
      console.error(`Error loading animations for blending:`, error);
      this.isPlaying = false;
      
      // Re-enable play button on error
      if (playButton) {
        playButton.disabled = false;
        playButton.innerHTML = "Play Sequence";
      }
    }
  }
}

// Export the AnimationController class
export default AnimationController;
