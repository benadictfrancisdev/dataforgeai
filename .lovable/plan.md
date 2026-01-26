

# Hero Background Redesign: Enterprise Trust-Building Design

## Overview

Replace the current ocean-themed background (waves, bubbles, sea creatures) with a modern enterprise SaaS design featuring a dark elegant gradient with abstract data network nodes, subtle shield shapes, and glassmorphism effects that convey trust, security, and intelligence.

---

## Design Reference Analysis

Based on the provided reference image and prompt, the new design should feature:

| Element | Description |
|---------|-------------|
| **Background** | Deep navy to charcoal black gradient (#0A0F14 → #0D1117) |
| **Accent Colors** | Teal (#14B8A6) and blue (#1F6FEB) glowing nodes |
| **Data Network** | Abstract connected nodes with soft glowing lines |
| **Shield Hints** | Subtle hexagonal/shield shapes integrated into the network |
| **Lighting** | Cinematic soft lighting with depth of field blur |
| **Atmosphere** | Glassmorphism, light reflections, warm accents for human collaboration |

---

## Current State (To Be Replaced)

The current Index page uses these ocean-themed components:
- `WaveBackground.tsx` - Ocean gradient with animated SVG waves and bubbles
- `InteractiveWaves.tsx` - Canvas-based interactive wave animation
- `SeaCreatures.tsx` - Animated fish, jellyfish, and bubbles
- `Hero.tsx` - Uses `hero-bg.png` image with ocean overlays

---

## New Component Structure

### Files to Create

```text
src/components/
  NetworkBackground.tsx    - Main data network canvas animation
  HeroBackground.tsx       - Gradient overlays and glow effects
```

### Files to Modify

```text
src/pages/Index.tsx        - Replace ocean components with new ones
src/components/Hero.tsx    - Remove hero-bg.png, update overlays
```

---

## Detailed Implementation

### 1. NetworkBackground.tsx (New Component)

A canvas-based component that renders:

**Data Nodes:**
- 30-50 floating nodes at various sizes (3px-8px radius)
- Teal and blue colors with soft glow
- Gentle floating animation with subtle oscillation
- Depth effect: larger nodes in front, smaller in back

**Connection Lines:**
- Dynamic connections between nearby nodes (within 150px)
- Line opacity based on distance (closer = more visible)
- Subtle pulse animation on connections
- Color gradient from teal to blue

**Shield/Hexagon Shapes:**
- 3-5 large, subtle hexagonal shapes in background
- Very low opacity (5-10%)
- Slow rotation animation
- Integrated into the node network

**Mouse Interaction:**
- Nodes gently attracted to cursor (subtle, not aggressive)
- Connection lines brighten near mouse position
- Parallax-like depth effect on scroll

### 2. HeroBackground.tsx (New Component)

Static gradient overlays for the trust-building aesthetic:

```tsx
// Top radial glow (teal accent)
<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] 
  bg-gradient-radial from-teal-500/8 via-transparent to-transparent blur-3xl" />

// Left side warm accent (human collaboration hint)
<div className="absolute top-1/4 -left-20 w-[500px] h-[500px] 
  bg-gradient-radial from-orange-500/5 via-transparent to-transparent blur-3xl" />

// Center primary glow
<div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px]
  bg-gradient-radial from-primary/10 via-transparent to-transparent blur-3xl" />

// Bottom edge gradient
<div className="absolute bottom-0 inset-x-0 h-64 
  bg-gradient-to-t from-background to-transparent" />
```

**Glassmorphism Elements:**
- Subtle glass panels at edges (very low opacity)
- Soft light reflections
- Noise texture overlay for depth

### 3. Updated Hero.tsx

Remove the ocean-themed overlays and hero-bg.png image:

```tsx
// REMOVE:
- import heroBg from "@/assets/hero-bg.png";
- Background image div
- Ocean glow effects
- Cyan glow

// KEEP:
- Badge with primary color
- Headline and gradient text
- CTA buttons
- Trust indicators
- Stats section

// ADD:
- Grid pattern with refined styling
- Subtle vignette effect
```

### 4. Updated Index.tsx

```tsx
// REMOVE:
import WaveBackground from "@/components/WaveBackground";
import InteractiveWaves from "@/components/InteractiveWaves";
import SeaCreatures from "@/components/SeaCreatures";

// ADD:
import NetworkBackground from "@/components/NetworkBackground";
import HeroBackground from "@/components/HeroBackground";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <HeroBackground />
      <NetworkBackground />
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <Features />
        <HowItWorks />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};
```

---

## NetworkBackground Technical Details

### Canvas Animation Loop

```tsx
// Node structure
interface DataNode {
  x: number;
  y: number;
  z: number;          // Depth (0-1)
  vx: number;         // Velocity X
  vy: number;         // Velocity Y
  radius: number;
  color: 'teal' | 'blue' | 'purple';
  glowIntensity: number;
  pulsePhase: number;
}

// Connection drawing
function drawConnections(nodes: DataNode[], ctx: CanvasRenderingContext2D) {
  nodes.forEach((node, i) => {
    nodes.slice(i + 1).forEach(other => {
      const distance = Math.hypot(node.x - other.x, node.y - other.y);
      if (distance < 150) {
        const opacity = 1 - distance / 150;
        ctx.strokeStyle = `rgba(20, 184, 166, ${opacity * 0.3})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(other.x, other.y);
        ctx.stroke();
      }
    });
  });
}

