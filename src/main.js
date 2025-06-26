/*
  Cassandra Lubbe (57170304)
  COS3712 - Assessment 02 Part 1

  Please see Documentation.pdf for a fuller understanding of the current project and it's related parts.
  June 2026
*/
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

// Scene Setup
const scene = new THREE.Scene();

// Camera Setup
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 5000);
camera.position.set(0, 200, 300);

// Renderer Setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Camera Controls
// Allows users to orbit, zoom, and pan using mouse
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 10;
controls.maxDistance = 4000;

// Lighting Setup
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(0, 300, 0);
scene.add(dirLight);
//scene.add(new THREE.DirectionalLightHelper(dirLight, 10));

// Grid and Axes Helpers (Visual Aids)
// scene.add(new THREE.GridHelper(500, 50));
// scene.add(new THREE.AxesHelper(500));

let city = null;  // Global city reference
let carsRunning = true;
let dronesRunning = true;

// City Model Load
const loader = new GLTFLoader();
loader.load('models/city.glb', (gltf) => {
  city = gltf.scene;

  city.traverse((child) => {
    if (child.isMesh) child.material.side = THREE.DoubleSide;
  });

  // Center the city
  const box = new THREE.Box3().setFromObject(city);
  const center = box.getCenter(new THREE.Vector3());
  city.position.sub(center);
  city.position.y = -19;
  city.position.z = 30;

  // Find focusPoint and textMesh inside city
  let focusPoint = null;
  let textMesh = null;

  city.traverse((obj) => {
    if (obj.name === 'focusPoint-DailyPlanet') {
      focusPoint = obj;
    }
  });

  if (focusPoint) {
    const fontLoader = new FontLoader();  // Text Geometry
    fontLoader.load('fonts/helvetiker_regular.typeface.json', (font) => {
      const text = "DAILY PLANET";
      const radius = 10;
      const pivot = new THREE.Object3D();
      
      console.log('Font loaded, creating text...');

      const center = new THREE.Vector3();
      focusPoint.getWorldPosition(center);

      // Apply an offset — adjust these values as needed
      const offset = new THREE.Vector3(0, 26, -30); 
      center.add(offset);

      pivot.position.copy(center);

      const lettersOnly = text.replace(/\s/g, '');
      const angleStep = (Math.PI * 2) / lettersOnly.length;

      let letterIndex = 0;

      for (let i = text.length - 1; i >= 0; i--) {
        const char = text[i];
        if (char === ' ') continue;

        const geometry = new TextGeometry(char, {
          font: font,
          size: 2.5,
          height: 0.01,
          curveSegments: 12,
          bevelEnabled: false,
        });
        geometry.center();

        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const letter = new THREE.Mesh(geometry, material);
        letter.scale.z = 0.01; // compress thickness by factor 10


        // Calculate angle around circle
        const angle = letterIndex * angleStep;

        // Position letter on circle in XZ plane
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        letter.position.set(x, 0, z);

        // Orient letter to face outward from center (pivot)
        letter.lookAt(new THREE.Vector3(0, 0, 0));
        letter.rotateY(Math.PI);        // Flip so front faces outward, not inward

        pivot.add(letter);
        letterIndex++;
      }
      
      const material = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        side: THREE.DoubleSide,
      });

      // const debugBox = new THREE.Mesh(
      //   new THREE.BoxGeometry(2, 2, 2),
      //   new THREE.MeshBasicMaterial({ color: 0x00ff00 })
      // );
      // debugBox.position.copy(center); // same as pivot center
      // scene.add(debugBox);
  
      city.add(pivot);
      city.userData.textPivot = pivot;
    });
  }
  
  scene.add(city);
});


const drones = {};
const cars = {};
const carMarkers = {};
const rotatingDrones = [];
const carPaths = {};
const carProgress = {};
const carSpeed = {};

const droneControlState = {
  drone1: true, // true means rotating
  drone2: true,
};

// Model Loading - loads GLTF models asynchronously
function loadModel(path) {
  return new Promise((resolve, reject) => {
    loader.load(path, (gltf) => resolve(gltf.scene), undefined, reject);
  });
}

// Starting positions for drones
const dronePositions = {
  drone1: new THREE.Vector3(80, 200, 100),
  drone2: new THREE.Vector3(-80, 180, 100),
  drone3: new THREE.Vector3(-90, 100, -80),
  drone4: new THREE.Vector3(90, 150, -80),
};

// Geometry marker for drones (Visual Aid)
// for (const [name, pos] of Object.entries(dronePositions)) {
//   const marker = new THREE.Mesh(
//     new THREE.SphereGeometry(0.5, 8, 8),
//     new THREE.MeshBasicMaterial({ color: 0x00ffff }) // cyan
//   );
//   marker.position.copy(pos);
//   scene.add(marker);
// }

// Set drone radius around which to rotate
const droneOrbitRadius = {
  drone1: 90,
  drone2: 80,
  drone3: 40,
  drone4: 20,
};


// Load Drones
async function loadDrones() {
  for (let i = 1; i <= 4; i++) {
    const name = `drone${i}`;
    const model = await loadModel(`models/${name}.glb`);
    model.name = name;

    const basePosition = dronePositions[name] || new THREE.Vector3(i * 10, 80, i * 10);

    const bbox = new THREE.Box3().setFromObject(model);
    const center = bbox.getCenter(new THREE.Vector3());
    model.position.sub(center); // center the drone mesh

    const pivot = new THREE.Object3D();

    const radius = droneOrbitRadius[name] || 50;
    model.position.set(radius, 0, 0);
    pivot.add(model);

    pivot.position.copy(basePosition); // Place pivot in scene
    scene.add(pivot);

    drones[name] = pivot;
    pivot.userData.name = name;
    rotatingDrones.push(pivot); 
  }
}

