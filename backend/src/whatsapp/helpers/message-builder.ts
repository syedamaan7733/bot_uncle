export class MessageBuilder {
    static getCategoryList(to: string, categories: any[]) {
        // Limit to 10 items for now as WhatsApp list limit is 10
        const rows = categories.slice(0, 10).map((cat) => ({
            id: `cat_${cat.id}`,
            title: cat.name.substring(0, 24), // Max 24 chars for title
            description: `Browse ${cat.slug} products`,
        }));

        return {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'interactive',
            interactive: {
                type: 'list',
                header: {
                    type: 'text',
                    text: 'Welcome to our store!',
                },
                body: {
                    text: 'Please select a category to browse our products:',
                },
                footer: {
                    text: 'Powered by Bot Uncle',
                },
                action: {
                    button: 'Browse Categories',
                    sections: [
                        {
                            title: 'Our Collections',
                            rows,
                        },
                    ],
                },
            },
        };
    }

    static getStoreLink(to: string, businessSlug: string, categorySlug: string, categoryId: string) {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        let url = `${baseUrl}/store/${businessSlug}`;
        let text = `Visit our store to view products:`;

        if (categorySlug) {
            url += `?category=${categoryId}`;
            text = `Click below to view the *${categorySlug}* collection:`;
        }

        return {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'text',
            text: {
                body: `${text}\n\n${url}`,
                preview_url: true,
            },
        };
    }

    static getTextMessage(to: string, text: string) {
        return {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'text',
            text: {
                body: text,
            },
        };
    }
}
