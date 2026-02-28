import { Controller, Get } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { Auth } from '@/common/decorators/auth.decorator';
import { RolUsuario } from '@/generated/prisma/enums';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get('default')
  @Auth(RolUsuario.admin, RolUsuario.cajero)
  getDefaultClient() {
    return this.clientsService.getDefaultClient();
  }
}
