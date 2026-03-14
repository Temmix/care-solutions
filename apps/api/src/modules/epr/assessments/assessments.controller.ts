import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto, UpdateAssessmentDto, SearchAssessmentsDto } from './dto';
import { Roles, CurrentUser, CurrentTenant } from '../../../common/decorators';
import { RolesGuard, TenantGuard } from '../../../common/guards';

interface RequestUser {
  id: string;
  email: string;
  globalRole: string;
}

@Controller('assessments')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class AssessmentsController {
  constructor(@Inject(AssessmentsService) private assessmentsService: AssessmentsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  create(
    @Body() dto: CreateAssessmentDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assessmentsService.create(dto, user.id, tenantId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  findAll(@Query() dto: SearchAssessmentsDto, @CurrentTenant() tenantId: string) {
    return this.assessmentsService.findAll(dto, tenantId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE, Role.CARER)
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.assessmentsService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assessmentsService.update(id, dto, user.id, tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.ADMIN)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assessmentsService.remove(id, user.id, tenantId);
  }

  @Patch(':id/review')
  @Roles(Role.ADMIN, Role.CLINICIAN)
  review(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assessmentsService.review(id, user.id, tenantId);
  }
}
