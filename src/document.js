import { html } from "./utils.js"

export const document = ({ title, head = "", main = "" }) => html`
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      ${title && `<title>${title}</title>`} ${head}
      <!--<link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.3.1/styles/base16/tomorrow.min.css"
        integrity="sha512-5D/fcZ3y3nuaeHSxDbFwWDEy1Fvj5qQKsU0tilD7bhWAA+IN/Jl9fzGdUotzvA7wgXtsnZmafcuunH+6nyuA0A=="
        crossorigin="anonymous"
        referrerpolicy="no-referrer"
      />-->
    </head>
    <body>
      <main>${main}</main>
    </body>
  </html>
`
