const app = {
  databaseConfiguration: {
    apiKey: "AIzaSyCn4GMziR3J4Ws8z-V0XHXHNJywpQTPi-8",
    authDomain: "mixtape-a16f5.firebaseapp.com",
    databaseURL: "https://mixtape-a16f5.firebaseio.com",
    projectId: "mixtape-a16f5",
    storageBucket: "mixtape-a16f5.appspot.com",
    messagingSenderId: "121994662765"
  },

  spotifyAppClientId: '22c6bf8f33e4445896f7dfd87a6ebec4',
  spotifyAuthorizationCallbackUrl: window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/")) + "/setup.html",
  spotifyScopes: [
    'streaming',
    'user-read-birthdate',
    'user-read-email',
    'user-read-private',
    'playlist-modify-private',
    'playlist-modify-public',
    'playlist-read-private'
  ],

  initializeDatabase: function () {
    firebase.initializeApp(this.databaseConfiguration);

    // Set references
    this.configRef = firebase.database().ref("config");
    this.downvotesRef = firebase.database().ref("downvotes");
    this.playerRef = firebase.database().ref("player");
    this.playlistRef = firebase.database().ref("playlist");
  },

  setAjaxRequestHeaders: function (token) {
    $.ajaxSetup({
      beforeSend: function (xhr) {
        xhr.setRequestHeader("Authorization", "Bearer " + token);
      }
    });
  },

  spotifyAuthorizationUrl: function () {
    return "https://accounts.spotify.com/authorize?" +
      "client_id=" + this.spotifyAppClientId +
      "&redirect_uri=" + this.spotifyAuthorizationCallbackUrl +
      "&scope=" + this.spotifyScopes.join(" ") +
      "&response_type=token" +
      "&show_dialog=true";
  }
};