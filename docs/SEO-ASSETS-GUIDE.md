# SEO Image Assets Guide

This document outlines all required image assets for complete SEO optimization, including specifications and AI generation prompts.

---

## Quick Reference

| Asset | Dimensions | Format | Location | Priority |
|-------|------------|--------|----------|----------|
| OG Image | 1200×630px | PNG/JPG | `/public/og-image.png` | Required |
| Twitter Image | 1200×600px | PNG/JPG | `/public/twitter-image.png` | Required |
| Logo | 512×512px | PNG | `/public/logo.png` | Required |
| Favicon ICO | 48×48px | ICO | `/src/app/favicon.ico` | Required |
| Apple Touch Icon | 180×180px | PNG | `/public/apple-touch-icon.png` | Recommended |
| Favicon 32 | 32×32px | PNG | `/public/favicon-32x32.png` | Optional |
| Favicon 16 | 16×16px | PNG | `/public/favicon-16x16.png` | Optional |

---

## Detailed Specifications

### 1. OpenGraph Image (og-image.png)

**Purpose:** Displayed when your site is shared on Facebook, LinkedIn, Discord, Slack, iMessage, and other platforms.

| Specification | Value |
|---------------|-------|
| Dimensions | 1200 × 630 pixels |
| Aspect Ratio | 1.91:1 |
| Format | PNG (preferred) or JPG |
| Max File Size | < 1MB (ideally < 300KB) |
| Color Space | sRGB |
| Safe Zone | Keep important content within center 1080×560px |

**Content Requirements:**
- Brand name "Lead Scraper" prominently displayed
- Tagline or value proposition
- Visual elements suggesting lead generation / business data
- Dark or gradient background for modern SaaS look
- No small text (unreadable at thumbnail size)

**AI Image Generation Prompt:**
```
Create a professional OpenGraph social media preview image for a SaaS product called "Lead Scraper".

Specifications:
- Dimensions: 1200x630 pixels
- Style: Modern, clean, professional SaaS aesthetic
- Background: Dark gradient (deep blue #1a1a2e to navy #16213e) with subtle geometric patterns or abstract data visualization elements
- Main text: "Lead Scraper" in bold white sans-serif font, centered
- Subtext: "Google Maps Lead Generation" in lighter blue (#a5b4fc), below main title
- Visual elements: Abstract representations of location pins, data nodes, or network connections in accent colors (indigo #4f46e5, purple #7c3aed)
- Mood: Professional, trustworthy, tech-forward
- No photorealistic humans, use abstract/geometric elements only
- Ensure text is large and readable even at small thumbnail sizes
```

---

### 2. Twitter Card Image (twitter-image.png)

**Purpose:** Displayed when your site is shared on Twitter/X with `summary_large_image` card type.

| Specification | Value |
|---------------|-------|
| Dimensions | 1200 × 600 pixels |
| Aspect Ratio | 2:1 |
| Format | PNG (preferred) or JPG |
| Max File Size | < 1MB (ideally < 300KB) |
| Color Space | sRGB |

**Content Requirements:**
- Similar to OG image but slightly different aspect ratio
- Can be a cropped/adjusted version of OG image
- Brand name clearly visible
- Works well with Twitter's dark and light modes

**AI Image Generation Prompt:**
```
Create a Twitter card image for a SaaS product called "Lead Scraper".

Specifications:
- Dimensions: 1200x600 pixels (2:1 aspect ratio)
- Style: Modern, clean, professional SaaS aesthetic
- Background: Dark gradient (deep blue #1a1a2e to navy #16213e) with subtle abstract elements
- Main text: "Lead Scraper" in bold white sans-serif font, horizontally centered
- Subtext: "Google Maps Lead Generation" in muted blue (#a5b4fc)
- Accent elements: Subtle glowing orbs or data visualization dots in indigo (#4f46e5) and purple (#7c3aed)
- Keep design minimal and impactful
- All important elements within center safe zone (1000x500px)
- No busy patterns that compete with text
```

---

### 3. Logo (logo.png)

**Purpose:** Used in JSON-LD structured data for Google Knowledge Panel, rich results, and brand recognition.

| Specification | Value |
|---------------|-------|
| Dimensions | 512 × 512 pixels (square) |
| Format | PNG with transparency |
| Max File Size | < 100KB |
| Background | Transparent |

**Content Requirements:**
- Simple, recognizable icon/symbol
- Works at small sizes (down to 32px)
- Represents lead generation / location / data concept
- Should work on both light and dark backgrounds

**AI Image Generation Prompt:**
```
Create a modern app logo icon for "Lead Scraper", a Google Maps lead generation tool.

Specifications:
- Dimensions: 512x512 pixels (square)
- Style: Minimal, modern, flat design with subtle gradients
- Background: Transparent
- Concept options (choose one):
  Option A: Stylized location pin combined with data/chart element
  Option B: Abstract "L" and "S" lettermark with location pin accent
  Option C: Magnifying glass over a location pin with data nodes
- Colors: Primary indigo (#4f46e5) with purple accent (#7c3aed), white elements
- Must be recognizable at 32x32px size
- Clean edges, no fine details that disappear at small sizes
- No text in the icon itself
- Modern tech startup aesthetic
```

---

### 4. Favicon (favicon.ico)

**Purpose:** Browser tab icon, bookmarks, history.

| Specification | Value |
|---------------|-------|
| Dimensions | Multi-size ICO (16, 32, 48px) |
| Format | ICO (contains multiple sizes) |
| Background | Transparent or solid |

