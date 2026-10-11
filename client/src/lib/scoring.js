export function resolvePenaltyPercent(penaltyPercent) {
  if (penaltyPercent === null || penaltyPercent === undefined || penaltyPercent === '') {
    return 5;
  }
  const n = Number(penaltyPercent);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 5;
}

export function penaltyStep(points, penaltyPercent) {
  const pct = resolvePenaltyPercent(penaltyPercent);
  const pts = Number(points) || 0;
  if (pct <= 0 || pts <= 0) return 0;
  return Math.ceil((pts * pct) / 100);
}

function sameTask(submission, task) {
  return Number(submission.taskId) === Number(task.id);
}

export function scoreForTask(submissions, task, penaltyPercent, contestStart = null) {
  const list = (submissions || [])
    .filter((s) => sameTask(s, task))
    .slice()
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  let wrongs = 0;
  let accepted = null;
  for (const s of list) {
    if (s.status === 'ACCEPTED') {
      accepted = s;
      break;
    }
    if (s.status === 'WRONG' || s.status === 'ERROR') wrongs += 1;
  }

  const step = penaltyStep(task.points, penaltyPercent);

  if (!accepted) {
    return {
      score: 0,
      status: wrongs > 0 ? 'WRONG' : 'NONE',
      wrongs,
      penaltyTaken: 0,
      penaltyStep: step,
      acceptedAt: null,
      solveMs: null,
    };
  }

  const penaltyTaken = wrongs * step;
  let solveMs = null;
  if (contestStart) {
    solveMs = Math.max(0, new Date(accepted.createdAt) - new Date(contestStart));
  }

  return {
    score: Math.max(0, task.points - penaltyTaken),
    status: 'ACCEPTED',
    wrongs,
    penaltyTaken,
    penaltyStep: step,
    acceptedAt: accepted.createdAt,
    solveMs,
  };
}

export function scoreSummary(submissions, tasks, penaltyPercent, contestStart = null) {
  const pct = resolvePenaltyPercent(penaltyPercent);
  let earned = 0;
  let max = 0;
  const byTask = {};
  for (const task of tasks || []) {
    max += task.points || 0;
    const cell = scoreForTask(submissions, task, pct, contestStart);
    byTask[task.id] = cell;
    earned += cell.score;
  }
  return { earned, max, byTask, penaltyPercent: pct };
}

/** мс → 01:23:45 или 12:34 */
export function formatSolveDuration(ms) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}
