EYEWEAR HOME, PROJECT GALLERY, AND CONFIGURATOR

Open index.html for the home page, gallery.html to browse the project
collection, or configurator.html to open the standalone eyewear configurator.
The home page pairs a live 3D Modern Design preview with scrolling product
photography. The configurator is the only page with model loading and viewing
controls. Project pages display product photos, which can be selected to open
the full-screen image gallery.

CONFIGURATOR MODEL VIEWER

Choose a self-contained GLB file or drop it into the configurator viewer. Model
files are read locally in your browser and are not uploaded. The bundled face
model can be shown or hidden with the Show face option. The viewer supports
orbit, pan, zoom, standard views, fit, reset, and auto-rotation.
GLB files larger than 70 MB and formats that need external companion files
are not supported. The viewer loads Three.js from jsDelivr, so an internet
connection is required to initialize the 3D preview.

PROJECT CARDS

The Classic Acetate, Fashion Acetate, Rounded Metal Design, and Project 4
gallery cards open image-based project detail pages. Modern Design uses the
five WebP product views in assets/gallery-covers/project 5/ and opens its GLB
model in the configurator. Rounded Metal Design uses the five WebP images in
assets/gallery-covers/project 3/; Project 4 uses the four WebP images in
assets/gallery-covers/project 4/.

Projects added through admin.html are stored in project-data.json and appear
alongside the existing cards. Each project needs a WebP cover image of up to
10 MB. Project cover images are stored under assets/projects/<project-id>/.
Use the theme button to switch between light and dark modes. The selection is
shared by the site pages and remembered in the current browser.

PUBLISHING WITH GITHUB PAGES

1. Push this complete site to a GitHub repository. The included Pages workflow
   publishes commits on the main branch. If you use a different branch, edit
   .github/workflows/pages.yml to match it.
2. In the repository, open Settings > Pages and set the build and deployment
   source to GitHub Actions.
3. Open admin.html on the deployed site. Enter the repository owner, repository
   name, and publishing branch.
4. Create a fine-grained GitHub token restricted to this repository with
   Contents: Read and write. Enter it for the publish operation only; the admin
   page never stores it.
5. Enter the project details, choose a WebP cover image (up to 10 MB), and
   select Publish project. The admin page uploads the image and
   project-data.json in one commit. The Actions workflow then deploys the
   updated gallery.

For repositories that have not added project-data.json yet, the admin page
creates it on the first publish.

LOCAL PREVIEW

Open index.html to browse the static pages directly. Browser security prevents
project GLB files from loading from file:// URLs; use a web host to preview
bundled project models. User-selected GLB files can still be opened directly
in the configurator.
