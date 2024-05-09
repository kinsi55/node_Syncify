# Syncify

Spotify is annoying. As a free user, I am not in a position to complain - I am however in a position to do something about it, hence I created this.

Syncify allows you to configure a set of Playlists and it will create and maintain an offline Mirror of those Playlists.

## Features

- **Downloads directly from Spotify**, what you see is what you get
- Basic ID3 tags are applied to the downloaded songs where available
- Album Art can be downloaded / embedded if desired
- Songs added and removed to the playlist are detected and handled accordingly
	- Songs going unavailable are excempt from this and will stay downloaded
- Autosync ✨(Optional)
	- By default whenever you run this tool it will try to update your local playlists state to reflect the online ones. If you'd rather want to run this tool in the background and have it automagically apply changes made to the playlists in realtime, you can set `enableAutoSync` to true in the config
	- Autosync only works for playlists that are in your library, so if you want autosync to work for playlists created by others you have to add them to your library.

## Setup

This tool needs to be signed into Spotify to work, to accomplish this you supply your `sp_dc` Cookie. I might add a guide how to get that at some point

## Config

### cookie.txt

This file is placed in the root directory and contains the value of your `sp_dc` login-cookie.

### config.json

This file is placed in the root directory

| Setting | Type | Description |
|---------|------|-------------|
| download > downloadCovers | Boolean | If true, the Album Art is downloaded and embedded in the Songs |
| download > tagSongUrl | Boolean | If true, the Songs Spotify URL is added as a Comment in the ID3 tags of the Song |
| download > concurrency | Integer | Dictates how many songs are downloaded in parallel |
| download > format | String | The Spotify specific Format of the Song to be downloaded. Currently supported are `MP4_128` when you are a free user or `MP4_256` when you are a premium user |
| deleteRemovedSongs | Boolean | When false, Songs removed from a Playlist are not deleted from the local copy. Note that Songs that go unavailable are exempt from this setting - If a Song becomes unavailable it stays downloaded |
| ffmpeg_path | String | Path to the FFMPEG executable, can be `null` if ffmpeg is in your PATH |
| repoDirectory | String | The directory where the downloaded playlists are stored, can be a relative path |
| enableAutoSync | Boolean | If true, Syncify keeps running after the initial sync. It will then listen for changes made to the watched playlists and applies them as they're made |

### targets.txt

This file is placed in the configured `repoDirectory`, it contains a list of Playlists for Syncify to manage.

ℹ Changes made to it are applied automatically on save if `enableAutoSync` is used!

## TODO

- A lot of Error handling / retry logic is missing

## Motivation(s)

- Why the fuck are you limited in how many songs you can skip per hour as a free user on mobile???
- Why will playback occasionally just die and not recover until manual intervention???
- Why does Spotify go down for 15 minutes every other Week???
- Why do I have to repeadetly waste Bandwidth and/or Mobile Data to access static content???
- Why do I get the same 3 Ads in a loop???