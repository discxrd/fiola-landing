const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const requiredFiles = [
	"index.html",
	"styles/main.css",
	"scripts/main.js",
	"assets/.gitkeep",
	"robots.txt",
	"sitemap.xml",
	"site.webmanifest",
	"README.md",
	"AGENTS.md",
];

const bemPattern =
	/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__(?:[a-z0-9]+(?:-[a-z0-9]+)*))?(?:--(?:[a-z0-9]+(?:-[a-z0-9]+)*))?$/;
const fileExists = (filePath) => fs.existsSync(path.join(root, filePath));
const readFile = (filePath) =>
	fs.readFileSync(path.join(root, filePath), "utf8");
const unique = (items) => [...new Set(items)];
const isSeoFriendlyAssetName = (fileName) =>
	/^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+$/.test(fileName) &&
	!/^\d/.test(fileName) &&
	!/^\d+-(?:rectangle|vector|image|group)(?:-?\d+|\.)/.test(fileName) &&
	!/^(?:rectangle|vector|image|group)(?:-?\d+|\.)/.test(fileName);
const collectFiles = (directory) => {
	const entries = fs.readdirSync(directory, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const entryPath = path.join(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...collectFiles(entryPath));
			continue;
		}

		files.push(entryPath);
	}

	return files;
};
const cssDirectory = path.join(root, "styles");
const failures = [];

for (const filePath of requiredFiles) {
	if (!fileExists(filePath)) {
		failures.push(`Missing required file: ${filePath}`);
	}
}

if (failures.length === 0) {
	const html = readFile("index.html");
	const css = readFile("styles/main.css");
	const manifest = JSON.parse(readFile("site.webmanifest"));

	const classAttributes = [...html.matchAll(/class="([^"]+)"/g)].map(
		(match) => match[1],
	);
	const htmlClasses = unique(
		classAttributes.flatMap((value) => value.trim().split(/\s+/)),
	);
	const nonBemClasses = htmlClasses.filter(
		(className) => !bemPattern.test(className),
	);

	if (nonBemClasses.length > 0) {
		failures.push(`Non-BEM classes in HTML: ${nonBemClasses.join(", ")}`);
	}

	const cssClasses = unique(
		[...css.matchAll(/(^|[^\w-])\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g)].map(
			(match) => match[2],
		),
	);
	const nonBemCssClasses = cssClasses.filter(
		(className) => !bemPattern.test(className),
	);

	if (nonBemCssClasses.length > 0) {
		failures.push(`Non-BEM classes in CSS: ${nonBemCssClasses.join(", ")}`);
	}

	const h1Count = (html.match(/<h1(?:\s|>)/g) || []).length;

	if (h1Count !== 1) {
		failures.push(`Expected exactly one h1, found ${h1Count}`);
	}

	const scriptTags = [...html.matchAll(/<script\b([^>]*)>/g)].map(
		(match) => match[1],
	);
	const blockingExternalScripts = scriptTags.filter((attributes) => {
		const hasSource = /\ssrc=/.test(attributes);
		const isDeferred = /\sdefer(?:\s|>|$)/.test(attributes);
		const isModule = /type="module"/.test(attributes);

		return hasSource && !isDeferred && !isModule;
	});

	if (blockingExternalScripts.length > 0) {
		failures.push('External scripts must use defer or type="module".');
	}

	const linkedLocalFiles = [
		...html.matchAll(/(?:href|src)="\.\/([^"]+)"/g),
	].map((match) => match[1].split(/[?#]/)[0]);

	for (const linkedFile of linkedLocalFiles) {
		if (!fileExists(linkedFile)) {
			failures.push(`Linked file does not exist: ${linkedFile}`);
		}
	}

	if (!/<meta\b[^>]*name="description"/s.test(html)) {
		failures.push("Missing meta description.");
	}

	if (!/<link\b[^>]*rel="canonical"/s.test(html)) {
		failures.push("Missing canonical link.");
	}

	if (!html.includes('type="application/ld+json"')) {
		failures.push("Missing JSON-LD structured data.");
	}

	if (!css.includes("@media (prefers-reduced-motion: reduce)")) {
		failures.push("Missing reduced-motion CSS fallback.");
	}

	if (!css.includes("@layer")) {
		failures.push("Missing CSS cascade layers.");
	}

	if (css.includes("@import")) {
		failures.push("CSS must not use @import.");
	}

	const cssUrlFiles = unique(
		[...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)]
			.map((match) => match[1])
			.filter(
				(filePath) =>
					!filePath.startsWith("data:") &&
					!filePath.startsWith("http:") &&
					!filePath.startsWith("https:") &&
					!filePath.startsWith("#"),
			),
	);

	for (const cssUrlFile of cssUrlFiles) {
		if (!fs.existsSync(path.resolve(cssDirectory, cssUrlFile))) {
			failures.push(`CSS url() file does not exist: ${cssUrlFile}`);
		}
	}

	if (manifest.lang !== "ru-RU") {
		failures.push("Manifest language must be ru-RU.");
	}

	const assetFiles = collectFiles(path.join(root, "assets"))
		.map((filePath) => path.relative(path.join(root, "assets"), filePath))
		.filter((filePath) => filePath !== ".gitkeep");
	const nonSeoAssetFiles = assetFiles.filter(
		(fileName) => !isSeoFriendlyAssetName(path.basename(fileName)),
	);

	if (nonSeoAssetFiles.length > 0) {
		failures.push(
			`Asset files must use SEO-friendly kebab-case names: ${nonSeoAssetFiles.join(", ")}`,
		);
	}
}

if (failures.length > 0) {
	console.error("Quality check failed:");

	for (const failure of failures) {
		console.error(`- ${failure}`);
	}

	process.exit(1);
}

console.log("Quality check passed.");
