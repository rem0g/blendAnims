
import { ImportMeshAsync, TransformNode, Vector3,} from "babylonjs";

// Class to load and control the character
class CharacterController {
    constructor(scene, cameraController) {
        this.scene = scene;
        this.cameraController = cameraController;
    }

    async init() {
        this.character = await this.loadMesh(this.scene);
        this.characterMesh = this.character.meshes[0];
        this.rootMesh = this.makeRootMesh();

        console.log("Character loaded:", this.character);

        // Set camera on bone
        this.cameraController.setCameraOnBone(this.characterMesh, this.character.skeletons[0]);
    }

    async loadMesh(scene) {
        const characterMesh = await ImportMeshAsync(
            "glassesGuySignLab.glb",
            scene
        )
        return characterMesh;
    }


    makeRootMesh() {
        const rootMesh = new TransformNode("rootMesh", this.scene);
        this.characterMesh.parent = rootMesh;
 
        rootMesh.rotation = new Vector3(0, Math.PI, 0);

        return rootMesh;
    }
}

export default CharacterController;
