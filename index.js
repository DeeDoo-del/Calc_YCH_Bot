const TelegramBot = require('node-telegram-bot-api');

// Замените 'YOUR_TELEGRAM_BOT_TOKEN' на ваш токен
const token = '7906003424:AAEGvfNZTJQ-bdMGLpJAm9hXkElQbW4ntsI';

// Создаем экземпляр бота с использованием polling
const bot = new TelegramBot(token, { polling: true });

const exchangeRate = 14; // курс юаня
const intermediaryPercentage = 1.1; // процент посредника

// Хранение состояния пользователя
const userStates = {}; // Объект для хранения состояния пользователей

// Функция для расчета итоговой суммы
function calculateFinalAmount(priceInYuan) {
    let amountInRubles = priceInYuan * exchangeRate * intermediaryPercentage;
    let treasuryPercentage;

    if (priceInYuan <= 100) {
        treasuryPercentage = 1.6; // 60%
    } else if (priceInYuan <= 200) {
        treasuryPercentage = 1.4; // 40%
    } else if (priceInYuan <= 500) {
        treasuryPercentage = 1.35; // 35%
    } else {
        treasuryPercentage = 1.25; // 25%
    }

    return amountInRubles * treasuryPercentage;
}

// Функция для расчета стоимости доставки
function calculateDeliveryCost(size, weight) {
    if (weight !== null) {
        return weight * 1000; // Стоимость доставки составляет 1 рубль за грамм
    } else {
        switch (size) {
            case 'Мелкий':
                return 100;
            case 'Средний':
                return 200;
            case 'Крупный':
                return 700; // Можно добавить логику для тяжелых предметов
            default:
                return 0;
        }
    }
}

// Функция для отправки приветственного сообщения с кнопкой
function sendWelcomeMessage(chatId) {
    const welcomeMessage = 'Нажмите кнопку для расчета стоимости:';
    const options = {
        reply_markup: {
            keyboard: [['Рассчитать стоимость']],
            one_time_keyboard: true,
            resize_keyboard: true // Уменьшает размер клавиатуры до нужного
        }
    };
    bot.sendMessage(chatId, welcomeMessage, options);
}

// Приветственное сообщение с кнопкой
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    userStates[chatId] = { messages: [], userMessages: [] }; // Инициализируем состояние пользователя
    sendWelcomeMessage(chatId);
});

