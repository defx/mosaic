import { terser } from "rollup-plugin-terser"

export default [
  {
    input: "src/define.js",
    output: {
      file: "dist/mosaic.js",
      format: "es",
    },
  },
  {
    input: "src/define.js",
    plugins: [terser()],
    output: {
      file: "dist/mosaic.min.js",
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
