# mosaic

🚧 This library is currently under construction and not ready for public use 🚧

## [![npm](https://img.shields.io/npm/v/mosaic.svg)](http://npm.im/mosaic) [![Build Status](https://travis-ci.com/defx/mosaic.svg?branch=master)](https://travis-ci.com/defx/mosaic) [![Coverage Status](https://coveralls.io/repos/github/defx/mosaic/badge.svg?branch=master)](https://coveralls.io/github/defx/mosaic?branch=master) [![gzip size](https://img.badgesize.io/https://unpkg.com/mosaic/dist/mosaic.min.js?compression=gzip&label=gzip)]()

Mosaic is CLI for building web sites and apps.

# pages/

create a /pages folder that includes files for each of the pages in your site. These files can be HTML or Markdown. Code blocks in markdown files are automatically processed with Highlight JS. Markdown files may include HTML blocks if required.

# components/

Mosaic assumes that any JS files stored in the components directory are _self-defining_ web components. If you include a custom element tag in one of your pages and there is a component js file matching the same name (or living in a components/\*\* folder of the same name) then mosaic will inject a script[type="module"] into that page so that your component gets loaded.
