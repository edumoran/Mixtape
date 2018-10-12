app.host = {
  configuration: undefined,
  discardedSongSound: new Audio("assets/sounds/air-horn.wav"),
  guestUrl: window.location.origin + "guest.html",
  player: undefined,

  new: function () {
    app.initializeDatabase();

    this.displayQR();
    this.resetDownvotes();
    this.resetPlaylist();

    this.loadConfiguration();
    return false;

    this.listenToPlayerStatus();
    this.listenToDownvotes();
  },

  resetDownvotes: function () {
    app.downvotesRef.set({});
  },
  resetPlaylist: function () {
    app.playlistRef.set({});
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

  addPlaylistChild: function (track) {
    app.playlistRef.transaction(
      function (playlist) {
        if (playlist === null) {
          playlist = {};
        }

        playlist[track.id] = {

        }

        let playerIds = Object.keys(players);

        if (playerIds.length < app.playerLimit) {
          app.currentUser.role = "player";
          players[app.currentUser.id] = {
            name: app.currentUser.name,
            selection: ''
          };

          return players;
        }
      },

      function (error, committed) {
        if (!committed) {
          $("#error").text("Sorry the game is full, but you can still chat.");
          $("#error-modal").modal("show");
        }
      }
    );
  },

  getPlaylistInfo: function () {
    let self = this;

    $.ajax({
      data: {
        fields: 'description,uri'
      },
      method: "GET",
      url: "https://api.spotify.com/v1/playlists/" + self.configuration.spotifyPlaylistId
    }).done(function (response) {
      console.log(response);
      return false;
      self.playlistUri = response.uri;

      self.displayPlaylistInfo(response);

      $(".track").remove();

      for (let i = 0; i < response.tracks.items.length; i++) {
        self.appendTrack(response.tracks.items[i].track);
      }

      self.initializePlayer();
    }).fail(function ({ responseJSON: { error } }) {
      console.log(error.message);
    });
  },

  displayPlaylistInfo: function (playlistInfo) {
    $("#playlist-name").text(playlistInfo.name);
    $("#playlist-track-count").text(playlistInfo.tracks.items.length);

    if (playlistInfo.images.length > 0) {
      $("#playlist-image").attr("src", playlistInfo.images[0].url);
    } else {
      $("#playlist-image").attr("src", "./assets/images/logo_no-shadow.png");
    }
  },

  appendTrack: function (trackInfo) {
    let albumInfo = trackInfo.album;
    let artist = trackInfo.artists.map(({ name }) => name).join(', ');
    let track = $("<p>")
      .addClass("track")
      .append($("<img>").attr("src", albumInfo.images[2].url))
      .append($("<span>").html(artist + " <br/><i>" + trackInfo.name + "</i>"));

    $("#tracks").append(track);
  },

  initializePlayer: function () {
    let self = this;

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
      let status = {
        duration: state.duration,
        paused: state.paused,
        position: state.position,
        song: currentTrack.name,
        artist
      }

      if (self.currentTrackId !== currentTrack.id) {
        self.resetDownvotes();
      }

      self.currentTrackId = currentTrack.id

      self.updatePlayerStatus(status);
    });

    // Ready
    self.player.addListener('ready', ({ device_id }) => {
      self.playerId = device_id;
      self.bindPlayPauseClick();
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

  displayQR: function () {
    let queryUrl = "http://api.qrserver.com/v1/create-qr-code/?data=" + this.guestUrl;

    $("#qr-code").attr("src", queryUrl);
  },

  bindPlayPauseClick: function () {
    console.log("BINDED");
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

  listenToDownvotes: function () {
    let self = this;

    app.downvotesRef.on("value", function (downvotesSnapshot) {
      if (downvotesSnapshot.val() && downvotesSnapshot.numChildren() > 1) {
        self.player.nextTrack();
        self.discardedSongSound.play();
      }
    })
  },

  listenToPlaylistStatus: function () {
    let self = this;

    app.playlistRef.on("value", function () {
      self.getPlaylistInfo();
    });
  },

  listenToPlayerStatus: function () {
    let self = this;

    app.playerRef.on("value", function (playerSnapshot) {
      $("#play-pause").text("Play");

      if (playerSnapshot.val()) {
        $("#song-playing").text(playerSnapshot.val().song);
        $("#artist").text(playerSnapshot.val().artist);

        if (!playerSnapshot.val().paused) {
          $("#play-pause").text("Pause");
        }
      } else {
        app.playerRef.set({
          paused: true
        });
      }
    });
  }
};