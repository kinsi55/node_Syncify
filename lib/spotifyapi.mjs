import fetch from "node-fetch";
import Base62 from "./base62.mjs";
import { Parser } from "binary-parser";

import { WidevinePsshData, License } from "../widevine/proto.mjs";
import Device from "../widevine/device.mjs";
import CDM from "../widevine/cdm.mjs";
import { readFile } from "node:fs/promises";
import pRetry from "p-retry";
import config from "./settings.mjs";

const b62 = new Base62();

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

	static getTrackGid(trackId) {
		return b62.decodeToBigint(trackId).toString(16).padStart(32, "0");
	}

	static getTrackUrl(trackId) {
		return `https://open.spotify.com/track/${trackId}`;
	}



	// Widevine

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


	static #WVD_Device = null;

	static async getWidevineDecryptionKey(pssh) {
		if(SpotifyApi.#WVD_Device == null) {
			if(!config.wvd)
				throw new Error("To download Songs in MP4 Format you need to provide a wvd device in the config file (Base64 format). Otherwise, use OGG");

			SpotifyApi.#WVD_Device = Device.loads(Buffer.from(config.wvd, "base64"));
		}

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
}