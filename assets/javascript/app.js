const authorizationRequester = {
  redirectUri: window.location.origin + "/setup.html",
  scopes: [
    'streaming',
    'user-read-birthdate',
    'user-read-email',
    'user-read-private',
    'playlist-modify-private',
    'playlist-modify-public',
    'playlist-read-private'
  ],
  spotifyAppClientId: '22c6bf8f33e4445896f7dfd87a6ebec4',

  new: function () {
    this.bindAuthorizeClick();
  },

  bindAuthorizeClick: function () {
    let self = this;
    $("#authorize").on("click", function (e) {
      e.preventDefault();

      window.location = self.authorizationUrl();
    })
  },

  authorizationUrl: function () {
    return "https://accounts.spotify.com/authorize?" +
      "client_id=" + this.spotifyAppClientId +
      "&redirect_uri=" + this.redirectUri +
      "&scope=" + this.scopes.join(" ") +
      "&response_type=token" +
      "&show_dialog=true";
  }
};


const playlistSetup = {
  configRef: firebase.database().ref("config"),
  searchParams: new URLSearchParams(window.location.search),
  spotifyUserId: undefined,
  token: window.location.hash.split("=")[1],

  new: function () {
    let self = this;

    $(document).ready(function () {
      self.bindSetupClick();
      self.validateAuthentication();
    });
  },

  bindSetupClick: function () {
    let self = this;
    $("#setup").click(function () {
      if ($("#playlist").val() !== '') {
        self.saveConfiguration();
      } else {
        alert("You need to select a playlist");
      }
    });
  },

  saveConfiguration: function () {
    firebase.database().ref("config")
      .set({
        token: this.token,
        spotifyUserId: this.spotifyUserId,
        spotifyPlaylistId: $("#playlist").val()
      })
      .then(function () {
        window.location = "host.html"
      })
      .catch(function (error) {
        alert(error);
      });
  },

  validateAuthentication: function () {
    if (this.token !== undefined) {
      this.setAjaxRequestHeaders();
      this.getUserInfo();
    } else {
      this.handleAuthenticationError();
    }
  },

  setAjaxRequestHeaders: function () {
    let self = this;

    $.ajaxSetup({
      beforeSend: function (xhr) {
        xhr.setRequestHeader('Authorization', 'Bearer ' + self.token);
      }
    });
  },

  getUserInfo: function () {
    let self = this;

    $.ajax({
      method: "GET",
      url: "https://api.spotify.com/v1/me"
    }).then(function (response) {
      self.spotifyUserId = response.id;
      self.getUserPlaylists();
    });
  },

  getUserPlaylists: function () {
    let self = this;

    $.ajax({
      method: "GET",
      url: "https://api.spotify.com/v1/me/playlists",
      data: {
        limit: 50
      }
    }).then(function (response) {
      // Sort lists alphabetically
      response.items.sort(function (a, b) {
        listA = a.name.toLowerCase();
        listB = b.name.toLowerCase();

        if (listA < listB) {
          return -1;
        } else if (listA > listB) {
          return 1;
        } else {
          return 0;
        }
      });

      $.each(response.items, function (index, playlist) {
        let option = $("<option>")
          .attr("value", playlist.id)
          .text(playlist.name);

        $("#playlist").append(option);
      });

      $("#playlist-selection").removeClass("d-none");
    });
  },

  handleAuthenticationError: function () {
    let errorHeader = $("<h2>").text("Autentication failed");
    let callToAction = $("<a>")
      .attr("href", authorizationRequester.authorizationUrl())
      .addClass("btn")
      .text("Try again");

    $("#error")
      .append(errorHeader)
      .append(callToAction);
  }
};


