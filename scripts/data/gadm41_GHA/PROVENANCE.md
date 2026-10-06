# Ghana administrative boundaries (source for ghanaBoundaries.json)

`gadm41_GHA_0` (country), `_1` (16 regions) and `_2` (260 districts), WGS84.

Supplied by GMet from `Documents/seasonal fcst/Shape files/gadm41_GHA_shp`
(files dated June to August 2024). These are GADM 4.1 geometry re-attributed to
the current 16 regions and post-2018 districts. Stock GADM 4.1 still has the old
10 regions. Attribute fields: `Level3Name` (district), `Level2Name` (region),
`Level1Name` ("Ghana").

Known defects, handled in `scripts/build-ghana-boundaries.mjs`:

- Two records are both named **Adansi Asokwa**. The western one (it reaches
  -1.707°, and contains Fomena) is **Adansi North**, which is otherwise missing.
  The build renames it and checks Fomena lands inside.
- **Guan** District (Oti, created 2022) has no polygon. Its area is still drawn
  as part of the districts it was carved from. The app lists Guan by name, but a
  map tap or GPS fix there resolves to the neighbouring polygon.
- Thirteen district names are spelled differently from the backend (Kasena /
  Kassena, Wassa Amenfi / Amenfi, Sagnerigu / Sagnarigu ...). The build maps them
  through `NAME_ALIASES` to the names in `src/shared/data/ghanaRegions.ts`.

Regenerate with `node scripts/build-ghana-boundaries.mjs` from `mobile/`.
