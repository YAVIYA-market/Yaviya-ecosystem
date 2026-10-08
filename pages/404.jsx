import Head from "next/head";
import styles from "../components/PageStatus.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <Head>
        <title>Page introuvable — YAVIYA</title>
        <meta name="robots" content="noindex" />
      </Head>
      <section className={styles.card}>
        <a className={styles.brand} href="/">
          YAVIYA
        </a>
        <h1>Cette page est introuvable</h1>
        <p>
          Le lien a peut-être changé. Retrouvez les produits et les boutiques
          depuis notre catalogue.
        </p>
        <a className={styles.action} href="/">
          Découvrir le catalogue
        </a>
      </section>
    </main>
  );
}
