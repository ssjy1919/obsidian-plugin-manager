import { existsSync, readFileSync } from "fs";

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const packageJson = readJson("package.json");
const manifest = readJson("manifest.json");
const versions = readJson("versions.json");
const errors = [];

if (packageJson.type === "module") {
	errors.push('package.json must not declare "type": "module" (esbuild emits CommonJS)');
}
if (packageJson.version !== manifest.version) {
	errors.push(`package version ${packageJson.version} != manifest version ${manifest.version}`);
}
if (!versions[manifest.version]) {
	errors.push(`versions.json is missing version ${manifest.version}`);
}
if (!existsSync("version-bump.mjs")) {
	errors.push("version-bump.mjs is missing");
}

if (errors.length > 0) {
	console.error("Release checks failed:");
	for (const error of errors) {
		console.error(`- ${error}`);
	}
	process.exit(1);
}

console.log("Release checks passed.");
