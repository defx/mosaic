import fs from 'fs';
import glob from 'glob-promise';
import path from 'path';

function loadFiles(
  globPath,
  basePath = process.env.INIT_CWD || process.env.PWD
) {
  return glob(path.join(basePath, globPath)).then((paths) =>
    Promise.all(
      paths.map((filepath) =>
        fs.promises
          .readFile(filepath, 'utf8')
          .then((v) => [path.basename(filepath, path.extname(filepath)), v])
      )
    )
  );
}

export default loadFiles;
