const path = require("path");
const fetch = require("node-fetch");
const http = require("http");
const https = require("https");
const fs = require('fs').promises;
const { existsSync } = require("fs");
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });
const agent = (_parsedURL) => _parsedURL.protocol == "http:" ? httpAgent : httpsAgent;
const CACHE_PATH = path.join(__dirname, "assets");
const BASE_URL = "https://discord.com";

const INDEX_SCRIPTS = [
"ee7c382d9257652a88c8f7b7f22a994d.png",
"0.86026000a1c87d9d52d4.css",
"07dca80a102d4149e9736d4b162cff6f.ico",
"ee7c382d9257652a88c8f7b7f22a994d.png",
"c0aad398acb47cd1cf62.js",
"eaec7c02b47fbaaeced2.js",
"0380447c49d849f6219c.js",
"0.07d0728a84e557e0adf5.css",
"07dca80a102d4149e9736d4b162cff6f.ico",
"a43abde105cf492266af.js",
"a68099089dde941a20c3.js",
"20302c95e3eab5a43bac.js",
];

const print = (x, printover = true) => {
	var repeat = process.stdout.columns - x.length;
	process.stdout.write(
		`${x}${" ".repeat(Math.max(0, repeat))}${printover ? "\r" : "\n"}`,
	);
};

const processFile = async (asset) => {
	asset = `${asset}${asset.includes(".") ? "" : ".js"}`;
	const url = `${BASE_URL}/assets/${asset}`;
	const res = await fetch(url, { agent });
	if (res.status !== 200) {
		print(`${res.status} on ${asset}`, false);
		return [];
	}
	let text = await res.text();
	await fs.writeFile(path.join(CACHE_PATH, asset), text);
	let ret = new Set([
		...(text.match(/"[A-Fa-f0-9]{20}"/g) || []),
		...[...text.matchAll(/\.exports=.\..\+"(.*?\..{0,5})"/g)].map((x) => x[1],),
		...[...text.matchAll(/\/assets\/([a-zA-Z0-9]*?\.[a-z0-9]{0,5})/g)].map((x) => x[1],),
	]);
	return [...ret].map((x) => x ? x.replace(/"/g, "") : []);

};

(async () => {
	if (!existsSync(CACHE_PATH)) {
		await fs.mkdir(CACHE_PATH, { recursive: true });
	}
	const assets = new Set(INDEX_SCRIPTS);
	let promises = [];
	let index = 0;
	for (let asset of assets) {
		index += 1;
		print(`Scraping asset ${asset}. Remaining: ${assets.size - index}`);
		promises.push(processFile(asset));
		const values = await Promise.all(promises);
		promises = [];
		values.flat().forEach((x) => assets.add(x));
	}
})();
