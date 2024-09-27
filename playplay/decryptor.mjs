import { createDecipheriv } from "node:crypto";

const NONCE = Buffer.from("72E067FBDDCBCF77", "hex");
const INITIAL_VALUE = Buffer.from("EBE8BC643F630D93", "hex");
const COMBINED = Buffer.concat([NONCE, INITIAL_VALUE]);

export function decipherData(encryptedData, key) {
	const decipher = createDecipheriv("aes-128-ctr", key, COMBINED);

  const deciphered = decipher.update(encryptedData);

  return deciphered;
}

export function fixOggHeader(buffer) {
	buffer[5] = 0x02; //Header Type, 0x02 = Beginning of Stream, Spotify returns 0x06??

	return buffer;
}