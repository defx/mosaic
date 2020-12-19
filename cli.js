#!/usr/bin/env node
import path from 'path';

import mosaic from './index.js';

const CWD = process.env.INIT_CWD || process.env.PWD;

const [key] = process.argv.slice(2);

const configure = (key) =>
  import(path.join(CWD, './mosaic.config.js'))
    .then((v) => v.default)
    .then((v) => (typeof v === 'function' ? v() : v))
    .then((v) => (key ? v[key] : v))
    .then(mosaic);

configure(key);
