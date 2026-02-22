import {
  PrismaClient,
  RolUsuario,
  Prisma,
} from '../src/generated/prisma/client';
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

const settings: Prisma.configuracionesCreateInput[] = [
  {
    clave: 'igv_rate',
    valor: '18',
    descripcion: 'Tasa del Impuesto General a las Ventas en Perú',
  },
  {
    clave: 'order_number_prefix',
    valor: 'ORD-',
    descripcion: 'Prefijo para los tickets de pedido',
  },
  {
    clave: 'restaurant_name',
    valor: 'Ice Mankora',
    descripcion: 'Nombre comercial del restaurante',
  },
];

const usersData: Prisma.usuariosCreateInput[] = [
  {
    usuario: 'admin',
    contrasena: '123456',
    nombre_completo: 'Administrador General',
    rol: RolUsuario.admin,
    telefono: '111111111',
  },
  {
    usuario: 'juan_mesero',
    contrasena: '123456',
    nombre_completo: 'Juan Pérez',
    rol: RolUsuario.mesero,
    telefono: '222222222',
  },
  {
    usuario: 'ana_cajera',
    contrasena: '123456',
    nombre_completo: 'Ana García',
    rol: RolUsuario.cajero,
    telefono: '333333333',
  },
  {
    usuario: 'chef_mario',
    contrasena: '123456',
    nombre_completo: 'Mario Gastón',
    rol: RolUsuario.cocinero,
    telefono: '444444444',
  },
  {
    usuario: 'luis_barman',
    contrasena: '123456',
    nombre_completo: 'Luis Tragos',
    rol: RolUsuario.bartender,
    telefono: '555555555',
  },
];

