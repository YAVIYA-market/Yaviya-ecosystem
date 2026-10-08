import { useEffect, useState } from "react";

export default function HeroCarousel({ country, t, onService }) {
  const slides = [
    { id: "catalogue", image: "/hero.png", label: "YAVIYA", eyebrow: t("LE QUOTIDIEN, EN MIEUX", "EVERYDAY, MADE BETTER"), title: <>{t("Vos envies.", "Your wishes.")}<br />{t("Votre ville.", "Your city.")}<br /><em>Votre YAVIYA.</em></>, copy: t("Du coup de cœur à l’essentiel, découvrez votre prochain achat au même endroit.", "From everyday essentials to special finds, discover your next purchase in one place."), cta: t("Explorer le catalogue", "Explore the catalogue") },
    { id: "payments", image: "/partner-payment.jpg", label: country === "CD" ? "M-Pesa" : "Mobile Money", eyebrow: country === "CD" ? "VODACOM · M-PESA" : "MOBILE MONEY · CONGO", title: t("Le paiement mobile, à portée de main.", "Mobile payments, at your fingertips."), copy: t("Découvrez les solutions de paiement proposées sur YAVIYA.", "Explore the payment options presented on YAVIYA."), cta: t("Découvrir les paiements", "Explore payments"), demo: true },
    { id: "logistics", image: "/partner-logistics.jpg", label: t("Livraison", "Delivery"), eyebrow: t("TRANSPORT · LIVRAISON", "TRANSPORT · DELIVERY"), title: t("Le dernier kilomètre, avec vous.", "The last mile, with you."), copy: t("Vos achats, jusqu’à votre porte. Découvrez les modes de livraison.", "Your purchases, to your door. Explore delivery options."), cta: t("Découvrir la livraison", "Explore delivery"), demo: true },
    { id: "benefits", image: "/partner-benefits.jpg", label: "YAVIYA Benefits", eyebrow: "YAVIYA BENEFITS", title: t("Vos achats méritent des avantages.", "Your purchases deserve rewards."), copy: t("Découvrez les coupons et les avantages de livraison YAVIYA.", "Discover YAVIYA coupons and delivery benefits."), cta: t("Découvrir les avantages", "Explore benefits"), demo: true },
  ];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(Boolean(media?.matches));
    const visibility = () => setHidden(document.hidden);
    update(); visibility();
    media?.addEventListener("change", update); document.addEventListener("visibilitychange", visibility);
    return () => { media?.removeEventListener("change", update); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  useEffect(() => {
    if (paused || focused || hovered || hidden || reduced) return;
    const timer = setInterval(() => setIndex(i => (i + 1) % 4), 6500);
    return () => clearInterval(timer);
  }, [paused, focused, hovered, hidden, reduced]);
  const slide = slides[index];
  return <section className="yv-hero-carousel" aria-label={t("À la une YAVIYA", "YAVIYA highlights")} aria-roledescription="carousel"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}>
    <article key={slide.id} className="yv-hero yv-hero-motion" aria-roledescription="slide" aria-label={`${index + 1} / ${slides.length}`}>
      <div><p className="yv-eyebrow">{slide.eyebrow}</p><h1>{slide.title}</h1><p>{slide.copy}</p>
        {slide.id === "catalogue" ? <a className="yv-primary" href="#yv-catalog">{slide.cta}</a> : <button className="yv-primary" onClick={() => onService(slide.id)}>{slide.cta}</button>}
        {slide.demo && <p className="yv-hero-demo">{t("Campagne illustrative · partenariat et activation à confirmer.", "Illustrative campaign · partnership and activation to be confirmed.")}</p>}
      </div><div className="yv-hero-frame"><img src={slide.image} alt={slide.label} /></div>
    </article>
    <div className="yv-hero-controls">
      <div className="yv-hero-dots">{slides.map((s, i) => <button key={s.id} aria-label={s.label} aria-pressed={index === i} onClick={() => setIndex(i)}><span aria-hidden="true" /></button>)}</div>
      <button className="yv-hero-playback" aria-label={reduced ? t("Visuel suivant", "Next slide") : paused ? t("Reprendre le défilement", "Resume slideshow") : t("Arrêter le défilement", "Stop slideshow")} onClick={() => { if (reduced) setIndex(i => (i + 1) % slides.length); else setPaused(p => !p); }}>
        <svg viewBox="0 0 24 24" aria-hidden="true">{reduced ? <path d="m9 5 7 7-7 7"/> : paused ? <path d="m8 5 11 7-11 7Z"/> : <><path d="M8 5v14"/><path d="M16 5v14"/></>}</svg>
      </button>
    </div>
  </section>;
}
