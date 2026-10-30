# Bhavik Parmar — Scroll Assembly Pyramid

A local-only animated website background study, made with 15 real CSS 3D cubes and a stage.

## Interaction

- Chapter 1: base row of 5 cubes is already stacked.
- Chapter 2 (education): 4 cubes fly up from scattered floor positions.
- Chapter 3 (certifications): another row of 3 assembles.
- Chapter 4 (projects): another row of 2 assembles.
- Chapter 5 (research paper): 1 final cube completes the pyramid.
- Scrolling back reverses the stacking, and the stage remains on the right on desktop.
- Smooth background change: Pearl Editorial -> Graphite Violet -> Deep Teal Laboratory.
- Prefers-reduced-motion: cubes switch positions without performing the flight path.

## Run locally in VS Code

1. Unzip the folder.
2. Open `index.html` with Live Server (or another local HTTP server).
3. Scroll slowly, or use the 01–05 bottom navigation.

No libraries, AWS credentials, login connections, or public endpoints are used.

## Files

- `index.html`: placeholder layout for the five chapters and the cube stage.
- `styles.scss`: editable Sass source.
- `styles.css`: ready-to-use CSS, so Sass compilation is **not** required just to run it.
- `script.js`: creates the 15 cubes and positions them according to scroll.

After editing Sass, compile it from this folder with `npx sass styles.scss styles.css --watch` after installing Sass locally. The included CSS already matches the supplied Sass source.

## Integrate into your current folder structure

Existing VS Code layout:

```
Portfolio - Web App/
  design/
    HTML/index.html
    CSS/styles.scss
    CSS/styles.css
  code/
    javascript/script.js
```

To try this **as a standalone design study**, copy `index.html` to `design/HTML/index.html`, both style files to `design/CSS/`, and `script.js` to `code/javascript/`. In the copied HTML change:

```
<link rel="stylesheet" href="styles.css">
<script src="script.js" defer></script>
```

to

```
<link rel="stylesheet" href="../CSS/styles.css">
<script src="../../code/javascript/script.js" defer></script>
```

**Back up your original files first.** This study deliberately replaces the earlier cartoon animations rather than running alongside them.

If you want to keep your original copy/header, instead move these named blocks into your existing HTML: `.pyramid-zone`, the `.chapter` sections, and `.chapter-nav`. Transfer the stage/chapter CSS and use this controller as the only animation controller. Avoid copying a second `body`, `header`, or duplicate `script` loader. The sections currently contain placeholders because your request focuses on building the background first.

## Tune the visual

- Cube width: `$cube-size` in `styles.scss` **and** `CUBE_SIZE` in `script.js` (keep equal).
- Row widths: `ROWS` array in `script.js`. Keep `[5,4,3,2,1]` for a 15-block pyramid.
- Scattered starting positions: `origins` in `script.js`.
- Palette blending: `themes` in `script.js`.
- Stage angle / zoom: `.world` transform in `styles.scss`.
- Flight arc: `arc` calculation in `script.js`.

Browser performance varies by device because all 15 cubes use CSS 3D. Reduce shadows/blur on low-powered devices if necessary.
