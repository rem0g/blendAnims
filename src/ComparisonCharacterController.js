/**
 * ComparisonCharacterController
 * Manages three character instances for side-by-side animation comparison
 */

import {
    ImportMeshAsync,
    TransformNode,
    Vector3,
    SceneLoader,
    MeshBuilder,
    DynamicTexture,
    StandardMaterial,
    Color3,
} from "babylonjs";

class ComparisonCharacterController {
    constructor(scene) {
        this.scene = scene;

        // Character 1 (left - PP animation)
        this.character1 = null;
        this.rootMesh1 = null;
        this.morphTargetManagers1 = [];

        // Character 2 (center - original/default animation)
        this.character2 = null;
        this.rootMesh2 = null;
        this.morphTargetManagers2 = [];

        // Character 3 (right - presAnim) - loaded as plain GLB, not retargeted
        this.character3 = null;
        this.rootMesh3 = null;
        this.morphTargetManagers3 = [];
        this.presAnimMesh = null;  // Direct mesh for presAnim (not retargeted)

        // Animation groups
        this.animationGroup1 = null;
        this.animationGroup2 = null;
        this.animationGroup3 = null;

        // Playback state
        this.isLooping = false;
    }

    /**
     * Initialize characters (only load the two that use base character)
     * Character 3 (presAnim) is loaded dynamically as a plain GLB
     */
    async init() {
        console.log("Initializing comparison character controller...");

        // Load only the two retargeted characters
        await Promise.all([
            this.loadCharacter(1, -1.0),   // Left at x=-1.0 (default_pp)
            this.loadCharacter(2, 0)       // Center at x=0 (default)
        ]);

        // Create labels above each character
        this.createLabel("default_pp", -1.0, "#e94560");
        this.createLabel("default", 0, "#4ecca3");
        this.createLabel("presAnim", 1.0, "#5dade2");

        console.log("Base characters loaded successfully");
    }

    /**
     * Create a floating text label above a character
     */
    createLabel(text, xPos, color) {
        // Create plane for the text
        const plane = MeshBuilder.CreatePlane(`label_${text}`, { width: 0.8, height: 0.2 }, this.scene);
        plane.position = new Vector3(xPos, 2.1, -0.25);
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

        // Create dynamic texture for text
        const texture = new DynamicTexture(`texture_${text}`, { width: 512, height: 128 }, this.scene);
        texture.hasAlpha = true;

        // Draw text
        const ctx = texture.getContext();
        ctx.clearRect(0, 0, 512, 128);
        ctx.font = "bold 48px Arial";
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 256, 64);
        texture.update();

        // Create material
        const material = new StandardMaterial(`mat_${text}`, this.scene);
        material.diffuseTexture = texture;
        material.emissiveTexture = texture;
        material.opacityTexture = texture;
        material.backFaceCulling = false;
        material.disableLighting = true;

