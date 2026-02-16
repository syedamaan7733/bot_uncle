export class WebhookParser {
    static parse(body: any) {
        if (body.object === 'whatsapp_business_account') {
            if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0] &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]
            ) {
                const value = body.entry[0].changes[0].value;
                const message = value.messages[0];
                const businessPhoneNumberId = value.metadata.phone_number_id;

                return {
                    from: message.from,
                    type: message.type,
                    businessPhoneNumberId,
                    message,
                    timestamp: message.timestamp
                };
            }
        }
        return null;
    }

    static getInteractiveSelection(message: any) {
        if (message.type === 'interactive' && message.interactive.type === 'list_reply') {
            return {
                id: message.interactive.list_reply.id,
                title: message.interactive.list_reply.title,
            };
        }
        return null;
    }
}