const host = {
  configuration: undefined,
  discardedSongSound: new Audio("assets/sounds/air-horn.wav"),
  guestUrl: window.location.origin + "guest.html",
  player: undefined,

  configRef: firebase.database().ref("config"),
  downvotesRef: firebase.database().ref("downvotes"),
  playerRef: firebase.database().ref("player"),
  playlistRef: firebase.database().ref("playlist"),

  new: function () {
    this.resetDownvotes();
    this.loadConfiguration();
    this.listenToPlayerStatus();
    this.listenToPlaylistStatus();
    this.listenToDownvotes();
  },

  resetDownvotes: function () {
    this.downvotesRef.set({});
  },

  loadConfiguration: function () {
    let self = this;

    self.configRef.once("value", function (snapshot) {
      if (snapshot.val()) {
        self.configuration = snapshot.val();

        self.setAjaxRequestHeaders();
        self.getPlaylistInfo();
        self.initializePlayer();
        self.displayQR();
      }
    });
  },

  setAjaxRequestHeaders: function () {
    let self = this;

    $.ajaxSetup({
      beforeSend: function (xhr) {
        xhr.setRequestHeader('Authorization', 'Bearer ' + self.configuration.token);
      }
    });
  },

  getPlaylistInfo: function () {
    let self = this;

    $.ajax({
      method: "GET",
      url: "https://api.spotify.com/v1/playlists/" + self.configuration.spotifyPlaylistId
    }).then(function (response) {
      self.playlistUri = response.uri;

      self.displayPlaylistInfo(response);

      $(".track").remove();

      for (let i = 0; i < response.tracks.items.length; i++) {
        self.appendTrack(response.tracks.items[i].track);
      }
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
    self.player.connect();
  },

  updatePlayerStatus: function (status) {
    this.playerRef.update(status);
  },

  displayQR: function () {
    let queryUrl = "http://api.qrserver.com/v1/create-qr-code/?data=" + this.guestUrl;

    $("#qr-code").attr("src", queryUrl);
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

  listenToDownvotes: function () {
    let self = this;

    self.downvotesRef.on("value", function (downvotesSnapshot) {
      if (downvotesSnapshot.val() && downvotesSnapshot.numChildren() > 1) {
        self.player.nextTrack();
        self.discardedSongSound.play();
      }
    })
  },

  listenToPlaylistStatus: function () {
    let self = this;

    self.playlistRef.on("value", function () {
      self.getPlaylistInfo();
    });
  },

  listenToPlayerStatus: function () {
    let self = this;

    self.playerRef.on("value", function (playerSnapshot) {
      $("#play-pause").text("Play");

      if (playerSnapshot.val()) {
        $("#song-playing").text(playerSnapshot.val().song);
        $("#artist").text(playerSnapshot.val().artist);

        if (!playerSnapshot.val().paused) {
          $("#play-pause").text("Pause");
        }
      } else {
        self.playerRef.set({
          paused: true
        });
      }
    });
  }
};

const guest = {
  configuration: undefined,

  configRef: firebase.database().ref("config"),
  downvotesRef: firebase.database().ref("downvotes"),
  playerRef: firebase.database().ref("player"),
  playlistRef: firebase.database().ref("playlist"),

  new: function () {
    let self = this;

    $(document).ready(function () {
      self.loadConfiguration();
      self.listenToPlayerStatus();
    });
  },

  loadConfiguration: function () {
    let self = this;

    self.configRef.once("value", function (snapshot) {
      if (snapshot.val()) {
        self.configuration = snapshot.val();
        self.setAjaxRequestHeaders();
        self.bindAddToPlaylistClick();
        self.bindDownvote();
        self.bindSearchForm();
        self.getPlaylistInfo();
      }
    });
  },

  setAjaxRequestHeaders: function () {
    let self = this;

    $.ajaxSetup({
      beforeSend: function (xhr) {
        xhr.setRequestHeader('Authorization', 'Bearer ' + self.configuration.token);
      }
    });
  },

  bindAddToPlaylistClick: function () {
    let self = this;

    $(document).on("click", ".add-to-playlist", function (e) {
      let uri = $(this).attr("data-uri");
      self.addTrackToSpotifyPlaylist(uri);
    });
  },

  addTrackToSpotifyPlaylist: function (trackUri) {
    let self = this;

    $.ajax({
      data: JSON.stringify({ uris: [trackUri] }),
      method: "POST",
      url: "https://api.spotify.com/v1/playlists/" + self.configuration.spotifyPlaylistId + "/tracks",
    }).then(function (response) {
      playlistRef.push({
        uri: trackUri,
        created_at: firebase.database.ServerValue.TIMESTAMP
      });
    });
  },

  bindDownvote: function () {
    let self = this;

    $("#downvote").click(function (e) {
      e.preventDefault();
      if (!paused) {
        self.downvotesRef.push({ created_at: firebase.database.ServerValue.TIMESTAMP })
      } else {
        console.log("Click does nothing");
      }
    });
  },

  bindSearchForm: function () {
    let self = this;

    $("#search-form").submit(function (e) {
      e.preventDefault();

      let query = $("#search").val().trim();

      $("#search-results").empty();

      $.ajax({
        data: {
          q: query,
          type: "track"
        },
        method: "GET",
        url: "https://api.spotify.com/v1/search"
      }).then(function (response) {
        let tracks = response.tracks;
        $.each(tracks.items, function (index, trackInfo) {
          self.appendTrack("#search-results", trackInfo)
        });
      });
    });
  },

  appendTrack: function (container_selector, trackInfo) {
    let albumImage = trackInfo.album.images[2].url;
    let artist = trackInfo.artists.map(({ name }) => name).join(', ');

    let trackBody = $("<div>")
      .addClass("align-self-center media-body")
      .append($("<h6>").text(trackInfo.name))
      .append($("<p>").text(artist));
    let trackTemplate = $("<li>")
      .addClass("track media")
      .append($("<img>").attr("src", albumImage).addClass("align-self-center"))
      .append(trackBody)
      .append(
        $(
          "<button>",
          {
            class: 'add-to-playlist btn btn-sm align-self-center',
            "data-uri": trackInfo.uri,
            text: 'ADD',
          }
        )
      );

    $(container_selector).append(trackTemplate);
  },

  getPlaylistInfo: function () {
    let self = this;

    $.ajax({
      method: "GET",
      url: "https://api.spotify.com/v1/playlists/" + self.configuration.spotifyPlaylistId
    }).then(function (response) {
      console.log(response);
      self.playlistUri = response.uri;
      for (let i = 0; i < response.tracks.items.length; i++) {
        let trackInfo = response.tracks.items[i].track;
        let albumInfo = trackInfo.album;

        $("#playlist-name").text(response.name);
        $("#album-art").attr("src", albumInfo.images[1].url)
      };
    });
  },

  listenToPlayerStatus: function () {
    this.playerRef.on("value", function (playerSnapshot) {
      if (playerSnapshot.val()) {
        let playerStatus = playerSnapshot.val().paused ? 'Paused' : 'Playing';

        paused = playerSnapshot.val().paused;

        $("#song-playing").text(playerSnapshot.val().song)
        $("#artist-playing").text(playerSnapshot.val().artist)
        $("#player-status").text(playerStatus);

      } else {
        this.playerRef.set({
          paused: true
        });
      }
    });
  }
};