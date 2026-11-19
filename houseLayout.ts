import * as THREE from 'three';
import { ProceduralTextureSet } from './textures';

export interface AABBCollider {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  blocksCamera?: boolean;
  active?: boolean;
}

export interface HouseInteractable {
  id: string;
  position: THREE.Vector3;
  radius: number;
  roomKey: string;
  mesh?: THREE.Object3D;
  labelKey: string;
  active: boolean;
}

export interface HouseBuildResult {
  group: THREE.Group;
  colliders: AABBCollider[];
  interactables: HouseInteractable[];
  studyDoorPivot: THREE.Group;
  studyDoorCollider: AABBCollider;
  frontDoorPivot: THREE.Group;
  hallLight: THREE.PointLight;
  parlorLight: THREE.PointLight;
  studyLight: THREE.PointLight;
  bedroomLight: THREE.PointLight;
  portraitMeshes: THREE.Mesh[];
  phoneScreenMat: THREE.MeshStandardMaterial;
  breakerLedMat: THREE.MeshStandardMaterial;
  hidingSpots: { id: string; insidePos: THREE.Vector3; exitPos: THREE.Vector3; yaw: number }[];
}

export function getRoomKeyAt(x: number, z: number): string {
  if (x < -1.5 && z < -0.5) return 'room_bedroom';
  if (x > 1.5 && z < -0.5) return 'room_study';
  if (x > 1.5 && z >= -0.5) return 'room_parlor';
  return 'room_hallway';
}

