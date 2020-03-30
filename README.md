[![CircleCI](https://circleci.com/gh/apostrophecms/apostrophe-favicons/tree/master.svg?style=svg)](https://circleci.com/gh/apostrophecms/apostrophe-favicons/tree/master)

# apostrophe-favicons
## Editor-controlled favicon generator of various formats. Automatic handling of their link tags.

### Overview

Apostrophe module that generates a number of differently sized favicon image formats. The image itself is an `apostrophe-images` widget that gets appended to the `apostrophe-global`, which is easily manipulated by an editor.

Unlike version 1.x, this module uses `imagemagick` to perform image conversions. This is a standard prerequisite for the use of ApostropheCMS with good performance when uploading images, so you should already have it installed in both dev and production environments. See the [getting started guide](https://docs.apostrophecms.org/apostrophe/getting-started/setting-up-your-environment#install-imagemagick) and the [production guide](https://docs.apostrophecms.org/apostrophe/apostrophe-devops/deployment/deployment).


### Note
Performance is much better than 1.x, however there are no options to pass on to the `favicon` npm module because we do not use it.

### Example config
in `app.js`

```js
var apos = require('apostrophe')({
  shortName: 'yourSite',
  modules: {

    // Enable the module, enhances apostrophe-global
    'apostrophe-favicons': {},
    // Now apostrophe-global has some new options
    'apostrophe-global': {
      faviconDestinationDir: '/fav/',
      // Defaults to `/favicons/`. This is an uploadfs path, it will become /uploads/favicons/ on a server
    }

  }
});
```
### Outputting the link tags
After you have selected and generated your favicons, you can use the following macro to output the markup into your template.

```html
<!-- in layout.html or something -->
{% extends "outerLayoutBase.html" %}
{% import 'apostrophe-favicons:faviconMacros.html' as favicons %}
...
{% block extraHead %}
  {{ favicons.renderLinks(apos, data.global) }}
{% endblock %}
```
