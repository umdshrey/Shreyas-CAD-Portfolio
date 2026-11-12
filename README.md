# Shreyas Nagaraju — 3D CAD Portfolio

An interactive, scroll-driven 3D portfolio built from the *Shreyas Nagaraju CAD Portfolio* deck.
Every project has a live, real-time 3D model (PBR materials, studio lighting, soft shadows) that you can
orbit, explode, X-ray / cut away and animate, alongside the original drawings, renders, BOMs and animations.

Projects: Solid Edge certification · Sheet metal bracket (TPU) · Sheet metal mounting bracket (ABS) · Motor bracket (PETG) · Bush-pin coupling · Double bearing ·
Four-branch exhaust manifold · Sliding vise · Radial engine · Three-piece ball valve · Crane hook ·
Inline-four engine · 4DOF robotic arm · Quadcopter drone · Jet engine · V6 engine.

No build step: plain HTML/CSS/JS with [three.js](https://threejs.org) loaded from a CDN.

## Publish on GitHub Pages

1. Create a new repository on GitHub (for example `cad-portfolio`). For a site at `https://<username>.github.io/`, name it `<username>.github.io`.
2. Upload this whole folder (`index.html`, `css/`, `js/`, `assets/`, `.nojekyll`), either with GitHub Desktop or:
   ```bash
   git init
   git add .
   git commit -m "3D CAD portfolio"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```
3. In the repository go to **Settings → Pages**, set **Source** to *Deploy from a branch*, choose `main` and `/ (root)`, then **Save**.
4. After a minute the site is live at `https://<username>.github.io/<repo>/`.

The `assets/` folder is about 57 MB; the largest single file is a 24 MB video, well under GitHub's 100 MB per-file limit.

## Run locally

ES modules don't load from `file://`, so serve the folder:

```bash
python -m http.server 8000
```

Then open http://localhost:8000. (Python's simple server can't seek inside videos; trimmed V6 clips start from 0 locally but seek correctly on GitHub Pages.)

## Editing

| What | Where |
| --- | --- |
| Text, captions, gallery order, contact links | `js/content.js` (add LinkedIn / email to `profile.links`) |
| 3D models, materials, animations | `js/models.js` (one `build…()` function per project) |
| Scene, lighting, camera, viewer controls, lightbox | `js/main.js` |
| Studio backdrop, light beams, dust, transition effects | `js/stage.js` |
| Look and layout | `css/style.css` |
| Images / videos | `assets/img`, `assets/thumb` (WebP), `assets/video` (MP4) |
