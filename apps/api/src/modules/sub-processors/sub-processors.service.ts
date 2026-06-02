import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, SubProcessor } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubProcessorDto } from './dto/create-sub-processor.dto';
import { UpdateSubProcessorDto } from './dto/update-sub-processor.dto';

const DEFAULT_NOTICE_DAYS = 30; // DPA: 30 days' notice of sub-processor changes
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RECENT_CHANGE_WINDOW_DAYS = 90;

/**
 * Platform-wide register of data sub-processors with advance-notice of changes.
 * Sub-processors are Clinvara's vendors (shared across all tenants), so this is
 * SUPER_ADMIN-managed; the current list and upcoming changes are readable by any
 * authenticated user for transparency.
 */
@Injectable()
export class SubProcessorsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  /** Sub-processors currently processing data: active+effective, plus announced
   *  removals still inside their notice period. */
  listCurrent(): Promise<SubProcessor[]> {
    const now = new Date();
    return this.prisma.subProcessor.findMany({
      where: {
        OR: [
          { status: 'ACTIVE', effectiveDate: { lte: now } },
          { status: 'REMOVED', effectiveDate: { gt: now } },
        ],
      },
      orderBy: { name: 'asc' },
    });
  }

  /** Notice feed: upcoming changes (future effective date) and recently announced ones. */
  listChanges(): Promise<SubProcessor[]> {
    const now = new Date();
    const recentCutoff = new Date(now.getTime() - RECENT_CHANGE_WINDOW_DAYS * MS_PER_DAY);
    return this.prisma.subProcessor.findMany({
      where: {
        OR: [{ effectiveDate: { gt: now } }, { announcedAt: { gte: recentCutoff } }],
      },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  async create(dto: CreateSubProcessorDto, actorId: string): Promise<SubProcessor> {
    const effectiveDate = dto.effectiveDate
      ? new Date(dto.effectiveDate)
      : new Date(Date.now() + this.noticeDays() * MS_PER_DAY);

    const created = await this.prisma.subProcessor.create({
      data: {
        name: dto.name,
        purpose: dto.purpose,
        location: dto.location,
        url: dto.url ?? null,
        notes: dto.notes ?? null,
        effectiveDate,
        createdById: actorId,
      },
    });

    await this.audit(actorId, 'CREATE_SUBPROCESSOR', created);
    return created;
  }

  async update(id: string, dto: UpdateSubProcessorDto, actorId: string): Promise<SubProcessor> {
    const existing = await this.prisma.subProcessor.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Sub-processor not found.');

    const data: Prisma.SubProcessorUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.purpose !== undefined) data.purpose = dto.purpose;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.url !== undefined) data.url = dto.url;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.effectiveDate !== undefined) data.effectiveDate = new Date(dto.effectiveDate);

    // Announcing a removal without an explicit date starts the notice clock.
    if (dto.status === 'REMOVED' && dto.effectiveDate === undefined) {
      data.effectiveDate = new Date(Date.now() + this.noticeDays() * MS_PER_DAY);
    }
    // Any change re-stamps the announcement time.
    data.announcedAt = new Date();

    const updated = await this.prisma.subProcessor.update({ where: { id }, data });
    await this.audit(actorId, 'UPDATE_SUBPROCESSOR', updated);
    return updated;
  }

  private noticeDays(): number {
    const raw = this.config.get<string>('SUB_PROCESSOR_NOTICE_DAYS');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_NOTICE_DAYS;
  }

  private async audit(
    actorId: string,
    action: 'CREATE_SUBPROCESSOR' | 'UPDATE_SUBPROCESSOR',
    sp: SubProcessor,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action,
        resource: 'SubProcessor',
        resourceId: sp.id,
        metadata: {
          name: sp.name,
          status: sp.status,
          effectiveDate: sp.effectiveDate.toISOString(),
        },
      },
    });
  }
}
