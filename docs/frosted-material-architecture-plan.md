# Frosted Material Architecture Plan

Date: 2026-04-24

## Why This Exists

The current frosted or fake-blur implementation works in a few places, but it does not scale cleanly.

When we try to reuse the same effect on dialogs, dropdowns, toolbars, and future overlays, we keep running into the same problem:

- some surfaces look like true frosted glass
- some surfaces look like plain translucency
- some surfaces require one-off tuning
- dialog scrims, wallpaper masks, and blur layers interfere with each other

That means the problem is no longer visual tuning. It is architecture.

The goal of this plan is to move Leaftab from a component-by-component blur setup to a single material system that can be applied everywhere with semantic presets.

## Research Summary

The best-practice pattern from platform and web guidance is not “build a separate fake blur for every component”. It is:

1. Define a single material system.
2. Separate backdrop sampling from tint, border, and scrim.
3. Use semantic material recipes such as thin, regular, thick, dialog, dropdown, or pill.
4. Prefer real backdrop filtering when available, and use synthetic or hybrid fallbacks only behind the same API.
5. Keep modal dimming separate from the material itself.

Relevant references:

- MDN: `backdrop-filter` only becomes visible when the surface itself is transparent or partially transparent, and it applies to what is behind the element, not to the element contents.
  - https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter
- web.dev: OS-style translucent surfaces are a `backdrop-filter` use case, and it is intended for performant blur and color-shift effects behind an element.
  - https://web.dev/articles/backdrop-filter
- web.dev Learn CSS: `filter` affects the element itself, while `backdrop-filter` affects the background behind the element.
  - https://web.dev/learn/css/filters
- MDN: `blur()` is a Gaussian blur on the image input and is appropriate when you intentionally blur a sampled backdrop texture.
  - https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/blur
- Apple HIG Materials: materials should create depth and hierarchy, thickness should reflect semantic purpose, and controls/navigation materials should be distinct from content-layer materials.
  - https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/materials/

## Best-Practice Conclusions

### 1. “Fake blur everywhere” is the wrong abstraction

The stable abstraction is not fake blur. The stable abstraction is material.

Each surface should request a semantic material, for example:

- `search-pill`
- `dropdown-menu`
- `context-menu`
- `dialog-panel`
- `sheet-panel`
- `toolbar-floating`

Then the material engine decides how to render it:

- native: `backdrop-filter`
- synthetic: preblurred sampled backdrop
- hybrid: sampled backdrop plus native backdrop blur

Components should not know which path is chosen.

### 2. Scrim and material must be different layers

Modal dimming is not part of the frosted surface.

If the dialog overlay is too dark, the material underneath will always read as “a dark translucent plate”, even if the internal blur is correct.

We should treat these as independent responsibilities:

- scrim: controls scene separation and focus
- material: controls blur, tint, border, and legibility inside the surface

### 3. Wallpaper mask must not be blindly reapplied inside every material

The wallpaper layer already has a mask system. Reapplying that same darkening inside every material creates compounded dimming.

This is one of the main reasons the current dialog surfaces drift toward plain translucency.

The material system needs explicit control over whether a surface reuses:

- full wallpaper mask
- reduced wallpaper mask
- no wallpaper mask

That should be recipe-driven, not component-driven.

### 4. Large surfaces need different blur semantics from small surfaces

Search bars, pills, and small floating actions can look acceptable with mild sampling and tint.

Dialogs and wide dropdowns cannot.

Large surfaces need:

- stronger blur
- wider overscan
- clearer border definition
- lower scrim interference
- often a different material thickness

This should not be solved by ad hoc tweaks in each component. It should be a recipe concern.

### 5. The system should be capability-based

The material engine should choose among:

- native
- synthetic
- hybrid

using centralized capability logic.

That decision can depend on:

- browser support
- platform behavior
- visual effect level
- performance budget
- the requested material recipe

This avoids forking the UI layer whenever a surface needs a different rendering path.

## Current Architecture Problems In Leaftab

### 1. `FrostedBackdrop` mixes too many responsibilities

