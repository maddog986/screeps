"use strict";

import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import clear from 'rollup-plugin-clear';
import screeps from 'rollup-plugin-screeps';

let cfg;
const dest = process.env.DEST;
if (!dest) {
  console.log("No destination specified - code will be compiled but not uploaded");
} else if ((cfg = require("./screeps.json")[dest]) == null) {
  throw new Error("Invalid upload destination");
}

export default {
  input: "src/main.ts",
  output: {
    file: "dist/main.js",
    format: "cjs",
    sourcemap: true
  },

  plugins: [
    clear({ targets: ["dist"] }),
    resolve({ rootDir: "src" }),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.json"
    }),
    {
      transform(code, id) {
        return code.replace(/\/\*\* @class \*\//g, "\/*@__PURE__*\/");
      }
    },
    // terser({ module: true, output: { comments: 'some' } }),
    screeps({config: cfg, dryRun: cfg == null})
  ]
}
