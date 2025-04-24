import * as BABYLON from "babylonjs";

var CameraController = (function() {
    var camera;
    var distance;
    var position = {x: null, y: null, z: null};

    function getPosition() {
        return camera.position;
    }

    function setPosition(x, y, z) {
        console.log("Setting camera position to: ", x, y, z);
        position.x = x;
        position.y = y;
        position.z = z;
    }

    // Function to set the camera on a bone of the target mesh, by default the neck bone (index 4)
    function setCameraOnBone(scene, targetMesh, skeleton, boneIndex = 4) {
        console.log("Setting camera on bone...");
        console.log("Scene:", scene);
        
        // Use MeshBuilder instead of Mesh for better parameter handling
        var sphere = BABYLON.MeshBuilder.CreateSphere("sphere1", {
            segments: 16,
            diameter: 2
        }, scene);
        
        sphere.scaling = new BABYLON.Vector3(0.1, 0.1, 0.1);
        
        // Make sure the bone exists before trying to attach
        if (boneIndex >= skeleton.bones.length) {
            console.error(`Bone index ${boneIndex} out of range. Using bone 0 instead.`);
            boneIndex = 0;
        }
        
        const bone = skeleton.bones[boneIndex];
        console.log(`Attaching to bone: ${bone.name} (index ${boneIndex})`);
        
        // Try to attach the sphere to the bone
        try {
            // Store the sphere's initial position for comparison
            const initialPosition = sphere.position.clone();
            
            // Attach to bone
            sphere.attachToBone(bone, targetMesh);

            
            // Check if position changed after attachment
            console.log("Sphere initial position:", initialPosition);
            console.log("Sphere position after attachment:", sphere.position);
            
            if (sphere.position.equals(initialPosition)) {
                console.warn("Sphere position didn't change after attachment - might not be properly attached");
            }
            
            console.log("Sphere attached to bone successfully");
        } catch (error) {
            console.error("Error attaching sphere to bone:", error);
            return;
        }

        console.log("Target mesh:", targetMesh.name);
        console.log("Bone world matrix:", bone.getWorldMatrix());

        // Set the camera target to the sphere
        camera.target = sphere;
        console.log("Camera target set to sphere");
    }

    return {
        getPosition: getPosition,
        setPosition: setPosition,
        setCameraOnBone: setCameraOnBone,
        getInstance: function(scene, canvas, distance=2) {
            CameraController.distance = distance;

            if (!camera) {
                console.log("Creating new camera");
                camera = new BABYLON.ArcRotateCamera("camera1", -Math.PI / 2, Math.PI / 2.5, distance, new BABYLON.Vector3(0, 0, 0), scene);
                camera.attachControl(canvas, true);

                const cameraPosition = new BABYLON.Vector3(0, 1.5, -2);
                // set camera position to the sphere position

                camera.position = new BABYLON.Vector3(0, 1.5, -2);
                // setPosition(cameraPosition.x, cameraPosition.y, cameraPosition.z);
            }

            CameraController.camera = camera;
            return camera;
        }
    };
})();

export default CameraController; 