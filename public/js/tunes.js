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
    play: Em.K,
    pause: Em.K,
    prev: Em.K,
    next: Em.K,

    index: Em.Route.extend({
      route: '/',

      connectOutlets: function(router) {
        var controller = router.get('applicationController');
        controller.connectOutlet('library', 'library');
        controller.connectOutlet('playlist', 'playlist', []);

        router.get('playlistController').connectOutlet({
          outletName: 'navbar',
          viewClass: Tunes.NavbarView,
          controller: router.get('audioController')
        });

        router.get('audioController').connectControllers('playlist');
      }
    }),

    ready: Em.State.extend({
      initialState: 'queueEmpty',

      queueAlbum: function(router, event) {
        var album = event.context;
        router.get('playlistController').queueAlbum(album);
      },

      queueEmpty: Em.State.extend({
        firstAlbumQueued: Em.State.transitionTo('tracksQueued')
      }),

      tracksQueued: Em.State.extend({
        initialState: 'paused',

        dequeueAlbum: function(router, event) {
          var album = event.context;
          router.get('playlistController').dequeueAlbum(album);
        },

        lastAlbumDequeued: Em.State.transitionTo('queueEmpty'),

        playing: Em.State.extend({
          enter: function(sm) {
            sm.get('audioController').play();
            sm.set('audioController.isPlaying', true);
          },

          pause: function(sm) {
            sm.transitionTo('paused');
          },

          prev:  function(sm) {
            sm.get('playlistController').prev();
            sm.get('audioController').play();
          },

          next:  function(sm) {
            sm.get('playlistController').next();
            sm.get('audioController').play();
          }
        }),

        paused: Em.State.extend({
          enter: function(sm) {
            sm.get('audioController').pause();
            sm.set('audioController.isPlaying', false);
          },

          play:  function(sm) {
            sm.transitionTo('playing');
          },

          prev:  function(sm) {
            sm.get('playlistController').prev();
          },

          next:  function(sm) {
            sm.get('playlistController').next();
          }
        })
      })
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

Tunes.NavbarView = Em.View.extend({
  templateName: 'navbar',

  tagName: 'nav'
});

Tunes.PlaylistView = Em.View.extend({
  templateName: 'playlist',

  classNames: ['playlist']
});

Tunes.ApplicationController = Em.ArrayController.extend();

Tunes.LibraryController = Em.ArrayController.extend();

Tunes.AudioController = Em.Controller.extend({
  init: function(){
    var audio = new Audio();

    audio.addEventListener('ended', function() {
      this.get('target').send('next');
    }.bind(this));

    this.set('audio', audio);

    this._super();
  },

  play: function() {
    // queue playing the track until the beginning of the next
    // runloop to ensure currentTrack and audio src have been updated
    Em.run.next(this, function() {
      this.get('audio').play();
    });
  },

  pause: function() {
    this.get('audio').pause();
  },

  currentTrackChanged: function() {
    var newUrl = this.get('currentTrack.url');
    var audio  = this.get('audio');

    // note: we have to do this because observer fires whenever
    // dependent properties of currentTrack change, not when
    // the track itself changes.
    // it might be possible to do this more simply in the future
    // if/when observers are passed previous/new value arguments
    if (audio && this.get('_currentTrackSource') !== newUrl) {
      this.set('_currentTrackSource', newUrl);
      audio.src = newUrl;
    }
  }.observes('currentTrack'),

  currentTrackBinding: 'playlistController.currentTrack',

  // kind of stupid, but when audio.src is set it automatically prepends
  // the hostname, and we need to be able to compare the track source later
  _currentTrackSource: null
});

Tunes.PlaylistController = Em.ArrayController.extend({
  queueAlbum: function(album) {
    var albums = this.get('content');
    var isFirstAlbum = Em.empty(albums);

    albums.addObject(album);

    if (isFirstAlbum) {
      this.get('target').send('firstAlbumQueued');
    }
  },

  // this is a bit more complicated than I would like. however,
  // it's not terrible and I can't think of a simpler way to prevent
  // the playing track from skipping due to currentTrack temporarily
  // being set to undefined
  dequeueAlbum: function(album) {
    if (album === this.get('currentAlbum')) {
      this.get('target').send('pause');
    }

    // grab current track before the tracklist gets rearranged
    var currentTrack = this.get('currentTrack');

    var albums = this.get('content');

    // so that currentTrack is only updated once to the outside world
    Em.beginPropertyChanges();

    albums.removeObject(album);

    // new position for current track after album was removed
    var currentTrackIndex =
      this.get('tracks').indexOf(currentTrack);

    // reset currentTrack to first track if the currentTrack was just removed
    if (currentTrackIndex === -1) {
      currentTrackIndex = 0;
    }

    this.set('_currentTrackIndex', currentTrackIndex);

    Em.endPropertyChanges();

    if (Em.empty(albums)) {
      this.get('target').send("lastAlbumDequeued");
    }
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