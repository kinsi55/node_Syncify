import { DownloadQueue } from "./downloadqueue.mjs";
import Config from "./settings.mjs";
import { SongDownloader } from "./songdownloader.mjs";
import { SpotifyApi } from "./spotifyapi.mjs";
import db from "./storage.mjs";
import { rename, mkdir, stat, utimes, unlink } from "node:fs/promises";
import { join, basename } from "node:path";
import SanitizeFilename from "sanitize-filename";

export class PlaylistDownloader {
	static persist = db.getNamespacedInstance("playlistStatus");

	static getPlaylistFolderPath(playlistId, playlistName) {
		return SanitizeFilename(`${playlistName}-${playlistId}`);
	}

	static #playlistPaths = {};

	static async downloadPlaylist(playlistId, { force = false } = {}) {
		const playlistLoader = SpotifyApi.getPlaylistInfo(playlistId);

		const { value: firstPage } = await playlistLoader.next();

		const expectedFolder = this.getPlaylistFolderPath(playlistId, firstPage.name);

		switch(await this.persist.has(`${playlistId}:knownName`)) {
			case true: {
				const knownFolder = this.getPlaylistFolderPath(playlistId, await this.persist.get(`${playlistId}:knownName`));

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

		await this.persist.set(`${playlistId}:knownName`, expectedFolder);

		this.#playlistPaths[playlistId] = expectedFolder;

		if(!force && firstPage.snapshot_id === await this.persist.get(`${playlistId}:knownVersion`)) {
			console.info("Playlist %s is up to date, no need to check it", playlistId);
			return;
		}

		const knownSongs = new Set(await this.persist.get(`${playlistId}:knownSongs`));
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
						console.info("Not downloading %s:%s because it already exists", playlistId, track.id);
						continue;
					}
				} catch{}

				downloads.push(this.songAddedToPlaylist(playlistId, track.id, expectedFolder));
			}
		};

		await processPage(firstPage.tracks);

		for await (const playlistPage of playlistLoader)
			await processPage(playlistPage);

		await Promise.all(downloads);

		for(const knownSongId of knownSongs.keys()) {
			if(expectedSongs.has(knownSongId))
				continue;

			console.log("SONG SHOULD BE GONEEE", knownSongId);
			//await this.songRemovedFromPlaylist(playlistId, knownSongId);
		}

		await this.persist.set(`${playlistId}:knownVersion`, firstPage.snapshot_id);
	}

	static async songAddedToPlaylist(playlistId, trackId) {
		console.info("Song %s was added to the playlist %s", trackId, playlistId);

		if(!this.#playlistPaths[playlistId])
			return console.warn("Song cannot be downloaded, unknown playlistPath");

		try {
			const res = await DownloadQueue.addSongToDownload(trackId, this.#playlistPaths[playlistId]);

			console.log("Downloaded %s:%s, %s", playlistId, trackId, basename(res.filePath));

			return res;
		} catch(ex) {
			console.error("Couldn't download %s:%s.", playlistId, trackId, ex);
		}
	}

	static async songRemovedFromPlaylist(playlistId, trackId) {
		if(!Config.deleteRemovedSongs) {
			console.info("Song %s was removed from the playlist %s but deleteRemovedSongs is set to false, not deleting", trackId, playlistId);
			return;
		}

		if(!this.#playlistPaths[playlistId])
			return console.warn("Song cannot be deleted, unknown playlistPath");

		console.info("Song %s was removed from the playlist %s, deleting", trackId, playlistId);

		try {
			const fileName = await SongDownloader.getSongFileNameFromTrackId(trackId);

			const filePath = join(this.#playlistPaths[playlistId], fileName);

			await unlink(filePath);

			console.log("Deleted %s:%s, %s!", playlistId, trackId, filePath);
		} catch(ex) {
			console.error("Failed to delete song:", ex);
		}
	}
}