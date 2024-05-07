import KeyvFile from "@keyvhq/file";
import Keyv from "@keyvhq/core";
import config from "./settings.mjs";
import { join } from "node:path";

const store = new KeyvFile(join(config.repoDirectory, "state.json"));

export default class Db {
	static default = this.getNamespacedInstance(undefined);

	/**
	 * @returns { Keyv }
	 */
	static getNamespacedInstance(namespace) {
		return new Keyv({
			store,
			deserialize: JSON.parse,
			serialize: JSON.stringify,
			namespace
		});
	}
}