        plane.material = material;
    }

    /**
     * Load a character instance
     * @param {number} num - Character number (1 or 2)
     * @param {number} xPos - X position
     */
    async loadCharacter(num, xPos) {
        console.log(`Loading character ${num} at x=${xPos}...`);

        const loaded = await ImportMeshAsync("glassesGuySignLab.glb", this.scene);

        // Rename all meshes and skeletons to avoid conflicts
        loaded.meshes.forEach(mesh => {
            mesh.name = `${mesh.name}_char${num}`;
            mesh.alwaysSelectAsActiveMesh = true;
        });

        if (loaded.skeletons.length > 0) {
            loaded.skeletons[0].name = `skeleton_char${num}`;
        }

        // Collect morph target managers
        const morphManagers = [];
        loaded.meshes.forEach(mesh => {
            if (mesh.morphTargetManager) {
                morphManagers.push(mesh.morphTargetManager);
            }
        });

        // Create root transform node and position
        const root = new TransformNode(`root_char${num}`, this.scene);
        loaded.meshes[0].parent = root;
        root.rotation = new Vector3(0, Math.PI, 0);
        root.position = new Vector3(xPos, 0, -0.25);

        // Store references based on character number
        if (num === 1) {
            this.character1 = loaded;
            this.rootMesh1 = root;
            this.morphTargetManagers1 = morphManagers;
        } else if (num === 2) {
            this.character2 = loaded;
            this.rootMesh2 = root;
            this.morphTargetManagers2 = morphManagers;
        } else if (num === 3) {
            this.character3 = loaded;
            this.rootMesh3 = root;
            this.morphTargetManagers3 = morphManagers;
        }

        console.log(`Character ${num} loaded with ${morphManagers.length} morph target managers`);
    }

    /**
     * Load presAnim as a plain GLB file (no retargeting)
     * @param {string} url - URL of the GLB file
     * @returns {Object|null} Animation group or null on error
     */
    async loadPresAnimGLB(url) {
        try {
            console.log(`Loading presAnim GLB directly from ${url}`);

            // Dispose previous presAnim mesh if exists
            if (this.presAnimMesh) {
                this.presAnimMesh.meshes.forEach(mesh => mesh.dispose());
                this.presAnimMesh = null;
            }

            // Dispose previous animation group
            if (this.animationGroup3) {
                this.animationGroup3.dispose();
                this.animationGroup3 = null;
            }

            // Load the GLB directly
            const loaded = await SceneLoader.ImportMeshAsync("", url, "", this.scene);

            // Position the mesh
            const root = new TransformNode("root_presAnim", this.scene);
            loaded.meshes[0].parent = root;
            root.rotation = new Vector3(0, Math.PI, 0);
            root.position = new Vector3(1.0, 0, -0.25);

            // Store reference
            this.presAnimMesh = loaded;
            this.rootMesh3 = root;

            // Find the animation group (usually "Unreal Take")
            let animGroup = null;
            for (let i = loaded.animationGroups.length - 1; i >= 0; i--) {
                if (loaded.animationGroups[i].name === "Unreal Take") {
                    animGroup = loaded.animationGroups[i];
                    break;
                }
            }

            // If no "Unreal Take", just use the first animation group
            if (!animGroup && loaded.animationGroups.length > 0) {
                animGroup = loaded.animationGroups[0];
            }

            if (animGroup) {
                this.animationGroup3 = animGroup;
                console.log(`PresAnim loaded with animation: ${animGroup.name}`);
            } else {
                console.log('PresAnim loaded without animation');
            }

            return animGroup;

        } catch (error) {
            console.error('Error loading presAnim GLB:', error);
            return null;
        }
    }

    /**
     * Load animation for a specific character
     * @param {string} url - URL of the GLB animation file
     * @param {number} charNum - Character number (1, 2, or 3)
     * @param {string} name - Name for the animation
     * @returns {Object|null} Animation group or null on error
     */
    async loadAnimationForCharacter(url, charNum, name) {
        try {
            console.log(`Loading animation "${name}" for character ${charNum} from ${url}`);

            let target, morphs;
            if (charNum === 1) {
                target = this.character1;
                morphs = this.morphTargetManagers1;
            } else if (charNum === 2) {
                target = this.character2;
                morphs = this.morphTargetManagers2;
            } else if (charNum === 3) {
                target = this.character3;
                morphs = this.morphTargetManagers3;
            }

            if (!target) {
                console.error(`Character ${charNum} not loaded`);
                return null;
            }

            const result = await SceneLoader.ImportAnimationsAsync(
                "",
                url,
                this.scene,
                false,
                BABYLON.SceneLoaderAnimationGroupLoadingMode.NoSync
            );

            // Find "Unreal Take" animation group
            let sourceAnim = null;
            for (let i = result.animationGroups.length - 1; i >= 0; i--) {
                if (result.animationGroups[i].name === "Unreal Take") {
                    sourceAnim = result.animationGroups[i];
                    break;
                }
            }

            if (!sourceAnim) {
                console.error("Could not find 'Unreal Take' animation in loaded file");
                return null;
            }

            // Retarget to the specific character
            const retargeted = this.retargetToCharacter(target, morphs, sourceAnim, `${name}_char${charNum}`);

            // Dispose source animation
            sourceAnim.dispose();

            // Dispose previous animation if exists and store new one
            if (charNum === 1) {
                if (this.animationGroup1) this.animationGroup1.dispose();
                this.animationGroup1 = retargeted;
            } else if (charNum === 2) {
                if (this.animationGroup2) this.animationGroup2.dispose();
                this.animationGroup2 = retargeted;
            } else if (charNum === 3) {
                if (this.animationGroup3) this.animationGroup3.dispose();
                this.animationGroup3 = retargeted;
            }

            console.log(`Animation "${name}" loaded for character ${charNum}`);
            return retargeted;

        } catch (error) {
            console.error(`Error loading animation for character ${charNum}:`, error);
            return null;
        }
    }

    /**
     * Retarget animation to a specific character
     * @param {Object} targetChar - Target character's loaded mesh data
     * @param {Array} morphManagers - Morph target managers for this character
     * @param {Object} animGroup - Source animation group
     * @param {string} cloneName - Name for the cloned animation
     * @returns {Object} Retargeted animation group
     */
    retargetToCharacter(targetChar, morphManagers, animGroup, cloneName) {
        console.log(`Retargeting animation to ${cloneName}...`);

        let morphName = null;
        let curMTM = 0;
        let mtm = null;

        const uniqueCloneName = `${cloneName}_${Date.now()}`;

        const clonedAnimGroup = animGroup.clone(uniqueCloneName, (target) => {
            if (!target) {
                return null;
            }

            // First try to find the bone in the skeleton
            const idx = targetChar.skeletons[0].getBoneIndexByName(target.name);
            const targetBone = targetChar.skeletons[0].bones[idx];
            if (targetBone) {
                return targetBone._linkedTransformNode;
            }

            // Handle morph targets
            if (morphName !== target.name) {
                curMTM = 0;
                morphName = target.name;
            }

            const morphIndex = this.getMorphTargetIndex(morphManagers[curMTM], target.name);

            if (morphIndex === -1) {
                // Return previous morph target if no match found
                return mtm || null;
            }

            mtm = morphManagers[curMTM].getTarget(morphIndex);
            curMTM++;

            return mtm;
        });

        clonedAnimGroup.name = cloneName;

        // Remove hips position/rotation animation to keep character in place
        clonedAnimGroup.targetedAnimations.forEach((targetedAnim) => {
            if (targetedAnim.target !== null && targetedAnim.animation !== null) {
                if (targetedAnim.target.name && targetedAnim.target.name.includes("Hips")) {
                    if (targetedAnim.animation.targetProperty === "rotationQuaternion") {
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
                }
            }
        });

        return clonedAnimGroup;
    }

    /**
     * Get morph target index by name
     */
    getMorphTargetIndex(morphTargetManager, targetName) {
        if (!morphTargetManager) {
            return -1;
        }

        for (let i = 0; i < morphTargetManager.numTargets; i++) {
            if (morphTargetManager.getTarget(i).name === targetName) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Play all animations simultaneously
     * @param {boolean} loop - Whether to loop the animations
     */
    playBoth(loop = false) {
        this.isLooping = loop;

        // Collect all available animation groups
        const animGroups = [
            this.animationGroup1,
            this.animationGroup2,
            this.animationGroup3
        ].filter(ag => ag !== null);

        if (animGroups.length > 0) {
            // Calculate durations for syncing
            const durations = animGroups.map(ag => ag.to - ag.from);
            const maxDuration = Math.max(...durations);

            console.log(`Syncing ${animGroups.length} animations`);

            // Stop all, set speed ratios, then start all
            animGroups.forEach((ag, i) => {
                ag.stop();
                const speedRatio = durations[i] / maxDuration;
                ag.speedRatio = speedRatio;
                console.log(`Animation ${i + 1}: ${durations[i]} frames, speedRatio: ${speedRatio.toFixed(3)}`);
            });

            animGroups.forEach(ag => ag.start(loop));

            console.log(`Started all ${animGroups.length} animations in sync`);
        }
    }

    /**
     * Stop all animations
     */
    stopBoth() {
        [this.animationGroup1, this.animationGroup2, this.animationGroup3].forEach(ag => {
            if (ag) ag.stop();
        });
        console.log("Stopped all animations");
    }

    /**
     * Reset all characters to default pose
     */
    resetBoth() {
        // Stop and reset animation groups
        [this.animationGroup1, this.animationGroup2, this.animationGroup3].forEach(ag => {
            if (ag) {
                ag.stop();
                ag.reset();
            }
        });

        // Reset all morph targets to 0 for retargeted characters
        [
            ...this.morphTargetManagers1,
            ...this.morphTargetManagers2
        ].forEach(manager => {
            for (let i = 0; i < manager.numTargets; i++) {
                manager.getTarget(i).influence = 0;
            }
        });

        // Dispose presAnim mesh if exists (will be reloaded)
        if (this.presAnimMesh) {
            this.presAnimMesh.meshes.forEach(mesh => mesh.dispose());
            this.presAnimMesh = null;
        }
        if (this.rootMesh3) {
            this.rootMesh3.dispose();
            this.rootMesh3 = null;
        }
        if (this.animationGroup3) {
            this.animationGroup3.dispose();
            this.animationGroup3 = null;
        }

        console.log("Reset all characters to default pose");
    }

    /**
     * Set looping mode
     * @param {boolean} loop - Whether to loop
     */
    setLooping(loop) {
        this.isLooping = loop;

        // If animations are playing, update their loop state
        [this.animationGroup1, this.animationGroup2, this.animationGroup3].forEach(ag => {
            if (ag && ag.isPlaying) {
                ag.loopAnimation = loop;
            }
        });
    }

    /**
     * Check if any animation is currently playing
     * @returns {boolean}
     */
    isPlaying() {
        return (this.animationGroup1?.isPlaying) ||
               (this.animationGroup2?.isPlaying) ||
               (this.animationGroup3?.isPlaying);
    }

    /**
     * Get the maximum frame count across all loaded animations
     * @returns {number} Maximum frame count
     */
    getMaxFrameCount() {
        const groups = [this.animationGroup1, this.animationGroup2, this.animationGroup3].filter(Boolean);
        if (groups.length === 0) return 0;
        return Math.max(...groups.map(ag => ag.to - ag.from));
    }

    /**
     * Get animation info (for timeline display)
     * @returns {Object} Animation info with from, to, maxFrames
     */
    getAnimationInfo() {
        const groups = [this.animationGroup1, this.animationGroup2, this.animationGroup3].filter(Boolean);
        if (groups.length === 0) return { from: 0, to: 0, maxFrames: 0 };

        // Use the first animation group as reference
        const ag = groups[0];
        return {
            from: ag.from,
            to: ag.to,
            maxFrames: ag.to - ag.from
        };
    }

    /**
     * Seek all animations to a normalized position (0-1)
     * @param {number} normalizedPosition - Position from 0 to 1
     */
    seekToPosition(normalizedPosition) {
        const groups = [this.animationGroup1, this.animationGroup2, this.animationGroup3].filter(Boolean);

        groups.forEach(ag => {
            const frame = ag.from + (ag.to - ag.from) * normalizedPosition;

            // If not playing, we need to start then immediately pause to enable goToFrame
            if (!ag.isPlaying) {
                ag.start(false, 1.0, ag.from, ag.to, false);
                ag.pause();
            }

            ag.goToFrame(frame);
        });
    }

    /**
     * Get current normalized position (0-1) based on first animation
     * @returns {number} Normalized position from 0 to 1
     */
    getCurrentPosition() {
        const ag = this.animationGroup1 || this.animationGroup2 || this.animationGroup3;
        if (!ag) return 0;

        // Get current frame from the animation group
        // Babylon.js animation groups don't expose current frame directly,
        // so we calculate from the master frame
        const duration = ag.to - ag.from;
        if (duration <= 0) return 0;

        // Use scene's animation ratio and speed to estimate position
        // This is a simplified approach - works when animations are playing
        if (ag.animatables && ag.animatables.length > 0) {
            const animatable = ag.animatables[0];
            if (animatable) {
                const currentFrame = animatable.masterFrame;
                return Math.min(1, Math.max(0, (currentFrame - ag.from) / duration));
            }
        }

        return 0;
    }

    /**
     * Get current frame number for display
     * @returns {number} Current frame number
     */
    getCurrentFrame() {
        const ag = this.animationGroup1 || this.animationGroup2 || this.animationGroup3;
        if (!ag) return 0;

        if (ag.animatables && ag.animatables.length > 0) {
            const animatable = ag.animatables[0];
            if (animatable) {
                return Math.round(animatable.masterFrame - ag.from);
            }
        }

        return 0;
    }

    /**
     * Identify which character a mesh belongs to
     * @param {Object} mesh - The picked mesh
     * @returns {number|null} Character index (0, 1, 2) or null if not a character
     */
    getCharacterFromMesh(mesh) {
        if (!mesh) return null;

        // Walk up parent hierarchy to find root
        let current = mesh;
        while (current) {
            // Check character 1 (left - PP)
            if (this.rootMesh1 && current === this.rootMesh1) return 0;
            if (this.character1?.meshes?.includes(current)) return 0;

            // Check character 2 (center - default)
            if (this.rootMesh2 && current === this.rootMesh2) return 1;
            if (this.character2?.meshes?.includes(current)) return 1;

            // Check character 3 (right - presAnim)
            if (this.rootMesh3 && current === this.rootMesh3) return 2;
            if (this.presAnimMesh?.meshes?.includes(current)) return 2;

            current = current.parent;
        }

        // Also check by mesh name patterns
        const name = mesh.name.toLowerCase();
        if (name.includes('_char1') || name.includes('_pp')) return 0;
        if (name.includes('_char2') || name.includes('_default')) return 1;
        if (name.includes('presanim')) return 2;

        return null;
    }

    /**
     * Get the X position for a character index
     * @param {number} charIndex - Character index (0, 1, 2)
     * @returns {number} X position
     */
    getCharacterPosition(charIndex) {
        const positions = [-1.0, 0, 1.0];
        return positions[charIndex] ?? 0;
    }
}

export default ComparisonCharacterController;
