# apostrophe-favicons
## Editor-controlled favicon generator of various formats. Automatic handling of their link tags.

### Overview
Apostrophe module that leverages the [`favicons`](https://github.com/evilebottnawi/favicons) library for generating a number of differently sized favicon image formats. The image itself is an `apostrophe-images` widget that gets appended to the `apostrophe-global`, which is easily manipulated by an editor.

### Note
The image libraries that the `favicons` leverages are pure Javascript implementations. Selecting large files will see significant busy time as Apostrophe works through the crops.

### Install
Some flavors of linux don't come pre bundled with `bzip2`, which you'll need for a sub dependency
`> yum install bzip2`

and then 
`> npm install apostrophe-favicons`

### Example config
in `app.js`

```js
var apos = require('apostrophe')({
  shortName: 'yourSite',
  modules: {

    // ...
    'apostrophe-favicons': {},
    'apostrophe-favicons-global': {
      destinationDir: '/fav/',
      // Defaults to `/favicons/`. This is an uploadfs path, it will become /uploads/favicons/ on a server

      tempDir: 'temp',
      // Defaults to `tempAposFavicons`. Directory where files are temporarily written before being passed to uploadfs. This is your root project directory. Omit leading slash

      faviconConfig : {
        icons: {
          windows: false
        }
      }
      // Configuration for favicon module, see options here https://github.com/evilebottnawi/favicons#usage
      // **NOTE** The `path` option is automatically figured out by the module, no need to set it. 
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
