import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrinterGateway } from './printer.gateway';
import { TestPrinterDto } from './dto/test-printer.dto';
import {
  ItemOrden,
  OrdenParaImprimir,
} from './interfaces/send-comand.interface';
import { DestinoImpresion } from '@/generated/prisma/enums';
import { OrdenParaImprimirJob } from './dto/print-job.dto';

@Injectable()
export class PrinterService {
  private readonly logger = new Logger(PrinterService.name);

  constructor(private readonly printerGateway: PrinterGateway) {}

  private sendComandToAgent(job: OrdenParaImprimirJob) {
    const sent = this.printerGateway.sendPrintComanda(job);
    if (!sent) {
      throw new BadRequestException(
        'El servidor de impresión local está desconectado. Revisa la PC e intenta de nuevo.',
      );
    }
  }

  dispatchCommand(orden: OrdenParaImprimir) {
    const grupos = this.groupByDestination(orden.items_orden);

    if (grupos.bar.length > 0) {
      const job: OrdenParaImprimirJob = {
        numero_orden: orden.numero_orden,
        numero_diario: orden.numero_diario,
        fecha: orden.fecha,
        piso: orden.piso,
        numero_mesa: orden.numero_mesa,
        mesero: orden.mesero,
        destino: DestinoImpresion.bar,
        notas: orden.notas,
        tipoPedido: orden.tipoPedido,
        items: grupos.bar.map((i) => ({
          nombre_producto: i.nombre_producto,
          nombre_variante: i.nombre_variante,
          cantidad: i.cantidad,
          notas: i.notas,
          modificadores_item_orden: i.modificadores_item_orden,
        })),
      };

      this.sendComandToAgent(job);
    }

    if (grupos.cocina.length > 0) {
      const job: OrdenParaImprimirJob = {
        numero_orden: orden.numero_orden,
        numero_diario: orden.numero_diario,
        fecha: orden.fecha,
        piso: orden.piso,
        numero_mesa: orden.numero_mesa,
        mesero: orden.mesero,
        destino: DestinoImpresion.cocina,
        notas: orden.notas,
        tipoPedido: orden.tipoPedido,
        items: grupos.cocina.map((i) => ({
          nombre_producto: i.nombre_producto,
          nombre_variante: i.nombre_variante,
          cantidad: i.cantidad,
          notas: i.notas,
          modificadores_item_orden: i.modificadores_item_orden,
        })),
      };

      this.sendComandToAgent(job);
    }
  }

  private groupByDestination(items: ItemOrden[]) {
    return {
      cocina: items.filter((i) => i.area_impresion === 'cocina'),
      bar: items.filter((i) => i.area_impresion === 'bar'),
    };
  }

  // utils

  agentStatus() {
    const connected = this.printerGateway.isAgentConnected();
    return { connected };
  }

  // test

  dispatchTestCommand(dto: TestPrinterDto): void {
    const ahora = new Date().toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      dateStyle: 'short',
      timeStyle: 'medium',
    });

    const job: OrdenParaImprimirJob = {
      destino: dto.area,
      numero_orden: 'TEST-001',
      numero_diario: 999,
      piso: 999,
      numero_mesa: 'Mesa 999',
      mesero: 'Sistema',
      fecha: ahora,
      notas: 'notas 999',
      tipoPedido: 'en_local',
      items: [
        {
          cantidad: 999,
          modificadores_item_orden: [
            {
              nombre_modificador: 'item modificador',
            },
          ],
          nombre_producto: 'Producto 1',
          nombre_variante: 'Variante 1',
          notas: 'notas 999',
        },
      ],
    };

    this.sendComandToAgent(job);
  }
}
