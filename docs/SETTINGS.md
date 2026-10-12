# Settings

Player settings (crosshair and music volume), chosen in the menu's Settings panel and saved in the player's profile, so
they follow the player to every server. Code: `shared/settings.ts` (options, defaults,
validation), `client/crosshair.ts` (drawing), `client/settingsScreen.ts` (the panel), `client/playerSettings.ts` (loading, changing and
saving them).

## Crosshair

| Option  | Choices                          | Default |
| ------- | -------------------------------- | ------- |
| Style   | Dot, Cross, Cross + Dot, Circle  | Dot     |
| Color   | White, Green, Cyan, Yellow, Pink | White   |
| Size    | Small, Medium, Large             | Small   |
| Outline | On, Off                          | On      |

The default matches the original crosshair: a small white dot with a dark outline.

### Why these options

- **The crosshair matters most in a one-shot headshot game.** Competitive shooters let
  players tune it heavily; Valorant exposes color, outline, line length, thickness and gap,
  among others. DOMED offers presets instead of sliders: a few good choices cover most
  preferences, and a short list is easier to use on a phone later.
- **Outline on by default.** A dark outline keeps the crosshair visible on light and dark
  surfaces alike, which matters with maps ranging from night to daylight. The preview shows
  the crosshair over a dark and a light half for the same reason.
- **No red.** Red and green are hard to tell apart for most color blind players, and the
  hitmarker already flashes red on headshots. White and cyan, the colors most players pick in
  Valorant, stay readable for nearly everyone.

### Rejected or deferred

- **Free sliders and custom color codes.** More control than a casual arcade game needs;
  they can come later if players ask.
- **Mouse sensitivity.** Roblox's own settings menu (Esc) already has a camera sensitivity
  slider that works with the default first-person camera DOMED uses. A setting of our own
  would need a custom camera, so it waits.

## Music volume

Off, Low, Medium (default) or High; see FEEDBACK.md. Kept low overall so music never drowns
out the sounds that tell players where enemies are.

## Saving

Changes apply at once. The client saves a second after the last change, so clicking through
options sends one save. The server never trusts what a client sends: `sanitizeSettings`
replaces anything invalid with the default.

## Sources

- [VALORANT crosshair settings explained](https://aimcodes.com/en/valorant-crosshair-settings/)
- [Best VALORANT crosshair (ProSettings.net)](https://prosettings.net/blog/best-valorant-crosshair/):
  white, cyan and green as the colors most pros use
- [Game Accessibility Top Ten (IGDA Game Accessibility SIG)](https://igda-gasig.org/how/game-accessibility-top-ten-se/):
  avoid relying on red against green
- [Xbox Accessibility Guideline 103](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/103):
  contrast outlines so elements read on any background
