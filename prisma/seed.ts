import { PrismaClient } from '../src/generated/prisma/client';
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

async function main() {
  console.log('... Iniciando seed');

  // CONFIGURACIONES
  const settings = await prisma.settings.createMany({
    data: [
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
    ],
  });

  console.log(settings);

  const salt = await bcryptjs.genSalt(10);
  const pwdHash = await bcryptjs.hash('123456', salt);

  const users = await prisma.users.createMany({
    data: [
      {
        username: 'admin',
        password: pwdHash,
        full_name: 'Administrador General',
        pin: '111111',
        role: 'admin',
        phone: '111111111',
      },
      {
        username: 'juan_mesero',
        password: pwdHash,
        full_name: 'Juan Pérez',
        pin: '222222',
        role: 'mesero',
        phone: '222222222',
      },
      {
        username: 'ana_cajera',
        password: pwdHash,
        full_name: 'Ana García',
        pin: '333333',
        role: 'cajero',
        phone: '333333333',
      },
      {
        username: 'chef_mario',
        password: pwdHash,
        full_name: 'Mario Gastón',
        pin: '444444',
        role: 'cocinero',
        phone: '444444444',
      },
      {
        username: 'luis_barman',
        password: pwdHash,
        full_name: 'Luis Tragos',
        pin: '555555',
        role: 'bartender',
        phone: '555555555',
      },
    ],
  });

  console.log(users);

  const cliente = await prisma.clients.upsert({
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

  console.log(cliente);

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
