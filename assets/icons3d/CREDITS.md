# 3D icon credits

Every file in this directory is from **Microsoft Fluent Emoji**, the `3D` style,
licensed **MIT** (Copyright (c) Microsoft Corporation).

- Source: https://github.com/microsoft/fluentui-emoji
- Licence: https://github.com/microsoft/fluentui-emoji/blob/main/LICENSE

MIT permits use, modification and redistribution in a shipped app, and unlike
the CC BY-SA photographs in `assets/weather/` it does **not** require in-app
attribution. It does require the copyright notice and permission text to travel
with the copies, which is what this file is for. Keep it here; do not delete it
when adding or replacing an icon.

## Why this set

The design reference for the icons was a set of glossy 3D "clay" weather
renders. Those particular files came from a design shot and are not licensable.
Fluent Emoji is the closest set in that visual language that can actually be
shipped: the same soft studio lighting, rounded volumes and baked shadows,
released under a licence with no attribution burden and no share-alike clause.

## Files

All are 256x256 RGBA PNG, taken unmodified from upstream. The local name is the
role the app uses it in, not the emoji's name, so a future swap only has to
match the role.

| Local file                 | Upstream asset                    |
| -------------------------- | --------------------------------- |
| `sun.png`                  | Sun                               |
| `moon.png`                 | Crescent moon                     |
| `sun-small-cloud.png`      | Sun behind small cloud            |
| `sun-cloud.png`            | Sun behind cloud                  |
| `cloud.png`                | Cloud                             |
| `fog.png`                  | Fog                               |
| `sun-rain-cloud.png`       | Sun behind rain cloud             |
| `cloud-rain.png`           | Cloud with rain                   |
| `cloud-lightning-rain.png` | Cloud with lightning and rain     |
| `house.png`                | House                             |
| `megaphone.png`            | Megaphone                         |
| `hammer-wrench.png`        | Hammer and wrench                 |
| `robot.png`                | Robot                             |
| `camera.png`               | Camera                            |
| `shopping-cart.png`        | Shopping cart                     |
| `thermometer.png`          | Thermometer                       |
| `droplet.png`              | Droplet                           |
| `wind.png`                 | Dashing away                      |
| `seedling.png`             | Seedling                          |
| `calendar.png`             | Calendar                          |
| `spiral-calendar.png`      | Spiral calendar                   |
| `package.png`              | Package                           |
| `egg.png`                  | Egg                               |
| `money-bag.png`            | Money bag                         |
| `chart-increasing.png`     | Chart increasing                  |
| `warning.png`              | Warning                           |
| `bell.png`                 | Bell                              |
| `clipboard.png`            | Clipboard                         |

## Re-downloading

```bash
B="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets"
curl -L -o sun.png "$B/Sun/3D/sun_3d.png"
# ...one per row of the table above; the upstream path is
# "<Upstream asset>/3D/<snake_cased_name>_3d.png", spaces percent-encoded.
```
