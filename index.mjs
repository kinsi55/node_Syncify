import SpotifyApi from "./lib/spotifyapi.mjs";
import { Sync } from "./lib/sync.mjs";
import { PlaylistManager } from "./lib/playlistmanager.mjs";
import { readFile, watch } from "node:fs/promises";
import { join } from "node:path";
import Config from "./lib/settings.mjs";

const playlistUrlRegex = /playlist\/([0-9a-zA-Z]{22})/;

const targetsFile = join(Config.repoDirectory, "targets.txt");
let sync = null;


async function targetsUpdated() {
	const targets = await readFile(targetsFile, {
		encoding: "ascii"
	}).then(x => x.split("\n"));

	sync?.pause();

	const playlists = [];

	for(const target of targets) {
		if(target.startsWith("FOLDER:")) {
			//TODO: Add support for watching entire folders at some point
		} else {
			const playlist = playlistUrlRegex.exec(target)?.[1];

			if(playlist) {
				playlists.push(playlist);
				continue;
			}
		}
		console.warn("Unknown Target:", target);
	}

	sync?.setPlaylists(playlists);

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