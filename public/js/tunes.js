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
      },

      prev: function(router) {
        router.get('playlistController').prev();
      },

      next: function(router) {
        router.get('playlistController').next();
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

  classNames: ['album'],

  classNameBindings: ["isCurrent:current"],

  isCurrent: function() {
    return this.get('album') === this.get('controller.currentAlbum');
  }.property('album', 'controller.currentAlbum')
});

Tunes.TrackView = Em.View.extend({
  template: Em.Handlebars.compile("{{track.title}}"),

  tagName: 'li',

  classNameBindings: ['isCurrent:current'],

  isCurrent: function() {
    return this.get('track') === this.get('controller.currentTrack');
  }.property('track', 'controller.currentTrack')
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
  },

  prev: function() {
    var length = this.get('tracks.length');
    var cti = this.get('_currentTrackIndex');

    if (cti === 0) {
      this.set('_currentTrackIndex', length - 1);
    } else {
      this.set('_currentTrackIndex', cti - 1);
    }
  },

  next: function() {
    var length = this.get('tracks.length');
    var cti = this.get('_currentTrackIndex');

    if (cti === length - 1) {
      this.set('_currentTrackIndex', 0);
    } else {
      this.set('_currentTrackIndex', cti + 1);
    }
  },

  currentTrack: function() {
    return this.get('tracks').objectAt(this.get('_currentTrackIndex'));
  }.property('_currentTrackIndex', 'tracks'),

  currentAlbum: function() {
    return this.get('currentTrack.album');
  }.property('currentTrack'),

  tracks: function() {
    return this.get('content').reduce(function(res, album) {
      var tracks = album.tracks.map(function(track){
        return $.extend(track, {album: album});
      });

      return res.concat(tracks);
    }, []);
  }.property('content.@each'),

  _currentTrackIndex: 0
});

Tunes.initialize();