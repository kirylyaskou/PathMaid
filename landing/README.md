# PathMaid Landing

Standalone static landing page for PathMaid distribution. It has no build step and no npm dependencies.

Open `index.html` directly, or serve the folder with any static host.

## Release Links

Download buttons resolve assets from the latest GitHub release at runtime. If the GitHub API is temporarily unavailable, buttons fall back to the latest release page.

## Asset Sizes

Use these generation targets:

| File | Size | Use |
| --- | ---: | --- |
| `pathmaid-icon-128.png` | 128 x 128 | Current app icon used as favicon and header mark. |
| `hero-character.png` | 1106 x 1422 current, target 1080 x 1320+ | Main mascot art for the first screen. Current file is wired into the hero. |
| `cloud-sync-guide.png` | 1254 x 1254 current, target 1200 x 1200+ | Cloud sync section art. Current file is wired into the page. |
| `feature-wide.png` | 1774 x 887 current, target 2:1 | Wide transformation banner for the middle showcase. Current file is wired into the page. |
| `service-card-encyclopedia.png` | 1505 x 1045 current, target 720 x 500+ | Slider art for the complete PF2e encyclopedia. Current file is wired into the first slide. |
| `service-card-combat.png` | 1505 x 1045 current, target 720 x 500+ | Slider art for combat, encounter, and effects tracking. Current file is wired into slide 2. |
| `service-card-pathbuilder.png` | 1469 x 1071 current, target 720 x 500+ | Slider art for Pathbuilder character import. Current file is wired into slide 3. |
| `service-card-custom.png` | 1462 x 1076 current, target 720 x 500+ | Slider art for custom creature creation. Current file is wired into slide 4. |
| `service-card-campaign.png` | 1436 x 1096 current, target 720 x 500+ | Slider art for campaign manager, marked as in progress. Current file is wired into slide 5. |
| `og-image.png` | 1200 x 630 | Future social sharing image. Not wired yet. |

Current page uses white placeholder slots instead of image files.
