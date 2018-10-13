app.authorizationRequester = {
  new: function () {
    this.bindAuthorizeClick();
  },

  bindAuthorizeClick: function () {
    let self = this;
    $("#authorize").on("click", function (e) {
      e.preventDefault();

      window.location = app.spotifyAuthorizationUrl();
    })
  }
};