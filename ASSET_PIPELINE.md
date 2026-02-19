# Asset Pipeline — Stability API Integration

> TODO: This document outlines how to integrate Stability AI-generated assets (character sprites and office props) into Chaos Office.

---

## Overview

Chaos Office currently renders characters and props using PixiJS Graphics primitives (vector shapes). The next step is to replace these with pixel-art sprite sheets generated via the Stability API, giving each agent type a distinct visual identity.

---

## 1. Generating Images with `scripts/generate_image.py`

Create a `scripts/generate_image.py` script that calls the Stability API:

```python
# scripts/generate_image.py
# Usage: python scripts/generate_image.py --prompt "..." --output sprites/grinder.png
#
# Requires: STABILITY_API_KEY env var
# API: https://platform.stability.ai/docs/api-reference#tag/Generate

import os, requests, argparse

API_KEY = os.environ["STABILITY_API_KEY"]
API_URL = "https://api.stability.ai/v2beta/stable-image/generate/sd3"

def generate(prompt: str, output: str, aspect_ratio: str = "1:1"):
    resp = requests.post(
        API_URL,
        headers={"authorization": f"Bearer {API_KEY}", "accept": "image/*"},
        files={"none": ""},
        data={"prompt": prompt, "aspect_ratio": aspect_ratio, "output_format": "png"},
    )
    resp.raise_for_status()
    with open(output, "wb") as f:
        f.write(resp.content)
    print(f"Saved: {output}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--aspect-ratio", default="1:1")
    args = parser.parse_args()
    generate(args.prompt, args.output, args.aspect_ratio)
```

---

## 2. Recommended Prompt Formats

### Character Sprite Sheets

Use a consistent style anchor across all character prompts:

```
"Pixel art character sprite sheet, 32x32 grid, 4-direction walk cycle,
 top-down isometric office worker, [TYPE-SPECIFIC DESCRIPTION],
 clean outlines, transparent background, retro 16-bit style"
```

**Type-specific descriptions:**

| Agent Type    | Prompt Fragment |
|---------------|----------------|
| Grinder       | `focused programmer with laptop, steel blue shirt, headphones` |
| Wanderer      | `casual employee holding coffee cup, amber/yellow shirt` |
| Gossip        | `animated talker with speech bubble, rose/pink outfit` |
| Manager       | `authority figure with purple tie, clipboard in hand` |
| Intern        | `nervous young worker, mint green shirt, wide eyes` |
| Chaos Agent   | `mischievous troublemaker, red hoodie, lightning bolt motif` |
| Observer      | `mysterious figure in dark coat, notepad, barely visible` |

### Office Props

```
"Pixel art office prop, 48x48, isometric view, [PROP DESCRIPTION],
 clean outlines, transparent background, retro 16-bit style"
```

**Props to generate:**

| Prop            | Prompt Fragment |
|-----------------|----------------|
| Desk            | `wooden office desk with monitor and papers` |
| Coffee Machine  | `tall office coffee maker with green/red buttons, steam rising` |
| Pizza Box       | `open pizza box with pepperoni pizza, golden cheese` |
| Cat             | `orange tabby cat sitting, tail curled` |
| Printer         | `grey office printer with paper tray` |
| Water Cooler    | `blue water cooler with bottle on top` |
| Potted Plant    | `green potted office plant in terracotta pot` |

---

## 3. Integration Plan

### Phase 1: Manual Sprite Tracing (Current)

1. Generate concept art using `scripts/generate_image.py`
2. Manually trace/clean sprites in a pixel editor (Aseprite, Piskel, etc.)
3. Export as sprite sheets (PNG) into `public/sprites/`
4. Load in `renderer.ts` using PixiJS `Spritesheet` / `Texture`

### Phase 2: Direct Texture Swap

1. Replace `Graphics`-based drawing in `updateAgentVisual()` with `Sprite` objects
2. Map each `AgentType` to a spritesheet
3. Animate walk cycles using PixiJS `AnimatedSprite`
4. Keep vector fallback for fast loading / low-bandwidth

### Phase 3: Optional Automation

1. Batch-generate all agent sprites via a shell script calling `generate_image.py`
2. Auto-crop and sheet-pack using a tool like `TexturePacker` or `free-tex-packer`
3. CI step: regenerate sprites on prompt changes

---

## 4. Renderer Integration Hook

The key integration point is `src/renderer.ts` in `updateAgentVisual()` (line ~543). Replace the Graphics draw calls with texture-based rendering:

```typescript
// TODO: Replace Graphics-based agent rendering with sprite textures
// When sprites are available, swap this:
//   body.rect(...).fill(...)  // current vector drawing
// With:
//   const sprite = new Sprite(textures[agent.type]);
//   container.addChild(sprite);
```

Props integration point is `drawProps()` (~line 169) and `drawOffice()` (~line 250).

---

## 5. File Structure (Target)

```
chaos-office/
├── public/
│   └── sprites/
│       ├── grinder.png
│       ├── wanderer.png
│       ├── gossip.png
│       ├── manager.png
│       ├── intern.png
│       ├── chaos_agent.png
│       ├── observer.png
│       └── props/
│           ├── desk.png
│           ├── coffee_machine.png
│           ├── pizza.png
│           └── cat.png
├── scripts/
│   └── generate_image.py
└── src/
    └── renderer.ts  ← texture loading + sprite swap
```
