import { ForbiddenException } from '@nestjs/common';
import { PatientsService } from '../src/modules/epr/patients/patients.service';

const build = () => {
  const prisma = {
    patient: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  };
  const encryption = { isEnabled: () => false };
  const service = new PatientsService(
    prisma as never,
    {} as never,
    encryption as never,
    {} as never,
    {} as never,
  );
  return { service, prisma };
};

describe('PatientsService tenant scoping (defence-in-depth)', () => {
  it('search() refuses a null tenant instead of spanning all tenants', async () => {
    const { service, prisma } = build();
    await expect(service.search({} as never, null)).rejects.toThrow(ForbiddenException);
    expect(prisma.patient.findMany).not.toHaveBeenCalled();
  });

  it('findOne() refuses a null tenant', async () => {
    const { service, prisma } = build();
    await expect(service.findOne('p1', null)).rejects.toThrow(ForbiddenException);
    expect(prisma.patient.findFirst).not.toHaveBeenCalled();
  });
});
