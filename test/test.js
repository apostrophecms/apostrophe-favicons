var favicons = require('favicons')
var fs = require('fs');

var config = {
  path: "/test/favicons", // Path for overriding default icons path. `string`
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

favicons('test/test.jpg', config, function (err, response) {
  if (err) {
    console.log(err);
  }
  // console.log(response.images);
  // console.log(response.files);
  // console.log(response.html);
// fs.writeFile(filename, data, [encoding], callback)
  response.images.forEach(function(image) {
    console.log('====');
    console.log(image.name);
    console.log(image.contents);

    fs.writeFileSync(image.name, image.contents, function (err) {
      if (err) {
        return console.log(err);
      }

      console.log("The file was saved!");
    });
  })


  
  // return console.log('done');

});
