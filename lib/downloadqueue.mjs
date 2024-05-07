import * as fastq from "fastq";
import Config from "./settings.mjs"
import { SongDownloader } from "./songdownloader.mjs";

export class DownloadQueue {
	/** @type { fastq.queueAsPromised } */
	static #queue = new fastq.promise(this.#execDownload, Config.download.concurrency);

	static addSongToDownload(trackId, dirName) {
		return this.#queue.push({
			trackId,
			dirName
		});
	}

	static #execDownload(task) {
		return SongDownloader.downloadSong(task.trackId, {
			dirName: task.dirName
		});
	}
}