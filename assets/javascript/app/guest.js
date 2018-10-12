app.guest = {
  configuration: undefined,

  new: function () {
    let self = this;

    app.initializeDatabase();
    self.loadConfiguration();
    self.listenToPlayerStatus();
  },

  loadConfiguration: function () {
    let self = this;

    app.configRef.once("value", function (snapshot) {
      if (snapshot.val()) {
        self.configuration = snapshot.val();

        app.setAjaxRequestHeaders(self.configuration.token);

        self.bindAddToPlaylistClick();
        self.bindDownvote();
        self.bindSearchForm();
        self.getPlaylistInfo();
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
      app.playlistRef.push({
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
    }).done(function (response) {
      self.playlistUri = response.uri;
      for (let i = 0; i < response.tracks.items.length; i++) {
        let trackInfo = response.tracks.items[i].track;
        let albumInfo = trackInfo.album;

        $("#playlist-name").text(response.name);
        $("#album-art").attr("src", albumInfo.images[1].url)
      };
    }).fail(function ({ responseJSON: { error } }) {
      console.log(error.message);
    });
  },

  listenToPlayerStatus: function () {
    app.playerRef.on("value", function (playerSnapshot) {
      if (playerSnapshot.val()) {
        let playerStatus = playerSnapshot.val().paused ? 'Paused' : 'Playing';

        paused = playerSnapshot.val().paused;

        $("#song-playing").text(playerSnapshot.val().song)
        $("#artist-playing").text(playerSnapshot.val().artist)
        $("#player-status").text(playerStatus);

      } else {
        app.playerRef.set({
          paused: true
        });
      }
    });
  }
};