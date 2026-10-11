(() => {
  const form = document.getElementById("projectForm");
  const publishButton = document.getElementById("publishButton");
  const status = document.getElementById("publishStatus");
  const ownerInput = document.getElementById("repoOwner");
  const repositoryInput = document.getElementById("repoName");
  const repositorySuggestions = document.getElementById("repositorySuggestions");
  const repoSearchStatus = document.getElementById("repoSearchStatus");
  let repoSearchTimer;
  let repoSearchController;
  let repoSearchSequence = 0;

  class GitHubRequestError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
    }
  }

  function showStatus(message, state = "") {
    status.textContent = message;
    status.dataset.state = state;
  }

  async function searchRepositories(owner) {
    const sequence = ++repoSearchSequence;
    if (repoSearchController) repoSearchController.abort();
    repoSearchController = new AbortController();
    repositorySuggestions.replaceChildren();
    repoSearchStatus.textContent = `Searching public repositories for ${owner}…`;

    try {
      const encodedOwner = encodeURIComponent(owner);
      let response = await fetch(
        `https://api.github.com/users/${encodedOwner}/repos?per_page=100&sort=updated`,
        {
          headers: { Accept: "application/vnd.github+json" },
          signal: repoSearchController.signal,
        }
      );
      if (response.status === 404) {
        response = await fetch(
          `https://api.github.com/orgs/${encodedOwner}/repos?per_page=100&sort=updated`,
          {
            headers: { Accept: "application/vnd.github+json" },
            signal: repoSearchController.signal,
          }
        );
      }
      const repositories = await response.json();
      if (!response.ok) {
        throw new Error(repositories.message || `GitHub repository search failed (${response.status}).`);
      }
      if (!Array.isArray(repositories)) {
        throw new Error("GitHub returned an invalid repository list.");
      }
      if (sequence !== repoSearchSequence) return;

      repositories
        .filter((repository) => repository && typeof repository.name === "string")
        .sort((first, second) =>
          Number(Boolean(second.has_pages)) - Number(Boolean(first.has_pages)) ||
          first.name.localeCompare(second.name)
        )
        .forEach((repository) => {
          const option = document.createElement("option");
          option.value = repository.name;
          option.label = repository.has_pages ? `${repository.name} · GitHub Pages enabled` : repository.name;
          repositorySuggestions.append(option);
        });

      const publicCount = repositorySuggestions.options.length;
      const pagesCount = repositories.filter((repository) => repository?.has_pages).length;
      repoSearchStatus.textContent = publicCount
        ? `Found ${publicCount} public repositories${publicCount === 100 ? " (showing up to 100)" : ""}; ${pagesCount} have GitHub Pages enabled. Private repositories can be entered manually.`
        : "No public repositories found. You can still enter a private repository name manually.";
    } catch (error) {
      if (error.name === "AbortError" || sequence !== repoSearchSequence) return;
      repoSearchStatus.textContent = `Could not search repositories: ${error.message} You can still enter the repository name manually.`;
    }
  }

  ownerInput.addEventListener("input", () => {
    window.clearTimeout(repoSearchTimer);
    repoSearchSequence += 1;
    if (repoSearchController) repoSearchController.abort();
    repositorySuggestions.replaceChildren();
    const owner = ownerInput.value.trim();
    if (!owner) {
      repoSearchStatus.textContent = "Enter an account name to search its public GitHub repositories. Private repositories can be entered manually.";
      return;
    }
    repoSearchStatus.textContent = "Waiting to search GitHub…";
    repoSearchTimer = window.setTimeout(() => searchRepositories(owner), 350);
  });

  function fileToBase64(file) {
    return file.arrayBuffer().then((buffer) => {
      const bytes = new Uint8Array(buffer);
      let binary = "";
      const chunkSize = 0x8000;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
      }
      return btoa(binary);
    });
  }

  function textToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return btoa(binary);
  }

  async function githubRequest(apiUrl, token, options = {}) {
    const response = await fetch(apiUrl, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
    let result;
    try {
      result = await response.json();
    } catch {
      throw new GitHubRequestError(
        `GitHub returned an unreadable response (${response.status}).`,
        response.status
      );
    }
    if (!response.ok) {
      throw new GitHubRequestError(
        result.message || `GitHub API request failed (${response.status}).`,
        response.status
      );
    }
    return result;
  }

  function createSlug(title) {
    const slug = title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!slug) throw new Error("Enter a title that contains at least one letter or number.");
    return slug;
  }

  async function publishProject(event) {
    event.preventDefault();
    showStatus("");

    const owner = document.getElementById("repoOwner").value.trim();
    const repository = document.getElementById("repoName").value.trim();
    const branch = document.getElementById("repoBranch").value.trim();
    const tokenInput = document.getElementById("githubToken");
    const token = tokenInput.value.trim();
    const title = document.getElementById("projectTitle").value.trim();
    const category = document.getElementById("projectCategory").value.trim();
    const description = document.getElementById("projectDescription").value.trim();
    const coverFile = document.getElementById("coverFile").files[0];

    if (!owner || !repository || !branch || !token || !title || !category || !description || !coverFile) {
      showStatus("Complete all required fields and choose a WebP cover image.", "error");
      return;
    }
    if (coverFile && (coverFile.type !== "image/webp" || !coverFile.name.toLowerCase().endsWith(".webp"))) {
      showStatus("The cover image must be a WebP (.webp) file.", "error");
      return;
    }
    if (coverFile && coverFile.size > 10 * 1024 * 1024) {
      showStatus("The cover image exceeds the 10 MB upload limit.", "error");
      return;
    }

    publishButton.disabled = true;
    try {
      showStatus("Checking repository and preparing files…");
      const apiRoot = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;
      const encodedBranch = encodeURIComponent(branch);
      const ref = await githubRequest(`${apiRoot}/git/ref/heads/${encodedBranch}`, token);
      const parentSha = ref.object.sha;
      const parent = await githubRequest(`${apiRoot}/git/commits/${parentSha}`, token);
      const projectDataUrl = `${apiRoot}/contents/project-data.json?ref=${encodeURIComponent(parentSha)}`;
      let projects = [];
      try {
        const dataFile = await githubRequest(projectDataUrl, token);
        const decoded = new TextDecoder().decode(
          Uint8Array.from(atob(dataFile.content.replace(/\s/g, "")), (character) => character.charCodeAt(0))
        );
        projects = JSON.parse(decoded);
        if (!Array.isArray(projects)) {
          throw new Error("The repository project-data.json must contain a JSON array.");
        }
      } catch (error) {
        if (!(error instanceof GitHubRequestError) || error.statusCode !== 404) throw error;
      }

      const idBase = createSlug(title);
      let id = idBase;
      let suffix = 2;
      while (projects.some((project) => project && project.id === id)) {
        id = `${idBase}-${suffix}`;
        suffix += 1;
      }
      const projectDirectory = `assets/projects/${id}`;
      const coverPath = `${projectDirectory}/cover.webp`;
      const project = { id, title, category, description, cover: coverPath };
      projects.push(project);

      const files = [
        { path: coverPath, content: await fileToBase64(coverFile) },
        {
          path: "project-data.json",
          content: textToBase64(`${JSON.stringify(projects, null, 2)}\n`),
        },
      ];
      const treeEntries = [];
      for (let index = 0; index < files.length; index += 1) {
        showStatus(`Uploading file ${index + 1} of ${files.length}…`);
        const blob = await githubRequest(`${apiRoot}/git/blobs`, token, {
          method: "POST",
          body: JSON.stringify({ content: files[index].content, encoding: "base64" }),
        });
        treeEntries.push({
          path: files[index].path,
          mode: "100644",
          type: "blob",
          sha: blob.sha,
        });
      }

      showStatus("Creating a single project commit…");
      const tree = await githubRequest(`${apiRoot}/git/trees`, token, {
        method: "POST",
        body: JSON.stringify({ base_tree: parent.tree.sha, tree: treeEntries }),
      });
      const commit = await githubRequest(`${apiRoot}/git/commits`, token, {
        method: "POST",
        body: JSON.stringify({
          message: `Add project: ${title}`,
          tree: tree.sha,
          parents: [parentSha],
        }),
      });
      await githubRequest(`${apiRoot}/git/refs/heads/${encodedBranch}`, token, {
        method: "PATCH",
        body: JSON.stringify({ sha: commit.sha, force: false }),
      });

      showStatus("Project committed successfully. GitHub Pages will publish it when the workflow finishes.", "success");
      form.reset();
      document.getElementById("repoBranch").value = branch;
    } catch (error) {
      showStatus(`Could not publish project: ${error.message}`, "error");
      console.error("Could not publish project to GitHub", error);
    } finally {
      tokenInput.value = "";
      publishButton.disabled = false;
    }
  }

  form.addEventListener("submit", publishProject);
})();