// Node glow effect
function drawNode(node: DataNode, ctx: CanvasRenderingContext2D) {
  const gradient = ctx.createRadialGradient(
    node.x, node.y, 0,
    node.x, node.y, node.radius * 3
  );
  gradient.addColorStop(0, getNodeColor(node.color, 1));
  gradient.addColorStop(0.5, getNodeColor(node.color, 0.3));
  gradient.addColorStop(1, 'transparent');
  
  ctx.beginPath();
  ctx.arc(node.x, node.y, node.radius * 3, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Core
  ctx.beginPath();
  ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
  ctx.fillStyle = getNodeColor(node.color, 0.9);
  ctx.fill();
}
```

### Shield/Hexagon Background

```tsx
function drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const px = Math.cos(angle) * size;
    const py = Math.sin(angle) * size;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  
  ctx.closePath();
  ctx.strokeStyle = 'rgba(20, 184, 166, 0.05)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}
```

---

## Color Palette

| Use | Color | HSL |
|-----|-------|-----|
| Background Base | #0A0F14 | 210 33% 6% |
| Teal Nodes | #14B8A6 | 173 80% 40% |
| Blue Nodes | #1F6FEB | 212 85% 52% |
| Purple Accent | #8B5CF6 | 262 83% 66% |
| Warm Hint | #F97316 | 25 95% 53% |
| Connection Lines | Teal @ 20-30% opacity | - |

---

## Performance Considerations

1. **Node Count**: 40 nodes max (balance visual richness vs performance)
2. **Connection Distance**: 150px max (limits line calculations)
3. **Frame Rate**: Target 30fps (requestAnimationFrame with throttle)
4. **Canvas Size**: Match viewport, resize on window resize
5. **Mobile**: Reduce node count to 25 on screens < 768px

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/NetworkBackground.tsx` | **Create** | Canvas animation for data nodes and connections |
| `src/components/HeroBackground.tsx` | **Create** | Gradient overlays and glow effects |
| `src/pages/Index.tsx` | **Modify** | Replace ocean components with new background components |
| `src/components/Hero.tsx` | **Modify** | Remove hero-bg.png, simplify overlays |

---

## Visual Result

The new hero will feature:
- Deep, professional dark gradient background
- Floating data nodes with soft teal/blue glow
- Dynamic connection lines forming a network
- Subtle hexagonal shield shapes for trust
- Clean center space for headline text
- Warm accent touches suggesting human collaboration
- Enterprise-grade, Fortune 500 SaaS aesthetic
- Similar quality to OpenAI, Stripe, Snowflake, Databricks landing pages

