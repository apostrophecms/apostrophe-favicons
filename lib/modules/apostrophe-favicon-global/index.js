const util = require('util')
var _ = require('lodash');
var async = require('async');

module.exports = {
  improve: 'apostrophe-global',

  construct: function (self, options) {
    var faviconFields = [
      {
        name: 'aposFavicon',
        label: 'Favicon Image',
        type: 'singleton',
        widgetType: 'apostrophe-images',
        options: {
          aspectRatio: [ 1, 1 ],
          minSize: [ 500, 500 ],
          limit: [ 1 ]
        }
      },
      {
        name: 'aposFaviconLinks',
        label: 'Favicon Link Tags',
        type: 'array',
        contextual: true,
        schema: [
          {
            name: 'link',
            label: 'Link Tag',
            type: 'object'
          }
        ]
      }
    ];

    options.addFields = (options.addFields || []).concat(faviconFields);

    var fieldNames = _.map(options.paletteFields, function (field) {
      return field.name
    });

    options.arrangeFields = (options.arrangeFields || []).concat([{
      name: 'aposFaviconTab',
      label: 'Favicon',
      fields: ['aposFavicon', 'aposFaviconLinks']
    }]);

  },

  // afterConstruct: function (self) {
  //   self.apos.adminBar.add('apostrophe-palette', 'Open Palette');
  // }
};