**Content Requirements:**
- Simplified version of logo
- Must be recognizable at 16×16px
- High contrast for visibility
- Simple shapes only

**AI Image Generation Prompt:**
```
Create an ultra-minimal favicon icon for "Lead Scraper".

Specifications:
- Dimensions: 48x48 pixels
- Style: Ultra-minimal, single recognizable shape
- Design: Simplified location pin OR abstract "L" shape with pin element
- Colors: Solid indigo (#4f46e5) on transparent background
- Must read clearly at 16x16 pixels
- Maximum 2-3 colors
- No gradients (optional: single subtle gradient)
- No fine lines or small details
- Bold, chunky shapes only
```

**Note:** After generating, convert to ICO format containing 16×16, 32×32, and 48×48 sizes using a tool like [favicon.io](https://favicon.io/) or [realfavicongenerator.net](https://realfavicongenerator.net/).

---

### 5. Apple Touch Icon (apple-touch-icon.png)

**Purpose:** iOS home screen icon when users "Add to Home Screen".

| Specification | Value |
|---------------|-------|
| Dimensions | 180 × 180 pixels |
| Format | PNG |
| Background | Solid color (iOS adds rounding) |
| Corners | Square (iOS rounds automatically) |

**Content Requirements:**
- Same as logo but with solid background
- No transparency (use brand background color)
- iOS will add rounded corners automatically

**AI Image Generation Prompt:**
```
Create an iOS app icon for "Lead Scraper".

Specifications:
- Dimensions: 180x180 pixels (square)
- Style: iOS app icon style, modern and clean
- Background: Solid dark blue (#1a1a2e) or gradient (dark blue to navy)
- Icon: Centered location pin with data element, matching the logo design
- Colors: White or light icon on dark background, with indigo (#4f46e5) accent
- No rounded corners (iOS adds these automatically)
- Padding: ~15% margin from edges
- Bold, simple, recognizable at small sizes
```

---

### 6. Favicon 32×32 (favicon-32x32.png)

**Purpose:** High-resolution browser tabs, Windows taskbar.

| Specification | Value |
|---------------|-------|
| Dimensions | 32 × 32 pixels |
| Format | PNG |
| Background | Transparent |

**AI Prompt:** Use the same prompt as Favicon, then resize to 32×32px.

---

### 7. Favicon 16×16 (favicon-16x16.png)

**Purpose:** Standard browser tab icon.

| Specification | Value |
|---------------|-------|
| Dimensions | 16 × 16 pixels |
| Format | PNG |
| Background | Transparent |

**AI Prompt:** Use the same prompt as Favicon, then resize to 16×16px.

---

## Brand Colors Reference

Use these colors consistently across all assets:

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| Primary Dark | `#1a1a2e` | Backgrounds |
| Secondary Dark | `#16213e` | Gradient end |
| Primary Indigo | `#4f46e5` | Primary accent |
| Purple Accent | `#7c3aed` | Secondary accent |
| Light Blue | `#a5b4fc` | Subtext, highlights |
| Muted Gray | `#9ca3af` | Tertiary text |
| White | `#ffffff` | Primary text |

---

## File Checklist

After generating all assets, verify the following files exist:

```
/public/
├── og-image.png          ← 1200×630 (replace og-image.svg)
├── twitter-image.png     ← 1200×600 (replace twitter-image.svg)
├── logo.png              ← 512×512
├── apple-touch-icon.png  ← 180×180
├── favicon-32x32.png     ← 32×32
└── favicon-16x16.png     ← 16×16

/src/app/
└── favicon.ico           ← Multi-size ICO (already exists, update if needed)
```

---

## Post-Generation Steps

### 1. Update site-config.ts

After replacing SVGs with PNGs:

```typescript
// src/lib/site-config.ts
ogImage: "/og-image.png",      // Change from .svg
twitterImage: "/twitter-image.png",  // Change from .svg
```

### 2. Add Apple Touch Icon to Metadata

Add to `src/app/layout.tsx` metadata:

```typescript
icons: {
  icon: [
    { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
  ],
  apple: [
    { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  ],
},
```

### 3. Optimize File Sizes

Before deploying, compress all images:

- **PNG:** Use [TinyPNG](https://tinypng.com/) or `pngquant`
- **JPG:** Use [Squoosh](https://squoosh.app/) or `mozjpeg`
- Target: OG/Twitter images < 300KB, icons < 50KB

### 4. Validate

- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Favicon Checker](https://realfavicongenerator.net/favicon_checker)

---

## AI Image Generation Tools

Recommended tools for generating these assets:

| Tool | Best For | Notes |
|------|----------|-------|
| Midjourney | OG/Twitter images | High quality, artistic |
| DALL-E 3 | All assets | Good text rendering |
| Stable Diffusion | All assets | Free, customizable |
| Adobe Firefly | All assets | Commercial-safe |
| Ideogram | Text-heavy images | Best for text in images |

**Tip:** For the logo and favicon, you may get better results using a vector tool (Figma, Illustrator) or a specialized logo generator after getting AI concepts.

---

## Summary

**Minimum Required (3 assets):**
1. `og-image.png` - 1200×630
2. `twitter-image.png` - 1200×600
3. `logo.png` - 512×512

**Recommended (6 assets):**
4. `apple-touch-icon.png` - 180×180
5. `favicon-32x32.png` - 32×32
6. `favicon-16x16.png` - 16×16

**Total: 6 image assets for complete SEO coverage**
