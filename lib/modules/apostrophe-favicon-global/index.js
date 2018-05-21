const _ = require('lodash');
const favicons = require('favicons');
const async = require('async');
const fs = require('fs-extra');

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

    var config = options.config || {
      path: "/public/favicons", // Path for overriding default icons path. `string`
      appName: null, // Your application's name. `string`
      appDescription: null, // Your application's description. `string`
      developerName: null, // Your (or your developer's) name. `string`
      developerURL: null, // Your (or your developer's) URL. `string`
      dir: "auto", // Primary text direction for name, short_name, and description
      lang: "en-US", // Primary language for name and short_name
      background: "#fff", // Background colour for flattened icons. `string`
      theme_color: "#fff", // Theme color user for example in Android's task switcher. `string`
      display: "standalone", // Preferred display mode: "fullscreen", "standalone", "minimal-ui" or "browser". `string`
      orientation: "any", // Default orientation: "any", "natural", "portrait" or "landscape". `string`
      start_url: "/?homescreen=1", // Start URL when launching the application from a device. `string`
      version: "1.0", // Your application's version string. `string`
      logging: false, // Print logs to console? `boolean`
      icons: {
        // Platform Options:
        // - offset - offset in percentage
        // - background:
        //   * false - use default
        //   * true - force use default, e.g. set background for Android icons
        //   * color - set background for the specified icons
        //
        android: true, // Create Android homescreen icon. `boolean` or `{ offset, background }`
        appleIcon: true, // Create Apple touch icons. `boolean` or `{ offset, background }`
        appleStartup: true, // Create Apple startup images. `boolean` or `{ offset, background }`
        coast: true, // Create Opera Coast icon. `boolean` or `{ offset, background }`
        favicons: true, // Create regular favicons. `boolean`
        firefox: true, // Create Firefox OS icons. `boolean` or `{ offset, background }`
        windows: true, // Create Windows 8 tile icons. `boolean` or `{ background }`
        yandex: true // Create Yandex browser icon. `boolean` or `{ background }`
      }
    };

    options.addFields = (options.addFields || []).concat(faviconFields);

    options.arrangeFields = (options.arrangeFields || []).concat([{
      name: 'aposFaviconTab',
      label: 'Favicon',
      fields: ['aposFavicon', 'aposFaviconLinks']
    }]);

    let original;

    // Before save, make a note of our favicon field so that we can see if it changed later
    const superConvert = self.convert;
    self.convert = function (req, piece, callback) {
      if (piece.aposFavicon) {
        // original = piece.aposFavicon.items[0].relationships;
      }
      console.log(original);
      return superConvert(req, piece, callback);
    };

    const superAfterSave = self.afterSave;
    self.afterSave = function (req, piece, options, callback) {
      console.log(piece.aposFavicon.items[0].relationships);
      if (JSON.stringify(original) !== JSON.stringify(piece.aposFavicon.items[0].relationships)) {
        console.log('we got a different one');
      } else {
        console.log('got an oldie');
      }

      // Move this into 'we've decided to do the things' terriotory
      const images = self.apos.modules['apostrophe-images'];
      const attachments = self.apos.modules['apostrophe-attachments'];
      let tempDir = 'tempAposFavicons';

      async.waterfall([
        cleanup,
        getImage,
        generateFavicons,
        copyToUploadFS,
        cleanup,
      ], function (err, result) {
        if (err) {
          console.log(err);
        }
        console.log('waterfall is over');
        return superAfterSave(req, piece, options, callback);
      });

      // Removes the temp directories and files this module write to fs
      // It's also run before operation to clear any prior temp stuff still hanging out
      function cleanup(callback) {
        fs.access(tempDir, fs.constants.W_OK, function(err) {
          if (err) {
            console.log('no cleanup needed');
            return callback(null);
          }
          fs.remove(tempDir, function (err) {
            if (err) {
              return callback(err);
            }
            console.log('fresh and clean');
            return callback (null);
          });
        });
      };

      function getImage(callback) {
        return images.find(req, {'_id': piece.aposFavicon.items[0].pieceIds[0]}).toObject(function (err, image) {
          if (err) {
            console.log(err);
          }

          let path = attachments.url(image.attachment, {
            uploadfsPath: true,
            size: 'original'
          });

          console.log('got our images path');
          return callback(null, path);

        });
      };

      function generateFavicons(path, callback) {
        return favicons('public/uploads' + path, config, function (err, response) {
          if (err) {
            console.log(err);
          }

          fs.mkdirSync(tempDir);

          async.each(response.images, function (image, callback) {
            fs.writeFile(tempDir + '/' + image.name, image.contents, function (err) {
              if (err) {
                return console.log(err);
              }
              return callback();
            });
          }, function (err) {
            console.log('succssfully wrote images to temp space');
            return callback(null, response);
          });
        });
      };

      function copyToUploadFS(response, callback) {
        console.log('in copy');
        // console.log(response);
        async.each(response.images, function(image, callback) {
          return attachments.uploadfs.copyIn(tempDir + '/' + image.name, '/attachments/favicons/' + image.name, function(err, info) {
            console.log(attachments.uploadfs.getUrl() + '/' + image.name);
            return callback(null);
          });
        }, function(err) {
          console.log('all images copied to uploadfs');
          return callback(null)
        });
      };
    };
  },

  // afterConstruct: function (self) {
  //   self.apos.adminBar.add('apostrophe-palette', 'Open Palette');
  // }
};