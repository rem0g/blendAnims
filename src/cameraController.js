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

        sphere.attachToBone(skeleton.bones[boneIndex], targetMesh);
        console.log("Sphere attached to bone: ", skeleton.bones[boneIndex].name);
        console.log("Target mesh: ", targetMesh.name);

        // Set the position and rotation of the sphere relative to the bone
        sphere.position = new BABYLON.Vector3(0, 0, 0); // Adjust according to your needs
        sphere.rotation = new BABYLON.Vector3(0, 0, 0); // Adjust according to your needs

        camera.target = sphere;
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

    
                const cameraPosition = new BABYLON.Vector3(0, 1, 0);

                setPosition(cameraPosition.x, cameraPosition.y, cameraPosition.z);
            }

            CameraController.camera = camera;

            return camera;
        }
    };
})();

export default CameraController; 