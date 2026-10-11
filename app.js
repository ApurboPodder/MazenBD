import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

(() => {
  const stage = document.getElementById("modelStage");
  const canvas = document.getElementById("modelCanvas");
  const fileInput = document.getElementById("modelFile");
  const modelName = document.getElementById("modelName");
  const modelStatus = document.getElementById("modelStatus");
  const emptyPrompt = document.getElementById("emptyPrompt");
  const errorMessage = document.getElementById("modelError");
  const dropOverlay = document.getElementById("dropOverlay");
  const chooseModelButton = document.getElementById("chooseModel");
  const clearModelButton = document.getElementById("clearModel");
  const autoRotateInput = document.getElementById("autoRotate");
  const showFaceInput = document.getElementById("showFace");
  const loader = new GLTFLoader();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
  let renderer;
  let controls;
  let activeModel;
  let faceModel;
  let resizeObserver;
  let animationFrame;
  let viewTransition;

  function setError(message, error) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
    modelStatus.textContent = message;
    if (error) console.error(message, error);
  }

  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(document.body.classList.contains("dark-theme") ? 0x232428 : 0xe8e7e3, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    controls = new OrbitControls(camera, renderer.domElement);
  } catch (error) {
    setError("A WebGL-capable browser is required to display 3D models.", error);
    chooseModelButton.disabled = true;
    return;
  }

  scene.add(new THREE.HemisphereLight(0xffffff, 0x6f7379, 2.1));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  keyLight.position.set(-4, 6, 7);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xd3e3ff, 1.1);
  fillLight.position.set(5, 1, -4);
  scene.add(fillLight);

  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotateSpeed = 1.2;
  camera.position.set(0, 0, 5);
  controls.target.set(0, 0, 0);
  controls.update();

  function disposeModel(model) {
    model.traverse((node) => {
      if (!node.isMesh) return;
      node.geometry?.dispose();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        if (!material) return;
        Object.values(material).forEach((value) => {
          if (value && value.isTexture) value.dispose();
        });
        material.dispose();
      });
    });
  }

  function updateFaceVisibility() {
    if (faceModel) faceModel.visible = showFaceInput.checked && Boolean(activeModel);
  }

  function clearModel() {
    cancelViewTransition();
    if (activeModel) {
      scene.remove(activeModel);
      disposeModel(activeModel);
      activeModel = null;
    }
    updateFaceVisibility();
    modelName.textContent = "Eyewear preview";
    modelStatus.textContent = "Ready for a self-contained .glb model.";
    emptyPrompt.hidden = false;
    clearModelButton.hidden = true;
    errorMessage.hidden = true;
  }

  function cancelViewTransition() {
    if (!viewTransition) return;
    viewTransition = null;
    controls.enabled = true;
    controls.enableDamping = true;
  }

  function fitModel(preserveDirection = false) {
    if (!activeModel) return;

    const direction = camera.position.clone().sub(controls.target);
    if (preserveDirection && direction.lengthSq() > 0) direction.normalize();
    else direction.set(0.22, 0, 1).normalize();

    activeModel.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(activeModel);
    if (faceModel?.visible) bounds.union(new THREE.Box3().setFromObject(faceModel));
    if (bounds.isEmpty()) throw new Error("The selected model contains no visible geometry.");
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    if (!Number.isFinite(sphere.radius) || sphere.radius <= 0) {
      throw new Error("The selected model has invalid dimensions.");
    }

    controls.target.copy(sphere.center);
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
    const limitingFov = Math.min(verticalFov, horizontalFov);
    const distance = (sphere.radius * 1.25) / Math.sin(limitingFov / 2);
    camera.near = Math.max(sphere.radius / 1000, 0.001);
    camera.far = distance + sphere.radius * 5;
    camera.position.copy(sphere.center).addScaledVector(direction, distance);
    camera.up.set(0, 1, 0);
    camera.updateProjectionMatrix();
    controls.update();
    controls.saveState();
  }

  function setStandardView(view) {
    if (!activeModel) return;
    cancelViewTransition();
    autoRotateInput.checked = false;
    controls.autoRotate = false;
    controls.enableDamping = false;
    controls.update();
    const distance = Math.max(camera.position.distanceTo(controls.target), 1);
    const direction = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    if (view === "right") {
      direction.set(1, 0, 0);
    } else if (view === "top") {
      direction.set(0, 1, 0);
      up.set(0, 0, -1);
    } else {
      direction.set(0, 0, 1);
    }
    viewTransition = {
      startedAt: performance.now(),
      duration: 600,
      distance,
      fromDirection: camera.position.clone().sub(controls.target).normalize(),
      toDirection: direction,
      fromUp: camera.up.clone(),
      toUp: up,
    };
    controls.enabled = false;
  }

  async function loadModel(file) {
    if (!file) return;
    cancelViewTransition();
    errorMessage.hidden = true;
    if (!file.name.toLowerCase().endsWith(".glb")) {
      setError("Choose a self-contained .glb file. Other formats and external companion files are not supported.");
      return;
    }
    if (file.size > 70 * 1024 * 1024) {
      setError("This GLB is larger than the 70 MB file limit.");
      return;
    }

    modelStatus.textContent = "Loading model…";
    try {
      const data = await file.arrayBuffer();
      const gltf = await new Promise((resolve, reject) => {
        loader.parse(data, "", resolve, reject);
      });
      const nextModel = gltf.scene;
      if (!nextModel) throw new Error("The GLB file does not contain a scene.");
      const nextBounds = new THREE.Box3().setFromObject(nextModel);
      if (nextBounds.isEmpty()) throw new Error("The GLB file does not contain visible geometry.");

      if (activeModel) {
        scene.remove(activeModel);
        disposeModel(activeModel);
      }
      activeModel = nextModel;
      scene.add(activeModel);
      updateFaceVisibility();
      emptyPrompt.hidden = true;
      clearModelButton.hidden = false;
      modelName.textContent = "Eyewear preview";
      fitModel();
      modelStatus.textContent = "Model loaded.";
    } catch (error) {
      setError(`Could not load the model: ${error.message}`, error);
    }
  }

  async function loadModelFromUrl(modelPath) {
    if (window.location.protocol === "file:") {
      setError("Project models can only be loaded when the site is opened from a web server.");
      return;
    }

    try {
      const modelUrl = new URL(modelPath, window.location.href);
      if (
        modelUrl.origin !== window.location.origin ||
        !modelUrl.pathname.startsWith("/assets/") ||
        !modelUrl.pathname.toLowerCase().endsWith(".glb")
      ) {
        throw new Error("Only same-site GLB files in the assets folder can be opened.");
      }

      modelStatus.textContent = "Loading project model…";
      const response = await fetch(modelUrl);
      if (!response.ok) throw new Error(`Model request failed (${response.status}).`);
      const blob = await response.blob();
      if (blob.size > 70 * 1024 * 1024) throw new Error("This GLB is larger than the 70 MB file limit.");
      await loadModel(new File([blob], decodeURIComponent(modelUrl.pathname.split("/").pop()), {
        type: "model/gltf-binary",
      }));
    } catch (error) {
      setError(`Could not open the project model: ${error.message}`, error);
    }
  }

  async function loadFaceModel() {
    try {
      const response = await fetch("assets/face/face%201.glb");
      if (!response.ok) throw new Error(`Face model request failed (${response.status}).`);
      const data = await response.arrayBuffer();
      const gltf = await new Promise((resolve, reject) => {
        loader.parse(data, "", resolve, reject);
      });
      faceModel = gltf.scene;
      if (!faceModel) throw new Error("The face GLB does not contain a scene.");
      faceModel.position.z = -0.05;
      faceModel.visible = false;
      scene.add(faceModel);
      showFaceInput.disabled = false;
      updateFaceVisibility();
      if (activeModel && showFaceInput.checked) fitModel(true);
    } catch (error) {
      showFaceInput.checked = false;
      showFaceInput.disabled = true;
      setError(`Could not load the face model: ${error.message}`, error);
    }
  }

  function resizeRenderer() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (activeModel) fitModel(true);
  }

  function animate() {
    animationFrame = window.requestAnimationFrame(animate);
    if (viewTransition) {
      const progress = Math.min((performance.now() - viewTransition.startedAt) / viewTransition.duration, 1);
      const easedProgress = progress * progress * (3 - 2 * progress);
      const rotation = new THREE.Quaternion().setFromUnitVectors(
        viewTransition.fromDirection,
        viewTransition.toDirection
      );
      rotation.slerp(new THREE.Quaternion(), 1 - easedProgress);
      const direction = viewTransition.fromDirection.clone().applyQuaternion(rotation);
      camera.position.copy(controls.target).addScaledVector(direction, viewTransition.distance);
      camera.up.lerpVectors(viewTransition.fromUp, viewTransition.toUp, easedProgress).normalize();
      camera.lookAt(controls.target);
      if (progress === 1) {
        viewTransition = null;
        controls.enabled = true;
        controls.enableDamping = true;
        controls.saveState();
      }
    }
    controls.autoRotate = !viewTransition && autoRotateInput.checked && Boolean(activeModel);
    controls.update();
    renderer.render(scene, camera);
  }

  function handleFiles(files) {
    const file = [...files].find((candidate) => candidate.name.toLowerCase().endsWith(".glb"));
    if (!file) {
      setError("Drop a self-contained .glb model to open it.");
      return;
    }
    loadModel(file);
  }

  chooseModelButton.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    loadModel(fileInput.files[0]);
    fileInput.value = "";
  });
  clearModelButton.addEventListener("click", clearModel);
  showFaceInput.addEventListener("change", () => {
    updateFaceVisibility();
    if (activeModel) fitModel(true);
  });
  document.getElementById("fitModel").addEventListener("click", () => {
    try {
      fitModel(true);
    } catch (error) {
      setError(error.message, error);
    }
  });
  document.getElementById("resetView").addEventListener("click", () => {
    if (activeModel) setStandardView("front");
    else {
      camera.position.set(0, 0, 5);
      controls.target.set(0, 0, 0);
      controls.update();
    }
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setStandardView(button.dataset.view));
  });

  stage.addEventListener("dragenter", (event) => {
    event.preventDefault();
    stage.classList.add("dragging");
  });
  stage.addEventListener("dragover", (event) => event.preventDefault());
  stage.addEventListener("dragleave", (event) => {
    if (!stage.contains(event.relatedTarget)) stage.classList.remove("dragging");
  });
  stage.addEventListener("drop", (event) => {
    event.preventDefault();
    stage.classList.remove("dragging");
    handleFiles(event.dataTransfer.files);
  });

  document.addEventListener("site-theme-change", (event) => {
    renderer.setClearColor(event.detail.isDark ? 0x232428 : 0xe8e7e3, 1);
  });

  resizeObserver = new ResizeObserver(resizeRenderer);
  resizeObserver.observe(stage);
  resizeRenderer();
  animate();
  const modelPath = new URLSearchParams(window.location.search).get("model");
  if (modelPath) showFaceInput.checked = false;
  loadFaceModel();
  if (modelPath) loadModelFromUrl(modelPath);

  window.addEventListener("pagehide", () => {
    window.cancelAnimationFrame(animationFrame);
    resizeObserver.disconnect();
    controls.dispose();
    if (activeModel) disposeModel(activeModel);
    if (faceModel) disposeModel(faceModel);
    renderer.dispose();
  }, { once: true });
})();
