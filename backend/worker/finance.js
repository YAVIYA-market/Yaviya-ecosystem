export const RETURN_WINDOW_MS = 72 * 60 * 60 * 1000;
export function ledgerStatement(env, ctx, { id, orderId, sellerId, userId, amount, debit, credit, kind, reference, guard }) {
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;
  const condition = guard?.returnId ? ' WHERE EXISTS (SELECT 1 FROM return_requests WHERE id=? AND operation_token=?)' : guard ? ' WHERE EXISTS (SELECT 1 FROM market_orders WHERE id=? AND json_extract(snapshot,?)=?)' : '';
  return env.DB.prepare('INSERT INTO finance_entries(id,country,order_id,seller_id,user_id,currency,debit_account,credit_account,amount,kind,reference,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?' + condition + ' ON CONFLICT(id) DO NOTHING')
    .bind(id, ctx.country, orderId, sellerId, userId, ctx.country === 'CG' ? 'XAF' : 'CDF', debit, credit, amount, kind, reference, Date.now(), ...(guard?.returnId ? [guard.returnId,guard.token] : guard ? [orderId, '$.mutationToken', guard] : []));
}

// Accrual bookkeeping for declared COD. This is not a bank balance or a transfer.
export function settlementStatements(env, ctx, order, token) {
  if (!order.buyerConfirmed || order.paymentStatus !== 'cash_confirmed' || order.cancelled) return [];
  const statements = [];
  for (const term of order.sellerTerms || []) {
    const id = order.id + ':' + term.sellerId;
    statements.push(env.DB.prepare('INSERT INTO seller_settlements(id,country,order_id,seller_id,user_id,gross,commission,net,currency,policy_confirmed,status,available_at,updated_at,custodian_kind) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM market_orders WHERE id=? AND json_extract(snapshot,?)=?) ON CONFLICT(id) DO NOTHING')
      .bind(id, ctx.country, order.id, term.sellerId, term.userId, term.gross, term.commission, term.net, ctx.country === 'CG' ? 'XAF' : 'CDF', term.policyConfirmed ? 1 : 0, order.requestedCourier ? 'held' : 'seller_collected', order.receivedAt + RETURN_WINDOW_MS, Date.now(), order.requestedCourier ? 'courier' : 'seller', order.id, '$.mutationToken', token));
    for (const [suffix, amount, credit] of [['net', term.net, 'seller_payable'], ['commission', term.commission, 'commission_accrued']]) {
      if(!order.requestedCourier && suffix==='net') continue;
      const statement = ledgerStatement(env, ctx, {id: id + ':recognize:' + suffix, orderId: order.id, sellerId: term.sellerId, userId: term.userId, amount, debit: order.requestedCourier ? 'cod_custodian_receivable' : 'commission_receivable_from_seller', credit, kind: 'cod_declared', reference: order.id, guard: token});
      if (statement) statements.push(statement);
    }
  }
  if (order.courierUserId && order.courierEarnings > 0) {
    const entry=ledgerStatement(env,ctx,{id:order.id+':courier:earn',orderId:order.id,sellerId:0,userId:order.courierUserId,amount:order.courierEarnings,debit:'cod_custodian_receivable',credit:'courier_payable',kind:'delivery_completed_cod',reference:order.id,guard:token});
    if(entry) statements.push(entry);
    if(order.courierPayout.status==='paid_manual') {
      const payout=ledgerStatement(env,ctx,{id:order.id+':courier:payout',orderId:order.id,sellerId:0,userId:order.courierUserId,amount:order.courierEarnings,debit:'courier_payable',credit:'external_payout_declared',kind:'payout_manual',reference:order.courierPayout.reference,guard:token});
      if(payout) statements.push(payout);
    }
  }
  return statements;
}

export async function financeState(env, ctx) {
  const clause = ctx.isAdmin ? 'country=?' : 'country=? AND user_id=?';
  const args = ctx.isAdmin ? [ctx.country] : [ctx.country, ctx.user];
  const settlements = (await env.DB.prepare('SELECT * FROM seller_settlements WHERE ' + clause + ' ORDER BY updated_at DESC LIMIT 200').bind(...args).all()).results;
  const summary = (await env.DB.prepare("SELECT currency,COALESCE(SUM(gross),0) AS gross,COALESCE(SUM(commission),0) AS commission,COALESCE(SUM(net),0) AS net FROM seller_settlements WHERE " + clause + " AND status <> 'refunded' GROUP BY currency").bind(...args).all()).results;
  const entries = (await env.DB.prepare('SELECT * FROM finance_entries WHERE ' + clause + ' ORDER BY created_at DESC LIMIT 300').bind(...args).all()).results;
  const openReturns = (await env.DB.prepare("SELECT order_id FROM return_requests WHERE country=? AND status NOT IN ('rejected','refunded_manual')").bind(ctx.country).all()).results;
  const blocked = new Set(openReturns.map(r => r.order_id));
  const remittances=(await env.DB.prepare('SELECT order_id FROM cash_remittances WHERE country=?').bind(ctx.country).all()).results;
  const remitted=new Set(remittances.map(r=>r.order_id));
  const cashOrders=ctx.isAdmin?(await env.DB.prepare('SELECT id,snapshot FROM market_orders WHERE country=?').bind(ctx.country).all()).results.map(r=>JSON.parse(r.snapshot)).filter(o=>o.requestedCourier&&o.buyerConfirmed&&o.paymentStatus==='cash_confirmed'&&!o.cancelled&&!remitted.has(o.id)).map(o=>({id:o.id,total:o.total,courierName:o.courierName})):[];
  const now = Date.now();
  return {
    settlements: settlements.map(s => ({...s, commissionCollectible: s.status==='seller_collected' && s.commission>0 && !!s.policy_confirmed && now>=s.available_at && !blocked.has(s.order_id), payable: s.status === 'held' && !!s.policy_confirmed && now >= s.available_at && !blocked.has(s.order_id) && remitted.has(s.order_id)})),
    entries, summary, cashOrders,
    electronicEnabled: false, escrowEnabled: false, bankBalanceAvailable: false,
    notice: 'Comptabilité des espèces déclarées. Aucun solde bancaire ni transfert automatique. Un règlement manuel exige une référence d’opération déjà effectuée.',
  };
}
