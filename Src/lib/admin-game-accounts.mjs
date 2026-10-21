export const GAME_ACCOUNTS_PAGE_SIZE = 20;

// Only identity/name characters enter PostgREST's OR expression, never its grammar.
export function normalizeGameAccountSearch(value) {
  return String(value ?? '').trim().slice(0, 80).replace(/[^a-zA-Z0-9_ -]/g, '');
}

export async function loadGameAccounts(client, { gameId, search = '', page = 1 }) {
  const query = normalizeGameAccountSearch(search);
  const filter = (request) => {
    request = request.eq('game_id', gameId).neq('link_status', 'unlinked');
    if (query) {
      const pattern = query.replace(/_/g, '\\_');
      request = request.or(`public_id.ilike.%${pattern}%,display_name.ilike.%${pattern}%`, { referencedTable: 'players' });
    }
    return request;
  };
  const countResult = await filter(client.from('player_game_accounts')
    .select('id, players!inner(id)', { count: 'exact', head: true }));
  if (countResult.error) return { accounts: [], count: 0, page: 1, pages: 1, query, error: countResult.error };

  const count = countResult.count ?? 0;
  const pages = Math.max(1, Math.ceil(count / GAME_ACCOUNTS_PAGE_SIZE));
  const requestedPage = Number(page);
  const currentPage = Math.min(pages, Math.max(1, Number.isSafeInteger(requestedPage) ? requestedPage : 1));
  if (!count) return { accounts: [], count, page: currentPage, pages, query, error: null };

  const start = (currentPage - 1) * GAME_ACCOUNTS_PAGE_SIZE;
  const result = await filter(client.from('player_game_accounts')
    .select('id, player_id, platform, display_name, link_status, linked_at, last_verified_at, players!inner(id, public_id, display_name, status)'))
    .order('created_at', { ascending: false }).order('id')
    .range(start, start + GAME_ACCOUNTS_PAGE_SIZE - 1);
  return { accounts: result.data ?? [], count, page: currentPage, pages, query, error: result.error };
}