const categories: Prisma.categoriasCreateInput[] = [
  {
    nombre: 'Para empezar el día',
    slug: 'para-empezar-el-dia',
    productos: {
      createMany: {
        data: [
          { nombre: 'Bowl de frutas', precio: 15.0, area_impresion: 'cocina' },
          {
            nombre: 'Ensalada de frutas',
            precio: 17.0,
            area_impresion: 'cocina',
          },
        ],
      },
    },
  },
  {
    nombre: 'Helados Gourmet',
    slug: 'helados-gourmet',
    productos: {
      createMany: {
        data: [
          { nombre: 'Copa clásica', precio: 10.0, area_impresion: 'cocina' },
          { nombre: 'Banana Split', precio: 15.0, area_impresion: 'cocina' },
        ],
      },
    },
  },
  {
    nombre: 'Postres Ice Mankora',
    slug: 'postres-ice-mankora',
    productos: {
      createMany: {
        data: [
          { nombre: 'Waffles', precio: 20.0, area_impresion: 'cocina' },
          { nombre: 'Crepes', precio: 20.0, area_impresion: 'cocina' },
          { nombre: 'Brownies', precio: 15.0, area_impresion: 'cocina' },
          { nombre: 'Fruitys cream', precio: 15.0, area_impresion: 'cocina' },
          { nombre: 'Panques', precio: 18.0, area_impresion: 'cocina' },
        ],
      },
    },
  },
  {
    nombre: 'Entradas',
    slug: 'entradas',
    productos: {
      createMany: {
        data: [
          {
            nombre: 'Capchi de queso',
            precio: 10.0,
            area_impresion: 'cocina',
            descripcion: 'Lechuga, papas nativas y queso fresco',
          },
          {
            nombre: 'Tequeños clásicos',
            precio: 16.0,
            area_impresion: 'cocina',
          },
          {
            nombre: 'Tequeños hawaianos',
            precio: 18.0,
            area_impresion: 'cocina',
          },
          { nombre: 'Huancaína', precio: 10.0, area_impresion: 'cocina' },
          { nombre: 'Ocopa', precio: 10.0, area_impresion: 'cocina' },
          {
            nombre: 'Sopa dieta de pollo',
            precio: 15.0,
            area_impresion: 'cocina',
          },
        ],
      },
    },
  },

  {
    nombre: 'Platos de fondo',
    slug: 'platos-de-fondo',
    productos: {
      createMany: {
        data: [
          {
            nombre: 'Ceviche de tilapia',
            precio: 25.0,
            area_impresion: 'cocina',
          },
          {
            nombre: 'Milanesa de pollo',
            precio: 20.0,
            area_impresion: 'cocina',
            descripcion: 'Empanizada con fettuccini al pesto o huancaína',
          },
          {
            nombre: 'Pechuga a la parrilla',
            precio: 27.0,
            area_impresion: 'cocina',
          },
          {
            nombre: 'Chicharrón andahuaylino',
            precio: 30.0,
            area_impresion: 'cocina',
          },
          {
            nombre: 'Chicharrón de cuy',
            precio: 55.0,
            area_impresion: 'cocina',
          },
        ],
      },
    },
  },
  {
    nombre: 'Piqueos & Snacks',
    slug: 'piqueos-y-snacks',
    productos: {
      createMany: {
        data: [
          {
            nombre: 'Chicken Pops',
            precio: 20.0,
            area_impresion: 'cocina',
          },
          {
            nombre: 'Chicken Finger',
            precio: 20.0,
            area_impresion: 'cocina',
          },
          {
            nombre: 'Hamburguesa clásica',
            precio: 18.0,
            area_impresion: 'cocina',
          },
          {
            nombre: 'Hamburguesa royal',
            precio: 20.0,
            area_impresion: 'cocina',
          },
          {
            nombre: 'Hamburguesa especial de la casa',
            precio: 22.0,
            area_impresion: 'cocina',
          },
          {
            nombre: 'Alitas en salsa acevichadas',
            precio: 20.0,
            area_impresion: 'cocina',
          },

          {
            nombre: 'Alitas BBQ',
            precio: 20.0,
            area_impresion: 'cocina',
          },

          {
            nombre: 'Alitas en salsa Maracumango',
            precio: 20.0,
            area_impresion: 'cocina',
          },

          {
            nombre: 'Alitas en salsa Aguaymanto picante',
            precio: 20.0,
            area_impresion: 'cocina',
          },
          {
            nombre: 'Alitas mixtas',
            precio: 27.0,
            area_impresion: 'cocina',
            descripcion: '2 sabores a escoger',
          },

          {
            nombre: 'SalchiKora',
            precio: 18.0,
            area_impresion: 'cocina',
            descripcion: 'Salchichas Otto kuns acompaniado de papas fritas',
          },
          {
            nombre: 'choriMan',
            precio: 15.0,
            area_impresion: 'cocina',
            descripcion: 'Chorizo acompaniado de papas fritas',
          },
        ],
      },
    },
  },

  {
    nombre: 'Bebidas calientes',
    slug: 'bebidas-calientes',
    productos: {
      createMany: {
        data: [
          { nombre: 'Café', precio: 4.0, area_impresion: 'bar' },
          { nombre: 'Chocolate', precio: 5.0, area_impresion: 'bar' },
          { nombre: 'Café expreso', precio: 6.0, area_impresion: 'bar' },
          { nombre: 'Capuchino', precio: 12.0, area_impresion: 'bar' },
        ],
      },
    },
  },
  {
    nombre: 'Infusiones',
    slug: 'infusiones',
    productos: {
      createMany: {
        data: [
          {
            nombre: 'Infusiones',
            precio: 4.0,
            descripcion: 'naturales y aromaticas',
            area_impresion: 'bar',
          },
        ],
      },
    },
  },

  {
    nombre: 'Jugos',
    slug: 'jugos',
    productos: {
      createMany: {
        data: [
          {
            nombre: 'Papaya',
            precio: 6.0,
            area_impresion: 'bar',
          },

          {
            nombre: 'Plátano',
            precio: 6.0,
            area_impresion: 'bar',
          },

          {
            nombre: 'Mango',
            precio: 6.0,
            area_impresion: 'bar',
          },

          {
            nombre: 'Arándanos',
            precio: 8.0,
            area_impresion: 'bar',
          },

          {
            nombre: 'Fresa',
            precio: 8.0,
            area_impresion: 'bar',
          },

          {
            nombre: 'Piña',
            precio: 8.0,
            area_impresion: 'bar',
          },

          {
            nombre: 'Mix de jugos - 2 frutas al escoger',
            precio: 12.0,
            area_impresion: 'bar',
          },
        ],
      },
    },
  },

  {
    nombre: 'Bebidas frías',
    slug: 'bebidas-frias',
    productos: {
      createMany: {
        data: [
          { nombre: 'Soda italiana', precio: 10.0, area_impresion: 'bar' },
          { nombre: 'Frappe', precio: 15.0, area_impresion: 'bar' },
          { nombre: 'Refrescantes 1LT', precio: 18.0, area_impresion: 'bar' },
          { nombre: 'Refrescante vaso', precio: 10.0, area_impresion: 'bar' },
          { nombre: 'Mocktail', precio: 12.0, area_impresion: 'bar' },
        ],
      },
    },
  },
  {
    nombre: 'Zumos',
    slug: 'zumos',
    productos: {
      createMany: {
        data: [
          { nombre: 'Chicha morada 1LT', precio: 12.0, area_impresion: 'bar' },
          { nombre: 'Maracuyá 1LT', precio: 12.0, area_impresion: 'bar' },
          { nombre: 'Limonada 1LT', precio: 12.0, area_impresion: 'bar' },
          { nombre: 'Naranjada 1LT', precio: 12.0, area_impresion: 'bar' },
          { nombre: 'Vaso de zumo', precio: 3.0, area_impresion: 'bar' },
        ],
      },
    },
  },
  {
    nombre: 'Postres Ice Mankora',
    slug: 'postres-ice-mankora',
    productos: {
      createMany: {
        data: [
          { nombre: 'Waffles', precio: 20.0, area_impresion: 'bar' },
          { nombre: 'Crepes', precio: 20.0, area_impresion: 'bar' },
          { nombre: 'Brownies', precio: 15.0, area_impresion: 'bar' },
          { nombre: 'Fruitys cream', precio: 15.0, area_impresion: 'bar' },
          { nombre: 'Panques', precio: 18.0, area_impresion: 'bar' },
        ],
      },
    },
  },
  {
    nombre: 'Postres Tradicionales',
    slug: 'postres-tradicionales',
    productos: {
      createMany: {
        data: [
          { nombre: 'Gelatina', precio: 5.0, area_impresion: 'bar' },
          { nombre: 'Flan', precio: 5.0, area_impresion: 'bar' },
          { nombre: 'Mousse de maracuyá', precio: 7.0, area_impresion: 'bar' },
          { nombre: 'Cheesecake', precio: 12.0, area_impresion: 'bar' },
          { nombre: 'Cuchareables', precio: 8.0, area_impresion: 'bar' },
        ],
      },
    },
  },
  {
    nombre: 'Pasteles',
    slug: 'pasteles',
    productos: {
      createMany: {
        data: [
          { nombre: 'Enrollado de queso', precio: 1.5, area_impresion: 'bar' },
          { nombre: 'Enrollado de sauco', precio: 1.5, area_impresion: 'bar' },
          { nombre: 'Pionono', precio: 1.5, area_impresion: 'bar' },
          { nombre: 'Cachitos', precio: 1.5, area_impresion: 'bar' },
          { nombre: 'Leche asada', precio: 2.0, area_impresion: 'bar' },
          { nombre: 'Pie de manzana', precio: 2.5, area_impresion: 'bar' },
          {
            nombre: 'Empanada de carne',
            precio: 5.0,
            area_impresion: 'cocina',
          },
          {
            nombre: 'Empanada de pollo',
            precio: 5.0,
            area_impresion: 'cocina',
          },
          { nombre: 'Torta helada', precio: 5.0, area_impresion: 'bar' },
        ],
      },
    },
  },
  {
    nombre: 'Sándwiches',
    slug: 'sandwiches',
    productos: {
      createMany: {
        data: [
          {
            nombre: 'Pollo deshilachado',
            precio: 10.0,
            area_impresion: 'cocina',
          },
          { nombre: 'Choripán', precio: 10.0, area_impresion: 'cocina' },
          {
            nombre: 'Pan con milanesa',
            precio: 13.0,
            area_impresion: 'cocina',
          },
          {
            nombre: 'Pan con chicharrón',
            precio: 15.0,
            area_impresion: 'cocina',
          },
        ],
      },
    },
  },
];

