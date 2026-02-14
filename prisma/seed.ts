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
    name: 'Para empezar el día',
    slug: 'para-empezar-el-dia',
    products: {
      createMany: {
        data: [
          { name: 'Bowl de frutas', price: 15.0, area_impresion: 'cocina' },
          { name: 'Ensalada de frutas', price: 17.0, area_impresion: 'cocina' },
        ],
      },
    },
  },
  {
    name: 'Helados Gourmet',
    slug: 'helados-gourmet',
    products: {
      createMany: {
        data: [
          { name: 'Copa clásica', price: 10.0, area_impresion: 'cocina' },
          { name: 'Banana Split', price: 15.0, area_impresion: 'cocina' },
        ],
      },
    },
  },
  {
    name: 'Postres Ice Mankora',
    slug: 'postres-ice-mankora',
    products: {
      createMany: {
        data: [
          { name: 'Waffles', price: 20.0, area_impresion: 'cocina' },
          { name: 'Crepes', price: 20.0, area_impresion: 'cocina' },
          { name: 'Brownies', price: 15.0, area_impresion: 'cocina' },
          { name: 'Fruitys cream', price: 15.0, area_impresion: 'cocina' },
          { name: 'Panques', price: 18.0, area_impresion: 'cocina' },
        ],
      },
    },
  },
  {
    name: 'Entradas',
    slug: 'entradas',
    products: {
      createMany: {
        data: [
          {
            name: 'Capchi de queso',
            price: 10.0,
            area_impresion: 'cocina',
            description: 'Lechuga, papas nativas y queso fresco',
          },
          { name: 'Tequeños clásicos', price: 16.0, area_impresion: 'cocina' },
          { name: 'Tequeños hawaianos', price: 18.0, area_impresion: 'cocina' },
          { name: 'Huancaína', price: 10.0, area_impresion: 'cocina' },
          { name: 'Ocopa', price: 10.0, area_impresion: 'cocina' },
          {
            name: 'Sopa dieta de pollo',
            price: 15.0,
            area_impresion: 'cocina',
          },
        ],
      },
    },
  },

  {
    name: 'Platos de fondo',
    slug: 'platos-de-fondo',
    products: {
      createMany: {
        data: [
          { name: 'Ceviche de tilapia', price: 25.0, area_impresion: 'cocina' },
          {
            name: 'Milanesa de pollo',
            price: 20.0,
            area_impresion: 'cocina',
            description: 'Empanizada con fettuccini al pesto o huancaína',
          },
          {
            name: 'Pechuga a la parrilla',
            price: 27.0,
            area_impresion: 'cocina',
          },
          {
            name: 'Chicharrón andahuaylino',
            price: 30.0,
            area_impresion: 'cocina',
          },
          {
            name: 'Chicharrón de cuy',
            price: 55.0,
            area_impresion: 'cocina',
          },
        ],
      },
    },
  },
  {
    name: 'Piqueos & Snacks',
    slug: 'piqueos-y-snacks',
    products: {
      createMany: {
        data: [
          {
            name: 'Chicken Pops',
            price: 20.0,
            area_impresion: 'cocina',
          },
          {
            name: 'Chicken Finger',
            price: 20.0,
            area_impresion: 'cocina',
          },
          {
            name: 'Hamburguesa clásica',
            price: 18.0,
            area_impresion: 'cocina',
          },
          { name: 'Hamburguesa royal', price: 20.0, area_impresion: 'cocina' },
          {
            name: 'Hamburguesa especial de la casa',
            price: 22.0,
            area_impresion: 'cocina',
          },
          {
            name: 'Alitas en salsa acevichadas',
            price: 20.0,
            area_impresion: 'cocina',
          },

          {
            name: 'Alitas BBQ',
            price: 20.0,
            area_impresion: 'cocina',
          },

          {
            name: 'Alitas en salsa Maracumango',
            price: 20.0,
            area_impresion: 'cocina',
          },

          {
            name: 'Alitas en salsa Aguaymanto picante',
            price: 20.0,
            area_impresion: 'cocina',
          },
          {
            name: 'Alitas mixtas',
            price: 27.0,
            area_impresion: 'cocina',
            description: '2 sabores a escoger',
          },

          {
            name: 'SalchiKora',
            price: 18.0,
            area_impresion: 'cocina',
            description: 'Salchichas Otto kuns acompaniado de papas fritas',
          },
          {
            name: 'choriMan',
            price: 15.0,
            area_impresion: 'cocina',
            description: 'Chorizo acompaniado de papas fritas',
          },
        ],
      },
    },
  },

  {
    name: 'Bebidas calientes',
    slug: 'bebidas-calientes',
    products: {
      createMany: {
        data: [
          { name: 'Café', price: 4.0, area_impresion: 'bar' },
          { name: 'Chocolate', price: 5.0, area_impresion: 'bar' },
          { name: 'Café expreso', price: 6.0, area_impresion: 'bar' },
          { name: 'Capuchino', price: 12.0, area_impresion: 'bar' },
        ],
      },
    },
  },
  {
    name: 'Infusiones',
    slug: 'infusiones',
    products: {
      createMany: {
        data: [
          {
            name: 'Infusiones',
            price: 4.0,
            description: 'naturales y aromaticas',
            area_impresion: 'bar',
          },
        ],
      },
    },
  },

  {
    name: 'Jugos',
    slug: 'jugos',
    products: {
      createMany: {
        data: [
          {
            name: 'Papaya',
            price: 6.0,
            area_impresion: 'bar',
          },

          {
            name: 'Plátano',
            price: 6.0,
            area_impresion: 'bar',
          },

          {
            name: 'Mango',
            price: 6.0,
            area_impresion: 'bar',
          },

          {
            name: 'Arándanos',
            price: 8.0,
            area_impresion: 'bar',
          },

          {
            name: 'Fresa',
            price: 8.0,
            area_impresion: 'bar',
          },

          {
            name: 'Piña',
            price: 8.0,
            area_impresion: 'bar',
          },

          {
            name: 'Mix de jugos - 2 frutas al escoger',
            price: 12.0,
            area_impresion: 'bar',
          },
        ],
      },
    },
  },

  {
    name: 'Bebidas frías',
    slug: 'bebidas-frias',
    products: {
      createMany: {
        data: [
          { name: 'Soda italiana', price: 10.0, area_impresion: 'bar' },
          { name: 'Frappe', price: 15.0, area_impresion: 'bar' },
          { name: 'Refrescantes 1LT', price: 18.0, area_impresion: 'bar' },
          { name: 'Refrescante vaso', price: 10.0, area_impresion: 'bar' },
          { name: 'Mocktail', price: 12.0, area_impresion: 'bar' },
        ],
      },
    },
  },
  {
    name: 'Zumos',
    slug: 'zumos',
    products: {
      createMany: {
        data: [
          { name: 'Chicha morada 1LT', price: 12.0, area_impresion: 'bar' },
          { name: 'Maracuyá 1LT', price: 12.0, area_impresion: 'bar' },
          { name: 'Limonada 1LT', price: 12.0, area_impresion: 'bar' },
          { name: 'Naranjada 1LT', price: 12.0, area_impresion: 'bar' },
          { name: 'Vaso de zumo', price: 3.0, area_impresion: 'bar' },
        ],
      },
    },
  },
  {
    name: 'Postres Ice Mankora',
    slug: 'postres-ice-mankora',
    products: {
      createMany: {
        data: [
          { name: 'Waffles', price: 20.0, area_impresion: 'bar' },
          { name: 'Crepes', price: 20.0, area_impresion: 'bar' },
          { name: 'Brownies', price: 15.0, area_impresion: 'bar' },
          { name: 'Fruitys cream', price: 15.0, area_impresion: 'bar' },
          { name: 'Panques', price: 18.0, area_impresion: 'bar' },
        ],
      },
    },
  },
  {
    name: 'Postres Tradicionales',
    slug: 'postres-tradicionales',
    products: {
      createMany: {
        data: [
          { name: 'Gelatina', price: 5.0, area_impresion: 'bar' },
          { name: 'Flan', price: 5.0, area_impresion: 'bar' },
          { name: 'Mousse de maracuyá', price: 7.0, area_impresion: 'bar' },
          { name: 'Cheesecake', price: 12.0, area_impresion: 'bar' },
          { name: 'Cuchareables', price: 8.0, area_impresion: 'bar' },
        ],
      },
    },
  },
  {
    name: 'Pasteles',
    slug: 'pasteles',
    products: {
      createMany: {
        data: [
          { name: 'Enrollado de queso', price: 1.5, area_impresion: 'bar' },
          { name: 'Enrollado de sauco', price: 1.5, area_impresion: 'bar' },
          { name: 'Pionono', price: 1.5, area_impresion: 'bar' },
          { name: 'Cachitos', price: 1.5, area_impresion: 'bar' },
          { name: 'Leche asada', price: 2.0, area_impresion: 'bar' },
          { name: 'Pie de manzana', price: 2.5, area_impresion: 'bar' },
          { name: 'Empanada de carne', price: 5.0, area_impresion: 'cocina' },
          { name: 'Empanada de pollo', price: 5.0, area_impresion: 'cocina' },
          { name: 'Torta helada', price: 5.0, area_impresion: 'bar' },
        ],
      },
    },
  },
  {
    name: 'Sándwiches',
    slug: 'sandwiches',
    products: {
      createMany: {
        data: [
          { name: 'Pollo deshilachado', price: 10.0, area_impresion: 'cocina' },
          { name: 'Choripán', price: 10.0, area_impresion: 'cocina' },
          { name: 'Pan con milanesa', price: 13.0, area_impresion: 'cocina' },
          { name: 'Pan con chicharrón', price: 15.0, area_impresion: 'cocina' },
        ],
      },
    },
  },
];

