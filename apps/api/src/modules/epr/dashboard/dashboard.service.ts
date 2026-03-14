import { Injectable, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async getStats(tenantId: string | null) {
    const patientWhere: Prisma.PatientWhereInput = { active: true };
    const userWhere: Prisma.UserWhereInput = { isActive: true };
    const practitionerWhere: Prisma.PractitionerWhereInput = { active: true };
    const eventWhere: Prisma.PatientEventWhereInput = {};

    const shiftWhere: Prisma.ShiftWhereInput = {};
    const encounterWhere: Prisma.EncounterWhereInput = { status: 'IN_PROGRESS' };
    const bedWhere: Prisma.BedWhereInput = { status: 'AVAILABLE' };

    if (tenantId) {
      patientWhere.tenantId = tenantId;
      userWhere.tenantId = tenantId;
      practitionerWhere.tenantId = tenantId;
      eventWhere.tenantId = tenantId;
      shiftWhere.tenantId = tenantId;
      encounterWhere.tenantId = tenantId;
      bedWhere.tenantId = tenantId;
    }

    // Shifts this week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    shiftWhere.date = { gte: startOfWeek, lt: endOfWeek };

    const [
      totalPatients,
      totalUsers,
      totalPractitioners,
      totalEvents,
      totalShifts,
      totalEncounters,
      totalAvailableBeds,
      recentPatients,
      recentEvents,
      genderBreakdown,
    ] = await Promise.all([
      this.prisma.patient.count({ where: patientWhere }),
      this.prisma.user.count({ where: userWhere }),
      this.prisma.practitioner.count({ where: practitionerWhere }),
      this.prisma.patientEvent.count({ where: eventWhere }),
      this.prisma.shift.count({ where: shiftWhere }),
      this.prisma.encounter.count({ where: encounterWhere }),
      this.prisma.bed.count({ where: bedWhere }),
      this.prisma.patient.findMany({
        where: patientWhere,
        select: {
          id: true,
          givenName: true,
          familyName: true,
          gender: true,
          birthDate: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.patientEvent.findMany({
        where: eventWhere,
        select: {
          id: true,
          eventType: true,
          summary: true,
          occurredAt: true,
          patient: { select: { givenName: true, familyName: true } },
          recordedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { occurredAt: 'desc' },
        take: 5,
      }),
      this.prisma.patient.groupBy({
        by: ['gender'],
        where: patientWhere,
        _count: true,
      }),
    ]);

    return {
      counts: {
        patients: totalPatients,
        users: totalUsers,
        practitioners: totalPractitioners,
        events: totalEvents,
        shifts: totalShifts,
        encounters: totalEncounters,
        availableBeds: totalAvailableBeds,
      },
      recentPatients: recentPatients.map((p) => ({
        id: p.id,
        name: `${p.givenName} ${p.familyName}`,
        gender: p.gender,
        birthDate: p.birthDate.toISOString().split('T')[0],
        createdAt: p.createdAt.toISOString(),
      })),
      recentEvents: recentEvents.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        summary: e.summary,
        occurredAt: e.occurredAt.toISOString(),
        patientName: `${e.patient.givenName} ${e.patient.familyName}`,
        recordedBy: `${e.recordedBy.firstName} ${e.recordedBy.lastName}`,
      })),
      genderBreakdown: genderBreakdown.map((g) => ({
        gender: g.gender,
        count: g._count,
      })),
    };
  }
}
