import { Parser } from "binary-parser";
import { ClientIdentification } from "./proto.mjs";

export default class Device {
	version = null;
	type = null;
	securityLevel = null;
	clientId = null;
	clientIdDecoded = null;
	privateKey = null;

	constructor(version, type, securityLevel, clientId, privateKey) {
		this.version = version;
		this.type = type;
		this.securityLevel = securityLevel;
		this.clientId = clientId;
		this.clientIdDecoded = ClientIdentification.decode(clientId);
		this.privateKey = privateKey;
	}

	static #loadsParser = new Parser()
		.string("signature", { assert: "WVD", length: 3})
		.uint8("version")
		.uint8("type_")
		.uint8("security_level")
		.buffer("flags", {
			length: 1
		})
		.uint16("private_key_length")
		.buffer("private_key", {
			length() { return this.private_key_length; }
		})
		.uint16("client_id_length")
		.buffer("client_id", {
			length() { return this.client_id_length; }
		})

	static loads(cls) {
		const parsedWVD = this.#loadsParser.parse(cls);

		return new Device(
			parsedWVD.version,
			parsedWVD.type_,
			parsedWVD.security_level,
			parsedWVD.client_id,
			parsedWVD.private_key
		);
	}
}