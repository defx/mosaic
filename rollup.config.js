import { terser } from "rollup-plugin-terser"

export default [
  {
    input: "dist/modules/index.js",
    output: {
      file: "dist/mosaic.js",
      format: "es",
    },
  },
  {
    input: "dist/modules/index.js",
    plugins: [terser()],
    output: {
      file: "dist/mosaic.min.js",
      format: "es",
    },
  },
]
