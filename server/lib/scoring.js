/** Если % не задан — 5; явный 0 допустим. */
export function resolvePenaltyPercent(penaltyPercent) {
  if (penaltyPercent === null || penaltyPercent === undefined || penaltyPercent === '') {
    return 5;
  }
  const n = Number(penaltyPercent);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 5;
}

/** Шаг штрафа за одну неверную посылку (округление вверх). */
export function penaltyStep(points, penaltyPercent) {
  const pct = resolvePenaltyPercent(penaltyPercent);
  const pts = Number(points) || 0;
  if (pct <= 0 || pts <= 0) return 0;
  return Math.ceil((pts * pct) / 100);
}

function sameTask(submission, task) {
  return Number(submission.taskId) === Number(task.id);
}

/**
 * Баллы участника за одну задачу:
 * - есть ACCEPTED → points − wrongs_до_AC × ceil(points × % / 100), не ниже 0
 * - нет ACCEPTED → 0
 */
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
  const score = Math.max(0, task.points - penaltyTaken);
  let solveMs = null;
  if (contestStart) {
    solveMs = Math.max(0, new Date(accepted.createdAt) - new Date(contestStart));
  } else {
    solveMs = null;
  }

  return {
    score,
    status: 'ACCEPTED',
    wrongs,
    penaltyTaken,
    penaltyStep: step,
    acceptedAt: accepted.createdAt,
    solveMs,
  };
}

/** Итог по всем задачам для одного участника. */
export function scoreUser(submissions, tasks, penaltyPercent, contestStart = null) {
  const byTask = {};
  let total = 0;
  let solved = 0;
  let timeSum = 0;
  const acceptAt = {};

  for (const task of tasks) {
    const cell = scoreForTask(submissions, task, penaltyPercent, contestStart);
    byTask[task.id] = cell;
    total += cell.score;
    if (cell.status === 'ACCEPTED') {
      solved += 1;
      const t = new Date(cell.acceptedAt).getTime();
      acceptAt[task.id] = t;
      timeSum += cell.solveMs != null ? cell.solveMs : Number.isFinite(t) ? t : 0;
    }
  }

  return { byTask, total, solved, timeSum, acceptAt };
}

/**
 * Сравнение мест: больше баллов выше;
 * при равенстве — кто быстрее решил больше задач;
 * затем меньшая сумма времён AC.
 */
export function compareStandings(a, b, tasks) {
  if (b.total !== a.total) return b.total - a.total;

  let aWins = 0;
  let bWins = 0;
  for (const task of tasks) {
    const ta = a.acceptAt?.[task.id];
    const tb = b.acceptAt?.[task.id];
    if (ta == null && tb == null) continue;
    if (ta != null && tb == null) aWins += 1;
    else if (tb != null && ta == null) bWins += 1;
    else if (ta < tb) aWins += 1;
    else if (tb < ta) bWins += 1;
  }
  if (aWins !== bWins) return bWins - aWins;
  return (a.timeSum || 0) - (b.timeSum || 0);
}

export function buildStandings(
  registrations,
  submissions,
  tasks,
  penaltyPercent,
  contestStart = null
) {
  const pct = resolvePenaltyPercent(penaltyPercent);
  const rows = registrations.map((reg) => {
    const userSubs = submissions.filter((s) => Number(s.userId) === Number(reg.userId));
    const scored = scoreUser(userSubs, tasks, pct, contestStart);
    return {
      user: reg.user,
      registrationStatus: reg.status,
      byTask: Object.fromEntries(
        Object.entries(scored.byTask).map(([taskId, cell]) => [
          taskId,
          {
            score: cell.score,
            status: cell.status,
            wrongs: cell.wrongs,
            penaltyTaken: cell.penaltyTaken,
            penaltyStep: cell.penaltyStep,
            acceptedAt: cell.acceptedAt,
            solveMs: cell.solveMs,
          },
        ])
      ),
      total: scored.total,
      solved: scored.solved,
      partial: 0,
      timeSum: scored.timeSum,
      acceptAt: scored.acceptAt,
      penaltyPercent: pct,
    };
  });

  rows.sort((a, b) => compareStandings(a, b, tasks));
  rows.forEach((row, index) => {
    row.rank = index + 1;
  });
  return rows;
}
