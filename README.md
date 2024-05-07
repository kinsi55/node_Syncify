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

## TODO

- A lot of Error handling / retry logic is missing

## Motivation(s)

- Why the fuck are you limited in how many songs you can skip per hour as a free user on mobile???
- Why will playback occasionally just die and not recover until manual intervention???
- Why does Spotify go down for 15 minutes every other Week???
- Why do I have to repeadetly waste Bandwidth and/or Mobile Data to access static content???
- Why do I get the same 3 Ads in a loop???