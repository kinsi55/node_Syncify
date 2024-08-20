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
	"V1ZEAgIDAASoMIIEpAIBAAKCAQEAwnCFAPXy4U1J7p1NohAS+xl040f5FBaE/59bPp301bGz0UGFT9VoEtY3vaeakKh/d319xTNvCSWsEDRaMmp/wSnMiEZUkkl04872jx2uHuR4k6KYuuJoqhsIo1TwUBueFZynHBUJzXQeW8Eb1tYAROGwp8W7r+b0RIjHC89RFnfVXpYlF5I6McktyzJNSOwlQbMqlVihfSUkv3WRd3HFmA0Oxay51CEIkoTlNTHVlzVyhov5eHCDSp7QENRgaaQ03jC/CcgFOoQymhsBtRCM0CQmfuAHjA9e77R6m/GJPy75G9fqoZM1RMzVDHKbKZPd3sFd0c0+77gLzW8cWEaaHwIDAQABAoIBAQCB2pN46MikHvHZIcTPDt0eRQoDH/YArGl2Lf7J+sOgU2U7wv49KtCug9IGHwDiyyUVsAFmycrF2RroV45FTUq0vi2SdSXV7Kjb20Ren/vBNeQw9M37QWmU8Sj7q6YyWb9hv5T69DHvvDTqIjVtbM4RMojAAxYti5hmjNIh2PrWfVYWhXxCQ/WqAjWLtZBM6Oww1byfr5I/wFogAKkgHi8wYXZ4LnIC8V7jLAhujlToOvMMC9qwcBiPKDP2FO+CPSXaqVhH+LPSEgLggnU3EirihgxovbLNAuDEeEbRTyR70B0lW19tLHixso4ZQa7KxlVUwOmrHSZf7nVuWqPpxd+BAoGBAPQLyJ1IeRavmaU8XXxfMdYDoc8+xB7v2WaxkGXb6ToX1IWPkbMz4yyVGdB5PciIP3rLZ6s1+ruuRRV0IZ98i1OuN5TSR56ShCGg3zkd5C4L/xSMAz+NDfYSDBdO8BVvBsw21KqSRUi1ctL7QiIvfedrtGb5XrE4zhH0gjXlU5qZAoGBAMv2segn0Jx6az4rqRa2Y7zRx4iZ77JUqYDBI8WMnFeR54uiioTQ+rOs3zK2fGIWlrn4ohco/STHQSUTB8oCOFLMx1BkOqiR+UyebO28DJY7+V9ZmxB2Guyi7W8VScJcIdpSOPyJFOWZQKXdQFW3YICD2/toUx/pDAJh1sEVQsV3AoGBANyyp1rthmvoo5cVbymhYQ08vaERDwU3PLCtFXu4E0Ow90VNn6Ki4ueXcv/gFOp7pISk2/yuVTBTGjCblCiJ1en4HFWekJwrvgg3Vodtq8Okn6pyMCHRqvWEPqD5hw6rGEensk0K+FMXnF6GULlfn4mgEkYpb+PvDhSYvQSGfkPJAoGAF/bAKFqlM/1eJEvU7go35bNwEiij9Pvlfm8y2L8Qj2lhHxLV240CJ6IkBz1Rl+S3iNohkT8LnwqaKNT3kVB5daEBufxMuAmOlOX4PmZdxDj/r6hDg8ecmjj6VJbXt7JDd/c5ItKoVeGPqu035dpJyE+1xPAY9CLZel4scTsiQTkCgYBt3buRcZMwnc4qqpOOQcXK+DWD6QvpkcJ55ygHYw97iP/lF4euwdHd+I5b+11pJBAao7G0fHX3eSjqOmzReSKboSe5L8ZLB2cAI8AsKTBfKHWmCa8kDtgQuI86fUfirCGdhdA9AVP2QXN2eNCuPnFWi0WHm4fYuUB5be2c18ucxAb9CAESmgsK3QMIAhIQ071yBlsbLoO2CSB9Ds0cmRif6uevBiKOAjCCAQoCggEBAMJwhQD18uFNSe6dTaIQEvsZdONH+RQWhP+fWz6d9NWxs9FBhU/VaBLWN72nmpCof3d9fcUzbwklrBA0WjJqf8EpzIhGVJJJdOPO9o8drh7keJOimLriaKobCKNU8FAbnhWcpxwVCc10HlvBG9bWAEThsKfFu6/m9ESIxwvPURZ31V6WJReSOjHJLcsyTUjsJUGzKpVYoX0lJL91kXdxxZgNDsWsudQhCJKE5TUx1Zc1coaL+Xhwg0qe0BDUYGmkNN4wvwnIBTqEMpobAbUQjNAkJn7gB4wPXu+0epvxiT8u+RvX6qGTNUTM1QxymymT3d7BXdHNPu+4C81vHFhGmh8CAwEAASjwIkgBUqoBCAEQABqBAQQlRbfiBNDb6eU6aKrsH5WJaYszTioXjPLrWN9dqyW0vwfT11kgF0BbCGkAXew2tLJJqIuD95cjJvyGUSN6VyhL6dp44fWEGDSBIPR0mvRq7bMP+m7Y/RLKf83+OyVJu/BpxivQGC5YDL9f1/A8eLhTDNKXs4Ia5DrmTWdPTPBL8SIgyfUtg3ofI+/I9Tf7it7xXpT0AbQBJfNkcNXGpO3JcBMSgAIL5xsXK5of1mMwAl6ygN1Gsj4aZ052otnwN7kXk12SMsXheWTZ/PYh2KRzmt9RPS1T8hyFx/Kp5VkBV2vTAqqWrGw/dh4URqiHATZJUlhO7PN5m2Kq1LVFdXjWSzP5XBF2S83UMe+YruNHpE5GQrSyZcBqHO0QrdPcU35GBT7S7+IJr2AAXvnjqnb8yrtpPWN2ZW/IWUJN2z4vZ7/HV4aj3OZhkxC1DIMNyvsusUKoQQuf8gwKiEe8cFwbwFSicywlFk9la2IPe8oFShcxAzHLCCn/TIYUAvEL3/4LgaZvqWm80qCPYbgIP5HT8hPYkKWJ4WYknEWK+3InbnkzteFfGrQFCq4CCAESEGnj6Ji7LD+4o7MoHYT4jBQYjtW+kQUijgIwggEKAoIBAQDY9um1ifBRIOmkPtDZTqH+CZUBbb0eK0Cn3NHFf8MFUDzPEz+emK/OTub/hNxCJCao//pP5L8tRNUPFDrrvCBMo7Rn+iUb+mA/2yXiJ6ivqcN9Cu9i5qOU1ygon9SWZRsujFFB8nxVreY5Lzeq0283zn1Cg1stcX4tOHT7utPzFG/ReDFQt0O/GLlzVwB0d1sn3SKMO4XLjhZdncrtF9jljpg7xjMIlnWJUqxDo7TQkTytJmUl0kcM7bndBLerAdJFGaXc6oSY4eNy/IGDluLCQR3KZEQsy/mLeV1ggQ44MFr7XOM+rd+4/314q/deQbjHqjWFuVr8iIaKbq+R63ShAgMBAAEo8CISgAMii2Mw6z+Qs1bvvxGStie9tpcgoO2uAt5Zvv0CDXvrFlwnSbo+qR71Ru2IlZWVSbN5XYSIDwcwBzHjY8rNr3fgsXtSJty425djNQtF5+J2jrAhf3Q2m7EI5aohZGpD2E0cr+dVj9o8x0uJR2NWR8FVoVQSXZpad3M/4QzBLNto/tz+UKyZwa7Sc/eTQc2+ZcDS3ZEO3lGRsH864Kf/cEGvJRBBqcpJXKfG+ItqEW1AAPptjuggzmZEzRq5xTGf6or+bXrKjCpBS9G1SOyvCNF1k5z6lG8KsXhgQxL6ADHMoulxvUIihyPY5MpimdXfUdEQ5HA2EqNiNVNIO4qP007jW51yAeThOry4J22xs8RdkIClOGAauLIl0lLA4flMzW+VfQl5xYxP0E5tuhn0h+844DslU8ZF7U1dU2QprIApffXD9wgAACk26Rggy8e96z8i86/+YYyZQkc9hIdCAERrgEYCEbByzONrdRDs1MrS/ch1moV5pJv63BIKvQHGvLkaFwoMY29tcGFueV9uYW1lEgd1bmtub3duGioKCm1vZGVsX25hbWUSHEFuZHJvaWQgU0RLIGJ1aWx0IGZvciB4ODZfNjQaGwoRYXJjaGl0ZWN0dXJlX25hbWUSBng4Nl82NBodCgtkZXZpY2VfbmFtZRIOZ2VuZXJpY194ODZfNjQaIAoMcHJvZHVjdF9uYW1lEhBzZGtfcGhvbmVfeDg2XzY0GmMKCmJ1aWxkX2luZm8SVUFuZHJvaWQvc2RrX3Bob25lX3g4Nl82NC9nZW5lcmljX3g4Nl82NDo5L1BTUjEuMTgwNzIwLjAxMi80OTIzMjE0OnVzZXJkZWJ1Zy90ZXN0LWtleXMaHgoUd2lkZXZpbmVfY2RtX3ZlcnNpb24SBjE0LjAuMBokCh9vZW1fY3J5cHRvX3NlY3VyaXR5X3BhdGNoX2xldmVsEgEwMg4QASAAKA0wAEAASABQAA==",
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
				cookie: `sp_dc=${cookie}`,
				"user-agent": this.USERAGENT
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