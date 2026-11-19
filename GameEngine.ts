import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AudioManager } from '../audio/AudioManager';
import {
  GamePhase,
  GameSettings,
  HUDStateSnapshot,
  InteractablePrompt,
  InventoryItemId,
  MaryAIState,
  SaveData,
} from '../types/game';
import {
  AABBCollider,
  HouseBuildResult,
  buildAbandonedHouse,
  getRoomKeyAt,
} from './houseLayout';
import {
  MaryRig,
  OUTFIT_COLORS,
  PlayerRig,
  createMaryModel,
  createPlayerModel,
} from './models';
import { ProceduralTextureSet, createProceduralTextures } from './textures';

export interface EngineCallbacks {
  onHudUpdate: (hud: HUDStateSnapshot) => void;
  onInteract: (interactableId: string) => void;
  onSaveChanged: (save: SaveData) => void;
  onCaught: () => void;
  onEscaped: () => void;
  onIntroFinished: () => void;
  onAlert: (msgKey: string) => void;
}

// Pre-allocated math helpers (zero GC in tick)
const _camTarget = new THREE.Vector3();
const _camIdeal = new THREE.Vector3();
const _camDir = new THREE.Vector3();
const _moveVec = new THREE.Vector3();
const _spotTarget = new THREE.Vector3();

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private audio: AudioManager;

  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private textures: ProceduralTextureSet;
  private house: HouseBuildResult;
  private playerRig: PlayerRig;
  private maryRig: MaryRig;
  private flashlight: THREE.SpotLight;
  private flashlightTarget: THREE.Object3D;
  private maryLight: THREE.PointLight;

  private phase: GamePhase = 'menu';
  private settings: GameSettings;
  private saveData: SaveData;

  // Input state
  private keys: Record<string, boolean> = {};
  private joystickVec = { x: 0, y: 0 };
  private touchSprinting = false;

  // Player kinematics
  private playerPos = new THREE.Vector3(-5.5, 0, -4.5);
  private playerVelY = 0;
  private onGround = true;
  private playerYaw = 0;
  private isCrouching = false;
  private isHidden = false;
  private currentHidingSpotId: string | null = null;
  private hiddenTime = 0;
  private walkCycle = 0;
  private studyDoorOpenAmount = 0;
  private frontDoorOpenAmount = 0;

  // Camera
  private camYaw = 0.2;
  private camPitch = 0.22;
  private currentCamDist = 3.0;
  private cameraShake = 0;

  // Mary AI
  private maryPos = new THREE.Vector3(0, 0, 2.5);
  private maryState: MaryAIState = 'dormant';
  private maryTimer = 4.0;
  private maryTarget = new THREE.Vector3(0, 0, 2.5);
  private maryVisible = false;
  private lightDisruptTimer = 0;

  // Intro & loop
  private introTime = 0;
  private elapsedTime = 0;
  private lastFrameMs = performance.now();
  private lastHudPushMs = 0;
  private frameId = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver;
  private alertKey: string | null = null;
  private alertExpireAt = 0;
  private lastRoomKey = 'room_bedroom';

  private waypoints = [
    new THREE.Vector3(0, 0, -5.8),
    new THREE.Vector3(0, 0, -1.5),
    new THREE.Vector3(0, 0, 4.5),
    new THREE.Vector3(4.2, 0, 2.5),
    new THREE.Vector3(-4.2, 0, 3.8),
  ];
  private waypointIdx = 0;

  constructor(
    container: HTMLElement,
    initialSave: SaveData,
    initialSettings: GameSettings,
    audio: AudioManager,
    callbacks: EngineCallbacks,
  ) {
    this.container = container;
    this.saveData = initialSave;
    this.settings = initialSettings;
    this.audio = audio;
    this.callbacks = callbacks;

    this.isSoftwareGl = detectSoftwareGl();
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const w = Math.max(container.clientWidth, 320);
    const h = Math.max(container.clientHeight, 240);
    this.renderer.setSize(w, h);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    // Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07080b);
    this.scene.fog = new THREE.FogExp2(0x07080b, 0.055);

    this.camera = new THREE.PerspectiveCamera(62, w / h, 0.1, 60);

    // Studio Environment Reflection (mandatory per Three.js skill)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Warm/cool ambient lighting rig
    const hemi = new THREE.HemisphereLight(0x526b8c, 0x1a1412, 0.45);
    this.scene.add(hemi);

    const moonKey = new THREE.DirectionalLight(0x88a8d4, 0.55);
    moonKey.position.set(-8, 12, -6);
    if (!this.isSoftwareGl) {
      moonKey.castShadow = true;
      moonKey.shadow.mapSize.set(1024, 1024);
      moonKey.shadow.camera.left = -12;
      moonKey.shadow.camera.right = 12;
      moonKey.shadow.camera.top = 12;
      moonKey.shadow.camera.bottom = -12;
      moonKey.shadow.bias = -0.0005;
      moonKey.shadow.normalBias = 0.02;
    }
    this.scene.add(moonKey);

    // Procedural Textures & House
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);
    this.house = buildAbandonedHouse(this.textures);
    this.scene.add(this.house.group);

    // Player & Flashlight
    this.playerRig = createPlayerModel(this.textures.contactShadow, initialSave.outfitColorIndex);
    this.scene.add(this.playerRig.root);

    this.flashlight = new THREE.SpotLight(0xfff1d6, 3.8, 16, Math.PI / 5.2, 0.45, 1.5);
    this.flashlight.castShadow = !this.isSoftwareGl;
    this.flashlight.shadow.mapSize.set(512, 512);
    this.flashlightTarget = new THREE.Object3D();
    this.scene.add(this.flashlight, this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;

    // Mary
    this.maryRig = createMaryModel(this.textures.contactShadow);
    this.maryLight = new THREE.PointLight(0xb91c1c, 1.1, 4.5, 2);
    this.maryLight.position.set(0, 1.5, 0.25);
    this.maryRig.root.add(this.maryLight);
    this.maryRig.root.visible = false;
    this.scene.add(this.maryRig.root);

    this.applySaveState(initialSave);
    this.applySettings(initialSettings);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Bind events
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    this.lastFrameMs = performance.now();
    this.tick();
  }

  public applySaveState(save: SaveData): void {
    this.saveData = save;
    this.playerPos.set(save.playerPos[0], save.playerPos[1], save.playerPos[2]);
    this.playerYaw = save.playerYaw;
    this.camYaw = save.playerYaw;
    this.isHidden = false;
    this.isCrouching = false;
    this.currentHidingSpotId = null;

    this.playerRig.jacketMat.color.setHex(
      OUTFIT_COLORS[save.outfitColorIndex % OUTFIT_COLORS.length],
    );

    // Sync interactables & doors from save
    this.studyDoorOpenAmount = save.solvedPuzzles.studyDoor ? 1 : 0;
    this.house.studyDoorCollider.active = !save.solvedPuzzles.studyDoor;
    this.house.studyDoorPivot.rotation.y = this.studyDoorOpenAmount * (Math.PI * 0.55);

    this.frontDoorOpenAmount = save.solvedPuzzles.frontDoor ? 1 : 0;
    this.house.frontDoorPivot.rotation.y = -this.frontDoorOpenAmount * (Math.PI * 0.5);

    // Hide already collected items
    this.house.interactables.forEach((item) => {
      if (
        item.id === 'study_key' ||
        item.id === 'battery_1' ||
        item.id === 'battery_2' ||
        item.id === 'front_door_key' ||
        item.id === 'secret_letter'
      ) {
        const collected =
          save.inventory.includes(item.id as InventoryItemId) ||
          save.usedItems.includes(item.id as InventoryItemId);
        item.active = !collected;
        if (item.mesh) item.mesh.visible = !collected;
      }
    });

    this.syncPortraitOrder(save.portraitOrder);
    this.syncPowerVisuals();

    // Reset Mary away from player on load
    this.maryPos.set(0, 0, 5.2);
    this.maryState = save.solvedPuzzles.phoneChecked ? 'stalking' : 'dormant';
    this.maryTimer = 5.0;
    this.maryVisible = false;
    this.maryRig.root.visible = false;
  }

  public syncPortraitOrder(order: number[]): void {
    this.house.portraitMeshes.forEach((mesh, slotIdx) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const texIdx = order[slotIdx] ?? slotIdx;
      mat.map = this.textures.portraits[texIdx];
      mat.needsUpdate = true;
    });
  }

  public syncPowerVisuals(): void {
    const powerOn = this.saveData.solvedPuzzles.breaker;
    this.house.breakerLedMat.color.setHex(powerOn ? 0x22c55e : 0xdc2626);
    this.house.breakerLedMat.emissive.setHex(powerOn ? 0x22c55e : 0xdc2626);

    const disrupted = this.lightDisruptTimer > 0;
    if (disrupted) {
      this.house.hallLight.intensity = 0.05;
      this.house.parlorLight.intensity = 0.05;
      this.house.studyLight.intensity = 0.05;
    } else if (powerOn) {
      this.house.hallLight.intensity = 1.65;
      this.house.parlorLight.intensity = 1.35;
      this.house.studyLight.intensity = 1.55;
    } else {
      this.house.hallLight.intensity = 0.35;
      this.house.parlorLight.intensity = 0.28;
      this.house.studyLight.intensity = 0.2;
    }
  }

  public applySettings(settings: GameSettings): void {
    this.settings = settings;
    this.audio.setVolume(settings.volume, settings.muted);

    if (settings.quality === 'low') {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
    } else if (settings.quality === 'medium') {
      this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.35));
      this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    } else {
      this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    }
  }

  public setPhase(phase: GamePhase): void {
    this.phase = phase;
    if (phase === 'intro') {
      this.introTime = 0;
      this.audio.init();
      this.audio.playPhoneRing();
    } else if (phase === 'playing') {
      this.audio.init();
    }
  }

  public setJoystick(x: number, y: number): void {
    this.joystickVec.x = x;
    this.joystickVec.y = y;
  }

  public setTouchSprint(active: boolean): void {
    this.touchSprinting = active;
  }

  public rotateCameraBy(dx: number, dy: number): void {
    if (this.phase !== 'playing') return;
    const sens = 0.0045 * this.settings.sensitivity;
    this.camYaw -= dx * sens;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * sens, -0.38, 0.72);
  }

  public triggerJump(): void {
    if (this.phase !== 'playing' || this.isHidden) return;
    if (this.onGround) {
      this.playerVelY = 5.4;
      this.onGround = false;
    }
  }

  public toggleCrouchOrHide(): void {
    if (this.phase !== 'playing') return;
    if (this.isHidden) {
      this.exitHidingSpot();
      return;
    }
    this.isCrouching = !this.isCrouching;
  }

  public toggleFlashlight(): void {
    if (this.phase !== 'playing') return;
    if (this.saveData.battery <= 0 && !this.saveData.flashlightOn) return;
    this.saveData.flashlightOn = !this.saveData.flashlightOn;
    this.audio.playFlashlightClick();
    this.callbacks.onSaveChanged({ ...this.saveData });
  }

  public triggerInteract(): void {
    if (this.phase !== 'playing') return;
    this.audio.init();

    if (this.isHidden) {
      this.exitHidingSpot();
      return;
    }

    const nearby = this.findNearbyInteractable();
    if (!nearby) return;

    if (nearby.id.startsWith('hide_closet_')) {
      this.enterHidingSpot(nearby.id);
      return;
    }

    this.callbacks.onInteract(nearby.id);
  }

  public triggerApparitionSting(aggressive = false): void {
    this.cameraShake = aggressive ? 0.28 : 0.14;
    this.audio.playMaryWhisper(aggressive);
  }

  public pushAlert(key: string, durationSec = 4.0): void {
    this.alertKey = key;
    this.alertExpireAt = this.elapsedTime + durationSec;
    this.callbacks.onAlert(key);
  }

  private enterHidingSpot(spotId: string): void {
    const spot = this.house.hidingSpots.find((s) => s.id === spotId);
    if (!spot) return;
    this.isHidden = true;
    this.isCrouching = true;
    this.currentHidingSpotId = spotId;
    this.hiddenTime = 0;
    this.playerPos.copy(spot.insidePos);
    this.playerYaw = spot.yaw;
    this.saveData.flashlightOn = false;
    this.saveData.maryMetrics.hideCount += 1;
    if (this.saveData.maryMetrics.hideCount >= 3 && !this.saveData.maryMetrics.marySearchesHiding) {
      this.saveData.maryMetrics.marySearchesHiding = true;
      this.pushAlert('marySearchingClosets', 4.5);
    }
    this.audio.playDoorCreak(false);
    this.callbacks.onSaveChanged({ ...this.saveData });
  }

  private exitHidingSpot(): void {
    const spot = this.house.hidingSpots.find((s) => s.id === this.currentHidingSpotId);
    if (spot) {
      this.playerPos.copy(spot.exitPos);
    }
    this.isHidden = false;
    this.isCrouching = false;
    this.currentHidingSpotId = null;
    this.audio.playDoorCreak(false);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys[e.code] = true;
    if (this.phase === 'intro' && (e.code === 'Space' || e.code === 'Enter')) {
      this.callbacks.onIntroFinished();
      return;
    }
    if (this.phase !== 'playing') return;

    if (e.code === 'Space') this.triggerJump();
    else if (e.code === 'KeyF') this.toggleFlashlight();
    else if (e.code === 'KeyC') this.toggleCrouchOrHide();
    else if (e.code === 'KeyE') this.triggerInteract();
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.code] = false;
  };

  private onWindowBlur = (): void => {
    this.keys = {};
    this.joystickVec.x = 0;
    this.joystickVec.y = 0;
    this.touchSprinting = false;
  };

  private handleResize(): void {
    const w = Math.max(this.container.clientWidth, 320);
    const h = Math.max(this.container.clientHeight, 240);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private tick = (): void => {
    if (this.disposed) return;

    const nowMs = performance.now();
    const dt = Math.min((nowMs - this.lastFrameMs) / 1000, 0.05);
    this.lastFrameMs = nowMs;
    this.elapsedTime += dt;

    if (this.phase === 'menu') {
      this.updateMenuCamera(dt);
    } else if (this.phase === 'intro') {
      this.updateIntroCamera(dt);
    } else if (this.phase === 'playing') {
      this.updateGameplay(dt);
    }

    this.updateDoorsAndLights(dt);
    this.renderer.render(this.scene, this.camera);

    if (nowMs - this.lastHudPushMs > 90) {
      this.lastHudPushMs = nowMs;
      this.emitHudSnapshot();
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || !gl.fenceSync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateMenuCamera(dt: number): void {
    const t = this.elapsedTime * 0.22;
    this.camera.position.set(Math.sin(t) * 1.1, 1.75, -5.2 + Math.cos(t * 0.7) * 1.6);
    this.camera.lookAt(0, 1.3, 4.5);

    // Subtle glimpse of Mary at end of dark corridor on title screen
    const showGlimpse = Math.sin(this.elapsedTime * 0.6) > 0.35;
    this.maryRig.root.visible = showGlimpse;
    this.maryRig.root.position.set(0, 0, 5.8);
    this.maryRig.root.rotation.y = Math.PI;
    this.maryRig.headGroup.rotation.z = Math.sin(this.elapsedTime * 2.1) * 0.14;

    this.playerRig.root.visible = false;
    this.flashlight.intensity = 0;
    void dt;
  }

  private updateIntroCamera(dt: number): void {
    this.introTime += dt;
    const progress = Math.min(1, this.introTime / 5.2);
    const ease = 1 - Math.pow(1 - progress, 3);

    this.playerRig.root.visible = true;
    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.root.rotation.y = this.playerYaw;
    this.maryRig.root.visible = false;

    // Sweep from bedroom ceiling window down to waking player & glowing phone
    const startPos = _camIdeal.set(-2.5, 2.9, -7.2);
    const endPos = _camTarget.set(-4.3, 1.85, -2.5);
    this.camera.position.lerpVectors(startPos, endPos, ease);
    this.camera.lookAt(-6.3, 0.85, -4.4);

    // Phone screen pulse
    this.house.phoneScreenMat.emissiveIntensity = 1.1 + Math.sin(this.elapsedTime * 7) * 0.8;

    if (progress >= 1) {
      this.callbacks.onIntroFinished();
    }
  }

  private updateGameplay(dt: number): void {
    this.playerRig.root.visible = !this.isHidden;

    // 1. Movement input (WASD + Touch Joystick)
    let inX = (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0) -
              (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0);
    let inZ = (this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0) -
              (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0);

    if (Math.abs(this.joystickVec.x) > 0.08 || Math.abs(this.joystickVec.y) > 0.08) {
      inX = this.joystickVec.x;
      inZ = this.joystickVec.y;
    }

    const sprinting =
      !this.isCrouching &&
      !this.isHidden &&
      (this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.touchSprinting);

    const inputMag = Math.min(1, Math.hypot(inX, inZ));

    if (!this.isHidden && inputMag > 0.05) {
      // Camera-relative movement direction
      const forwardX = -Math.sin(this.camYaw);
      const forwardZ = -Math.cos(this.camYaw);
      const rightX = Math.cos(this.camYaw);
      const rightZ = -Math.sin(this.camYaw);

      _moveVec.set(
        forwardX * inZ + rightX * inX,
        0,
        forwardZ * inZ + rightZ * inX,
      ).normalize();

      const speed = this.isCrouching ? 1.85 : sprinting ? 5.15 : 3.15;
      const nextX = this.playerPos.x + _moveVec.x * speed * dt;
      const nextZ = this.playerPos.z + _moveVec.z * speed * dt;

      this.resolvePlayerCollision(nextX, nextZ);

      // Smoothly face movement direction
      const targetYaw = Math.atan2(_moveVec.x, _moveVec.z);
      let diff = targetYaw - this.playerYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.playerYaw += diff * Math.min(1, 12 * dt);

      this.walkCycle += dt * (sprinting ? 13 : this.isCrouching ? 6 : 9);
      this.audio.playFootstep(sprinting, this.isCrouching, this.elapsedTime);
    } else {
      this.walkCycle = 0;
    }

    if (this.isHidden) {
      this.hiddenTime += dt;
    }

    // Vertical jump & gravity
    if (!this.onGround) {
      this.playerVelY -= 15.5 * dt;
      this.playerPos.y += this.playerVelY * dt;
      if (this.playerPos.y <= 0) {
        this.playerPos.y = 0;
        this.playerVelY = 0;
        this.onGround = true;
      }
    }

    // Apply player transform & procedural limb animation
    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.root.rotation.y = this.playerYaw;

    const crouchTarget = this.isCrouching ? -0.35 : 0;
    this.playerRig.bodyGroup.position.y = THREE.MathUtils.damp(
      this.playerRig.bodyGroup.position.y,
      crouchTarget,
      10,
      dt,
    );
    const swing = inputMag > 0.05 ? Math.sin(this.walkCycle) * (sprinting ? 0.65 : 0.42) : 0;
    this.playerRig.leftLegPivot.rotation.x = swing;
    this.playerRig.rightLegPivot.rotation.x = -swing;
    this.playerRig.leftArmPivot.rotation.x = -swing * 0.7;
    this.playerRig.rightArmPivot.rotation.x = this.saveData.flashlightOn ? -1.15 : swing * 0.7;

    // 2. Flashlight & Battery + Adaptive Light Disruption
    if (this.lightDisruptTimer > 0) {
      this.lightDisruptTimer = Math.max(0, this.lightDisruptTimer - dt);
      if (this.lightDisruptTimer === 0) {
        this.syncPowerVisuals();
      }
    }

    if (this.saveData.flashlightOn && this.saveData.battery > 0 && !this.isHidden) {
      this.saveData.battery = Math.max(0, this.saveData.battery - dt * 1.15);
      this.saveData.maryMetrics.flashlightOnSeconds += dt;

      if (
        this.saveData.maryMetrics.flashlightOnSeconds >= 28 &&
        !this.saveData.maryMetrics.maryDisruptsLights
      ) {
        this.saveData.maryMetrics.maryDisruptsLights = true;
        this.lightDisruptTimer = 9.0;
        this.syncPowerVisuals();
        this.triggerApparitionSting(true);
        this.pushAlert('maryDrainingLights', 5.0);
      }

      const flicker =
        this.lightDisruptTimer > 0
          ? Math.random() > 0.6 ? 0.4 : 2.6
          : this.saveData.battery < 18 && Math.sin(this.elapsedTime * 29) > 0.45
          ? 0.5
          : 3.9;
      this.flashlight.intensity = flicker;
      if (this.saveData.battery <= 0) {
        this.saveData.flashlightOn = false;
      }
    } else {
      this.flashlight.intensity = 0;
    }

    // Position spotlight at chest/hand aiming forward along camera yaw
    this.flashlight.position.set(
      this.playerPos.x + Math.sin(this.playerYaw) * 0.28,
      this.playerPos.y + (this.isCrouching ? 0.85 : 1.28),
      this.playerPos.z + Math.cos(this.playerYaw) * 0.28,
    );
    _spotTarget.set(
      this.flashlight.position.x - Math.sin(this.camYaw) * 6,
      this.flashlight.position.y - Math.sin(this.camPitch) * 3.5,
      this.flashlight.position.z - Math.cos(this.camYaw) * 6,
    );
    this.flashlightTarget.position.copy(_spotTarget);

    // 3. Third-person camera with wall collision pullback
    this.updateThirdPersonCamera(dt, sprinting);

    // 4. Room audio tone
    const roomKey = getRoomKeyAt(this.playerPos.x, this.playerPos.z);
    if (roomKey !== this.lastRoomKey) {
      this.lastRoomKey = roomKey;
      this.audio.setRoomTone(roomKey);
    }

    // 5. Adaptive Mary AI
    this.updateMaryAI(dt, sprinting);
  }

  private resolvePlayerCollision(targetX: number, targetZ: number): void {
    const r = 0.34;
    let x = targetX;
    let z = this.playerPos.z;

    for (const c of this.house.colliders) {
      if (c.active === false) continue;
      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) {
        if (this.playerPos.x <= c.minX) x = c.minX - r;
        else if (this.playerPos.x >= c.maxX) x = c.maxX + r;
      }
    }

    z = targetZ;
    for (const c of this.house.colliders) {
      if (c.active === false) continue;
      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) {
        if (this.playerPos.z <= c.minZ) z = c.minZ - r;
        else if (this.playerPos.z >= c.maxZ) z = c.maxZ + r;
      }
    }

    this.playerPos.x = THREE.MathUtils.clamp(x, -8.65, 8.65);
    this.playerPos.z = THREE.MathUtils.clamp(z, -7.65, 7.65);
  }

  private updateThirdPersonCamera(dt: number, sprinting: boolean): void {
    const targetFov = sprinting ? 68 : this.isHidden ? 54 : 62;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7, dt);
      this.camera.updateProjectionMatrix();
    }

    const headHeight = this.isHidden ? 1.15 : this.isCrouching ? 1.05 : 1.48;
    _camTarget.set(this.playerPos.x, this.playerPos.y + headHeight, this.playerPos.z);

    const idealDist = this.isHidden ? 0.55 : 2.95;
    const horiz = Math.cos(this.camPitch) * idealDist;
    const vert = Math.sin(this.camPitch) * idealDist;

    _camDir.set(Math.sin(this.camYaw) * horiz, vert, Math.cos(this.camYaw) * horiz);

    // Ray-step against wall colliders so camera never enters walls
    let safeFrac = 1.0;
    const steps = 12;
    for (let i = 1; i <= steps; i++) {
      const f = i / steps;
      const sx = _camTarget.x + _camDir.x * f;
      const sy = _camTarget.y + _camDir.y * f;
      const sz = _camTarget.z + _camDir.z * f;

      if (sy > 3.38 || sy < 0.25) {
        safeFrac = Math.max(0.2, (i - 1) / steps);
        break;
      }
      if (this.pointHitsWall(sx, sz)) {
        safeFrac = Math.max(0.22, (i - 1) / steps);
        break;
      }
    }

    const targetDist = idealDist * safeFrac;
    this.currentCamDist = THREE.MathUtils.damp(this.currentCamDist, targetDist, 14, dt);
    const scale = this.currentCamDist / idealDist;

    _camIdeal.set(
      _camTarget.x + _camDir.x * scale,
      THREE.MathUtils.clamp(_camTarget.y + _camDir.y * scale, 0.35, 3.35),
      _camTarget.z + _camDir.z * scale,
    );

    if (this.cameraShake > 0.002) {
      _camIdeal.x += (Math.random() - 0.5) * this.cameraShake;
      _camIdeal.y += (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake = THREE.MathUtils.damp(this.cameraShake, 0, 8, dt);
    }

    this.camera.position.lerp(_camIdeal, Math.min(1, 18 * dt));
    this.camera.lookAt(_camTarget);
  }

  private pointHitsWall(x: number, z: number): boolean {
    const pad = 0.2;
    for (const c of this.house.colliders) {
      if (c.active === false || !c.blocksCamera) continue;
      if (x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad) {
        return true;
      }
    }
    return false;
  }

  private updateMaryAI(dt: number, playerSprinting: boolean): void {
    // Mary remains dormant until the player checks the 2009 phone or walks out of bedroom
    if (!this.saveData.solvedPuzzles.phoneChecked && getRoomKeyAt(this.playerPos.x, this.playerPos.z) === 'room_bedroom') {
      this.maryState = 'dormant';
      this.maryRig.root.visible = false;
      this.audio.updateHorrorIntensity(99, false, this.elapsedTime);
      return;
    }

    const clues = this.saveData.maryMetrics.cluesFoundCount;
    const dist = this.maryPos.distanceTo(this.playerPos);
    const playerNoise = playerSprinting ? 10.5 : this.saveData.flashlightOn ? 7.2 : this.isCrouching ? 2.8 : 5.0;

    this.maryTimer -= dt;

    if (this.maryState === 'dormant') {
      this.maryState = 'stalking';
      this.maryTimer = 6.0;
      this.maryVisible = true;
    } else if (this.maryState === 'vanished') {
      this.maryVisible = false;
      if (this.maryTimer <= 0) {
        // Reappear at a tactical spot away from immediate player camera or closer if aggressive
        const minDist = this.saveData.maryMetrics.maryAggressiveSpawn ? 5.0 : 7.5;
        const wp = this.waypoints[Math.floor(Math.random() * this.waypoints.length)];
        if (wp.distanceTo(this.playerPos) >= minDist) {
          this.maryPos.copy(wp);
        } else {
          this.maryPos.set(0, 0, 5.5);
        }
        this.maryState = 'appearing';
        this.maryTimer = 3.2;
        this.maryVisible = true;
        this.triggerApparitionSting(this.saveData.maryMetrics.maryAggressiveSpawn);
      }
    } else if (this.maryState === 'appearing') {
      // Stands eerily staring at player, head tilted
      if (dist < 4.0 && !this.isHidden) {
        this.maryState = 'hunting';
        this.maryTimer = 7.5;
      } else if (this.maryTimer <= 0) {
        this.maryState = 'stalking';
        this.maryTimer = 8.0;
      }
    } else if (this.maryState === 'stalking') {
      // Patrol waypoints
      const wp = this.waypoints[this.waypointIdx];
      this.moveMaryToward(wp, 1.85 + clues * 0.12, dt);
      if (this.maryPos.distanceTo(wp) < 0.6) {
        this.waypointIdx = (this.waypointIdx + 1) % this.waypoints.length;
      }

      // Adaptive hiding check
      if (this.isHidden && this.saveData.maryMetrics.marySearchesHiding && this.hiddenTime > 3.2) {
        this.maryState = 'searching_hiding';
        this.maryTarget.copy(this.playerPos);
        this.maryTimer = 8.0;
        this.pushAlert('marySearchingClosets', 3.5);
      } else if (!this.isHidden && dist < playerNoise) {
        this.maryState = 'hunting';
        this.maryTimer = 8.5 + clues * 1.2;
        this.triggerApparitionSting(true);
      } else if (this.maryTimer <= 0 && Math.random() < 0.45) {
        this.maryState = 'vanished';
        this.maryTimer = 4.5;
      }
    } else if (this.maryState === 'searching_hiding') {
      this.moveMaryToward(this.maryTarget, 2.75, dt);
      if (this.maryPos.distanceTo(this.playerPos) < 1.35) {
        this.triggerApparitionSting(true);
        this.callbacks.onCaught();
        return;
      }
      if (!this.isHidden || this.maryTimer <= 0) {
        this.maryState = 'stalking';
        this.maryTimer = 6.0;
      }
    } else if (this.maryState === 'hunting') {
      if (this.isHidden && !this.saveData.maryMetrics.marySearchesHiding) {
        // Player escaped into wardrobe! Mary loses sight and vanishes
        this.maryState = 'vanished';
        this.maryTimer = 5.5;
      } else {
        const huntSpeed = 2.65 + clues * 0.16 + (this.saveData.maryMetrics.maryAggressiveSpawn ? 0.35 : 0);
        this.moveMaryToward(this.playerPos, huntSpeed, dt);
        if (this.maryPos.distanceTo(this.playerPos) < 1.08 && !this.isHidden) {
          this.triggerApparitionSting(true);
          this.callbacks.onCaught();
          return;
        }
        if (this.maryTimer <= 0) {
          this.maryState = 'vanished';
          this.maryTimer = 5.0;
        }
      }
    }

    // Update Mary Mesh
    this.maryRig.root.visible = this.maryVisible;
    if (this.maryVisible) {
      this.maryRig.root.position.set(
        this.maryPos.x,
        Math.sin(this.elapsedTime * 2.8) * 0.06,
        this.maryPos.z,
      );
      const lookYaw = Math.atan2(
        this.playerPos.x - this.maryPos.x,
        this.playerPos.z - this.maryPos.z,
      );
      this.maryRig.root.rotation.y = lookYaw;
      this.maryRig.headGroup.rotation.z =
        (this.maryState === 'hunting' ? 0.25 : 0.12) * Math.sin(this.elapsedTime * 3.1);
      this.maryRig.leftArm.rotation.x = -0.95 + Math.sin(this.elapsedTime * 4) * 0.12;
      this.maryRig.rightArm.rotation.x = -0.95 - Math.sin(this.elapsedTime * 4) * 0.12;
    }

    this.audio.updateHorrorIntensity(
      this.maryVisible ? dist : 14,
      this.maryState === 'hunting' || this.maryState === 'searching_hiding',
      this.elapsedTime,
    );
  }

  private moveMaryToward(target: THREE.Vector3, speed: number, dt: number): void {
    const dx = target.x - this.maryPos.x;
    const dz = target.z - this.maryPos.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.01) return;
    const step = Math.min(len, speed * dt);
    this.maryPos.x += (dx / len) * step;
    this.maryPos.z += (dz / len) * step;
  }

  private updateDoorsAndLights(dt: number): void {
    const targetStudy = this.saveData.solvedPuzzles.studyDoor ? 1 : 0;
    this.studyDoorOpenAmount = THREE.MathUtils.damp(this.studyDoorOpenAmount, targetStudy, 6, dt);
    this.house.studyDoorPivot.rotation.y = this.studyDoorOpenAmount * (Math.PI * 0.55);

    const targetFront = this.saveData.solvedPuzzles.frontDoor ? 1 : 0;
    this.frontDoorOpenAmount = THREE.MathUtils.damp(this.frontDoorOpenAmount, targetFront, 5, dt);
    this.house.frontDoorPivot.rotation.y = -this.frontDoorOpenAmount * (Math.PI * 0.5);

    // Subtle corridor bulb flicker when power is off
    if (!this.saveData.solvedPuzzles.breaker && this.lightDisruptTimer <= 0) {
      this.house.hallLight.intensity = 0.28 + Math.sin(this.elapsedTime * 11) * 0.08;
    }
  }

  private findNearbyInteractable(): InteractablePrompt | null {
    let best: HouseInteractableHit | null = null;
    let bestDist = Infinity;

    for (const item of this.house.interactables) {
      if (!item.active) continue;
      const d = Math.hypot(
        this.playerPos.x - item.position.x,
        this.playerPos.z - item.position.z,
      );
      if (d <= item.radius && d < bestDist) {
        bestDist = d;
        best = item;
      }
    }

    if (!best) return null;

    let labelKey = best.labelKey;
    let locked = false;
    if (best.id === 'study_door') {
      if (this.saveData.solvedPuzzles.studyDoor) {
        return null; // Already open
      }
      if (this.saveData.inventory.includes('study_key')) {
        labelKey = 'interact_study_door_open';
      } else {
        labelKey = 'interact_study_door_locked';
        locked = true;
      }
    } else if (best.id === 'front_door') {
      const hasPower = this.saveData.solvedPuzzles.breaker;
      const hasKey = this.saveData.inventory.includes('front_door_key');
      if (hasPower && hasKey) {
        labelKey = 'interact_front_door_open';
      } else if (!hasPower && !hasKey) {
        labelKey = 'interact_front_door_locked';
        locked = true;
      } else if (!hasPower) {
        labelKey = 'interact_front_door_no_power';
        locked = true;
      } else {
        labelKey = 'interact_front_door_no_key';
        locked = true;
      }
    }

    return {
      id: best.id,
      labelKey,
      locked,
      roomKey: best.roomKey,
    };
  }

  private getCurrentObjectiveKey(): string {
    const p = this.saveData.solvedPuzzles;
    const inv = this.saveData.inventory;
    if (!p.phoneChecked) return 'obj_check_phone';
    if (!inv.includes('study_key') && !p.studyDoor) return 'obj_find_study_key';
    if (!p.studyDoor || !p.portraits) return 'obj_solve_portraits';
    if (!p.breaker) return 'obj_restore_power';
    if (!inv.includes('front_door_key')) return 'obj_find_exit_key';
    return 'obj_escape_door';
  }

  private emitHudSnapshot(): void {
    const nearby = this.isHidden
      ? { id: 'exit_closet', labelKey: 'interact_exit_closet', roomKey: this.lastRoomKey }
      : this.findNearbyInteractable();

    const activeAlert =
      this.alertKey && this.elapsedTime < this.alertExpireAt ? this.alertKey : null;

    this.callbacks.onHudUpdate({
      battery: Math.round(this.saveData.battery),
      flashlightOn: this.saveData.flashlightOn,
      isHidden: this.isHidden,
      isCrouching: this.isCrouching,
      isSprinting:
        !this.isCrouching &&
        !this.isHidden &&
        Boolean(this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.touchSprinting),
      maryDistance: this.maryVisible ? this.maryPos.distanceTo(this.playerPos) : 99,
      maryState: this.maryState,
      nearbyInteractable: nearby,
      currentRoomKey: this.lastRoomKey,
      objectiveKey: this.getCurrentObjectiveKey(),
      alertMessageKey: activeAlert,
    });
  }

  public getCurrentTransformForSave(): { pos: [number, number, number]; yaw: number } {
    return {
      pos: [
        Number(this.playerPos.x.toFixed(2)),
        Number(this.playerPos.y.toFixed(2)),
        Number(this.playerPos.z.toFixed(2)),
      ],
      yaw: Number(this.playerYaw.toFixed(2)),
    };
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    this.resizeObserver.disconnect();
    this.textures.dispose();
    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
        else m.material.dispose();
      }
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

type HouseInteractableHit = {
  id: string;
  position: THREE.Vector3;
  radius: number;
  roomKey: string;
  labelKey: string;
  active: boolean;
};
