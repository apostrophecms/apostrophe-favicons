apos.define('apostrophe-global-editor-modal', {
  extend: 'apostrophe-pieces-editor-modal',
  construct: function (self, options) {
    var superAfterHide = self.afterHide;
    self.afterHide = function () {
      superAfterHide();
      if (self._id) {
        apos.docs.unlock(self._id, function () {});
      }

      // var finished = false;
      requestStatus();

      function requestStatus() {
        self.api('favicon-progress', {}, function (data) {
          checkProgress(data);
        }, function (err) {
          if (err) {
            console.log(err);
          }
        });
      }

      function checkProgress(data) {
        console.log(data);
        if (data.processing === true) {
          apos.notify('we are processing');
        } else {
          apos.notify('not processing');
        }
      };     

    };
  }
});

