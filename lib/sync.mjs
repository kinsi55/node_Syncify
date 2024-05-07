import { WebSocket } from "ws"
import protobufjs from "protobufjs";

import ReconnectingWebSocket from "reconnecting-websocket";
import { PlaylistManager } from "./playlistmanager.mjs";

const { PlaylistModificationInfo } = protobufjs.loadSync("./lib/playlist4_external.proto");

export class Sync {
	ws = null;
	watchedPlaylists = new Set();
	#paused = false;

	constructor(token, watchedPlaylists) {
		this.ws = new ReconnectingWebSocket(`wss://gew4-dealer.spotify.com/?access_token=${token}`, [], {
			WebSocket,
			minUptime: 30000
		});

		this.watchedPlaylists = new Set(watchedPlaylists);

		this.ws.addEventListener("message", this.onMessage.bind(this));
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

		if(parsed.type === "ping")
			return this.ws.send(JSON.stringify({type: "pong"}));

		if(this.#paused)
			return;

		if(!parsed.uri.startsWith("hm://playlist/v2/playlist/"))
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