Today it handles:

- viewport slicing
- wallpaper sampling
- wallpaper mask reuse
- theme tinting
- drawer special cases
- border rendering
- synthetic blur configuration
- now some hybrid behavior too

That makes it powerful, but also makes it easy to break one surface while fixing another.

### 2. The current preset layer is still too optical, not semantic enough

`dialog-panel` is better than raw props, but the system still exposes low-level knobs too close to the component layer.

We need a stronger contract:

- components ask for semantic roles
- only the material engine knows the optical recipe

### 3. Dialog primitives still know too much about frosted internals

`DialogContent` currently wires the frosted implementation directly.

Long term, dialogs should only choose:

- surface role
- scrim role
- motion role

They should not manually thread blur internals.

### 4. Surface theme and surface rendering are still partially entangled

Foreground contrast should be resolved from the material recipe and sampled backdrop characteristics, but it should happen through a dedicated theme resolver contract.

Right now those concerns are still too close together.

## Target Architecture

## Current Tunable Tokens

The current shared material system now exposes a small, explicit token set as a global shared material layer.

- `sampleBlurPx`
  - Additional blur applied to the sampled backdrop texture itself.
- `sampleScale`
  - Slightly enlarges the sampled backdrop to soften sharp local detail.
- `sampleOverscanPx`
  - Expands the sampled area so large surfaces do not reveal edge seams.
- `lightSurfaceOverlayOpacity`
  - Controls the white adaptive overlay used in light mode.
- `darkSurfaceOverlayOpacity`
  - Controls the black adaptive overlay used in dark mode.
- `backdropMaskStrength`
  - Controls how strongly the shared wallpaper mask participates inside the surface.
- `borderVisible`
  - Toggles the material edge definition independently from blur and tint.

These are intentionally optical tokens, but they now live in one shared material profile that semantic presets consume.

That means:

- components choose semantic role
- the material system owns the optical recipe
- the admin tuning UI only edits shared global material tokens
- future dropdowns, popovers, and dialogs can inherit the same contract without custom effect code

Important exception:

- folder and folder-opening fake blur remain on their own system and are not part of this shared material layer

## Layer 1: Backdrop Source System

Purpose:

- own the “what content is behind me?” problem exactly once

Responsibilities:

- expose wallpaper or page backdrop source
- expose source luminance metadata
- expose readiness and capability state
- optionally expose a shared preblurred texture

Suggested interface:

```ts
type MaterialBackdropSource = {
  kind: 'wallpaper' | 'page' | 'none';
  textureUrl: string | null;
  averageLuminance: number | null;
  maskOpacity: number;
  ready: boolean;
};
```

This is provider-level app state, not per-component logic.

## Layer 2: Material Capability Resolver

Purpose:

- choose native, synthetic, or hybrid rendering centrally

Suggested interface:

```ts
type MaterialRenderMode = 'native' | 'synthetic' | 'hybrid';

type MaterialCapabilities = {
  preferredMode: MaterialRenderMode;
  nativeBackdropFilterSupported: boolean;
  shouldReduceEffects: boolean;
};
```

Decision inputs:

- browser support
- effect level setting
- recipe category
- performance flags

This is the main architectural fix.

It means components never ask for “fake blur”. They ask for a material recipe, and the engine chooses the best rendering mode.

## Layer 3: Semantic Material Recipes

Purpose:

- define the design language once

Suggested interface:

```ts
type MaterialRecipeName =
  | 'search-pill'
  | 'toolbar-floating'
  | 'dropdown-menu'
  | 'context-menu'
  | 'dialog-panel'
  | 'sheet-panel';

type MaterialRecipe = {
  role: MaterialRecipeName;
  thickness: 'thin' | 'regular' | 'thick';
  scrim: 'none' | 'light' | 'modal';
  border: 'none' | 'hairline';
  tintStrategy: 'light-adaptive' | 'dark-adaptive' | 'neutral';
  maskStrategy: 'inherit' | 'reduced' | 'none';
  renderMode: 'auto' | 'native' | 'synthetic' | 'hybrid';
};
```

