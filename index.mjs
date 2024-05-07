import { SpotifyApi } from "./lib/spotifyapi.mjs";
import { Sync } from "./lib/sync.mjs";
import { PlaylistDownloader } from "./lib/playlistdownloader.mjs";
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

	const playlists = targets.map(x => playlistUrlRegex.exec(x)?.[1]);

	for(const playlistId of playlists)
		await PlaylistDownloader.downloadPlaylist(playlistId, {force: true});

	sync?.setTargets(playlists);

	sync?.resume();

	return playlists;
}

(async() => {
	const accessToken = await SpotifyApi.getAccessToken();

	const playlists = await targetsUpdated();

	if(!Config.enableAutoSync)
		return;

	sync = new Sync(accessToken, playlists);

	const watcher = watch(targetsFile, {
		persistent: false
	});

	for await (const event of watcher) {
		if(event.eventType !== "change")
			continue;

		await targetsUpdated();
	}
})();