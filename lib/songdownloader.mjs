import fetch from "node-fetch";
import config from "./settings.mjs";
import SpotifyApi from "./spotifyapi.mjs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import * as path from "node:path";
import SanitizeFilename from "sanitize-filename";

export class SongDownloader {
	static #songExtension =
		config.download.format.startsWith("OGG_VORBIS_") ? "mka" :
		config.download.format.startsWith("MP4_") ? "m4a" :
		undefined;

	static getSongFileName(metadataObj) {
		const mainArtist =
			metadataObj.artist_with_role?.find(x => x.role === "ARTIST_ROLE_MAIN_ARTIST")?.artist_name ??
			metadataObj.artist?.[0].name ??
			metadataObj.artists?.[0].name ??
			"Unknown Arist";

		return SanitizeFilename(`${mainArtist} - ${metadataObj.name}.${SongDownloader.#songExtension}`);
	}

	static async getSongFileNameFromTrackId(trackId) {
		const gid = SpotifyApi.getTrackGid(trackId);

		const metadata_gid = await SpotifyApi.getGidMetadata(gid);

		return this.getSongFileName(metadata_gid);
	}

	static #coverDownloadCounter = 0;

	static async downloadSong(trackId, { dirName = null, skipDuplicate = true } = {}) {
		const gid = SpotifyApi.getTrackGid(trackId);

		if(!SongDownloader.#songExtension)
			throw new Error("Unsupported Song Extension");

		const metadata_gid = await SpotifyApi.getGidMetadata(gid);

		const fileName = this.getSongFileName(metadata_gid);

		const fullPath = path.resolve(path.join(
			config.repoDirectory,
			dirName || "",
			fileName
		));

		await mkdir(path.dirname(fullPath), {
			recursive: true
		});

		const result = {
			filePath: fullPath
		};

		if(skipDuplicate) {
			const fileStat = await stat(fullPath).catch(x => x);

			if(fileStat.isFile && fileStat.size > 0)
				return result;
		}

		const mainArtist =
			metadata_gid.artist_with_role?.find(x => x.role === "ARTIST_ROLE_MAIN_ARTIST")?.artist_name ??
			metadata_gid.artist?.[0];

		const tags = {
			title: metadata_gid.name,
			album_artist: mainArtist,
			album: metadata_gid.album.name,
			date: metadata_gid.album.date?.year,
			track: metadata_gid.number,
			disc: metadata_gid.disc_number,
			comment: config.download.tagSongUrl && SpotifyApi.getTrackUrl(trackId)
		};

		const fileDir = metadata_gid.file ?? metadata_gid.alternative?.[0]?.file;

		const fileToDownload = fileDir?.find(x => x.format === config.download.format);

		if(!fileToDownload)
			throw new Error("Song is unavailable");

		let coverHash = config.download.downloadCovers ?
			metadata_gid.album.cover_group?.image?.find(x => x.size === "DEFAULT")?.file_id :
			null;

		const streamUrl = await SpotifyApi.getStreamUrl(fileToDownload.file_id);

		const songBuffer = await SongDownloader.downloadToBuffer(streamUrl);

		let coverNum = SongDownloader.#coverDownloadCounter++ % config.download.concurrency;

		if(coverHash) {
			try {
				await SongDownloader.downloadToBuffer(`http://i.scdn.co/image/${coverHash}`).then(
					x => writeFile(`cover${coverNum}.jpg`, x));
			} catch {
				coverNum = -1;
			}
		}

		if(fileToDownload.format.startsWith("MP4_")) {
			const pssh = await SpotifyApi.getPssh(fileToDownload.file_id);
			const decryptionKey = await SpotifyApi.getWidevineDecryptionKey(pssh);

			await SongDownloader.remux(
				songBuffer,
				fullPath,
				tags,
				coverNum,
				[
					"-decryption_key",
					decryptionKey.key.toString("hex")
				]
			);
		}

		result.downloaded = true;
		result.tags = tags;
		return result;
	}

	static async remux(songBytes, savePath, tags = {}, coverNum = 0, ffmpegArgs) {
		const show_output = false;

		const coverArgs = coverNum < 0 ? [] :
			[
				"-i", `cover${coverNum}.jpg`,
				"-disposition:v", "attached_pic"
			];

		const fullArgs = [
			"-y",
			"-loglevel", "info",
			"-nostats",
			"-thread_queue_size", "128",
			...(ffmpegArgs || []).filter(x => x),
			"-i", "pipe:",
			...coverArgs,
			"-c", "copy",
			"-movflags", "+faststart",
			...Object.entries(tags).filter(([, value]) => value).map(e => ["-metadata", e.join("=")]).flat(),
			savePath
		];

		const ffmpeg = spawn(config.ffmpeg_path || "ffmpeg", fullArgs, {
			stdio: ["pipe", null, show_output ? "pipe" : null]
		});

		if(show_output)
			ffmpeg.stderr.pipe(process.stdout);

		ffmpeg.stdin.write(songBytes);
		ffmpeg.stdin.end();
		await new Promise(res => ffmpeg.on("close", res));
	}

	static async downloadToBuffer(url) {
		const res = await fetch(url, {
			headers: {
				"user-agent": ""
			}
		});

		return Buffer.from(await res.arrayBuffer());
	}
}