export const PLAYER_STATUS_LABELS = {
  active: 'Activa',
  restricted: 'Restringida',
  suspended: 'Suspendida',
  banned: 'Bloqueada',
  pending_deletion: 'Eliminación pendiente',
  deleted: 'Eliminada',
} as const;

export const MODERATION_ACTION_LABELS = {
  warning: 'Advertencia',
  rating_restriction: 'Restringir calificaciones',
  game_restriction: 'Restringir un juego',
  temporary_suspension: 'Suspensión temporal',
  indefinite_ban: 'Bloqueo indefinido',
  global_ban: 'Bloqueo global',
  restored: 'Restablecer cuenta',
} as const;

export const ADMIN_ROLE_LABELS = {
  support: 'Soporte',
  moderator: 'Moderador',
  senior_moderator: 'Moderador sénior',
  administrator: 'Administrador',
  owner: 'Propietario',
} as const;

export type PlayerStatus = keyof typeof PLAYER_STATUS_LABELS;
export type ModerationActionType = keyof typeof MODERATION_ACTION_LABELS;
export type AdminRole = keyof typeof ADMIN_ROLE_LABELS;

export interface BzIdentityPayload {
  identity: {
    id: string;
    publicId: string;
    displayName: string;
    status: PlayerStatus;
    createdAt: string;
    lastActiveAt: string | null;
  };
  gameAccounts: Array<{
    id: string;
    gameId: string;
    gameName: string;
    platform: string;
    displayName: string | null;
    status: string;
    linkedAt: string | null;
    lastVerifiedAt: string | null;
  }>;
  moderation: Array<{
    id: string;
    caseId: string | null;
    action: ModerationActionType;
    scope: string;
    message: string;
    startsAt: string;
    endsAt: string | null;
  }>;
  appeals: Array<{
    id: string;
    caseId: string;
    status: string;
    message: string;
    decision: string | null;
    createdAt: string;
    reviewedAt: string | null;
  }>;
}

export const adminRoleRank = (role: string) => ({ support: 10, moderator: 20, senior_moderator: 30, administrator: 40, owner: 50 }[role] ?? 0);

export const minimumRoleForAction = (action: ModerationActionType): AdminRole => {
  if (action === 'warning' || action === 'rating_restriction' || action === 'game_restriction' || action === 'temporary_suspension') return 'moderator';
  if (action === 'indefinite_ban' || action === 'restored') return 'senior_moderator';
  return 'administrator';
};
