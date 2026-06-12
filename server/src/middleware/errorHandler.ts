import { Request, Response, NextFunction } from 'express';
import { AppError } from '../exceptions/AppError';
import { schedulerLogger as log } from '../utils/logger';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    if (!err.isOperational) {
      log.error(`[Unhandled] ${err.stack ?? err.message}`);
    }
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  log.error(`[Unexpected] ${err.stack ?? err.message}`);
  res.status(500).json({ success: false, message: 'Internal server error' });
};
