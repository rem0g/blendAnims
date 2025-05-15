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
      const animationGroups = await this.characterController.loadMultipleAnimations([
        signName1,
        signName2,
      ]);

      const animationGroup1 = animationGroups[0];
      const animationGroup2 = animationGroups[1];


      animationGroup1.enableBlending = true;
      animationGroup1.blendingSpeed = this.transitionDuration;

      animationGroup2.enableBlending = true;  
      animationGroup2.blendingSpeed = this.transitionDuration;
      // animationGroup2.normalize(60, 100);

      const observer = animationGroup1.onAnimationGroupEndObservable.add(() => {
        animationGroup1.onAnimationGroupEndObservable.remove(observer)
        this.characterController.playAnimationGroup(animationGroup2);
      });
      
      this.characterController.playAnimationGroup(animationGroup1);



    } catch (error) {
      console.error(`Error loading animations for blending:`, error);
      return;
    }
  }
}

// Export the AnimationController class
export default AnimationController;
