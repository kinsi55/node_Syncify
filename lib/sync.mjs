import { WebSocket } from "ws";
import SpotifyApi from "./spotifyapi.mjs";
import protobufjs from "protobufjs";

import ReconnectingWebSocket from "reconnecting-websocket";
import { PlaylistManager } from "./playlistmanager.mjs";

const { PlaylistModificationInfo } = protobufjs.loadSync("./lib/playlist4_external.proto");

export class Sync {
	#ws = null;
	watchedPlaylists = new Set();
	#paused = false;

	constructor(watchedPlaylists) {
		const x = this.#ws = new ReconnectingWebSocket(() => `wss://gew4-dealer.spotify.com/?access_token=${SpotifyApi.getToken()}`, [], {
			WebSocket,
			minUptime: 30000
		});

		this.watchedPlaylists = new Set(watchedPlaylists);

		this.#ws.addEventListener("message", this.onMessage.bind(this));
		this.#ws.addEventListener("close", (e) => {
			console.warn("Sync Connection was closed. wasClean: %i. Reason: %i (%s)", e.wasClean, e.code, e.reason);
		});

		setInterval(() => {
			if(x.readyState === WebSocket.OPEN)
				this.#ws.send(JSON.stringify({type: "ping"}));
		}, 30000);
	}

	pause() {
		this.#paused = true;
	}

	unpause() {
		this.#paused = false;
	}

	setTargets(targets) {
		this.watchedPlaylists = new Set(targets);
	}

	onMessage(e) {
		if(e.data[0] !== "{")
			return;

		const parsed = JSON.parse(e.data);

		if(this.#paused)
			return;

		if(!parsed.uri?.startsWith("hm://playlist/v2/playlist/"))
			return;

		for(const payload of parsed.payloads) {
			const msg = PlaylistModificationInfo.decode(Buffer.from(payload, "base64"));

			const playlistId = msg.uri.toString("ascii").split(":").pop();

			if(!this.watchedPlaylists.has(playlistId))
				continue;

			for(const op of msg.ops) {
				if(op.add) for(const item of op.add.items) {
					PlaylistManager.songAddedToPlaylist(playlistId, item.uri.split(":").pop());
				}

				if(op.rem) for(const item of op.rem.items) {
					PlaylistManager.songRemovedFromPlaylist(playlistId, item.uri.split(":").pop());
				}
			}
		}
	}
}