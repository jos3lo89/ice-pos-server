import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { FloorsService } from './floors.service';
import { CreateFloorDto } from './dto/create-floor.dto';
import { FindFloorSQueryDto } from './dto/find-floors-query.dto';

@Controller('floors')
export class FloorsController {
  constructor(private readonly floorService: FloorsService) {}

  @Post()
  create(@Body() body: CreateFloorDto) {
    return this.floorService.create(body);
  }

  @Get()
  getFloors(@Query() query: FindFloorSQueryDto) {
    return this.floorService.getFloors(query);
  }
}
