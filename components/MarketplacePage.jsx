import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import styles from './PageStatus.module.css';

// Transitional boundary: Next owns routing/rendering; the established marketplace
// still owns its DOM inside this boundary until each feature is ported to React.
export default function MarketplacePage({ page }) {
  const started = useRef(false);
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    document.body.className = page.bodyClass;
    async function boot() {
      for (const src of page.scripts) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.async = false;
          script.onload = resolve;
          script.onerror = () => reject(new Error(`Impossible de charger ${src}`));
          document.body.append(script);
        });
      }
      document.documentElement.dataset.yaviyaReady = 'true';
    }
    boot().catch(error => {
      console.error(error);
      setLoadFailed(true);
    });
  }, [page]);
  return <>
    <Head>
      <title>{page.title}</title>
      <meta name="description" content={page.description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="stylesheet" href="/style.css" />
      <link rel="icon" href="/yaviya-icon.svg" type="image/svg+xml" />
      <meta name="theme-color" content="#f97316" />
      {page.scripts.map(src => <link key={src} rel="preload" href={src} as="script" />)}
    </Head>
    {loadFailed ? <aside className={styles.notice} role="alert">
      <strong>Le chargement de YAVIYA a été interrompu.</strong>
      <span>Vérifiez votre connexion, puis rechargez la page pour continuer.</span>
      <button type="button" onClick={() => window.location.reload()}>Réessayer</button>
    </aside> : null}
    <noscript><p className={styles.notice}>Activez JavaScript pour utiliser le panier, votre compte et le suivi des commandes.</p></noscript>
    <div id="yaviya-marketplace" dangerouslySetInnerHTML={{ __html: page.markup }} />
  </>;
}
