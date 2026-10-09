import { approvedIdentity } from './identity-complete.js';

// account_type is a display preference, never an authorization source.
export async function approvedRole(env, user, role) {
  const grant = await env.DB.prepare('SELECT status,verification FROM account_roles WHERE user_id=? AND role=?').bind(user, role).first();
  if (grant) return grant.status === 'approved' && approvedIdentity(JSON.parse(grant.verification), role);
  const legacy = await env.DB.prepare('SELECT * FROM identity_checks WHERE user_id=?').bind(user).first();
  return approvedIdentity(legacy, role);
}

export async function preserveLegacyRoles(env, user) {
  const check = await env.DB.prepare('SELECT * FROM identity_checks WHERE user_id=?').bind(user).first();
  if (approvedIdentity(check, check?.kind)) {
    await env.DB.prepare('INSERT INTO account_roles(user_id,role,status,verification,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id,role) DO NOTHING')
      .bind(user, check.kind, 'approved', JSON.stringify(check), Date.now()).run();
  }
}
