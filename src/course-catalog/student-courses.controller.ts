import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CourseEnrollmentService } from './course-enrollment.service';
import { MyCourseDto } from './dto/my-course.dto';

@ApiTags('Course Catalog')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'students/me/courses',
  version: '1',
})
export class StudentCoursesController {
  constructor(
    private readonly courseEnrollmentService: CourseEnrollmentService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Courses the current student is enrolled in',
    description: 'Ordered by enrollment date, newest first.',
  })
  @ApiOkResponse({ type: [MyCourseDto] })
  findMyCourses(@Request() request): Promise<MyCourseDto[]> {
    return this.courseEnrollmentService.findMyCourses(request.user.id);
  }
}
