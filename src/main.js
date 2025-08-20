/*
  Cassandra Lubbe (57170304)
  COS3712 - Assessment 02 Part 2

  Please see Documentation.pdf for a fuller understanding of the current project and it's related parts.
  August 2025
*/
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';


/* ----------------------------------------------------------------SCENE SETUP------------------------------------------------------------------------------- */
/* ----------------------------------------------------------------Create Scene */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

/* ----------------------------------------------------------------Create Skybox and Nightbox */
let dayBox, nightBox;
const rgbeLoader = new RGBELoader();
const exrLoader = new EXRLoader();

function setDayModeActive() {
  sunlight.intensity = 1;
  sunlight.color.set(0xffffff);
  ambientLight.intensity = 0.5;

  if (dayBox) {
    scene.background = dayBox;
    scene.environment = dayBox;
  }
  document.getElementById('toggleDayNight').textContent = 'Night Mode';
  lights.forEach(light => light.visible = false);
}

rgbeLoader.load('textures/cubemap/skybox.hdr', (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  dayBox = texture;
  if (isDay) {
    setDayModeActive();
  }
});

exrLoader.load('textures/cubemap/nightbox2.exr', (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  nightBox = texture;
  if (!isDay) {
    scene.background = nightBox;
    scene.environment = nightBox;
  }
});

/* ------------------------------------------------------------------Camera Setup */
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 5000);
camera.position.set(0, 200, 300);

/* ------------------------------------------------------------------Renderer Setup */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

/* -------------------------------------------------------------------Camera Setup */
// Allows users to orbit, zoom, and pan using mouse
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 10;
controls.maxDistance = 4000;

/* --------------------------------------------------------------------Sunlight Setup */
const sunlight = new THREE.DirectionalLight(0xffffff, 1);
sunlight.position.set(200, 400, 50);  // position inside the world space
sunlight.target.position.set(0, 0, 0);
sunlight.castShadow = true;

// Fine-tune shadows
sunlight.shadow.mapSize.set(2048, 2048);
sunlight.shadow.camera.near = 0.5;
sunlight.shadow.camera.far = 600;
const d = 300;
sunlight.shadow.camera.left = -d;
sunlight.shadow.camera.right = d;
sunlight.shadow.camera.top = d;
sunlight.shadow.camera.bottom = -d;

scene.add(sunlight);

// Ambient light for general environment light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

/* -----------------------------------------------------------GLOBAL GROUPS AND FLAGS------------------------------------------------------------------------ */
let isDay = true;
const CITY = new THREE.Group();
scene.add(CITY);
const CARS = new THREE.Group();
scene.add(CARS);

let carsRunning = true;
let dronesRunning = true;
let dailyPlanetPivot = null;
let dailyPlanetLetters = [];
const buildingEmissiveMeshes = [];
const buildingMesh = [];
const lights = [];


/* ----------------------------------------------------------TEXTURE MAPPING */
const textureMap = {
  'brick': {
    map:'textures/brick.jpg',
    normalMap: 'textures/brick_normal.jpg'},
  'wood': {
    map: 'textures/wood.jpg',
    normalMap: 'textures/wood_normal.jpg'},
  'road': {
    map: 'textures/gravel.jpg',
    normalMap: 'textures/gravel_normal.jpg'},
  'grass': {
    map: 'textures/grass.jpg',
    normalMap: 'textures/grass_normal.jpg'},
  'black-metal': {
    map: 'textures/metal.jpg',
    normalMap: 'textures/metal_normal.jpg'},
  'grey-metal': {
    map: 'textures/marble.jpg',
    normalMap: 'textures/marble_normal.jpg'},
  'concrete': {
    map: 'textures/concrete.jpg',
    normalMap: 'textures/concrete_normal.jpg'},
};

/* ---------------------------------------------------------------------MODELS: BUILDINGS PROCESSING---------------------------------------------------------------- */

