# @defx/mosaic

Simple build and development server workflow for web components defined as self-contained HTML fragments.

## Workflow

1. define your web components as HTML files within your `/components` folder.
2. define your pages as HTML files within your `/pages` folder, adding a comment placeholder (`<!-- COMPONENTS -->`) wherever you would like the relevant component definitions to be included within each page.
3. run `mosaic build` and find the built files will be saved inside the `/public` folder.
4. run `mosaic dev` and get a development server running on `http://localhost:5000`. it will rebuild your files whenever you make any changes to your pages or components.

## Install

To install locally within your project...

```bash
$ npm install --save-dev @defx/mosaic
```

Now add some npm scripts to your package.json...

```json
{
  "scripts": {
    "build": "fragments build",
    "dev": "fragments dev"
  }
}
```
