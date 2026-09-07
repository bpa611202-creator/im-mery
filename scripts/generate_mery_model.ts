import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// Polyfill FileReader for Node.js GLTFExporter binary export
(globalThis as any).FileReader = class FileReader {
  result: ArrayBuffer | null = null;
  onload: ((e: any) => void) | null = null;
  onloadend: ((e: any) => void) | null = null;

  readAsArrayBuffer(blob: any) {
    blob.arrayBuffer().then((buf: ArrayBuffer) => {
      this.result = buf;
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    });
  }
};

export function buildMeryModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'MeryIndianAvatar';

  // 1. Color Palette & Materials
  // Traditional Indian Attire (Midnight Peacock Teal & 24K Gold Zari)
  const skinMat = new THREE.MeshStandardMaterial({
    name: 'Mery_Skin',
    color: new THREE.Color('#FFEFE2'), // Warm golden porcelain skin tone
    roughness: 0.65,
    metalness: 0.05,
  });

  const hairMat = new THREE.MeshStandardMaterial({
    name: 'Mery_Hair',
    color: new THREE.Color('#10131E'), // Lustrous raven black
    roughness: 0.32,
    metalness: 0.15,
  });

  const hairLusterMat = new THREE.MeshStandardMaterial({
    name: 'Mery_HairLuster',
    color: new THREE.Color('#00A3FF'), // Electric blue sheen accent
    roughness: 0.2,
    metalness: 0.6,
    emissive: new THREE.Color('#004488'),
    emissiveIntensity: 0.3,
  });

  const dressMat = new THREE.MeshStandardMaterial({
    name: 'Mery_TraditionalDress',
    color: new THREE.Color('#0A2240'), // Royal Peacock / Midnight Blue
    roughness: 0.45,
    metalness: 0.18,
  });

  const goldZariMat = new THREE.MeshStandardMaterial({
    name: 'Mery_GoldZari',
    color: new THREE.Color('#FFD700'), // Ornate Indian 24K Gold
    roughness: 0.28,
    metalness: 0.85,
  });

  const rubyJewelMat = new THREE.MeshStandardMaterial({
    name: 'Mery_RubyJewel',
    color: new THREE.Color('#E11D48'), // Rich Indian Kundan Ruby
    roughness: 0.15,
    metalness: 0.4,
    emissive: new THREE.Color('#880020'),
    emissiveIntensity: 0.2,
  });

  const pearlMat = new THREE.MeshStandardMaterial({
    name: 'Mery_Pearl',
    color: new THREE.Color('#FFFBF0'), // Natural pearl droplet
    roughness: 0.25,
    metalness: 0.1,
  });

  const dupattaMat = new THREE.MeshStandardMaterial({
    name: 'Mery_Dupatta',
    color: new THREE.Color('#0077B6'), // Flowing translucent cyan-teal silk
    roughness: 0.38,
    metalness: 0.15,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });

  const eyeWhiteMat = new THREE.MeshStandardMaterial({
    name: 'Mery_EyeWhite',
    color: new THREE.Color('#FFFFFF'),
    roughness: 0.2,
  });

  const eyeIrisMat = new THREE.MeshStandardMaterial({
    name: 'Mery_Iris',
    color: new THREE.Color('#0088FF'),
    roughness: 0.18,
    metalness: 0.3,
    emissive: new THREE.Color('#003388'),
    emissiveIntensity: 0.25,
  });

  const pupilMat = new THREE.MeshBasicMaterial({
    name: 'Mery_Pupil',
    color: new THREE.Color('#050810'),
  });

  const blushMat = new THREE.MeshBasicMaterial({
    name: 'Mery_Blush',
    color: new THREE.Color('#FF8B94'),
    transparent: true,
    opacity: 0.38,
  });

  const lipMat = new THREE.MeshStandardMaterial({
    name: 'Mery_Lips',
    color: new THREE.Color('#FF6B8B'),
    roughness: 0.3,
  });

  // 2. Skeletal Hierarchy Nodes
  const spine = new THREE.Group();
  spine.name = 'Spine';
  spine.position.set(0, 0, 0);
  root.add(spine);

  const chest = new THREE.Group();
  chest.name = 'Chest';
  chest.position.set(0, 0.38, 0);
  spine.add(chest);

  const neck = new THREE.Group();
  neck.name = 'Neck';
  neck.position.set(0, 0.36, 0);
  chest.add(neck);

  const head = new THREE.Group();
  head.name = 'Head';
  head.position.set(0, 0.18, 0);
  neck.add(head);

  // 3. Torso / Traditional Kurti (Waist-Up)
  const kurtiGeom = new THREE.CylinderGeometry(0.24, 0.29, 0.48, 24);
  const kurtiMesh = new THREE.Mesh(kurtiGeom, dressMat);
  kurtiMesh.name = 'KurtiBody';
  kurtiMesh.position.set(0, -0.12, 0);
  chest.add(kurtiMesh);

  // Gold Zari Waist & Neck Borders
  const waistBorderGeom = new THREE.TorusGeometry(0.28, 0.015, 12, 32);
  const waistBorder = new THREE.Mesh(waistBorderGeom, goldZariMat);
  waistBorder.name = 'WaistZariBorder';
  waistBorder.rotation.x = Math.PI / 2;
  waistBorder.position.set(0, -0.34, 0);
  chest.add(waistBorder);

  const neckBorderGeom = new THREE.TorusGeometry(0.14, 0.012, 12, 32);
  const neckBorder = new THREE.Mesh(neckBorderGeom, goldZariMat);
  neckBorder.name = 'NeckZariBorder';
  neckBorder.rotation.x = Math.PI / 2;
  neckBorder.position.set(0, 0.15, 0);
  chest.add(neckBorder);

  // 4. Kundan Traditional Gold Necklace
  const necklaceGroup = new THREE.Group();
  necklaceGroup.name = 'KundanNecklace';
  necklaceGroup.position.set(0, 0.12, 0.08);

  const necklaceCurve = new THREE.TorusGeometry(0.125, 0.012, 12, 28, Math.PI * 0.9);
  const necklaceBase = new THREE.Mesh(necklaceCurve, goldZariMat);
  necklaceBase.rotation.x = Math.PI * 0.35;
  necklaceBase.rotation.z = Math.PI * 1.05;
  necklaceGroup.add(necklaceBase);

  // Central Kundan Ruby Pendant
  const pendantGeom = new THREE.ConeGeometry(0.024, 0.045, 8);
  const pendant = new THREE.Mesh(pendantGeom, rubyJewelMat);
  pendant.name = 'NecklacePendant';
  pendant.rotation.x = Math.PI;
  pendant.position.set(0, -0.04, 0.09);
  necklaceGroup.add(pendant);

  // Pearl droplet on pendant tip
  const pearlDropletGeom = new THREE.SphereGeometry(0.01, 10, 10);
  const pearlDroplet = new THREE.Mesh(pearlDropletGeom, pearlMat);
  pearlDroplet.position.set(0, -0.065, 0.09);
  necklaceGroup.add(pearlDroplet);
  chest.add(necklaceGroup);

  // 5. Traditional Dupatta Draped Across Chest & Over Left Shoulder
  const dupattaRoot = new THREE.Group();
  dupattaRoot.name = 'DupattaRoot';

  // Dupatta diagonal sash across chest
  const dupattaChestGeom = new THREE.CylinderGeometry(0.26, 0.3, 0.44, 20, 4, true, -1.2, 2.2);
  const dupattaChest = new THREE.Mesh(dupattaChestGeom, dupattaMat);
  dupattaChest.name = 'Dupatta_Chest';
  dupattaChest.position.set(-0.04, -0.1, 0.02);
  dupattaChest.rotation.z = -0.15;
  dupattaRoot.add(dupattaChest);

  // Dupatta Golden Border Along Sash
  const dupattaZariGeom = new THREE.TorusGeometry(0.27, 0.008, 8, 24, Math.PI * 0.7);
  const dupattaZari = new THREE.Mesh(dupattaZariGeom, goldZariMat);
  dupattaZari.name = 'Dupatta_ZariBorder';
  dupattaZari.position.set(-0.03, -0.08, 0.07);
  dupattaZari.rotation.x = Math.PI * 0.4;
  dupattaZari.rotation.z = -0.2;
  dupattaRoot.add(dupattaZari);

  // Left Shoulder Dupatta Pleats & Back Trail (for physics sway)
  const dupattaShoulderGeom = new THREE.BoxGeometry(0.18, 0.06, 0.28);
  const dupattaShoulder = new THREE.Mesh(dupattaShoulderGeom, dupattaMat);
  dupattaShoulder.name = 'Dupatta_LeftShoulder';
  dupattaShoulder.position.set(-0.32, 0.16, 0.02);
  dupattaRoot.add(dupattaShoulder);

  const dupattaTrail = new THREE.Group();
  dupattaTrail.name = 'Dupatta_Trail';
  dupattaTrail.position.set(-0.32, 0.12, -0.1);

  // Cascading fabric sheet
  const dupattaSheetGeom = new THREE.PlaneGeometry(0.24, 0.75, 8, 12);
  const dupattaSheet = new THREE.Mesh(dupattaSheetGeom, dupattaMat);
  dupattaSheet.name = 'Dupatta_Edge';
  dupattaSheet.position.set(0, -0.36, -0.04);
  dupattaSheet.rotation.y = 0.1;
  dupattaTrail.add(dupattaSheet);

  // Gold border on the dupatta trail
  const dupattaTrailZariGeom = new THREE.CylinderGeometry(0.006, 0.006, 0.75, 8);
  const dupattaTrailZari = new THREE.Mesh(dupattaTrailZariGeom, goldZariMat);
  dupattaTrailZari.name = 'Dupatta_TrailZari';
  dupattaTrailZari.position.set(0.12, -0.36, -0.03);
  dupattaTrail.add(dupattaTrailZari);

  dupattaRoot.add(dupattaTrail);
  chest.add(dupattaRoot);

  // 6. Shoulders, Arms, Wrists & Gold Bangles
  // Left Arm (holding dupatta / chest gesturing)
  const leftShoulder = new THREE.Group();
  leftShoulder.name = 'LeftShoulder';
  leftShoulder.position.set(-0.28, 0.14, 0);
  chest.add(leftShoulder);

  const upperArmL = new THREE.Group();
  upperArmL.name = 'UpperArm_L';
  leftShoulder.add(upperArmL);

  const upperArmLMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.052, 0.32, 16),
    dressMat
  );
  upperArmLMesh.position.set(0, -0.16, 0);
  upperArmL.add(upperArmLMesh);

  const armLZari = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.008, 8, 20), goldZariMat);
  armLZari.rotation.x = Math.PI / 2;
  armLZari.position.set(0, -0.28, 0);
  upperArmL.add(armLZari);

  const lowerArmL = new THREE.Group();
  lowerArmL.name = 'LowerArm_L';
  lowerArmL.position.set(0, -0.32, 0);
  upperArmL.add(lowerArmL);

  const lowerArmLMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.042, 0.3, 16),
    skinMat
  );
  lowerArmLMesh.position.set(0, -0.15, 0);
  lowerArmL.add(lowerArmLMesh);

  const handL = new THREE.Group();
  handL.name = 'Hand_L';
  handL.position.set(0, -0.3, 0);
  lowerArmL.add(handL);

  const handLMesh = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 14), skinMat);
  handLMesh.scale.set(0.9, 1.3, 0.7);
  handL.add(handLMesh);

  // Indian Gold Bangles on Left Wrist
  const bangleGroupL = new THREE.Group();
  bangleGroupL.name = 'Bangles_L';
  for (let i = 0; i < 3; i++) {
    const bangle = new THREE.Mesh(new THREE.TorusGeometry(0.044, 0.005, 8, 20), goldZariMat);
    bangle.rotation.x = Math.PI / 2;
    bangle.position.set(0, 0.03 + i * 0.016, 0);
    bangleGroupL.add(bangle);
  }
  handL.add(bangleGroupL);

  // Right Arm (Graceful conversational gesturing)
  const rightShoulder = new THREE.Group();
  rightShoulder.name = 'RightShoulder';
  rightShoulder.position.set(0.28, 0.14, 0);
  chest.add(rightShoulder);

  const upperArmR = new THREE.Group();
  upperArmR.name = 'UpperArm_R';
  rightShoulder.add(upperArmR);

  const upperArmRMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.052, 0.32, 16),
    dressMat
  );
  upperArmRMesh.position.set(0, -0.16, 0);
  upperArmR.add(upperArmRMesh);

  const armRZari = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.008, 8, 20), goldZariMat);
  armRZari.rotation.x = Math.PI / 2;
  armRZari.position.set(0, -0.28, 0);
  upperArmR.add(armRZari);

  const lowerArmR = new THREE.Group();
  lowerArmR.name = 'LowerArm_R';
  lowerArmR.position.set(0, -0.32, 0);
  upperArmR.add(lowerArmR);

  const lowerArmRMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.042, 0.3, 16),
    skinMat
  );
  lowerArmRMesh.position.set(0, -0.15, 0);
  lowerArmR.add(lowerArmRMesh);

  const handR = new THREE.Group();
  handR.name = 'Hand_R';
  handR.position.set(0, -0.3, 0);
  lowerArmR.add(handR);

  const handRMesh = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 14), skinMat);
  handRMesh.scale.set(0.9, 1.3, 0.7);
  handR.add(handRMesh);

  // Indian Gold Bangles on Right Wrist
  const bangleGroupR = new THREE.Group();
  bangleGroupR.name = 'Bangles_R';
  for (let i = 0; i < 3; i++) {
    const bangle = new THREE.Mesh(new THREE.TorusGeometry(0.044, 0.005, 8, 20), goldZariMat);
    bangle.rotation.x = Math.PI / 2;
    bangle.position.set(0, 0.03 + i * 0.016, 0);
    bangleGroupR.add(bangle);
  }
  handR.add(bangleGroupR);

  // 7. Neck & Head
  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.092, 0.18, 16), skinMat);
  neckMesh.position.set(0, 0.08, 0);
  neck.add(neckMesh);

  // Stylized Anime Head with Morph Targets
  const headGeom = new THREE.SphereGeometry(0.21, 32, 32);
  // Shape into anime chin
  const posAttr = headGeom.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const x = posAttr.getX(i);

    // Taper lower chin
    if (y < 0) {
      const taper = 1.0 + y * 0.65;
      posAttr.setX(i, x * Math.max(taper, 0.45));
      posAttr.setZ(i, z * Math.max(taper, 0.55));
    }
  }
  headGeom.computeVertexNormals();

  // Add Morph Targets for Visemes & Blinking
  const morphMouthOpen = new Float32Array(posAttr.count * 3);
  const morphAA = new Float32Array(posAttr.count * 3);
  const morphIH = new Float32Array(posAttr.count * 3);
  const morphOU = new Float32Array(posAttr.count * 3);
  const morphEE = new Float32Array(posAttr.count * 3);
  const morphOH = new Float32Array(posAttr.count * 3);
  const morphBlink = new Float32Array(posAttr.count * 3);
  const morphHappy = new Float32Array(posAttr.count * 3);

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);

    // Mouth area: z > 0.12, y < -0.04, y > -0.15, |x| < 0.1
    if (z > 0.12 && y < -0.04 && y > -0.16 && Math.abs(x) < 0.12) {
      const weight = (1 - Math.abs(x) / 0.12) * (1 - Math.abs(y + 0.1) / 0.08);

      // mouthOpen / AA: drops lower jaw and deepens cavity
      morphMouthOpen[i * 3 + 1] = -0.038 * weight;
      morphMouthOpen[i * 3 + 2] = -0.015 * weight;

      morphAA[i * 3 + 1] = -0.042 * weight;
      morphAA[i * 3 + 2] = -0.018 * weight;

      // IH / EE: wider mouth corner stretch
      morphIH[i * 3] = (x > 0 ? 0.015 : -0.015) * weight;
      morphIH[i * 3 + 1] = 0.008 * weight;

      morphEE[i * 3] = (x > 0 ? 0.018 : -0.018) * weight;
      morphEE[i * 3 + 1] = 0.01 * weight;

      // OU / OH: forward puckering
      morphOU[i * 3 + 2] = 0.025 * weight;
      morphOU[i * 3] = (x > 0 ? -0.008 : 0.008) * weight;

      morphOH[i * 3 + 1] = -0.03 * weight;
      morphOH[i * 3 + 2] = 0.02 * weight;

      // Happy smile
      morphHappy[i * 3 + 1] = 0.015 * weight;
    }

    // Eye area for blink: z > 0.15, y > 0.01, y < 0.09, |x| > 0.05, |x| < 0.14
    if (z > 0.14 && y > 0.0 && y < 0.1 && Math.abs(x) > 0.04 && Math.abs(x) < 0.15) {
      const eyeWeight = Math.max(0, 1 - Math.abs(y - 0.05) / 0.05);
      morphBlink[i * 3 + 1] = -0.028 * eyeWeight;
      morphBlink[i * 3 + 2] = 0.006 * eyeWeight;
    }
  }

  headGeom.morphAttributes.position = [
    new THREE.BufferAttribute(morphMouthOpen, 3),
    new THREE.BufferAttribute(morphAA, 3),
    new THREE.BufferAttribute(morphIH, 3),
    new THREE.BufferAttribute(morphOU, 3),
    new THREE.BufferAttribute(morphEE, 3),
    new THREE.BufferAttribute(morphOH, 3),
    new THREE.BufferAttribute(morphBlink, 3),
    new THREE.BufferAttribute(morphHappy, 3),
  ];

  const headMesh = new THREE.Mesh(headGeom, skinMat);
  headMesh.name = 'HeadMesh';
  headMesh.morphTargetDictionary = {
    mouthOpen: 0,
    aa: 1,
    ih: 2,
    ou: 3,
    ee: 4,
    oh: 5,
    blink: 6,
    blink_left: 6,
    blink_right: 6,
    happy: 7,
  };
  headMesh.morphTargetInfluences = [0, 0, 0, 0, 0, 0, 0, 0];
  head.add(headMesh);

  // 8. Traditional Indian Face Accents: BINDI & MAANG TIKKA
  // Vermilion Ruby Bindi on Forehead
  const bindiGeom = new THREE.CircleGeometry(0.012, 16);
  const bindiMesh = new THREE.Mesh(bindiGeom, rubyJewelMat);
  bindiMesh.name = 'IndianBindi';
  bindiMesh.position.set(0, 0.065, 0.208);
  head.add(bindiMesh);

  // Maang Tikka (Traditional Forehead Hair Jewel Chain & Pendant)
  const maangTikkaGroup = new THREE.Group();
  maangTikkaGroup.name = 'MaangTikka';

  // Hairline gold chain
  const tikkaChainGeom = new THREE.CylinderGeometry(0.003, 0.003, 0.14, 8);
  const tikkaChain = new THREE.Mesh(tikkaChainGeom, goldZariMat);
  tikkaChain.position.set(0, 0.15, 0.185);
  tikkaChain.rotation.x = -Math.PI * 0.25;
  maangTikkaGroup.add(tikkaChain);

  // Forehead teardrop jewel pendant
  const tikkaPendantGeom = new THREE.ConeGeometry(0.015, 0.03, 8);
  const tikkaPendant = new THREE.Mesh(tikkaPendantGeom, goldZariMat);
  tikkaPendant.position.set(0, 0.095, 0.205);
  tikkaPendant.rotation.x = Math.PI;
  maangTikkaGroup.add(tikkaPendant);

  // Center ruby gem in Maang Tikka
  const tikkaRubyGeom = new THREE.SphereGeometry(0.007, 8, 8);
  const tikkaRuby = new THREE.Mesh(tikkaRubyGeom, rubyJewelMat);
  tikkaRuby.position.set(0, 0.095, 0.21);
  maangTikkaGroup.add(tikkaRuby);
  head.add(maangTikkaGroup);

  // 9. Traditional Indian Jhumka Earrings (Left & Right)
  const createJhumka = (isLeft: boolean) => {
    const jhumka = new THREE.Group();
    jhumka.name = isLeft ? 'Jhumka_L' : 'Jhumka_R';
    const side = isLeft ? -1 : 1;
    jhumka.position.set(side * 0.21, -0.02, 0.02);

    // Ear stud (Gold flower with center ruby)
    const studGeom = new THREE.SphereGeometry(0.014, 10, 10);
    const stud = new THREE.Mesh(studGeom, goldZariMat);
    jhumka.add(stud);

    const studRuby = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 8), rubyJewelMat);
    studRuby.position.set(side * 0.008, 0, 0.008);
    jhumka.add(studRuby);

    // Bell shaped dangling Jhumka dome
    const bellGeom = new THREE.ConeGeometry(0.032, 0.04, 16, 1, true);
    const bell = new THREE.Mesh(bellGeom, goldZariMat);
    bell.position.set(0, -0.05, 0);
    bell.rotation.x = Math.PI;
    jhumka.add(bell);

    // Pearl droplets along bell edge
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 8), pearlMat);
      pearl.position.set(
        Math.cos(angle) * 0.03,
        -0.07,
        Math.sin(angle) * 0.03
      );
      jhumka.add(pearl);
    }

    return jhumka;
  };

  head.add(createJhumka(true));
  head.add(createJhumka(false));

  // 10. Expressive Anime Eyes (Large, expressive anime eyes)
  const createAnimeEye = (isLeft: boolean) => {
    const eyeGroup = new THREE.Group();
    const side = isLeft ? -1 : 1;
    eyeGroup.name = isLeft ? 'Eye_L' : 'Eye_R';
    eyeGroup.position.set(side * 0.088, 0.042, 0.176);
    eyeGroup.rotation.y = side * 0.15;

    // Sclera (White)
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.044, 16, 16), eyeWhiteMat);
    sclera.scale.set(1.2, 1.1, 0.35);
    eyeGroup.add(sclera);

    // Large Iris
    const iris = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.015, 20), eyeIrisMat);
    iris.rotation.x = Math.PI / 2;
    iris.position.set(0, 0, 0.012);
    eyeGroup.add(iris);

    // Pupil
    const pupil = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.016, 16), pupilMat);
    pupil.rotation.x = Math.PI / 2;
    pupil.position.set(0, 0, 0.014);
    eyeGroup.add(pupil);

    // Anime Eye Sparkle / Specular Highlights
    const highlight1 = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), eyeWhiteMat);
    highlight1.position.set(side * 0.01, 0.012, 0.024);
    eyeGroup.add(highlight1);

    const highlight2 = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 8), eyeWhiteMat);
    highlight2.position.set(side * -0.01, -0.01, 0.024);
    eyeGroup.add(highlight2);

    // Upper Eyelash Line
    const lashGeom = new THREE.TorusGeometry(0.045, 0.006, 8, 16, Math.PI * 0.65);
    const lash = new THREE.Mesh(lashGeom, hairMat);
    lash.name = isLeft ? 'Lash_L' : 'Lash_R';
    lash.position.set(0, 0.028, 0.018);
    lash.rotation.z = side * 0.1;
    eyeGroup.add(lash);

    return eyeGroup;
  };

  head.add(createAnimeEye(true));
  head.add(createAnimeEye(false));

  // Soft Rosy Cheeks Blush
  const blushL = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.028), blushMat);
  blushL.position.set(-0.11, -0.01, 0.178);
  blushL.rotation.y = -0.3;
  head.add(blushL);

  const blushR = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.028), blushMat);
  blushR.position.set(0.11, -0.01, 0.178);
  blushR.rotation.y = 0.3;
  head.add(blushR);

  // Soft Anime Lips
  const lips = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.008, 12), lipMat);
  lips.name = 'MouthLips';
  lips.position.set(0, -0.092, 0.185);
  lips.rotation.x = Math.PI / 2;
  head.add(lips);

  // 11. Long Dark Hair with Strands for Physics Sway
  const hairRoot = new THREE.Group();
  hairRoot.name = 'HairRoot';

  // Hair Base Dome
  const hairDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.65),
    hairMat
  );
  hairDome.position.set(0, 0.03, -0.02);
  hairRoot.add(hairDome);

  // Front Anime Bangs
  for (let i = -3; i <= 3; i++) {
    const bang = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.16, 8), hairMat);
    bang.rotation.z = Math.PI + i * 0.15;
    bang.rotation.x = -0.22;
    bang.position.set(i * 0.045, 0.15, 0.17);
    hairRoot.add(bang);
  }

  // Left Long Hair Strands (past shoulders/chest for physics sway)
  const hairStrandL1 = new THREE.Group();
  hairStrandL1.name = 'HairStrand_L1';
  hairStrandL1.position.set(-0.18, 0.08, 0.06);

  const strandL1Mesh = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.55, 12), hairMat);
  strandL1Mesh.position.set(0, -0.26, 0.06);
  strandL1Mesh.rotation.x = 0.12;
  hairStrandL1.add(strandL1Mesh);

  // Highlight luster ribbon
  const lusterL = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.024, 0.45, 8), hairLusterMat);
  lusterL.position.set(-0.01, -0.22, 0.08);
  hairStrandL1.add(lusterL);
  hairRoot.add(hairStrandL1);

  // Right Long Hair Strands (past shoulders/chest for physics sway)
  const hairStrandR1 = new THREE.Group();
  hairStrandR1.name = 'HairStrand_R1';
  hairStrandR1.position.set(0.18, 0.08, 0.06);

  const strandR1Mesh = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.55, 12), hairMat);
  strandR1Mesh.position.set(0, -0.26, 0.06);
  strandR1Mesh.rotation.x = 0.12;
  hairStrandR1.add(strandR1Mesh);

  const lusterR = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.024, 0.45, 8), hairLusterMat);
  lusterR.position.set(0.01, -0.22, 0.08);
  hairStrandR1.add(lusterR);
  hairRoot.add(hairStrandR1);

  // Long Dark Flowing Hair Cascade in Back (for physics sway)
  const hairBack = new THREE.Group();
  hairBack.name = 'HairBack';
  hairBack.position.set(0, 0.06, -0.16);

  for (let i = -2; i <= 2; i++) {
    const backCascade = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.72, 10), hairMat);
    backCascade.name = `HairBackCascade_${i + 2}`;
    backCascade.position.set(i * 0.07, -0.34, -0.03 * Math.abs(i));
    backCascade.rotation.x = -0.15;
    hairBack.add(backCascade);
  }
  hairRoot.add(hairBack);

  head.add(hairRoot);

  return root;
}

// Main execution function
async function generateAndExportGLB() {
  console.log('Generating custom Indian Anime Girl 3D model for MERY...');
  const scene = new THREE.Scene();
  const avatar = buildMeryModel();
  scene.add(avatar);

  const outDir = path.resolve(process.cwd(), 'public/models');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'mery.glb');
  const exporter = new GLTFExporter();

  console.log('Exporting binary GLB to', outPath);
  exporter.parse(
    scene,
    (glb) => {
      const buffer = Buffer.from(glb as ArrayBuffer);
      fs.writeFileSync(outPath, buffer);
      console.log('SUCCESS! Generated /public/models/mery.glb - Size:', buffer.length, 'bytes');
    },
    (err) => {
      console.error('Error exporting GLB:', err);
    },
    { binary: true }
  );
}

generateAndExportGLB();
