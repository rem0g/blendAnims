// Class to contol the animations of the avatar
class AnimationController {
  constructor(scene, characterController, isPlaying, recorder) {
    this.scene = scene;
    this.characterController = characterController;
    this.isPlaying = isPlaying;
    this.transitionDuration = 0.5; // Duration for blending animations hardcoded for now
    this.recorder = recorder;
  }

  // Initialize the AnimationController
  init(sequenceItems) {
    this.sequenceItems = sequenceItems;
  }

  // Play a single sign animation
  async playSign(signName, signItem) {
    console.log(`Playing sign: ${signName}`);

    if (this.characterController) {
      try {
        // Load and queue the animation
        await this.characterController.loadAnimation(signName);

        if (signItem) {
          signItem.classList.add("playing");
        }
        await this.characterController.playAnimation(signName);
      } catch (error) {
        console.error(`Error loading animation for ${signName}:`, error);
      } finally {
        if (signItem) {
          signItem.classList.remove("playing");
        }
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

    // Disable play button during playback
    const playButton = document.getElementById("play-sequence-button");
    if (playButton) {
      playButton.disabled = true;
      playButton.innerHTML = "Playing...";
    }

    // Disable record button during playback
    const recordButton = document.getElementById("record-sequence-button");
    if (recordButton) {
      recordButton.disabled = true;
    }

    // Disable clear button during playback
    const clearButton = document.getElementById("clear-sequence-button");
    if (clearButton) {
      clearButton.disabled = true;
    }

    this.isPlaying = true;

    try {
      // Load all animation groups for blending
      const animationGroups =
        await this.characterController.loadMultipleAnimations(signNames);

      if (!animationGroups || animationGroups.length == 0) {
        console.warn("No animation groups loaded for blending");
        return;
      }

      let currentIndex = 0;

      // Function to play the next animation in sequence
      const playNextAnimation = () => {
        // Remove any existing observer
        animationGroups.forEach((group) => {
          group.onAnimationGroupEndObservable.clear();
        });

        // Get the current animation group
        const currentAnimation = animationGroups[currentIndex];

        if (blending) {
          // this.scene.animationPropertiesOverride =
          //   new BABYLON.AnimationPropertiesOverride();
          // this.scene.animationPropertiesOverride.enableBlending = true;
          // this.scene.animationPropertiesOverride.blendingSpeed = 0.05;

          // Enable blending for all targeted animations
          currentAnimation.targetedAnimations.forEach((targetedAnim) => {
            const anim = targetedAnim.animation;

            anim.enableBlending = true;
            // max blending speed 0.13, min 0.02
            anim.blendingSpeed = 0.05; // Set blending speed
          });

          console.log("Animation", currentAnimation);
        }

        // Highlight the current item
        const sequenceItem = document.getElementById(
          `sequence-item-${currentIndex + 1}`
        );
        console.log("Sequence item", sequenceItem);
        if (sequenceItem) {
          sequenceItem.classList.add("playing");
        }

        // Set up observer for when this animation ends
        if (currentIndex < animationGroups.length - 1) {
          currentAnimation.onAnimationGroupEndObservable.add(() => {
            console.log("Animation ended", currentIndex);
            currentIndex++;
            // Remove highlight
            if (sequenceItem) {
              sequenceItem.classList.remove("playing");
            }
            playNextAnimation();
          });
        } else {
          // Last animation
          currentAnimation.onAnimationGroupEndObservable.add(() => {
            this.isPlaying = false;
            // Remove highlight
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

            // Re-enable play button after the animation
            if (playButton) {
              playButton.disabled = false;
              playButton.innerHTML = "Play Sequence";
            }

            // Re-enable record button after the animation
            if (recordButton) {
              recordButton.disabled = false;
            }

            // Re-enable clear button after the animation
            if (clearButton) {
              clearButton.disabled = false;
            }
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
      return;
    }
  }
}

// Export the AnimationController class
export default AnimationController;