/* ---------------------------------------------------------------------Apply Texture / Mapping/ EnvMap */
  function applyTextureMapping(model) {
    const textureLoader = new THREE.TextureLoader();

    model.traverse(child => {
      if (child.isMesh) {
        let mat = child.material;
        let matName = mat.name;

        if (Array.isArray(mat)) {
          mat.forEach((m) => {
            if (textureMap[m.name]) {
              // Texture mapping
              if (textureMap[m.name].map) {
                m.map = textureLoader.load(textureMap[m.name].map);
              }

              // Normal (BUMP) mapping
              if (textureMap[m.name].normalMap){
                m.normalMap = textureLoader.load(textureMap[m.name].normalMap);
                m.normalScale = new THREE.Vector2(1, 1); // Adjust if needed
              }

              // Environment mapping
              if (textureMap) {
                rgbeLoader.load(textureMap[m.name].envMap, (texture) => {
                  envMap.mapping = THREE.EquirectangularReflectionMapping;
                  m.envMap = envMap;
                  m.envMap.intensity = 1; // Adjust if needed
                  m.envMap.needsUpdate = true;
                });
              }
              m.needsUpdate = true;
            }
          });
          child.userData.originalMaterial = mat.map(m => m.clone());
        }
        else {
          if (textureMap[matName]) {
            // Texture map
            if (textureMap[matName].map) {
              mat.map = textureLoader.load(textureMap[matName].map);
            }

            // Normal (BUMP) map
            if (textureMap[matName].normalMap) {
              mat.normalMap = textureLoader.load(textureMap[matName].normalMap);
              mat.normalScale = new THREE.Vector2(1, 1); // Adjust if needed
            }

            // Environment map
            if (textureMap[matName].envMap) {
              rgbeLoader.load(textureMap[matName].envMap, (texture) => {
                envMap.mapping = THREE.EquirectangularReflectionMapping;
                mat.envMap = envMap;
                mat.envMap.intensity = 1; // Adjust if needed
                mat.envMap.needsUpdate = true;
              });
            }
            mat.needsUpdate = true;
          }
        }
        // Set normal map if available
        child.userData.originalMaterial = child.material.clone();
      }
    });
  }

/* -------------------------------------------------------------------------------Process Buildings */
function processBuilding(model) {
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.material.side = THREE.DoubleSide;
      buildingMesh.push(child);

      // Track emissive properties/materials for day/night mode
      if ('emissiveIntensity' in child.material) {
        buildingEmissiveMeshes.push(child);
      }
    }
  });
}

/* ------------------------------------------------------------------------------Add Daily Planet Neon Sign */
function addDailyPlanetSign(buildingMesh) {
  return new Promise((resolve, reject) => {
    const focusPoint = buildingMesh.getObjectByName('focusPoint-DailyPlanet');
    const pivot = new THREE.Object3D();

    if (!focusPoint) {
    console.warn('Focus Point not found.');
    }
  
    const fontLoader = new FontLoader();
    fontLoader.load('fonts/helvetiker_regular.typeface.json', (font) => {
      const text = "DAILY PLANET";
      const radius = 10;
      const center = new THREE.Vector3();
      
      if (focusPoint) {
        focusPoint.getWorldPosition(center);
      } 
      else {
        buildingMesh.getWorldPosition(center);
        center.y += 20;
        center.z -= 30;
      }

      pivot.position.copy(center);

      const lettersOnly = text.replace(/\s/g, '');
      const angleStep = (Math.PI * 2) / lettersOnly.length;
      
      let letterIndex = 0;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char == ' ') continue;

        const geometry = new TextGeometry(char, {
          font: font, 
          size:2.5, 
          height: 0.02,
          curveSegments: 12,
          bevelEnabled: false,
        });
        geometry.center();

        const material = new THREE.MeshStandardMaterial({
          color: 0x00ffff,
          emissive: 0x00ffff,
          emissiveIntensity: 0,   // no glow during day mode
          metalness: 0.5,
          roughness: 0.2,
          side: THREE.DoubleSide,
        });

        const letterMesh = new THREE.Mesh(geometry, material);
        letterMesh.scale.z = 0.01;

        // Calculate angle around circle
        const angle = (lettersOnly.length - 1 - letterIndex) * angleStep;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        letterMesh.position.set(x, 0, z);

        // Position letters to face outward from center
        letterMesh.lookAt(new THREE.Vector3(x, 0, z).multiplyScalar(2));
        // letterMesh.rotateY(Math.PI);

        pivot.add(letterMesh);
        dailyPlanetLetters.push(letterMesh);
        letterIndex++;
      }

      buildingMesh.add(pivot);
      resolve(pivot);
    }, undefined,
    (err) => reject(err)
    );
  });
}

