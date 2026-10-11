import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authRequired, requireRoles } from '../middleware/auth.js';

const router = Router();

router.use(authRequired, requireRoles('ADMIN'));

router.get('/dashboard', async (_req, res) => {
  try {
    const [users, olympiads, submissions, registrations] = await Promise.all([
      prisma.user.count(),
      prisma.olympiad.count(),
      prisma.submission.count(),
      prisma.registration.count(),
    ]);

    const byRole = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    });

    const byStatus = await prisma.olympiad.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return res.json({
      kpis: { users, olympiads, submissions, registrations },
      byRole,
      byStatus,
      recentUsers,
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return res.status(500).json({ error: 'Не удалось загрузить дашборд' });
  }
});

router.get('/users', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    return res.json({ users });
  } catch (error) {
    console.error('Admin users error:', error);
    return res.status(500).json({ error: 'Не удалось загрузить пользователей' });
  }
});

router.patch('/users/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { role, status, name } = req.body;
    const data = {};
    if (role !== undefined) data.role = role;
    if (status !== undefined) data.status = status;
    if (name !== undefined) data.name = name;

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return res.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ error: 'Не удалось обновить пользователя' });
  }
});

router.get('/results', async (_req, res) => {
  try {
    const certificates = await prisma.certificate.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        olympiad: { select: { id: true, title: true, status: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });
    return res.json({ certificates });
  } catch (error) {
    console.error('Admin results error:', error);
    return res.status(500).json({ error: 'Не удалось загрузить результаты' });
  }
});

export default router;
