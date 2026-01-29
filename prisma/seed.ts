import { PrismaClient, user_role } from '../src/generated/prisma/client';
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

const settings = [
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

const usersData = [
  {
    username: 'admin',
    password: '111111',
    full_name: 'Administrador General',
    role: user_role.admin,
    phone: '111111111',
  },
  {
    username: 'juan_mesero',
    password: '222222',
    full_name: 'Juan Pérez',
    role: user_role.mesero,
    phone: '222222222',
  },
  {
    username: 'ana_cajera',
    password: '333333',
    full_name: 'Ana García',
    role: user_role.cajero,
    phone: '333333333',
  },
  {
    username: 'chef_mario',
    password: '444444',
    full_name: 'Mario Gastón',
    role: user_role.cocinero,
    phone: '444444444',
  },
  {
    username: 'luis_barman',
    password: '555555',
    full_name: 'Luis Tragos',
    role: user_role.bartender,
    phone: '555555555',
  },
];

const categories = [
  {
    name: 'Bebidas',
    description: 'Refrescos, jugos, cervezas y bebidas alcohólicas',
  },
  {
    name: 'Entradas',
    description: 'Porciones para compartir y aperitivos',
  },
  {
    name: 'Platos Fuertes',
    description: 'Platos principales del restaurante',
  },
  {
    name: 'Postres',
    description: 'Dulces y helados para terminar la comida',
  },
  {
    name: 'Extras',
    description: 'Papas fritas, salsas y acompañamientos',
  },
];

async function main() {
  console.log('... Iniciando seed');

  /* ===============================
     ✅ 1. UPSERT DE SETTINGS
  =============================== */

  await prisma.$transaction(
    settings.map((item) =>
      prisma.settings.upsert({
        where: { key: item.key },
        update: {
          value: item.value,
          description: item.description,
        },
        create: item,
      }),
    ),
  );

  console.log('✅ Settings insertados o actualizados');

  /* ===============================
     ✅ 2. CREACIÓN DE USUARIOS (UPSERT)
  =============================== */

  const salt = await bcryptjs.genSalt(10);

  await prisma.$transaction(
    usersData.map((user) =>
      prisma.users.upsert({
        where: { username: user.username },
        update: {
          full_name: user.full_name,
          role: user.role,
          phone: user.phone,
        },
        create: {
          username: user.username,
          password: bcryptjs.hashSync(user.password, salt),
          full_name: user.full_name,
          role: user.role,
          phone: user.phone,
        },
      }),
    ),
  );

  console.log('✅ Usuarios insertados o actualizados');

  /* ===============================
     ✅ 3. CLIENTE POR DEFECTO (UPSERT)
  =============================== */

  await prisma.clients.upsert({
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

  console.log('✅ Cliente por defecto listo');

  /* ===============================
     ✅ 4. CATEGORIES
  =============================== */

  await prisma.$transaction(
    categories.map((cat) =>
      prisma.categories.upsert({
        where: { name: cat.name },
        update: {
          description: cat.description,
        },
        create: {
          description: cat.description,
          name: cat.name,
        },
      }),
    ),
  );

  console.log('✅ Categorias listo');

  console.log('... Seed finalizado ✅');
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
