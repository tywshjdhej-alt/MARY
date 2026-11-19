import * as THREE from 'three';

export interface PlayerRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  flashlightMount: THREE.Object3D;
  jacketMat: THREE.MeshStandardMaterial;
}

export const OUTFIT_COLORS = [
  0x2c4257, // Slate Navy Hoodie
  0x52292e, // Oxblood Jacket
  0x2b3e33, // Forest Moss Coat
  0x32343a, // Charcoal Trench
];

export function createPlayerModel(contactShadowTex: THREE.Texture, outfitIndex = 0): PlayerRig {
  const root = new THREE.Group();

  // Contact shadow disc
  const shadowGeo = new THREE.PlaneGeometry(1.1, 1.1);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.65,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  root.add(shadow);

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const jacketMat = new THREE.MeshStandardMaterial({
    color: OUTFIT_COLORS[outfitIndex % OUTFIT_COLORS.length],
    roughness: 0.85,
    metalness: 0.04,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x1c2026,
    roughness: 0.9,
    metalness: 0.02,
  });
  const bootsMat = new THREE.MeshStandardMaterial({
    color: 0x141210,
    roughness: 0.45,
    metalness: 0.25,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xd9b59c,
    roughness: 0.65,
    metalness: 0.0,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x1d1714,
    roughness: 0.88,
    metalness: 0.05,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.2,
    metalness: 0.1,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x8b95a5,
    roughness: 0.25,
    metalness: 0.88,
  });

  // Legs (hip at y = 0.78)
  const buildLeg = (xOffset: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(xOffset, 0.78, 0);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.36, 4, 8), pantsMat);
    thigh.position.y = -0.24;
    thigh.castShadow = true;
    pivot.add(thigh);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.26), bootsMat);
    boot.position.set(0, -0.7, 0.04);
    boot.castShadow = true;
    pivot.add(boot);

    return pivot;
  };

  const leftLegPivot = buildLeg(-0.13);
  const rightLegPivot = buildLeg(0.13);
  bodyGroup.add(leftLegPivot, rightLegPivot);

  // Torso (jacket + collar + belt trim)
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.19, 0.62, 10), jacketMat);
  torso.position.y = 1.09;
  torso.castShadow = true;
  bodyGroup.add(torso);

  const hoodCollar = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.055, 8, 14), jacketMat);
  hoodCollar.rotation.x = Math.PI / 2;
  hoodCollar.position.set(0, 1.4, -0.02);
  bodyGroup.add(hoodCollar);

  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 0.16), bootsMat);
  backpack.position.set(0, 1.12, -0.22);
  backpack.castShadow = true;
  bodyGroup.add(backpack);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.04), metalMat);
  buckle.position.set(0, 0.8, 0.19);
  bodyGroup.add(buckle);

  // Head group (stylized cartoon-horror proportions)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.56, 0);
  bodyGroup.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 12), skinMat);
  head.scale.set(0.96, 1.08, 0.98);
  head.castShadow = true;
  headGroup.add(head);

  // Hair cap + front bangs
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.205, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
    hairMat,
  );
  hairCap.rotation.x = -0.22;
  hairCap.position.set(0, 0.02, -0.01);
  headGroup.add(hairCap);

  // Eyes (facing +Z local forward)
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), eyeMat);
  eyeL.position.set(-0.065, 0.02, 0.165);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.065;
  headGroup.add(eyeL, eyeR);

  // Arms (shoulder at y = 1.34)
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.29, 1.34, 0);
  const lSleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.36, 4, 8), jacketMat);
  lSleeve.position.y = -0.22;
  lSleeve.castShadow = true;
  const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), skinMat);
  lHand.position.y = -0.45;
  leftArmPivot.add(lSleeve, lHand);
  bodyGroup.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.29, 1.34, 0);
  const rSleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.36, 4, 8), jacketMat);
  rSleeve.position.y = -0.22;
  rSleeve.castShadow = true;
  const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), skinMat);
  rHand.position.y = -0.45;
  rightArmPivot.add(rSleeve, rHand);

  // Flashlight in right hand
  const flashlightMount = new THREE.Group();
  flashlightMount.position.set(0, -0.47, 0.08);
  const torchBody = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.025, 0.19, 10), metalMat);
  torchBody.rotation.x = Math.PI / 2;
  const torchHead = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.028, 0.055, 10),
    bootsMat,
  );
  torchHead.rotation.x = Math.PI / 2;
  torchHead.position.z = 0.1;
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0xfff3d1,
    emissive: 0xffdf99,
    emissiveIntensity: 1.4,
    roughness: 0.1,
  });
  const torchLens = new THREE.Mesh(new THREE.CircleGeometry(0.036, 10), lensMat);
  torchLens.position.z = 0.13;
  flashlightMount.add(torchBody, torchHead, torchLens);
  rightArmPivot.add(flashlightMount);

  bodyGroup.add(rightArmPivot);

  return {
    root,
    bodyGroup,
    headGroup,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    flashlightMount,
    jacketMat,
  };
}

