import { AuthController } from '../src/modules/auth/auth.controller';
import { PatientsController } from '../src/modules/epr/patients/patients.controller';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
    getProfile: jest.Mock;
  };

  beforeEach(() => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      getProfile: jest.fn(),
    };

    controller = new AuthController(authService as any);
  });

  it('should call authService.register with dto', async () => {
    const dto = { email: 'test@example.com', password: 'pass' };
    const expected = { accessToken: 'at', refreshToken: 'rt' };
    authService.register.mockResolvedValue(expected);

    const result = await controller.register(dto as any);

    expect(authService.register).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('should call authService.login with dto', async () => {
    const dto = { email: 'test@example.com', password: 'pass' };
    const expected = { accessToken: 'at', refreshToken: 'rt' };
    authService.login.mockResolvedValue(expected);

    const result = await controller.login(dto as any);

    expect(authService.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('should call authService.refresh with refreshToken from dto', async () => {
    const dto = { refreshToken: 'rt-123' };
    const expected = { accessToken: 'at', refreshToken: 'rt' };
    authService.refresh.mockResolvedValue(expected);

    const result = await controller.refresh(dto as any);

    expect(authService.refresh).toHaveBeenCalledWith('rt-123');
    expect(result).toEqual(expected);
  });

  it('should call authService.getProfile with user.id', async () => {
    const user = { id: 'user-1' };
    const expected = { id: 'user-1', email: 'test@example.com' };
    authService.getProfile.mockResolvedValue(expected);

    const result = await controller.getProfile(user);

    expect(authService.getProfile).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(expected);
  });
});

describe('PatientsController', () => {
  let controller: PatientsController;
  let patientsService: {
    create: jest.Mock;
    search: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    deactivate: jest.Mock;
    getTimeline: jest.Mock;
    addEvent: jest.Mock;
  };

  beforeEach(() => {
    patientsService = {
      create: jest.fn(),
      search: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      getTimeline: jest.fn(),
      addEvent: jest.fn(),
    };

    controller = new PatientsController(patientsService as any);
  });

  it('should call patientsService.create with dto, user.id, and tenantId', async () => {
    const dto = { givenName: 'John', familyName: 'Doe' };
    const user = { id: 'user-1', email: 'u@e.com', role: 'ADMIN' };
    const tenantId = 'tenant-1';
    const expected = { id: 'p1', resourceType: 'Patient' };
    patientsService.create.mockResolvedValue(expected);

    const result = await controller.create(dto as any, user, tenantId);

    expect(patientsService.create).toHaveBeenCalledWith(dto, 'user-1', 'tenant-1');
    expect(result).toEqual(expected);
  });

  it('should call patientsService.search with dto and tenantId', async () => {
    const dto = { name: 'John', page: '1' };
    const tenantId = 'tenant-1';
    const expected = { total: 1, entry: [] };
    patientsService.search.mockResolvedValue(expected);

    const result = await controller.search(dto as any, tenantId);

    expect(patientsService.search).toHaveBeenCalledWith(dto, 'tenant-1');
    expect(result).toEqual(expected);
  });

  it('should call patientsService.findOne with id, tenantId, user.id, and user.role', async () => {
    const user = { id: 'user-1', email: 'u@e.com', role: 'CLINICIAN' };
    const tenantId = 'tenant-1';
    const expected = { id: 'p1', resourceType: 'Patient' };
    patientsService.findOne.mockResolvedValue(expected);

    const result = await controller.findOne('p1', user, tenantId);

    expect(patientsService.findOne).toHaveBeenCalledWith('p1', 'tenant-1', 'user-1', 'CLINICIAN');
    expect(result).toEqual(expected);
  });
});