Important:

- recipes should be semantic
- optical values live inside the resolver
- components only choose recipe names

## Layer 4: `MaterialSurface` Primitive

Purpose:

- the only component that renders frosted surfaces

Responsibilities:

- read recipe
- read backdrop source
- read capability resolver
- assemble the final layers

Canonical layer order:

1. sampled backdrop layer
2. optional synthetic blur layer
3. optional native backdrop blur layer
4. tint layer
5. border or highlight layer
6. content layer

The important rule is:

all frosted UI should go through this one primitive.

No dialog-specific blur. No dropdown-specific blur. No toolbar-specific blur.

## Layer 5: Surface Consumers

Consumers should be very small.

Examples:

```tsx
<MaterialSurface recipe="dialog-panel">
  ...
</MaterialSurface>

<MaterialSurface recipe="dropdown-menu">
  ...
</MaterialSurface>
```

Dialogs, dropdowns, sheets, and toolbars should only specify:

- recipe
- shape
- layout
- content

They should not hand-wire blur physics.

## Recommended Rendering Strategy

### Default strategy

Use hybrid rendering as the default for large surfaces:

- sampled blurred backdrop to stabilize visuals
- native `backdrop-filter` to keep the surface visibly alive
- adaptive tint and border from recipe

Why:

- synthetic-only tends to look like a tinted screenshot on large panels
- native-only can vary too much by browser and stacking context
- hybrid is the most resilient path for premium glass surfaces

### For small pills and toolbars

Use recipe-driven `auto`, which may resolve to:

- native on capable browsers
- synthetic on constrained paths
- hybrid only where visually needed

### For dropdowns and menus

Use a distinct content-layer material, not the same recipe as dialogs.

Dropdowns typically need:

- smaller radius
- stronger edge definition
- less scrim interference
- slightly thicker contrast than pills

## Migration Plan

### Phase 1. Freeze the public API

Target:

- introduce `MaterialSurface`
- keep current frosted behavior working behind it

Tasks:

- add `MaterialRecipeName`
- add centralized recipe registry
- add centralized capability resolver
- stop exporting blur-heavy props to consumers

### Phase 2. Separate scrim from material

Target:

- move all modal dimming out of material recipes

Tasks:

- dialog overlay becomes a scrim system
- `dialog-panel` only controls the panel itself
- dropdowns and non-modal surfaces never inherit modal scrim behavior

### Phase 3. Normalize backdrop source ownership

Target:

- all frosted surfaces pull from the same source service

Tasks:

- move wallpaper sampling rules behind a single source provider
- define mask strategies explicitly
- remove repeated wallpaper mask logic from per-surface customization

### Phase 4. Migrate consumers by semantics

Order:

1. search bar
2. selection toolbar
3. settings dialog
4. search settings dialog
5. dropdowns
6. remaining dialogs and sheets

Rule:

Every migration should replace a component-specific blur setup with a semantic recipe selection.

### Phase 5. Add visual verification fixtures

Because materials are visual infrastructure, we need dedicated verification surfaces.

Recommended:

- a local “material lab” page
- screenshots for light and dark mode
- screenshots on bright and dark wallpapers
- one fixture per recipe

Without this, regressions will keep reappearing.

## Immediate Recommendations

Short-term changes we should make next:

1. Replace the current `FrostedBackdrop` plus preset prop soup with a proper `MaterialSurface` contract.
2. Move modal overlay styling out of dialog material logic.
3. Centralize native versus synthetic versus hybrid selection.
4. Create separate recipes for `dialog-panel` and `dropdown-menu`.
5. Add a material showcase page so we can verify the whole system before rolling it out.

## Bottom Line

The right long-term answer is not to keep perfecting a “fake blur component”.

The right answer is to build a material system with:

- one backdrop source service
- one capability resolver
- one semantic recipe registry
- one material primitive
- separate scrim handling

Then every future dialog, dropdown, sheet, and floating control can opt into the same system by choosing a recipe name instead of getting custom blur code.
