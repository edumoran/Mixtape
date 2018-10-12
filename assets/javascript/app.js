const appConfig = {
  spotifyAppClientId: '22c6bf8f33e4445896f7dfd87a6ebec4'
};

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
      "client_id=" + appConfig.spotifyAppClientId +
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
}