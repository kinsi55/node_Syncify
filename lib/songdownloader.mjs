import fetch from "node-fetch";
import config from "./settings.mjs";
import SpotifyApi from "./spotifyapi.mjs";
import { mkdir, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import * as path from "node:path";
import SanitizeFilename from "sanitize-filename";

export class SongDownloader {
	static getSongFileName(metadataObj) {
		const mainArtist =
			metadataObj.artist_with_role?.find(x => x.role === "ARTIST_ROLE_MAIN_ARTIST")?.artist_name ??
			metadataObj.artist?.[0].name ??
			metadataObj.artists?.[0].name ??
			"Unknown Arist";

		return SanitizeFilename(`${mainArtist} - ${metadataObj.name}.m4a`);
	}

	static async getSongFileNameFromTrackId(trackId) {
		const gid = SpotifyApi.getTrackGid(trackId);

		const metadata_gid = await SpotifyApi.getGidMetadata(gid);

		return this.getSongFileName(metadata_gid);
	}

	static async downloadSong(trackId, { dirName = null, fileNameOverride, skipDuplicate = true } = {}) {
		const gid = SpotifyApi.getTrackGid(trackId);

		if(!["MP4_128", "MP4_256"].includes(config.download.format))
			throw new Error("Only MP4_128(Free) and MP4_256(Premium) are supported");

		const metadata_gid = await SpotifyApi.getGidMetadata(gid);

		const fileName = fileNameOverride ?? this.getSongFileName(metadata_gid);

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

		const file = metadata_gid.file ?? metadata_gid.alternative?.[0]?.file;

		if(!file)
			throw new Error("Song is unavailable");

		const fileToDownload = file.find(x => x.format === config.download.format);
		const pssh = await SpotifyApi.getPssh(fileToDownload.file_id);
		const decryptionKey = await SpotifyApi.getDecryptionKey(pssh);
		const streamUrl = await SpotifyApi.getStreamUrl(fileToDownload.file_id);

		const songBuffer = Buffer.from(await SongDownloader.downloadToBuffer(streamUrl));

		const coverHash = config.download.downloadCovers ?
			metadata_gid.album.cover_group?.image?.find(x => x.size === "DEFAULT")?.file_id :
			null;

		await SongDownloader.remux(decryptionKey.key, songBuffer, fullPath, tags, coverHash);

		result.downloaded = true;
		result.tags = tags;
		return result;
	}

	static async remux(key, encryptedSong, savePath, tags = {}, coverHash) {
		const show_output = false;

		// TODO: Download in Node and feed base64 data string to ffmpeg instead, maybe
		const coverArgs = !coverHash ? [] : [
			"-i", `http://i.scdn.co/image/${coverHash}`,
			"-disposition:v", "attached_pic"
		];

		const ffmpeg = spawn(config.ffmpeg_path || "ffmpeg", [
			"-y",
			"-loglevel", "info",
			"-nostats",
			"-thread_queue_size", "128",
			"-decryption_key", key.toString("hex"),
			"-i", "pipe:",
			...coverArgs,
			"-c", "copy",
			"-movflags", "+faststart",
			...Object.entries(tags).filter(([, value]) => value).map(e => ["-metadata", e.join("=")]).flat(),
			savePath
		], {
			stdio: ["pipe", null, show_output ? "pipe" : null]
		});

		if(show_output)
			ffmpeg.stderr.pipe(process.stdout);

		ffmpeg.stdin.write(encryptedSong);
		ffmpeg.stdin.end();
		await new Promise(res => ffmpeg.on("close", res));
	}

	static async downloadToBuffer(url) {
		const res = await fetch(url, {
			headers: {
				"user-agent": ""
			}
		});

		return res.arrayBuffer();
	}
}