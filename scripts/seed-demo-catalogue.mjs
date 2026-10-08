import { createDatabase } from '../backend/database.js';
import { ensureSeeds } from '../backend/worker/commerce.js';

// Explicit demo setup only: this identity has no login or administrator rights.
// Existing product records and seller changes are preserved by ensureSeeds.
if (!process.argv.includes('--confirm-demo')) {
  console.error('Usage: node --env-file-if-exists=.env scripts/seed-demo-catalogue.mjs --confirm-demo');
  process.exitCode = 1;
} else {
  const db = await createDatabase();
  try {
    for (const country of ['CD', 'CG']) {
      await ensureSeeds({ DB: db }, { owner: 'demo:catalogue', country });
      const row = await db.prepare('SELECT COUNT(*) AS total FROM market_products WHERE country=?').bind(country).first();
      console.log(`${country}: ${row.total} références enregistrées.`);
    }
  } finally { await db.close(); }
}
