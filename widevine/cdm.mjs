import {
	randomBytes,
	randomInt,
	createSign,
	constants as cryptoConstants,
	createPrivateKey,
	privateDecrypt
} from "node:crypto";
import { request } from "node:http";
import { AesCmac } from "aes-cmac";
import Key from "./key.mjs";
import {
	LicenseRequest,
	LicenseType,
	SignedMessage,
	ProtocolVersion,
	License
} from "./proto.mjs";


export default class CDM {
	#device = null;
	#privateKey = null;

	constructor(device) {
		this.#device = device;
		this.#privateKey = createPrivateKey({
			key: device.privateKey,
			format: "der",
			type: "pkcs1"
		});
	}

	signer = createSign("RSA-SHA1");
	getLicenseChallenge(pssh, licenseType = "STREAMING") {
		const requestId = randomBytes(16);

		const lr = {
			client_id: this.#device.clientIdDecoded,
			content_id: LicenseRequest.ContentIdentification.create({
				widevine_pssh_data: {
					pssh_data: [pssh.initData],
					license_type: LicenseType[licenseType],
					request_id: Buffer.from(requestId)
				}
			}),
			type: LicenseRequest.RequestType.NEW,
			request_time: Math.floor(Date.now() / 1000),
			protocol_version: ProtocolVersion.VERSION_2_1,
			key_control_nonce: randomInt(1, 2 ** 31)
		};

		const licenseRequest = LicenseRequest.encode(lr).finish();

		this.signer.update(licenseRequest);

		const signature = this.signer.sign({
			key: this.#privateKey,
			padding: cryptoConstants.RSA_PKCS1_PSS_PADDING,
			saltLength: 20
		});

		const signedLicenseRequest = SignedMessage.encode({
			type: SignedMessage.MessageType.LICENSE_REQUEST,
			msg: licenseRequest,
			signature
		}).finish();

		this.requestId = request;
		this.context = CDM.deriveContext(licenseRequest);

		return signedLicenseRequest;
	}

	async parseLicenseAndGetKeys(signedMessage) {
		signedMessage = SignedMessage.decode(signedMessage);

		const license = License.decode(signedMessage.msg);

		const decryptedKey = privateDecrypt(this.#privateKey, signedMessage.session_key);

		//TODO: Maybe verify response signature
		const [enc_key] = await CDM.deriveKeys(...this.context, decryptedKey);

		return license.key.map(key => Key.fromKeyContainer(key, enc_key));
	}

	static async deriveKeys(enc_context, mac_context, key) {
		const _derive = async(session_key, context, counter) => {
			const cmac = new AesCmac(session_key);

			const x = await cmac.calculate(Buffer.concat([
				Buffer.from([counter]),
				context
			]));
			return Buffer.from(x);
		};

		return Promise.all([
			_derive(key, enc_context, 1), // enc_key
			null, // mac_key_server
			null // mac_key_client
		]);
	}

	static deriveContext(message) {
		const buildThing = (label, keySize) => Buffer.concat([
			`${label}\0`,
			message,
			keySize
		].map(x => (Buffer.isBuffer(x) ? x : Buffer.from(x, "ascii"))));

		return [
			buildThing("ENCRYPTION", "\0\0\0\x80"), // (16 * 8).to_bytes(4, "big") # 128-bit
			null // buildThing("AUTHENTICATION", "\0\0\x02\0") // (32 * 8 * 2).to_bytes(4, "big") # 512-bit
		];
	}
}