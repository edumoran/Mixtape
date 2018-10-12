app.guest = {
  configuration: undefined,
  paused: undefined,

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
      let button = $(this);
      let uri = button.attr("data-uri");
      let trackInfo = JSON.parse(button.attr("data-track-info"));

      $.ajax({
        data: JSON.stringify({ uris: [uri] }),
        method: "POST",
        url: "https://api.spotify.com/v1/playlists/" + self.configuration.spotifyPlaylistId + "/tracks",
      }).done(function (response) {
        self.addTrackToDb(trackInfo);
        button.remove();
      }).fail(function ({ responseJSON: { error } }) {
        console.log(error.message)
      });
    });
  },

  addTrackToDb: function (track) {
    app.playlistRef.transaction(function (playlist) {
      if (playlist === null) {
        playlist = {};
      }

      playlist[track.id] = {
        name: track.name,
        artist: track.artists.map(({ name }) => name).join(', '),
        image: track.album.images[track.album.images.length - 1].url,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      };

      return playlist;
    });
  },

  bindDownvote: function () {
    let self = this;

    $("#downvote").click(function (e) {
      e.preventDefault();
      if (!self.paused) {
        app.downvotesRef.push({ created_at: firebase.database.ServerValue.TIMESTAMP })
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

    let image = $("<img>").attr("src", albumImage).addClass("align-self-center");

    let trackBody = $("<div>")
      .addClass("align-self-center media-body")
      .append($("<h6>").text(trackInfo.name))
      .append($("<p>").text(artist));

    let button = $("<button>")
      .addClass("add-to-playlist btn btn-sm align-self-center")
      .attr("data-uri", trackInfo.uri)
      .attr("data-track-info", JSON.stringify(trackInfo))
      .text("ADD")

    let trackTemplate = $("<li>")
      .addClass("track media")
      .append(image)
      .append(trackBody)
      .append(button);

    $(container_selector).append(trackTemplate);
  },

  getPlaylistInfo: function () {
    let self = this;

    $.ajax({
      method: "GET",
      url: "https://api.spotify.com/v1/playlists/" + self.configuration.spotifyPlaylistId
    }).done(function (response) {
      self.playlistUri = response.uri;
    }).fail(function ({ responseJSON: { error } }) {
      console.log(error.message);
    });
  },

  listenToPlayerStatus: function () {
    let self = this;

    app.playerRef.on("value", function (playerSnapshot) {
      if (playerSnapshot.val()) {
        self.paused = playerSnapshot.val().paused;
        if (!self.paused) {
          $("#album-art").attr("src", playerSnapshot.val().image);
          $("#artist-playing").text(playerSnapshot.val().artist)
          $("#song-playing").text(playerSnapshot.val().song)
          $("#downvote").show();
        } else {
          $("#album-art").attr("src", "./assets/images/logo.png");
          $("#artist-playing").text("")
          $("#song-playing").text("")
          $("#downvote").hide();
        }
      }
    });
  }
};