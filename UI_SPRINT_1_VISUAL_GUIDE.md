# UI/UX Sprint 1 - Visual Reference Guide
## What to Look For in the Screenshot

---

## The Transformation

### ❌ BEFORE (What We Killed)
- White cards with rounded borders
- Forest green sidebar gradient (teal/emerald)
- Contained layout with max-width and padding
- "Study Hub" label in sidebar
- Split routes (/app/middle, /app/high)
- Grid dashboard with 6 buttons (High School)

### ✅ AFTER (What We Built)
- Edge-to-edge dark slate background
- Premium dark sidebar (slate-900)
- Full-bleed Galaxy canvas (100% viewport)
- "🌌 My Galaxy" label in sidebar
- Unified route (/app)
- Floating frosted glass HUD

---

## Screenshot Checklist

### 1. The Sidebar (Left Edge)
**Look for**:
- Dark slate background (`bg-slate-900`)
- Subtle right border (`border-slate-800`)
- "🌌 My Galaxy" as first nav item (with galaxy emoji)
- Indigo active state (`bg-indigo-600`)
- Slate-400 inactive text
- Indigo-400 hover states

**Verify**:
- [ ] No forest green gradient
- [ ] No teal/emerald colors
- [ ] Clean, premium dark aesthetic
- [ ] Galaxy emoji visible

### 2. The Main Canvas (Center)
**Look for**:
- Deep space background (`bg-slate-950`)
- Stars stretching to absolute edges
- No white cards or borders
- No container padding
- Full-screen Galaxy visualization

**Verify**:
- [ ] No white wrapper cards
- [ ] No rounded borders around Galaxy
- [ ] Stars reach screen edges
- [ ] Seamless blend with background

### 3. Top Left HUD (Floating Panel)
**Look for**:
- Frosted glass panel (`bg-slate-900/60 backdrop-blur-md`)
- Subtle border (`border-slate-700/50`)
- Rounded corners (`rounded-xl`)
- Deep shadow (`shadow-2xl`)
- "Your Learning Galaxy" title
- Galaxy Legend (Learning, Developing, Mastered)

**Verify**:
- [ ] Panel floats over stars
- [ ] Glassmorphism effect visible
- [ ] Text readable against background
- [ ] Legend shows orbit states

### 4. Top Right HUD (Upload Button)
**Look for**:
- Frosted glass button
- "Upload Materials" text
- Sparkles icon
- Same glassmorphism style as other HUD elements

**Verify**:
- [ ] Button floats over stars
- [ ] Glassmorphism effect visible
- [ ] Hover state works

### 5. Bottom Center HUD (Smart CTA)
**Look for**:
- Frosted glass panel
- Smart CTA button (varies by state)
- Centered at bottom of screen
- Examples:
  - "🔐 Review Fading Memories" (Vault)
  - "Unpack New Mission" (Airlock)
  - "Forge Understanding" (Low Mastery)

**Verify**:
- [ ] Panel floats over stars
- [ ] Centered horizontally
- [ ] CTA button visible and styled
- [ ] Glassmorphism effect visible

### 6. Decontamination Banner (Top Center, if present)
**Look for**:
- Only appears if quarantined topics exist
- Floats at top center
- Amber/yellow warning style
- "X topics in quarantine" message

**Verify**:
- [ ] Floats above other HUD elements (z-50)
- [ ] Centered horizontally
- [ ] Visible if quarantine count > 0

---

## Color Verification

### Background Colors
- **Main app**: `#0f172a` (slate-950) - Very dark blue-gray
- **Sidebar**: `#0f172a` (slate-900) - Slightly lighter dark
- **HUD panels**: `rgba(15, 23, 42, 0.6)` (slate-900/60) - Translucent

### Border Colors
- **Sidebar border**: `#1e293b` (slate-800) - Subtle gray
- **HUD borders**: `rgba(51, 65, 85, 0.5)` (slate-700/50) - Translucent gray

