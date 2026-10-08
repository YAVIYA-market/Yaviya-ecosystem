import Head from "next/head";
import { useCallback, useEffect, useState } from "react";
import { api, amount, imageUrl } from "../../lib/market/api";
import Modal from "./Modal";
import AuthForm from "./AuthForm";
import PhotoSearch from "./PhotoSearch";
import PartnerPromotions from "./PartnerPromotions";
import PopularQuestions from "./PopularQuestions";
import ProfileForm from "./ProfileForm";
import Onboarding from "./Onboarding";
import Checkout from "./Checkout";
import Orders from "./Orders";
import Dashboard from "./Dashboard";
import AccountSettings from "./AccountSettings";
import InfoContent from "./InfoContent";
function Icon({ name }) {
  const paths = {
    cart: "M3 3h2l3 13h11l2-9H6 M9 20h.01 M18 20h.01",
    heart: "M12 21 3 12a5 5 0 0 1 9-6 5 5 0 0 1 9 6Z",
    user: "M4 22v-3a8 8 0 0 1 16 0v3 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    camera: "M3 7h4l2-3h6l2 3h4v13H3Z M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    search: "M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0 M15 15l6 6",
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
function Support({ faq, lang }) {
  const [messages, setMessages] = useState([
      {
        answer:
          "Bonjour ! Je suis l’assistant YAVIYA. Posez votre question sur les achats, les vendeurs ou la livraison.",
      },
    ]);
  function send(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const question = form.elements.question.value.trim();
    const words = question
      .toLowerCase()
      .split(/\W+/)
      .filter((v) => v.length > 3);
    const best = faq
      .map((q) => ({
        q,
        score: words.filter((w) => q[lang].join(" ").toLowerCase().includes(w))
          .length,
      }))
      .sort((a, b) => b.score - a.score)[0];
    setMessages((v) => [
      ...v,
      {
        question,
        answer: best?.score
          ? best.q[lang][1]
          : "Je ne trouve pas de réponse précise. Consultez les questions ci-dessous ou contactez partenariat@yaviya.cd pour être orienté.",
      },
    ]);
    form.reset();
  }
  return (
    <section>
      <div className="yv-chat" aria-label="Chatbot YAVIYA">
        <h3>Besoin d’aide ? Discutez avec YAVIYA</h3>
        <div aria-live="polite">
          {messages.map((m, i) => (
            <div key={i}>
              {m.question && (
                <p>
                  <b>Vous</b> · {m.question}
                </p>
              )}
              <p>
                <b>YAVIYA</b> · {m.answer}
              </p>
            </div>
          ))}
        </div>
        <form onSubmit={send} className="yv-form">
          <label>
            Votre question
            <input name="question" required maxLength={500} />
          </label>
          <button className="yv-primary">Envoyer</button>
        </form>
        <small>
          Assistant automatique basé sur les réponses du centre d’aide.
        </small>
      </div>
      <PopularQuestions faq={faq} lang={lang} />
    </section>
  );
}
function ProductDetail({
  product,
  products,
  shops,
  config,
  country,
  onBuy,
  onAdd,
  onHelp,
  onChoose,
}) {
  const images = [
    ...new Set(
      [
        ...(product.images || []),
        ...(config.productGalleries[product.img] || []),
        product.img,
      ].filter(Boolean),
    ),
  ];
  const [photo, setPhoto] = useState(images[0]);
  const shop = shops.find((s) => s.id === product.seller);
  useEffect(() => {
    api("/api/product-insights/view", {
      country,
      body: { productId: product.id },
    }).catch(() => {});
  }, [country, product.id]);
  return (
    <>
      <div className="yv-detail">
        <section>
          <img
            className="yv-detail-photo"
            src={imageUrl(photo)}
            alt={product.title}
          />
          <div className="yv-thumbnails">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                aria-label={"Voir la photo " + (i + 1)}
                aria-pressed={src === photo}
                onClick={() => setPhoto(src)}
              >
                <img src={imageUrl(src)} alt={"Vue " + (i + 1)} />
              </button>
            ))}
          </div>
        </section>
        <section>
          <p className="yv-eyebrow">{product.category}</p>
          <h3>{product.title}</h3>
          <p>
            {shop?.name || "Boutique " + product.seller} ·{" "}
            {product.seller < 10000
              ? "Vérifié · démo"
              : shop?.reviewed
                ? "Vendeur vérifié"
                : "Vérification en cours"}
          </p>
          <strong className="yv-price">{amount(product.price, country)}</strong>
          <p>{product.desc}</p>
          <p>{product.stock > 0 ? "Disponible" : "Indisponible"}</p>
          {config.demoBuyerCounts[product.id] && (
            <p>{config.demoBuyerCounts[product.id].count} acheteurs · démo</p>
          )}
          <div className="yv-actions">
            <button
              className="yv-primary"
              disabled={product.stock < 1}
              onClick={() => onBuy(product)}
            >
              Acheter maintenant
            </button>
            <button disabled={product.stock < 1} onClick={() => onAdd(product)}>
              Ajouter au panier
            </button>
            <button onClick={onHelp}>Besoin d’aide</button>
          </div>
        </section>
      </div>
      <h3>À découvrir aussi</h3>
      <div className="yv-related">
        {products
          .filter(
            (p) =>
              p.id !== product.id &&
              (p.category === product.category || p.seller === product.seller),
          )
          .slice(0, 6)
          .map((p) => (
            <button key={p.id} onClick={() => onChoose(p)}>
              <img src={imageUrl(p.img)} alt="" />
              {p.title}
              <b>{amount(p.price, country)}</b>
            </button>
          ))}
      </div>
    </>
  );
}
export default function MarketApp({ data, pageName = "index", content = [] }) {
  const { country, config, faq, initialProducts, initialShops } = data;
  const [products, setProducts] = useState(initialProducts),
    [shops, setShops] = useState(initialShops),
    [user, setUser] = useState(null),
    [profile, setProfile] = useState(null),
    [market, setMarket] = useState(null),
    [isAdmin, setIsAdmin] = useState(false);
  const [screen, setScreen] = useState(null),
    [pending, setPending] = useState(null),
    [intent, setIntent] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [lang, setLang] = useState("fr");
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [subcategory, setSubcategory] = useState(""),
    [sort, setSort] = useState("default"),
    [seller, setSeller] = useState(""),
    [city, setCity] = useState(""),
    [province, setProvince] = useState(""),
    [commune, setCommune] = useState(""),
    [categoriesOpen, setCategoriesOpen] = useState(false),
    [cart, setCart] = useState([]),
    [wishes, setWishes] = useState([]),
    [compare, setCompare] = useState([]);
  const close = useCallback(() => {
    setScreen(null);
    setPending(null);
  }, []);
  const t = (fr, en) => (lang === "en" ? en : fr);
  async function refresh(role = "buyer") {
    const value = await api("/api/marketplace?view=" + role, { country });
    setMarket(value);
    setProfile(value.profile);
    setIsAdmin(value.roles.admin);
    if (value.catalogue) setProducts(value.catalogue);
    if (value.stores) setShops([...initialShops, ...value.stores]);
    return value;
  }
  useEffect(() => {
    let live = true;
    const abort = new AbortController();
    api("/api/catalogue", { country, signal: abort.signal })
      .then((d) => {
        if (live) {
          setProducts(d.catalogue);
          setShops([...initialShops, ...d.stores]);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    api("/api/auth/session", { signal: abort.signal })
      .then(async (s) => {
        if (!live) return;
        setUser(s.user);
        if (s.user) {
          try {
            const p = await api("/api/customer", {
              country,
              signal: abort.signal,
            });
            if (live) {
              setProfile(p);
              setWishes(p?.wishlist || []);
              if (p?.preferredLanguage) setLang(p.preferredLanguage);
            }
          } catch (e) {
            if (live) setError(e.message);
          }
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    try {
      setCart(
        JSON.parse(
          localStorage.getItem("yaviya-react-cart-" + country) || "[]",
        ),
      );
    } catch {}
    return () => {
      live = false;
      abort.abort();
    };
  }, [country]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  function updateCart(items) {
    setCart(items);
    try {
      localStorage.setItem(
        "yaviya-react-cart-" + country,
        JSON.stringify(items),
      );
    } catch {}
  }
  function add(product) {
    const found = cart.find((i) => i.id === product.id);
    updateCart(
      found
        ? cart.map((i) =>
            i.id === product.id
              ? { ...i, q: Math.min(i.q + 1, product.stock) }
              : i,
          )
        : [...cart, { id: product.id, q: 1 }],
    );
    setNotice("Produit ajouté au panier.");
  }
  async function favorite(id) {
    const next = wishes.includes(id)
      ? wishes.filter((v) => v !== id)
      : [...wishes, id];
    setWishes(next);
    if (profile)
      try {
        await api("/api/customer", {
          country,
          body: { wishlistOnly: true, wishlist: next },
        });
      } catch (e) {
        setError(e.message);
      }
  }
  async function purchase(selection) {
    setBusy(true);
    setError("");
    setPending(selection);
    if (!user) {
      setScreen({ type: "auth", action: "signup" });
      setBusy(false);
      return;
    }
    try {
      const s = await api("/api/auth/session");
      setUser(s.user);
      if (!s.user) {
        setScreen({ type: "auth" });
        return;
      }
      const p = await api("/api/customer", { country });
      setProfile(p);
      if (!p) {
        setScreen({ type: "profile", role: "buyer" });
        return;
      }
      const m = await refresh();
      for (const i of selection) {
        const p = m.catalogue.find((v) => v.id === i.id);
        if (!p || p.stock < i.q)
          throw Error("Un article est indisponible. Vérifiez votre panier.");
      }
      setScreen({ type: "checkout", selection });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function authenticated(u) {
    setUser(u);
    const p = await api("/api/customer", { country });
    setProfile(p);
    if (pending) {
      if (!p) {
        setScreen({ type: "profile", role: "buyer" });
        return;
      }
      await purchase(pending);
    } else if (intent) {
      setScreen(intent);
      setIntent(null);
    } else if (!p) setScreen({ type: "profile", role: "buyer" });
    else setScreen({ type: "account" });
  }
  async function account(section = "account", role) {
    setError("");
    if (!user) {
      setScreen({ type: "auth" });
      return;
    }
    if (!profile) {
      setScreen({ type: "profile", role: "buyer" });
      return;
    }
    try {
      if (section === "orders" || section === "dashboard") {
        const m = await refresh(role || "buyer");
        setScreen({ type: section, role: role || "buyer", state: m });
      } else {
        if (section === "account") await refresh();
        setScreen({ type: section });
      }
    } catch (e) {
      setError(e.message);
      if (e.code === "ADMIN_MFA_REQUIRED") {
        setIsAdmin(true);
        setScreen({ type: "settings" });
      }
    }
  }
  async function profileSaved(p) {
    setProfile(p);
    setWishes(p.wishlist || []);
    if (pending) await purchase(pending);
    else setScreen({ type: "account" });
  }
  async function logout() {
    try {
      await api("/api/auth/logout", { body: {} });
      setUser(null);
      setProfile(null);
      setMarket(null);
      setIsAdmin(false);
      setWishes([]);
      close();
    } catch (e) {
      setError(e.message);
    }
  }
  const cityProvinces = country === "CG" ? {Brazzaville:"Brazzaville", "Pointe-Noire":"Pointe-Noire"} : {Kinshasa:"Kinshasa", Lubumbashi:"Haut-Katanga", Kolwezi:"Lualaba", Matadi:"Kongo Central", Boma:"Kongo Central"};
  const shopProvince = shop => shop?.province || cityProvinces[shop?.city] || "";
  const availableProvinces = [...new Set([...Object.values(cityProvinces), ...shops.map(shopProvince)].filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));
  const availableCities = [...new Set([...Object.keys(cityProvinces), ...shops.map(s=>s.city).filter(Boolean)])].filter(v=>!province || cityProvinces[v]===province || shops.some(s=>s.city===v && shopProvince(s)===province)).sort((a,b)=>a.localeCompare(b,"fr"));
  const availableCommunes = [...new Set([...(city ? Object.keys(config.deliveryRates[city] || {}) : []), ...shops.filter(s=>(!city || s.city===city) && (!province || shopProvince(s)===province)).map(s=>s.commune).filter(Boolean)])].sort((a,b)=>a.localeCompare(b,"fr"));
  const filtered = products
    .filter(
      (p) =>
        p.visible &&
        p.approved &&
        (!category || p.category === category) &&
        (!subcategory ||
          p.subcategory === subcategory ||
          p.family === subcategory ||
          p.title.toLowerCase().includes(subcategory.toLowerCase())) &&
        (!query ||
          (p.title + " " + p.category + " " + p.desc)
            .toLowerCase()
            .includes(query.toLowerCase())) &&
        (!seller || p.seller === Number(seller)) &&
        (!city || shops.find((s) => s.id === p.seller)?.city === city) &&
        (!province || shopProvince(shops.find(s=>s.id===p.seller)) === province) &&
        (!commune || shops.find(s=>s.id===p.seller)?.commune === commune),
    )
    .sort((a, b) =>
      sort === "asc"
        ? a.price - b.price
        : sort === "desc"
          ? b.price - a.price
          : sort === "verified"
            ? Number(!!shops.find(s => s.id === b.seller)?.reviewed) - Number(!!shops.find(s => s.id === a.seller)?.reviewed)
            : sort === "az" ? a.title.localeCompare(b.title, "fr")
            : sort === "za" ? b.title.localeCompare(a.title, "fr")
            : sort === "newest" ? Number(b.id) - Number(a.id)
            : sort === "oldest" ? Number(a.id) - Number(b.id)
            : sort === "popular" ? (config.demoBuyerCounts[b.id]?.count || 0) - (config.demoBuyerCounts[a.id]?.count || 0)
            : 0,
    );
  const chosen = screen?.product;
  function categoryChoice(c, sub = "") {
    setCategory(c);
    setSubcategory(sub);
    setCategoriesOpen(false);
    document
      .getElementById("yv-catalog")
      ?.scrollIntoView({ behavior: "smooth" });
  }
  let title =
    {
      auth: screen?.action === "signup" ? "Créer mon compte acheteur" : "Mon compte YAVIYA",
      "photo-search": "Recherche par photo",
      profile: "Mes coordonnées",
      onboarding:
        screen?.role === "seller" ? "Devenir vendeur" : "Devenir livreur",
      account: "Mon Yaviya",
      cart: "Mon panier",
      wishlist: "Mes favoris",
      checkout: "Finaliser mon achat",
      orders: "Historique des commandes",
      dashboard: "Mon espace professionnel",
      settings: "Paramètres du compte",
      support: "Centre d’aide",
      coupons: "Mes coupons",
      compare: "Comparer les produits",
      success: "Commande enregistrée",
    }[screen?.type] ||
    chosen?.title ||
    "YAVIYA";
  return (
    <div className="yv-app">
      <Head>
        <title>
          {pageName === "index"
            ? "YAVIYA — Votre marché, à portée de main"
            : pageName === "congo"
              ? "YAVIYA — République du Congo"
              : "YAVIYA — " + pageName}
        </title>
        <meta
          name="description"
          content="Découvrez les produits, comparez les boutiques et suivez vos commandes sur YAVIYA."
        />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="theme-color" content="#ea580c" />
        <link rel="icon" href="/yaviya-icon.svg" />
      </Head>
      <div className="yv-topbar">
        {country === "CD"
          ? "Livraison à Kinshasa, Lubumbashi, Kolwezi, Matadi et Boma."
          : "Votre marché à Brazzaville et Pointe-Noire."}
      </div>
      <header className="yv-header">
        <a className="yv-logo" href={country === "CG" ? "/congo.html" : "/"}>
          YAVIYA<span>●</span>
        </a>
        <div className="yv-header-actions">
          <button onClick={() => setScreen({ type: "wishlist" })}>
            <Icon name="heart" />
            <span>{t("Favoris", "Favourites")}</span>
          </button>
          <button onClick={() => account()}>
            <Icon name="user" />
            <span>{t("Profil", "Profile")}</span>
          </button>
          <button onClick={() => setScreen({ type: "cart" })}>
            <Icon name="cart" />
            <span>
              {t("Panier", "Cart")} <b>{cart.reduce((n, i) => n + i.q, 0)}</b>
            </span>
          </button>
        </div>
        <form
          role="search"
          className="yv-search"
          onSubmit={(e) => {
            e.preventDefault();
            document
              .getElementById("yv-catalog")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <input
            aria-label="Rechercher un produit"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              "Qu’est-ce qui vous ferait plaisir ?",
              "What would you like today?",
            )}
          />
          <button type="button" aria-label="Rechercher avec une photo" title="Rechercher avec une photo" onClick={() => setScreen({ type: "photo-search" })}>
            <Icon name="camera" />
          </button>
          <button aria-label="Rechercher">
            <Icon name="search" />
          </button>
        </form>
      </header>
      <nav className="yv-nav">
        <button
          className="yv-primary"
          aria-expanded={categoriesOpen}
          aria-controls="yv-categories"
          onClick={() => setCategoriesOpen(!categoriesOpen)}
        >
          ▦ {t("Catégories", "Categories")}
        </button>
        <button onClick={() => account("orders")}>
          {t("Suivre ma commande", "Track my order")}
        </button>
        <button onClick={() => setScreen({ type: "support" })}>
          {t("Besoin d’aide", "Need help")}
        </button>
        <label className="yv-language">
          <span className="yv-sr-only">Langue</span>
          <select
            aria-label="Langue"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
          >
            <option value="fr">FR</option>
            <option value="en">EN</option>
          </select>
        </label>
      </nav>
      {categoriesOpen && (
        <section id="yv-categories" className="yv-categories">
          {config.categorySections.map((c) => (
            <article key={c[0]}>
              <button onClick={() => categoryChoice(c[0])}>
                {c[lang === "en" ? 2 : 1]}
              </button>
              {c[3].map((sub) => (
                <button
                  key={sub[0]}
                  onClick={() => categoryChoice(c[0], sub[0])}
                >
                  {sub[lang === "en" ? 1 : 0]}
                </button>
              ))}
            </article>
          ))}
        </section>
      )}
      {error && (
        <aside role="alert" className="yv-error yv-banner">
          {error}
          <button onClick={() => setError("")} aria-label="Fermer le message">
            ×
          </button>
        </aside>
      )}
      {notice && (
        <aside role="status" className="yv-notice">
          {notice}
          <button
            onClick={() => setNotice("")}
            aria-label="Fermer la notification"
          >
            ×
          </button>
        </aside>
      )}
      <main>
        {["index", "congo"].includes(pageName) ? (
          <>
            <section className="yv-hero">
              <div>
                <p className="yv-eyebrow">
                  {t("LE QUOTIDIEN, EN MIEUX", "EVERYDAY, MADE BETTER")}
                </p>
                <h1>
                  {t("Vos envies.", "Your wishes.")}
                  <br />
                  {t("Votre ville.", "Your city.")}
                  <br />
                  <em>Votre YAVIYA.</em>
                </h1>
                <p>
                  {t(
                    "Du coup de cœur à l’essentiel, découvrez votre prochain achat au même endroit.",
                    "From everyday essentials to special finds, discover your next purchase in one place.",
                  )}
                </p>
                <a className="yv-primary" href="#yv-catalog">
                  {t("Explorer le catalogue", "Explore the catalogue")}
                </a>
              </div>
              <img src="/hero.png" alt="Sélection YAVIYA" />
            </section>
            <section className="yv-adverts" aria-label="Publicités et sélections">
              {[{image:"headphones.png", title:"Votre musique. Votre rythme.", category:"électronique"}, {image:"sneakers.png", title:"Un pas de plus. Du style en plus.", category:"mode"}, {image:"handbag.png", title:"Emportez l’essentiel avec élégance.", category:"mode"}].map((ad) => <article key={ad.image}><img src={imageUrl(ad.image)} alt={ad.title} /><div><small>ESPACE PUBLICITAIRE · DÉMO</small><h3>{ad.title}</h3><button onClick={() => {setQuery(""); const c = config.categorySections.find(c => c[1].toLowerCase().includes(ad.category)); categoryChoice(c?.[0] || "");}}>Découvrir la sélection</button></div></article>)}
              <a className="yv-advert-partner" href="/publicite.html">Votre marque sur YAVIYA · Découvrez nos espaces publicitaires</a>
            </section>
            <section id="yv-catalog" className="yv-catalog">
              <div className="yv-heading">
                <div>
                  <p className="yv-eyebrow">
                    {t(
                      "LE BON ENDROIT POUR TROUVER",
                      "FIND YOUR NEXT FAVOURITE",
                    )}
                  </p>
                  <h2>{t("À découvrir sur YAVIYA", "Discover on YAVIYA")}</h2>
                </div>
                <label>
                  Trier
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="default">Notre sélection</option>
                    <option value="asc">Prix croissant</option>
                    <option value="desc">Prix décroissant</option>
                    <option value="verified">Vendeurs vérifiés en premier</option>
                    <option value="newest">Derniers ajouts</option>
                    <option value="oldest">Premiers ajouts</option>
                    <option value="az">Nom : A à Z</option>
                    <option value="za">Nom : Z à A</option>
                    <option value="popular">Les plus achetés (démo)</option>
                  </select>
                </label>
              </div>
              <div className="yv-filters">
                <button
                  aria-pressed={!category}
                  onClick={() => categoryChoice("")}
                >
                  Tout découvrir
                </button>
                {config.categorySections.map((c) => (
                  <button
                    key={c[0]}
                    aria-pressed={category === c[0]}
                    onClick={() => categoryChoice(c[0])}
                  >
                    {c[lang === "en" ? 2 : 1]}
                  </button>
                ))}
              </div>
              <div className="yv-fields yv-locality-filters" aria-label="Filtres des boutiques">
                <label>
                  Boutique
                  <select
                    value={seller}
                    onChange={(e) => setSeller(e.target.value)}
                  >
                    <option value="">Toutes les boutiques</option>
                    {shops.filter(s => (!province || shopProvince(s)===province) && (!city || s.city===city) && (!commune || s.commune===commune)).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>{country === "CG" ? "Département" : "Province"}<select aria-label="Province" value={province} onChange={e=>{setProvince(e.target.value);setCity("");setCommune("");setSeller("");}}><option value="">Toutes les provinces</option>{availableProvinces.map(v=><option key={v}>{v}</option>)}</select></label>
                <label>Ville<select aria-label="Ville" value={city} onChange={e=>{setCity(e.target.value);setCommune("");setSeller("");}}><option value="">Toutes les villes</option>{availableCities.map(v=><option key={v}>{v}</option>)}</select></label>
                <label>Commune<select aria-label="Commune" value={commune} onChange={e=>{setCommune(e.target.value);setSeller("");}}><option value="">Toutes les communes</option>{availableCommunes.map(v=><option key={v}>{v}</option>)}</select></label>
                <button className="yv-reset-filters" onClick={()=>{setSeller("");setProvince("");setCity("");setCommune("");}}>Réinitialiser les lieux</button>
              </div>
              <p className="yv-muted">
                Catalogue de démonstration · produits et prix illustratifs.
              </p>
              {compare.length > 0 && (
                <button onClick={() => setScreen({ type: "compare" })}>
                  Comparer {compare.length} produits
                </button>
              )}
              <div className="yv-products">
                {filtered.map((p) => (
                  <article key={p.id} className="yv-product">
                    <button
                      className="yv-product-image"
                      onClick={() => setScreen({ type: "product", product: p })}
                    >
                      <img src={imageUrl(p.img)} alt={p.title} loading="lazy" />
                    </button>
                    <div className="yv-product-copy">
                      <small>{p.category}</small>
                      <button
                        className="yv-product-title"
                        onClick={() =>
                          setScreen({ type: "product", product: p })
                        }
                      >
                        {p.title}
                      </button>
                      <button
                        className="yv-shop-link"
                        onClick={() => {
                          setSeller(String(p.seller));
                          document
                            .getElementById("yv-catalog")
                            ?.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        {shops.find((s) => s.id === p.seller)?.name ||
                          "Boutique " + p.seller}{" "}
                        <span>
                          {p.seller < 10000
                            ? "✓ démo"
                            : shops.find((s) => s.id === p.seller)?.reviewed
                              ? "✓"
                              : ""}
                        </span>
                      </button>
                      <b className="yv-price">{amount(p.price, country)}</b>
                      {config.demoBuyerCounts[p.id] && (
                        <small>
                          {config.demoBuyerCounts[p.id].count} acheteurs · démo
                        </small>
                      )}
                      <button
                        className="yv-primary"
                        disabled={busy || p.stock < 1}
                        onClick={() => purchase([{ id: p.id, q: 1 }])}
                      >
                        {busy
                          ? "Patientez…"
                          : t("Acheter maintenant", "Buy now")}
                      </button>
                      <div className="yv-actions">
                        <button disabled={p.stock < 1} onClick={() => add(p)}>
                          + {t("Panier", "Cart")}
                        </button>
                        <button
                          aria-label="Ajouter aux favoris"
                          aria-pressed={wishes.includes(p.id)}
                          onClick={() => favorite(p.id)}
                        >
                          ♡
                        </button>
                        <label className="yv-check">
                          <input
                            type="checkbox"
                            checked={compare.includes(p.id)}
                            onChange={(e) =>
                              setCompare((v) =>
                                e.target.checked
                                  ? [...v, p.id].slice(-3)
                                  : v.filter((id) => id !== p.id),
                              )
                            }
                          />
                          Comparer
                        </label>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {!filtered.length && (
                <p>Aucun produit trouvé. Essayez une autre recherche.</p>
              )}
            </section>
            <PartnerPromotions onHelp={() => setScreen({type:"support"})} />
            <PopularQuestions faq={faq} lang={lang} />
            <section className="yv-seller-banner">
              <h2>Votre boutique mérite une nouvelle vitrine.</h2>
              <p>
                Faites découvrir vos produits et préparez votre présence sur
                YAVIYA.
              </p>
              <div className="yv-actions">
                <button
                  className="yv-primary"
                  onClick={() => {
                    if (!user) {
                      setIntent({ type: "onboarding", role: "seller" });
                      setScreen({ type: "auth" });
                      return;
                    }
                    setScreen({ type: "onboarding", role: "seller" });
                  }}
                >
                  Devenir vendeur
                </button>
                <button
                  onClick={() => {
                    if (!user) {
                      setIntent({ type: "onboarding", role: "courier" });
                      setScreen({ type: "auth" });
                      return;
                    }
                    setScreen({ type: "onboarding", role: "courier" });
                  }}
                >
                  Devenir livreur
                </button>
              </div>
            </section>
          </>
        ) : pageName === "aide" ? (
          <section className="yv-info">
            <h1>Comment pouvons-nous vous aider ?</h1>
            <Support faq={faq} lang={lang} />
          </section>
        ) : (
          <section className="yv-info">
            <InfoContent content={content} />
          </section>
        )}
      </main>
      <footer className="yv-footer">
        <div>
          <a className="yv-logo" href="/">
            YAVIYA<span>●</span>
          </a>
          <p>Votre marché, à portée de main.</p>
          <small>Version de démonstration</small>
        </div>
        <div>
          <a href="/aide.html">Centre d’aide</a>
          <a href="/confidentialite.html">Confidentialité</a>
          <a href="/publicite.html">Publicités</a>
          <a href={country === "CD" ? "/congo.html" : "/"}>
            {country === "CD"
              ? "République du Congo"
              : "République démocratique du Congo"}
          </a>
        </div>
        <div>
          <h3>Devenir partenaire YAVIYA</h3>
          <a href="mailto:partenariat@yaviya.cd">partenariat@yaviya.cd</a>
        </div>
      </footer>
      {screen && (
        <Modal title={title} onClose={close}>
          {screen.type === "photo-search" && <PhotoSearch products={products.filter(p => p.visible && p.approved)} country={country} onChoose={(product) => setScreen({type:"product", product})} />}
          {screen.type === "auth" && (
            <AuthForm country={country} initialAction={screen.action} onSuccess={authenticated} />
          )}
          {screen.type === "profile" && (
            <ProfileForm
              profile={profile}
              country={country}
              config={config}
              role={screen.role}
              onSaved={profileSaved}
            />
          )}
          {screen.type === "onboarding" && (
            <Onboarding
              key={screen.role}
              role={screen.role}
              profile={profile}
              country={country}
              config={config}
              onSaved={async (p) => {
                setProfile(p);
                setNotice(
                  "Dossier envoyé. Votre identité sera examinée par l’administration.",
                );
                setScreen({ type: "account" });
              }}
            />
          )}
          {screen.type === "product" && (
            <ProductDetail
              key={chosen.id}
              product={chosen}
              products={products}
              shops={shops}
              config={config}
              country={country}
              onBuy={(p) => purchase([{ id: p.id, q: 1 }])}
              onAdd={add}
              onHelp={() => setScreen({ type: "support" })}
              onChoose={(p) => setScreen({ type: "product", product: p })}
            />
          )}
          {screen.type === "checkout" && profile && (
            <Checkout
              selection={screen.selection}
              products={products}
              profile={profile}
              country={country}
              config={config}
              onSuccess={async (o) => {
                updateCart(
                  cart.filter(
                    (i) => !screen.selection.some((s) => s.id === i.id),
                  ),
                );
                setPending(null);
                setScreen({ type: "success", order: o });
              }}
            />
          )}
          {screen.type === "success" && (
            <section className="yv-success">
              <h3>Votre commande est enregistrée</h3>
              <p>
                Référence : <b>{screen.order.id}</b>
              </p>
              <p>Total : {amount(screen.order.total, country)}</p>
              <p>
                Validation vendeur en attente. Aucun paiement électronique n’a
                été effectué.
              </p>
              <button className="yv-primary" onClick={() => account("orders")}>
                Suivre ma commande
              </button>
            </section>
          )}
          {screen.type === "cart" && (
            <section>
              {cart.length ? (
                cart.map((i) => {
                  const p = products.find((v) => v.id === i.id);
                  return (
                    <div key={i.id} className="yv-cart-item">
                      <span>
                        {p?.title || "Produit indisponible"}
                        <b>{amount((p?.price || 0) * i.q, country)}</b>
                      </span>
                      <label>
                        Quantité
                        <input
                          type="number"
                          min="1"
                          max={p?.stock || 1}
                          value={i.q}
                          onChange={(e) =>
                            updateCart(
                              cart.map((v) =>
                                v.id === i.id
                                  ? {
                                      ...v,
                                      q: Math.max(1, Number(e.target.value)),
                                    }
                                  : v,
                              ),
                            )
                          }
                        />
                      </label>
                      <button
                        onClick={() =>
                          updateCart(cart.filter((v) => v.id !== i.id))
                        }
                      >
                        Retirer
                      </button>
                    </div>
                  );
                })
              ) : (
                <p>Votre panier est vide.</p>
              )}
              <div className="yv-actions">
                <button onClick={close}>Continuer mes achats</button>
                <button
                  className="yv-primary"
                  disabled={busy || !cart.length}
                  onClick={() => purchase(cart)}
                >
                  Commander
                </button>
              </div>
            </section>
          )}
          {screen.type === "wishlist" && (
            <section>
              {products
                .filter((p) => wishes.includes(p.id))
                .map((p) => (
                  <div className="yv-cart-item" key={p.id}>
                    <button
                      onClick={() => setScreen({ type: "product", product: p })}
                    >
                      {p.title}
                    </button>
                    <b>{amount(p.price, country)}</b>
                    <button onClick={() => favorite(p.id)}>Retirer</button>
                  </div>
                ))}
              {!wishes.length && (
                <p>Retrouvez ici les produits qui vous plaisent.</p>
              )}
            </section>
          )}
          {screen.type === "account" && profile && (
            <section>
              <p className="yv-eyebrow">{profile.customerNumber}</p>
              <h3>Bonjour {profile.firstName || profile.name}</h3>
              <p>
                {profile.phone} · {profile.address}
              </p>
              <div className="yv-account-grid">
                {[
                  ["orders", "Historique des commandes"],
                  ["support", "Service client"],
                  ["profile", "Adresse et coordonnées"],
                  ["coupons", "Coupons"],
                  ["settings", "Paramètres du compte"],
                ].map(([type, label]) => (
                  <button
                    key={type}
                    onClick={() =>
                      type === "profile"
                        ? setScreen({ type, role: profile.accountType })
                        : account(type)
                    }
                  >
                    {label}
                  </button>
                ))}
                <button
                  disabled={!market?.roles.seller}
                  onClick={() => account("dashboard", "seller")}
                >
                  Espace vendeur
                </button>
                <button
                  disabled={!market?.roles.courier}
                  onClick={() => account("dashboard", "courier")}
                >
                  Espace livreur
                </button>
                {(market?.roles.admin || isAdmin) && (
                  <button onClick={() => account("dashboard", "admin")}>
                    Administration
                  </button>
                )}
                <button
                  onClick={() =>
                    setScreen({ type: "onboarding", role: "seller" })
                  }
                >
                  Devenir vendeur
                </button>
                <button
                  onClick={() =>
                    setScreen({ type: "onboarding", role: "courier" })
                  }
                >
                  Devenir livreur
                </button>
              </div>
              <button onClick={logout}>Se déconnecter</button>
            </section>
          )}
          {screen.type === "orders" && (
            <Orders
              country={country}
              role="buyer"
              state={screen.state}
              onRefresh={async () =>
                setScreen({ type: "orders", state: await refresh() })
              }
            />
          )}
          {screen.type === "dashboard" && (
            <Dashboard
              role={screen.role}
              country={country}
              config={config}
              state={screen.state}
              onRefresh={async () =>
                setScreen({
                  type: "dashboard",
                  role: screen.role,
                  state: await refresh(screen.role),
                })
              }
            />
          )}
          {screen.type === "settings" && profile && (
            <AccountSettings
              profile={profile}
              country={country}
              config={config}
              onSaved={(p) => {
                setProfile(p);
                setNotice("Préférences enregistrées.");
                if (p.preferredLanguage) setLang(p.preferredLanguage);
              }}
            />
          )}
          {screen.type === "support" && <Support faq={faq} lang={lang} />}
          {screen.type === "coupons" && <Coupons country={country} />}
          {screen.type === "compare" && (
            <div className="yv-comparison">
              {products
                .filter((p) => compare.includes(p.id))
                .map((p) => (
                  <article key={p.id}>
                    <img src={imageUrl(p.img)} alt={p.title} />
                    <h3>{p.title}</h3>
                    <b>{amount(p.price, country)}</b>
                    <p>{p.desc}</p>
                    <button
                      onClick={() => setScreen({ type: "product", product: p })}
                    >
                      Voir les détails
                    </button>
                    <button
                      className="yv-primary"
                      onClick={() => purchase([{ id: p.id, q: 1 }])}
                    >
                      Acheter maintenant
                    </button>
                  </article>
                ))}
            </div>
          )}
          {error && (
            <p className="yv-error" role="alert">
              {error}
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
function Coupons({ country }) {
  const [wallet, setWallet] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    api("/api/coupons", { country })
      .then(setWallet)
      .catch((e) => setError(e.message));
  }, [country]);
  return (
    <section>
      <p>Vos coupons YAVIYA</p>
      {wallet && (
        <>
          <h3>{wallet.balance || 0} coupons</h3>
          <p>Les avantages et conditions dépendent des offres disponibles.</p>
          {wallet.events?.map((e) => (
            <p key={e.id}>
              {e.reference} · {e.delta}
            </p>
          ))}
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
