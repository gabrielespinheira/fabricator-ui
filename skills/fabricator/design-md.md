# A project's DESIGN.md

When asked for a design guide, write a product-specific document. Inspect existing screens, theme CSS, typography, installed components and brand references first. Preserve an existing guide's useful decisions and change only the requested scope. A new screen alone does not require creating a guide.

Use the following as an outline, keeping only sections the product needs:

1. **Product and tasks:** audience, recurring jobs, what the interface should make easiest. Name actual screens and objects.
2. **Direction:** describe the look in observable terms, the existing brand choices and why they suit the work.
3. **Foundations:** theme/token source paths, type roles, surface ladder, radius, regional density and motion. Reference implemented values; label proposed changes separately.
4. **Frame and hierarchy:** navigation, content widths, scroll ownership, action placement, panels and small-screen transformations.
5. **Screen patterns:** map the product's real routes to regions, Fabricator components and variants. Include one representative screen with its job, component map and states.
6. **Icons:** configured package, recurring action-to-icon mapping, brand/file handling, icon-only buttons (accessible name, tooltip wording, shortcut in `Kbd`) and animation policy.
7. **States and content:** loading, empty, errors, warnings, limits, permissions, destructive actions, long values, and the product's own words for each, with one status map (label, role, icon).
8. **Platforms:** which the product ships on, what each region becomes on each, and what is shared.
9. **Asking:** what the product never asks, its defaults and where they come from, and the shape each create flow takes.
10. **Verification:** observable light/dark, responsive, keyboard, focus, contrast and reduced-motion checks.

A useful guide settles choices. Replace vague phrases such as "modern dashboard" with decisions such as "a compact queue table with a persistent details panel; on phones a row opens a detail view". Separate facts verified in the code from proposals and open questions. Link component APIs instead of copying a catalogue of props or freezing a second set of theme values.
