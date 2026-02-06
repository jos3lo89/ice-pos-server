import { Body, Controller, Post } from '@nestjs/common';
import { FloorsService } from './floors.service';

@Controller('floors')
export class FloorsController {
  constructor(private readonly floorService: FloorsService) {}

  @Post()
  create(@Body() body: any) {}
}
