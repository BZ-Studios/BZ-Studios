import type { SupabaseClient } from '@supabase/supabase-js';
import { adminRoleRank, minimumRoleForAction, type AdminRole, type ModerationActionType } from '../config/bzId';

type ServiceClient = SupabaseClient<any, 'public', any>;

interface ModerationInput {
  actorUserId: string;
  actorRole: AdminRole;
  playerId: string;
  actionType: ModerationActionType;
  reasonCode: string;
  userMessage: string;
  internalNote?: string;
  durationDays?: number;
  gameId?: string;
}

const statusForAction = (action: ModerationActionType) => {
  if (action === 'rating_restriction' || action === 'game_restriction') return 'restricted';
  if (action === 'temporary_suspension') return 'suspended';
  if (action === 'indefinite_ban' || action === 'global_ban') return 'banned';
  if (action === 'restored') return 'active';
  return null;
};

export async function applyModerationAction(client: ServiceClient, input: ModerationInput) {
  const minimumRole = minimumRoleForAction(input.actionType);
  if (adminRoleRank(input.actorRole) < adminRoleRank(minimumRole)) throw new Error(`Esta medida requiere el rol ${minimumRole}.`);
  if (!/^[a-z0-9_]{3,60}$/.test(input.reasonCode)) throw new Error('Ingresá un código de motivo válido, por ejemplo: abuso_calificaciones.');
  if (input.userMessage.trim().length < 10) throw new Error('El mensaje para el usuario debe tener al menos 10 caracteres.');
  const durationDays = Math.floor(Number(input.durationDays ?? 0));
  if (input.actionType === 'temporary_suspension' && (durationDays < 1 || durationDays > 365)) throw new Error('La suspensión temporal debe durar entre 1 y 365 días.');
  if (input.actionType === 'game_restriction' && !input.gameId) throw new Error('Elegí el juego alcanzado por la restricción.');

  const { data: player, error: playerError } = await client.from('players').select('id, auth_user_id, status').eq('id', input.playerId).single();
  if (playerError || !player) throw new Error('No se encontró la identidad B&Z del usuario.');

  const now = new Date();
  const endsAt = input.actionType === 'temporary_suspension' ? new Date(now.getTime() + durationDays * 86_400_000).toISOString() : null;
  const scopeType = input.actionType === 'rating_restriction' ? 'feature' : input.actionType === 'game_restriction' ? 'game' : 'central_identity';
  const summary = `${input.actionType}: ${input.userMessage.trim()}`.slice(0, 500);
  const { data: moderationCase, error: caseError } = await client.from('moderation_cases').insert({
    player_id: player.id,
    game_id: input.gameId || null,
    status: input.actionType === 'restored' ? 'resolved' : 'open',
    reason_code: input.reasonCode,
    summary,
    internal_notes: input.internalNote?.trim() || null,
    opened_by: input.actorUserId,
    resolved_at: input.actionType === 'restored' ? now.toISOString() : null,
  }).select('id').single();
  if (caseError || !moderationCase) throw new Error(`No se pudo abrir el caso: ${caseError?.message ?? 'error desconocido'}`);

  if (input.actionType === 'restored') {
    const { error } = await client.from('moderation_actions').update({ revoked_at: now.toISOString(), revoked_by: input.actorUserId })
      .eq('player_id', player.id).is('revoked_at', null);
    if (error) throw new Error(`No se pudieron cerrar las medidas anteriores: ${error.message}`);
  }

  const { error: actionError } = await client.from('moderation_actions').insert({
    case_id: moderationCase.id,
    player_id: player.id,
    scope_type: scopeType,
    scope_id: input.gameId || null,
    action_type: input.actionType,
    reason_code: input.reasonCode,
    user_message: input.userMessage.trim(),
    internal_note: input.internalNote?.trim() || null,
    starts_at: now.toISOString(),
    ends_at: endsAt,
    created_by: input.actorUserId,
  });
  if (actionError) throw new Error(`No se pudo registrar la medida: ${actionError.message}`);

  const nextStatus = statusForAction(input.actionType);
  if (nextStatus) {
    const { error } = await client.from('players').update({ status: nextStatus }).eq('id', player.id);
    if (error) throw new Error(`La medida quedó registrada, pero no se actualizó el estado: ${error.message}`);
  }

  if (input.actionType === 'temporary_suspension' || input.actionType === 'indefinite_ban' || input.actionType === 'global_ban' || input.actionType === 'restored') {
    const banDuration = input.actionType === 'temporary_suspension' ? `${durationDays * 24}h` : input.actionType === 'restored' ? 'none' : '876000h';
    const { error } = await client.auth.admin.updateUserById(player.auth_user_id, { ban_duration: banDuration });
    if (error) throw new Error(`La medida se guardó, pero Supabase Auth no pudo aplicarla: ${error.message}`);
  }

  await client.from('security_audit_events').insert({
    player_id: player.id,
    actor_user_id: input.actorUserId,
    event_type: 'moderation_action_applied',
    target_type: 'moderation_case',
    target_id: moderationCase.id,
    metadata: { action: input.actionType, reasonCode: input.reasonCode, scopeType, scopeId: input.gameId || null },
  });
}

