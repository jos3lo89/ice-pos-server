import { Body, Controller, Get, Post } from '@nestjs/common';
import { PrinterService } from './printer.service';
import { TestPrinterDto } from './dto/test-printer.dto';

@Controller('printer')
export class PrinterController {
  constructor(private readonly printerService: PrinterService) {}

  @Get('status')
  getStatus() {
    return this.printerService.agentStatus();
  }

  @Post('test')
  testPrint(@Body() body: TestPrinterDto) {
    this.printerService.dispatchTestCommand(body);

    return { success: true, mensaje: `Test enviado a ${body.area}` };
  }
}
