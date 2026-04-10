export function StoreHeader({ store }: { store: any }) {
  return (
    <section className="card" style={{ overflow: "hidden" }}>
      <div style={{ height: 180, background: store.bannerUrl ? `url(${store.bannerUrl}) center/cover` : "linear-gradient(135deg, #304f46, #55786d)" }} />
      <div style={{ padding: 20 }} className="stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0 }}>{store.name}</h1>
            <p className="muted" style={{ marginBottom: 0 }}>{store.location || "Australia"}</p>
          </div>
          <button className="btn btn-primary">Follow store</button>
        </div>
        {store.bio ? <p style={{ margin: 0 }}>{store.bio}</p> : null}
      </div>
    </section>
  );
}
