import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdenParaImprimirJob } from './dto/print-job.dto';

@WebSocketGateway({ namespace: '/print-agent', cors: true })
export class PrinterGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(PrinterGateway.name);
  private agentSocketId: string | null = null;

  constructor(private readonly cofigService: ConfigService) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token ?? client.handshake.query?.token;
    const printAgentToken = this.cofigService.get('PRINT_AGENT_TOKEN');

    if (token !== printAgentToken) {
      this.logger.warn(`Conexión rechazada — token inválido (${client.id})`);
      client.disconnect(true);
      return;
    }

    this.agentSocketId = client.id;
    this.logger.log(`Print agent conectado — socket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    if (client.id === this.agentSocketId) {
      this.agentSocketId = null;
      this.logger.warn(
        'Print agent desconectado — las impresiones fallarán hasta la reconexión',
      );
    }
  }

  // envair comanda
  sendPrintComanda(job: OrdenParaImprimirJob): boolean {
    if (!this.agentSocketId) {
      this.logger.error(
        `Agente offline — falló envío: orden ${job.numero_orden} → ${job.destino}`,
      );
      return false;
    }

    this.server.to(this.agentSocketId).emit('print:job', job);

    this.logger.log(
      `Comanda enviada a ${job.destino} | orden ${job.numero_orden}`,
    );
    return true;
  }

  // utils

  @SubscribeMessage('agent:heartbeat')
  handleHeartbeat(@ConnectedSocket() client: Socket) {
    client.emit('agent:heartbeat:ack', { ts: Date.now() });
  }

  isAgentConnected(): boolean {
    return this.agentSocketId !== null;
  }
}
