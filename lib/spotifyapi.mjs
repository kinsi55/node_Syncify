import fetch from "node-fetch";
import Base62 from "./base62.mjs";
import { Parser } from "binary-parser";

import { WidevinePsshData, License } from "../widevine/proto.mjs";
import Device from "../widevine/device.mjs";
import CDM from "../widevine/cdm.mjs";
import { readFile } from "node:fs/promises";
import pRetry from "p-retry";

const b62 = new Base62();

const hardcoded_WVD = Buffer.from(
	"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EBf/36ZBhQ1YuUYgaa4zcusY+JftngYijgIwggEKAoIBAQDG05LBd2VXHy+vSi2rKYx5LA9wFc7aG8lNBiitRb2O68Ev2BpbRtcMWbX0rI7ymBV63en4wodA7OPykEUMrYhpJEAOhRV2yYRsCK+oL7JZOOASqpQ9iPOaV0gpaNxDOtP1xB+OIaQu3YYdWAqdivwcb4ZeJ9IOw+q1r/DZtS6locl7xL0jCyOHMyPPvMdUtL5tCWWyqxI9+S/yvR/stsz0tK8Gicosa/JI3TlT4P8AbkT+7UULBaq9pkrxV0bOFYi+i5qAFx5SsITk6T+zw3QIJoiQBaep90IzDULBelBd5iQ4Z151iyX8vncqd/hkcD6/46x2tjQkWcdE3rTpeNcdAgMBAAEo/uEBSAESgANYLDNb8xfMWG7RkNHWXgc7C7F35aXmZCeu4J7EXr3XwQrWxCtlRflLsf6yhV82zpnob/HuktegTRDR/8VXk1A/+j9dqgpLWvejmty7E/PI4d90c7dNzbqpsYKTmhUaYFiuH7v0Q81Fa0M+WklXchBXevc1QqHS7O8UfLliGdCBLidTsL5u8NalqUn66ZNk56agrGDJdRTG/j7vtSBniY2i/QmUEVA6bknus832Snhncxj2zHjCahcqTIeu4mmRLovLFeawGhWIEIZbvNsO8wR38GZ5WsqX2PbsKEefqaHa1KabNqZS8J44NP5udQy+qHh4BLKZm8HLATsLcLDHf+wHtGwussXokPsC24rZLpxNDn+tHALx1MVhATsJWrQY/eyH4LnGZRMp3w8Py8OvohOP1Plvz2L37BP0lz/nCWwvOMte9hEEoiRLPMakFwlNy9l1auVzzRhYCq8RpvR/prpZUMqFon9/Ar4yXzc9wncgqJct+jspynr5x4NVXLLmYHYaJgoQYXBwbGljYXRpb25fbmFtZRISY29tLmFuZHJvaWQuY2hyb21lGioKBm9yaWdpbhIgNENEMDUxMTk3MkZCRjg0NURGQTBBRjUxNzFBN0I2M0UaTgoecGFja2FnZV9jZXJ0aWZpY2F0ZV9oYXNoX2J5dGVzEiw4UDFzVzBFUEpjc2x3N1V6UnNpWEw2NHcrTzUwRWQrUkJJQ3RheTFnMjRNPRoWCgxjb21wYW55X25hbWUSBkdvb2dsZRohCgptb2RlbF9uYW1lEhNzZGtfZ3Bob25lNjRfeDg2XzY0GhsKEWFyY2hpdGVjdHVyZV9uYW1lEgZ4ODZfNjQaFQoLZGV2aWNlX25hbWUSBmVtdTY0eBojCgxwcm9kdWN0X25hbWUSE3Nka19ncGhvbmU2NF94ODZfNjQaXgoKYnVpbGRfaW5mbxJQZ29vZ2xlL3Nka19ncGhvbmU2NF94ODZfNjQvZW11NjR4OjEzL1RFMUEuMjQwMjEzLjAwNS8xMTkzMjI2Mjp1c2VyZGVidWcvZGV2LWtleXMaHgoUd2lkZXZpbmVfY2RtX3ZlcnNpb24SBjE3LjAuMBokCh9vZW1fY3J5cHRvX3NlY3VyaXR5X3BhdGNoX2xldmVsEgEwGmMKHG9lbV9jcnlwdG9fYnVpbGRfaW5mb3JtYXRpb24SQ09FTUNyeXB0byBMZXZlbDMgQ29kZSBGZWIgIDIgMjAyMyAwNTozNzo0NyAyODkyNiBYODYgNjRiaXQgQVBJdjE3LjEyFggBEAEgACgRMABAAEgAUAFYAGABaAE=",
	"base64"
);

const WVD_Device = Device.loads(hardcoded_WVD);

export default class SpotifyApi {
	static #accesToken = null;
	static #refreshTokenAt = null;
	static #tokenExpiresAt = null;
	static #isRefreshingToken = false;

