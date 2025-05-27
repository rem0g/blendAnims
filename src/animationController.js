// Class to contol the animations of the avatar
class AnimationController {
  constructor(engine, scene, characterController, isPlaying) {
    this.engine = engine;
    this.scene = scene;
    this.characterController = characterController;
    this.isPlaying = isPlaying;
    this.transitionDuration = 0.5; // Duration for blending animations hardcoded for now
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
      recordButton.innerHTML = isRecording ? "Recording..." : "Record Sequence";
    }

    // Disable clear button during playback
    const clearButton = document.getElementById("clear-sequence-button");
    if (clearButton) {
      clearButton.disabled = true;
    }

    this.isPlaying = true;

    if (isRecording) {
      console.log("Starting video recording...");
      const recorder = new BABYLON.VideoRecorder(this.engine, this.scene, {
        fps: 60,
        mimeType: "video/webm", // or "video/webm;codecs=vp9"
      });

      console.log("Video recorder created:", recorder);

      if (!recorder) {
        console.error("Failed to create video recorder");
        return;
      }
      this.recorder = recorder;

      // Try to start recording
      if (this.recorder) {
        console.log("Starting recording...");
        const animationNames = signNames.join("-") + ".webm"; // Use the sign names as the filename
        this.recorder.startRecording(animationNames, 60);
        console.log("Recording started successfully", this.recorder);
      }
    }

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
          currentAnimation.onAnimationGroupEndObservable.add(() => {
            currentIndex++;
            // Remove highlight
            if (sequenceItem) {
              sequenceItem.classList.remove("playing");
            }
            playNextAnimation();
          });
        } else {
          // Last animation
          currentAnimation.onAnimationGroupEndObservable.add(async () => {
            this.isPlaying = false;
            // Remove highlight
            if (sequenceItem) {
              sequenceItem.classList.remove("playing");
            }

            // Stop recording if recording was enabled
            if (isRecording && this.recorder) {
              try {
                console.log("Stopping recording...", this.recorder);
                this.recorder.stopRecording()
                
              } catch (error) {
                console.error("Error stopping recording:", error);
              }
            }

            // Re-enable buttons after the animation
            if (playButton) {
              playButton.disabled = false;
              playButton.innerHTML = "Play Sequence";
            }

            // Re-enable record button after the animation
            if (recordButton) {
              recordButton.disabled = false;
              recordButton.innerHTML = "Record Sequence";
            }

            // Re-enable clear button after the animation
            if (clearButton) {
              clearButton.disabled = false;
            }
          });
        }

        // Play the current animation
        this.characterController.playAnimationGroup(currentAnimation);
      };

      // Start the animation sequence
      playNextAnimation();
    } catch (error) {
      console.error(`Error loading animations for blending:`, error);
      // Make sure to stop recording if there's an error
      if (isRecording && this.recorder) {
        try {
          this.recorder.stopRecording();
          console.log("Recording stopped due to error.");
        } catch (stopError) {
          console.error("Error stopping recording after error:", stopError);
        }
      }
      return;
    }
  }
}

// Export the AnimationController class
export default AnimationController;
