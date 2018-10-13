app.host = {
  configuration: undefined,
  discardedSongSound: new Audio("assets/sounds/air-horn.wav"),
  guestUrl: window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/")) + "/guest.html",
  player: undefined,

  new: function () {
    app.initializeDatabase();

    this.displayQR();

    this.loadConfiguration();

    this.resetDownvotes();
    this.listenToDownvotes();
    this.listenToPlaylist();
    return false;
  },

  displayQR: function () {
    let queryUrl = "http://api.qrserver.com/v1/create-qr-code/?data=" + this.guestUrl;

    $("#qr-code").attr("src", queryUrl);
  },

  loadConfiguration: function () {
    let self = this;

    app.configRef.once("value", function (snapshot) {
      if (snapshot.val()) {
        self.configuration = snapshot.val();

        app.setAjaxRequestHeaders(self.configuration.token);

        self.getPlaylistInfo();
      }
    });
  },

  getPlaylistInfo: function () {
    let self = this;

    $.ajax({
      data: {
        fields: 'images,name,uri,tracks.items(track(id,name,album(images),artists))'
      },
      method: "GET",
      url: "https://api.spotify.com/v1/playlists/" + self.configuration.spotifyPlaylistId
    }).done(function (response) {
      self.playlistUri = response.uri;
      self.displayPlaylistInfo(response);
      self.listenForNewTracks();
      self.savePreviousTracksToDb(response.tracks.items);
      self.initializePlayer();
    }).fail(function ({ responseJSON: { error } }) {
      swal({
        title: 'Error!',
        text: error.message,
        icon: 'error'
      });
    });
  },

  displayPlaylistInfo: function (playlistInfo) {
    $("#playlist-name").text(playlistInfo.name);
    $("#playlist-track-count").text(playlistInfo.tracks.items.length);

    if (playlistInfo.images.length > 0) {
      $("#playlist-image").attr("src", playlistInfo.images[0].url);
    } else {
      $("#playlist-image").attr("src", "./assets/images/logo.png");
    }
  },

  listenForNewTracks: function () {
    let self = this;

    app.playlistRef.orderByChild("createdAt").on("child_added", function (trackSnapshot) {
      if (trackSnapshot.val()) {
        self.appendTrack(trackSnapshot.val());
      }
    });
  },

  appendTrack: function ({ artist, image, id, name }) {
    let trackBody = $("<div>")
      .addClass("media-body")
      .append($("<h5>").text(name))
      .append($("<p>").text(artist));

    let track = $("<div>")
      .addClass("media track")
      .attr("id", id)
      .append($("<img>").attr("src", image).addClass("align-self-center mr-3"))
      .append(trackBody);

    $("#tracks").append(track);
  },

  savePreviousTracksToDb: function (trackItems) {
    let self = this;
    //Clear playlist on db
    app.playlistRef.set({});

    // Append each track to db
    $.each(trackItems, function (i, { track }) {
      self.addTrackToDb(track);
    });
  },

  addTrackToDb: function (track) {
    app.playlistRef.transaction(function (playlist) {
      if (playlist === null) {
        playlist = {};
      }

      playlist[track.id] = {
        artist: track.artists.map(({ name }) => name).join(', '),
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        id: track.id,
        image: track.album.images[track.album.images.length - 1].url,
        name: track.name
      };

      return playlist;
    });
  },

  initializePlayer: function () {
    let self = this;

    // Set player pause state on db
    app.playerRef.set({ paused: true });

    self.player = new Spotify.Player({
      name: 'Mixtape Web Player',
      getOAuthToken: function (cb) {
        cb(self.configuration.token);
      }
    });

    // Error handling
    self.player.addListener('initialization_error', ({ message }) => {
      console.error(message);
    });

    self.player.addListener('authentication_error', ({ message }) => {
      console.error(message);
    });

    self.player.addListener('account_error', ({ message }) => {
      console.error(message);
    });

    self.player.addListener('playback_error', ({ message }) => {
      console.error(message);
    });

    // Playback status updates
    self.player.addListener('player_state_changed', state => {
      let currentTrack = state.track_window.current_track;
      let artist = currentTrack.artists.map(({ name }) => name).join(', ');
      let image = currentTrack.album.images[0].url;
      let trackId = currentTrack.linked_from.id;

      // Handle id
      if (trackId === null) {
        trackId = currentTrack.id;
      }

      let status = {
        artist,
        duration: state.duration,
        image,
        paused: state.paused,
        position: state.position,
        trackId,
        song: currentTrack.name,
      }

      if (self.currentTrackId !== trackId) {
        self.resetDownvotes();
      }

      self.currentTrackId = trackId;

      self.updatePlayerStatus(status);
    });

    // Ready
    self.player.addListener('ready', ({ device_id }) => {
      self.playerId = device_id;
      self.bindPlayPauseClick();
      self.listenToPlayerStatus();
    });

    // Not Ready
    self.player.addListener('not_ready', ({ device_id }) => {
      console.log('Device ID has gone offline', device_id);
    });

    // Connect to the player!
    self.player.connect().then();
  },

  updatePlayerStatus: function (status) {
    app.playerRef.update(status);
  },

  bindPlayPauseClick: function () {
    let self = this;

    $("#play-pause").click(function () {
      self.player.getCurrentState().then(state => {
        if (!state) {
          self.firstPlay();
        } else {
          self.player.togglePlay();
        }
      });
    })
  },

  firstPlay: function () {
    $.ajax({
      method: "PUT",
      url: "https://api.spotify.com/v1/me/player/play?device_id=" + this.playerId,
      data: JSON.stringify({
        context_uri: this.playlistUri
      })
    });
  },

  listenToPlayerStatus: function () {
    let self = this;

    app.playerRef.on("value", function (playerSnapshot) {
      $("#play-pause").text("PLAY");

      if (playerSnapshot.val()) {
        $("#song-playing").text(playerSnapshot.val().song);
        $("#artist").text(playerSnapshot.val().artist);
        $("#playlist-image").attr("src", playerSnapshot.val().image);
        if (!playerSnapshot.val().paused) {
          $("#play-pause").text("PAUSE");
          $(".track").removeClass("playing");
          $("#" + playerSnapshot.val().trackId).addClass("playing");
        }
      }
    });
  },

  resetDownvotes: function () {
    app.downvotesRef.set({});
  },

  listenToDownvotes: function () {
    let self = this;

    app.downvotesRef.on("value", function (downvotesSnapshot) {
      if (downvotesSnapshot.val() && downvotesSnapshot.numChildren() > 1) {
        self.player.nextTrack();
        self.discardedSongSound.play();
      }
    })
  },

  listenToPlaylist: function () {
    let self = this;

    app.playlistRef.on("value", function (snapshot) {
      $("#playlist-track-count").text(snapshot.numChildren());
    });
  }
};