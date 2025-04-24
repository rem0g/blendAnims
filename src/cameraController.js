import {
    ArcRotateCamera,
    Vector3,
    MeshBuilder,
    
} from "babylonjs";

// Class to control the camera
class CameraController {
    constructor(scene, canvas, distance = 2) {
        this.distance = distance;
        this.scene = scene;
        this.canvas = canvas;

        console.log("Creating new camera");
        this.camera = new ArcRotateCamera("camera1", -Math.PI / 2, Math.PI / 2.5, distance, new Vector3(0, 0, 0), scene);
        this.camera.attachControl(canvas, true);

        this.camera.upperRadiusLimit = 10;
        this.camera.lowerRadiusLimit = 2;
    }

    getPosition() {
        return this.camera.position;
    }

    setPosition(x, y, z) {
        console.log("Setting camera position to: ", x, y, z);
        this.camera.position.x = x;
        this.camera.position.y = y;
        this.camera.position.z = z;
    }

    // Function to set the camera on a bone of the target mesh, by default the neck bone (index 4)
    setCameraOnBone(targetMesh, skeleton, boneIndex = 4) {
        console.log("Setting camera on bone...");
        
        // Use MeshBuilder instead of Mesh for better parameter handling
        var sphere = MeshBuilder.CreateSphere("sphere1", {
            segments: 16,
            diameter: 2
        }, this.scene);

        sphere.scaling = new Vector3(0.1, 0.1, 0.1);
        
        const bone = skeleton.bones[boneIndex];
        
        // Get the bone's absolute position
        // TODO: It is hardoded for now
        // const bonePosition = bone.getAbsolutePosition().clone();
        const bonePosition = new Vector3(0, 1.5, 0);
        sphere.position = bonePosition;
  
        console.log(`Attaching to bone: ${bone.name} (index ${boneIndex})`);
        
        // TODO: Fix this so the sphere is attached to the bone
        // sphere.attachToBone(bone, targetMesh);

        // sphere.position = new Vector3(0, 0, 0);
        // sphere.rotation = new Vector3(0, 0, 0);

        this.camera.target = sphere;
    }
}

export default CameraController; 