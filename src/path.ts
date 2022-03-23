#!/usr/bin/env node

import path from 'path';
import os from 'os';
import { getPackageData, getSrcNextPath } from './utils';

export const exclude = ['__snapshots__','unit.test','__mocks__'];

export const packageJsonName = 'package.json';

export const publishConfigJsonName = 'config.json';

export const storeDir = () :string => path.join(os.homedir(),'.ngy');
 
export const workDir = (): string => process.cwd();

export const getPackageStorePath = async (workDir: string): Promise<string> => {
  const { name } = await getPackageData(workDir);
  return path.join(storeDir(),name);
};

export const getSrcPath = (files: string[],entry: string[]): string[] => {
  return files.map(filePath => getSrcNextPath(filePath,entry));
};