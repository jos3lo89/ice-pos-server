import { PrismaService } from '@/core/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDefaultClient() {
    const client = await this.prisma.clientes.findFirst({
      where: { numero_documento: '11111111' },
      select: {
        id: true,
        razon_social: true,
        numero_documento: true,
        tipo_documento: true,
      },
    });

    if (!client)
      throw new NotFoundException('Cliente por defecto no encontrado');

    return client;
  }
}
