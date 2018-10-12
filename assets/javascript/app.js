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
    'playlist-modify-public'
  ],

  new: function () {
    this.bindAuthorizeClick();
  },

  bindAuthorizeClick: function () {
    let self = this;
    $("#authorize").on("click", function (e) {
      e.preventDefault();

      let url = "https://accounts.spotify.com/authorize?" +
        "client_id=" + appConfig.spotifyAppClientId +
        "&redirect_uri=" + self.redirectUri +
        "&scope=" + self.scopes.join(" ") +
        "&response_type=token" +
        "&show_dialog=true";

      window.location = url;
    })
  }
};