const floors: Prisma.floorsCreateInput[] = [
  {
    name: 'Piso 1',
    level: 1,
    tables: {
      createMany: {
        data: [
          { table_number: '101' },
          { table_number: '102' },
          { table_number: '103' },
          { table_number: '104' },
          { table_number: '105' },
          { table_number: '106' },
          { table_number: '107' },
          { table_number: '108' },
          { table_number: '109' },
          { table_number: '110' },
        ],
      },
    },
  },
  {
    name: 'Piso 2',
    level: 2,
    tables: {
      createMany: {
        data: [
          { table_number: '201' },
          { table_number: '202' },
          { table_number: '203' },
          { table_number: '204' },
          { table_number: '205' },
          { table_number: '206' },
          { table_number: '207' },
          { table_number: '208' },
          { table_number: '209' },
          { table_number: '210' },
        ],
      },
    },
  },
  {
    name: 'Piso 3',
    level: 3,
    tables: {
      createMany: {
        data: [
          { table_number: '301' },
          { table_number: '302' },
          { table_number: '303' },
          { table_number: '304' },
          { table_number: '305' },
          { table_number: '306' },
          { table_number: '307' },
          { table_number: '308' },
          { table_number: '309' },
          { table_number: '310' },
        ],
      },
    },
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

  /* ===============================
     4. Floors with tables
  =============================== */

  for (const f of floors) {
    const floorsWithTables = await prisma.floors.upsert({
      where: { level: f.level },
      update: {
        name: f.name,
      },
      create: { ...f },
    });
    console.log(`Created florrs with tables: ${floorsWithTables.name} creado`);
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
