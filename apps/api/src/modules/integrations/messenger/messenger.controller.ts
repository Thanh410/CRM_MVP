import { Controller, Get, Post, Query, Body, Headers, Req, Res, HttpCode, ForbiddenException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { MessengerService } from './messenger.service';
import { Public } from '../../../common/decorators/public.decorator';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

@ApiTags('integrations/messenger')
@Public()
@Controller('integrations/messenger')
export class MessengerController {
  constructor(private readonly messengerService: MessengerService) {}

  /** Meta webhook verification */
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') token: string,
    @Res() res: Response,
  ) {
    if (mode === 'subscribe' && this.messengerService.verifyToken(token)) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  /** Meta inbound webhook — X-Hub-Signature-256 verified */
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string,
    @Req() req: RawBodyRequest,
  ) {
    const rawBody = req.rawBody?.toString('utf8') ?? JSON.stringify(body);

    if (!this.messengerService.verifySignature(rawBody, signature)) {
      throw new ForbiddenException('Invalid Messenger webhook signature');
    }

    return this.messengerService.handleInbound(body);
  }
}