/* ---------------------------------------------------------------------------------LOAD CITY--------------------------------------------------------------- */
const loader = new GLTFLoader();

const modelFiles = [
  'foundation.glb',
  'building1.glb',
  'building2.glb',
  'building3.glb',
  'building4.glb',
  'building5.glb',
  'apartment1.glb',
  'apartment2.glb',
  'apartment3.glb',
  'bigBen.glb',
  'chinesebuilding.glb',
  'cityBillboard.glb',
  'spaceNeedle.glb',
  'twinTower.glb',
  'dailyPlanet.glb',
  'park1.glb',
  'park2.glb',
  'park3.glb'
];

// Offset city for car paths
const cityOffset = new THREE.Vector3(0, -18, 30);
CITY.position.copy(cityOffset);

/* ---------------------------------------------------------------------------Loading Page */
let modelsLoaded = 0;
const totalModels = modelFiles.length;

function updateLoadingProcess() {
  const percent = Math.round((modelsLoaded / totalModels) * 100);
  document.getElementById('loadingText').innerText = `Loading... ${percent}%`;

  if (percent === 100) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.opacity = 0;

    setTimeout(() => overlay.remove(), 800);
  }
}

/* -------------------------------------------------------------------------Load Models */
modelFiles.forEach(file => {
  loader.load(`models/${file}`, (gltf) => {
    const model = gltf.scene;

    let foundLights = false;
    model.traverse((child) => {
      if (child.isLight) {
        foundLights = true;
        lights.push(child);
        lights.visible = false;
      }
    });
    if (!foundLights) {
      console.warn(`No lights found in model: ${file}`);
    }

    processBuilding(model);
    applyTextureMapping(model);
    CITY.add(model);

    // Locate empty for text rotation - Daily Planet Building
    if (file === 'dailyPlanet.glb') {
      addDailyPlanetSign(model).then((pivot) => {
        dailyPlanetPivot = pivot;
      }).catch(console.error);
    }

    modelsLoaded++;
    updateLoadingProcess();

  }, undefined, (error) => {
    console.error(`Failed to load: ${file}`, error);
  });
});

/* ------------------------------------------------------------------------Set Shading */
const textureCache = {};
const textureLoader = new THREE.TextureLoader();

function getTexture(path) {
  if (!path) return null;
  if (!textureCache[path]) {
    textureCache[path] = textureLoader.load(path);
  }
  return textureCache[path];
}

function setShading(type) {
  scene.traverse(obj => {
    if (obj.isMesh) {
      let texture = obj.material.map;
      if (obj.material.map && obj.material.map.image && obj.material.map.image.src) {
        texture = getTexture(obj.material.map.image.src);
      }

      if (type === 'flat') {
        obj.material.dispose();
        obj.material = new THREE.MeshStandardMaterial({
          color: obj.material.color,
          flatShading: true,
          metalness: obj.material.metalness ?? 0.5,
          roughness: obj.material.roughness ?? 0.5,
          emissive: obj.material.emissive ?? 0x000000,
          emissiveIntensity: obj.material.emissiveIntensity ?? 0,
          map: obj.material.map ?? null,
          side: THREE.DoubleSide
        });
      }
      if (type === 'gouraud') {
        obj.material.dispose();
        obj.material = new THREE.MeshLambertMaterial({
          color: obj.material.color,
          emissive: obj.material.emissive ?? 0x000000,
          emissiveIntensity: obj.material.emissiveIntensity ?? 0,
          map: texture ?? null,
          side: THREE.DoubleSide
        });
      }
      if (type === 'phong') {
        obj.material.dispose();
        obj.material = new THREE.MeshPhongMaterial({
          color: obj.material.color,
          shininess: 10,
          specular: 0xffffff,
          emissive: obj.material.emissive ?? 0x000000,
          emissiveIntensity: obj.material.emissiveIntensity ?? 0x000000,
          map: texture ?? null,
          side: THREE.DoubleSide
        });
      }
      if (type === 'normal') {
        if (obj.userData.originalMaterial) {
          obj.material.dispose();
          obj.material = Array.isArray(obj.originalMaterial) ?
            obj.userData.originalMaterial.map(mat => mat.clone()) :
            obj.userData.originalMaterial.clone();
          obj.material.needsUpdate = true;
        }
      }
      obj.material.needsUpdate = true;
    }
  });
}

