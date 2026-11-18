# Assets & licences

## 3D models

All laboratory equipment currently in LabVerse 3D is **procedurally generated in code** (`src/components/lab/models/`) — original work, no third-party meshes or textures. Nothing is fetched from external model URLs at runtime.

The manifest `public/models/manifest.json` is empty on purpose. To add a downloaded model:

1. Use only assets whose licence permits redistribution in your deployment (CC0 / CC-BY with attribution / explicitly commercial-friendly). Good sources: Khronos glTF Sample Assets, Poly Haven (CC0), properly licensed Sketchfab downloads, your own Blender exports. Do not scrape or bypass download restrictions. Google Poly was shut down in 2021; archived copies are not a reliable licence record.
2. Optimise (`npx gltf-transform optimize in.glb out.glb --compress draco --texture-compress webp`) and place the file in `public/models/`.
3. Add an entry:
   ```json
   {
     "id": "beaker-glb",
     "name": "Beaker",
     "path": "/models/beaker.glb",
     "source": "https://…",
     "license": "CC0-1.0",
     "attribution": "Author name (if required)",
     "intendedUse": "Chemistry glassware",
     "fallback": "beaker",
     "targetSize": 0.45
   }
   ```
4. Set `assetId: "beaker-glb"` on the component in `src/lib/registry/*.ts`. `AssetModel` normalises scale, sits the model on the table, caches it, and falls back to the procedural model if loading fails.

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
