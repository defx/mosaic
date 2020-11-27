import fs from 'fs';
import glob from 'glob-promise';
import path from 'path';

function loadFiles(globPath) {
  return glob(globPath).then((paths) =>
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
