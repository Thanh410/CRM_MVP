import { Controller, Get, Post, Query, Body, Headers, Req, Res, HttpCode, ForbiddenException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { ZaloService } from './zalo.service';
import { Public } from '../../../common/decorators/public.decorator';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

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

  /** Zalo OA inbound webhook — signature verified */
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Body() body: any,
    @Headers('x-zevent-signature') signature: string,
    @Req() req: RawBodyRequest,
  ) {
    const rawBody = req.rawBody?.toString('utf8') ?? JSON.stringify(body);

    if (!this.zaloService.verifySignature(rawBody, signature)) {
      throw new ForbiddenException('Invalid Zalo webhook signature');
    }

    return this.zaloService.handleInbound(body);
  }
}
