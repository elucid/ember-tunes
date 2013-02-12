window.Tunes = Ember.Application.create();

Tunes.Router.map(function() {
  this.route('library');        // this is our default route
});

Tunes.ApplicationRoute = Ember.Route.extend({
  // TODO: possibly explain why we need to manually define a controller
  // here when it was not necessary to do so for the other routes.
  // Also, explain why we are doing this in ApplicationRoute and not
  // PlaylistRoute, etc.
  setupController: function() {
    this.controllerFor('playlist').set('content', []);
  },

  events: {
    // TODO: explain why we put this here instead of a controller
    queueAlbum: function(album) {
      // NOTE: we use addObject to prevent queueing duplicates
      this.controllerFor('playlist').addObject(album);
    },

    dequeueAlbum: function(album) {
      this.controllerFor('playlist').removeObject(album);
    }
  }
});

// TODO: explain ApplicationRoute and IndexRoute defaults and why we override
// here for a different default route
Tunes.IndexRoute = Ember.Route.extend({
  redirect: function() {
    this.transitionTo('library');
  }
});

Tunes.LibraryRoute = Ember.Route.extend({
  model: function() {
    var content = [];

    $.ajax({
      url: '/albums.json',
      success: function(albums) {
        // NOTE: this is a small workaround so that tracks can refer back to
        // their parent albums. It would not be necessary if we were using
        // Ember Data.
        var albums = albums.map(function(album){
          var tracks = album.tracks.map(function(track){
            return $.extend(track, {album: album});
          });
          return $.extend(album, {tracks: tracks});
        });

        content.pushObjects(albums);
      }
    });

    return content;
  }
});

Tunes.PlaylistView = Em.View.extend({
  classNames: ['playlist']
});

Tunes.LibraryView = Em.View.extend({
  tagName: 'section',

  classNames: ['library']
});

Tunes.PlayerView = Em.View.extend({
  tagName: 'nav'
});

Tunes.PlayerController = Em.Controller.extend({
  needs: ['playlist'],

  currentTrack: null,
  currentTrackBinding: 'controllers.playlist.currentTrack',

  isPlaying: false,

  init: function(){
    this._super();

    var audio = new Audio();

    audio.addEventListener('ended', function() {
      this.next();
    }.bind(this));

    this.set('audio', audio);
  },

  play: function() {
    // NOTE: queue playing the track until the beginning of the next
    // runloop to ensure currentTrack and audio src have been updated
    // TODO: I would expect Em.run.schedule('sync', ...) to also work
    // but it does not. Find out why.
    Em.run.next(this, function() {
      this.get('audio').play();
      this.set('isPlaying', true);
    });
  },

  pause: function() {
    this.get('audio').pause();
    this.set('isPlaying', false);
  },

  currentTrackChanged: function() {
    this.get('audio').src = this.get('currentTrack.url');
  }.observes('currentTrack'),

  prev: function() {
    this.get('target').send('prev');
    if (this.get('isPlaying')) {
      this.play();
    }
  },

  next: function() {
    this.get('target').send('next');
    if (this.get('isPlaying')) {
      this.play();
    }
  }
});

Tunes.PlaylistController = Em.ArrayController.extend({
  // NOTE: as of 50a765a there is a bug related to using the itemController
  // argument to the handlebars each helper. We would hit it in this case
  // so we will instead specify the property on the parent ArrayController
  itemController: 'playlistAlbum',

  currentTrack: null,

  prev: function() {
    this.set('currentTrack', this.get('prevTrack'));
  },

  next: function() {
    this.set('currentTrack', this.get('nextTrack'));
  },

  prevTrack: function() {
    var tracks = this.get('tracks');
    var currentIndex = tracks.indexOf(this.get('currentTrack'));
    var prevIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1;

    return tracks.objectAt(prevIndex);
  }.property('tracks', 'currentTrack'),

  nextTrack: function() {
    var tracks = this.get('tracks');
    var currentIndex = tracks.indexOf(this.get('currentTrack'));
    var nextIndex = currentIndex === (tracks.length - 1) ? 0 : currentIndex + 1;

    return tracks.objectAt(nextIndex);
  }.property('tracks', 'currentTrack'),

  currentAlbum: function() {
    return this.get('currentTrack.album');
  }.property('currentTrack'),

  // Automatically reset currentTrack When the playlist
  // is populated for the first time or emptied
  defaultCurrentTrackObserver: function() {
    if (this.get('tracks.length')) {
      if (!this.get('currentTrack')) {
        this.set('currentTrack', this.get('tracks.firstObject'));
      }
    } else {
      this.set('currentTrack', null);
    }
  }.observes('tracks.length'),

  // NOTE: first CP! we are using instead of doing something similar to
  // backbone screencast to avoid having the implementation diverge from
  // domain model
  tracks: function() {
    return (this.get('content') || []).reduce(function(res, album) {
      return res.concat(album.tracks);
    }, []);
  }.property('content.@each')
});

Tunes.PlaylistAlbumController = Em.ObjectController.extend({
  needs: ['playlist'],

  // TODO: is this best practice?
  currentAlbum: null,
  currentAlbumBinding: 'controllers.playlist.currentAlbum',

  current: function() {
    return this.get('content') === this.get('currentAlbum');
  }.property('content', 'currentAlbum')
});

Tunes.PlaylistTrackController = Em.ObjectController.extend({
  needs: ['playlist'],

  // TODO: is this best practice?
  currentTrack: null,
  currentTrackBinding: 'controllers.playlist.currentTrack',

  current: function() {
    return this.get('content') === this.get('currentTrack');
  }.property('content', 'currentTrack')
});
