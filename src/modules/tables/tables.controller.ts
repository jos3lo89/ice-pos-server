import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { FindTableQueryDto } from './dto/find-table-query.dto';

@Controller('tables')
export class TablesController {
  constructor(private readonly tableService: TablesService) {}

  @Post()
  create(@Body() body: CreateTableDto) {
    return this.tableService.create(body);
  }

  @Get()
  getTables(@Query() query: FindTableQueryDto) {
    return this.tableService.getTables(query);
  }
}
