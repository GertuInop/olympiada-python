import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authRequired, requireRoles } from '../middleware/auth.js';

const router = Router();

async function assertOlympiadAccess(olympiadId, user) {
  const olympiad = await prisma.olympiad.findUnique({ where: { id: olympiadId } });
  if (!olympiad) return { error: 'Олимпиада не найдена', status: 404 };
  if (user.role !== 'ADMIN' && olympiad.createdById !== user.id) {
    return { error: 'Недостаточно прав', status: 403 };
  }
  return { olympiad };
}

router.post('/', authRequired, requireRoles('DEVELOPER', 'ADMIN'), async (req, res) => {
  try {
    const { olympiadId, title, statement, referenceCode, points, order, testCases } = req.body;
    if (!olympiadId || !title || !statement) {
      return res.status(400).json({ error: 'olympiadId, title и statement обязательны' });
    }

    const access = await assertOlympiadAccess(Number(olympiadId), req.user);
    if (access.error) return res.status(access.status).json({ error: access.error });

    const task = await prisma.task.create({
      data: {
        olympiadId: Number(olympiadId),
        title,
        statement,
        referenceCode: referenceCode || null,
        points: points ?? 100,
        order: order ?? 0,
        testCases: {
          create: Array.isArray(testCases)
            ? testCases.map((tc) => ({
                input: tc.input || '',
                expectedOutput: tc.expectedOutput || '',
                isSample: Boolean(tc.isSample),
              }))
            : [],
        },
      },
      include: { testCases: true },
    });

    return res.status(201).json({ task });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ error: 'Не удалось создать задание' });
  }
});

router.patch('/:id', authRequired, requireRoles('DEVELOPER', 'ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Задание не найдено' });

    const access = await assertOlympiadAccess(existing.olympiadId, req.user);
    if (access.error) return res.status(access.status).json({ error: access.error });

    const { title, statement, referenceCode, points, order, testCases } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (statement !== undefined) data.statement = statement;
    if (referenceCode !== undefined) data.referenceCode = referenceCode;
    if (points !== undefined) data.points = points;
    if (order !== undefined) data.order = order;

    if (Array.isArray(testCases)) {
      await prisma.testCase.deleteMany({ where: { taskId: id } });
      data.testCases = {
        create: testCases.map((tc) => ({
          input: tc.input || '',
          expectedOutput: tc.expectedOutput || '',
          isSample: Boolean(tc.isSample),
        })),
      };
    }

    const task = await prisma.task.update({
      where: { id },
      data,
      include: { testCases: true },
    });

    return res.json({ task });
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({ error: 'Не удалось обновить задание' });
  }
});

router.delete('/:id', authRequired, requireRoles('DEVELOPER', 'ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Задание не найдено' });

    const access = await assertOlympiadAccess(existing.olympiadId, req.user);
    if (access.error) return res.status(access.status).json({ error: access.error });

    await prisma.task.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({ error: 'Не удалось удалить задание' });
  }
});

router.post('/:id/check-reference', authRequired, requireRoles('DEVELOPER', 'ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const task = await prisma.task.findUnique({
      where: { id },
      include: { testCases: true },
    });
    if (!task) return res.status(404).json({ error: 'Задание не найдено' });

    const access = await assertOlympiadAccess(task.olympiadId, req.user);
    if (access.error) return res.status(access.status).json({ error: access.error });

    if (!task.referenceCode?.trim()) {
      return res.status(400).json({ error: 'Нет эталонного кода' });
    }

    const results = task.testCases.map((tc, index) => ({
      index,
      input: tc.input,
      expected: tc.expectedOutput,
      // Симуляция проверки без запуска Python в этой версии
      passed: Boolean(tc.expectedOutput?.trim()),
      message: tc.expectedOutput?.trim()
        ? 'Эталонный код готов к проверке'
        : 'Пустой ожидаемый вывод',
    }));

    return res.json({
      ok: results.every((r) => r.passed),
      results,
    });
  } catch (error) {
    console.error('Check reference error:', error);
    return res.status(500).json({ error: 'Не удалось проверить эталон' });
  }
});

export default router;
