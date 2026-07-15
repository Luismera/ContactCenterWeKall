import {
  PrismaClient,
  InteractionType,
  InteractionStatus,
} from '@prisma/client';
import { bogotaLocalToUtc } from '../src/common/timezone.util';

const prisma = new PrismaClient();

const DAYS_OF_HISTORY = 45;
const AGENT_NAMES = [
  'Camila Rojas',
  'Santiago Perez',
  'Valentina Gomez',
  'Mateo Ramirez',
  'Isabella Torres',
  'Juan Diaz',
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

async function main() {
  console.log('Seeding database...');

  await prisma.interaction.deleteMany();
  await prisma.agent.deleteMany();

  const agents = await Promise.all(
    AGENT_NAMES.map((name) => prisma.agent.create({ data: { name } })),
  );
  console.log(`Created ${agents.length} agents.`);

  const now = new Date();
  const interactionsData: {
    type: InteractionType;
    status: InteractionStatus;
    agentId: string;
    openedAt: Date;
    closedAt: Date | null;
  }[] = [];

  let midnightCrossingCount = 0;

  for (let daysAgo = DAYS_OF_HISTORY; daysAgo >= 0; daysAgo--) {
    const dayDate = new Date(now);
    dayDate.setDate(dayDate.getDate() - daysAgo);
    const year = dayDate.getFullYear();
    const month = dayDate.getMonth();
    const day = dayDate.getDate();

    const interactionsToday = randomInt(6, 14);

    for (let i = 0; i < interactionsToday; i++) {
      const agent = pick(agents);
      const type = pick<InteractionType>(['call', 'ticket']);

      // Bias some interactions into the 19:00-23:59 Bogota window on purpose,
      // to guarantee cases that cross midnight in UTC (00:00-04:59 UTC next day).
      const isEveningCase = i % 4 === 0;
      const openHour = isEveningCase ? randomInt(19, 23) : randomInt(6, 22);
      const openMinute = randomInt(0, 59);

      const openedAt = bogotaLocalToUtc(year, month, day, openHour, openMinute);
      if (openedAt.getUTCHours() < openHour) {
        midnightCrossingCount++;
      }

      // Status distribution: ~70% resolved, ~18% in_progress, ~12% open.
      const roll = Math.random();
      let status: InteractionStatus;
      let closedAt: Date | null = null;

      if (roll < 0.7) {
        status = 'resolved';
        const resolutionMinutes = randomInt(3, 360);
        const candidateClosedAt = new Date(
          openedAt.getTime() + resolutionMinutes * 60_000,
        );
        closedAt = candidateClosedAt > now ? now : candidateClosedAt;
      } else if (roll < 0.88) {
        status = 'in_progress';
      } else {
        status = 'open';
      }

      if (openedAt > now) {
        continue;
      }

      interactionsData.push({
        type,
        status,
        agentId: agent.id,
        openedAt,
        closedAt,
      });
    }
  }

  await prisma.interaction.createMany({ data: interactionsData });

  console.log(`Created ${interactionsData.length} interactions.`);
  console.log(
    `Of which ${midnightCrossingCount} open at a Bogota local hour that lands on the next UTC day (midnight-crossing case).`,
  );
  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
