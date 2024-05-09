import { createDecipheriv } from "node:crypto";

export default class Key {
	constructor(type, kid, key, permissions) {
		this.type = type;
		this.kid = kid;
		this.key = key;
		this.permissions = permissions;
	}

	static fromKeyContainer(key, encryptionKey) {
		const decipher = createDecipheriv("aes-128-cbc", encryptionKey, key.iv);

		return new Key(
			key.type,
			null,
			Buffer.from(decipher.update(key.key)),
			[]
		);
	}
}