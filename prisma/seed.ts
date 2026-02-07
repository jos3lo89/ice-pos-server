import { PrismaClient, UserRole, Prisma } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import bcryptjs from 'bcryptjs';

config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

const settings: Prisma.settingsCreateInput[] = [
  {
    key: 'igv_rate',
    value: '18',
    description: 'Tasa del Impuesto General a las Ventas en Perú',
  },
  {
    key: 'order_number_prefix',
    value: 'ORD-',
    description: 'Prefijo para los tickets de pedido',
  },
  {
    key: 'restaurant_name',
    value: 'Ice Mankora',
    description: 'Nombre comercial del restaurante',
  },
];

const usersData: Prisma.usersCreateInput[] = [
  {
    username: 'admin',
    password: '123456',
    full_name: 'Administrador General',
    role: UserRole.admin,
    phone: '111111111',
  },
  {
    username: 'juan_mesero',
    password: '123456',
    full_name: 'Juan Pérez',
    role: UserRole.mesero,
    phone: '222222222',
  },
  {
    username: 'ana_cajera',
    password: '123456',
    full_name: 'Ana García',
    role: UserRole.cajero,
    phone: '333333333',
  },
  {
    username: 'chef_mario',
    password: '123456',
    full_name: 'Mario Gastón',
    role: UserRole.cocinero,
    phone: '444444444',
  },
  {
    username: 'luis_barman',
    password: '123456',
    full_name: 'Luis Tragos',
    role: UserRole.bartender,
    phone: '555555555',
  },
];

const categories: Prisma.categoriesCreateInput[] = [
  {
    name: 'Bebidas',
    description: 'Refrescos, jugos, cervezas y bebidas alcohólicas',
    slug: 'bebidas',
    is_active: true,
  },
  {
    name: 'Entradas',
    description: 'Porciones para compartir y aperitivos',
    slug: 'entradas',
    is_active: true,
  },
  {
    name: 'Platos Fuertes',
    description: 'Platos principales del restaurante',
    slug: 'platos-fuertes',
    is_active: true,
  },
  {
    name: 'Postres',
    description: 'Dulces y helados para terminar la comida',
    slug: 'postres',
    is_active: true,
  },
  {
    name: 'Extras',
    description: 'Papas fritas, salsas y acompañamientos',
    slug: 'Extras',
    is_active: true,
  },
];

async function main() {
  console.log('... Iniciando seed');

  /* ===============================
     1. UPSERT DE SETTINGS
  =============================== */

  for (const s of settings) {
    const setting = await prisma.settings.upsert({
      where: { key: s.key },
      update: {
        value: s.value,
        description: s.description,
      },
      create: s,
    });
    console.log(`Created setting with key: ${setting.key}`);
  }

  /* ===============================
     2. CREACIÓN DE USUARIOS (UPSERT)
  =============================== */

  const salt = await bcryptjs.genSalt(10);
  const hashedPwd = await bcryptjs.hash('123456', salt);

  for (const u of usersData) {
    const user = await prisma.users.upsert({
      where: { username: u.username },
      update: {
        full_name: u.full_name,
        role: u.role,
        phone: u.phone,
        password: hashedPwd,
      },
      create: {
        ...u,
        password: hashedPwd,
      },
    });

    console.log(`Created user with userName: ${user.username}`);
  }

  /* ===============================
     3. CLIENTE POR DEFECTO
  =============================== */

  const client = await prisma.clients.upsert({
    where: { numero_documento: '11111111' },
    create: {
      tipo_documento: '0',
      numero_documento: '11111111',
      razon_social: 'CLIENTES VARIOS',
      direccion: 'DOMICILIO CONOCIDO',
      email: 'ventas@restaurante.com',
    },
    update: {},
  });

  console.log(`Created client with razon social: ${client.razon_social}`);

  /* ===============================
     4. CATEGORIES
  =============================== */

  for (const c of categories) {
    const category = await prisma.categories.upsert({
      where: { slug: c.slug },
      update: {
        description: c.description,
        name: c.name,
        is_active: c.is_active,
      },
      create: { ...c },
    });

    console.log(`Created category with slug: ${category.slug}`);
  }

  console.log(`Seeding finished.`);
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
