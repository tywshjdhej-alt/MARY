import * as THREE from 'three';

export interface ProceduralTextureSet {
  woodFloor: THREE.CanvasTexture;
  woodRoughness: THREE.CanvasTexture;
  wallpaper: THREE.CanvasTexture;
  darkPlaster: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  portraits: THREE.CanvasTexture[];
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const texturesToDispose: THREE.Texture[] = [];

  // 1. Aged dark oak floorboards
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 512;
  woodCanvas.height = 512;
  const wCtx = woodCanvas.getContext('2d')!;
  wCtx.fillStyle = '#251a13';
  wCtx.fillRect(0, 0, 512, 512);

  const plankHeight = 64;
  for (let y = 0; y < 512; y += plankHeight) {
    const shade = 28 + ((y * 13) % 16);
    wCtx.fillStyle = `rgb(${shade + 12}, ${shade}, ${shade - 8})`;
    wCtx.fillRect(0, y + 1, 512, plankHeight - 2);

    // Plank seam
    wCtx.fillStyle = '#0d0907';
    wCtx.fillRect(0, y, 512, 2);

    // Wood grain lines
    wCtx.strokeStyle = 'rgba(15, 9, 6, 0.35)';
    wCtx.lineWidth = 1.2;
    for (let g = 0; g < 8; g++) {
      wCtx.beginPath();
      const gy = y + 6 + g * 7;
      wCtx.moveTo(0, gy);
      wCtx.bezierCurveTo(170, gy + ((g % 3) - 1) * 4, 340, gy - ((g % 2) * 3), 512, gy);
      wCtx.stroke();
    }

    // Staggered vertical joints
    const jointX = ((y / plankHeight) * 187 + 90) % 480;
    wCtx.fillStyle = '#0c0806';
    wCtx.fillRect(jointX, y, 3, plankHeight);
  }
  const woodFloor = new THREE.CanvasTexture(woodCanvas);
  woodFloor.colorSpace = THREE.SRGBColorSpace;
  woodFloor.wrapS = woodFloor.wrapT = THREE.RepeatWrapping;
  woodFloor.repeat.set(6, 6);
  woodFloor.anisotropy = maxAnisotropy;
  texturesToDispose.push(woodFloor);

