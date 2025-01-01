const path = require("path");
const fetch = require("node-fetch");
const fs = require('fs').promises;
const { existsSync } = require("fs");
const CACHE_PATH = path.join(__dirname, "assets");
const http = require("http");
const https = require("https");
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });
const agent = (_parsedURL) => _parsedURL.protocol == "http:" ? httpAgent : httpsAgent;

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
	var res = await fetch(("https://discord.com/assets/"+asset), { agent });
	if (res && res.status && res.status == 200) {
		if (asset.includes(".") && !asset.includes(".js") && !asset.includes(".css")) {
			await fs.writeFile(path.join(CACHE_PATH, asset), await res.buffer());
			var text = null;
		} else {
			var text = await res.text();
		}
	} else if (res && res.status && res.status !== 200) {
		print(`${res.status} on https://discord.com/assets/${asset}`, false);
		var res = await fetch(("https://web.archive.org/web/0id_/https://discord.com/assets/"+asset), { agent });
		if (res && res.status && res.status == 200) {
			if (asset.includes(".") && !asset.includes(".js") && !asset.includes(".css")) {
				await fs.writeFile(path.join(CACHE_PATH, asset), await res.buffer());
				var text = null;
			} else {
				var text = await res.text();
			}
		} else if (res && res.status && res.status !== 200) {
			print(`${res.status} on https://web.archive.org/web/0id_/https://discord.com/assets/${asset}`, false);
			var res = await fetch(("https://web.archive.org/web/0id_/https://discordapp.com/assets/"+asset), { agent });
			if (res && res.status && res.status == 200) {
				if (asset.includes(".") && !asset.includes(".js") && !asset.includes(".css")) {
					await fs.writeFile(path.join(CACHE_PATH, asset), await res.buffer());
					var text = null;
				} else {
					var text = await res.text();
				}
			} else if (res && res.status && res.status !== 200) {
				print(`${res.status} on https://web.archive.org/web/0id_/https://discordapp.com/assets/${asset}`, false);
				var text = null;
			} else {
				processFile(asset);
				var text = null;
			}
		} else {
			processFile(asset);
			var text = null;
		}
	} else {
		processFile(asset);
		var text = null;
	}
	if (text == null) {
		return []
	}
	await fs.writeFile(path.join(CACHE_PATH, asset), text);
	var ret = new Set([
		...(text.match(/"[A-Fa-f0-9]{20}"/g) || []),
		...[...text.matchAll(/Worker\(.\..\+"(.*?\.worker\.js)"/g)].map((x) => x[1],),
		...[...text.matchAll(/\.exports=.\..\+"(.*?\.worker\.js)"/g)].map((x) => x[1],),
		...[...text.matchAll(/\/assets\/([a-zA-Z0-9]*?\.worker\.js)/g)].map((x) => x[1],),
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
	var promises = [];
	var index = 0;
	for (var asset of assets) {
		index += 1;
		print(`Scraping Asset: ${asset} - Assets Remaining: ${assets.size - index}`);
		promises.push(processFile(asset));
		const values = await Promise.all(promises);
		promises = [];
		values.flat().forEach((x) => assets.add(x));
	}
	print("Done Scraping Assets!", false);
})();
