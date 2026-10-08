import { useEffect, useState } from "react";
import { api, amount, imageUrl } from "../../lib/market/api";
import Orders from "./Orders";
import VerificationReview from "./VerificationReview";
import {
  WorkspaceOverview,
  WorkspaceFinance,
  WorkspaceStores,
  WorkspaceSubscriptions,
  WorkspaceAdvertising,
} from "./WorkspacePanels";
function ProductEditor({ product, state, country, config, onSaved }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [existingImages, setExistingImages] = useState(product?.images || []),
    [category, setCategory] = useState(
      product?.category || config.categorySections[0][0],
    );
  const editableSellerIds = product ? [product.seller] : state.sellerIds;
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget));
      const seller = Number(data.seller),
        id =
          product?.id ||
          Math.max(10000, ...state.catalogue.map((p) => p.id)) + 1;
      const files = [...e.currentTarget.elements.photos.files];
      if (files.length && !state.sellerIds.includes(seller))
        throw Error(
          "Les nouvelles photos doivent être ajoutées par le propriétaire de la boutique.",
        );
      if (existingImages.length + files.length > 8)
        throw Error(
          "Un produit peut contenir jusqu’à 8 photos. Retirez une photo avant d’en ajouter.",
        );
      const images = [...existingImages];
      for (const file of files) {
        const form = new FormData();
        form.set("productId", String(id));
        form.set("sellerId", String(seller));
        form.set("photo", file);
        const uploaded = await api("/api/product-photos", {
          country,
          body: form,
        });
        images.push(uploaded.url);
      }
      if (!images.length)
        throw Error("Ajoutez au moins une photo de votre produit.");
      await api("/api/marketplace/catalogue", {
        country,
        body: {
          ...product,
          id,
          seller,
          title: data.title,
          category: data.category,
          subcategory: data.subcategory,
          price: Number(data.price),
          stock: Number(data.stock),
          desc: data.desc,
          images,
          img: images[0],
          visible: data.visible === "on",
          approved: state.roles.admin
            ? data.approved === "on"
            : product?.approved || false,
        },
      });
      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="yv-form" onSubmit={save}>
      <h3>{product ? "Modifier le produit" : "Ajouter un produit"}</h3>
      <label>
        Boutique
        <select
          name="seller"
          defaultValue={product?.seller || editableSellerIds[0]}
        >
          {editableSellerIds.map((id) => (
            <option key={id} value={id}>
              {state.stores.find((s) => s.id === id)?.name || "Boutique " + id}
            </option>
          ))}
        </select>
      </label>
      <label>
        Nom *
        <input
          name="title"
          required
          defaultValue={product?.title}
          maxLength={100}
        />
      </label>
      <div className="yv-fields">
        <label>
          Catégorie
          <select
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {config.categorySections.map((c) => (
              <option key={c[0]}>{c[0]}</option>
            ))}
          </select>
        </label>
        <label>
          Sous-catégorie
          <select
            key={category}
            name="subcategory"
            defaultValue={
              product?.category === category ? product?.subcategory || "" : ""
            }
          >
            <option value="">Choisir…</option>
            {config.categorySections
              .find((c) => c[0] === category)?.[3]
              .map((sub) => (
                <option key={sub[0]}>{sub[0]}</option>
              ))}
          </select>
        </label>
        <label>
          Prix *
          <input
            name="price"
            type="number"
            min="1"
            max="1000000000"
            required
            defaultValue={product?.price}
          />
        </label>
        <label>
          Stock *
          <input
            name="stock"
            type="number"
            min="0"
            max="100000"
            required
            defaultValue={product?.stock || 0}
          />
        </label>
      </div>
      <label>
        Description *
        <textarea
          name="desc"
          required
          defaultValue={product?.desc}
          maxLength={3000}
        />
      </label>
      <label>
        Photos — plusieurs fichiers possibles
        <input
          name="photos"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
        />
      </label>
      {existingImages.length > 0 && (
        <div className="yv-thumbnails">
          {existingImages.map((src, i) => (
            <div key={src}>
              <img src={imageUrl(src)} alt={"Photo existante " + (i + 1)} />
              <button
                type="button"
                onClick={() =>
                  setExistingImages((images) => [
                    src,
                    ...images.filter((v) => v !== src),
                  ])
                }
              >
                {i === 0 ? "Photo principale" : "Définir principale"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setExistingImages((images) => images.filter((v) => v !== src))
                }
              >
                Retirer la photo
              </button>
            </div>
          ))}
        </div>
      )}
      {state.roles.admin && (
        <label className="yv-check">
          <input
            name="approved"
            type="checkbox"
            defaultChecked={product?.approved}
          />
          Valider le produit pour publication
        </label>
      )}
      <label className="yv-check">
        <input
          name="visible"
          type="checkbox"
          defaultChecked={product?.visible}
        />
        Afficher le produit après validation
      </label>
      {error && (
        <p role="alert" className="yv-error">
          {error}
        </p>
      )}
      <button className="yv-primary" disabled={busy}>
        {busy ? "Enregistrement…" : "Enregistrer le produit"}
      </button>
    </form>
  );
}
function DirectMessages({ country, role }) {
  const endpoint = ["courier", "adminCourier"].includes(role)
    ? "/api/courier-messages"
    : "/api/seller-messages";
  const [data, setData] = useState(null),
    [target, setTarget] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const query = target
    ? "?" +
      (endpoint.includes("courier") ? "courierUserId" : "sellerUserId") +
      "=" +
      encodeURIComponent(target) +
      "&view=admin"
    : role.startsWith("admin")
      ? "?view=admin"
      : "";
  useEffect(() => {
    let live = true;
    api(endpoint + query, { country })
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [country, endpoint, query]);
  async function send(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      await api(endpoint, {
        country,
        body: {
          message: form.elements.message.value,
          view: role.startsWith("admin") ? "admin" : role,
          ...(target ? { sellerUserId: target, courierUserId: target } : {}),
        },
      });
      setData(await api(endpoint + query, { country }));
      form.reset();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h3>
        Discussion avec{" "}
        {role.startsWith("admin") ? "les partenaires" : "l’administration"}
      </h3>
      {data?.threads?.length > 0 && (
        <label>
          Choisir un compte
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">Choisir…</option>
            {data.threads.map((t) => (
              <option key={t.userId} value={t.userId}>
                {t.name} · {t.publicId}
              </option>
            ))}
          </select>
        </label>
      )}
      {data?.messages?.map((m) => (
        <p key={m.id}>
          <b>{m.sender}</b> · {m.message}
        </p>
      ))}
      <form className="yv-form" onSubmit={send}>
        <label>
          Message
          <textarea name="message" maxLength={2000} required />
        </label>
        <button disabled={busy}>Envoyer</button>
      </form>
      {error && (
        <p role="alert" className="yv-error">
          {error}
        </p>
      )}
    </section>
  );
}
export default function Dashboard({
  role,
  country,
  config,
  state,
  onRefresh,
  onManagePlan,
  followerCounts,
}) {
  const [tab, setTab] = useState("overview"),
    [report, setReport] = useState(null),
    [period, setPeriod] = useState("30"),
    [error, setError] = useState(""),
    [editing, setEditing] = useState(null),
    [adding, setAdding] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (tab !== "stats") return;
    let live = true;
    api("/api/product-insights/report?period=" + period, { country })
      .then((d) => {
        if (live) setReport(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [tab, period, country]);
  async function availability(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const d = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api("/api/marketplace/courier", {
        country,
        body: {
          available: d.available === "on",
          payoutMethod: d.payoutMethod,
          payoutAccount: d.payoutAccount || "",
          benefitsAccepted: d.benefitsAccepted === "on",
        },
      });
      await onRefresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const tabs = [
    ["overview", "Vue d’ensemble"],
    ["orders", "Commandes"],
    ...(role !== "courier"
      ? [
          ["products", "Produits"],
          ["stats", "Statistiques"],
          ["finance", role === "seller" ? "Paiements" : "Finance"],
          ...(role === "seller" ? [["subscriptions", "Abonnements"]] : []),
        ]
      : [["availability", "Disponibilité"]]),
    ["messages", "Discussions"],
    ...(role === "admin"
      ? [
          ["verification", "Vérifications"],
          ["courierMessages", "Discussions livreurs"],
          ["stores", "Boutiques"],
          ["advertising", "Publicités"],
        ]
      : []),
  ];
  return (
    <section className="yv-dashboard" data-role={role}>
      <p className="yv-eyebrow">
        {role === "seller"
          ? "PANNEAU VENDEUR"
          : role === "courier"
            ? "ESPACE LIVREUR"
            : "ADMINISTRATION"}
      </p>
      <div className="yv-dashboard-title">
        <h2>
          {role === "seller"
            ? (state.profile?.name ? state.profile.name + " · Ma boutique" : "Ma boutique")
            : role === "courier"
              ? "Mes missions, mon activité"
              : "Piloter YAVIYA"}
        </h2>
        <span>
          {role === "seller" ? state.profile?.sellerNumber : role === "courier" ? state.profile?.courierNumber : state.profile?.customerNumber}
        </span>
        <button onClick={onRefresh}>Actualiser</button>
      </div>
      <p className="yv-dashboard-description">{role === "seller" ? "Votre boutique, vos commandes et vos clients : tous vos outils au même endroit." : role === "courier" ? "Organisez vos missions, suivez vos livraisons et retrouvez vos règlements." : "Supervisez l’activité, vérifiez les comptes et accompagnez les vendeurs et livreurs."}</p>
      {["seller","admin"].includes(role) && <div className="yv-follower-summary"><strong>{role === "seller" ? "Personnes qui suivent mes boutiques" : "Abonnements aux boutiques"}</strong><span>{followerCounts ? (role === "admin" ? Object.values(followerCounts).reduce((a,b)=>a+b,0) : (state.sellerIds || []).reduce((a,id)=>a+(followerCounts[id] || 0),0)) : "Chargement…"}</span></div>}
      <div className="yv-dashboard-layout">
        <nav className="yv-tabs" aria-label="Navigation de mon espace">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              aria-pressed={tab === id}
              onClick={() => {
                setTab(id);
                setError("");
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="yv-dashboard-body">
          {tab === "overview" && (
            <WorkspaceOverview
              state={state}
              role={role}
              country={country}
              onTab={setTab}
            />
          )}
          {tab === "finance" && (
            <WorkspaceFinance
              state={state}
              role={role}
              country={country}
              onOrders={() => setTab("orders")}
            />
          )}
          {tab === "stores" && <WorkspaceStores state={state} />}
          {tab === "subscriptions" && (
            <WorkspaceSubscriptions country={country} onManage={onManagePlan} />
          )}
          {tab === "advertising" && <WorkspaceAdvertising />}
          {tab === "orders" && (
            <Orders
              state={state}
              country={country}
              role={role}
              onRefresh={onRefresh}
            />
          )}
          {tab === "products" && (
            <>
              <div className="yv-heading">
                <h3>Gestion du catalogue</h3>
                <button
                  disabled={!state.sellerIds.length}
                  title={
                    !state.sellerIds.length
                      ? "Les nouveaux produits sont ajoutés depuis une boutique autorisée."
                      : undefined
                  }
                  onClick={() => {
                    setAdding(!adding);
                    setEditing(null);
                  }}
                >
                  Ajouter un produit
                </button>
              </div>
              {(adding || editing) && (
                <ProductEditor
                  key={editing?.id || "new"}
                  product={editing}
                  state={state}
                  country={country}
                  config={config}
                  onSaved={async () => {
                    setAdding(false);
                    setEditing(null);
                    await onRefresh();
                  }}
                />
              )}
              <div className="yv-table">
                <table>
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Prix</th>
                      <th>Stock</th>
                      <th>Statut</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.catalogue
                      .filter(
                        (p) =>
                          role === "admin" ||
                          state.sellerIds.includes(p.seller),
                      )
                      .map((p) => (
                        <tr key={p.id}>
                          <td>{p.title}</td>
                          <td>{amount(p.price, country)}</td>
                          <td>{p.stock}</td>
                          <td>{p.approved ? "Validé" : "À valider"}</td>
                          <td>
                            <button
                              onClick={() => {
                                setEditing(p);
                                setAdding(false);
                              }}
                            >
                              Modifier
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {tab === "stats" && (
            <>
              <label>
                Période
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  {[
                    ["7", "7 jours"],
                    ["30", "30 jours"],
                    ["quarter", "Trimestre"],
                    ["semester", "Semestre"],
                    ["year", "Année"],
                    ["all", "Depuis le début"],
                  ].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              {report && (
                <>
                  <div className="yv-stat-grid">
                    {Object.entries(report.totals || {}).map(([k, v]) => (
                      <p key={k}>
                        {{
                          views: "Vues",
                          uniqueViewers: "Visiteurs uniques",
                          buyerCount: "Acheteurs",
                          units: "Unités",
                          orderCount: "Commandes",
                        }[k] || k}
                        <b>{v}</b>
                      </p>
                    ))}
                  </div>
                  <div className="yv-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Produit</th>
                          <th>Vues</th>
                          <th>Visiteurs</th>
                          <th>Acheteurs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.rows.map((r) => (
                          <tr key={r.country + ":" + r.productId}>
                            <td>{r.title}</td>
                            <td>{r.views}</td>
                            <td>{r.uniqueViewers}</td>
                            <td>{r.buyerCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
          {tab === "availability" && (
            <form className="yv-form" onSubmit={availability}>
              <h3>Mes disponibilités et règlements</h3>
              <label className="yv-check">
                <input
                  name="available"
                  type="checkbox"
                  defaultChecked={!!state.courierSettings?.available}
                />
                Disponible pour des missions
              </label>
              <label>
                Méthode
                <select
                  name="payoutMethod"
                  defaultValue={
                    state.courierSettings?.payoutMethod || "mobile_money"
                  }
                >
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank">Banque</option>
                  <option value="cash">Espèces</option>
                </select>
              </label>
              <label>
                Compte de règlement
                <input
                  name="payoutAccount"
                  defaultValue={state.courierSettings?.payoutAccount || ""}
                  maxLength={150}
                />
              </label>
              <label className="yv-check">
                <input
                  name="benefitsAccepted"
                  type="checkbox"
                  required
                  defaultChecked={!!state.courierSettings?.benefitsAccepted}
                />
                Je confirme mes tâches et les conditions de règlement.
              </label>
              <button className="yv-primary" disabled={busy}>
                Confirmer ma disponibilité
              </button>
            </form>
          )}
          {tab === "messages" && (
            <DirectMessages role={role} country={country} />
          )}{" "}
          {tab === "courierMessages" && (
            <AdminCourierMessages country={country} />
          )}
          {tab === "verification" && (
            <VerificationReview country={country} config={config} onRefresh={onRefresh} />
          )}
          {error && (
            <p role="alert" className="yv-error">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
function AdminCourierMessages({ country }) {
  // Same component, with a courier endpoint and an explicit admin view.
  return <DirectMessages country={country} role="adminCourier" />;
}
