import { StatusCodes } from "http-status-codes";

class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(
    statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    message: string,
    public errorCode?: string,
    isOperational = true,
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message: string, errorCode?: string) {
    return new ApiError(StatusCodes.BAD_REQUEST, message, errorCode);
  }

  static unauthorized(message: string, errorCode?: string) {
    return new ApiError(StatusCodes.UNAUTHORIZED, message, errorCode);
  }

  static notFound(message: string, errorCode?: string) {
    return new ApiError(StatusCodes.NOT_FOUND, message, errorCode);
  }

  static internal(message: string, errorCode?: string) {
    return new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, message, errorCode);
  }

  static validationError(
    errors: Record<string, string>,
    errorCode = "VALIDATION_ERROR"
  ) {
    const message = Object.values(errors).filter(Boolean).join(", ");
    return new ApiError(StatusCodes.BAD_REQUEST, message, errorCode);
  }
}

export default ApiError;
