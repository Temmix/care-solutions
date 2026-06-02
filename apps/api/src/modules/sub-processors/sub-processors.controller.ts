import { Controller, Get, Post, Patch, Body, Param, UseGuards, Inject } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { SubProcessorsService } from './sub-processors.service';
import { CreateSubProcessorDto } from './dto/create-sub-processor.dto';
import { UpdateSubProcessorDto } from './dto/update-sub-processor.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

interface RequestUser {
  id: string;
  email: string;
  globalRole: string;
}

/**
 * Sub-processor register. Reads are open to any authenticated user (transparency
 * — tenants can see who processes their data and upcoming changes). Mutations
 * are SUPER_ADMIN-only and platform-level (no TenantGuard).
 */
@Controller('sub-processors')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SubProcessorsController {
  constructor(@Inject(SubProcessorsService) private readonly subProcessors: SubProcessorsService) {}

  /** Current sub-processors (includes announced removals still in their notice period). */
  @Get()
  listCurrent() {
    return this.subProcessors.listCurrent();
  }

  /** Upcoming and recently announced changes — the 30-day notice feed. */
  @Get('changes')
  listChanges() {
    return this.subProcessors.listChanges();
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(@Body() dto: CreateSubProcessorDto, @CurrentUser() user: RequestUser) {
    return this.subProcessors.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSubProcessorDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.subProcessors.update(id, dto, user.id);
  }
}
