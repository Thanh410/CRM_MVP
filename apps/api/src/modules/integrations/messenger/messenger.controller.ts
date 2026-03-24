import { Controller, Get, Post, Query, Body, Res, HttpCode } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { MessengerService } from './messenger.service';
import { Public } from '../../../common/decorators/public.decorator';

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

  /** Meta inbound webhook */
  @Post('webhook')
  @HttpCode(200)
  handleWebhook(@Body() body: any) {
    return this.messengerService.handleInbound(body);
  }
}