/* ---------------------------------------------------------------------------Window Environment Mapping Setup */
function updateWindowsEnvMaps() {
  buildingMesh.forEach(mesh => {
    let mat = mesh.material;
    if (Array.isArray(mat)) {
      mat.forEach(m => {
        if (m.name && (m.name.toLowerCase().includes('window') || m.name.toLowerCase().includes('glass'))) {
          m.envMap = scene.environment;
          m.envMap.intensity = 1;
          m.metalness = 1;
          m.roughness = 0.05;
          m.needsUpdate = true;
          m.transparent = false;
        }
      });
    }
    else {
      if (mat.name && (mat.name.toLowerCase().includes('window') || mat.name.toLowerCase().includes('glass'))) {
        mat.envMap = scene.environment;
        mat.envMap.intensity = 1;
        mat.metalness = 1;
        mat.roughness = 0.05;
        mat.transparent = false;
        mat.needsUpdate = true;

        if (mat.name && (mat.name.toLowerCase().includes('forest1'))) {
          if (isDay) {
            mat.transparent = true;
          }
        }
      }
    }
  });
}

/* -------------------------------------------------------------------------------DRONES------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------------Globals */
const drones = {};
const rotatingDrones = [];
const dronePositions = {
  drone1: new THREE.Vector3(80, 200, 100),
  drone2: new THREE.Vector3(-80, 180, 100),
  drone3: new THREE.Vector3(-90, 100, -80),
  drone4: new THREE.Vector3(90, 150, -80),
};
const droneOrbitRadius = {
  drone1: 90,
  drone2: 80,
  drone3: 40,
  drone4: 20,
};
const droneControlState = {
  drone1: true, // true means rotating
  drone2: true,
};

/* ----------------------------------------------------------------------------Load Drones */
async function loadDrones() {
  for (let i = 1; i <= 4; i++) {
    const name = `drone${i}`;
    const model = await loadModel(`models/${name}.glb`);
    model.name = name;

    // Reset model transformations
    model.position.set(0, 0, 0);
    model.rotation.set(0, 0, 0);
    model.scale.set(1, 1, 1);

    // Calculate and set mesh centers
    const bbox = new THREE.Box3().setFromObject(model);
    const center = bbox.getCenter(new THREE.Vector3());
    model.position.sub(center);

    // Create pivot for drone orbiting
    const pivot = new THREE.Object3D();

    // Get base position from markers
    const basePosition = dronePositions[name];
    pivot.position.copy(basePosition);

    // Set radius
    const radius = droneOrbitRadius[name] || 50;
    const offsetHolder = new THREE.Object3D();
    offsetHolder.position.set(radius, 0, 0);

    // Add offset holder and pivot
    offsetHolder.add(model);
    pivot.add(offsetHolder);

    CITY.add(pivot);

    drones[name] = pivot;
    pivot.userData.name = name;
    rotatingDrones.push(pivot); 
  }
}

/* ---------------------------------------------------------------------------Load Models - Asynchronouysly */
function loadModel(path) {
  return new Promise((resolve, reject) => {
    loader.load(path, (gltf) => resolve(gltf.scene), undefined, reject);
  });
}

/* ----------------------------------------------------------------------------CARS-------------------------------------------------------------------------------- */
const cars = {};
const carMarkers = {};
const carPaths = {};
const carProgress = {};
const carSpeed = {};

