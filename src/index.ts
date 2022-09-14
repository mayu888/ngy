import fs from 'fs-extra';
import yargs from 'yargs';
import { watch } from './watch';

type Option = {
  dir: string[] | string;
  file?: string[] | string;
};

let { dir, file } = yargs
.default('dir','src')
.argv as Option;
if(typeof(dir) === 'string'){
  dir = [dir];
}
if(typeof(file) === 'string'){
  file = [file];
}
dir = dir.filter(dirPath => fs.pathExistsSync(dirPath));
if(file){
  file = file.filter(filePath => fs.pathExistsSync(filePath))
}
const watchFiles = dir.concat(file || []);
watch(watchFiles);