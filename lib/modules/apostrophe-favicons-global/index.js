const _ = require('lodash');
const async = require('async');
const fs = require('fs-extra');
const cp = require('child_process');

module.exports = {
  improve: 'apostrophe-global',

  construct: function (self, options) {
    let destinationDir = options.faviconDestinationDir || '/favicons/';
    let tempDir = self.apos.modules['apostrophe-attachments'].uploadfs.getTempPath() + '/tempAposFavicons';
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
      }
    ];

    options.addFields = (options.addFields || []).concat(faviconFields);
    options.arrangeFields = (options.arrangeFields || []).concat([{
      name: 'aposFaviconTab',
      label: 'Favicon',
      fields: ['aposFavicon', 'aposFaviconLinks']
    }]);

    self.pushAsset('script', 'user', { when: 'user' });

    // Check on changes made to the favicon widget in afterSave
    const superAfterSave = self.afterSave;
    self.afterSave = function (req, piece, options, callback) {
      // This intentionally returns control to the browser while the module crunches on a potentially
      // long resizing process. We will monitor the progress on the front-end by hitting a status route

      superAfterSave(req, piece, options, callback);

      // It never makes sense to build a favicon for a temporary site
      // created by apostrophe-multisite for asset generation purposes
      // only, and that site will die before the process completes,
      // leading to race conditions
      if (self.apos.argv['temporary-site']) {
        return;
      }

      return self.buildFavicons(req.user && req.user._id, function (err) {
        if (err) {
          // All we can do since this is asynchronous after the save
          self.apos.utils.error(err);
        }
      });
    };

    self.addTask('build-favicons', `
Rebuild the favicon and similar files based on the current selection
in the global preferences. Returns immediately if the selection has
not changed or has not been made. Normally called for you when
the global preferences are saved.`,
    function (apos, argv, callback) {
      return self.buildFavicons(argv['notify-user-id'], callback);
    }
    );

    self.buildFavicons = function (notifyUserId, callback) {
      const attachments = self.apos.modules['apostrophe-attachments'];
      let compare;
      let filesToWrite = [];
      let piece;
      const req = self.apos.tasks.getReq();

      return async.series([
        findGlobal,
        body
      ], callback);

      function findGlobal (callback) {
        return self.findGlobal(req, function (err, _piece) {
          if (err) {
            return callback(err);
          }
          piece = _piece;
          return callback(null);
        });
      }

      function body (callback) {
        if (piece.aposFavicon && piece.aposFavicon.items.length && piece.aposFavicon.items[0]._pieces[0]) {
          compare = JSON.stringify(piece.aposFavicon.items[0].relationships);
        } else {
          // no image or image was deleted from field
          // clear out processed fields
          return saveFields({ html: [] }, callback);
        }

        if (compare !== piece.aposFaviconRelationship) {
          notify(notifyUserId, 'Processing favicon files...');
          return async.waterfall([
            cleanup,
            getImage,
            generateFavicons,
            copyToUploadfs,
            saveFields,
            function (result, callback) {
              return cleanup(callback);
            }
          ], function (err) {
            if (err) {
              if (err === 'notfound') {
                // Image no longer exists, that's OK
                return callback(null);
              }
              self.apos.utils.error(err);
              notify(notifyUserId, 'An error occurred processing the favicon files.');
              return callback(err);
            } else {
              notify(notifyUserId, 'Favicon processing complete.');
              return callback(err);
            }
          });
        } else {
          // If we made it here there was no change to our target field, carry on
          return callback(null);
        }

        /// /////////
        // Things needed for generating the favicons
        /// /////////

        // Removes the temp directories and files this module write to fs
        // It's also run before operation to clear any prior temp stuff still hanging out
        function cleanup (callback) {
          return fs.remove(tempDir, callback);
        }

        // Retrieve the file path to the favicon image
        function getImage (callback) {
          const image = piece.aposFavicon.items[0]._pieces[0].item;
          // Use the existing resized image closest to 512 pixels
          // wide and tall, without being smaller, as the source image.
          // This addresses a major performance problem encountered
          // otherwise with the favicon module as it resizes the original
          // naively over and over for every conversion it performs
          const sizes = (self.apos.attachments.uploadfs.options.imageSizes || []);
          let size;
          sizes.forEach((s) => {
            if ((s.width > 196) && (s.height > 196)) {
              if (!size) {
                size = s;
              }
            }
          });

          let originalPath = attachments.url(image.attachment, {
            uploadfsPath: true,
            size: size.name,
            crop: piece.aposFavicon.items[0]._pieces[0].relationship
          });

          if (image.attachment.extension === 'svg') {
            originalPath = attachments.url(image.attachment, {
              uploadfsPath: true
            });
          }

          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
          }
          let tempPath = tempDir + '/original.' + image.attachment.extension;
          return attachments.uploadfs.copyOut(originalPath, tempPath, function (err) {
            if (err) {
              return callback(err);
            }
            return callback(null, tempPath);
          });
        }

        // Generate the individual favicon files
        // Temporarily write them to disk while we get ready to pass them to uploadfs
        function generateFavicons (tempPath, callback) {
          // https://www.emergeinteractive.com/insights/detail/the-essentials-of-favicons/
          // I cut the deprecated stuff and the special case for Windows 8.1 tiles
          let sizes = [
            32, 128, 152, 180, 192, 196
          ];

          let args = [];
          args.push(tempPath);

          _.each(sizes, function (size) {
            args.push('(');
            args.push('-clone');
            args.push('0--1');
            args.push('-resize');
            args.push(size + 'x' + size + '>');
            args.push('-write');
            let suffix = 'favicon-' + size + '.png';
            let tempFile = tempDir + '/' + suffix;
            filesToWrite.push(suffix);
            args.push(tempFile);
            args.push('+delete');
            args.push(')');
          });

          // We don't care about the official output, which would be the
          // intermediate scaled version of the image. Use imagemagick's
          // official null format

          args.push('null:');

          return cp.execFile('convert', args, {}, function (err) {
            return callback(err);
          });
        }

        // Hand each file to uploadfs
        function copyToUploadfs (callback) {
          return async.each(filesToWrite, function (file, callback) {
            return attachments.uploadfs.copyIn(tempDir + '/' + file, destinationDir + file, callback);
          }, function (err) {
            if (err) {
              return callback(err);
            }
            return callback(null, {
              html: [ 32, 128, 192 ].map(function (size) {
                return '<link rel="icon" href="' + attachments.uploadfs.getUrl() + destinationDir + 'favicon-' + size + '.png" sizes="' + size + 'x' + size + '">\n';
              }).concat([ 196 ].map(function (size) {
                return '<link rel="shortcut icon" href="' + attachments.uploadfs.getUrl() + destinationDir + 'favicon-' + size + '.png" sizes="' + size + 'x' + size + '">\n';
              })).concat([ 152, 180 ].map(function (size) {
                return '<link rel="apple-touch-icon" href="' + attachments.uploadfs.getUrl() + destinationDir + 'favicon-' + size + '.png" sizes="' + size + 'x' + size + '">\n';
              }))
            });
          });
        }

        // Save the generated tag markup to the global doc
        function saveFields (response, callback) {
          let relationship;
          if (piece.aposFavicon && piece.aposFavicon.items[0] && piece.aposFavicon.items[0].relationships) {
            relationship = JSON.stringify(piece.aposFavicon.items[0].relationships);
          } else {
            relationship = 'undefined';
          }
          return self.apos.docs.db.update({ _id: piece._id }, { $set: {
            aposFaviconLinks: response.html.join(''),
            aposFaviconRelationship: relationship
          } }, callback);
        }
      }

      function notify (id, msg) {
        if (!id) {
          return;
        }
        return self.apos.notify.apply(self.apos, arguments);
      }
    };
  }
};
