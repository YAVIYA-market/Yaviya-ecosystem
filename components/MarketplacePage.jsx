import Head from 'next/head';
import { useEffect, useRef } from 'react';

// Transitional boundary: Next owns routing/rendering; the established marketplace
// still owns its DOM inside this boundary until each feature is ported to React.
export default function MarketplacePage({ page }) {
  const started = useRef(false);
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
      const toast = document.querySelector('#toast');
      if (toast) { toast.textContent = 'Chargement interrompu. Actualisez la page.'; toast.classList.add('show'); }
    });
  }, [page]);
  return <>
    <Head>
      <title>{page.title}</title>
      <meta name="description" content={page.description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="stylesheet" href="/style.css" />
    </Head>
    <div id="yaviya-marketplace" dangerouslySetInnerHTML={{ __html: page.markup }} />
  </>;
}