export interface MaryRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  eyeLeftMat: THREE.MeshStandardMaterial;
  eyeRightMat: THREE.MeshStandardMaterial;
  auraRing: THREE.Mesh;
}

export function createMaryModel(contactShadowTex: THREE.Texture): MaryRig {
  const root = new THREE.Group();

  // Dark eerie contact shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 1.4),
    new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.78,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  root.add(shadow);

  // Subtle crimson floor aura
  const auraRing = new THREE.Mesh(
    new THREE.RingGeometry(0.32, 0.56, 24),
    new THREE.MeshBasicMaterial({
      color: 0x9e1b2c,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.022;
  root.add(auraRing);

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const dressMat = new THREE.MeshStandardMaterial({
    color: 0x14131a,
    roughness: 0.92,
    metalness: 0.05,
  });
  const tatteredMat = new THREE.MeshStandardMaterial({
    color: 0x2a141c,
    roughness: 0.85,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });
  const porcelainMat = new THREE.MeshStandardMaterial({
    color: 0xd8d3cc,
    roughness: 0.42,
    metalness: 0.05,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    roughness: 0.75,
    metalness: 0.12,
  });

  // Elongated tattered dress skirt
  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.28, 12, 1, true), dressMat);
  skirt.position.y = 0.66;
  skirt.castShadow = true;
  bodyGroup.add(skirt);

  const outerShawl = new THREE.Mesh(new THREE.ConeGeometry(0.29, 0.72, 10, 1, true), tatteredMat);
  outerShawl.position.y = 1.12;
  bodyGroup.add(outerShawl);

  // Upper torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 0.52, 10), dressMat);
  torso.position.y = 1.28;
  bodyGroup.add(torso);

  // Head (tilted unnervingly)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.66, 0.03);
  bodyGroup.add(headGroup);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.185, 14, 12), porcelainMat);
  skull.scale.set(0.92, 1.14, 0.95);
  skull.castShadow = true;
  headGroup.add(skull);

  // Long cascading dark hair strands
  const hairBack = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.24, 0.78, 10, 1, true), hairMat);
  hairBack.position.set(0, -0.2, -0.04);
  headGroup.add(hairBack);

  const hairBangL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.06), hairMat);
  hairBangL.position.set(-0.14, -0.08, 0.09);
  const hairBangR = hairBangL.clone();
  hairBangR.position.x = 0.14;
  headGroup.add(hairBangL, hairBangR);

  // Glowing hollow eyes
  const eyeLeftMat = new THREE.MeshStandardMaterial({
    color: 0xff2a43,
    emissive: 0xff1a35,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });
  const eyeRightMat = eyeLeftMat.clone();

  const eyeSocketMat = new THREE.MeshBasicMaterial({ color: 0x050507 });
  const socketL = new THREE.Mesh(new THREE.CircleGeometry(0.038, 10), eyeSocketMat);
  socketL.position.set(-0.062, 0.02, 0.172);
  const socketR = socketL.clone();
  socketR.position.x = 0.062;
  headGroup.add(socketL, socketR);

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), eyeLeftMat);
  eyeL.position.set(-0.062, 0.02, 0.176);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), eyeRightMat);
  eyeR.position.set(0.062, 0.02, 0.176);
  headGroup.add(eyeL, eyeR);

  // Slender reaching arms
  const buildArm = (xOffset: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(xOffset, 1.46, 0);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.032, 0.68, 8), porcelainMat);
    upper.position.y = -0.32;
    upper.castShadow = true;
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.08, 0.34, 8), dressMat);
    sleeve.position.y = -0.16;
    pivot.add(upper, sleeve);
    return pivot;
  };

  const leftArm = buildArm(-0.22);
  const rightArm = buildArm(0.22);
  leftArm.rotation.x = -0.9;
  rightArm.rotation.x = -0.95;
  bodyGroup.add(leftArm, rightArm);

  return {
    root,
    bodyGroup,
    headGroup,
    leftArm,
    rightArm,
    eyeLeftMat,
    eyeRightMat,
    auraRing,
  };
}
