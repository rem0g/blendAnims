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
    console.log(
      "AnimationController initialized with sequence items:",
      this.sequenceItems
    );
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

  async blendAnimations(signName1, signName2) {
    console.log(`Blending animations: ${signName1} and ${signName2}`);

    if (!this.characterController) {
      console.warn("Character controller not available for blending");
      return;
    }

    // Add all animations to one animation group
    try {
      // Load both animations
      const animations = await this.characterController.loadMultipleAnimations([
        signName1,
        signName2,
      ]);

      // this.characterController.playAnimation();
      // console.log("Loaded animations:", animations);

      // const animation1 = await this.characterController.loadAnimation(
      //   signName1
      // );
      // const animation2 = this.characterController.loadAnimation(signName2);

      // console.log("Animation queue:", animation1);


      // const animationGroup1 =
      //   this.characterController.getAnimationGroup(signName1);
      // animationGroup1.enableBlending = true;
      // animationGroup1.blendingSpeed = this.transitionDuration;
      // console.log("Animation group 1:", animationGroup1);

      // Create a promise that resolves when the first animation finishes
      // const animationComplete = new Promise((resolve) => {
      //   const observer = animationGroup1.onAnimationEndObservable.add(() => {
      //     // Remove the observer to prevent memory leaks
      //     animationGroup1.onAnimationEndObservable.remove(observer);
      //     console.log("Animation 1 ended");
      //     resolve();
      //   });
      // });

      // this.characterController.playBlendingAnimation(signName1);

      // Wait for the first animation to finish
      // await animationComplete;


      //     const animationGroup2 =
      //       this.characterController.getAnimationGroup(signName2);
      //     animationGroup2.enableBlending = true;
      //     animationGroup2.blendingSpeed = this.transitionDuration;
      //     console.log("Animation group 2:", animationGroup2);
      //     this.characterController.playAnimation(signName2);

      //     // Resolve the promise when the second animation ends
      //     animationGroup2.onAnimationEndObservable.add(() => {
      //       console.log("Animation 2 ended");
      //     });
      // });
    } catch (error) {
      console.error(`Error loading animations for blending:`, error);
      return;
    }
  }
}

// Export the AnimationController class
export default AnimationController;
