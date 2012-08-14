Tunes = Em.Application.create();

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

Tunes.libraryController = Em.ArrayController.create();

Tunes.playlistController = Em.ArrayController.create({
  contentBinding: 'Tunes.libraryController'
});

$.getJSON('/albums', function(data){
  Tunes.libraryController.set('content', data);
});

Tunes.initialize();