import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authRequired, requireRoles } from '../middleware/auth.js';
import { buildStandings } from '../lib/scoring.js';

const router = Router();

function withCounts(olympiad) {
  return {
    ...olympiad,
    tasksCount: olympiad._count?.tasks ?? olympiad.tasks?.length ?? 0,
    participantsCount: olympiad._count?.registrations ?? olympiad.registrations?.length ?? 0,
    _count: undefined,
  };
}

/** Эталон и ответы скрытых тестов — только у автора; sample expected виден участнику. */
function sanitizeOlympiadForUser(olympiad, user) {
  if (!olympiad?.tasks) return olympiad;
  const isStaff = user?.role === 'ADMIN' || user?.role === 'DEVELOPER';
  if (isStaff) return olympiad;
  return {
    ...olympiad,
    tasks: olympiad.tasks.map((task) => ({
      ...task,
      referenceCode: undefined,
      testCases: (task.testCases || []).map((tc) => ({
        id: tc.id,
        taskId: tc.taskId,
        input: tc.input,
        isSample: tc.isSample,
        expectedOutput: tc.isSample ? tc.expectedOutput : '',
      })),
    })),
  };
}

router.get('/', authRequired, async (req, res) => {
  try {
    const { status, mine } = req.query;
    const where = {};

    if (status) where.status = String(status);
    if (mine === '1' && req.user.role === 'DEVELOPER') {
      where.createdById = req.user.id;
    } else if (req.user.role === 'PARTICIPANT') {
      where.status = { in: ['OPEN', 'LIVE', 'CLOSED', 'PUBLISHED'] };
    }

    const [olympiads, myRegs] = await Promise.all([
      prisma.olympiad.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { tasks: true, registrations: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.registration.findMany({
        where: { userId: req.user.id },
        select: { olympiadId: true, status: true },
      }),
    ]);

    const regMap = Object.fromEntries(myRegs.map((r) => [r.olympiadId, r]));

    return res.json({
      olympiads: olympiads.map((o) => ({
        ...withCounts(o),
        registered: Boolean(regMap[o.id]),
        registrationStatus: regMap[o.id]?.status || null,
      })),
    });
  } catch (error) {
    console.error('List olympiads error:', error);
    return res.status(500).json({ error: 'Не удалось загрузить олимпиады' });
  }
});

router.get('/:id', authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const olympiad = await prisma.olympiad.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        tasks: {
          include: { testCases: { orderBy: { id: 'asc' } } },
          orderBy: { order: 'asc' },
        },
        registrations: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { tasks: true, registrations: true } },
      },
    });

    if (!olympiad) {
      return res.status(404).json({ error: 'Олимпиада не найдена' });
    }

    const registration = olympiad.registrations.find((r) => r.userId === req.user.id) || null;
    const safe = sanitizeOlympiadForUser(withCounts(olympiad), req.user);
    return res.json({ olympiad: safe, registration });
  } catch (error) {
    console.error('Get olympiad error:', error);
    return res.status(500).json({ error: 'Не удалось загрузить олимпиаду' });
  }
});

router.post('/', authRequired, requireRoles('DEVELOPER', 'ADMIN'), async (req, res) => {
  try {
    const { title, description, startsAt, endsAt } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Название обязательно' });
    }

    const olympiad = await prisma.olympiad.create({
      data: {
        title: title.trim(),
        description: description || null,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        createdById: req.user.id,
        status: 'DRAFT',
      },
      include: { _count: { select: { tasks: true, registrations: true } } },
    });

    return res.status(201).json({ olympiad: withCounts(olympiad) });
  } catch (error) {
    console.error('Create olympiad error:', error);
    return res.status(500).json({ error: 'Не удалось создать олимпиаду' });
  }
});

router.patch('/:id', authRequired, requireRoles('DEVELOPER', 'ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.olympiad.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Олимпиада не найдена' });
    if (req.user.role !== 'ADMIN' && existing.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const { title, description, startsAt, endsAt, status, penaltyPercent } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (startsAt !== undefined) data.startsAt = startsAt ? new Date(startsAt) : null;
    if (endsAt !== undefined) data.endsAt = endsAt ? new Date(endsAt) : null;
    if (status !== undefined) data.status = status;
    if (penaltyPercent !== undefined) {
      const pct = Math.max(0, Math.min(100, Math.round(Number(penaltyPercent) || 0)));
      data.penaltyPercent = pct;
    }

    const olympiad = await prisma.olympiad.update({
      where: { id },
      data,
      include: {
        tasks: { include: { testCases: true }, orderBy: { order: 'asc' } },
        _count: { select: { tasks: true, registrations: true } },
      },
    });

    return res.json({ olympiad: withCounts(olympiad) });
  } catch (error) {
    console.error('Update olympiad error:', error);
    return res.status(500).json({ error: 'Не удалось обновить олимпиаду' });
  }
});

