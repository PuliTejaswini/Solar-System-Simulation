// Wait for the DOM to load before initializing the 3D scene
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded. Initializing scene...');

  // Initialize core Three.js components: scene, camera, and renderer
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('solarCanvas'),
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  console.log('Renderer, scene, and camera initialized');

  // Set default camera position and orientation
  const defaultCameraPosition = new THREE.Vector3(0, 20, 60);
  camera.position.copy(defaultCameraPosition);
  camera.lookAt(0, 0, 0);
  console.log('Camera set to default position');

  // Create star field for background effect
  const starGeometry = new THREE.BufferGeometry();
  const starCount = 5000;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i++) {
    starPositions[i] = (Math.random() - 0.5) * 2000;
  }
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1 });
  const starField = new THREE.Points(starGeometry, starMaterial);
  scene.add(starField);
  console.log('Star field added to scene');

  // Lighting setup: ambient and point light
  scene.add(new THREE.AmbientLight(0xffffff, 0.2));
  scene.add(new THREE.PointLight(0xffffff, 1.5));
  console.log('Lights added to scene');

  // Create the sun
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(3, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffcc00 })
  );
  scene.add(sun);
  console.log('Sun added to scene');

  // Planet configuration
  const planetData = [
    { name: 'Mercury', color: 0xaaaaaa, distance: 6, size: 0.3 },
    { name: 'Venus', color: 0xffaa00, distance: 8, size: 0.6 },
    { name: 'Earth', color: 0x0000ff, distance: 10, size: 0.7 },
    { name: 'Mars', color: 0xff3300, distance: 12, size: 0.5 },
    { name: 'Jupiter', color: 0xff9900, distance: 16, size: 1.5 },
    { name: 'Saturn', color: 0xffff66, distance: 20, size: 1.2 },
    { name: 'Uranus', color: 0x66ccff, distance: 24, size: 1.0 },
    { name: 'Neptune', color: 0x3333ff, distance: 28, size: 1.0 },
  ];

  // Arrays and helpers
  const planets = [];
  const speeds = {}; // Each planet's orbital speed
  const labels = [];
  const controls = document.getElementById('controls');
  const raycaster = new THREE.Raycaster(); // For interaction
  const mouse = new THREE.Vector2(); // Mouse position normalized
  let hoveredIndex = -1;

  // Create planet meshes, speeds, labels, and UI controls
  planetData.forEach((data, index) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(data.size, 32, 32),
      new THREE.MeshStandardMaterial({ color: data.color })
    );
    mesh.userData = {
      angle: Math.random() * Math.PI * 2, // Random orbit start
      distance: data.distance,
    };
    scene.add(mesh);
    planets.push(mesh);
    speeds[data.name] = 0.01 + Math.random() * 0.01; // Random orbit speed

    // Create label for planet
    const label = document.createElement('div');
    label.className = 'planet-label';
    label.innerText = data.name;
    label.style.opacity = 0;
    document.body.appendChild(label);
    labels.push(label);

    // Create slider to control speed
    const group = document.createElement('div');
    group.className = 'control-group';
    group.innerHTML = `
      <label>${data.name}</label>
      <input type="range" min="0.001" max="0.05" step="0.001" value="${speeds[data.name]}">
    `;
    const input = group.querySelector('input');
    input.oninput = () => {
      speeds[data.name] = parseFloat(input.value);
      console.log(`Speed of ${data.name} changed to ${speeds[data.name]}`);
    };
    controls.appendChild(group);
  });

  // Pause/Resume animation button
  const pauseBtn = document.createElement('button');
  pauseBtn.id = 'toggleAnimation';
  pauseBtn.className = 'btn';
  pauseBtn.textContent = 'Pause';
  controls.appendChild(pauseBtn);

  let paused = false;
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.innerText = paused ? 'Resume' : 'Pause';
    console.log(`Animation ${paused ? 'paused' : 'resumed'}`);
  });

  // Toggle light/dark theme
  document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('light');
    console.log('Theme toggled');
  });

  // Camera reset on double-click
  const defaultLookAt = new THREE.Vector3(0, 0, 0);
  const cameraStart = new THREE.Vector3();
  const cameraEnd = new THREE.Vector3();
  let startTime = 0;
  let isResettingCamera = false;

  window.addEventListener('dblclick', () => {
    if (isResettingCamera) return;
    isResettingCamera = true;
    console.log('Double click detected. Resetting camera...');
    cameraStart.copy(camera.position);
    cameraEnd.copy(defaultCameraPosition);
    startTime = performance.now();

    function updateCamera() {
      const t = Math.min((performance.now() - startTime) / 1000, 1);
      camera.position.lerpVectors(cameraStart, cameraEnd, t);
      camera.lookAt(defaultLookAt);
      if (t < 1) requestAnimationFrame(updateCamera);
      else {
        isResettingCamera = false;
        console.log('Camera reset complete');
      }
    }

    updateCamera();
  });

  // Zoom camera to clicked planet
  let zooming = false;
  window.addEventListener('click', (event) => {
    if (zooming) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planets);

    if (intersects.length > 0) {
      const planet = intersects[0].object;
      console.log(`Clicked on ${planetData[planets.indexOf(planet)].name}`);
      zooming = true;
      const targetPosition = planet.position.clone().add(new THREE.Vector3(0, 2, 5));
      const startPosition = camera.position.clone();
      const lookAtTarget = planet.position.clone();
      const zoomStart = performance.now();

      function animateZoom() {
        const t = Math.min((performance.now() - zoomStart) / 1000, 1);
        camera.position.lerpVectors(startPosition, targetPosition, t);
        camera.lookAt(lookAtTarget);
        if (t < 1) requestAnimationFrame(animateZoom);
        else {
          zooming = false;
          console.log('Zoom animation complete');
        }
      }

      animateZoom();
    }
  });

  // Hover detection for label visibility
  window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planets);

    hoveredIndex = -1;
    if (intersects.length > 0) {
      const planet = intersects[0].object;
      hoveredIndex = planets.indexOf(planet);
    }
  });

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);

    // Rotate planets around the sun
    if (!paused) {
      planets.forEach((planet, i) => {
        const speed = speeds[planetData[i].name];
        planet.userData.angle += speed;
        planet.position.x = Math.cos(planet.userData.angle) * planet.userData.distance;
        planet.position.z = Math.sin(planet.userData.angle) * planet.userData.distance;
      });
    }

    // Update label positions on hover
    labels.forEach((label, i) => {
      if (i === hoveredIndex) {
        const pos = planets[i].position.clone().project(camera);
        const x = (pos.x + 1) / 2 * window.innerWidth;
        const y = (-pos.y + 1) / 2 * window.innerHeight;
        label.style.left = `${x}px`;
        label.style.top = `${y}px`;
        label.style.opacity = 1;
      } else {
        label.style.opacity = 0;
      }
    });

    renderer.render(scene, camera);
  }

  animate();

  // Handle window resize events
  window.addEventListener('resize', () => {
    console.log('Window resized. Updating camera and renderer...');
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.lookAt(0, 0, 0);
  });
});