	static USERAGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

	static setToken(token) {
		this.#accesToken = token;
	}

	static async getToken() {
		await this.refreshTokenIfNecessary();

		return this.#accesToken;
	}

	static refreshTokenIfNecessary() {
		if(Date.now() < this.#refreshTokenAt)
			return;

		if(Date.now() <= this.#tokenExpiresAt) {
			if(this.#isRefreshingToken)
				return;

			this.#isRefreshingToken = true;

			SpotifyApi.getAccessToken()
				.catch(x => x)
				.then(() => this.#isRefreshingToken = false);

			return;
		}

		return pRetry(() => SpotifyApi.getAccessToken());
	}

	static async getAccessToken() {
		const URL = "https://open.spotify.com/get_access_token";

		const cookie = await readFile("cookie.txt");

		const req = await fetch(URL, {
			headers: {
				cookie: `sp_dc=${cookie}`
			}
		});
		const resp = await req.json();

		if(!resp.accessToken)
			throw new Error("Failed to retrieve token from response");

		const now = Date.now();
		const tokenExpiresIn = (resp.accessTokenExpirationTimestampMs - now);

		this.#accesToken = resp.accessToken;
		this.#tokenExpiresAt = now + (tokenExpiresIn * 0.9);
		this.#refreshTokenAt = now + (tokenExpiresIn * 0.75);

		return resp;
	}

	static async #fetchWithToken(url, options) {
		await this.refreshTokenIfNecessary();

		const _options = {
			...(options ?? {}),
			headers: {
				authorization: `Bearer ${this.#accesToken}`,
				"user-agent": this.USERAGENT,
				accept: "application/json",
				...(options?.headers ?? {}),
			}
		};

		return fetch(url, _options);
	}

	static async *getPlaylistInfo(playlistId) {
		const firstPageReq = await this.#fetchWithToken(`https://api.spotify.com/v1/playlists/${playlistId}`);
		const firstPage = await firstPageReq.json();

		//	.tracks = Tracklist
		//		.items = Tracks Array
		//		.total = total amount

		yield firstPage;

		let nextPage = firstPage.tracks.next;

		while(nextPage) {
			const page = await this.#fetchWithToken(nextPage);

			const parsed = await page.json();

			nextPage = parsed.next;

			yield parsed;
		}
	}

	static async getGidMetadata(gid) {
		const req = await this.#fetchWithToken(`https://spclient.wg.spotify.com/metadata/4/track/${gid}?market=from_token`);

		return req.json();
	}

	static async getStreamUrl(fileId) {
		const req = await this.#fetchWithToken(
			`https://gue1-spclient.spotify.com/storage-resolve/v2/files/audio/interactive/11/${fileId}?version=10000000&product=9&platform=39&alt=json`
		);

		return req.json().then(x => x.cdnurl[0]);
	}

	static async getPssh(fileId) {
		const req = await this.#fetchWithToken(`https://seektables.scdn.co/seektable/${fileId}.json`);

		return req.json().then(x => x.pssh);
	}

	static async getWidevineLicense(challenge, type = "audio") {
		const req = await this.#fetchWithToken(
			`https://gue1-spclient.spotify.com/widevine-license/v1/${type}/license`,
			{
				method: "post",
				body: challenge
			}
		);

		if(req.ok)
			return req.arrayBuffer().then(Buffer.from);

		throw new Error("Request failed:", await req.text());
	}

	static #psshDecoder = new Parser()
		.uint32("psshSize")
		.uint32("psshHeader")
		.uint16("psshVersion")
		.uint16("headerFlag")
		.buffer("systemId", {
			length: 16,
			formatter: x => x.toString("hex").toUpperCase()
		})
		.choice({
			tag: "psshVersion",
			defaultChoice: 0,
			choices: {
				0: null,
				// This is where I'd implement parsing of the keyIds array - If I needed to
				1: new Parser()
			}
		})
		.int32be("dataSize")
		.buffer("initData", {
			length() { return this.dataSize; }
		});

	static async getDecryptionKey(pssh) {
		const initData = Buffer.from(pssh, "base64");

		const decoded = this.#psshDecoder.parse(initData);
		// We just hardcode Widevine because we dont support other DRM anyways
		// decoded.dataObject = WidevinePsshData.decode(decoded.initData);


		const cdmSession = new CDM(WVD_Device);
		const challenge = cdmSession.getLicenseChallenge(decoded);
		const license = await this.getWidevineLicense(challenge);

		const keys = await cdmSession.parseLicenseAndGetKeys(license);

		return keys.find(x => x.type === License.KeyContainer.KeyType.CONTENT);
	}



	static getTrackGid(trackId) {
		return b62.decodeToBigint(trackId).toString(16).padStart(32, "0");
	}

	static getTrackUrl(trackId) {
		return `https://open.spotify.com/track/${trackId}`;
	}
}