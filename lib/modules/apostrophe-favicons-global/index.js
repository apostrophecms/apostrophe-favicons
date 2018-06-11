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
        contextual: true,
      }
    ];

    var config = _.merge((options.faviconConfig || {}), {
      appName: null,
      appDescription: null,
      developerName: null,
      developerURL: null,
      dir: "auto",
      lang: "en-US",
      background: "#fff",
      theme_color: "#fff",
      display: "standalone",
      orientation: "any",
      start_url: "/?homescreen=1",
      version: "1.0",
      logging: false,
      icons: {
        android: true,
        appleIcon: true,
        appleStartup: true,
        coast: true,
        favicons: true,
        firefox: true,
        windows: true,
        yandex: true
      }
    });

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
      if (piece.aposFavicon && piece.aposFavicon.items.length) {
        piece._originalFaviconRelationship = piece.aposFavicon.items[0].relationships
      }
      return superConvert(req, piece, callback);
    };

    // Check on changes made to the favicon widget in afterSave
    const superAfterSave = self.afterSave;
    self.afterSave = function (req, piece, options, callback) {
      const images = self.apos.modules['apostrophe-images'];
      const attachments = self.apos.modules['apostrophe-attachments'];
      let globalDoc = piece;
      let compare;
      let filesToWrite;

      if (piece.aposFavicon && piece.aposFavicon.items.length) {
        compare = piece.aposFavicon.items[0].relationships;
      }


      if (piece._originalFaviconRelationship && JSON.stringify(piece._originalFaviconRelationship) !== JSON.stringify(compare) && piece.aposFavicon.items[0] !== undefined) {

        // This intentionally returns control to the browser while the module crunches on a potentially
        // long resizing process. We will monitor the progress on the front-end by hitting a status route
        superAfterSave(req, piece, options, callback);

        // Set in motion the actual work of creating the favicons
        return async.waterfall([
          setup,
          setStatusToProcessing,
          cleanup,
          getImage,
          generateFavicons,
          copyToUploadfs,
          saveLinks,
          cleanup,
          setStatusToNotProcessing,
        ], function (err, result) {
          if (err) {
            console.log(err);
          }
        });

      } else {
        // If we made it here there was no change to our target field, carry on
        // make sure our processing prop is off for real

        return self.apos.docs.db.update({ _id: piece._id }, { $unset: { aposFaviconProgress: true } }, function() {
          return superAfterSave(req, piece, options, callback);
        });
      }

        ////////////
        // Things needed for generating the favicons
        ////////////

        function setup(callback) {
          tempDir = attachments.uploadfs.getTempPath() + '/' + tempDir;
          return callback(null);
        }

        // Temporarily set a processing prop on the global doc so the front end knows whats going on
        function setStatusToProcessing (callback) {
          return self.apos.docs.db.update({ _id: piece._id }, { $set: { aposFaviconProgress: true } }, function() {
            return callback(null);
          });
        }

        // Remove temp propo
        function setStatusToNotProcessing (callback) {
          return self.apos.docs.db.update({ _id: piece._id }, { $unset: { aposFaviconProgress: '' } }, function() {
            return callback(null);
          });
        }

        // Removes the temp directories and files this module write to fs
        // It's also run before operation to clear any prior temp stuff still hanging out
        function cleanup(callback) {
          fs.access(tempDir, fs.constants.W_OK, function (err) {
            if (err) {
              return callback(null);
            }
            fs.remove(tempDir, function (err) {
              if (err) {
                return callback(err);
              }
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

            let originalPath = '/attachments/' + image.attachment._id + '-' + image.attachment.name + '.' + image.attachment.extension;
            let tempPath = attachments.uploadfs.getTempPath() + '/' + self.apos.utils.generateId() + '.' + image.attachment.extension;

            return attachments.uploadfs.copyOut(originalPath, tempPath, function() {
              return callback(null, tempPath);
            });

          });
        };

        // Generate the individual favicon files
        // Temporarily write them to disk while we get ready to pass them to uploadfs
        function generateFavicons(path, callback) {
          config.path = attachments.uploadfs.getUrl() + destinationDir;
          return favicons(path, config, function (err, response) {
            if (err) {
              console.log(err);
            }

            fs.mkdirSync(tempDir);
            filesToWrite = response.images.concat(response.files);
            async.each(filesToWrite, function (file, callback) {

              fs.writeFile(tempDir + '/' + file.name, file.contents, function (err) {
                if (err) {
                  return console.log(err);
                }
                return callback();
              });
            }, function (err) {
              fs.unlink(path, function () {});
              return callback(null, response);
            });
          });
        };

        // Hand each file to uploadfs
        function copyToUploadfs(response, callback) {
          async.each(filesToWrite, function (file, callback) {
            return attachments.uploadfs.copyIn(tempDir + '/' + file.name, destinationDir + file.name, function (err, info) {
              return callback(null);
            });
          }, function (err) {
            return callback(null, response)
          });
        };

        // Save the generated tag markup to the
        function saveLinks(response, callback) {
          globalDoc.aposFaviconLinks = response.html.join('');
          return self.apos.docs.db.update({ _id: piece._id }, { $set: { aposFaviconLinks: response.html.join('') } }, function() {
            return callback(null);
          });
        };
    };
  }
};
