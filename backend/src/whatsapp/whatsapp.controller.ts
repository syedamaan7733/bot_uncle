import { Controller, Get, Post, Query, Body, Res, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';
import { WebhookParser } from './helpers/webhook-parser';
import { Response } from 'express';

@Controller('whatsapp')
export class WhatsappController {
    private readonly logger = new Logger(WhatsappController.name);

    constructor(
        private readonly whatsappService: WhatsappService,
        private readonly configService: ConfigService,
    ) { }

    @Get('webhook')
    verifyWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
        @Res() res: Response,
    ) {
        const verifyToken = this.configService.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN');
        console.log(verifyToken, token)
        if (mode === 'subscribe' && token === verifyToken) {
            this.logger.log('Webhook verified successfully');
            res.status(HttpStatus.OK).send(challenge);
        } else {
            this.logger.error('Webhook verification failed');
            res.status(HttpStatus.FORBIDDEN).send();
        }
    }

    @Post('webhook')
    async handleWebhook(@Body() body: any) {
        // this.logger.log('Received webhook event'); // verbose

        try {
            const parsed = WebhookParser.parse(body);
            if (parsed) {
                await this.whatsappService.processWebhook(parsed);
            }
            return { status: 'success' };
        } catch (error) {
            this.logger.error(`Error processing webhook: ${error.message}`);
            return { status: 'error' };
        }
    }
}