// The coordinates for the various markers for car1, first and last same to create looping path
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

// Debug points for car path (Visual Aid)
// const car1DebugPoints = carPaths['car1'].getPoints(100);
// const debugGeometry = new THREE.BufferGeometry().setFromPoints(car1DebugPoints);
// const debugMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
// const debugLine = new THREE.Line(debugGeometry, debugMaterial);

// Markers along the path of car1
// const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
// const markerGeometry = new THREE.SphereGeometry(0.8, 8, 8);

// for (let i = 0; i < car1DebugPoints.length; i += 5) { // Adjust step for density
//   const marker = new THREE.Mesh(markerGeometry, markerMaterial);
//   marker.position.copy(car1DebugPoints[i]);
//   scene.add(marker);
// }

// scene.add(debugLine);

// The coordinates for the various markers for car 2, first and last the same to create a loop
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

// Debug points for the path of car 2 (Visual Aid)
// const car2DebugPoints = carPaths['car2'].getPoints(100);
// const car2DebugGeometry = new THREE.BufferGeometry().setFromPoints(car2DebugPoints);
// const car2DebugMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 }); // green for car2
// const car2DebugLine = new THREE.Line(car2DebugGeometry, car2DebugMaterial);

// Markers along the path of car2 (Visual Aid)
// const markerMaterial1 = new THREE.MeshBasicMaterial({ color: 0x0000ff }); // blue markers for car2
// const markerGeometry1 = new THREE.SphereGeometry(0.5, 8, 8);

// for (let i = 0; i < car2DebugPoints.length; i += 5) {
//   const marker = new THREE.Mesh(markerGeometry1, markerMaterial1);
//   marker.position.copy(car2DebugPoints[i]);
//   scene.add(marker);
// }

// scene.add(car2DebugLine);

// The coordinates for the various markers of car3, first and last are the same to create loop
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

// Debug points for the path of car3 (Visual Aid)
// const car3DebugPoints = carPaths['car3'].getPoints(100);
// const car3DebugGeometry = new THREE.BufferGeometry().setFromPoints(car3DebugPoints);
// const car3DebugMaterial = new THREE.LineBasicMaterial({ color: 0xff00ff }); // bright magenta for car3
// const car3DebugLine = new THREE.Line(car3DebugGeometry, car3DebugMaterial);

// Markers along the path of car3 (Visual Aid)
// const markerMaterial2 = new THREE.MeshBasicMaterial({ color: 0x800080 }); // deep purple for car3
// const markerGeometry2 = new THREE.SphereGeometry(0.5, 8, 8);

// for (let i = 0; i < car3DebugPoints.length; i += 5) {
//   const marker = new THREE.Mesh(markerGeometry2, markerMaterial2);
//   marker.position.copy(car3DebugPoints[i]);
//   scene.add(marker);
// }

// scene.add(car3DebugLine);

// The coordinates for the various markers for car4, first and last are the same to create loop
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

// Debug points for path of car4 (Visual Aid)
// const car4DebugPoints = carPaths['car4'].getPoints(100);
// const car4DebugGeometry = new THREE.BufferGeometry().setFromPoints(car4DebugPoints);
// const car4DebugMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff }); // bright cyan for car4
// const car4DebugLine = new THREE.Line(car4DebugGeometry, car4DebugMaterial);

// Markers for the path of car4 (Visual Aid)
// const markerMaterial3 = new THREE.MeshBasicMaterial({ color: 0xD7FF33 }); // deep cy for car4
// const markerGeometry3 = new THREE.SphereGeometry(0.5, 8, 8);

// for (let i = 0; i < car4DebugPoints.length; i += 5) {
//   const marker = new THREE.Mesh(markerGeometry3, markerMaterial3);
//   marker.position.copy(car4DebugPoints[i]);
//   scene.add(marker);
// }

// scene.add(car4DebugLine);

// Load car models
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
    scene.add(group);
    cars[name] = group;
  }
}

// Asynchronous function to initialize the 3D animated objects and ensure they are rendered before animation can start
async function init() {
  await loadDrones();
  await loadCars();
  console.log('All models loaded');
}

init();

// Animation function
function animate() {
  requestAnimationFrame(animate);

  // Rotate text pivot around focus point if loaded
  if (city && city.userData.textPivot) {
    city.userData.textPivot.rotation.y += 0.01;
  }

  rotatingDrones.forEach((pivot) => {
    const name = pivot.userData.name;
    
    // The two drones who will stop/start when triggered by button
    if (name === 'drone1' || name === 'drone3') {
      if (dronesRunning) {
        pivot.rotation.y += 0.01;
      }
    } else {
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

// Responsive resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Add UI toggle buttons to the car and drone movements
document.getElementById('toggleCars').addEventListener('click', () => {
  carsRunning = !carsRunning;
  document.getElementById('toggleCars').textContent = carsRunning ? 'Stop Cars' : 'Start Cars';
});

document.getElementById('toggleDrones').addEventListener('click', () => {
  dronesRunning = !dronesRunning;
  document.getElementById('toggleDrones').textContent = dronesRunning ? 'Stop Drones' : 'Start Drones';
});