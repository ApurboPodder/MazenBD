(() => {
  const grid = document.querySelector(".project-grid");
  const status = document.getElementById("galleryDataStatus");
  if (!grid || !status) return;

  function createProjectCard(project, index) {
    const card = document.createElement("article");
    card.className = "project-card";

    const projectUrl = new URL("project.html", window.location.href);
    projectUrl.searchParams.set("project", project.id);

    const artLink = document.createElement("a");
    artLink.className = "project-art";
    artLink.href = projectUrl.href;
    artLink.setAttribute("aria-label", `View ${project.title} project details`);

    const number = document.createElement("span");
    number.className = "project-number";
    number.textContent = `${String(index).padStart(2, "0")} / ${project.category.toUpperCase()}`;
    artLink.append(number);

    if (project.cover) {
      const cover = document.createElement("img");
      cover.className = "project-dynamic-cover";
      cover.src = project.cover;
      cover.alt = `${project.title} project cover`;
      artLink.append(cover);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "project-cover-placeholder";
      placeholder.textContent = "NO COVER IMAGE";
      placeholder.setAttribute("aria-hidden", "true");
      artLink.append(placeholder);
    }

    const caption = document.createElement("span");
    caption.className = "art-caption";
    caption.textContent = project.category.toUpperCase();
    artLink.append(caption);

    const copy = document.createElement("div");
    copy.className = "project-copy";
    const meta = document.createElement("div");
    meta.className = "project-meta";
    const metaCategory = document.createElement("span");
    metaCategory.textContent = project.category;
    const metaNumber = document.createElement("span");
    metaNumber.textContent = String(index).padStart(2, "0");
    meta.append(metaCategory, metaNumber);

    const title = document.createElement("h2");
    title.textContent = project.title;
    const description = document.createElement("p");
    description.textContent = project.description;
    const cta = document.createElement("a");
    cta.className = "project-cta";
    cta.href = projectUrl.href;
    cta.append(document.createTextNode("View project "));
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";
    cta.append(arrow);

    copy.append(meta, title, description, cta);
    card.append(artLink, copy);
    return card;
  }

  async function loadProjects() {
    try {
      const response = await fetch("project-data.json", { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`Project list request failed (${response.status}).`);
      }
      const projects = await response.json();
      if (!Array.isArray(projects)) {
        throw new Error("The project list has an invalid format.");
      }

      projects.forEach((project, index) => {
        if (
          !project ||
          typeof project.id !== "string" ||
          typeof project.title !== "string" ||
          typeof project.category !== "string" ||
          typeof project.description !== "string"
        ) {
          throw new Error("A project entry is missing required details.");
        }
        grid.append(createProjectCard(project, index + 5));
      });
    } catch (error) {
      status.textContent = `Additional projects could not be loaded: ${error.message}`;
      console.error("Could not load additional project cards", error);
    }
  }

  loadProjects();
})();
