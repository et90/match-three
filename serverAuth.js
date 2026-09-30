// Подключаем библиотеку dotenv для чтения переменных окружения из файла .env
require("dotenv").config();

// Подключаем встроенный модуль http для создания веб-сервера
const http = require("http");
const fs = require("fs");
const path = require("path");

// Подключаем драйвер mysql2 для работы с базой данных MySQL
const mysql = require("mysql2");

// Порт для HTTP-сервера (из .env или по умолчанию 3000)
const PORT = process.env.PORT || 3000;

// Создаем пул подключений к базе данных
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: {
        rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Проверяем подключение к MySQL базе данных через пул
pool.getConnection((err, conn) => {
    if (err) {
        console.error("Ошибка подключения к MySQL базе данных:", err.message);
        return;
    }
    console.log("Успешное подключение к MySQL базе данных (пул соединений)!");
    conn.release();
});

/**
 * Вспомогательная функция для отправки JSON-ответа клиенту
 * @param {http.ServerResponse} res - Объект ответа сервера
 * @param {number} statusCode - HTTP-статус ответа (200, 400, 404, 500 и т.д.)
 * @param {object} data - Данные в формате JavaScript-объекта
 */
function sendJsonResponse(res, statusCode, data) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end(JSON.stringify(data));
}

/**
 * Вспомогательная функция для считывания и парсинга тела входящего запроса (Request Body)
 * @param {http.IncomingMessage} req - Объект запроса
 * @returns {Promise<object>} Распарсенный JSON-объект
 */
function parseRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";

        // Считываем чанки (фрагменты) данных по мере их поступления
        req.on("data", (chunk) => {
            body += chunk;
            // Защита от переполнения памяти (лимит 1 МБ)
            if (body.length > 1e6) {
                req.destroy();
                reject(new Error("Превышен максимальный размер тела запроса (1 MB)"));
            }
        });

        // Завершение приема данных
        req.on("end", () => {
            if (!body) {
                return resolve({});
            }
            try {
                const parsed = JSON.parse(body);
                resolve(parsed);
            } catch (err) {
                reject(new Error("Некорректный формат JSON"));
            }
        });

        // Обработка ошибки сокета/потока
        req.on("error", (err) => {
            reject(err);
        });
    });
}

