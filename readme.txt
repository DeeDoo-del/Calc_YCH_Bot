Описание
Этот Telegram бот позволяет пользователям рассчитывать стоимость доставки товаров на основе введенной цены в юанях, размера предмета и его хрупкости. Бот использует курс юаня и заданные проценты для расчета итоговой суммы.
Установка
Убедитесь, что у вас установлен Node.js.
Установите библиотеку node-telegram-bot-api:
npm install node-telegram-bot-api

Для запуска бота выполните в консоли команду:
node Index.js


Константы
javascript
const exchangeRate = 14; // курс юаня
const intermediaryPercentage = 1.1; // процент посредника

exchangeRate: курс юаня к рублю.
intermediaryPercentage: процент, добавляемый к итоговой сумме.
Хранение состояния пользователей
javascript
const userStates = {}; // Объект для хранения состояния пользователей

Используется для отслеживания состояния каждого пользователя, включая сообщения и текущие расчеты.
Функция расчета итоговой суммы
javascript
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

Рассчитывает итоговую сумму в рублях на основе введенной цены в юанях и курса.
Учитывает различные проценты в зависимости от стоимости товара.
Функция расчета стоимости доставки
javascript
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

Рассчитывает стоимость доставки на основе размера и веса товара.
Если вес не указан, возвращает фиксированную стоимость в зависимости от размера.
Функция отправки приветственного сообщения
javascript
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

Отправляет пользователю приветственное сообщение с кнопкой для начала расчета.
Обработка команды /start
javascript
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    userStates[chatId] = { messages: [], userMessages: [] }; // Инициализируем состояние пользователя
    sendWelcomeMessage(chatId);
});

Инициализирует состояние пользователя при запуске бота и отправляет приветственное сообщение.
Обработка сообщений от пользователя
javascript
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    if (!userStates[chatId]) {
        userStates[chatId] = { messages: [], userMessages: [] };
    }

    if (msg.text === 'Рассчитать стоимость') {
        userStates[chatId].calculating = true; // Устанавливаем флаг, что идет расчет

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

                // Обработка выбора размера и веса...
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

Обрабатывает нажатие кнопки "Рассчитать стоимость".
Запрашивает у пользователя цену товара и размер.
Если введено некорректное значение, отправляет сообщение об ошибке.