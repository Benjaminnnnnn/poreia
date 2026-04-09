# UI Primitives

Shared presentation primitives extracted from repeated patterns in the trip workspace.

## Tokens

The initial design system lives in [global.css](/Users/benjaminzhuang/workspace/cmu/poreia/client/src/styles/global.css) as semantic CSS variables.

- Color:
  - `--color-canvas`, `--color-surface`, `--color-surface-strong`
  - `--color-ink-primary`, `--color-ink-secondary`, `--color-ink-muted`
  - `--color-accent-coral`, `--color-accent-amber`, `--color-accent-peach`, `--color-accent-teal`, `--color-accent-sea`
- Spacing:
  - `--space-1` through `--space-12`
- Radius:
  - `--radius-sm` through `--radius-3xl`, plus `--radius-pill`
- Typography:
  - `--font-size-label`, `--font-size-body-sm`, `--font-size-body-md`, `--font-size-body-lg`
  - `--font-size-display-sm`, `--font-size-display-md`
- Motion:
  - `--duration-fast`, `--duration-base`, `--duration-slow`
  - `--ease-standard`, `--ease-emphasized`
- Elevation:
  - `--shadow-surface-inline`, `--shadow-surface-card`, `--shadow-surface-float`

## Components

- `Button`
  - Variants: `primary`, `secondary`, `ghost`
  - Sizes: `sm`, `md`, `lg`, `icon`, `icon-sm`
  - Use for actions instead of rewriting coral/neutral button styles inline.

- `Badge`
  - Tones: `coral`, `teal`, `neutral`, `glass`
  - Use for status pills, day counts, and lightweight metadata chips.

- `Surface`
  - Variants: `card`, `subtle`, `glass`, `muted`, `dashed`
  - Controls shared border, background, radius, and shadow treatments for panels and empty states.

- `Field`
  - Variants: `default`, `subtle`, `glass`
  - Sizes: `md`, `lg`
  - Wraps labels, descriptions, helper text, errors, and leading/trailing adornments.

- `TextInput`
  - Built on `Field`
  - Use for standard text entry instead of styling raw `<input>` elements inline.

- `SectionIntro`
  - Reusable heading block for section eyebrow + title + description + optional actions.
  - Use to keep visual hierarchy consistent across pages.

- `EmptyState`
  - Standard empty/loading-style message container with title, description, and optional action.
  - Use instead of rebuilding dashed placeholder shells ad hoc.

## Example

```tsx
import Badge from "./Badge";
import Button from "./Button";
import EmptyState from "./EmptyState";
import SectionIntro from "./SectionIntro";
import Surface from "./Surface";
import TextInput from "./TextInput";

<section className="space-y-6">
  <SectionIntro
    eyebrow="Saved Trips"
    title="Pick back up instantly."
    description="Open any trip and keep refining it where you left off."
    actions={<Badge tone="teal">3 saved</Badge>}
  />

  <TextInput
    label="Traveler name"
    placeholder="Enter a traveler name"
    hint="Shown across profile and trip views."
  />

  <Surface as="section" variant="card" radius="xl" className="space-y-4">
    <Button variant="primary">Open itinerary</Button>
  </Surface>

  <EmptyState
    title="Nothing saved yet."
    description="Generate your first itinerary and it will land here."
  />
</section>
```
