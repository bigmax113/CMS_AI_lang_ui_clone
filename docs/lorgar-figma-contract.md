# LORGAR Public Front Figma Contract

The public LORGAR frontend is implemented from the local Figma source file, not from screenshots or the legacy live site.

## Source

- Source file: `C:/AI_model/xml/Lorgar.fig`
- Extraction script: `scripts/extract-lorgar-figma.mjs`
- Parsed artifacts: `figma_source/parsed/`
- Primary article frame: `113:13285`
- Parent desktop frame: `15:6649`

## Required Desktop Geometry

These values are read from `figma_source/parsed/frame-113-13285-tree.json`.

- Page frame: `1920 x 3286`
- Header frame `Menu/Desktop`: `1920 x 82`
- Header inner block `Top Block`: `1400 x 82`, `x = 260`
- Brand group: `247 x 42`
- Logo: `132 x 42`
- Top navigation: `616 x 24`
- Top navigation labels: `SOLUTIONS`, `PRODUCTS`, `FOR USERS`, `LORGAR PLATFORM`, `WHERE TO BUY`
- Header right block: `132 x 24`
- Main content column: `893px`
- Sidebar column: `423px`
- Content/sidebar gap: `100px`
- Cover image: `893 x 396`
- Sidebar section width: `423px`
- Footer frame: `1920 x 248`
- Footer head menu: `1416 x 50`, `x = 252`
- Footer sub menu: `1416 x 24`, `x = 252`

## Component Mapping

- `Menu/Desktop` -> `LorgarHeader`
- Header brand group -> `LorgarLogo` + `Blog` label
- Header navigation -> `lorgarPrimaryNavItems`
- Header right block -> search + language controls
- Main article column -> `LorgarArticleLayout` article body
- Sidebar topics/recent/popular -> `LorgarArticleSidebar`
- Related cards -> `LorgarRelatedSection`
- Subscribe block -> `LorgarSubscribe`
- Footer -> `LorgarFooter`

## Implementation Rule

Any visual change to the public LORGAR frontend must be traceable to `Lorgar.fig` or explicitly documented as a functional CMS requirement. Do not use the legacy live site as the structure source. The live site can only be used to confirm brand assets or final destination URLs when Figma does not define an interaction target.
