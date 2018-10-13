![alt text](https://raw.githubusercontent.com/edumoran/Mixtape/master/assets/images/slide_background.png)

# Mixtape
Is a simple solution for music lovers and spotify users to simultaneously share and edit a collective playlist from multiple devices at once.

Whenever people gather socially, they often want to share music (add or skip through songs) but have to keep trading a mobile device or going to an anchored device that is shared by all participants. We thought that a solution to that would be an app that the host can easily set up and where the guests can have continuous access from their mobile phones.

## How it works

Using the spotify API in combination with a QR generator API and a firebase database, we are able to set-up a host and a guest experience that works together to manage a collective playlist.

* First, the host device logs into spotify using an authentication key. The host device will ask the user to select one of its playlists. Upon selection this playlist will be displayed on screen and a QR code will be generated for the users to scan and access the party.

* Next, the guest can scan the QR code, once done they will be able to search for music and add it to the playlist. Users can also vote to skip the current song if enough people dislike it.

* The host device will automatically update the playlist by adding and removing the songs.

## Authors
* **Jorge Báez** - [jibm82](https://github.com/jibm82)
* **Jonathan Barceló** - [jonabari](https://github.com/jonabarih)
* **Eduardo Morán** - [edumoran](https://github.com/edumoran)
