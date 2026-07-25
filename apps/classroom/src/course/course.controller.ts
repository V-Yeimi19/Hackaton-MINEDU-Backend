import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, Role } from '@minedu/common';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @Roles(Role.DOCENTE, Role.ADMIN)
  create(@Body() dto: CreateCourseDto) {
    return this.courseService.create(dto);
  }

  @Get()
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO)
  findAll() {
    return this.courseService.findAll();
  }

  @Get(':id')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO)
  findOne(@Param('id') id: string) {
    return this.courseService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.DOCENTE, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.courseService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.DOCENTE, Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.courseService.remove(id);
  }
}
