import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockHost: ArgumentsHost;
  let mockLogger: { logException: jest.Mock };

  beforeEach(() => {
    mockLogger = { logException: jest.fn() };
    filter = new GlobalExceptionFilter(mockLogger as any);
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

  it('should handle HttpException with object response', () => {
    const exception = new HttpException(
      { message: 'Validation failed', errors: ['field required'] },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const jsonArg = mockResponse.json.mock.calls[0][0];
    expect(jsonArg.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(jsonArg.timestamp).toBeDefined();
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
