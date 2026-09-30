/**
 * Клиентский модуль для взаимодействия с API авторизации и регистрации.
 * Работает как в браузере, так и в Node.js (начиная с Node.js 18+ fetch встроен глобально).
 */

// Базовый URL сервера (VDS сервер)
const BASE_URL = "http://45.141.184.186:3000";

/**
 * Регистрация нового пользователя
 * @param {string} user - Имя пользователя (логин)
 * @param {string} password - Пароль
 * @returns {Promise<{ status: number, data: object }>} Ответ сервера со статусом и распарсенными данными
 */
async function registerUser(user, password) {
    try {
        // Отправляем POST-запрос на маршрут /register
        const response = await fetch(`${BASE_URL}/register`, {
            method: "POST",
            headers: {
                // Обязательно указываем Content-Type, чтобы сервер знал, что отправлен JSON
                "Content-Type": "application/json"
            },
            // Сериализуем объект с логином и паролем в строку JSON
            body: JSON.stringify({ user, password })
        });

        // Считываем тело ответа сервера в формате JSON
        const data = await response.json();

        // Возвращаем объект со статусом ответа и полученными данными
        return {
            status: response.status,
            data: data
        };
    } catch (error) {
        console.error("Ошибка при выполнении сетевого запроса регистрации:", error.message);
        throw error;
    }
}

/**
 * Авторизация (вход) пользователя
 * @param {string} user - Имя пользователя (логин)
 * @param {string} password - Пароль
 * @returns {Promise<{ status: number, data: object }>} Ответ сервера со статусом и распарсенными данными
 */
async function loginUser(user, password) {
    try {
        // Отправляем POST-запрос на маршрут /login
        const response = await fetch(`${BASE_URL}/login`, {
            method: "POST",
            headers: {
                // Заголовок формата отправляемых данных
                "Content-Type": "application/json"
            },
            // Тело запроса с учетными данными
            body: JSON.stringify({ user, password })
        });

        // Считываем JSON-ответ
        const data = await response.json();

        // Возвращаем статус и тело ответа
        return {
            status: response.status,
            data: data
        };
    } catch (error) {
        console.error("Ошибка при выполнении сетевого запроса авторизации:", error.message);
        throw error;
    }
}

/**
 * Обновление количества игр пользователя с одновременной авторизацией
 * @param {string} user - Имя пользователя (логин)
 * @param {string} password - Пароль для авторизации
 * @param {number} games - Новое количество сыгранных игр
 * @returns {Promise<{ status: number, data: object }>} Ответ сервера со статусом и данными
 */
async function updateGames(user, password, games) {
    try {
        // Отправляем POST-запрос на маршрут /update-games
        const response = await fetch(`${BASE_URL}/update-games`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            // Передаем логин, пароль и новое значение games в JSON
            body: JSON.stringify({ user, password, games })
        });

        // Считываем JSON-ответ сервера
        const data = await response.json();

        return {
            status: response.status,
            data: data
        };
    } catch (error) {
        console.error("Ошибка при выполнении сетевого запроса обновления игр:", error.message);
        throw error;
    }
}

/**
 * Получение таблицы рекордов среди зарегистрированных пользователей
 * @returns {Promise<{ status: number, data: object }>} Ответ сервера с таблицей лидеров
 */
async function fetchLeaderboard() {
    try {
        const response = await fetch(`${BASE_URL}/leaderboard`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        return {
            status: response.status,
            data: data
        };
    } catch (error) {
        console.error("Ошибка при получении таблицы рекордов:", error.message);
        throw error;
    }
}

// ==========================================
// ПРИМЕР ИСПОЛЬЗОВАНИЯ ФУНКЦИЙ
// ==========================================
async function exampleUsage() {
    console.log("=== Запуск примера работы клиентских функций ===");

    // Сгенерируем тестового пользователя
    const testUsername = "player_" + Math.floor(Math.random() * 10000);
    const testPassword = "secret_password123";

    // ----------------------------------------------------
    // Пример 1: Регистрация нового пользователя
    // ----------------------------------------------------
    console.log(`\n1. Пробуем зарегистрировать пользователя: ${testUsername}`);
    const regResult = await registerUser(testUsername, testPassword);
    console.log(`HTTP статус: ${regResult.status}`);
    console.log("Ответ сервера:", regResult.data);

    if (regResult.status === 201 && regResult.data.success) {
        console.log(`Успех: Пользователь создан с ID = ${regResult.data.userId}`);
    } else {
        console.log(`Регистрация не удалась: ${regResult.data.message}`);
    }

    // ----------------------------------------------------
    // Пример 2: Успешный вход зарегистрированного пользователя
    // ----------------------------------------------------
    console.log(`\n2. Пробуем войти под зарегистрированным пользователем: ${testUsername}`);
    const loginResult = await loginUser(testUsername, testPassword);
    console.log(`HTTP статус: ${loginResult.status}`);
    console.log("Ответ сервера:", loginResult.data);

    if (loginResult.status === 200 && loginResult.data.success) {
        console.log(`Успешный вход! Пользователь: ${loginResult.data.user}, сыграно игр: ${loginResult.data.games}`);
    } else {
        console.log(`Ошибка входа: ${loginResult.data.message}`);
    }

    // ----------------------------------------------------
    // Пример 3: Обновление количества игр (games = 7)
    // ----------------------------------------------------
    console.log(`\n3. Пробуем обновить количество игр для: ${testUsername}`);
    const updateResult = await updateGames(testUsername, testPassword, 7);
    console.log(`HTTP статус: ${updateResult.status}`);
    console.log("Ответ сервера:", updateResult.data);

    if (updateResult.status === 200 && updateResult.data.success) {
        console.log(`Игры успешно обновлены! Текущее количество игр: ${updateResult.data.games}`);
    } else {
        console.log(`Не удалось обновить игры: ${updateResult.data.message}`);
    }

    // ----------------------------------------------------
    // Пример 4: Попытка входа с неверным паролем
    // ----------------------------------------------------
    console.log(`\n4. Пробуем войти с неверным паролем`);
    const badLoginResult = await loginUser(testUsername, "wrong_password");
    console.log(`HTTP статус: ${badLoginResult.status}`);
    console.log("Ответ сервера:", badLoginResult.data);
}

// Если файл запускается напрямую через Node.js (node clientAuth.js), выполняем пример
if (typeof require !== "undefined" && require.main === module) {
    exampleUsage().catch(console.error);
}

// Экспорт для использования в качестве модуля (CommonJS)
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        registerUser,
        loginUser,
        updateGames,
        fetchLeaderboard
    };
}
