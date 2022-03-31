# mosaic

## [![npm](https://img.shields.io/npm/v/mosaic.svg)](http://npm.im/mosaic) [![Build Status](https://travis-ci.com/defx/mosaic.svg?branch=master)](https://travis-ci.com/defx/mosaic) [![Coverage Status](https://coveralls.io/repos/github/defx/mosaic/badge.svg?branch=master)](https://coveralls.io/github/defx/mosaic?branch=master) [![gzip size](https://img.badgesize.io/https://unpkg.com/mosaic/dist/mosaic.min.js?compression=gzip&label=gzip)]()

Mosaic is a framework for building user interfaces for the web

## Features

- Simple templates for declarative data & event binding
- Reactive data bindings update your view efficiently and
  automatically
- Full component workflow using standard Custom Elements
- Small footprint (~4k)
- No special compiler, plugins, required
- Minimal learning curve (almost entirely standard HTML, JS,
  and CSS!)
- Interoperable with other libraries and frameworks

[Learn how to use Mosaic in your own project](https://mosaicjs.org/learn/introduction).

## Installation

Mosaic is available from npm:

```bash
$ npm i mosaic
```

You can also import Mosaic directly in the browser via CDN:

```html
<script type="module">
  import { define } from "https://unpkg.com/mosaic@1.0.4"
</script>
```

## Browser Support

(todo)

## Documentation

(todo)

## Example

### Step 1. Define your custom element

```html
<script type="module">
  import { define } from "https://unpkg.com/mosaic@1.0.4"

  define("hello-world", () => ({ name }), "<p>Hello {{ name }}!</p>")
</script>
```

### Step 2. Use the Custom Element

```html
<hello-world name="kimberley"></hello-world>
```

This example will render "Hello Kimberley!" into a container
on the page.

You'll notice that everything here is valid HTML and JS, and
you can copy and paste this example and run it directly in
the browser with no need to compile or install anything
special to make it work.

### License

Mosaic is [MIT licensed](./LICENSE).
