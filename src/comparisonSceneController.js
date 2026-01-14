/**
 * Scene controller for the comparison interface
 * Creates a wider scene to accommodate three characters side by side
 */

import {
    Engine,
    Scene,
    HemisphericLight,
    MeshBuilder,
    StandardMaterial,
    Color3,
    Vector3,
    ArcRotateCamera,
} from "babylonjs";

/**
 * Create and configure the Babylon.js scene for comparison view
 * @returns {Object} Scene components
 */
export async function createComparisonScene() {
    const canvas = document.getElementById("renderCanvas");
    const engine = new Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        antialias: true,
        powerPreference: "high-performance"
    });

    engine.setHardwareScalingLevel(1.0);

    const scene = new Scene(engine);
    scene.ambientColor = new Color3(0.2, 0.2, 0.2);

    // Camera - view for three characters 1m apart, centered between them
    const camera = new ArcRotateCamera(
        "camera",
        -Math.PI / 2,      // alpha: horizontal rotation (facing front)
        Math.PI / 2.5,     // beta: vertical rotation (slightly above)
        5,                 // radius: further back for three characters
        new Vector3(0, 1.2, 0),  // target: centered between characters at chest height
        scene
    );
    camera.attachControl(canvas, true);

    // Camera limits
    camera.upperRadiusLimit = 15;
    camera.lowerRadiusLimit = 2;
    camera.minZ = 0.01;
    camera.wheelPrecision = 50;  // More sensitive scroll

    // Lighting
    const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
    light.intensity = 1.0;

    // Ground - wider to accommodate both characters
    const ground = MeshBuilder.CreateGround("ground", {
        width: 15,
        height: 10,
    });
    const groundMaterial = new StandardMaterial("groundMat", scene);
    groundMaterial.diffuseColor = new Color3(0.15, 0.15, 0.2);
    ground.material = groundMaterial;

    // Handle window resize
    window.addEventListener('resize', () => engine.resize());

    console.log("Comparison scene created");

    return {
        canvas,
        engine,
        scene,
        camera,
        light,
        ground
    };
}

export default { createComparisonScene };
