import { terser } from "rollup-plugin-terser"

export default [
  {
    input: "src/define.js",
    output: {
      file: "dist/dynamo.js",
      format: "es",
    },
  },
  {
    input: "src/define.js",
    output: {
      file: "examples/mosaic.js",
      format: "es",
    },
  },
  {
    input: "src/define.js",
    plugins: [terser()],
    output: {
      file: "dist/dynamo.min.js",
      format: "es",
    },
  },
  {
    input: "src/define.js",
    output: {
      dir: "cjs",
      format: "cjs",
      preserveModules: true,
    },
  },
]
