# Changelog

## 2.0.7 - 2022-02-08

* Does not crash if the image widget has piece ids but the actual image piece is no longer available (in the trash, for instance)

## 2.0.6 - 2020-07-15

* Reduces required image size to 200px x 200px
* Adds support for 167px x 167px favicon

## 2.0.5

Previously committing a new favicon did not update the favicon seen while in draft mode. Since initially saving the global doc doesn't do it either in draft mode, this led editors to think the feature didn't work at all, although it was updating for logged-out users, or for live and preview modes.

Starting in version 2.0.5, committing the favicon change in the global doc will immediately be visible in draft mode too. In a future release, we plan to support immediately seeing a favicon change when clicking "Save Changes" for the global doc, however this requires careful attention to backwards compatibility.

## 2.0.4

Updates ESLint and fixes linting errors.

## 2.0.3

Fixed bug relating to detecting that a new favicon image has been chosen.

## 2.0.2

Fixed bug relating to behavior when the working folder does not yet exist. Thanks to Kalia at swiss4ward for reporting the issue.

## 2.0.1

eslint dependencies and eslint passing.

## 2.0.0

New release based on `imagemagick` rather than the `favicon` npm module. Much faster with minimized CPU impact. However it no longer takes the options that could formerly be passed to `favicon`, so the major version has been bumped.

## 1.1.5

Play nicely with `apostrophe-multisite`, don't get involved at asset bundle generation time.

## 1.1.4

Do not crash if the aposFavicon property does not exist.

## 1.1.3

Do not crash if the temp dir already exists.

## 1.1.2

* Fixes a bug caused by picking an SVG from the media library. Favicons can now be generated from SVGs

* Fixes a bug where favicon processing was running more than necessary. This was specifically seen when using in conjunction with `apostrophe-workflow` (and potentially `apostrophe-palette`). Now we store the last good image relationship as a string on the global doc for more consistent comparison.

## 1.1.0

* Progress is now displayed via the new server-side support for `apos.notify` in Apostrophe. Note that Apostrophe must be at least version 2.73.0.

* Performance is drastically improved when the source image is large. We now start with the prescaled version of the image not less than 512 pixels in size on both axes, rather than wasting a great deal of time and RAM scaling a large original many times.

* All operations are now performed in a forked process. This prevents the favicon scaling computation, which is mostly synchronous code, from blocking the use of the Apostrophe site in the meantime.

Further performance improvement is possible by using external tools such as `imagemagick` for the image conversion work but this is already a major improvement.

