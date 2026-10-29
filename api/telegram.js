const MAX_REQUEST_BODY_BYTES = 8192;
const TELEGRAM_API_ORIGIN = "https://api.telegram.org";
const FIELD_LIMITS = {
	name: 80,
	contact: 120,
	project: 1200,
	page: 300,
	website: 120,
};

class PayloadTooLargeError extends Error {
	constructor() {
		super("Request body is too large.");
		this.name = "PayloadTooLargeError";
	}
}

const sendJson = (response, statusCode, payload) => {
	response.statusCode = statusCode;
	response.setHeader("Content-Type", "application/json; charset=utf-8");
	response.end(JSON.stringify(payload));
};

const sendHtml = (response, statusCode, title, message) => {
	response.statusCode = statusCode;
	response.setHeader("Content-Type", "text/html; charset=utf-8");
	response.end(`<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} — Fiola</title>
<style>
:root{color-scheme:dark;background:#000;color:#fff;font-family:Arial,sans-serif}body{display:grid;min-block-size:100vh;margin:0;place-items:center;padding:24px}.telegram-result{max-inline-size:560px;border:1px solid rgb(255 255 255 / 16%);border-radius:28px;background:linear-gradient(180deg,#080808,#000);padding:32px}.telegram-result__title{margin:0 0 16px;font-size:28px;line-height:1.2}.telegram-result__text{margin:0 0 24px;color:rgb(255 255 255 / 72%);font-size:16px;line-height:1.6}.telegram-result__link{display:inline-flex;min-block-size:48px;align-items:center;border:1px solid rgb(255 255 255 / 20%);border-radius:999px;color:#fff;padding:0 22px;text-decoration:none}
</style>
</head>
<body>
<main class="telegram-result">
<h1 class="telegram-result__title">${escapeHtml(title)}</h1>
<p class="telegram-result__text">${escapeHtml(message)}</p>
<a class="telegram-result__link" href="/#contacts">Вернуться на сайт</a>
</main>
</body>
</html>`);
};

const sendResponse = (response, statusCode, payload, prefersHtml = false) => {
	if (prefersHtml) {
		sendHtml(response, statusCode, payload.title, payload.message);
		return;
	}

	sendJson(response, statusCode, {
		message: payload.message,
		ok: statusCode < 400,
	});
};

const readRequestBody = (request) =>
	new Promise((resolve, reject) => {
		let body = "";
		let hasRejected = false;

		request.on("data", (chunk) => {
			if (hasRejected) {
				return;
			}

			body += chunk;

			if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BODY_BYTES) {
				hasRejected = true;
				reject(new PayloadTooLargeError());
			}
		});

		request.on("end", () => {
			if (!hasRejected) {
				resolve(body);
			}
		});

		request.on("error", (error) => {
			if (!hasRejected) {
				reject(error);
			}
		});
	});

const normalizeLine = (value, limit) => {
	if (typeof value !== "string") {
		return "";
	}

	return value.trim().replace(/\s+/g, " ").slice(0, limit);
};

const normalizeMessage = (value, limit) => {
	if (typeof value !== "string") {
		return "";
	}

	return value
		.trim()
		.replace(/\r\n/g, "\n")
		.replace(/[ \t]+/g, " ")
		.slice(0, limit);
};

const escapeHtml = (value) =>
	value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const buildTelegramMessage = ({ name, contact, project, page }) =>
	[
		"<b>Новая заявка Fiola</b>",
		"",
		`<b>Имя:</b> ${escapeHtml(name)}`,
		`<b>Контакт:</b> ${escapeHtml(contact)}`,
		"",
		"<b>Проект:</b>",
		escapeHtml(project),
		"",
		`<b>Страница:</b> ${escapeHtml(page)}`,
	].join("\n");

const getContentType = (request) => request.headers["content-type"] || "";

const isFormPost = (request) =>
	getContentType(request).includes("application/x-www-form-urlencoded");

const parsePayload = (request, rawBody) => {
	const contentType = getContentType(request);

	if (!rawBody) {
		return null;
	}

	if (contentType.includes("application/json")) {
		try {
			return JSON.parse(rawBody);
		} catch (error) {
			return null;
		}
	}

	if (contentType.includes("application/x-www-form-urlencoded")) {
		return Object.fromEntries(new URLSearchParams(rawBody));
	}

	return null;
};

