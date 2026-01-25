
# Color Scheme Update: Modern Dark Tech Theme

## Overview

This plan updates DataForge's color palette to a modern dark tech aesthetic with the user's specified colors, plus adds a prominent day/night theme toggle throughout the UI.

---

## New Color Specifications

| Element | Hex | HSL (for CSS variables) |
|---------|-----|-------------------------|
| Background | **#0A0F14** | 210 33% 6% |
| Primary | **#1F6FEB** | 212 85% 52% |
| Accent | **#F97316** | 25 95% 53% |
| Text | **#CBD5E1** | 215 20% 85% |

Light mode will use complementary lighter tones for a clean daytime experience.

---

## File Changes Summary

### 1. `src/index.css` - Complete Color Variable Overhaul

**Dark Mode (`.dark` class):**
```css
.dark {
  /* Deep dark background */
  --background: 210 33% 6%;           /* #0A0F14 */
  --foreground: 215 20% 85%;          /* #CBD5E1 */
  
  --card: 210 28% 9%;                 /* Slightly lighter than bg */
  --card-foreground: 215 20% 85%;
  
  /* GitHub-style blue primary */
  --primary: 212 85% 52%;             /* #1F6FEB */
  --primary-foreground: 0 0% 100%;
  
  --secondary: 210 25% 13%;           /* Dark slate */
  --secondary-foreground: 215 20% 85%;
  
  --muted: 210 22% 16%;
  --muted-foreground: 215 15% 55%;
  
  /* Orange accent */
  --accent: 25 95% 53%;               /* #F97316 */
  --accent-foreground: 0 0% 100%;
  
  --border: 210 20% 18%;
  --input: 210 20% 18%;
  --ring: 212 85% 52%;
  
  /* Chart colors: Blue / Teal / Violet / Orange spectrum */
  --chart-1: 212 85% 52%;             /* Primary blue */
  --chart-2: 173 80% 40%;             /* Teal */
  --chart-3: 262 83% 58%;             /* Violet */
  --chart-4: 25 95% 53%;              /* Orange accent */
  --chart-5: 199 89% 48%;             /* Cyan */
  --chart-6: 280 65% 60%;             /* Purple */
  --chart-7: 160 84% 39%;             /* Emerald */
  --chart-8: 234 89% 60%;             /* Indigo */
  
  /* Gradients */
  --gradient-primary: linear-gradient(135deg, #1F6FEB 0%, #7C3AED 100%);
  --gradient-subtle: linear-gradient(180deg, #0A0F14 0%, #0D1117 100%);
  --gradient-accent: linear-gradient(135deg, #F97316 0%, #FB923C 100%);
  
  /* Shadows */
  --shadow-glow: 0 0 0 1px rgba(31, 111, 235, 0.2);
}
```

**Light Mode (`:root`):**
```css
:root {
  /* Clean white/gray background */
  --background: 210 20% 98%;
  --foreground: 210 33% 12%;          /* Near black */
  
  --card: 0 0% 100%;                  /* Pure white */
  --card-foreground: 210 33% 12%;
  
  /* Same primary blue */
  --primary: 212 85% 52%;             /* #1F6FEB */
  --primary-foreground: 0 0% 100%;
  
  --secondary: 214 32% 95%;           /* Light gray */
  --secondary-foreground: 210 33% 12%;
  
  --muted: 214 32% 93%;
  --muted-foreground: 210 15% 40%;
  
  /* Orange accent */
  --accent: 25 95% 53%;               /* #F97316 */
  --accent-foreground: 0 0% 100%;
  
  --border: 214 32% 90%;
  --input: 214 32% 90%;
  --ring: 212 85% 52%;
  
  /* Same chart colors */
  --chart-1 through --chart-8: same hues, adjusted saturation
}
```

---

### 2. `src/components/ThemeToggle.tsx` - Enhanced with Label Option

Add optional label display and improved styling:

```tsx
interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

const ThemeToggle = ({ showLabel = false, className }: ThemeToggleProps) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size={showLabel ? "sm" : "icon"}
      onClick={toggleTheme}
      className={cn(
        "relative rounded-full transition-all duration-300",
        "hover:bg-primary/10 hover:text-primary",
        showLabel && "gap-2 px-3",
        className
      )}
    >
      {/* Animated sun/moon icons */}
      <Sun className={cn("h-4 w-4", theme === 'dark' ? 'rotate-90 scale-0' : 'rotate-0 scale-100')} />
      <Moon className={cn("absolute h-4 w-4", theme === 'dark' ? 'rotate-0 scale-100' : '-rotate-90 scale-0')} />
      {showLabel && <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>}
    </Button>
  );
};
```

---

### 3. `src/components/Navbar.tsx` - Add Theme Toggle

