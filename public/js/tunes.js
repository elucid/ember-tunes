Tunes = Em.Application.create({
  ready: function() {
    $.ajax({
      url: '/albums.json',
      success: function(data) {
        var router = this.get('router');
        router.get('libraryController').set('content', data);
        router.transitionTo('ready');
      },
      context: this
    });
  }
});

Tunes.Router = Em.Router.extend({
  enableLogging: true,

  root: Em.Route.extend({
    index: Em.Route.extend({
      route: '/',

      connectOutlets: function(router) {
        var controller = router.get('applicationController');
        controller.connectOutlet('library', 'library');
        controller.connectOutlet('playlist', 'playlist', []);
      }
    }),

    ready: Em.State.extend({
      queueAlbum: function(router, event) {
        var album = event.context;
        router.get('playlistController').queueAlbum(album);
      },

      dequeueAlbum: function(router, event) {
        var album = event.context;
        router.get('playlistController').dequeueAlbum(album);
      }
    })
  })
});

Tunes.ApplicationView = Em.View.extend({
  templateName: 'application',

  elementId: 'container'
});

Tunes.LibraryView = Em.View.extend({
  templateName: 'library',

  tagName: 'section',

  classNames: ['library']
});

Tunes.AlbumView = Em.View.extend({
  templateName: 'album',

  classNames: ['album']
});

Tunes.TrackView = Em.View.extend({
  template: Em.Handlebars.compile("{{track.title}}"),

  tagName: 'li'
});

Tunes.PlaylistView = Em.View.extend({
  templateName: 'playlist',

  classNames: ['playlist']
});

Tunes.ApplicationController = Em.ArrayController.extend();

Tunes.LibraryController = Em.ArrayController.extend();

Tunes.PlaylistController = Em.ArrayController.extend({
  queueAlbum: function(album) {
    this.get('content').addObject(album);
  },

  dequeueAlbum: function(album) {
    this.removeObject(album);
  }
});

Tunes.initialize();