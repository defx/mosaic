#!/usr/bin/env node
import path from 'path';

import mosaic from './index.js';

const CWD = process.env.INIT_CWD || process.env.PWD;

const [key] = process.argv.slice(2);

const configure = (key) =>
  import(path.join(CWD, './mosaic.config.js'))
    .then((v) => (key ? v.default[key] : v.default))
    .then(mosaic);

configure(key);