router.post('/:id/register', authRequired, requireRoles('PARTICIPANT', 'ADMIN'), async (req, res) => {
  try {
    const olympiadId = Number(req.params.id);
    const olympiad = await prisma.olympiad.findUnique({ where: { id: olympiadId } });
    if (!olympiad) return res.status(404).json({ error: 'Олимпиада не найдена' });
    if (!['OPEN', 'LIVE'].includes(olympiad.status)) {
      return res.status(400).json({ error: 'Регистрация закрыта' });
    }

    const registration = await prisma.registration.upsert({
      where: {
        userId_olympiadId: { userId: req.user.id, olympiadId },
      },
      update: {},
      create: { userId: req.user.id, olympiadId, status: 'REGISTERED' },
    });

    return res.json({ registration });
  } catch (error) {
    console.error('Register olympiad error:', error);
    return res.status(500).json({ error: 'Не удалось записаться' });
  }
});

router.post('/:id/join', authRequired, requireRoles('PARTICIPANT', 'ADMIN'), async (req, res) => {
  try {
    const olympiadId = Number(req.params.id);
    const olympiad = await prisma.olympiad.findUnique({ where: { id: olympiadId } });
    if (!olympiad) return res.status(404).json({ error: 'Олимпиада не найдена' });
    if (olympiad.status !== 'LIVE') {
      return res.status(400).json({ error: 'Олимпиада ещё не началась' });
    }

    const existing = await prisma.registration.findUnique({
      where: { userId_olympiadId: { userId: req.user.id, olympiadId } },
    });
    if (existing?.status === 'COMPLETED') {
      return res.status(403).json({
        error: 'Вы уже завершили участие — решение задач недоступно',
      });
    }

    const registration = await prisma.registration.upsert({
      where: {
        userId_olympiadId: { userId: req.user.id, olympiadId },
      },
      update: { status: 'JOINED' },
      create: { userId: req.user.id, olympiadId, status: 'JOINED' },
    });

    return res.json({ registration });
  } catch (error) {
    console.error('Join olympiad error:', error);
    return res.status(500).json({ error: 'Не удалось войти в олимпиаду' });
  }
});

router.post('/:id/complete', authRequired, requireRoles('PARTICIPANT', 'ADMIN'), async (req, res) => {
  try {
    const olympiadId = Number(req.params.id);
    const olympiad = await prisma.olympiad.findUnique({ where: { id: olympiadId } });
    if (!olympiad) return res.status(404).json({ error: 'Олимпиада не найдена' });
    if (!['LIVE', 'CLOSED'].includes(olympiad.status)) {
      return res.status(400).json({ error: 'Завершить участие можно только во время олимпиады' });
    }

    const existing = await prisma.registration.findUnique({
      where: { userId_olympiadId: { userId: req.user.id, olympiadId } },
    });
    if (!existing && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Сначала зарегистрируйтесь на олимпиаду' });
    }
    if (existing?.status === 'COMPLETED') {
      return res.json({ registration: existing, alreadyCompleted: true });
    }

    const registration = await prisma.registration.upsert({
      where: { userId_olympiadId: { userId: req.user.id, olympiadId } },
      update: { status: 'COMPLETED' },
      create: { userId: req.user.id, olympiadId, status: 'COMPLETED' },
    });

    return res.json({ registration });
  } catch (error) {
    console.error('Complete participation error:', error);
    return res.status(500).json({ error: 'Не удалось завершить участие' });
  }
});

router.get('/:id/results', authRequired, async (req, res) => {
  try {
    const olympiadId = Number(req.params.id);
    const olympiad = await prisma.olympiad.findUnique({ where: { id: olympiadId } });
    if (!olympiad) return res.status(404).json({ error: 'Олимпиада не найдена' });

    const isStaff =
      req.user.role === 'ADMIN' ||
      req.user.role === 'DEVELOPER';
    // Участникам результаты доступны только после завершения / публикации
    if (!isStaff && !['CLOSED', 'PUBLISHED'].includes(olympiad.status)) {
      return res.status(403).json({
        error: 'Результаты ещё недоступны — олимпиада не завершена',
      });
    }

    const tasks = await prisma.task.findMany({
      where: { olympiadId },
      orderBy: { order: 'asc' },
    });

    const registrations = await prisma.registration.findMany({
      where: { olympiadId },
      include: {
        user: { select: { id: true, name: true, lastName: true, email: true } },
      },
    });

    const submissions = await prisma.submission.findMany({
      where: { taskId: { in: tasks.map((t) => t.id) } },
      orderBy: { createdAt: 'asc' },
    });

    const contestStart = olympiad.startsAt || olympiad.createdAt;
    const rows = buildStandings(
      registrations,
      submissions,
      tasks,
      olympiad.penaltyPercent,
      contestStart
    );

    const certificates = await prisma.certificate.findMany({
      where: { olympiadId },
      include: {
        user: { select: { id: true, name: true, lastName: true, email: true } },
      },
    });

    const maxScore = tasks.reduce((sum, t) => sum + (t.points || 0), 0);

    return res.json({
      tasks,
      rows,
      certificates,
      maxScore,
      participantsCount: rows.length,
      penaltyPercent: olympiad.penaltyPercent ?? 5,
      startsAt: contestStart,
    });
  } catch (error) {
    console.error('Results error:', error);
    return res.status(500).json({ error: 'Не удалось загрузить результаты' });
  }
});

