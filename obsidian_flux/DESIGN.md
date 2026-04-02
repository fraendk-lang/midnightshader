```markdown
# Design System Strategy: The Midnight Architect

## 1. Overview & Creative North Star
This design system is built for the "Midnight Architect"—the creative professional who requires a high-performance, low-distraction workspace that feels both industrial and ethereal. We are moving away from the "SaaS-standard" look of heavy borders and flat cards.

**Creative North Star: The Luminescent Void**
The interface should feel like a sophisticated physical console. We achieve this through **intentional asymmetry**, high-contrast typography scales (the tension between large Display headers and tiny Monospaced labels), and deep tonal depth. We don't use lines to separate ideas; we use light and shadow to define space.

---

## 2. Colors: Tonal Depth & Vibrancy
Our palette is anchored in deep charcoals and punctuated by electric, luminescent accents.

### The Palette
- **Primary (Electric Purple):** `#b6a0ff` — Use for high-priority actions and active states.
- **Secondary (Cyan Flare):** `#00e3fd` — Use for specialized creative tools and secondary UI highlights.
- **Surface Foundations:** We use `#0e0e0e` as our "Absolute Zero" background.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or layout. 
Boundaries must be defined solely through background color shifts. To separate a sidebar from a main workspace, place a `surface-container-low` (`#131313`) section against the `surface` (`#0e0e0e`) background. 

### Surface Hierarchy & Nesting
Treat the UI as stacked sheets of tinted glass. Use the container tiers to create "nested" depth:
1. **Base:** `surface` (`#0e0e0e`)
2. **Structural Sections:** `surface-container-low` (`#131313`)
3. **Interactive Components:** `surface-container-high` (`#20201f`)
4. **Floating Panels:** `surface-container-highest` (`#262626`)

### The "Glass & Gradient" Rule
To elevate the system, floating elements (modals, tooltips, popovers) must use **Glassmorphism**. Apply a semi-transparent `surface-container-highest` with a `backdrop-blur` of 12px-20px. For primary CTAs, use a subtle linear gradient from `primary` (`#b6a0ff`) to `primary-container` (`#a98fff`) to provide a "soulful" glow.

---

## 3. Typography: Editorial Precision
We utilize a dual-font approach to balance personality with technical utility.

- **The Voice (Space Grotesk):** Used for `display`, `headline`, and `label` roles. This provides a modern, geometric edge that feels architectural.
- **The Engine (Manrope):** Used for `title` and `body` roles. It offers maximum readability for tool descriptions and long-form content.
- **The Detail (Monospaced):** For code areas and coordinate readouts, use a clean Monospaced font.

**Hierarchy Strategy:** Create drama through scale. Use `display-lg` (3.5rem) for hero moments in close proximity to `label-sm` (0.6875rem) to create a sophisticated, editorial contrast.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering** rather than traditional structural lines.

- **The Layering Principle:** Stack containers to create lift. A `surface-container-lowest` card placed on a `surface-container-low` section creates a soft, natural drop-off without any artificial shadows.
- **Ambient Shadows:** When an element must "float" (e.g., a context menu), use an extra-diffused shadow. 
    - **Blur:** 24px - 40px. 
    - **Opacity:** 6% of `on-surface` (`#ffffff`).
- **The "Ghost Border" Fallback:** If accessibility requires a container definition, use a "Ghost Border": the `outline-variant` (`#484847`) at **15% opacity**. Never use 100% opaque borders.
- **Glassmorphism:** Use `surface-variant` (`#262626`) at 70% opacity for panels, allowing the vibrant `primary` or `secondary` accents of the background content to bleed through.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary-container`). Text is `on-primary` (`#340090`). Roundedness: `md` (0.375rem).
- **Secondary:** Transparent background with a `Ghost Border`. Text is `secondary` (`#00e3fd`).
- **Tertiary:** No background or border. Use `label-md` uppercase with `primary` text.

### Input Fields
- **Base:** `surface-container-highest` background. No border.
- **Focus:** A 1px "Ghost Border" using `primary` at 40% and a subtle `primary_dim` outer glow.
- **Error:** Background shifts to `error_container` (`#a70138`) at 20% opacity with `error` (`#ff6e84`) text.

### Chips & Tags
- **Filter Chips:** `surface-container-low` background. On selection, transition to `primary` background with `on-primary` text.
- **Action Chips:** Monospaced font (`label-sm`) to emphasize the technical nature of the tool.

### Cards & Lists
- **The Divider Rule:** Forbid the use of divider lines. Separate list items using **Vertical White Space**. Use `spacing-4` (0.9rem) or `spacing-5` (1.1rem) between items.
- **Hover States:** Transition the background to `surface-bright` (`#2c2c2c`) for a subtle "light-up" effect.

### Tooltips
- **Styling:** Glassmorphic `surface-container-highest` with `label-sm` typography. 
- **Timing:** 200ms ease-out entrance to feel snappy and professional.

---

## 6. Do's and Don'ts

### Do:
- **Do** use `spacing-16` (3.5rem) and `spacing-24` (5.5rem) to create expansive "editorial" breathing room between major sections.
- **Do** use `primary_fixed_dim` for icons within containers to ensure they don't overpower the text.
- **Do** leverage the `full` (9999px) roundedness for small badges or toggle switches to provide organic contrast to the `md` (0.375rem) corners of cards.

### Don't:
- **Don't** use pure black or pure white for borders. It breaks the "Midnight Architect" immersion.
- **Don't** use standard drop shadows. If it doesn't look like ambient light, it doesn't belong.
- **Don't** use dividers. If two elements feel too close, increase the spacing scale (e.g., from `3` to `5`).
- **Don't** center-align everything. Use intentional left-aligned grids with asymmetric "feature" blocks to keep the layout dynamic.

### Accessibility Note
Maintain a contrast ratio of at least 4.5:1 for all body text. When using `secondary` (`#00e3fd`) on dark surfaces, ensure the font weight is at least `medium` to preserve legibility against the glow.```