export async function deletePlayerAccount(client: ServiceClient, input: { actorUserId: string; actorRole: AdminRole; playerId: string; expectedUsername: string; confirmation: string }) {
  if (input.actorRole !== 'owner') throw new Error('Solo el propietario puede eliminar definitivamente una cuenta.');
  if (input.confirmation !== input.expectedUsername) throw new Error('La confirmación no coincide con el nombre de usuario.');
  const { data: player, error } = await client.from('players').select('id, auth_user_id').eq('id', input.playerId).single();
  if (error || !player) throw new Error('No se encontró la identidad B&Z.');
  if (player.auth_user_id === input.actorUserId) throw new Error('No podés eliminar tu propia cuenta administradora desde este panel.');
  const { data: targetAdmin } = await client.from('admins').select('user_id').eq('user_id', player.auth_user_id).maybeSingle();
  if (targetAdmin) throw new Error('Primero quitá el rol administrativo con un procedimiento supervisado.');
  await client.from('account_deletion_requests').insert({ player_id: player.id, requested_by: input.actorUserId, request_type: 'administrative', status: 'processing', verified_at: new Date().toISOString() });
  await client.from('security_audit_events').insert({ player_id: player.id, actor_user_id: input.actorUserId, event_type: 'administrative_account_deletion', target_type: 'player', target_id: player.id });
  const result = await client.auth.admin.deleteUser(player.auth_user_id);
  if (result.error) throw new Error(`Supabase Auth rechazó la eliminación: ${result.error.message}`);
}

export async function reviewModerationAppeal(client: ServiceClient, input: { actorUserId: string; actorRole: AdminRole; appealId: string; status: string; decision: string }) {
  if (adminRoleRank(input.actorRole) < adminRoleRank('senior_moderator')) throw new Error('Revisar apelaciones requiere el rol moderador sénior o superior.');
  if (!['accepted', 'partially_accepted', 'rejected'].includes(input.status)) throw new Error('La resolución elegida no es válida.');
  if (input.decision.trim().length < 10 || input.decision.trim().length > 2000) throw new Error('La resolución debe tener entre 10 y 2000 caracteres.');
  const { data: appeal, error: lookupError } = await client.from('moderation_appeals').select('id, case_id, player_id, status').eq('id', input.appealId).single();
  if (lookupError || !appeal) throw new Error('No se encontró la apelación.');
  if (!['submitted', 'under_review'].includes(appeal.status)) throw new Error('Esta apelación ya fue resuelta.');
  const reviewedAt = new Date().toISOString();
  const { error } = await client.from('moderation_appeals').update({ status: input.status, decision: input.decision.trim(), reviewed_by: input.actorUserId, reviewed_at: reviewedAt }).eq('id', appeal.id);
  if (error) throw new Error(`No se pudo resolver la apelación: ${error.message}`);
  await client.from('moderation_cases').update({ status: 'resolved', resolved_at: reviewedAt }).eq('id', appeal.case_id);
  await client.from('security_audit_events').insert({ player_id: appeal.player_id, actor_user_id: input.actorUserId, event_type: 'moderation_appeal_reviewed', target_type: 'moderation_appeal', target_id: appeal.id, metadata: { decision: input.status } });
}
