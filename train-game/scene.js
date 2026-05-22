import * as THREE from 'three';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a2e);

  const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.3, 2000);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.body.appendChild(renderer.domElement);

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // Lights - cyberpunk style
  const moon = new THREE.DirectionalLight(0x8866ff, 0.3);
  moon.position.set(-100, 200, -50);
  scene.add(moon);

  // Main colorful lights
  const colors = [0xff4488, 0x44ff88, 0x4488ff];
  for (let i = 0; i < 3; i++) {
    const light = new THREE.DirectionalLight(colors[i], 0.4);
    const angle = (i / 3) * Math.PI * 2;
    light.position.set(Math.cos(angle) * 120, 80, Math.sin(angle) * 120);
    scene.add(light);
  }

  // Sun light (warm)
  const sun = new THREE.DirectionalLight(0xffd488, 0.8);
  sun.position.set(80, 150, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 400;
  sun.shadow.camera.left = -150;
  sun.shadow.camera.right = 150;
  sun.shadow.camera.top = 150;
  sun.shadow.camera.bottom = -150;
  sun.shadow.bias = -0.001;
  scene.add(sun);

  // Ambient
  const hemi = new THREE.HemisphereLight(0x4488ff, 0x442266, 0.4);
  scene.add(hemi);

  return { scene, camera, renderer };
}