router.post('/:id/certificate', authRequired, async (req, res) => {
  try {
    const olympiadId = Number(req.params.id);
    const olympiad = await prisma.olympiad.findUnique({ where: { id: olympiadId } });
    if (!olympiad) return res.status(404).json({ error: 'Олимпиада не найдена' });
    if (olympiad.status !== 'PUBLISHED') {
      return res.status(403).json({
        error: 'Сертификат и места доступны только после публикации результатов',
      });
    }

    const tasks = await prisma.task.findMany({
      where: { olympiadId },
      orderBy: { order: 'asc' },
    });
    const registrations = await prisma.registration.findMany({
      where: { olympiadId },
      include: {
        user: { select: { id: true, name: true, lastName: true, email: true } },
      },
    });
    const submissions = await prisma.submission.findMany({
      where: { taskId: { in: tasks.map((t) => t.id) } },
      orderBy: { createdAt: 'asc' },
    });

    const rows = buildStandings(
      registrations,
      submissions,
      tasks,
      olympiad.penaltyPercent,
      olympiad.startsAt || olympiad.createdAt
    );
    const mine = rows.find((r) => r.user.id === req.user.id);
    if (!mine) {
      return res.status(403).json({ error: 'Вы не участвовали в этой олимпиаде' });
    }

    const maxScore = tasks.reduce((sum, t) => sum + (t.points || 0), 0);

    const certificate = await prisma.certificate.upsert({
      where: {
        userId_olympiadId: { userId: req.user.id, olympiadId },
      },
      update: { score: mine.total },
      create: { userId: req.user.id, olympiadId, score: mine.total },
      include: {
        user: { select: { id: true, name: true, lastName: true, email: true } },
        olympiad: { select: { id: true, title: true, status: true } },
      },
    });

    return res.json({
      certificate,
      rank: mine.rank,
      maxScore,
      participantsCount: rows.length,
      code: `OLIMP-${olympiadId}-${req.user.id}-${certificate.id}`,
    });
  } catch (error) {
    console.error('Certificate error:', error);
    return res.status(500).json({ error: 'Не удалось сформировать сертификат' });
  }
});

router.post(
  '/:id/publish',
  authRequired,
  requireRoles('DEVELOPER', 'ADMIN'),
  async (req, res) => {
    try {
      const olympiadId = Number(req.params.id);
      const olympiad = await prisma.olympiad.findUnique({ where: { id: olympiadId } });
      if (!olympiad) return res.status(404).json({ error: 'Олимпиада не найдена' });
      if (req.user.role !== 'ADMIN' && olympiad.createdById !== req.user.id) {
        return res.status(403).json({ error: 'Недостаточно прав' });
      }
      if (!['LIVE', 'CLOSED'].includes(olympiad.status)) {
        return res.status(400).json({
          error:
            olympiad.status === 'PUBLISHED'
              ? 'Результаты уже опубликованы'
              : 'Публикация возможна после старта олимпиады',
        });
      }

      const tasks = await prisma.task.findMany({
        where: { olympiadId },
        orderBy: { order: 'asc' },
      });
      const registrations = await prisma.registration.findMany({
        where: { olympiadId },
        include: {
          user: { select: { id: true, name: true, lastName: true, email: true } },
        },
      });
      const submissions = await prisma.submission.findMany({
        where: { taskId: { in: tasks.map((t) => t.id) } },
        orderBy: { createdAt: 'asc' },
      });

      const rows = buildStandings(
        registrations,
        submissions,
        tasks,
        olympiad.penaltyPercent,
        olympiad.startsAt || olympiad.createdAt
      );

      for (const row of rows) {
        await prisma.certificate.upsert({
          where: {
            userId_olympiadId: { userId: row.user.id, olympiadId },
          },
          update: { score: row.total },
          create: { userId: row.user.id, olympiadId, score: row.total },
        });
      }

      const updated = await prisma.olympiad.update({
        where: { id: olympiadId },
        data: { status: 'PUBLISHED' },
      });

      return res.json({ olympiad: updated });
    } catch (error) {
      console.error('Publish error:', error);
      return res.status(500).json({ error: 'Не удалось опубликовать результаты' });
    }
  }
);

export default router;
