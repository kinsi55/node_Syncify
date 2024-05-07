import { readFileSync } from "node:fs";

const Config = JSON.parse(readFileSync("config.json"));

export default Config;