const normalizeApplication = (payload) => ({
	name: normalizeLine(payload.name, FIELD_LIMITS.name),
	contact: normalizeLine(payload.contact, FIELD_LIMITS.contact),
	project: normalizeMessage(payload.project, FIELD_LIMITS.project),
	page: normalizeLine(payload.page, FIELD_LIMITS.page) || "Заявка без JS",
	website: normalizeLine(payload.website, FIELD_LIMITS.website),
});

const sendTelegramMessage = async (botToken, chatId, application) => {
	const telegramResponse = await fetch(
		`${TELEGRAM_API_ORIGIN}/bot${botToken}/sendMessage`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				chat_id: chatId,
				text: buildTelegramMessage(application),
				parse_mode: "HTML",
				disable_web_page_preview: true,
			}),
		},
	);

	if (!telegramResponse.ok) {
		const telegramError = await telegramResponse.text().catch(() => "");
		console.error(
			"Telegram sendMessage failed",
			telegramResponse.status,
			telegramError,
		);
		return false;
	}

	return true;
};

module.exports = async (request, response) => {
	response.setHeader("Allow", "POST, OPTIONS");

	if (request.method === "OPTIONS") {
		response.statusCode = 204;
		response.end();
		return;
	}

	if (request.method !== "POST") {
		sendJson(response, 405, { message: "Method not allowed." });
		return;
	}

	const botToken = process.env.TELEGRAM_BOT_TOKEN;
	const chatId = process.env.TELEGRAM_CHAT_ID;
	const prefersHtml = isFormPost(request);

	if (!botToken || !chatId) {
		console.error("Telegram environment variables are not configured.");
		sendResponse(
			response,
			503,
			{
				title: "Отправка временно недоступна",
				message:
					"Заявки в Telegram ещё не настроены на сервере. Напишите нам напрямую: Fiola_Create.",
			},
			prefersHtml,
		);
		return;
	}

	try {
		const rawBody = await readRequestBody(request);
		const payload = parsePayload(request, rawBody);

		if (!payload || typeof payload !== "object") {
			sendResponse(
				response,
				400,
				{
					title: "Заявка не отправлена",
					message: "Проверьте поля формы и отправьте заявку ещё раз.",
				},
				prefersHtml,
			);
			return;
		}

		const application = normalizeApplication(payload);

		if (application.website) {
			sendResponse(
				response,
				200,
				{
					title: "Спасибо за заявку",
					message: "Заявка принята. Мы скоро свяжемся с вами.",
				},
				prefersHtml,
			);
			return;
		}

		if (!application.name || !application.contact || !application.project) {
			sendResponse(
				response,
				400,
				{
					title: "Заполните все поля",
					message: "Нужно указать имя, контакт и краткое описание проекта.",
				},
				prefersHtml,
			);
			return;
		}

		const isDelivered = await sendTelegramMessage(
			botToken,
			chatId,
			application,
		);

		if (!isDelivered) {
			sendResponse(
				response,
				502,
				{
					title: "Telegram не принял заявку",
					message:
						"Не получилось отправить заявку автоматически. Напишите нам напрямую: Fiola_Create.",
				},
				prefersHtml,
			);
			return;
		}

		sendResponse(
			response,
			200,
			{
				title: "Спасибо за заявку",
				message: "Заявка отправлена в Telegram. Мы скоро свяжемся с вами.",
			},
			prefersHtml,
		);
	} catch (error) {
		if (error instanceof PayloadTooLargeError) {
			sendResponse(
				response,
				413,
				{
					title: "Заявка слишком большая",
					message: "Сократите описание проекта и отправьте заявку ещё раз.",
				},
				prefersHtml,
			);
			return;
		}

		console.error("Telegram application handler failed", error);
		sendResponse(
			response,
			500,
			{
				title: "Заявка не отправлена",
				message:
					"На сервере произошла ошибка. Напишите нам напрямую: Fiola_Create.",
			},
			prefersHtml,
		);
	}
};
