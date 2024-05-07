import { createDecipheriv } from "node:crypto";

function decryptAES(cipherText, encKey, iv) {
	const decipher = createDecipheriv("aes-128-cbc", encKey, iv);

	return Buffer.from(decipher.update(cipherText));
}

export default class Key {
	constructor(type, kid, key, permissions) {
		this.type = type;
		this.kid = kid;
		this.key = key;
		this.permissions = permissions;
	}

	static fromKeyContainer(key, encryptionKey) {
		return new Key(
			key.type,
			null,
			decryptAES(key.key, encryptionKey, key.iv),
			[]
		);
	}
}