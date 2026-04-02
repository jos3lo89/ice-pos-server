import { Module } from '@nestjs/common';
import { PrinterService } from './printer.service';
import { PrinterController } from './printer.controller';
import { PrinterGateway } from './printer.gateway';

@Module({
  providers: [PrinterService, PrinterGateway],
  controllers: [PrinterController],
  exports: [PrinterService],
})
export class PrinterModule {}
