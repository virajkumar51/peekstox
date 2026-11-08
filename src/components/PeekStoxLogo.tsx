export function PeekStoxLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-9 w-9 shrink-0">
        <img
          src="/assets/aistudio/image_8933f246.png"
          alt="PeekStox"
          className="absolute inset-0 h-9 w-9 rounded-xl object-cover shadow-sm border border-[var(--border-color)] dark:hidden"
        />
        <img
          src="/assets/aistudio/image_fb5c5967.png"
          alt="PeekStox"
          className="absolute inset-0 h-9 w-9 rounded-xl object-cover shadow-sm border border-[var(--border-color)] hidden dark:block"
        />
      </div>
      <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
        PeekStox
      </span>
    </div>
  );
}

export function PeekStoxMark({ size = 32 }: { size?: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <img
        src="/assets/aistudio/image_8933f246.png"
        alt="PeekStox"
        style={{ width: size, height: size }}
        className="absolute inset-0 rounded-xl object-cover shadow-sm border border-[var(--border-color)] dark:hidden"
      />
      <img
        src="/assets/aistudio/image_fb5c5967.png"
        alt="PeekStox"
        style={{ width: size, height: size }}
        className="absolute inset-0 rounded-xl object-cover shadow-sm border border-[var(--border-color)] hidden dark:block"
      />
    </div>
  );
}
