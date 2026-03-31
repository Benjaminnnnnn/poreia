# UI Primitives

Shared presentation primitives extracted from repeated patterns in the trip workspace.

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

## Example

```tsx
import Badge from "./Badge";
import Button from "./Button";
import Surface from "./Surface";

<Surface as="section" variant="card" radius="xl" className="space-y-4">
  <Badge tone="teal">Saved trip</Badge>
  <Button variant="primary">Open itinerary</Button>
</Surface>
```
