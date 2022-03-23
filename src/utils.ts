#!/usr/bin/env node

import fs, { ReadStream, WriteStream } from 'fs-extra';
import path from 'path';
import { packageJsonName } from './path';

export const isDir = (path: string): boolean => {
  try{
    return fs.statSync(path).isDirectory();
  }catch(err){
    return false;
  }
};

export const getPackageData = async (workDir: string): Promise<any> => {
  return await fs.readJson(path.join(workDir, packageJsonName));
};

export const writeFile = async (src: string,dest: string) :Promise<void | Error> => {
  await fs.ensureFile(dest);
  const reader: ReadStream = fs.createReadStream(src);
  const writer: WriteStream = fs.createWriteStream(dest);
  return new Promise((resolve,reject) => {
    reader.pipe(writer);
    reader.on('end',() => {
      resolve();
    })
    .on('error',(error) => {
      reject(error);
    });
  });
};

export const getSrcNextPath = (path: string,entry: string[]): string => {
  const srcIndex = path.split('/').findIndex((seg) => !!entry.find(en => en === seg));
  return path.split('/').slice(srcIndex).join('/');
};
