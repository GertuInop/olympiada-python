import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma.js';
import { authRequired, signToken } from '../middleware/auth.js';

const router = Router();
const SALT_ROUNDS = 10;
const ROLES = ['PARTICIPANT', 'DEVELOPER', 'ADMIN'];

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    lastName: user.lastName,
    phone: user.phone,
    organization: user.organization,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, lastName, phone, organization, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    if (!name?.trim() || !lastName?.trim()) {
      return res.status(400).json({ error: 'Имя и фамилия обязательны' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не короче 6 символов' });
    }

    const nextRole = ROLES.includes(role) && role !== 'ADMIN' ? role : 'PARTICIPANT';

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: email.trim(),
        password: hashedPassword,
        name: name.trim(),
        lastName: lastName.trim(),
        phone: phone?.trim() || null,
        organization: organization?.trim() || null,
        role: nextRole,
      },
    });

    const token = signToken(user);
    return res.status(201).json({
      message: 'Регистрация успешна',
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    if (user.status === 'BLOCKED') {
      return res.status(403).json({ error: 'Аккаунт заблокирован' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = signToken(user);
    return res.json({
      message: 'Авторизация успешна',
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Ошибка сервера при авторизации' });
  }
});

router.get('/me', authRequired, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    return res.json({ user: publicUser(user) });
  } catch (error) {
    console.error('Me error:', error);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