  // Roughness map for floorboards
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 256;
  roughCanvas.height = 256;
  const rCtx = roughCanvas.getContext('2d')!;
  rCtx.fillStyle = '#b8b8b8';
  rCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 400; i++) {
    const rx = (i * 73) % 256;
    const ry = (i * 41) % 256;
    const v = 130 + (i % 90);
    rCtx.fillStyle = `rgb(${v},${v},${v})`;
    rCtx.fillRect(rx, ry, 24, 3);
  }
  const woodRoughness = new THREE.CanvasTexture(roughCanvas);
  woodRoughness.wrapS = woodRoughness.wrapT = THREE.RepeatWrapping;
  woodRoughness.repeat.set(6, 6);
  texturesToDispose.push(woodRoughness);

  // 2. Peeling 2009 striped haunted wallpaper
  const wallCanvas = document.createElement('canvas');
  wallCanvas.width = 512;
  wallCanvas.height = 512;
  const wpCtx = wallCanvas.getContext('2d')!;
  wpCtx.fillStyle = '#26292e';
  wpCtx.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 32) {
    wpCtx.fillStyle = x % 64 === 0 ? 'rgba(18, 20, 24, 0.55)' : 'rgba(54, 58, 63, 0.25)';
    wpCtx.fillRect(x, 0, 14, 512);
  }
  // Dampness stains near bottom
  const stainGrad = wpCtx.createLinearGradient(0, 340, 0, 512);
  stainGrad.addColorStop(0, 'rgba(12, 13, 15, 0)');
  stainGrad.addColorStop(1, 'rgba(10, 11, 13, 0.82)');
  wpCtx.fillStyle = stainGrad;
  wpCtx.fillRect(0, 340, 512, 172);
  // Subtle grime flecks
  for (let i = 0; i < 320; i++) {
    const gx = (i * 113) % 512;
    const gy = (i * 197) % 512;
    wpCtx.fillStyle = 'rgba(8, 9, 10, 0.22)';
    wpCtx.fillRect(gx, gy, 3 + (i % 5), 2 + (i % 4));
  }
  const wallpaper = new THREE.CanvasTexture(wallCanvas);
  wallpaper.colorSpace = THREE.SRGBColorSpace;
  wallpaper.wrapS = wallpaper.wrapT = THREE.RepeatWrapping;
  wallpaper.repeat.set(3, 1);
  wallpaper.anisotropy = maxAnisotropy;
  texturesToDispose.push(wallpaper);

  // 3. Dark aged plaster / ceiling
  const plasterCanvas = document.createElement('canvas');
  plasterCanvas.width = 256;
  plasterCanvas.height = 256;
  const pCtx = plasterCanvas.getContext('2d')!;
  pCtx.fillStyle = '#1b1d22';
  pCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 200; i++) {
    pCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.12)';
    pCtx.fillRect((i * 59) % 256, (i * 89) % 256, 12, 12);
  }
  const darkPlaster = new THREE.CanvasTexture(plasterCanvas);
  darkPlaster.colorSpace = THREE.SRGBColorSpace;
  darkPlaster.wrapS = darkPlaster.wrapT = THREE.RepeatWrapping;
  darkPlaster.repeat.set(4, 4);
  texturesToDispose.push(darkPlaster);

  // 4. Soft radial contact shadow
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d')!;
  const rad = sCtx.createRadialGradient(64, 64, 4, 64, 64, 62);
  rad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  rad.addColorStop(0.55, 'rgba(0, 0, 0, 0.28)');
  rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sCtx.fillStyle = rad;
  sCtx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(shadowCanvas);
  contactShadow.colorSpace = THREE.SRGBColorSpace;
  texturesToDispose.push(contactShadow);

  // 5. Three haunted 2009 wall portraits (encode digits 2, 0, 9 subtly)
  const portraitConfigs = [
    { bg: '#26303d', accent: '#c9a66b', label: 'II', digit: '2', motif: 'sun' },
    { bg: '#191b22', accent: '#7c8a9e', label: '09', digit: '0', motif: 'eclipse' },
    { bg: '#25171c', accent: '#b8424d', label: 'IX', digit: '9', motif: 'mary' },
  ];
  const portraits = portraitConfigs.map((cfg) => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 320;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = cfg.bg;
    ctx.fillRect(0, 0, 256, 320);

    // Subtle painting brushwork
    const grad = ctx.createRadialGradient(128, 130, 18, 128, 140, 150);
    grad.addColorStop(0, 'rgba(255,255,255,0.14)');
    grad.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 320);

    ctx.strokeStyle = cfg.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, 224, 288);

    if (cfg.motif === 'sun') {
      ctx.fillStyle = cfg.accent;
      ctx.beginPath();
      ctx.arc(128, 115, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#12171d';
      ctx.fillRect(40, 185, 176, 85);
    } else if (cfg.motif === 'eclipse') {
      ctx.fillStyle = '#090a0d';
      ctx.beginPath();
      ctx.arc(128, 125, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = cfg.accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(128, 125, 50, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Silhouette of Mary
      ctx.fillStyle = '#090709';
      ctx.beginPath();
      ctx.arc(128, 102, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(86, 265);
      ctx.lineTo(106, 134);
      ctx.lineTo(150, 134);
      ctx.lineTo(170, 265);
      ctx.closePath();
      ctx.fill();
      // Glowing eyes
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(116, 98, 6, 4);
      ctx.fillRect(134, 98, 6, 4);
    }

    ctx.fillStyle = 'rgba(235, 225, 210, 0.65)';
    ctx.font = 'bold 28px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(cfg.digit, 128, 290);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    texturesToDispose.push(tex);
    return tex;
  });

  return {
    woodFloor,
    woodRoughness,
    wallpaper,
    darkPlaster,
    contactShadow,
    portraits,
    dispose: () => {
      texturesToDispose.forEach((t) => t.dispose());
    },
  };
}
