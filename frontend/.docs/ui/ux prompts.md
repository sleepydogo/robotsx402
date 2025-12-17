**ACT AS:** Expert UI/UX Designer specialized in "Futuristic Industrial" & "Cyberpunk" interfaces for Web3/DeFi applications.

**PROJECT CONTEXT:** "ROBOTSx402": A decentralized platform for renting robotic hardware via Solana streaming payments. The aesthetic is a functional, military-grade sci-fi dashboard (HUD).

**DESIGN SYSTEM RULES (STRICT ADHERENCE):**

**1. COLOR PALETTE:**
* **Canvas/Background:** Deepest Black (`#050505` or `bg-cyber-black`). NOT pure black, but a deep, rich void.
* **Surfaces/Cards:** Translucent White (`bg-white/5` to `bg-white/10`) with `backdrop-blur`.
* **Primary Accent:** Neon Cyan (`#00F3FF` or `text-neon-cyan`). Used for active states, key data, and calls to action.
* **Functional Colors:** * Success/Online: Emerald Green (`text-emerald-400`).
    * Busy/Error: Red/Crimson (`text-red-400`).
    * Warning/Maintenance: Amber/Orange.
* **Borders:** Ultra-thin, low opacity borders (`border-white/10`). Hover states glow with `border-neon-cyan/50`.

**2. TYPOGRAPHY:**
* **Headings & UI Labels:** Clean Sans-Serif (e.g., Inter, Geist Sans). Tracking slightly wide for headers.
* **Data, Specs, Prices & Status:** STRICTLY Monospace (e.g., JetBrains Mono, Fira Code). This creates the "Engineering/Terminal" look.

**3. UI COMPONENTS & SHAPES:**
* **Glassmorphism:** Heavy use of `backdrop-blur-md` or `xl` for sidebars, modals, and sticky headers.
* **Corners:** * Containers/Cards: `rounded-xl` (Modern, slightly soft).
    * Tags/Badges: `rounded-full` (Pill shape).
    * Buttons: `rounded` or `rounded-lg`.
* **Borders:** 1px borders are mandatory on all cards and inputs to define hierarchy against the dark background.

**4. ATMOSPHERE & TEXTURE:**
* **Background Detail:** Subtle technical grid patterns (`bg-grid-white/[0.02]`) or radial gradients to create depth.
* **Lighting:** "Glow" effects on hover. Use `shadow-[0_0_15px_rgba(0,243,255,0.3)]` for active elements.
* **Density:** High data density. Use small fonts (text-xs, text-sm) for technical specs to mimic a professional control panel.

**5. INTERACTION VISUALS:**
* **Hover States:** Elements should feel reactive (light up, border color change).
* **Loading/Active:** Pulsing dots (animate-pulse) for live status indicators.