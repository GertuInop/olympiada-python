import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authRequired, requireRoles } from '../middleware/auth.js';
import { penaltyStep, resolvePenaltyPercent, scoreForTask } from '../lib/scoring.js';

const router = Router();

function normalize(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .trimEnd();
}

router.post('/', authRequired, requireRoles('PARTICIPANT', 'ADMIN'), async (req, res) => {
  try {
    const { taskId, code, runs } = req.body;
    if (!taskId || code === undefined) {
      return res.status(400).json({ error: 'taskId и code обязательны' });
    }
    if (!Array.isArray(runs)) {
      return res.status(400).json({
        error: 'Нужен массив runs[] с stdout по каждому тесту (результат Pyodide)',
      });
    }

    const task = await prisma.task.findUnique({
      where: { id: Number(taskId) },
      include: {
        testCases: { orderBy: { id: 'asc' } },
        olympiad: true,
      },
    });

    if (!task) return res.status(404).json({ error: 'Задание не найдено' });
    if (task.olympiad.status !== 'LIVE' && req.user.role !== 'ADMIN') {
      return res.status(400).json({ error: 'Приём решений закрыт' });
    }

    const registration = await prisma.registration.findUnique({
      where: {
        userId_olympiadId: {
          userId: req.user.id,
          olympiadId: task.olympiadId,
        },
      },
    });

    if (!registration && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Сначала зарегистрируйтесь на олимпиаду' });
    }
    if (registration?.status === 'COMPLETED') {
      return res.status(403).json({
        error: 'Участие завершено — отправка решений закрыта',
      });
    }

    if (!String(code).trim()) {
      return res.status(400).json({ error: 'Пустой код' });
    }

    const testCases = task.testCases;
    if (testCases.length === 0) {
      return res.status(400).json({ error: 'У задания нет автотестов' });
    }
    if (runs.length !== testCases.length) {
      return res.status(400).json({
        error: `Ожидалось ${testCases.length} прогонов, получено ${runs.length}`,
      });
    }

    const details = testCases.map((tc, i) => {
      const run = runs[i] || {};
      const runtimeOk = run.ok !== false && !run.stderr;
      const actual = normalize(run.stdout);
      const expected = normalize(tc.expectedOutput);
      const passed = runtimeOk && actual === expected;
      return {
        index: i + 1,
        isSample: Boolean(tc.isSample),
        passed,
        // В ответе участнику expected скрытых тестов не показываем
        expected: tc.isSample ? expected : undefined,
        actual: tc.isSample || !passed ? actual : undefined,
        error: run.stderr || null,
      };
    });

    const allPassed = details.every((d) => d.passed);
    const status = allPassed ? 'ACCEPTED' : 'WRONG';

    const output = details
      .map((d) => {
        if (d.error) return `Тест #${d.index}: ERROR\n${d.error}`;
        if (d.passed) return `Тест #${d.index}: OK`;
        if (d.isSample) {
          return (
            `Тест #${d.index}: FAIL\n` +
            `expected:\n${d.expected}\n` +
            `got:\n${d.actual || '(пусто)'}`
          );
        }
        return `Тест #${d.index}: FAIL (скрытый тест)`;
      })
      .join('\n\n');

    const prior = await prisma.submission.findMany({
      where: { userId: req.user.id, taskId: task.id },
      orderBy: { createdAt: 'asc' },
    });

    const pct = resolvePenaltyPercent(task.olympiad.penaltyPercent);
    const draftSubs = [
      ...prior,
      { taskId: task.id, status, createdAt: new Date() },
    ];
    const after = scoreForTask(
      draftSubs,
      task,
      pct,
      task.olympiad.startsAt || task.olympiad.createdAt
    );
    const step = penaltyStep(task.points, pct);

    const submission = await prisma.submission.create({
      data: {
        userId: req.user.id,
        taskId: task.id,
        code,
        status,
        // Всегда пересчитанный вклад задачи (с штрафами), не «сырые» 100
        score: after.score,
        output,
      },
    });

    return res.status(201).json({
      submission,
      details,
      taskScore: after,
      penaltyPercent: pct,
      penaltyStep: step,
      message: allPassed
        ? after.wrongs > 0
          ? `Принято. Штраф −${after.penaltyTaken} (${after.wrongs}×${step}). За задачу: ${after.score}`
          : `Принято. ${after.score} баллов`
        : `Неверно (попытка #${after.wrongs}). За каждую ошибку при AC снимут ${step} б. (${pct}% от ${task.points})`,
    });
  } catch (error) {
    console.error('Submit error:', error);
    return res.status(500).json({ error: 'Не удалось отправить решение' });
  }
});

router.post('/run', authRequired, requireRoles('PARTICIPANT', 'ADMIN'), async (req, res) => {
  try {
    const { taskId } = req.body;
    if (!taskId) {
      return res.status(400).json({ error: 'taskId обязателен' });
    }

    const task = await prisma.task.findUnique({
      where: { id: Number(taskId) },
      include: { testCases: true },
    });

    if (!task) return res.status(404).json({ error: 'Задание не найдено' });

    const samples = task.testCases.filter((tc) => tc.isSample);
    const cases = samples.length ? samples : [];

    return res.json({
      mode: 'dry-run',
      message: 'Локальный прогон sample-тестов на клиенте',
      samples: cases.map((tc, index) => ({
        index: index + 1,
        input: tc.input,
        expected: tc.expectedOutput,
        isSample: true,
      })),
    });
  } catch (error) {
    console.error('Run error:', error);
    return res.status(500).json({ error: 'Не удалось выполнить проверку' });
  }
});

router.get('/mine', authRequired, async (req, res) => {
  try {
    const { olympiadId } = req.query;
    const tasks = olympiadId
      ? await prisma.task.findMany({
          where: { olympiadId: Number(olympiadId) },
          select: { id: true },
        })
      : null;

    const submissions = await prisma.submission.findMany({
      where: {
        userId: req.user.id,
        ...(tasks ? { taskId: { in: tasks.map((t) => t.id) } } : {}),
      },
      include: {
        task: { select: { id: true, title: true, olympiadId: true, points: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ submissions });
  } catch (error) {
    console.error('My submissions error:', error);
    return res.status(500).json({ error: 'Не удалось загрузить посылки' });
  }
});

export default router;
