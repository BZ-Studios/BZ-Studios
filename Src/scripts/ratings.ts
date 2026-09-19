import { getSupabaseBrowserClient } from '../lib/supabase-browser';

document.querySelectorAll<HTMLElement>('[data-game-rating]').forEach((root) => {
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-rating-score]'));
  const feedback = root.querySelector<HTMLElement>('[data-rating-feedback]');
  const voteText = root.querySelector<HTMLElement>('.rating-vote > p');
  const gate = root.querySelector<HTMLElement>('[data-rating-gate]');
  const setBusy = (busy: boolean) => buttons.forEach((button) => { button.disabled = busy; });
  const paint = (score?: number) => buttons.forEach((button) => {
    const value = Number(button.dataset.ratingScore);
    button.classList.toggle('is-selected', Boolean(score && value <= score));
    button.setAttribute('aria-pressed', String(score === value));
  });
  const applyResult = (result: { average: number; count: number; userScore?: number | null }) => {
    const summary = root.querySelector<HTMLElement>('.rating-summary');
    const fill = summary?.querySelector<HTMLElement>('i');
    if (fill) fill.style.width = `${result.average ? result.average / 5 * 100 : 0}%`;
    if (summary) {
      const strong = summary.querySelector('strong');
      const plain = summary.querySelector(':scope > span:not(.rating-stars)');
      const small = summary.querySelector('small');
      if (result.count > 0) {
        if (strong) strong.textContent = result.average.toFixed(1).replace('.', ',');
        else if (plain) plain.textContent = result.average.toFixed(1).replace('.', ',');
        if (small) small.textContent = `${result.count} ${result.count === 1 ? 'calificación' : 'calificaciones'}`;
      } else {
        if (strong) strong.textContent = 'Sin calificaciones';
        if (small) small.textContent = '';
      }
    }
    paint(result.userScore ?? undefined);
    if (voteText) voteText.textContent = result.userScore ? `Tu calificación: ${result.userScore} de 5` : 'Seleccioná una puntuación';
  };
  const mutate = async (score?: number) => {
    if (root.dataset.authenticated !== 'true') { if (gate) gate.hidden = false; return; }
    if (root.dataset.verified !== 'true') return;
    setBusy(true); if (feedback) feedback.textContent = 'Guardando…';
    try {
      const client = getSupabaseBrowserClient();
      const method = score ? 'set_game_rating' : 'delete_game_rating';
      const args = score ? { p_game_id: root.dataset.gameRating, p_score: score } : { p_game_id: root.dataset.gameRating };
      const { data, error } = await client.rpc(method, args);
      if (error) throw error;
      applyResult(data as { average: number; count: number; userScore?: number | null });
      if (feedback) feedback.textContent = score ? 'Calificación guardada.' : 'Calificación eliminada.';
      if (score && !root.querySelector('[data-rating-delete]')) location.reload();
    } catch (error) { if (feedback) feedback.textContent = error instanceof Error && error.message.includes('RATE_LIMITED') ? 'Esperá unos segundos e intentá nuevamente.' : 'No pudimos guardar la calificación.'; }
    finally { setBusy(false); }
  };
  buttons.forEach((button) => button.addEventListener('click', () => mutate(Number(button.dataset.ratingScore))));
  root.querySelector('[data-rating-delete]')?.addEventListener('click', () => mutate());
});
