import SpotifyApi from "./lib/spotifyapi.mjs";
import { Sync } from "./lib/sync.mjs";
import { PlaylistManager } from "./lib/playlistmanager.mjs";
import { readFile, watch } from "node:fs/promises";
import { join } from "node:path";
import Config from "./lib/settings.mjs";
import pRetry from "p-retry";

const playlistUrlRegex = /playlist\/([0-9a-zA-Z]{22})/;

const targetsFile = join(Config.repoDirectory, "targets.txt");
let sync = null;


async function targetsUpdated() {
	const targets = await readFile(targetsFile, {
		encoding: "ascii"
	}).then(x => x.split("\n"));

	sync?.pause();

	const playlists = targets.map(x => playlistUrlRegex.exec(x)?.[1]);

	sync?.setTargets(playlists);

	for(const playlistId of playlists)
		await PlaylistManager.downloadPlaylist(playlistId);

	sync?.resume();

	return playlists;
}

(async() => {
	await SpotifyApi.refreshTokenIfNecessary();

	const playlists = await targetsUpdated();

	if(!Config.enableAutoSync)
		return;

	sync = new Sync(playlists);

	const watcher = watch(targetsFile, {
		persistent: false
	});

	for await (const event of watcher) {
		if(event.eventType !== "change")
			continue;

		await targetsUpdated();
	}
})();