const floors: Prisma.pisosCreateInput[] = [
  {
    nombre: 'Piso 1',
    nivel: 1,
    mesas: {
      createMany: {
        data: [
          { numero_mesa: '101' },
          { numero_mesa: '102' },
          { numero_mesa: '103' },
          { numero_mesa: '104' },
          { numero_mesa: '105' },
          { numero_mesa: '106' },
          { numero_mesa: '107' },
          { numero_mesa: '108' },
          { numero_mesa: '109' },
          { numero_mesa: '110' },
        ],
      },
    },
  },
  {
    nombre: 'Piso 2',
    nivel: 2,
    mesas: {
      createMany: {
        data: [
          { numero_mesa: '201' },
          { numero_mesa: '202' },
          { numero_mesa: '203' },
          { numero_mesa: '204' },
          { numero_mesa: '205' },
          { numero_mesa: '206' },
          { numero_mesa: '207' },
          { numero_mesa: '208' },
          { numero_mesa: '209' },
          { numero_mesa: '210' },
        ],
      },
    },
  },
  {
    nombre: 'Piso 3',
    nivel: 3,
    mesas: {
      createMany: {
        data: [
          { numero_mesa: '301' },
          { numero_mesa: '302' },
          { numero_mesa: '303' },
          { numero_mesa: '304' },
          { numero_mesa: '305' },
          { numero_mesa: '306' },
          { numero_mesa: '307' },
          { numero_mesa: '308' },
          { numero_mesa: '309' },
          { numero_mesa: '310' },
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
    const setting = await prisma.configuraciones.upsert({
      where: { clave: s.clave },
      update: {
        valor: s.valor,
        descripcion: s.descripcion,
      },
      create: s,
    });
    console.log(`Created setting with key: ${setting.clave}`);
  }

  /* ===============================
     2. CREACIÓN DE USUARIOS (UPSERT)
  =============================== */

  const salt = await bcryptjs.genSalt(10);
  const hashedPwd = await bcryptjs.hash('123456', salt);

  for (const u of usersData) {
    const user = await prisma.usuarios.upsert({
      where: { usuario: u.usuario },
      update: {
        nombre_completo: u.nombre_completo,
        rol: u.rol,
        telefono: u.telefono,
        contrasena: hashedPwd,
      },
      create: {
        ...u,
        contrasena: hashedPwd,
      },
    });

    console.log(`Created user with userName: ${user.usuario}`);
  }

  /* ===============================
     3. CLIENTE POR DEFECTO
  =============================== */

  const client = await prisma.clientes.upsert({
    where: { numero_documento: '11111111' },
    create: {
      tipo_documento: '0',
      numero_documento: '11111111',
      razon_social: 'CLIENTES VARIOS',
      direccion: 'DOMICILIO CONOCIDO',
      correo: 'ventas@restaurante.com',
    },
    update: {},
  });

  console.log(`Created client with razon social: ${client.razon_social}`);

  /* ===============================
     4. CATEGORIES
  =============================== */

  for (const c of categories) {
    const category = await prisma.categorias.upsert({
      where: { slug: c.slug },
      update: {
        descripcion: c.descripcion,
        nombre: c.nombre,
        esta_activa: c.esta_activa,
      },
      create: { ...c },
    });

    console.log(`Created category with slug: ${category.slug}`);
  }

  /* ===============================
     4. Floors with tables
  =============================== */

  for (const f of floors) {
    const floorsWithTables = await prisma.pisos.upsert({
      where: { nivel: f.nivel },
      update: {
        nombre: f.nombre,
      },
      create: { ...f },
    });
    console.log(
      `Created florrs with tables: ${floorsWithTables.nombre} creado`,
    );
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
