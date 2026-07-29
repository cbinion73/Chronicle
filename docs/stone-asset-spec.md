# Scripture Prayer Beads Asset Standard

The prayer player uses one coherent visual system for all stones and hardware.

## Source asset contract

- 360 x 360 lossless WebP with a real alpha channel.
- Fully transparent canvas corners and at least 35 pixels of transparent padding.
- Stone spheres are centered at a consistent 225-240 pixel diameter.
- No checkerboard, white matte, floor plane, cast shadow, contact shadow, or reflected duplicate is baked into the file.
- The original material, internal texture, highlight direction, and hardware detail remain part of the asset.
- Crosses and the centerpiece retain their natural proportions; they are not forced into a circular crop.

## Rendering contract

The prayer player uses `object-fit: contain` and supplies the shared drop shadow in CSS. This keeps lighting treatment consistent and lets the same asset work on every Chronicle theme.

Run `npm run qa:stones` after adding or replacing an asset. The check rejects missing alpha, opaque corners, inconsistent canvas padding, irregular bead scale, and pixels beneath the allowed bead bounds.
