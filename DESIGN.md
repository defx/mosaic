# Design

two types of components.

those without js factory will not be defined but styles still loaded in the same way.

this allows you to define components effectively as HTML/CSS partials whilst still using bindings from the root component, because you don't necessarily want everything to expose a public api down the tree, sometimes you just want to break things up a bit.

## component loading

each folder has - an index.js which return the factory as default export - an index.html which has the template - (optional) and index.css file that contains component-specific styles

we want...something like an entry module which will return { js, html, css } or { factory, template, styles } that we can then import mosaic once and define each component

we can easily serve an entry module over an api endpoint for dev, but these entry modules also need to be written to disk as part of the build.

possible approaches...

1. script that enumerates the components, loading the source code via the api endpoint, and then saves to disk. yea, why not.
