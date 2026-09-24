/**
 * Paint-job cosmetics: a shared palette of skins selectable per vehicle. `"default"` is
 * always unlocked for every vehicle and simply means "use the vehicle's own base colors"
 * (see `getEffectiveVehicleConfig`, which only overrides `color`/`accentColor` for
 * non-default skins). All other skins are purchased once and can then be applied to any
 * vehicle.
 */
export interface SkinDef {
  id: string;
  name: string;
  price: number;
  color: number;
  accentColor: number;
}

export const SKINS: SkinDef[] = [
  { id: "default", name: "Factory Paint", price: 0, color: 0, accentColor: 0 },
  { id: "crimson-blaze", name: "Crimson Blaze", price: 300, color: 0xd1495b, accentColor: 0xffb3b3 },
  { id: "ocean-teal", name: "Ocean Teal", price: 300, color: 0x2a9d8f, accentColor: 0x8fe3d8 },
  { id: "sunset-gold", name: "Sunset Gold", price: 400, color: 0xf4a300, accentColor: 0xffe27a },
  { id: "shadow-black", name: "Shadow Black", price: 500, color: 0x2b2b2f, accentColor: 0x8a8a92 },
  { id: "neon-lime", name: "Neon Lime", price: 500, color: 0x8bd346, accentColor: 0xdcffb0 },
];

export function getSkinById(id: string): SkinDef {
  return SKINS.find((skin) => skin.id === id) ?? SKINS[0]!;
}