/* ---------------------------------------------------------------------------Car 1: Path */
carPaths['car1'] = new THREE.CatmullRomCurve3([
  new THREE.Vector3(80, 5, 30),  //start of roundabout
  new THREE.Vector3(-10, 5, 30),
  new THREE.Vector3(-28, 5, 40),
  new THREE.Vector3(-40, 5, 60),
  new THREE.Vector3(-44, 5, 80),
  new THREE.Vector3(-40, 5, 105),
  new THREE.Vector3(-25, 5, 120),
  new THREE.Vector3(-5, 5, 130),
  new THREE.Vector3(12, 5, 130),
  new THREE.Vector3(35, 5, 115),
  new THREE.Vector3(45, 5, 95),
  new THREE.Vector3(48, 10, 80),
  new THREE.Vector3(45, 15, 70),
  new THREE.Vector3(35, 15, 52),
  new THREE.Vector3(25, 15, 40),  // end of roundabout
  new THREE.Vector3(0, 15, 30),
  new THREE.Vector3(0, 15, 10),
  new THREE.Vector3(0, 20, -10),
  new THREE.Vector3(0, 50, -35),
  new THREE.Vector3(0, 68, -40),
  new THREE.Vector3(0, 78, -60),
  new THREE.Vector3(0, 78, -190),
  new THREE.Vector3(0, 78, -190),
  new THREE.Vector3(0, 78, -200),
  new THREE.Vector3(0, 60, -210),
  new THREE.Vector3(25, 40, -220),
  new THREE.Vector3(195, 5, -225),
  new THREE.Vector3(200, 5, -225),
  new THREE.Vector3(200, 5, 28),
  new THREE.Vector3(200, 5, 30),
  new THREE.Vector3(140, 5, 30),
  new THREE.Vector3(80, 5, 30),
], true);

// Car speed and progress setup
carProgress['car1'] = 0;
carSpeed['car1'] = 0.0005;

/* ------------------------------------------------------------------------------Car 2: Path */
carPaths['car2'] = new THREE.CatmullRomCurve3([
  new THREE.Vector3(110, 5, 30),
  new THREE.Vector3(80, 5, 30),
  new THREE.Vector3(-10, 5, 30), // start of roundabout
  new THREE.Vector3(-28, 5, 40),
  new THREE.Vector3(-40, 5, 60),
  new THREE.Vector3(-44, 5, 80),
  new THREE.Vector3(-40, 5, 105),
  new THREE.Vector3(-25, 5, 120),
  new THREE.Vector3(-5, 5, 130),
  new THREE.Vector3(12, 5, 130),
  new THREE.Vector3(35, 5, 115),
  new THREE.Vector3(45, 5, 95),
  new THREE.Vector3(48, 10, 80),
  new THREE.Vector3(45, 15, 70),
  new THREE.Vector3(35, 15, 52),
  new THREE.Vector3(25, 15, 40),  // end of roundabout
  new THREE.Vector3(5, 10, 30),
  new THREE.Vector3(-54, 5, 30),
  new THREE.Vector3(-66, 5, 28),
  new THREE.Vector3(-66, 5, -42),
  new THREE.Vector3(-65, 5, -106),
  new THREE.Vector3(-65, 5, -152),
  new THREE.Vector3(-65, 5, -190),
  new THREE.Vector3(-65, 5, -215),
  new THREE.Vector3(0, 5, -220),
  new THREE.Vector3(195, 5, -225),
  new THREE.Vector3(200, 5, -225),
  new THREE.Vector3(200, 5, 28),
  new THREE.Vector3(200, 5, 30),
  new THREE.Vector3(110, 5, 30), // loop back
], true);

// Car speed and progress setup
carProgress['car2'] = 0;
carSpeed['car2'] = 0.0004; // adjust speed if needed

/* -----------------------------------------------------------------------------Car 3: Path */
carPaths['car3'] = new THREE.CatmullRomCurve3([
  new THREE.Vector3(140, 5, 30),
  new THREE.Vector3(80, 5, 30), 
  new THREE.Vector3(55, 5, 30),
  new THREE.Vector3(56, 5, 15),
  new THREE.Vector3(56, 5, -20),
  new THREE.Vector3(56, 5, -52),
  new THREE.Vector3(45, 5, -54),
  new THREE.Vector3(12, 5, -54),
  new THREE.Vector3(0, 5, -52),
  new THREE.Vector3(0, 5, 30),
  new THREE.Vector3(-10, 5, 30), // start of roundabout
  new THREE.Vector3(-28, 5, 40),
  new THREE.Vector3(-40, 5, 60),
  new THREE.Vector3(-44, 5, 80),
  new THREE.Vector3(-40, 5, 105),
  new THREE.Vector3(-25, 5, 120),
  new THREE.Vector3(-5, 5, 130),
  new THREE.Vector3(12, 5, 130),
  new THREE.Vector3(35, 5, 115),
  new THREE.Vector3(45, 5, 95),
  new THREE.Vector3(48, 10, 80),
  new THREE.Vector3(45, 15, 70),
  new THREE.Vector3(35, 15, 52),
  new THREE.Vector3(25, 15, 40),  // end of roundabout
  new THREE.Vector3(0, 15, 30),
  new THREE.Vector3(0, 15, 10),
  new THREE.Vector3(0, 20, -10),
  new THREE.Vector3(0, 50, -35),
  new THREE.Vector3(0, 68, -40),
  new THREE.Vector3(0, 78, -60),
  new THREE.Vector3(0, 78, -190),
  new THREE.Vector3(0, 78, -190),
  new THREE.Vector3(0, 78, -200),
  new THREE.Vector3(0, 60, -210),
  new THREE.Vector3(25, 40, -220),
  new THREE.Vector3(195, 5, -225),
  new THREE.Vector3(200, 5, -225),
  new THREE.Vector3(200, 5, 28),
  new THREE.Vector3(200, 5, 30),
  new THREE.Vector3(140, 5, 30), // loop back
], true);

