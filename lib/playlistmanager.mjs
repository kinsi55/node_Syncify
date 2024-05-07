import { DownloadQueue } from "./downloadqueue.mjs";
import Config from "./settings.mjs";
import { SongDownloader } from "./songdownloader.mjs";
import { SpotifyApi } from "./spotifyapi.mjs";
import db from "./storage.mjs";
import { rename, mkdir, stat, utimes, unlink } from "node:fs/promises";
import { join, basename } from "node:path";
import SanitizeFilename from "sanitize-filename";

export class PlaylistManager {
	static #kv = db.getNamespacedInstance("playlistStatus");

	static getPlaylistFolderPath(playlistId, playlistName) {
		return SanitizeFilename(`${playlistName}-${playlistId}`);
	}

	static async #updateKnownSongs(playlistId, trackIds, add = true) {
		const currentKnownSongs = new Set(await this.#kv.get(`${playlistId}:knownSongs`));

		for(const trackId of trackIds)
			Set.prototype[add ? "add" : "delete"].apply(currentKnownSongs, trackId);

		return this.#kv.set(`${playlistId}:knownSongs`, [...currentKnownSongs]);
	}

	static #playlistPaths = {};

	static async downloadPlaylist(playlistId, { force = false } = {}) {
		const playlistLoader = SpotifyApi.getPlaylistInfo(playlistId);

		const { value: firstPage } = await playlistLoader.next();

		const expectedFolder = this.getPlaylistFolderPath(playlistId, firstPage.name);

		switch(await this.#kv.has(`${playlistId}:knownName`)) {
			case true: {
				const knownFolder = this.getPlaylistFolderPath(playlistId, await this.#kv.get(`${playlistId}:knownName`));

				const knownPath = join(Config.repoDirectory, knownFolder);
				const folderStat = await stat(knownPath).catch(x => x);

				if(folderStat.isDirectory && knownFolder !== expectedFolder) {
					await rename(knownPath, join(Config.repoDirectory, expectedFolder));
					break;
				}
				// explicitly NOT breaking so we fall through and create the folder
			}
			default:
				await mkdir(join(Config.repoDirectory, expectedFolder), { recursive: true });
		}

		await this.#kv.set(`${playlistId}:knownName`, expectedFolder);

		this.#playlistPaths[playlistId] = expectedFolder;

		if(!force && firstPage.snapshot_id === await this.#kv.get(`${playlistId}:knownVersion`)) {
			console.info("Playlist %s is up to date, no need to check it", playlistId);
			return;
		}

		const expectedSongs = new Set();
		const downloads = [];

		const processPage = async(page) => {
			for(const { track, added_at } of page.items) {
				if(expectedSongs.has(track.id)) {
					console.info("Playlist has duplicate song!", track.id);
					continue;
				}

				expectedSongs.add(track.id);

				const songFileName = SongDownloader.getSongFileName(track);

				try {
					const fileStat = await stat(join(Config.repoDirectory, expectedFolder, songFileName));

					if(fileStat.isFile) {
						console.debug("Not downloading %s:%s because it already exists", playlistId, track.id);
						continue;
					}
				} catch{}

				downloads.push(this.songAddedToPlaylist(playlistId, track.id, { updateKnownSongs: false }));
			}
		};

		await processPage(firstPage.tracks);

		for await (const playlistPage of playlistLoader)
			await processPage(playlistPage);

		await Promise.all(downloads);

		const knownSongs = new Set(await this.#kv.get(`${playlistId}:knownSongs`));

		for(const knownSongId of knownSongs.keys()) {
			if(expectedSongs.has(knownSongId))
				continue;

			await this.songRemovedFromPlaylist(playlistId, knownSongId, { updateKnownSongs: false });
		}

		await this.#kv.set(`${playlistId}:knownVersion`, firstPage.snapshot_id);
		await this.#kv.set(`${playlistId}:knownSongs`, [...expectedSongs]);
	}

	static async songAddedToPlaylist(playlistId, trackId, {updateKnownSongs = true} = {}) {
		console.info("Song %s was added to the playlist %s", trackId, playlistId);

		if(!this.#playlistPaths[playlistId])
			return console.error("This should not happen");

		try {
			const res = await DownloadQueue.addSongToDownload(trackId, this.#playlistPaths[playlistId]);

			if(updateKnownSongs)
				await this.#updateKnownSongs(playlistId, [trackId], true);

			console.log("Downloaded %s:%s, %s", playlistId, trackId, basename(res.filePath));

			return res;
		} catch(ex) {
			console.error("Couldn't download %s:%s.", playlistId, SpotifyApi.getTrackUrl(trackId), ex);
		}
	}

	static async songRemovedFromPlaylist(playlistId, trackId, {updateKnownSongs = true} = {}) {
		if(!Config.deleteRemovedSongs) {
			console.info("Song %s was removed from the playlist %s but deleteRemovedSongs is set to false, not deleting", trackId, playlistId);
			return;
		}

		if(!this.#playlistPaths[playlistId])
			return console.error("This should not happen");

		console.info("Song %s was removed from the playlist %s, deleting", trackId, playlistId);

		try {
			const fileName = await SongDownloader.getSongFileNameFromTrackId(trackId);

			const filePath = join(Config.repoDirectory, this.#playlistPaths[playlistId], fileName);

			await unlink(filePath);

			if(updateKnownSongs)
				await this.#updateKnownSongs(playlistId, [trackId], false);

			console.log("Deleted %s:%s, %s!", playlistId, trackId, filePath);
		} catch(ex) {
			console.error("Failed to delete song:", ex);
		}
	}
}