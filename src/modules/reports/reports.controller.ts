import {
  BadRequestException,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Auth } from '@/common/decorators/auth.decorator';
import { RolUsuario } from '@/generated/prisma/enums';
import { FindVentasDiarioQueryDto } from './dto/find-ventas-diario-query.dto';
import { FindProductosRankingQueryDto } from './dto/find-productos-ranking-query.dto';
import { FindHistorialSesionesQueryDto } from './dto/find-historial-sesiones-query.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('ventas/diario')
  @Auth(RolUsuario.admin)
  getVentasDiario(@Query() qry: FindVentasDiarioQueryDto) {
    return this.reportsService.getVentasDiario(qry);
  }

  @Get('productos/ranking')
  @Auth(RolUsuario.admin)
  getProductosRanking(@Query() qry: FindProductosRankingQueryDto) {
    return this.reportsService.getProductosRanking(qry);
  }

  @Get('sesiones')
  @Auth(RolUsuario.admin)
  getHistorialSesiones(@Query() qry: FindHistorialSesionesQueryDto) {
    return this.reportsService.getHistorialSesiones(qry);
  }

  @Get('sessions/:sesionId')
  @Auth(RolUsuario.admin, RolUsuario.cajero)
  async getSessionReport(
    @Param(
      'sesionId',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('id invalido');
        },
      }),
    )
    sesionId: string,
  ) {
    return this.reportsService.getSessionReport(sesionId);
  }
}