export function buildAbandonedHouse(textures: ProceduralTextureSet): HouseBuildResult {
  const group = new THREE.Group();
  const colliders: AABBCollider[] = [];
  const interactables: HouseInteractable[] = [];

  const wallHeight = 3.6;
  const wallThickness = 0.28;

  // Materials
  const floorMat = new THREE.MeshStandardMaterial({
    map: textures.woodFloor,
    roughnessMap: textures.woodRoughness,
    roughness: 0.82,
    metalness: 0.05,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    map: textures.wallpaper,
    roughness: 0.9,
    metalness: 0.02,
  });
  const ceilingMat = new THREE.MeshStandardMaterial({
    map: textures.darkPlaster,
    roughness: 0.95,
    metalness: 0.0,
  });
  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: 0x261a12,
    roughness: 0.72,
    metalness: 0.06,
  });
  const trimWoodMat = new THREE.MeshStandardMaterial({
    color: 0x17110d,
    roughness: 0.65,
    metalness: 0.08,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xb08a46,
    roughness: 0.3,
    metalness: 0.85,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x454d59,
    roughness: 0.35,
    metalness: 0.8,
  });
  const fabricMat = new THREE.MeshStandardMaterial({
    color: 0x3b2c32,
    roughness: 0.95,
    metalness: 0.0,
  });

  // Floor (18m wide X: -9..9, 16m deep Z: -8..8)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 16), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Ceiling
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(18, 16), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = wallHeight;
  group.add(ceiling);

  // Helper to add a wall segment + AABB collider
  const addWall = (id: string, x1: number, z1: number, x2: number, z2: number) => {
    const cx = (x1 + x2) / 2;
    const cz = (z1 + z2) / 2;
    const dx = Math.abs(x2 - x1);
    const dz = Math.abs(z2 - z1);
    const w = Math.max(wallThickness, dx);
    const d = Math.max(wallThickness, dz);

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, wallHeight, d), wallMat);
    mesh.position.set(cx, wallHeight / 2, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Baseboard trim
    const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, 0.16, d + 0.03), trimWoodMat);
    trim.position.set(cx, 0.08, cz);
    group.add(trim);

    colliders.push({
      id,
      minX: cx - w / 2,
      maxX: cx + w / 2,
      minZ: cz - d / 2,
      maxZ: cz + d / 2,
      blocksCamera: true,
      active: true,
    });
  };

  // Outer perimeter walls
  addWall('outer_north', -9, -8, 9, -8);
  addWall('outer_west', -9, -8, -9, 8);
  addWall('outer_east', 9, -8, 9, 8);
  // South wall split for Front Exit Door at X: -1.1 .. 1.1
  addWall('outer_south_w', -9, 8, -1.1, 8);
  addWall('outer_south_e', 1.1, 8, 9, 8);

  // Interior Bedroom Walls (X: -9..-1.6, Z: -8..-0.5) with doorway at Z: -2.6..-0.9
  addWall('bed_south', -9, -0.5, -1.6, -0.5);
  addWall('bed_east_top', -1.6, -8, -1.6, -2.6);
  addWall('bed_east_bot', -1.6, -0.9, -1.6, -0.5);

  // Interior Study Walls (X: 1.6..9, Z: -8..-0.5) with doorway at X: 1.6, Z: -4.2..-2.5
  addWall('study_south', 1.6, -0.5, 9, -0.5);
  addWall('study_west_top', 1.6, -8, 1.6, -4.2);
  addWall('study_west_bot', 1.6, -2.5, 1.6, -0.5);

  // Interior Living Parlor Partition (X: 1.6..9, Z: -0.5..8) with wide archway at Z: 1.2..4.2
  addWall('parlor_west_top', 1.6, -0.5, 1.6, 1.2);
  addWall('parlor_west_bot', 1.6, 4.2, 1.6, 8);

  // Add subtle exterior fog-lit ground beyond front door for depth when escaping
  const porchFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 10),
    new THREE.MeshStandardMaterial({ color: 0x0f1218, roughness: 0.95 }),
  );
  porchFloor.rotation.x = -Math.PI / 2;
  porchFloor.position.set(0, -0.02, 13);
  group.add(porchFloor);

  // Helper to register furniture collider
  const addBoxCollider = (id: string, cx: number, cz: number, w: number, d: number, blocksCamera = false) => {
    colliders.push({
      id,
      minX: cx - w / 2,
      maxX: cx + w / 2,
      minZ: cz - d / 2,
      maxZ: cz + d / 2,
      blocksCamera,
      active: true,
    });
  };

  // --- FURNITURE: BEDROOM ---
  // Iron Bed
  const bedGroup = new THREE.Group();
  bedGroup.position.set(-7.3, 0, -6.2);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.35, 1.5), darkWoodMat);
  frame.position.y = 0.28;
  frame.castShadow = true;
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.24, 1.38), fabricMat);
  mattress.position.y = 0.56;
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.15, 1.54), darkWoodMat);
  headboard.position.set(-0.98, 0.58, 0);
  const pillow = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.14, 0.66),
    new THREE.MeshStandardMaterial({ color: 0x7c766d, roughness: 0.9 }),
  );
  pillow.position.set(-0.72, 0.72, 0);
  bedGroup.add(frame, mattress, headboard, pillow);
  group.add(bedGroup);
  addBoxCollider('bed', -7.3, -6.2, 2.2, 1.6);

  // Nightstand + Old 2009 Phone
  const stand = new THREE.Group();
  stand.position.set(-6.9, 0, -4.4);
  const standBody = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.68, 0.65), darkWoodMat);
  standBody.position.y = 0.34;
  standBody.castShadow = true;
  const phoneBody = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.03, 0.2), steelMat);
  phoneBody.position.set(0, 0.7, 0);
  const phoneScreenMat = new THREE.MeshStandardMaterial({
    color: 0x162936,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.11), phoneScreenMat);
  phoneScreen.rotation.x = -Math.PI / 2;
  phoneScreen.position.set(0, 0.718, -0.02);
  stand.add(standBody, phoneBody, phoneScreen);
  group.add(stand);
  addBoxCollider('nightstand', -6.9, -4.4, 0.75, 0.75);

  interactables.push({
    id: 'old_phone',
    position: new THREE.Vector3(-6.9, 0.7, -4.4),
    radius: 2.2,
    roomKey: 'room_bedroom',
    labelKey: 'interact_phone',
    active: true,
    mesh: stand,
  });

  // Bedroom Wardrobe (Hiding Spot #1)
  const buildWardrobe = (id: string, x: number, z: number, rotY: number) => {
    const w = new THREE.Group();
    w.position.set(x, 0, z);
    w.rotation.y = rotY;
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.35, 0.85), darkWoodMat);
    cabinet.position.y = 1.175;
    cabinet.castShadow = true;
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.1, 0.04), trimWoodMat);
    seam.position.set(0, 1.15, 0.43);
    const knobL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), brassMat);
    knobL.position.set(-0.1, 1.1, 0.45);
    const knobR = knobL.clone();
    knobR.position.x = 0.1;
    w.add(cabinet, seam, knobL, knobR);
    group.add(w);
    addBoxCollider(id, x, z, rotY === 0 ? 1.35 : 0.9, rotY === 0 ? 0.9 : 1.35, true);
    return w;
  };

  buildWardrobe('wardrobe_bed', -3.4, -7.2, 0);
  interactables.push({
    id: 'hide_closet_1',
    position: new THREE.Vector3(-3.4, 1.1, -6.6),
    radius: 2.0,
    roomKey: 'room_bedroom',
    labelKey: 'interact_hide_closet',
    active: true,
  });

  // --- CORRIDOR ---
  // Wardrobe #2 in West Hallway
  buildWardrobe('wardrobe_hall', -8.25, 4.8, Math.PI / 2);
  interactables.push({
    id: 'hide_closet_2',
    position: new THREE.Vector3(-7.6, 1.1, 4.8),
    radius: 2.0,
    roomKey: 'room_hallway',
    labelKey: 'interact_hide_closet',
    active: true,
  });

  // 3 Portraits on North Hallway Wall (X: -1.1 .. 1.1, Z: -7.8)
  const portraitMeshes: THREE.Mesh[] = [];
  const portraitXPositions = [-0.85, 0, 0.85];
  portraitXPositions.forEach((px, idx) => {
    const pGroup = new THREE.Group();
    pGroup.position.set(px, 1.85, -7.82);
    const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.88, 0.06), darkWoodMat);
    const artMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.54, 0.72),
      new THREE.MeshStandardMaterial({ map: textures.portraits[idx], roughness: 0.6 }),
    );
    artMesh.position.z = 0.035;
    pGroup.add(frameMesh, artMesh);
    group.add(pGroup);
    portraitMeshes.push(artMesh);
  });

  interactables.push({
    id: 'portraits_puzzle',
    position: new THREE.Vector3(0, 1.7, -7.3),
    radius: 2.4,
    roomKey: 'room_hallway',
    labelKey: 'interact_portraits',
    active: true,
  });

  // --- PARLOR (LIVING ROOM) ---
  // Dining/Coffee Table + Spare Battery #1 + Secret 2009 Letter
  const parlorTable = new THREE.Group();
  parlorTable.position.set(5.3, 0, 3.0);
  const tTop = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 1.15), darkWoodMat);
  tTop.position.y = 0.76;
  tTop.castShadow = true;
  [
    [-0.85, -0.45],
    [0.85, -0.45],
    [-0.85, 0.45],
    [0.85, 0.45],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.74, 0.1), trimWoodMat);
    leg.position.set(lx, 0.37, lz);
    parlorTable.add(leg);
  });

  // Secret Letter on table
  const letterMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.012, 0.34),
    new THREE.MeshStandardMaterial({ color: 0xd8cbb2, roughness: 0.9 }),
  );
  letterMesh.position.set(-0.35, 0.82, 0.1);
  letterMesh.rotation.y = 0.25;
  parlorTable.add(tTop, letterMesh);

  // Spare Battery #1
  const bat1Group = new THREE.Group();
  bat1Group.position.set(0.45, 0.84, -0.15);
  const batBody1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.13, 10),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.5 }),
  );
  batBody1.rotation.z = Math.PI / 2;
  bat1Group.add(batBody1);
  parlorTable.add(bat1Group);
  group.add(parlorTable);
  addBoxCollider('parlor_table', 5.3, 3.0, 2.1, 1.25);

  interactables.push({
    id: 'secret_letter',
    position: new THREE.Vector3(4.95, 0.85, 3.1),
    radius: 2.1,
    roomKey: 'room_parlor',
    labelKey: 'interact_secret_letter',
    active: true,
    mesh: letterMesh,
  });

  interactables.push({
    id: 'battery_1',
    position: new THREE.Vector3(5.75, 0.85, 2.85),
    radius: 2.0,
    roomKey: 'room_parlor',
    labelKey: 'interact_battery_1',
    active: true,
    mesh: bat1Group,
  });

  // Bookshelf in Parlor with Hidden Brass Study Key
  const shelf = new THREE.Group();
  shelf.position.set(8.35, 0, 5.6);
  const shelfBody = new THREE.Mesh(new THREE.BoxGeometry(0.65, 2.2, 2.0), darkWoodMat);
  shelfBody.position.y = 1.1;
  shelfBody.castShadow = true;
  shelf.add(shelfBody);

  // Key mesh glinting on middle ledge
  const studyKeyGroup = new THREE.Group();
  studyKeyGroup.position.set(-0.25, 0.96, 0.2);
  const kRing = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 12), brassMat);
  const kShaft = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.018, 0.018), brassMat);
  kShaft.position.x = 0.09;
  studyKeyGroup.add(kRing, kShaft);
  shelf.add(studyKeyGroup);
  group.add(shelf);
  addBoxCollider('parlor_shelf', 8.35, 5.6, 0.75, 2.1);

  interactables.push({
    id: 'study_key',
    position: new THREE.Vector3(7.7, 1.0, 5.8),
    radius: 2.2,
    roomKey: 'room_parlor',
    labelKey: 'interact_study_key',
    active: true,
    mesh: studyKeyGroup,
  });

  // --- LOCKED STUDY DOOR ---
  const studyDoorPivot = new THREE.Group();
  studyDoorPivot.position.set(1.6, 0, -4.2);
  const studyDoorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.65, 1.7), darkWoodMat);
  studyDoorLeaf.position.set(0, 1.325, 0.85);
  studyDoorLeaf.castShadow = true;
  const sHandle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), brassMat);
  sHandle.position.set(-0.08, 1.15, 1.48);
  const sHandleBack = sHandle.clone();
  sHandleBack.position.x = 0.08;
  studyDoorPivot.add(studyDoorLeaf, sHandle, sHandleBack);
  group.add(studyDoorPivot);

  const studyDoorCollider: AABBCollider = {
    id: 'study_door_collider',
    minX: 1.45,
    maxX: 1.75,
    minZ: -4.2,
    maxZ: -2.5,
    blocksCamera: true,
    active: true,
  };
  colliders.push(studyDoorCollider);

  interactables.push({
    id: 'study_door',
    position: new THREE.Vector3(1.6, 1.2, -3.35),
    radius: 2.2,
    roomKey: 'room_hallway',
    labelKey: 'interact_study_door_locked',
    active: true,
    mesh: studyDoorPivot,
  });

  // --- STUDY ROOM ---
  // Electrical Breaker Box on North Study Wall
  const breakerGroup = new THREE.Group();
  breakerGroup.position.set(4.8, 1.45, -7.78);
  const bBox = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.18), steelMat);
  const breakerLedMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xdc2626,
    emissiveIntensity: 2.0,
    roughness: 0.2,
  });
  const bLed = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), breakerLedMat);
  bLed.position.set(0.2, 0.3, 0.1);
  breakerGroup.add(bBox, bLed);
  group.add(breakerGroup);

  interactables.push({
    id: 'breaker_box',
    position: new THREE.Vector3(4.8, 1.4, -7.2),
    radius: 2.2,
    roomKey: 'room_study',
    labelKey: 'interact_breaker',
    active: true,
    mesh: breakerGroup,
  });

  // Study Desk + Front Exit Master Key + Spare Battery #2
  const desk = new THREE.Group();
  desk.position.set(6.5, 0, -3.5);
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 1.0), darkWoodMat);
  deskTop.position.y = 0.78;
  deskTop.castShadow = true;
  const deskPedestal = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.74, 0.9), trimWoodMat);
  deskPedestal.position.set(0.6, 0.37, 0);
  const deskLeg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.74, 0.88), trimWoodMat);
  deskLeg.position.set(-0.8, 0.37, 0);

  // Front Exit Key
  const exitKeyGroup = new THREE.Group();
  exitKeyGroup.position.set(-0.2, 0.85, 0.15);
  const ekRing = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.015, 8, 12), steelMat);
  ekRing.rotation.x = Math.PI / 2;
  const ekShaft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.025), brassMat);
  ekShaft.position.x = 0.11;
  exitKeyGroup.add(ekRing, ekShaft);

  // Spare Battery #2
  const bat2Group = new THREE.Group();
  bat2Group.position.set(0.35, 0.86, -0.2);
  const batBody2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.13, 10),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.5 }),
  );
  batBody2.rotation.z = Math.PI / 2;
  bat2Group.add(batBody2);

  desk.add(deskTop, deskPedestal, deskLeg, exitKeyGroup, bat2Group);
  group.add(desk);
  addBoxCollider('study_desk', 6.5, -3.5, 2.0, 1.1);

  interactables.push({
    id: 'front_door_key',
    position: new THREE.Vector3(6.3, 0.9, -3.35),
    radius: 2.2,
    roomKey: 'room_study',
    labelKey: 'interact_front_key',
    active: true,
    mesh: exitKeyGroup,
  });

  interactables.push({
    id: 'battery_2',
    position: new THREE.Vector3(6.85, 0.9, -3.7),
    radius: 2.0,
    roomKey: 'room_study',
    labelKey: 'interact_battery_2',
    active: true,
    mesh: bat2Group,
  });

  // --- FRONT EXIT DOOR (South Wall X: -1.1 .. 1.1, Z: 8) ---
  const frontDoorPivot = new THREE.Group();
  frontDoorPivot.position.set(-1.1, 0, 8.0);
  const fLeaf = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.85, 0.16), trimWoodMat);
  fLeaf.position.set(1.1, 1.425, 0);
  fLeaf.castShadow = true;
  const fBar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 0.22), steelMat);
  fBar.position.set(1.1, 1.25, 0);
  const fKnob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), brassMat);
  fKnob.position.set(1.9, 1.1, -0.11);
  frontDoorPivot.add(fLeaf, fBar, fKnob);
  group.add(frontDoorPivot);

  addBoxCollider('front_door_collider', 0, 8.0, 2.2, 0.3, true);

  interactables.push({
    id: 'front_door',
    position: new THREE.Vector3(0, 1.2, 7.5),
    radius: 2.5,
    roomKey: 'room_hallway',
    labelKey: 'interact_front_door_locked',
    active: true,
    mesh: frontDoorPivot,
  });

  // --- ROOM LIGHTS ---
  const bedroomLight = new THREE.PointLight(0x8ba8cc, 0.75, 9, 2);
  bedroomLight.position.set(-5.2, 3.1, -4.2);

  const hallLight = new THREE.PointLight(0xffcf87, 0.35, 11, 2);
  hallLight.position.set(0, 3.2, -1.5);

  const parlorLight = new THREE.PointLight(0xffb870, 0.28, 10, 2);
  parlorLight.position.set(5.3, 3.2, 3.0);

  const studyLight = new THREE.PointLight(0x7aa2d4, 0.2, 9, 2);
  studyLight.position.set(5.2, 3.2, -4.2);

  group.add(bedroomLight, hallLight, parlorLight, studyLight);

  return {
    group,
    colliders,
    interactables,
    studyDoorPivot,
    studyDoorCollider,
    frontDoorPivot,
    hallLight,
    parlorLight,
    studyLight,
    bedroomLight,
    portraitMeshes,
    phoneScreenMat,
    breakerLedMat,
    hidingSpots: [
      {
        id: 'hide_closet_1',
        insidePos: new THREE.Vector3(-3.4, 0, -6.95),
        exitPos: new THREE.Vector3(-3.4, 0, -6.0),
        yaw: 0,
      },
      {
        id: 'hide_closet_2',
        insidePos: new THREE.Vector3(-8.0, 0, 4.8),
        exitPos: new THREE.Vector3(-7.1, 0, 4.8),
        yaw: Math.PI / 2,
      },
    ],
  };
}