// Car speed and progress setup
carProgress['car3'] = 0;
carSpeed['car3'] = 0.0005; // adjust speed if needed

/* ---------------------------------------------------------------------------------Car 4: Path */
carPaths['car4'] = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-90, 5, 200),
  new THREE.Vector3(-90, 5, 128), 
  new THREE.Vector3(-90, 5, 85),
  new THREE.Vector3(-90, 5, 30),
  new THREE.Vector3(-86, 5, 30),
  new THREE.Vector3(-75, 5, 30),
  new THREE.Vector3(-64, 5, 30),
  new THREE.Vector3(-64, 5, -5),
  new THREE.Vector3(-64, 5, -34),
  new THREE.Vector3(-64, 5, -90),
  new THREE.Vector3(-64, 5, -134),
  new THREE.Vector3(-64, 5, -185),
  new THREE.Vector3(-64, 5, -225), 
  new THREE.Vector3(-40, 50, -225),
  new THREE.Vector3(-10, 85, -225),
  new THREE.Vector3(0, 85, -215),
  new THREE.Vector3(0, 85, -145),
  new THREE.Vector3(0, 85, -80),
  new THREE.Vector3(0, 85, -58),
  new THREE.Vector3(0, 85, -52),
  new THREE.Vector3(0, 35, 0),
  new THREE.Vector3(0, 25, 10),
  new THREE.Vector3(0, 20, 30),
  new THREE.Vector3(110, 15, 30),
  new THREE.Vector3(140, 15, 30),
  new THREE.Vector3(188, 15, 30),
  new THREE.Vector3(190, 15, 30),
  new THREE.Vector3(190, 15, 200),
  new THREE.Vector3(188, 15, 210),
  new THREE.Vector3(80, 15, 210), 
  new THREE.Vector3(0, 10, 210), 
  new THREE.Vector3(-80, 10, 210),
  new THREE.Vector3(-90, 5, 210),
], true);

// Car speed and progress setup
carProgress['car4'] = 0;
carSpeed['car4'] = 0.0005; // adjust speed if needed

/* -----------------------------------------------------------------------------------Load Cars - Asynchronously */
async function loadCars() {
  for (let i = 1; i <= 4; i++) {
    const name = `car${i}`;
    const model = await loadModel(`models/${name}.glb`);
    model.name = name;

    const bbox = new THREE.Box3().setFromObject(model);
    const center = bbox.getCenter(new THREE.Vector3());
    model.position.sub(center); // center at origin

    const carPivot = new THREE.Object3D();
    carPivot.rotation.y = -Math.PI / 2; // adjust if needed
    carPivot.add(model);

    const group = new THREE.Group();
    group.name = `${name}_group`;
    group.add(carPivot);

    const marker = carMarkers[name];
    group.position.copy(marker ? marker.position : new THREE.Vector3());
    CARS.add(group);
    cars[name] = group;
  }
}

/* --------------------------------------------------------------------------------------INIT + ANIMATION------------------------------------------------------------------------- */
async function init() {
  await loadDrones();
  await loadCars();
  setDayModeActive();
  updateWindowsEnvMaps();
  console.log('All models loaded');
} 

init();

