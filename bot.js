const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const crypto = require('crypto');

// ТВОИ ТОКЕНЫ
const BOT_TOKEN = '9178113601:AAGYYwyzjGmUn8CM3FjwIt5v-Rxe55XexH8';
const CRYPTO_TOKEN = '685620:AA1PIMQfEAa06fJ5cR7i0pUMQNGLAQ8OpeS';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const prices = {
    'minecraft': '2',
    'cs2': '5',
    'roblox': '3'
};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Minecraft (2 USDT)', callback_data: 'buy_minecraft' }],
                [{ text: 'CS2 (5 USDT)', callback_data: 'buy_cs2' }],
                [{ text: 'Roblox (3 USDT)', callback_data: 'buy_roblox' }]
            ]
        }
    };
    bot.sendMessage(chatId, "Здравствуйте! Какой вам требуется чит?", opts);
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith('buy_')) {
        const game = data.replace('buy_', '');
        const amount = prices[game];

        try {
            const response = await axios.post('https://pay.crypt.bot/api/createInvoice', {
                asset: 'USDT',
                amount: amount,
                description: Чит для ${game},
                payload: ${chatId}_${game}
            }, {
                headers: { 'Crypto-Pay-API-Token': CRYPTO_TOKEN }
            });

            if (response.data.ok) {
                const payUrl = response.data.result.bot_invoice_url;
                const opts = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Оплатить', url: payUrl }],
                            [{ text: 'Я оплатил (Проверить)', callback_data: check_${game} }]
                        ]
                    }
                };
                bot.sendMessage(chatId, Счет на ${amount} USDT создан. Оплатите по ссылке и нажмите кнопку проверки., opts);
            } else {
                bot.sendMessage(chatId, "Ошибка при создании счета.");
            }
        } catch (e) {
            bot.sendMessage(chatId, "Ошибка сети при создании счета.");
        }
    }

    if (data.startsWith('check_')) {
        const game = data.replace('check_', '');
        try {
            const response = await axios.get('https://pay.crypt.bot/api/getInvoices', {
                headers: { 'Crypto-Pay-API-Token': CRYPTO_TOKEN }
            });

            let paid = false;
            if (response.data.ok) {
                for (const item of response.data.result.items) {
                    if (item.status === 'paid' && item.payload === ${chatId}_${game}) {
                        paid = true;
                        const code = crypto.randomBytes(2).toString('hex').toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
                        
                        let msg = Оплата получена! Ваш код: <b>${code}</b>\n\n;
                        msg += "Инструкция по установке:\n";
                        msg += "1. Скачайте инжектор: https://t.me/your_channel\n";
                        msg += "2. Введите ключ.\n\n";
                        msg += "⚠️ <b>Внимание:</b> Мы не несем ответственности за блокировку аккаунта.";

                        bot.sendMessage(chatId, msg, { parse_mode: 'HTML' });

                        await axios.post('https://pay.crypt.bot/api/deleteInvoice', 
                            { invoice_id: item.invoice_id },
                            { headers: { 'Crypto-Pay-API-Token': CRYPTO_TOKEN } }
                        );
                        break;
                    }
                }
            }

            if (!paid) {
                bot.sendMessage(chatId, "Оплата еще не поступила. Подождите минуту и нажмите снова.");
            }
        } catch (e) {
            bot.sendMessage(chatId, "Ошибка при проверке оплаты.");
        }
    }
});

console.log("Бот запущен!");
