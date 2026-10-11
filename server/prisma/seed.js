import bcrypt from 'bcrypt';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./dev.db',
});
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.submission.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.task.deleteMany();
  await prisma.olympiad.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@olymp.local',
      name: 'Администратор',
      password,
      role: 'ADMIN',
    },
  });

  const developer = await prisma.user.create({
    data: {
      email: 'dev@olymp.local',
      name: 'Анна Разработчик',
      password,
      role: 'DEVELOPER',
    },
  });

  const participant = await prisma.user.create({
    data: {
      email: 'student@olymp.local',
      name: 'Иван Участник',
      password,
      role: 'PARTICIPANT',
    },
  });

  const olympiadLive = await prisma.olympiad.create({
    data: {
      title: 'Python Sprint #4',
      description: 'Короткая олимпиада по базовому Python: ввод/вывод, условия, циклы.',
      status: 'LIVE',
      startsAt: new Date(Date.now() - 30 * 60 * 1000),
      endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      createdById: developer.id,
      tasks: {
        create: [
          {
            title: 'A. Сумма двух чисел',
            statement:
              'Даны два целых числа a и b. Выведите их сумму.\n\nВход: две строки с числами.\nВыход: одно число.',
            referenceCode: 'a=int(input())\nb=int(input())\nprint(a+b)',
            points: 100,
            order: 0,
            testCases: {
              create: [
                { input: '2\n3', expectedOutput: '5', isSample: true },
                { input: '10\n-4', expectedOutput: '6', isSample: false },
              ],
            },
          },
          {
            title: 'B. Чётность',
            statement:
              'Дано целое число n. Выведите "EVEN", если оно чётное, иначе "ODD".',
            referenceCode:
              'n=int(input())\nprint("EVEN" if n%2==0 else "ODD")',
            points: 100,
            order: 1,
            testCases: {
              create: [
                { input: '4', expectedOutput: 'EVEN', isSample: true },
                { input: '7', expectedOutput: 'ODD', isSample: false },
              ],
            },
          },
        ],
      },
    },
    include: { tasks: true },
  });

  await prisma.olympiad.create({
    data: {
      title: 'Алгоритмы для начинающих',
      description: 'Регистрация открыта. Старт через несколько дней.',
      status: 'OPEN',
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      createdById: developer.id,
    },
  });

  await prisma.olympiad.create({
    data: {
      title: 'Черновик: структуры данных',
      description: 'Внутренний черновик разработчика.',
      status: 'DRAFT',
      createdById: developer.id,
    },
  });

  await prisma.registration.create({
    data: {
      userId: participant.id,
      olympiadId: olympiadLive.id,
      status: 'JOINED',
    },
  });

  console.log('Seed OK');
  console.log('Accounts (password: password123):');
  console.log('- admin@olymp.local / ADMIN');
  console.log('- dev@olymp.local / DEVELOPER');
  console.log('- student@olymp.local / PARTICIPANT');
  console.log({ admin: admin.id, developer: developer.id, participant: participant.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
