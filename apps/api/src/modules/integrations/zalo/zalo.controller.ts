import { Controller, Get, Post, Query, Body, Headers, Res, HttpCode } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ZaloService } from './zalo.service';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('integrations/zalo')
@Public()
@Controller('integrations/zalo')
export class ZaloController {
  constructor(private readonly zaloService: ZaloService) {}

  /** Zalo OA webhook verification */
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') token: string,
    @Res() res: Response,
  ) {
    if (mode === 'subscribe' && this.zaloService.verifyToken(token)) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  /** Zalo OA inbound webhook */
  @Post('webhook')
  @HttpCode(200)
  handleWebhook(
    @Body() body: any,
    @Headers('x-zevent-signature') signature: string,
  ) {
    return this.zaloService.handleInbound(body, signature);
  }
}