/* ----------------------------------------------------------------------------------Animation Function */
function animate() {
  requestAnimationFrame(animate);

  const emissiveTarget = isDay ? 0 : 2;

  buildingEmissiveMeshes.forEach(mesh => {
    mesh.material.emissiveIntensity += (emissiveTarget - mesh.material.emissiveIntensity) * 0.05;
  });

  // Rotate Daily Planet text
  if (dailyPlanetPivot) {
    dailyPlanetPivot.position.set(0, 90, 55);
    dailyPlanetPivot.rotation.y += 0.01;
  }

  dailyPlanetLetters.forEach(letter => {
    const target = isDay ? 0 : 2;
    letter.material.emissiveIntensity += (target - letter.material.emissiveIntensity) * 0.05;
  });

  rotatingDrones.forEach((pivot) => {
    const name = pivot.userData.name;
    
    // The two drones who will stop/start when triggered by button
    if (name === 'drone1' || name === 'drone3') {
      if (dronesRunning) {
        pivot.rotation.y += 0.01;
      }
    } 
    else {
      pivot.rotation.y += 0.01;  // drone3 & 4 always orbit
    }
  });
  
  // Move cars along their paths, their directions adjusted using quaternion rotations
  if (carsRunning) {
    Object.keys(carPaths).forEach((name) => {
      const group = cars[name];
      const path = carPaths[name];
      if (!group || !path) return;
  
      carProgress[name] += carSpeed[name];
      if (carProgress[name] > 1) carProgress[name] = 0;
  
      const point = path.getPointAt(carProgress[name]);
      const tangent = path.getTangentAt(carProgress[name]);
  
      group.position.copy(point);
  
      const up = new THREE.Vector3(0, 1, 0);
      const matrix = new THREE.Matrix4();
  
      matrix.lookAt(point, point.clone().add(tangent), up);
  
      const quaternion = new THREE.Quaternion();
      matrix.extractRotation(matrix);
      quaternion.setFromRotationMatrix(matrix);
  
      group.quaternion.slerp(quaternion, 0.2);
    });
  }
  

  controls.update();
  renderer.render(scene, camera);
}

animate();

/* ---------------------------------------------------------------------------------Day / Night Toggle */
document.getElementById('toggleDayNight').addEventListener('click', () => {
  isDay = !isDay;

  if (isDay) {
    // Day mode
    sunlight.intensity = 1;
    sunlight.color.set(0xffffff);
    ambientLight.intensity = 0.5;

    if (dayBox) {
      scene.background = dayBox;
      scene.environment = dayBox;
    }
    document.getElementById('toggleDayNight').textContent = 'Night Mode';

    lights.forEach(light => light.visible = false);
  } 
  else {
    // Night mode
    sunlight.intensity = 0;
    sunlight.color.set(0x666699);
    ambientLight.intensity = 0.1;

    if (nightBox) {
      scene.background = nightBox;
      scene.environment = nightBox;
    }
    document.getElementById('toggleDayNight').textContent = 'Day Mode';

    lights.forEach(light => light.visible = true);
  }
  updateWindowsEnvMaps();
});

/* --------------------------------------------------------------------------------Responsive Resizing */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* -------------------------------------------------------------------------------Cars and Drones Toggle */
document.getElementById('toggleCars').addEventListener('click', () => {
  carsRunning = !carsRunning;
  document.getElementById('toggleCars').textContent = carsRunning ? 'Stop Cars' : 'Start Cars';
});

document.getElementById('toggleDrones').addEventListener('click', () => {
  dronesRunning = !dronesRunning;
  document.getElementById('toggleDrones').textContent = dronesRunning ? 'Stop Drones' : 'Start Drones';
});

/* --------------------------------------------------------------------------------Shading Toggle */
function setActiveButton(buttonId) {
  document.querySelectorAll('.shading-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(buttonId).classList.add('active');
}

document.getElementById('toggleFlat').addEventListener('click', () => {
  setShading('flat');
  setActiveButton('toggleFlat');
});

document.getElementById('toggleGouraud').addEventListener('click', () => {
  setShading('gouraud');
  setActiveButton('toggleGouraud');
});

document.getElementById('togglePhong').addEventListener('click', () => {
  setShading('phong');
  setActiveButton('togglePhong');
});

document.getElementById('toggleNormal').addEventListener('click', () => {
  setShading('normal');
  setActiveButton('toggleNormal');
});