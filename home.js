import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

(() => {
  const canvas = document.getElementById("homeModel");
  const status = document.getElementById("homeModelStatus");
  const contactDialog = document.getElementById("contactDialog");
  const contactTrigger = document.querySelector(".contact-trigger");
  const contactClose = document.querySelector("[data-contact-close]");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.001, 100);
  const loader = new GLTFLoader();
  const models = new THREE.Group();
  let renderer;
  let controls;
  let resizeObserver;
  let animationFrame;

  contactTrigger.addEventListener("click", () => contactDialog.showModal());
  contactClose.addEventListener("click", () => contactDialog.close());

  function showError(message, error) {
    status.textContent = message;
    if (error) console.error(message, error);
  }

  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    controls = new OrbitControls(camera, canvas);
  } catch (error) {
    showError("3D preview is unavailable in this browser.", error);
    return;
  }

  scene.add(models);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6f7069, 2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(-3, 5, 6);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xd9e4ed, 1);
  fillLight.position.set(4, 1, -3);
  scene.add(fillLight);

  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1;
  controls.target.set(0, 0, 0);
  camera.position.set(0.65, 0.15, 1.3);

  async function loadModel(path, offset = 0) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Model request failed (${response.status}).`);
    const data = await response.arrayBuffer();
    const gltf = await new Promise((resolve, reject) => {
      loader.parse(data, "", resolve, reject);
    });
    if (!gltf.scene) throw new Error("The GLB does not contain a scene.");
    gltf.scene.position.z = offset;
    models.add(gltf.scene);
    return gltf.scene;
  }

  async function loadModels() {
    try {
      await loadModel("assets/gallery-covers/project%205/shape%20A%20glb.glb");
      const bounds = new THREE.Box3().setFromObject(models);
      if (bounds.isEmpty()) throw new Error("The preview models contain no visible geometry.");
      const sphere = bounds.getBoundingSphere(new THREE.Sphere());
      controls.target.copy(sphere.center);
      const distance = (sphere.radius * 0.95) / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2));
      camera.position.copy(sphere.center).add(new THREE.Vector3(0.35, 0.05, 1).normalize().multiplyScalar(distance));
      camera.near = Math.max(sphere.radius / 1000, 0.001);
      camera.far = distance + sphere.radius * 5;
      camera.updateProjectionMatrix();
      controls.update();
      controls.saveState();
      status.textContent = "Preview ready.";
      status.hidden = true;
    } catch (error) {
      showError("The 3D preview could not be loaded.", error);
    }
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    renderer.setSize(bounds.width, bounds.height, false);
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();
  }

  function animate() {
    animationFrame = window.requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();
  animate();
  loadModels();

  window.addEventListener("pagehide", () => {
    window.cancelAnimationFrame(animationFrame);
    resizeObserver.disconnect();
    controls.dispose();
    renderer.dispose();
  }, { once: true });
})();
