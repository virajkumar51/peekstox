/** Place once at the top of App.tsx, behind everything. Its glow layers drift with the tilt. */
export function SpatialWallpaper() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="spatial-layer sd-1 absolute -inset-10 bg-[radial-gradient(40%_35%_at_10%_10%,rgb(16_185_129/.32),transparent)]" />
      <div className="spatial-layer sd-1 absolute -inset-10 bg-[radial-gradient(40%_35%_at_90%_10%,rgb(139_92_246/.30),transparent)]" />
      <div className="spatial-layer sd-1 absolute -inset-10 bg-[radial-gradient(45%_40%_at_70%_100%,rgb(6_182_212/.20),transparent)]" />
    </div>
  );
}
