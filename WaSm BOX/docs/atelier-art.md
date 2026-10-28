# Atelier illustration

The active theme uses original code-native pencil studies in `frontend/src/components/Sketchbook.tsx`: botanical branches, architectural arches, waves, orbital drawings and geometric knots. Shared page shells cover the workspace, authentication, administration and public bot pages. The cottage below is a superseded exploration and is no longer displayed.

Generated with the built-in imagegen tool; no CLI fallback.
Asset: frontend/public/images/atelier-cottage.png

Prompt:
Use case: illustration-story. Asset type: landscape illustration for a refined website dashboard welcome card. Create an original antique graphite pencil sketch of a quiet old timber cottage courtyard with bare branching trees and a low brick wall, inspired by a traditional architectural sketchbook. Delicate hand drawn crosshatching, imperfect expressive graphite lines, natural soft eraser marks, warm ivory paper. Landscape 3:2 composition, open pale sky, fade outer edges naturally into blank ivory paper. Calm, nostalgic, elegant, subtle and light rather than spooky. No text, no logos, no people, no UI, no frame. Graphite grey and warm ivory only.

## Artist paper — 2026-10-15

Active raster asset: `frontend/public/images/artist-paper.png`. Generated with built-in imagegen, then copied into the project. Shared paper backgrounds now replace isolated decorative icons in the light theme.

Prompt: Use case: illustration-story. Asset type: website paper background, landscape 3:2. An authentic artist's unfinished graphite drawing on warm off-white cotton paper, scanned flat, edge to edge paper with no desk or objects. Expressive old master botanical and architectural study: on the RIGHT THIRD a large exquisitely shaded wild fern, twisting bare branch and a fragment of a weathered classical arch, crosshatched shadows, varied pencil pressure, visible construction strokes, erased ghost lines, subtle graphite dust. Bottom edge has a few drifting leaves and tiny exploratory sketches. LEFT TWO THIRDS must be almost blank ivory paper to place readable interface text. The right drawing is richly detailed and dark graphite, not a clean vector, not a thin geometric icon, not a cottage. Paper softly textured but not dirty or stained, elegant art gallery quality. No text, no signatures, no watermark, no UI controls, no borders. Drawing fades organically into blank paper at edges.

## Gallery collection — 2026-10-16

Generated with built-in imagegen. Project assets:
- `frontend/public/images/gallery-observatory.png`
- `frontend/public/images/gallery-botanical.png`
- `frontend/public/images/gallery-architecture.png`

Full prompt template (each subject below substitutes SUBJECT):
Use case: illustration-story. Asset type: original fine art drawing for a website gallery. SUBJECT Portrait composition 4:5. Rich authentic graphite pencil rendering, old artist's sketchbook, confident dark marks alongside delicate unfinished construction lines, eraser marks, loose diagonal hatching, tactile warm white cotton paper. Gallery quality drawing that fills 85 percent of the composition with carefully considered margins, not a small icon. Monochrome graphite, subtle paper warmth. Flat scan, no photograph of a desk, no external frame, no text, no signatures, no logos.

Subjects:
- Observatory: An antique brass armillary sphere and mechanical astronomical instrument, elaborate intersecting rings, detailed pedestal, a small study of a crescent moon in the upper corner, on ivory drawing paper.
- Botanical: An expressive botanical study of a magnolia branch with two large blossoms, seed pods, detailed curling leaves, tiny exploratory leaf studies in the margins, on ivory drawing paper.
- Architecture: A poetic architectural drawing of a winding stone stair through an old atelier courtyard, tall arched windows, climbing ivy, deep crosshatched shadows, no houses or cottages, on ivory drawing paper.

## Continuous paper canvas — 2026-10-19

Built-in imagegen produced two transparent graphite assets, copied into the application:
- `frontend/public/images/canvas-courtyard.png`: unframed weathered courtyard, archway and stairs, ivy, unfinished pencil strokes; actual transparent background; no paper, border, label or frame.
- `frontend/public/images/canvas-magnolia.png`: sweeping magnolia branches and three blossoms, detailed graphite crosshatching and loose sketch marks; actual transparent background; no paper, border, label or frame.

Prompt set: illustration-story; graphite drawing overlay for the entire artist website canvas. Rich varied pencil pressure, naturally unfinished edges and subtle translucent graphite washes. Courtyard composed center-right, stair lines trailing lower-left; magnolia runs diagonally lower-left to upper-right. No text or straight crop edges. Generated via built-in tool, not CLI. Alpha channel verified. CSS blends graphite into the shared ivory surface. Mounted figures, captions, tapes, card shadows and opaque sidebar surfaces removed from the final theme.

## Expanded graphite collection — 2026-10-19

Six additional images generated with built-in imagegen, transparent background enabled. All saved under `frontend/public/images/`:
- `canvas-tools.png`: artist brushes, pencils, ink pot and rolled sketch.
- `canvas-books.png`: antique books, open fanning pages and fountain pen.
- `canvas-birds.png`: two flying swallows and wind gesture lines.
- `canvas-olive.png`: abundant twisting olive branches, leaves and fruit.
- `canvas-landscape.png`: rolling hills, cypress, old bridge and distant village.
- `canvas-astronomy.png`: armillary sphere, celestial orbits, stars and compass.

Shared prompt: illustration-story; free flowing graphite overlay for a website that is continuous ivory artist paper; masterful antique pencil crosshatching, varied pressure and expressive unfinished strokes; actual transparent background, only graphite marks and subtle translucent washes. No paper surface, rectangle, frame, border, caption or text. Organic silhouettes, no hard cropped edges.

Route-specific arrangements added to user/admin pages, auth and public page. Embedded bot remains compact and excludes the extra decorative band. Drawings do not intercept pointer events and are hidden from assistive technology. Below-content images use lazy loading.

## Continuous journey — 20 October 2026
Built-in imagegen (not CLI). Saved asset: `frontend/public/images/canvas-journey.png`, 2172×724, transparent PNG.
Prompt: A single wide graphite panorama with consistent perspective and connected ground: artist's desk under an olive tree on the left, garden path through a stone archway in the middle, bridge over a river leading to a hillside village on the right. Antique crosshatching, no floating objects, no collage, no frames, no text; transparent softly dissolving outer edges. Replaces the independent three-image footer montage.

## Shared mural — 21 October 2026
Built-in imagegen, new image, opaque ivory background. Asset: `frontend/public/images/canvas-mural.png`.

Prompt: One continuous antique graphite scene on ivory paper: olive canopy and trunk along the top and left, stone studio facade and steps on the right, connected garden path, river, bridge and distant village below. Consistent perspective and connected ground planes. Rich crosshatching around the edges, lightly drawn center for readable controls. No text, frames, collage or floating objects.

The mural now covers the shared user, admin, authentication and public page surfaces. Separate decorative images in the curator, dashboard gallery and footer are no longer rendered, avoiding collisions and unnecessary downloads. Soft ivory washes behind controls preserve readability. Mobile reduces mural opacity; dark mode uses a lower-contrast inverted scene. This supersedes the decorative arrangements described above.
