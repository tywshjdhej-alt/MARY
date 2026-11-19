import fs from 'node:fs';
import path from 'node:path';

const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');

if (!fs.existsSync(manifestPath)) {
  console.error('AndroidManifest.xml not found at:', manifestPath);
  process.exit(1);
}

let manifest = fs.readFileSync(manifestPath, 'utf8');

// Ensure hardware acceleration is enabled for smooth Three.js WebGL performance
if (!manifest.includes('android:hardwareAccelerated')) {
  manifest = manifest.replace(
    '<application',
    '<application\n        android:hardwareAccelerated="true"',
  );
}

// Lock main activity to Landscape orientation
if (!manifest.includes('android:screenOrientation')) {
  manifest = manifest.replace(
    /<activity([^>]*android:name="\.MainActivity"[^>]*)>/,
    '<activity$1\n            android:screenOrientation="sensorLandscape">',
  );
}

fs.writeFileSync(manifestPath, manifest, 'utf8');
console.log('Configured AndroidManifest.xml for Landscape + WebGL hardware acceleration.');
