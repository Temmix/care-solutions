import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockHost: ArgumentsHost;
  let mockLogger: { logException: jest.Mock };
  let mockMetrics: { observeHttpException: jest.Mock };

  beforeEach(() => {
    mockLogger = { logException: jest.fn() };
    mockMetrics = { observeHttpException: jest.fn() };
    filter = new GlobalExceptionFilter(mockLogger as any, mockMetrics as any);
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => ({
          method: 'GET',
          url: '/test',
          user: { id: 'user-1' },
          headers: {},
        }),
      }),
    } as unknown as ArgumentsHost;
  });

  it('should handle HttpException with correct status and message', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        timestamp: expect.any(String),
      }),
    );
  });

  it('should flatten an object response to its readable message', () => {
    const exception = new HttpException(
      { message: 'Validation failed', errors: ['field required'] },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const jsonArg = mockResponse.json.mock.calls[0][0];
    expect(jsonArg.statusCode).toBe(HttpStatus.BAD_REQUEST);
    // message is the inner string, not the whole object — so the client can read it
    expect(jsonArg.message).toBe('Validation failed');
    expect(jsonArg.timestamp).toBeDefined();
  });

  it('should surface a string[] message (class-validator) for the client to join', () => {
    const exception = new HttpException(
      {
        statusCode: 400,
        message: ['name must be a string', 'age must be a number'],
        error: 'Bad Request',
      },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.json.mock.calls[0][0].message).toEqual([
      'name must be a string',
      'age must be a number',
    ]);
  });

  it('should flatten a nested 403 (RolesGuard) to its message string', () => {
    // Reproduces the bug: a Forbidden from @Roles previously left the whole
    // { statusCode, message, error } object as `message`, which the web client
    // could not read and showed as a generic error.
    const exception = new HttpException(
      { statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' },
      HttpStatus.FORBIDDEN,
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.json.mock.calls[0][0].message).toBe('Forbidden resource');
  });

  it('should handle non-HttpException as 500 Internal Server Error', () => {
    const exception = new Error('Something broke');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        timestamp: expect.any(String),
      }),
    );
  });

  it('should handle non-Error exception as 500', () => {
    const exception = 'string error';

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      }),
    );
  });

  it('should include a valid ISO timestamp', () => {
    const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost);

    const jsonArg = mockResponse.json.mock.calls[0][0];
    expect(() => new Date(jsonArg.timestamp)).not.toThrow();
    expect(new Date(jsonArg.timestamp).toISOString()).toBe(jsonArg.timestamp);
  });

  it('should handle HttpException with string response directly', () => {
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    filter.catch(exception, mockHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Forbidden',
      }),
    );
  });

  it('should call logger.logException for every caught exception', () => {
    const exception = new Error('Test error');

    filter.catch(exception, mockHost);

    expect(mockLogger.logException).toHaveBeenCalledWith(
      exception,
      expect.objectContaining({ service: 'HttpExceptionFilter' }),
      expect.objectContaining({ userId: 'user-1' }),
    );
  });
});
