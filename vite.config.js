/** @type {import('vite').UserConfig} */
module.exports = {
	server: {
		headers: {
			"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
			Pragma: "no-cache",
			Expires: "0",
		},
	},
	preview: {
		headers: {
			"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
			Pragma: "no-cache",
			Expires: "0",
		},
	},
};
