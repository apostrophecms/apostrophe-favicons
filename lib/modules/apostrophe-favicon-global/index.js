const _ = require('lodash');
const favicons = require('favicons');
const async = require('async');
const fs = require('fs-extra');

module.exports = {
  improve: 'apostrophe-global',

  construct: function (self, options) {

    let destinationDir = options.destinationDir || '/favicons/';
    let tempDir = 'tempAposFavicons';
    let faviconFields = [
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
        type: 'string',
        // contextual: true,
      }
    ];

    var config = options.config || {
      // path: attachments.uploadfs.getUrl() + destinationDir, // Path for overriding default icons path. `string`
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

    self.pushAsset('script', 'user', { when: 'user' });

    // front-end route for monitoring the progress of a favicon job
    self.route('post', 'favicon-progress', function (req, res) {
      if (req.data.global.aposFaviconProgress) {
        return res.json({ processing: true });
      } else {
        return res.json({ processing: false });
      }
    });

    // Before save, make a note of our favicon field so that we can see if it changed later
    const superConvert = self.convert;
    self.convert = function (req, piece, callback) {
      console.log(piece.aposFavicon);
      if (piece.aposFavicon && piece.aposFavicon.items.length) {
        piece._originalFaviconRelationship = piece.aposFavicon.items[0].relationships
      }
      return superConvert(req, piece, callback);
    };

    // Check on changes made to the favicon widget in afterSave
    const superAfterSave = self.afterSave;
    self.afterSave = function (req, piece, options, callback) {
      console.log('************');
      console.log('AFTER SAVE');
      console.log('************');

      const images = self.apos.modules['apostrophe-images'];
      const attachments = self.apos.modules['apostrophe-attachments'];
      let globalDoc = piece;

      
      if (options.final) {
        console.log('FINAL CALLED');
        return superAfterSave(req, piece, options, callback);
      }

      if (options.generateFavicons) {
        console.log('TIME TO GENERATE');
        return async.waterfall([
          // setStatustoProcessing,
          cleanup,
          getImage,
          generateFavicons,
          copyToUploadfs,
          // getGlobal,
          // getSchema,
          saveLinks,
          cleanup,
          // setStatustoNotProcessing,
        ], function (err, result) {
          if (err) {
            console.log(err);
          }
          console.log('waterfall is over');
          return superAfterSave(req, piece, options, callback);
        });
      }

      let compare;
      if (piece.aposFavicon && piece.aposFavicon.items.length) {
        compare = piece.aposFavicon.items[0].relationships;
      }
    
      if (JSON.stringify(piece._originalFaviconRelationship) !== JSON.stringify(compare)) {
        console.log('change time');

        globalDoc.aposFaviconProgress = true;
        return self.apos.global.update(req, globalDoc, { generateFavicons: true }, function(err) {
          if (err) {
            return callback(err);
          }
          // want to let go of the browser here
          // callback(null);
          superAfterSave(req, piece, options, callback);
        });

      } else {
        // nothing changed, move along
        console.log('no change');
        return superAfterSave(req, piece, options, callback);
      }

        // Things needed for generating the favicons

        // Removes the temp directories and files this module write to fs
        // It's also run before operation to clear any prior temp stuff still hanging out
        function cleanup(callback) {
          console.log(callback);
          fs.access(tempDir, fs.constants.W_OK, function (err) {
            if (err) {
              console.log('no cleanup needed');
              console.log(callback);
              return callback(null);
            }
            fs.remove(tempDir, function (err) {
              if (err) {
                return callback(err);
              }
              console.log('fresh and clean');
              console.log(callback);
              return callback(null);
            });
          });
        };

        // Retrieve the file path to the favicon image
        function getImage(callback) {
          return images.find(req, {
            '_id': piece.aposFavicon.items[0].pieceIds[0]
          }).toObject(function (err, image) {
            if (err) {
              console.log(err);
            }

            let path = self.apos.rootDir + '/public' + attachments.url(image.attachment, {
              uploadfsPath: false,
              size: 'original'
            });

            console.log('got our images path');
            return callback(null, path);

          });
        };

        // Generate the individual favicon files
        // Temporarily write them to disk while we get ready to pass them to uploadfs
        function generateFavicons(path, callback) {
          console.log('in generate')
          config.path = attachments.uploadfs.getUrl() + destinationDir;
          return favicons(path, config, function (err, response) {
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

        // Hand each file to uploadfs
        function copyToUploadfs(response, callback) {
          console.log('in copy');
          // console.log(response);
          async.each(response.images, function (image, callback) {
            return attachments.uploadfs.copyIn(tempDir + '/' + image.name, destinationDir + image.name, function (err, info) {
              return callback(null);
            });
          }, function (err) {
            return callback(null, response)
          });
        };

        // Save the generated tag markup to the 
        function saveLinks(response, callback) {
          globalDoc.aposFaviconLinks = response.html.join('');
          return self.apos.global.update(req, globalDoc, { final: true }, function (err) {
            if (err) {
              return callback(err);
            }
            return callback(null);
          });
        };

    };
  }
};