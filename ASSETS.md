# Assets & licences

## 3D models

Real-world models are used **only** where a genuinely matching, properly licensed model exists. Components without a matching model are modelled in code (`src/components/lab/models/`). The full list with authors is in `public/models/manifest.json` and shown in the app at `/credits`.

| Source | Licence | Used for |
|---|---|---|
| [Poly Haven](https://polyhaven.com) – Chemistry Set (Jiří Ptáček) | CC0 | large/small beaker, test tube, reagent bottle, dropper bottle, retort stand & clamp, test-tube stand |
| Poly Haven – Bunsen Burner (BKS) | CC0 | Bunsen burner with tripod |
| Poly Haven – Lightbulb 01, Pull Chain Light Socket (Josh Dean) | CC0 | bulb and lamp holder |
| Poly Haven – Retro Multimeter (elli moeller) | CC0 | ammeter / voltmeter / ohmmeter (needle animated by the reading) |
| Poly Haven – Seadogs Compass (Benny Weimer) | CC0 | compass (needle animated by the magnetic field) |
| [Poly Pizza](https://poly.pizza) – AA battery, rotary dial, funnel, digital scale (Poly by Google) | CC-BY 3.0 | battery, potentiometer, funnel, balance |
| Poly Pizza – digital multimeter (J-Toastie), push button (Zoe XR), DIP IC (Edward Lynch), oscilloscope (Rob Bogucki), cartridge fuse (moriarty), conical flask (Amanda Roach) | CC-BY 3.0 | matching components |
| Poly Pizza – lever switch (Quaternius), TO-220 transistor & safety glasses (iPoly3D), probe thermometer, hot plate, porcelain bowl (MilkAndBanana) | CC0 | matching components |

Still modelled in code because no matching licensed model was found: resistor, rheostat, capacitor, inductor/coil, electromagnet, thermistor, LDR, LED, diodes, relay, MOSFET, DC/AC supply, motor, buzzer, heater, terminal block, ground, material sample, measuring cylinder, steel-wool pad, pipette, stirring rod, wash bottle, gloves.

Glass models from Poly Haven are loaded as `.gltf` + textures (1k) directly; Poly Pizza models are `.glb`. Wire binding posts (red +, blue −, brass) are drawn by the app on top of every model so connection points are always visible.

To add a model: check the licence, place the file under `public/models/`, add a manifest entry (`fit`, `rotation`, `nodes`), and map the component in `ASSET_MAP` (`src/lib/registry/index.ts`).

## Sounds

All sound effects are synthesised at runtime with the Web Audio API (`src/lib/client/sound.ts`): pouring, effervescence, sparks, burner roar, buzzer, motor hum, clicks and chimes. No audio files are shipped, so there are no third-party licences to track. If recorded samples are added later, store them in `public/sounds/` with a manifest recording source and licence (prefer CC0).

## Fonts

Inter, IBM Plex Sans Arabic and JetBrains Mono via `next/font/google` (SIL Open Font License 1.1), self-hosted by Next.js at build time.

## Scientific data

| Data | Source |
|---|---|
| Atomic weights | IUPAC abridged standard atomic weights; mass numbers for elements without stable isotopes are flagged |
| Electron configurations | Aufbau order with documented ground-state exceptions; Z > 103 marked predicted |
| Substances | Standard chemistry references; molar masses computed from IUPAC weights; each links to a PubChem name search for verification |
| Reactions | Standard school-level reactions; every equation is atom-balance checked by `src/lib/chem/chem.test.ts` |
| Geologic eras | ICS International Chronostratigraphic Chart (rounded) |
| Curriculum mapping | Draft only — **not verified** against the official Egyptian Ministry textbook 2026–2027 |
