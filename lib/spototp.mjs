import crypto from "crypto";

class TOTP {
	static secret = Buffer.from("10239356982684469120121471223494829410773366870");
	static version = 11;
	static period = 30;
	static digits = 6;

	static generate(timestamp) {
		let counter = Math.floor(timestamp / 1000 / TOTP.period);

		// Convert counter to 8-byte big-endian buffer
		const counterBuffer = Buffer.alloc(8);
		for(let i = 7; i >= 0; i--) {
			counterBuffer[i] = counter & 0xff;
			counter >>= 8;
		}

		// HMAC-SHA1
		const hmac = crypto.createHmac("sha1", TOTP.secret);
		hmac.update(counterBuffer);
		const hmacResult = hmac.digest();

		// Dynamic truncation
		const offset = hmacResult[hmacResult.length - 1] & 0x0f;
		const binary =
			((hmacResult[offset] & 0x7f) << 24) |
			((hmacResult[offset + 1] & 0xff) << 16) |
			((hmacResult[offset + 2] & 0xff) << 8) |
			(hmacResult[offset + 3] & 0xff);

		// Generate the OTP
		return (binary % 10 ** TOTP.digits).toString().padStart(TOTP.digits, "0");
	}
}

export default TOTP;