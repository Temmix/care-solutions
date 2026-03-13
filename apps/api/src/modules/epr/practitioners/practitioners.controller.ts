import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { PractitionersService } from './practitioners.service';
import { CreatePractitionerDto, UpdatePractitionerDto } from './dto';
import { Roles, CurrentTenant } from '../../../common/decorators';
import { RolesGuard, TenantGuard } from '../../../common/guards';

@Controller('practitioners')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class PractitionersController {
  constructor(@Inject(PractitionersService) private practitionersService: PractitionersService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreatePractitionerDto, @CurrentTenant() tenantId: string) {
    return this.practitionersService.create(dto, tenantId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.CLINICIAN, Role.NURSE)
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.practitionersService.findAll(
      tenantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.practitionersService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePractitionerDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.practitionersService.update(id, dto, tenantId);
  }
}
