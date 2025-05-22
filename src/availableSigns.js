// Available sign animations, this is hardcoded for now
// TODO: will have to inspect folder, and do this automatically
export const availableSigns = [
    { name: "HALLO", file: "signs/HALLO-C_250226_1.glb", start:60, end: 100 },
    { name: "SCHOOL", file: "signs/SCHOOL-D_250226_1.glb", start: 40, end: 110 },
    { name: "HAARLEM", file: "signs/HAARLEM_250226_1.glb", start: 15, end: 90 },
    { name: "KIJKEN-NAAR-ELKAAR", file: "signs/KIJKEN-NAAR-ELKAAR_250228_1.glb", start: 30, end: 90 },
    { name: "KRIJGEN-A", file: "signs/KRIJGEN-A_250228_5.glb", start: 60, end: 110 },
    { name: "LELYSTAD", file: "signs/LELYSTAD_250314_1.glb", start:55, end: 130 },
    { name: "LES", file: "signs/LES_250228_2.glb", start: 85, end: 150 },
    { name: "PROBEREN-E", file: "signs/PROBEREN-E_250226_2.glb", start: 50, end: 117 },
    { name: "SCHULDGEVEN", file: "signs/SCHULDGEVEN_250226_1.glb", start: 50, end: 90 },
    { name: "VRAGEN-A", file: "signs/VRAGEN-A_250226_1.glb", start: 65, end: 100 },
    { name: "WACHTEN-B", file: "signs/WACHTEN-B_250226_1.glb", start: 30, end: 103 },
  ];


// Mapping to get the item from the name
export const availableSignsMap = availableSigns.reduce((acc, sign) => {
  acc[sign.name] = sign;
  return acc;
}
, {});  