// Создаем HTTP-сервер
const server = http.createServer(async (req, res) => {
    // Получаем URL и HTTP-метод запроса
    const { url, method } = req;

    // Обработка CORS preflight запросов (OPTIONS)
    if (method === "OPTIONS") {
        res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        });
        return res.end();
    }

    // ==========================================
    // 1. ТОЧКА ВХОДА: РЕГИСТРАЦИЯ (/register)
    // ==========================================
    if (url === "/register" && method === "POST") {
        try {
            const body = await parseRequestBody(req);
            const { user, password } = body;

            // Валидация: проверяем, что логин и пароль переданы
            if (!user || !password) {
                return sendJsonResponse(res, 400, {
                    success: false,
                    message: "Имя пользователя (user) и пароль (password) обязательны для регистрации"
                });
            }

            // Проверяем существование пользователя с таким именем
            // Используем плейсхолдер '?' для защиты от базовых SQL-инъекций
            const checkUserQuery = "SELECT id FROM users WHERE user = ?";
            pool.query(checkUserQuery, [user], (err, results) => {
                if (err) {
                    console.error("Ошибка при проверке пользователя:", err);
                    return sendJsonResponse(res, 500, {
                        success: false,
                        message: "Внутренняя ошибка сервера при обращении к базе данных"
                    });
                }

                // Если пользователь уже найден в базе данных
                if (results.length > 0) {
                    return sendJsonResponse(res, 409, {
                        success: false,
                        message: "Пользователь с таким именем уже существует"
                    });
                }

                // Если пользователя нет — добавляем нового пользователя с 1 открытым уровнем
                const insertUserQuery = "INSERT INTO users (user, password, games) VALUES (?, ?, 1)";
                pool.query(insertUserQuery, [user, password], (insertErr, insertResult) => {
                    if (insertErr) {
                        console.error("Ошибка при регистрации пользователя:", insertErr);
                        return sendJsonResponse(res, 500, {
                            success: false,
                            message: "Ошибка при сохранении пользователя в базе данных"
                        });
                    }

                    // Успешная регистрация
                    return sendJsonResponse(res, 201, {
                        success: true,
                        message: "Пользователь успешно зарегистрирован",
                        userId: insertResult.insertId,
                        user: user,
                        games: 1
                    });
                });
            });
        } catch (err) {
            return sendJsonResponse(res, 400, {
                success: false,
                message: err.message
            });
        }
    }

    // ==========================================
    // 2. ТОЧКА ВХОДА: АВТОРИЗАЦИЯ (/login)
    // ==========================================
    else if (url === "/login" && method === "POST") {
        try {
            const body = await parseRequestBody(req);
            const { user, password } = body;

            // Валидация: проверяем, что переданы имя пользователя и пароль
            if (!user || !password) {
                return sendJsonResponse(res, 400, {
                    success: false,
                    message: "Имя пользователя (user) и пароль (password) обязательны для авторизации"
                });
            }

            // Ищем пользователя по имени
            const findUserQuery = "SELECT id, user, password, games FROM users WHERE user = ?";
            pool.query(findUserQuery, [user], (err, results) => {
                if (err) {
                    console.error("Ошибка при поиске пользователя:", err);
                    return sendJsonResponse(res, 500, {
                        success: false,
                        message: "Внутренняя ошибка сервера при обращении к базе данных"
                    });
                }

                // 1) Проверка: зарегистрирован ли пользователь
                if (results.length === 0) {
                    return sendJsonResponse(res, 404, {
                        success: false,
                        message: "Пользователь с таким именем не найден (не зарегистрирован)"
                    });
                }

                const foundUser = results[0];

                // 2) Проверка пароля (в учебном проекте пароли без хеширования)
                if (foundUser.password !== password) {
                    return sendJsonResponse(res, 401, {
                        success: false,
                        message: "Неверный пароль"
                    });
                }

                // 3) При удачной проверке возвращаем сообщение и количество игр
                return sendJsonResponse(res, 200, {
                    success: true,
                    message: "Авторизация прошла успешно",
                    user: foundUser.user,
                    games: foundUser.games
                });
            });
        } catch (err) {
            return sendJsonResponse(res, 400, {
                success: false,
                message: err.message
            });
        }
    }

    // ==========================================
    // 3. ТОЧКА ВХОДА: ОБНОВЛЕНИЕ ИГР С АВТОРИЗАЦИЕЙ (/update-games)
    // ==========================================
    else if (url === "/update-games" && method === "POST") {
        try {
            const body = await parseRequestBody(req);
            const { user, password, games } = body;

            // Валидация: проверяем логин, пароль и наличие поля games
            if (!user || !password) {
                return sendJsonResponse(res, 400, {
                    success: false,
                    message: "Имя пользователя (user) и пароль (password) обязательны для авторизации"
                });
            }

            if (games === undefined || typeof games !== "number" || isNaN(games)) {
                return sendJsonResponse(res, 400, {
                    success: false,
                    message: "Поле games обязательно и должно быть числом"
                });
            }

            // Ищем пользователя по имени для проверки авторизации
            const findUserQuery = "SELECT id, user, password, games FROM users WHERE user = ?";
            pool.query(findUserQuery, [user], (err, results) => {
                if (err) {
                    console.error("Ошибка при поиске пользователя:", err);
                    return sendJsonResponse(res, 500, {
                        success: false,
                        message: "Внутренняя ошибка сервера при обращении к базе данных"
                    });
                }

                // 1) Проверка: зарегистрирован ли пользователь
                if (results.length === 0) {
                    return sendJsonResponse(res, 404, {
                        success: false,
                        message: "Пользователь с таким именем не найден (не зарегистрирован)"
                    });
                }

                const foundUser = results[0];

                // 2) Проверка пароля
                if (foundUser.password !== password) {
                    return sendJsonResponse(res, 401, {
                        success: false,
                        message: "Неверный пароль"
                    });
                }

                // 3) Обновляем значение games в базе данных
                const updateGamesQuery = "UPDATE users SET games = ? WHERE id = ?";
                pool.query(updateGamesQuery, [games, foundUser.id], (updateErr) => {
                    if (updateErr) {
                        console.error("Ошибка при обновлении поля games:", updateErr);
                        return sendJsonResponse(res, 500, {
                            success: false,
                            message: "Ошибка при обновлении данных в базе данных"
                        });
                    }

                    return sendJsonResponse(res, 200, {
                        success: true,
                        message: "Количество игр успешно обновлено",
                        user: foundUser.user,
                        games: games
                    });
                });
            });
        } catch (err) {
            return sendJsonResponse(res, 400, {
                success: false,
                message: err.message
            });
        }
    }

    // ==========================================
    // 4. ТОЧКА ВХОДА: ТАБЛИЦА РЕКОРДОВ (/leaderboard, /records)
    // ==========================================
    else if ((url === "/leaderboard" || url === "/records") && (method === "GET" || method === "POST")) {
        const leaderboardQuery = "SELECT user, games FROM users ORDER BY games DESC, id ASC LIMIT 50";
        pool.query(leaderboardQuery, (err, results) => {
            if (err) {
                console.error("Ошибка при получении таблицы рекордов:", err);
                return sendJsonResponse(res, 500, {
                    success: false,
                    message: "Внутренняя ошибка сервера при обращении к базе данных"
                });
            }

            return sendJsonResponse(res, 200, {
                success: true,
                leaderboard: results
            });
        });
    }

    // ==========================================
    // 5. РАЗДАЧА СТАТИЧЕСКИХ ФАЙЛОВ (HTML, CSS, JS)
    // ==========================================
    else if (method === "GET") {
        let safePath = url.split("?")[0];
        if (safePath === "/") safePath = "/index.html";

        const filePath = path.join(__dirname, safePath);
        
        // Предотвращение выхода за пределы директории проекта
        if (!filePath.startsWith(__dirname)) {
            return sendJsonResponse(res, 403, {
                success: false,
                message: "Доступ запрещен"
            });
        }

        const mimeTypes = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".ico": "image/x-icon"
        };

        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || "application/octet-stream";

        fs.readFile(filePath, (err, content) => {
            if (err) {
                return sendJsonResponse(res, 404, {
                    success: false,
                    message: "Маршрут или файл не найден. Доступны: POST /register, POST /login, POST /update-games, GET /leaderboard"
                });
            }

            res.writeHead(200, {
                "Content-Type": contentType,
                "Access-Control-Allow-Origin": "*"
            });
            res.end(content);
        });
    }

    // ==========================================
    // Обработка несуществующих маршрутов (404)
    // ==========================================
    else {
        sendJsonResponse(res, 404, {
            success: false,
            message: "Маршрут не найден. Доступны: POST /register, POST /login, POST /update-games, GET /leaderboard"
        });
    }
});

// Запускаем сервер на указанном порту
server.listen(PORT, () => {
    console.log(`HTTP-сервер запущен на http://localhost:${PORT}`);
    console.log("Доступные эндпоинты:");
    console.log(`  POST http://localhost:${PORT}/register     - Регистрация (JSON: { "user": "...", "password": "..." })`);
    console.log(`  POST http://localhost:${PORT}/login        - Авторизация (JSON: { "user": "...", "password": "..." })`);
    console.log(`  POST http://localhost:${PORT}/update-games - Обновление игр (JSON: { "user": "...", "password": "...", "games": 5 })`);
    console.log(`  GET  http://localhost:${PORT}/leaderboard  - Таблица рекордов`);
});

// Обработка корректного завершения работы процесса
process.on("SIGINT", () => {
    console.log("\nЗавершение работы сервера...");
    server.close(() => {
        pool.end((err) => {
            if (err) {
                console.error("Ошибка при закрытии пула MySQL:", err.message);
            } else {
                console.log("Пул соединений MySQL закрыт. Сервер остановлен.");
            }
            process.exit(0);
        });
    });
});
