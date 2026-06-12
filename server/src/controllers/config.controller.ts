import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '../services/config.service';
import { SystemConfigRepository } from '../repositories/implementations/SystemConfigRepository';
import { sendSuccess, sendError } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

const configService = new ConfigService(new SystemConfigRepository());

export class ConfigController {

  getConfig = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    const config = await configService.getConfig();
    sendSuccess(res, { ...config, llm_api_key: config.llm_api_key ? '****' : '' });
  });

  updateConfig = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { key, value } = req.body as { key: string; value: string };
    if (!key || value === undefined) { sendError(res, 'key and value are required', 400); return; }
    await configService.updateConfig({ [key]: value }, req.user!.employeeId);
    sendSuccess(res, { message: 'Configuration updated.' });
  });
}
