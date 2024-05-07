# Syncify

Spotify is annoying. As a free user, I am not in a position to complain - I am however in a position to do something about it, hence I created this.

Syncify allows you to input a list of Playlists and it will create and maintain an offline mirror of those playlists.

## Features

- **Downloads directly from Spotify**, what you see is what you get
- Basic ID3 tags are applied to the downloaded songs where available
- Songs added and removed to the playlist are detected and handled accordingly

## Autosync (Optional)

By default whenever you run this tool it will try to update your local playlists state to reflect the online ones. If you'd rather want to run this tool in the background and have it automagically apply changes made to the playlists in realtime, you can set `enableAutoSync` to true in the config

## Setup

- This tool needs to be signed into Spotify to work, to accomplish this you supply your login cookie `sp_dc` in a cookie.txt file

## Config

### cookie.txt

This file is placed in the root directory and contains the value of your `sp_dc` login-cookie. I might add a guide how to get that at some point

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
| repoDirectory | String | The directory, relative to the root, where the downloaded playlists are stored |
| enableAutoSync | Boolean | If true, Syncify keeps running after the initial sync. It will then listen for changes made to the watched playlists and applies them as they're made |

### targets.txt

This file is placed in the configured `repoDirectory`, it contains a list of playlists for Syncify to manage. Note that changes made to it are applied automatically on save if `enableAutoSync` is used

## TODO

- A lot of Error handling / retry logic is missing

## Motivation(s)

- Why the fuck are you limited in how many songs you can skip per hour as a free user on mobile???
- Why will playback occasionally just die and not recover until manual intervention???
- Why does Spotify go down for 15 minutes every other Week???
- Why do I have to repeadetly waste Bandwidth and/or Mobile Data to access static content???
- Why do I get the same 3 Ads in a loop???