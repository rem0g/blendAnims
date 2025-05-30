import { ArcRotateCamera, Vector3, MeshBuilder } from "babylonjs";

// Class to control the camera
class CameraController {
  constructor(scene, canvas, distance = 2) {
    this.distance = distance;
    this.scene = scene;
    this.canvas = canvas;

    this.camera = new ArcRotateCamera(
      "camera1",
      -Math.PI / 2,
      Math.PI / 2.5,
      distance,
      new Vector3(0, 0, 0),
      scene
    );
    this.camera.attachControl(canvas, true);

    // Set camera properties
    this.camera.upperRadiusLimit = 5;
    this.camera.lowerRadiusLimit = 1;
    this.camera.minZ = 0.01;
    this.camera.checkCollisions = false;
    this.camera.noRotationConstraint = true;

    // Scroll speed
    this.camera.wheelPrecision = 100;

    console.log("Camera initialized:", this.camera);
  }

  getPosition() {
    return this.camera.position;
  }

  setPosition(x, y, z) {
    this.camera.position.x = x;
    this.camera.position.y = y;
    this.camera.position.z = z;
  }

  // Function to set the camera on a bone of the target mesh, by default the neck bone (index 4)
  setCameraOnBone(targetMesh, skeleton, boneIndex = 4) {
    // Create sphere to attatch to the neck bone
    let sphere = MeshBuilder.CreateSphere(
      "sphere1",
      {
        segments: 16,
        diameter: 2,
      },
      this.scene
    );

    sphere.scaling = new Vector3(0.1, 0.1, 0.1);

    const bone = skeleton.bones[boneIndex];

    // Get the bone's absolute position
    // This is hardcoded for now, it is somehow not possible to find the right coordinates of the neck bone in world space
    const bonePosition = new Vector3(0, 1.2, 0);
    sphere.position = bonePosition;
    // sphere.attachToBone(bone, targetMesh);

    // Make the sphere invisible
    sphere.isVisible = false;

    this.camera.target = sphere;
  }
}

export default CameraController;
