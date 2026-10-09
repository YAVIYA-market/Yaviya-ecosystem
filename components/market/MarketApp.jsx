import AccountHub from './AccountHub';
import useSellerFollows from "../../lib/market/useSellerFollows";
import Invitation from "./Invitation";
import Head from "next/head";
import ProductPrice from "./ProductPrice";
import VerifiedSellerBadge from "./VerifiedSellerBadge";
import Notifications from "./Notifications";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, amount, imageUrl } from "../../lib/market/api";
import Modal from "./Modal";
import AuthForm from "./AuthForm";
import PhotoSearch from "./PhotoSearch";
import PartnerPromotions from "./PartnerPromotions";
import HeroCarousel from "./HeroCarousel";
import PopularQuestions from "./PopularQuestions";
import ServiceInfo from "./ServiceInfo";
import Coupons from "./Coupons";
import useBuyerCounts from "../../lib/market/useBuyerCounts";
import { demoRating } from "../../lib/market/plans";
import ProfileForm from "./ProfileForm";
import Onboarding from "./Onboarding";
import Checkout from "./Checkout";
import Orders from "./Orders";
import Dashboard from "./Dashboard";
import AccountSettings from "./AccountSettings";
import InfoContent from "./InfoContent";
function Icon({ name }) {
  const paths = {
    chatbot: "M8 3h8 M12 3v3 M5 7h14v12H5Z M2 10v6 M22 10v6 M8 12h.01 M16 12h.01 M9 16h6 M8 19v3 M16 19v3",
    cart: "M3 3h2l3 13h11l2-9H6 M9 20h.01 M18 20h.01",
    home: "M3 11 12 3l9 8 M5 10v11h5v-7h4v7h5V10",
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
function Support({ faq, lang, user, country, onContact }) {
  const conversation = useRef(null);
  const topics = [
    { id: "delivery", fr: "Livraison", en: "Delivery" },
    { id: "returns", fr: "Remboursement", en: "Refund" },
    { id: "account", fr: "Problème de compte", en: "Account issue" },
    { id: "coins", fr: "Coupon", en: "Coupon" },
    { id: "order", fr: "Commander", en: "Place an order" },
    { id: "tracking", fr: "Suivi de commande", en: "Order tracking" },
    { id: "payment", fr: "Paiement", en: "Payment" },
    { id: "contact", fr: "Service client", en: "Customer service" },
  ];
  const accountHelp = lang === "en"
    ? "Check the email address or phone number used to create your account, then enter your password. If two-factor authentication is enabled, enter the requested verification code. If you still cannot access your account, contact customer service and describe the error without sharing your password or verification codes."
    : "Vérifiez l’e-mail ou le numéro de téléphone utilisé pour créer votre compte, puis saisissez votre mot de passe. Si la double authentification est activée, renseignez le code demandé. Si l’accès reste bloqué, contactez le service client en décrivant le message d’erreur, sans transmettre votre mot de passe ni vos codes de connexion.";
  const suggestions = topics.map(topic => ({...topic, answer: topic.id === "account" ? accountHelp : faq.find(q => q.id === topic.id)?.[lang][1]})).filter(topic => topic.answer);
  const [messages, setMessages] = useState([
    {
      answer:
        "Bonjour ! Je suis l’assistant YAVIYA. Posez votre question sur les achats, les vendeurs ou la livraison.",
    },
  ]);
  useEffect(() => {
    if (conversation.current) conversation.current.scrollTop = conversation.current.scrollHeight;
  }, [messages]);
  function ask(question, answer) {
    if (!question.trim()) return;
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
        answer: answer || (best?.score
          ? best.q[lang][1]
          : lang === "en" ? "Please check the suggested questions or contact customer service for help." : "Consultez les questions proposées ou contactez le service client pour être accompagné."),
      },
    ]);
  }
  function send(e) {
    e.preventDefault();
    const form = e.currentTarget;
    ask(form.elements.question.value.trim());
    form.reset();
  }
  return (
    <section>
      <div className="yv-chat" aria-label="Chatbot YAVIYA">
        <h3>Besoin d’aide ? Discutez avec YAVIYA</h3>
        <div ref={conversation} className="yv-chat-conversation" aria-live="polite" aria-relevant="additions">
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
        <div className="yv-chat-suggestions" aria-label={lang === "en" ? "Help topics" : "Sujets d’aide"}>
          <p>{lang === "en" ? "Choose a topic:" : "Choisissez un sujet :"}</p>
          <div className="yv-chat-question-grid">
            {suggestions.map(q => <button type="button" key={q.id} data-question-id={q.id} onClick={() => ask(q[lang], q.answer)}>{q[lang]}</button>)}
          </div>
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
<PopularQuestions
        faq={faq}
        lang={lang}
        user={user}
        country={country}
        onContact={onContact}
      />
    </section>
  );
}
function ProductDetail({
  product,
  products,
  shops,
  config,
  country,
  buyerCounts,
  onBuy,
  onAdd,
  onHelp,
  onChoose,
  following,
  followerCount,
  onFollow,
  followDisabled,
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
  const photoIndex = Math.max(0, images.indexOf(photo));
  function changePhoto(direction) {
    setPhoto(images[(photoIndex + direction + images.length) % images.length]);
  }
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
          <div className="yv-product-gallery" role="group" aria-label={"Photos de " + product.title} tabIndex={images.length > 1 ? 0 : undefined} onKeyDown={e=>{if(images.length > 1 && ["ArrowLeft","ArrowRight"].includes(e.key)){e.preventDefault();changePhoto(e.key === "ArrowLeft" ? -1 : 1);}}}>
            <img className="yv-detail-photo" src={imageUrl(photo)} alt={product.title + " · photo " + (photoIndex + 1)} />
            {images.length > 1 && <>
              <button type="button" className="yv-gallery-arrow yv-gallery-previous" aria-label="Photo précédente" title="Précédente" onClick={()=>changePhoto(-1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button>
              <button type="button" className="yv-gallery-arrow yv-gallery-next" aria-label="Photo suivante" title="Suivante" onClick={()=>changePhoto(1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>
              <span className="yv-gallery-counter" aria-live="polite" aria-atomic="true">{photoIndex + 1} / {images.length}</span>
            </>}
          </div>
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
            {shop?.reviewed ? (
              <VerifiedSellerBadge verified demo={product.seller < 10000} />
            ) : (
              "Vérification en cours"
            )}
          </p>
          <div className="yv-follow-control"><button type="button" aria-pressed={following} disabled={followDisabled} onClick={()=>onFollow(product.seller)}>{following ? "Boutique suivie ✓" : "Suivre cette boutique"}</button>{followerCount !== null && <small>{followerCount} personne(s) suivent cette boutique</small>}</div>
          <ProductPrice product={product} country={country} />
          <p>{product.desc}</p>
          <p className="yv-demo-rating">
            ★ {demoRating(product).toFixed(1)} / 5 · note illustrative
          </p>
          <p>{product.stock > 0 ? "Disponible" : "Indisponible"}</p>
          {config.demoBuyerCounts[product.id]?.title === product.title ? (
            <p>{config.demoBuyerCounts[product.id].count} acheteurs · démo</p>
          ) : (
            <p>
              {Number.isSafeInteger(buyerCounts[product.id])
                ? buyerCounts[product.id] + " acheteur(s) · réception confirmée"
                : "Achats : données indisponibles"}
            </p>
          )}
          <div className="yv-actions">
            <button
              className="yv-primary yv-buy-now"
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
      {[
        {
          title: "Produits similaires chez d’autres vendeurs",
          items: products.filter(
            (p) =>
              p.id !== product.id &&
              p.seller !== product.seller &&
              p.category === product.category,
          ),
        },
        {
          title: "Autres produits de cette boutique",
          items: products.filter(
            (p) => p.id !== product.id && p.seller === product.seller,
          ),
        },
      ].map(
        (group) =>
          group.items.length > 0 && (
            <section key={group.title}>
              <h3>{group.title}</h3>
              <div className="yv-related">
                {group.items.slice(0, 6).map((p) => (
                  <button key={p.id} onClick={() => onChoose(p)}>
                    <img src={imageUrl(p.img)} alt={p.title} />
                    {p.title}
                    <b>{amount(p.price, country)}</b>
                  </button>
                ))}
              </div>
            </section>
          ),
      )}
    </>
  );
}
export default function MarketApp({ data, pageName = "index", content = [] }) {
  const { country, config, faq, initialProducts, initialShops } = data;
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [products, setProducts] = useState(initialProducts),
    [shops, setShops] = useState(initialShops),
    [campaigns,setCampaigns] = useState([]),
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
  const cartCount = cart.reduce((total, item) => total + item.q, 0);
  const buyerCounts = useBuyerCounts(products, country);
  const following = useSellerFollows(user, country);
  function becomeSeller() {
    const next = { type: "onboarding", role: "seller" };
    if (!user) {setIntent(next);setScreen({type:"auth",action:"signup"});}
    else setScreen(next);
  }
  function followSeller(sellerId) {
    if (!user) {setIntent(screen);setScreen({type:"auth",action:"signup"});}
    else if (!profile) {setIntent(screen);setScreen({type:"profile",role:"buyer"});}
    else following.toggle(sellerId);
  }
  const close = useCallback(() => {
    setScreen(null);
    setPending(null);
    setIntent(null);
  }, []);
  const t = (fr, en) => (lang === "en" ? en : fr);
  async function refresh(role = "buyer") {
    const value = await api("/api/marketplace?view=" + role, { country });
    setMarket(value);
    setProfile(value.profile);
    setIsAdmin(value.roles.admin);
    if (value.catalogue && role === "buyer") {setProducts(value.catalogue);setCampaigns(value.campaigns || []);}
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
          setCampaigns(d.campaigns || []);
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
  async function authenticated(u, registrationRole) {
    setUser(u);
    const p = await api("/api/customer", { country });
    setProfile(p);
    if (pending) {
      if (!p) {
        setScreen({ type: "profile", role: "buyer" });
        return;
      }
      await purchase(pending);
    } else if (["seller", "courier"].includes(registrationRole)) {
      setScreen({ type: "onboarding", role: registrationRole });
      setIntent(null);
    } else if (intent?.type === "workspace") {
      if (!p) {
        setScreen({ type: "profile", role: "buyer" });
        return;
      }
      const m = await refresh(intent.role);
      setScreen(
        intent.role === "buyer"
          ? { type: "account" }
          : { type: "dashboard", role: intent.role, state: m },
      );
      setIntent(null);
    } else if (intent) {
      setScreen(intent);
      setIntent(null);
    } else if (!p) setScreen({ type: "profile", role: "buyer" });
    else setScreen({ type: "account" });
  }
  async function openWorkspace(role) {
    if (!user || !profile) {
      setIntent({ type: "workspace", role });
      setScreen(!user ? { type: "auth" } : { type: "profile", role: "buyer" });
      return;
    }
    await account(role === "buyer" ? "account" : "dashboard", role);
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
    else if (intent?.type === "workspace") {
      const m = await refresh(intent.role);
      setScreen(
        intent.role === "buyer"
          ? { type: "account" }
          : { type: "dashboard", role: intent.role, state: m },
      );
      setIntent(null);
    } else if (intent) {setScreen(intent);setIntent(null);}
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
  const cityProvinces =
    country === "CG"
      ? { Brazzaville: "Brazzaville", "Pointe-Noire": "Pointe-Noire" }
      : {
          Kinshasa: "Kinshasa",
          Lubumbashi: "Haut-Katanga",
          Kolwezi: "Lualaba",
          Matadi: "Kongo Central",
          Boma: "Kongo Central",
        };
  const shopProvince = (shop) =>
    shop?.province || cityProvinces[shop?.city] || "";
  const availableProvinces = [
    ...new Set(
      [...Object.values(cityProvinces), ...shops.map(shopProvince)].filter(
        Boolean,
      ),
    ),
  ].sort((a, b) => a.localeCompare(b, "fr"));
  const availableCities = [
    ...new Set([
      ...Object.keys(cityProvinces),
      ...shops.map((s) => s.city).filter(Boolean),
    ]),
  ]
    .filter(
      (v) =>
        !province ||
        cityProvinces[v] === province ||
        shops.some((s) => s.city === v && shopProvince(s) === province),
    )
    .sort((a, b) => a.localeCompare(b, "fr"));
  const availableCommunes = [
    ...new Set([
      ...(city ? Object.keys(config.deliveryRates[city] || {}) : []),
      ...shops
        .filter(
          (s) =>
            (!city || s.city === city) &&
            (!province || shopProvince(s) === province),
        )
        .map((s) => s.commune)
        .filter(Boolean),
    ]),
  ].sort((a, b) => a.localeCompare(b, "fr"));
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
        (!province ||
          shopProvince(shops.find((s) => s.id === p.seller)) === province) &&
        (!commune || shops.find((s) => s.id === p.seller)?.commune === commune),
    )
    .sort((a, b) =>
      sort === "asc"
        ? a.price - b.price
        : sort === "desc"
          ? b.price - a.price
          : sort === "verified"
            ? Number(!!shops.find((s) => s.id === b.seller)?.reviewed) -
              Number(!!shops.find((s) => s.id === a.seller)?.reviewed)
            : sort === "az"
              ? a.title.localeCompare(b.title, "fr")
              : sort === "za"
                ? b.title.localeCompare(a.title, "fr")
                : sort === "newest"
                  ? Number(b.id) - Number(a.id)
                  : sort === "oldest"
                    ? Number(a.id) - Number(b.id)
                    : sort === "rating"
                      ? demoRating(b) - demoRating(a)
                      : sort === "popular"
                        ? (config.demoBuyerCounts[b.id]?.count || 0) -
                          (config.demoBuyerCounts[a.id]?.count || 0)
                        : 0,
    );
  const chosen = screen?.product;
  const dailyProducts = products.filter(
    (p) => p.visible && p.approved && [3, 4].includes(p.originProduct || p.id),
  );
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const info = params.get("info"),
      role = params.get("role");
    if (
      [
        "payments",
        "logistics",
        "benefits",
        "partnership",
        "subscriptions",
        "seller-plans",
        "why-yaviya",
        "returns",
        "about",
      ].includes(info)
    )
      setScreen({ type: "service", info });
    else if (/^YVC-[0-9]{4,}[a-z]$/.test(params.get("invitation") || ""))
      setScreen({type:"auth",action:"signup"});
    else if (["buyer", "seller", "courier", "admin"].includes(role))
      setScreen({ type: "workspace-intro", role });
  }, []);
  useEffect(() => {
    if (!user || screen?.type !== "orders") return;
    let live = true,
      working = false;
    const timer = setInterval(async () => {
      if (!live || working || document.visibilityState === "hidden") return;
      working = true;
      try {
        const state = await api("/api/marketplace?view=buyer", { country });
        if (live)
          setScreen((current) =>
            current?.type === "orders" ? { ...current, state } : current,
          );
      } catch (e) {
        if (live) setError(e.message);
      } finally {
        working = false;
      }
    }, 10000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [screen?.type, user?.id, country]);
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
      auth:
        screen?.action === "signup"
          ? pending ? "Créer mon compte acheteur" : "Créer mon compte YAVIYA"
          : "Mon compte YAVIYA",
      "photo-search": "Recherche par photo",
      "workspace-intro": "Votre espace YAVIYA",
      profile: "Mes coordonnées",
      onboarding:
        screen?.role === "seller" ? "Devenir vendeur" : "Devenir livreur",
      account: "Mon Yaviya",
      hub: "Mes outils YAVIYA",
      cart: "Mon panier",
      wishlist: "Mes favoris",
      checkout: "Finaliser mon achat",
      orders: "Historique des commandes",
      dashboard: "Mon espace professionnel",
      following: "Mes magasins suivis",
      invitation: "Inviter un ami",
      settings: "Paramètres du compte",
      support: "Centre d’aide",
      contact: "Contacter le support client",
      coupons: "Mes coupons",
      service: screen?.info === "why-yaviya" ? "Pourquoi YAVIYA" : "Découvrir les services YAVIYA",
      compare: "Comparer les produits",
      success: "Commande enregistrée",
    }[screen?.type] ||
    chosen?.title ||
    "YAVIYA";
  return (
    <>
      <nav className="yv-workspace-nav" aria-label="Vues YAVIYA">
        <span>Votre espace</span>
        {[
          ["buyer", "Acheteur"],
          ["seller", "Vendeur"],
          ["courier", "Livreur"],
          ["admin", "Admin"],
        ].map(([role, label]) => (
          <button
            key={role}
            aria-pressed={screen?.role === role}
            onClick={() => setScreen({ type: "workspace-intro", role })}
          >
            Vue {label}
          </button>
        ))}
      </nav>
    <div className="yv-app" data-ready={hydrated}>
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
          <a className="yv-home-link" href={country === "CG" ? "/congo.html" : "/"}>
            <Icon name="home" />
            <span>{t("Accueil", "Home")}</span>
          </a>
          <button onClick={() => setScreen({ type: "wishlist" })}>
            <Icon name="heart" />
            <span>{t("Favoris", "Favourites")}</span>
          </button>
          <button className="yv-cart-button" onClick={() => setScreen({ type: "cart" })}>
            <Icon name="cart" />
            <span>
              {t("Panier", "Cart")}{cartCount > 0 && <> <b>{cartCount}</b></>}
            </span>
          </button>
          <Notifications user={user} profile={profile} country={country} lang={lang} onSignIn={() => setScreen({ type: "auth" })} onOrders={(role) => account(role === "buyer" ? "orders" : "dashboard", role)} />
          <button onClick={() => account()}>
            <Icon name="user" />
            <span>{t("Profil", "Profile")}</span>
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
          <button
            type="button"
            aria-label="Rechercher avec une photo"
            title="Rechercher avec une photo"
            onClick={() => setScreen({ type: "photo-search" })}
          >
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
        <button onClick={() => setScreen({type:"service",info:"why-yaviya"})}>{t("Pourquoi YAVIYA", "Why YAVIYA")}</button>
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
            <HeroCarousel country={country} t={t} onService={(info) => setScreen({ type: "service", info })} />
            <section
              className="yv-adverts"
              aria-label="Publicités et sélections"
            >
              {[
                {
                  image: "headphones.png",
                  title: "Votre musique. Votre rythme.",
                  category: "électronique",
                },
                {
                  image: "sneakers.png",
                  title: "Un pas de plus. Du style en plus.",
                  category: "mode",
                },
                {
                  image: "handbag.png",
                  title: "Emportez l’essentiel avec élégance.",
                  category: "mode",
                },
              ].map((ad) => (
                <article key={ad.image}>
                  <img src={imageUrl(ad.image)} alt={ad.title} />
                  <div>
                    <small>ESPACE PUBLICITAIRE · DÉMO</small>
                    <h3>{ad.title}</h3>
                    <button
                      onClick={() => {
                        setQuery("");
                        const c = config.categorySections.find((c) =>
                          c[1].toLowerCase().includes(ad.category),
                        );
                        categoryChoice(c?.[0] || "");
                      }}
                    >
                      Découvrir la sélection
                    </button>
                  </div>
                </article>
              ))}
              <a className="yv-advert-partner" href="/publicite.html">
                Votre marque sur YAVIYA · Découvrez nos espaces publicitaires
              </a>
            </section>
            <section className="yv-daily-promos" id="daily-promos">
              <div className="yv-heading">
                <div>
                  <p className="yv-eyebrow">LA SÉLECTION DU JOUR</p>
                  <h2>Promo du jour</h2>
                </div>
                <button
                  onClick={() =>
                    setScreen({ type: "service", info: "benefits" })
                  }
                >
                  Découvrir mes avantages
                </button>
              </div>
              <div className="yv-daily-grid">
                {dailyProducts.map((p) => (
                  <article key={p.id}>
                    <img src={imageUrl(p.img)} alt={p.title} />
                    <div>
                      <span className="yv-campaign-label">
                        SÉLECTION · DÉMO
                      </span>
                      <h3>{p.title}</h3>
                      <ProductPrice product={p} country={country} />
                      <p>Découvrez l’offre et comparez les boutiques.</p>
                      <button
                        className="yv-primary"
                        onClick={() =>
                          setScreen({ type: "product", product: p })
                        }
                      >
                        Voir le produit
                      </button>
                    </div>
                  </article>
                ))}
              </div>
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
                    <option value="verified">
                      Vendeurs vérifiés en premier
                    </option>
                    <option value="newest">Derniers ajouts</option>
                    <option value="oldest">Premiers ajouts</option>
                    <option value="az">Nom : A à Z</option>
                    <option value="za">Nom : Z à A</option>
                    <option value="rating">Note des clients (démo)</option>
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
              <div
                className="yv-fields yv-locality-filters"
                aria-label="Filtres des boutiques"
              >
                <label>
                  Boutique
                  <select
                    value={seller}
                    onChange={(e) => setSeller(e.target.value)}
                  >
                    <option value="">Toutes les boutiques</option>
                    {shops
                      .filter(
                        (s) =>
                          (!province || shopProvince(s) === province) &&
                          (!city || s.city === city) &&
                          (!commune || s.commune === commune),
                      )
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  {country === "CG" ? "Département" : "Province"}
                  <select
                    aria-label="Province"
                    value={province}
                    onChange={(e) => {
                      setProvince(e.target.value);
                      setCity("");
                      setCommune("");
                      setSeller("");
                    }}
                  >
                    <option value="">Toutes les provinces</option>
                    {availableProvinces.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Ville
                  <select
                    aria-label="Ville"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      setCommune("");
                      setSeller("");
                    }}
                  >
                    <option value="">Toutes les villes</option>
                    {availableCities.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Commune
                  <select
                    aria-label="Commune"
                    value={commune}
                    onChange={(e) => {
                      setCommune(e.target.value);
                      setSeller("");
                    }}
                  >
                    <option value="">Toutes les communes</option>
                    {availableCommunes.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <button
                  className="yv-reset-filters"
                  onClick={() => {
                    setSeller("");
                    setProvince("");
                    setCity("");
                    setCommune("");
                  }}
                >
                  Réinitialiser les lieux
                </button>
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
                        <VerifiedSellerBadge
                          verified={
                            !!shops.find((s) => s.id === p.seller)?.reviewed
                          }
                          demo={p.seller < 10000}
                          compact
                        />
                      </button>
                      <ProductPrice product={p} country={country} />
                      {config.demoBuyerCounts[p.id]?.title === p.title ? (
                        <small>
                          {config.demoBuyerCounts[p.id].count} acheteurs · démo
                        </small>
                      ) : (
                        <small>
                          {Number.isSafeInteger(buyerCounts[p.id])
                            ? buyerCounts[p.id] +
                              " acheteur(s) · réception confirmée"
                            : "Achats : données indisponibles"}
                        </small>
                      )}
                      <button
                        className="yv-primary yv-buy-now"
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
                  {campaigns.length>0 && <section className="yv-info-grid" aria-label="Publicités YAVIYA">{campaigns.map(c=><article key={c.id} className="yv-info-card"><p className="yv-eyebrow">PUBLICITÉ</p><img src={c.image} alt={c.title} style={{width:'100%',maxHeight:200,objectFit:'cover',borderRadius:16}}/><h3>{c.title}</h3></article>)}</section>}
              <PopularQuestions
              faq={faq}
              lang={lang}
              user={user}
              country={country}
              onContact={() => setScreen({ type: "contact" })}
            />
            <section className="yv-seller-banner">
              <div className="yv-seller-banner-copy">
                <p className="yv-eyebrow">{t("VENDRE SUR YAVIYA", "SELL ON YAVIYA")}</p>
                <h2>{t("Donnez une nouvelle vitrine à votre boutique.", "Give your shop a new storefront.")}</h2>
                <p>{t("Présentez vos produits, gérez vos commandes et échangez avec vos clients depuis votre espace vendeur.", "Showcase your products, manage orders and connect with customers from your seller workspace.")}</p>
              </div>
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
            <Support
              faq={faq}
              lang={lang}
              user={user}
              country={country}
              onContact={() => setScreen({ type: "contact" })}
            />
          </section>
        ) : (
          <section className="yv-info">
            {pageName === "publicite" ? (
              <>
                <div className="yv-promotion-heading">
                  <div>
                    <p className="yv-eyebrow">LES ENVIES DU MOMENT</p>
                    <h1>À l’affiche sur YAVIYA</h1>
                    <p>
                      Campagnes illustratives, sans partenariat commercial
                      confirmé.
                    </p>
                  </div>
                </div>
                <PartnerPromotions
                  onHelp={(info) => setScreen({ type: "service", info })}
                />
                <ServiceInfo
                  type="partnership"
                  country={country}
                  config={config}
                />
              </>
            ) : (
              <InfoContent content={content} />
            )}
          </section>
        )}
      </main>
      <footer className="yv-footer">
        <div className="yv-footer-brand">
          <a className="yv-logo" href={country === "CG" ? "/congo.html" : "/"}>YAVIYA<span>●</span></a>
          <p>{t("Votre marché, à portée de main.", "Your marketplace, at your fingertips.")}</p>
          <small>{country === "CD" ? "République démocratique du Congo" : "République du Congo"}</small>
        </div>
        <section className="yv-footer-group" aria-labelledby="yv-footer-shopping">
          <h3 id="yv-footer-shopping">{t("Vos achats", "Your purchases")}</h3>
          <button onClick={() => account("orders")}>{t("Suivre ma commande", "Track my order")}</button>
          <button onClick={() => setScreen({ type: "service", info: "payments" })}>{t("Paiements", "Payments")}</button>
          <button onClick={() => setScreen({ type: "service", info: "returns" })}>{t("Retours et remboursements · 72 h", "Returns and refunds · 72 hours")}</button>
          <button onClick={() => setScreen({ type: "service", info: "logistics" })}>{t("Livraison", "Delivery")}</button>
          <button onClick={() => setScreen({ type: "service", info: "benefits" })}>{t("Coupons et avantages", "Coupons and benefits")}</button>
        </section>
        <section className="yv-footer-group" aria-labelledby="yv-footer-help">
          <h3 id="yv-footer-help">{t("À votre écoute", "Here to help")}</h3>
          <a href="/aide.html">{t("Centre d’aide", "Help centre")}</a>
          <button onClick={() => setScreen({ type: "support" })}>{t("Besoin d’aide", "Need help")}</button>
          <button onClick={() => setScreen({ type: "contact" })}>{t("Contacter le service client", "Contact customer service")}</button>
          <a href="/confidentialite.html">{t("Confidentialité", "Privacy")}</a>
        </section>
        <section className="yv-footer-group yv-footer-partners" aria-labelledby="yv-footer-partners">
          <h3 id="yv-footer-partners">{t("Avec YAVIYA", "With YAVIYA")}</h3>
          <button onClick={() => setScreen({ type: "service", info: "about" })}>{t("À propos", "About us")}</button>
          <button onClick={becomeSeller}>{t("Revendre un produit", "Resell a product")}</button>
          <a href="/publicite.html">{t("Devenir annonceur", "Advertise with us")}</a>
          <a className="yv-footer-partner-link" href="mailto:partenariat@yaviya.cd">{t("Devenir partenaire YAVIYA", "Partner with YAVIYA")}<span>partenariat@yaviya.cd</span></a>
        </section>
        <div className="yv-footer-bottom">
          <small>© 2026 YAVIYA · {t("Version de démonstration", "Demonstration version")}</small>
          <a href={country === "CD" ? "/congo.html" : "/"}>{country === "CD" ? "République du Congo" : "République démocratique du Congo"}</a>
        </div>
      </footer>
      <button type="button" className="yv-chatbot-launcher" aria-label="Ouvrir le chatbot YAVIYA" onClick={() => setScreen({type:"support"})}><Icon name="chatbot"/><span>{t("Besoin d’aide ?", "Need help?")}</span></button>
      {screen && (
        <Modal title={title} onClose={close}>
          {screen.type === "workspace-intro" && (
            <section className="yv-workspace-intro">
              <p className="yv-eyebrow">UN ESPACE ADAPTÉ À VOS BESOINS</p>
              <h3>
                {
                  {
                    buyer: "Acheteur",
                    seller: "Vendeur",
                    courier: "Livreur",
                    admin: "Administration",
                  }[screen.role]
                }
              </h3>
              <p>
                {
                  {
                    buyer:
                      "Retrouvez vos commandes, vos favoris, vos coupons et le suivi de vos livraisons.",
                    seller:
                      "Gérez vos produits et leurs photos, vos commandes, vos échanges et les statistiques de votre boutique.",
                    courier:
                      "Consultez vos missions, confirmez vos prises en charge et livraisons, renseignez vos frais et échangez avec l’administration.",
                    admin:
                      "Supervisez les commandes, les vérifications d’identité, les boutiques, les livreurs et les statistiques centralisées.",
                  }[screen.role]
                }
              </p>
              <button
                className="yv-primary"
                onClick={() => openWorkspace(screen.role)}
              >
                Ouvrir mon espace
              </button>
              {["seller", "courier"].includes(screen.role) && (
                <>
                  <p>
                    L’accès nécessite un compte vérifié et autorisé pour ce
                    rôle.
                  </p>
                  <button
                    onClick={() => {
                      const intent = { type: "onboarding", role: screen.role };
                      if (!user) {
                        setIntent(intent);
                        setScreen({ type: "auth", action: "signup" });
                      } else setScreen(intent);
                    }}
                  >
                    Demander un compte{" "}
                    {screen.role === "seller" ? "vendeur" : "livreur"}
                  </button>
                </>
              )}
              {screen.role === "admin" && (
                <p>
                  Accès réservé aux administrateurs autorisés, avec vérification
                  de sécurité obligatoire.
                </p>
              )}
            </section>
          )}
          {screen.type === "contact" && (
            <section className="yv-support-contact">
              <h3>Parlons de votre demande</h3>
              <p>
                Pour faciliter le traitement, indiquez le numéro de commande, le
                produit concerné et ce qui vous bloque. Ne transmettez jamais
                votre mot de passe ni votre code de connexion.
              </p>
              <a
                className="yv-primary"
                href="mailto:partenariat@yaviya.cd?subject=Demande%20service%20client%20YAVIYA"
              >
                Écrire au service client
              </a>
              <p>
                Contact provisoire pour orienter les demandes :
                partenariat@yaviya.cd.
              </p>
              <button onClick={() => setScreen({ type: "support" })}>
                Consulter le chatbot et les réponses
              </button>
            </section>
          )}
          {screen.type === "service" && (
            <ServiceInfo
              type={screen.info}
              country={country}
              config={config}
              onNavigate={(section) => {
                if(section === "catalogue") {close();setTimeout(()=>document.getElementById("yv-catalog")?.scrollIntoView({behavior:"smooth"}),0);}
                else if(section === "support") setScreen({type:"support"});
                else if(["orders", "coupons", "contact"].includes(section)) account(section);
                else setScreen({type:"service",info:section});
              }}
              onSeller={() => {
                const next = { type: "onboarding", role: "seller" };
                if (!user) {
                  setIntent(next);
                  setScreen({ type: "auth", action: "signup" });
                } else setScreen(next);
              }}
            />
          )}
          {screen.type === "photo-search" && (
            <PhotoSearch
              products={products.filter((p) => p.visible && p.approved)}
              country={country}
              onChoose={(product) => setScreen({ type: "product", product })}
            />
          )}
          {screen.type === "auth" && (
            <AuthForm
              country={country}
              initialAction={screen.action}
              initialRole={pending ? "buyer" : intent?.role}
              onSuccess={authenticated}
            />
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
          {screen.type === "product" && following.error && <p className="yv-error" role="alert">{following.error}</p>}
          {screen.type === "product" && (
            <ProductDetail
              key={chosen.id}
              buyerCounts={buyerCounts}
              following={following.follows.some(f=>f.sellerId===chosen.seller)}
              followerCount={following.counts ? (following.counts[chosen.seller] || 0) : null}
              followDisabled={following.busy || (!!user && !!profile && !following.ready)}
              onFollow={followSeller}
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
                  ["hub", "Annonces personnelles, adresses et portefeuille"],
                  ["orders", "Historique des commandes"],
                  ["support", "Service client"],
                  ["profile", "Adresse et coordonnées"],
                  ["coupons", "Coupons"],
                  ["returns", "Retours et remboursements · 72 h"],
                  ["following", "Magasins suivis"],
                  ["invitation", "Code d’invitation · Inviter un ami"],
                  ["subscriptions", "Abonnements de livraison & Prime"],
                  ["settings", "Paramètres du compte"],
                ].map(([type, label]) => (
                  <button
                    key={type}
                    onClick={() =>
                      type === "profile"
                        ? setScreen({ type, role: profile.accountType })
                        : ["subscriptions", "returns"].includes(type)
                          ? setScreen({ type: "service", info: type })
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
          {screen.type === "hub" && <AccountHub country={country} config={config}/>}
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
              followerCounts={following.counts}
              onManagePlan={() =>
                setScreen({ type: "onboarding", role: "seller" })
              }
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
          {screen.type === "following" && <section><h3>Vos boutiques préférées, réunies ici.</h3><p>Suivez une boutique depuis une fiche produit pour la retrouver facilement.</p>{following.error && <p className="yv-error" role="alert">{following.error}</p>}{!following.ready && !following.error && <p>Chargement…</p>}{following.ready && following.follows.length===0 && <p>Vous ne suivez pas encore de boutique.</p>}<div className="yv-followed-stores">{following.follows.map(f=><article key={f.sellerId}><h4>{shops.find(shop=>shop.id===f.sellerId)?.name || "Boutique " + f.sellerId}</h4><small>{following.counts?.[f.sellerId] || 0} personne(s) suivent cette boutique</small><div className="yv-actions"><button onClick={()=>{setSeller(String(f.sellerId));close();setTimeout(()=>document.getElementById("yv-catalog")?.scrollIntoView({behavior:"smooth"}),0)}}>Voir les produits</button><button disabled={following.busy} onClick={()=>following.toggle(f.sellerId)}>Ne plus suivre</button></div></article>)}</div></section>}
          {screen.type === "invitation" && profile && <Invitation code={profile.customerNumber} country={country}/>}
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
          {screen.type === "support" && (
            <Support
              faq={faq}
              lang={lang}
              user={user}
              country={country}
              onContact={() => setScreen({ type: "contact" })}
            />
          )}
          {screen.type === "coupons" && (
            <Coupons country={country} products={products} />
          )}
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
                      className="yv-primary yv-buy-now"
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
    </>
  );
}
