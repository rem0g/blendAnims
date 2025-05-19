class AnimationController {
  constructor(scene, characterController, isPlaying, sequenceItems) {
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

  // Play the full sequence of signs
  async playSequence(sequenceItems) {
    if (this.isPlaying || sequenceItems.length == 0) return;

    // Disable play button during playback
    const playButton = document.getElementById("play-sequence-button");
    if (playButton) {
      playButton.disabled = true;
      playButton.innerHTML = "Playing...";
    }

    this.isPlaying = true;

    try {
      console.log("Sequence items:", sequenceItems[0]);
      // Play each sign in sequence
      for (let i = 0; i < sequenceItems.length; i++) {
        const item = sequenceItems[i];

        // Highlight the current item
        const sequenceItem = document.getElementById(
          `sequence-item-${item.id}`
        );
        if (sequenceItem) {
          sequenceItem.classList.add("playing");
        }
        console.log(`Playing sign: ${item.sign}`);
        // Play the sign
        await this.playSign(item.sign.name);

        // Remove highlight
        if (sequenceItem) {
          sequenceItem.classList.remove("playing");
        }
      }
    } catch (error) {
      console.error("Error playing sequence:", error);
    } finally {
      this.isPlaying = false;

      // Re-enable play button
      if (playButton) {
        playButton.disabled = false;
        playButton.innerHTML = "Play Sequence";
      }
    }
  }

  async blendAnimations(signNames) {
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

    this.isPlaying = true;

    try {
      // Load all animation groups for blending
      const animationGroups =
        await this.characterController.loadMultipleAnimations(signNames);

      if (!animationGroups || animationGroups.length == 0) {
        console.warn("No animation groups loaded for blending");
        return;
      }

      this.scene.animationPropertiesOverride =
        new BABYLON.AnimationPropertiesOverride();
      this.scene.animationPropertiesOverride.enableBlending = true;
      this.scene.animationPropertiesOverride.blendingSpeed = 0.05;

      let currentIndex = 0;

      // Function to play the next animation in sequence
      const playNextAnimation = () => {
        // Remove any existing observer
        if (this._currentAnimObserver) {
          animationGroups[
            currentIndex - 1
          ].onAnimationGroupEndObservable.remove(this._currentAnimObserver);
          this._currentAnimObserver = null;
        }

        // If we've played all animations, we're done
        if (currentIndex >= animationGroups.length) {
          console.log("Finished playing all animations in sequence");
          return;
        }

        // Play the current animation
        const currentAnimation = animationGroups[currentIndex];
        
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
              currentIndex++;
              // Remove highlight
              if (sequenceItem) {
                sequenceItem.classList.remove("playing");
              }
              playNextAnimation();
            });
        } else {
          // Last animation, remove highlight when it ends
          this._currentAnimObserver =
            currentAnimation.onAnimationGroupEndObservable.add(() => {
              if (sequenceItem) {
                sequenceItem.classList.remove("playing");
              }
            });
        }

        this.characterController.playAnimationGroup(currentAnimation);
      };

      // Start the animation sequence
      playNextAnimation();
    } catch (error) {
      console.error(`Error loading animations for blending:`, error);
      return;
    } finally {
      this.isPlaying = false;

      // Re-enable play button
      if (playButton) {
        playButton.disabled = false;
        playButton.innerHTML = "Play Sequence";
      }
    }
  }
}

// Export the AnimationController class
export default AnimationController;
