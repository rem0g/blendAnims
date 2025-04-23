

function parseSigns() {
    // Hardcoded list of sign files for now
    const signFiles = [
      "HALLO-C_250226_1.glb",
      "SCHOOL-D_250226_1.glb",
      "HAARLEM_250226_1.glb",
      "KIJKEN-NAAR-ELKAAR_250228_1.glb",
      "KRIJGEN-A_250228_5.glb",
      "LELYSTAD_250314_1.glb",
      "LES_250228_2.glb",
      "PROBEREN-E_250226_2.glb",
      "SCHULDGEVEN_250226_1.glb",
      "VRAGEN-A_250226_1.glb",
      "WACHTEN-B_250226_1.glb"
    ];
  
    const signs = [];
    
    // Process each file to extract the sign name
    signFiles.forEach(file => {
      // Extract sign name by taking everything before the first underscore
      // and replace dashes with spaces
      const name = file.split('_')[0];
      
      signs.push({
        name: name,
        file: file
      });
      
    });
  
    console.log(`Parsed all signs`);
    return signs;
  }


async function loadAnims(scene) {
    if (!scene) {
        console.error("Scene is not defined");
        return;
    }

    const availableSigns = parseSigns();
    const sign = availableSigns[0];

    // const result = 


}