// Обработка нажатия кнопки "Рассчитать стоимость"
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    // Инициализация состояния пользователя, если оно еще не существует
    if (!userStates[chatId]) {
        userStates[chatId] = { messages: [], userMessages: [] };
    }

    if (msg.text === 'Рассчитать стоимость') {
        userStates[chatId].calculating = true; // Устанавливаем флаг, что идет расчет

        // Удаляем предыдущие сообщения из чата
        for (const messageId of userStates[chatId].messages) {
            try {
                await bot.deleteMessage(chatId, messageId);
            } catch (error) {
                console.error(`Не удалось удалить сообщение ${messageId}: ${error.message}`);
            }
        }

        for (const userMessage of userStates[chatId].userMessages) {
            try {
                await bot.deleteMessage(chatId, userMessage);
            } catch (error) {
                console.error(`Не удалось удалить сообщение пользователя ${userMessage}: ${error.message}`);
            }
        }

        userStates[chatId].messages = []; // Очищаем массив идентификаторов сообщений бота
        userStates[chatId].userMessages = []; // Очищаем массив идентификаторов сообщений пользователя

        const priceMessage = await bot.sendMessage(chatId, 'Пожалуйста, введите цену в юанях:');
        userStates[chatId].messages.push(priceMessage.message_id); // Сохраняем идентификатор сообщения

        // Обработка ввода цены
        bot.once('message', async (msg) => {
            const priceInYuan = parseFloat(msg.text);
            userStates[chatId].userMessages.push(msg.message_id); // Сохраняем идентификатор сообщения пользователя

            if (!isNaN(priceInYuan)) {
                await bot.deleteMessage(chatId, priceMessage.message_id); // Удаляем сообщение о цене

                const sizeOptions = {
                    reply_markup: {
                        keyboard: [['Мелкий (Примерно до 150гр)'], ['Средний (Примерно от 150 до 500гр)'], ['Крупный (Примерно выше 500гр)'], ['Чайник']],
                        one_time_keyboard: true,
                        resize_keyboard: true
                    }
                };

                const sizeMessage = await bot.sendMessage(chatId, 'Выберите тип предмета:', sizeOptions);
                userStates[chatId].messages.push(sizeMessage.message_id); // Сохраняем идентификатор сообщения

                bot.once('message', async (msg) => {
                    let size;
                    let weight;

                    if (msg.text === 'Чайник') {
                        size = 'Крупный';
                        weight = null; // Вес не нужен для чайника

                        const deliveryCost = calculateDeliveryCost(size, weight);
                        const finalAmount = calculateFinalAmount(priceInYuan);

                        let totalAmount = finalAmount + deliveryCost;

                        totalAmount *= 1.1; // Чайник считается хрупким

                        const totalAmountMessage = await bot.sendMessage(chatId, `Итоговая сумма с учетом всех факторов: ${totalAmount.toFixed(2)} рублей.`);
                        userStates[chatId].messages.push(totalAmountMessage.message_id);
                        userStates[chatId].calculating = false;

                        sendWelcomeMessage(chatId);
                    } else {
                        size = msg.text;
                        userStates[chatId].userMessages.push(msg.message_id); // Сохраняем идентификатор сообщения пользователя

                        const weightOptions = {
                            reply_markup: {
                                keyboard: [['Не знаю'], ['Введите вес предмета в кг (например, 0.5)']],
                                one_time_keyboard: true,
                                resize_keyboard: true
                            }
                        };

                        const weightMessage = await bot.sendMessage(chatId, 'Введите примерный вес предмета в кг (например, 0.5):', weightOptions);
                        userStates[chatId].messages.push(weightMessage.message_id);

                        bot.once('message', async (msg) => {
                            if (msg.text === 'Не знаю') {
                                weight = null;
                            } else {
                                weight = parseFloat(msg.text);
                                userStates[chatId].userMessages.push(msg.message_id); // Сохраняем идентификатор сообщения пользователя
                            }

                            const deliveryCost = calculateDeliveryCost(size, weight);
                            const finalAmount = calculateFinalAmount(priceInYuan);

                            let totalAmount = finalAmount + deliveryCost;

                            const fragileOptions = {
                                reply_markup: {
                                    keyboard: [['Да'], ['Нет']],
                                    one_time_keyboard: true,
                                    resize_keyboard: true
                                }
                            };

                            const fragileMessage = await bot.sendMessage(chatId, 'Предмет хрупкий?', fragileOptions);
                            userStates[chatId].messages.push(fragileMessage.message_id);

                            bot.once('message', async (msg) => {
                                const isFragile = msg.text.toLowerCase();
                                if (isFragile === 'да') {
                                    totalAmount *= 1.1;
                                }

                                const totalAmountMessage = await bot.sendMessage(chatId, `Итоговая сумма с учетом всех факторов: ${totalAmount.toFixed(2)} рублей.`);
                                userStates[chatId].messages.push(totalAmountMessage.message_id);
                                userStates[chatId].calculating = false;

                                sendWelcomeMessage(chatId);
                            });
                        });
                    }
                });
            } else {
                await bot.sendMessage(chatId, 'Пожалуйста, введите корректное число.');
                userStates[chatId].calculating = false;
                sendWelcomeMessage(chatId);
            }
        });
    } else if (msg.text !== '/start' && !userStates[chatId].calculating) {
        sendWelcomeMessage(chatId);
    }
});