function Skel({ w = "100%", h = 20, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background: "var(--bg-subtle)",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

export default function EditGymLoading() {
  return (
    <div className="odp2-scroll">
      <div className="adm-page-head">
        <Skel w={300} h={28} />
      </div>
      <Skel h={54} r={12} />
      <div className="adm-grid-2" style={{ marginTop: 20, marginBottom: 20 }}>
        <Skel h={220} r={12} />
        <Skel h={220} r={12} />
      </div>
      <Skel h={480} r={12} />
    </div>
  );
}
