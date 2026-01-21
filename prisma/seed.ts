import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';

config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('... Iniciando seed');

  const user = await prisma.user.upsert({
    where: { username: 'haru' },
    update: {},
    create: {
      username: 'haru',
      name: 'jos3lo',
    },
  });

  console.log(user);

  console.log('... Seed finalizado');
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
