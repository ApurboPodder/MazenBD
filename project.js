(() => {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("project");
  const title = document.getElementById("projectTitle");
  const category = document.getElementById("projectCategory");
  const description = document.getElementById("projectDescription");
  const images = document.getElementById("projectImages");
  const configuratorLink = document.getElementById("projectConfiguratorLink");
  const status = document.getElementById("projectStatus");
  const lightbox = document.getElementById("projectImageLightbox");
  const lightboxImage = document.getElementById("projectImageLightboxImage");
  const lightboxCaption = document.getElementById("projectImageLightboxCaption");
  let projectImages = [];
  let activeImageIndex = 0;

  function showImage(index) {
    activeImageIndex = (index + projectImages.length) % projectImages.length;
    const image = projectImages[activeImageIndex];
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    lightboxCaption.textContent = `${activeImageIndex + 1} / ${projectImages.length} · ${image.alt}`;
  }

  function openImage(index) {
    if (!projectImages.length) return;
    showImage(index);
    lightbox.showModal();
  }

  document.getElementById("projectImageLightboxClose").addEventListener("click", () => {
    lightbox.close();
  });
  document.getElementById("projectImageLightboxPrevious").addEventListener("click", () => {
    showImage(activeImageIndex - 1);
  });
  document.getElementById("projectImageLightboxNext").addEventListener("click", () => {
    showImage(activeImageIndex + 1);
  });
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });
  document.addEventListener("keydown", (event) => {
    if (!lightbox.open) return;
    if (event.key === "Escape") {
      lightbox.close();
      return;
    }
    if (event.key === "ArrowLeft") showImage(activeImageIndex - 1);
    if (event.key === "ArrowRight") showImage(activeImageIndex + 1);
  });

  function setProject(project, photos = []) {
    document.title = `${project.title} — Mazen(BD) Industries LTD`;
    title.textContent = project.title;
    category.textContent = project.category.toUpperCase();
    description.textContent = project.description;
    status.textContent = "";
    configuratorLink.hidden = true;
    if (project.model) {
      const configuratorUrl = new URL("configurator.html", window.location.href);
      configuratorUrl.searchParams.set("model", project.model);
      configuratorLink.href = configuratorUrl.href;
      configuratorLink.hidden = false;
    }

    const imagePaths = photos.length ? photos : (project.cover ? [project.cover] : []);
    projectImages = imagePaths.map((path, index) => ({
      src: path,
      alt: `${project.title} product view ${index + 1}`,
    }));
    projectImages.forEach((projectImage, index) => {
      const figure = document.createElement("figure");
      figure.className = "project-detail-image";
      const image = document.createElement("img");
      image.src = projectImage.src;
      image.alt = projectImage.alt;
      image.loading = index === 0 ? "eager" : "lazy";
      const button = document.createElement("button");
      button.className = "project-detail-image-button";
      button.type = "button";
      button.setAttribute("aria-label", `View ${project.title} image ${index + 1} full screen`);
      button.addEventListener("click", () => openImage(index));
      button.append(image);
      figure.append(button);
      images.append(figure);
    });
  }

  async function loadProject() {
    if (!projectId) {
      status.textContent = "No project was selected. Return to the project gallery and choose a card.";
      title.textContent = "Project not found";
      return;
    }

    const builtInProjects = {
      "2": {
        id: "2",
        title: "Fashion Acetate",
        category: "Eyewear design",
        description: "A distinctive violet-patterned acetate frame, shown from every angle.",
        photos: [
          "assets/gallery-covers/project%202/1.webp",
          "assets/gallery-covers/project%202/2.webp",
          "assets/gallery-covers/project%202/3.webp",
          "assets/gallery-covers/project%202/4.webp",
        ],
      },
      "1": {
        id: "1",
        title: "Classic Acetate",
        category: "Eyewear design",
        description: "A rounded silhouette with a confident acetate profile, made for everyday wear.",
        photos: ["assets/gallery-covers/1.webp"],
      },
      "3": {
        id: "3",
        title: "Rounded Metal Design",
        category: "Eyewear design",
        description: "A new eyewear design concept, shown from multiple views.",
        photos: [
          "assets/gallery-covers/project%203/1-1.webp",
          "assets/gallery-covers/project%203/1-2.webp",
          "assets/gallery-covers/project%203/1-3.webp",
          "assets/gallery-covers/project%203/1-4.webp",
          "assets/gallery-covers/project%203/1-5.webp",
        ],
      },
      "4": {
        id: "4",
        title: "Project 4",
        category: "Eyewear design",
        description: "A new eyewear design concept, presented in four product views.",
        photos: [
          "assets/gallery-covers/project%204/1.webp",
          "assets/gallery-covers/project%204/2.webp",
          "assets/gallery-covers/project%204/3.webp",
          "assets/gallery-covers/project%204/4.webp",
        ],
      },
      "5": {
        id: "5",
        title: "Modern Design",
        category: "Eyewear design",
        description: "A contemporary eyewear study, presented in five product views.",
        photos: [
          "assets/gallery-covers/project%205/shape%201%201.webp",
          "assets/gallery-covers/project%205/shape%201%202.webp",
          "assets/gallery-covers/project%205/shape%201%203.webp",
          "assets/gallery-covers/project%205/shape%201%205.webp",
          "assets/gallery-covers/project%205/shape%201%206.webp",
        ],
        model: "assets/gallery-covers/project 5/shape A glb.glb",
      },
    };

    if (builtInProjects[projectId]) {
      const project = builtInProjects[projectId];
      setProject(project, project.photos);
      return;
    }

    try {
      const response = await fetch("project-data.json", { cache: "no-cache" });
      if (!response.ok) throw new Error(`Project list request failed (${response.status}).`);
      const projects = await response.json();
      if (!Array.isArray(projects)) throw new Error("The project list has an invalid format.");
      const project = projects.find((item) => item && item.id === projectId);
      if (!project) throw new Error("That project could not be found.");
      if (
        typeof project.title !== "string" ||
        typeof project.category !== "string" ||
        typeof project.description !== "string"
      ) {
        throw new Error("The project entry is missing required details.");
      }
      setProject(project);
    } catch (error) {
      status.textContent = `This project could not be loaded: ${error.message}`;
      console.error("Could not load project details", error);
    }
  }

  loadProject();
})();
