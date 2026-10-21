import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadGameAccounts } from '../Src/lib/admin-game-accounts.mjs';

function database({ count = 41, countError = null, rowsError = null } = {}) {
  const requests = [];
  const client = {
    from(table) {
      const calls = [['from', table]];
      requests.push(calls);
      let head = false;
      const builder = {
        select(columns, options) { calls.push(['select', columns, options]); head = options?.head; return this; },
        eq(...args) { calls.push(['eq', ...args]); return this; },
        neq(...args) { calls.push(['neq', ...args]); return this; },
        or(...args) { calls.push(['or', ...args]); return this; },
        order(...args) { calls.push(['order', ...args]); return this; },
        range(...args) { calls.push(['range', ...args]); return this; },
        then(resolve, reject) {
          return Promise.resolve(head ? { count, error: countError } : { data: [{ id: 'link' }], error: rowsError }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  return { client, requests };
}

test('count and page are scoped to one game and exclude unlinked accounts', async () => {
  const { client, requests } = database();
  const result = await loadGameAccounts(client, { gameId: 'selected-game', page: 2, search: 'Luis_01' });
  assert.equal(result.count, 41);
  assert.equal(result.pages, 3);
  for (const calls of requests) {
    assert.deepEqual(calls.find(([method]) => method === 'eq'), ['eq', 'game_id', 'selected-game']);
    assert.deepEqual(calls.find(([method]) => method === 'neq'), ['neq', 'link_status', 'unlinked']);
    assert.deepEqual(calls.find(([method]) => method === 'or'), ['or', 'public_id.ilike.%Luis\\_01%,display_name.ilike.%Luis\\_01%', { referencedTable: 'players' }]);
  }
  assert.deepEqual(requests[1].find(([method]) => method === 'range'), ['range', 20, 39]);
  assert.deepEqual(requests[1].filter(([method]) => method === 'order').map((call) => call[1]), ['created_at', 'id']);
});

test('out-of-range or invalid pages cannot create unbounded offsets', async () => {
  for (const [requested, expected, offset] of [[9999, 3, 40], [-1, 1, 0], ['abc', 1, 0], [Infinity, 1, 0], [1.5, 1, 0]]) {
    const { client, requests } = database();
    const result = await loadGameAccounts(client, { gameId: 'game', page: requested });
    assert.equal(result.page, expected);
    assert.equal(requests[1].find(([method]) => method === 'range')[1], offset);
  }
});

test('empty results do not fetch every player or confuse an error with an empty game', async () => {
  for (const countError of [null, { message: 'database unavailable' }]) {
    const { client, requests } = database({ count: 0, countError });
    const result = await loadGameAccounts(client, { gameId: 'game' });
    assert.equal(requests.length, 1);
    assert.deepEqual(result.accounts, []);
    assert.equal(result.error, countError);
  }
  const error = { message: 'rows unavailable' };
  assert.equal((await loadGameAccounts(database({ rowsError: error }).client, { gameId: 'game' })).error, error);
});

test('search text cannot add PostgREST filter operators', async () => {
  const { client, requests } = database();
  await loadGameAccounts(client, { gameId: 'game', search: 'Luis%,id.eq.other)"\\' });
  for (const calls of requests) {
    assert.equal(calls.find(([method]) => method === 'or')[1], 'public_id.ilike.%Luisideqother%,display_name.ilike.%Luisideqother%');
  }
});
