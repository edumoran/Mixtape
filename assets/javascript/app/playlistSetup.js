app.playlistSetup = {
  searchParams: new URLSearchParams(window.location.search),
  spotifyUserId: undefined,
  token: window.location.hash.split("=")[1],

  new: function () {
    let self = this;

    $(document).ready(function () {
      app.initializeDatabase();
      self.validateAuthentication();
    });
  },

  validateAuthentication: function () {
    if (this.token !== undefined) {
      app.setAjaxRequestHeaders(this.token);
      this.getUserInfo();
    } else {
      this.handleAuthenticationError();
    }
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
      self.bindSetupClick();
    });
  },

  bindSetupClick: function () {
    let self = this;
    $("#setup").click(function () {
      if ($("#playlist").val() !== '') {
        self.saveConfiguration();
      } else {
        swal({
          title: 'Error!',
          text: 'You need to select a playlist!',
          icon: 'error'
        });
      }
    });
  },

  saveConfiguration: function () {
    app.configRef.set({
      token: this.token,
      spotifyUserId: this.spotifyUserId,
      spotifyPlaylistId: $("#playlist").val()
    }).then(function () {
      window.location = "host.html";
    }).catch(function (error) {
      swal(error);
    });
  },

  handleAuthenticationError: function () {
    let errorHeader = $("<h2>").text("Autentication failed");
    let callToAction = $("<a>")
      .attr("href", app.spotifyAuthorizationUrl())
      .addClass("btn")
      .text("Try again");

    $("#error")
      .append(errorHeader)
      .append(callToAction);
  }
};