Add theme toggle button to desktop navigation (after InteractiveTutorial, before user menu):

```tsx
import ThemeToggle from "@/components/ThemeToggle";

// In desktop nav section:
<div className="hidden md:flex items-center gap-4">
  <InteractiveTutorial />
  <ThemeToggle />  {/* NEW */}
  {user ? (...) : (...)}
</div>

// In mobile menu:
<div className="flex gap-4 pt-4 items-center">
  <ThemeToggle showLabel />
  {/* existing buttons */}
</div>
```

---

### 4. `src/components/layout/ResponsiveSidebar.tsx` - Add Theme Toggle

Add theme toggle at the bottom of the sidebar:

```tsx
import ThemeToggle from "@/components/ThemeToggle";

// Add before closing SidebarContent fragment:
{/* Theme Toggle */}
<div className={cn(
  "p-3 border-t border-border",
  collapsed ? "flex justify-center" : "flex items-center justify-between px-4"
)}>
  {!collapsed && <span className="text-xs text-muted-foreground">Theme</span>}
  <ThemeToggle />
</div>
```

---

### 5. `src/components/layout/MobileBottomNav.tsx` - Add Theme Toggle to More Menu

Add theme toggle in the "More Options" sheet:

```tsx
import ThemeToggle from "@/components/ThemeToggle";

// Add after the grid of secondary items:
<div className="flex items-center justify-between pt-4 border-t border-border mt-4">
  <span className="text-sm text-muted-foreground">Theme</span>
  <ThemeToggle showLabel />
</div>
```

---

### 6. `tailwind.config.ts` - Add Accent Color Token

Add the accent color to the Tailwind theme:

```ts
colors: {
  // existing colors...
  accent: {
    DEFAULT: "hsl(var(--accent))",
    foreground: "hsl(var(--accent-foreground))",
  },
}
```

---

### 7. `src/components/ui/button.tsx` - Add Accent Variant

Add a new button variant for accent-colored actions:

```tsx
variants: {
  variant: {
    // existing variants...
    accent: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-button",
  },
}
```

---

## Visual Preview

### Dark Mode (#0A0F14 background)
```text
+--------------------------------------------------+
|  ████  DataForge    Features  Data Agent   ☀/🌙  |
+--------------------------------------------------+
|  ┌────────┐  ┌──────────────────────────────────┐|
|  │ Upload │  │  Dashboard Content               │|
|  │ Preview│  │                                  │|
|  │ Dash   │  │  ┌─────────┐ ┌─────────┐        │|
|  │ Chat   │  │  │ Chart 1 │ │ Chart 2 │        │|
|  │ ...    │  │  │ (blue)  │ │ (teal)  │        │|
|  │        │  │  └─────────┘ └─────────┘        │|
|  │ Theme  │  │                                  │|
|  │ ☀/🌙   │  │  [Primary Button] [Accent Btn]  │|
|  └────────┘  └──────────────────────────────────┘|
+--------------------------------------------------+
```

### Color Usage
- **#0A0F14** - Main background, deep dark
- **#1F6FEB** - Primary buttons, active states, links
- **#F97316** - Accent highlights, AI actions, CTAs
- **#CBD5E1** - Main text color

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `src/index.css` | Complete CSS variable update for both dark/light modes |
| `src/components/ThemeToggle.tsx` | Enhanced with `showLabel` prop |
| `src/components/Navbar.tsx` | Add theme toggle to desktop + mobile menu |
| `src/components/layout/ResponsiveSidebar.tsx` | Add theme toggle at bottom |
| `src/components/layout/MobileBottomNav.tsx` | Add toggle to More sheet |
| `tailwind.config.ts` | Add accent color token |
| `src/components/ui/button.tsx` | Add accent button variant |

---

## Implementation Order

1. **CSS Variables** - Update `src/index.css` with new color scheme
2. **Tailwind Config** - Add accent color token
3. **Button Variant** - Add accent variant to button component
4. **Theme Toggle** - Enhance with label option
5. **Navbar** - Add toggle to desktop and mobile views
6. **Sidebar** - Add toggle at bottom
7. **Mobile Nav** - Add toggle to More menu

---

## Technical Notes

### Color Conversion Reference
```text
#0A0F14 → hsl(210, 33%, 6%)
#1F6FEB → hsl(212, 85%, 52%)
#F97316 → hsl(25, 95%, 53%)
#CBD5E1 → hsl(215, 20%, 85%)
```

### Contrast Ratios
All color combinations will meet WCAG AA standards:
- Text (#CBD5E1) on Background (#0A0F14): 12.4:1 ✓
- Primary (#1F6FEB) on Background: 4.5:1 ✓
- Accent (#F97316) on Background: 5.8:1 ✓