### Text Colors
- **Active nav**: `#ffffff` (white)
- **Inactive nav**: `#94a3b8` (slate-400)
- **Hover nav**: `#818cf8` (indigo-400)
- **HUD text**: `#ffffff` (white) or `#cbd5e1` (slate-300)

### Accent Colors
- **Active state**: `#4f46e5` (indigo-600)
- **Hover state**: `#818cf8` (indigo-400)
- **Brand dot**: `#818cf8` (indigo-400)

---

## Layout Verification

### Sidebar
- Width: `16rem` (256px) on desktop
- Position: Fixed left edge
- Height: 100vh
- Overflow: Auto (scrollable)

### Main Canvas
- Width: `calc(100vw - 16rem)` (full width minus sidebar)
- Height: 100vh
- Position: Relative
- Overflow: Hidden (Galaxy handles its own scrolling)

### HUD Panels
- Position: Absolute
- Z-index: 40 (50 for banner)
- Top Left: `top-6 left-6`
- Top Right: `top-6 right-6`
- Bottom Center: `bottom-8 left-1/2 -translate-x-1/2`

---

## Glassmorphism Effect

### What to Look For
- **Blur**: Background stars should be slightly blurred behind HUD panels
- **Transparency**: Can see stars through panels (60% opacity)
- **Border**: Subtle glowing border around panels
- **Shadow**: Deep shadow creates depth

### How to Verify
1. Look at HUD panels
2. Check if stars are visible behind them (blurred)
3. Verify panels don't block stars completely
4. Confirm frosted glass aesthetic

---

## Navigation Test

### Click "🌌 My Galaxy"
**Expected**:
- Routes to `/app`
- Active state highlights (indigo background)
- Galaxy loads with full-bleed canvas
- HUD panels float over stars

### Click Other Nav Items
**Expected**:
- Active state moves to clicked item
- Previous item returns to inactive state
- Smooth transition

---

## Mobile View (Bonus)

### If Testing on Mobile
**Look for**:
- Dark header bar at top
- Hamburger menu button (indigo)
- Drawer slides in from left
- Same dark aesthetic
- Same navigation structure

---

## Common Issues to Check

### ❌ If You See White Cards
- Old middle/high pages still loading
- Need to navigate to `/app` directly
- Clear browser cache

### ❌ If You See Forest Green
- Old sidebar styling cached
- Hard refresh (Ctrl+Shift+R)
- Check Sidebar.tsx changes applied

### ❌ If Galaxy is Contained
- Old layout wrapper still present
- Check page.tsx is using full-bleed layout
- Verify no max-width containers

### ❌ If HUD Panels Don't Float
- Z-index not applied
- Absolute positioning missing
- Check page.tsx HUD implementation

---

## Screenshot Composition

### Ideal Screenshot Shows
1. **Left**: Dark sidebar with "🌌 My Galaxy" active
2. **Center**: Full-screen Galaxy with stars
3. **Top Left**: Frosted glass title panel
4. **Top Right**: Frosted glass upload button
5. **Bottom Center**: Frosted glass Smart CTA
6. **Overall**: Edge-to-edge dark aesthetic, no white cards

### Camera Angle
- Full desktop view (1920x1080 or similar)
- Show entire sidebar + main canvas
- Capture all HUD panels
- Ensure stars are visible and vibrant

---

## Success Criteria

The screenshot is perfect when:
- ✅ No white cards visible
- ✅ Stars stretch to screen edges
- ✅ Sidebar is premium dark (not forest green)
- ✅ HUD panels float with glassmorphism
- ✅ "🌌 My Galaxy" visible in sidebar
- ✅ Deep space aesthetic throughout
- ✅ Indigo accents pop against dark background

---

**Ready for Screenshot** 📸

Navigate to `/app` and capture the Spatial Operating System in all its Dark Academia glory.
