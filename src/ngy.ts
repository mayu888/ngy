#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import yargs from 'yargs';
import packlist from 'npm-packlist';
import colors from 'colors/safe';

import { writeFile, getPackageData } from './utils';
import { exclude, workDir, getPackageStorePath, storeDir, getSrcPath, packageJsonName, publishConfigJsonName } from './path';

const log = console.log;

type Link = {
  repo: string;
  entry: string;
};

const getSrcFiles = async (workDir: string,entry: string = ''): Promise<string[]> => {
  return (await packlist({ path: path.join(workDir,entry)}))
  .filter(packagePath => !(exclude.find(ex => packagePath.includes(ex))))
};

const getLinkFiles = async (packageName: string): Promise<Link[]> => {
  const config = await fs.readJson(path.join(storeDir(),'config.json'));
  return config[packageName].links;
};

const getEntry = async (packageName: string): Promise<string[]> => {
  return (await fs.readJson(path.join(storeDir(),publishConfigJsonName)))[packageName].entry;
};

const getStorePath = async (srcPaths: string[]): Promise<string[]> => {
  const packagePath: string = await getPackageStorePath(workDir());
  return srcPaths.map(srcPath => path.join(packagePath,srcPath));
};

const getRepoPath = async (srcPaths: string[],packageName: string): Promise<string[]> => {
  const linkRis: Link[] = await getLinkFiles(packageName);
  return linkRis.map((linkRi) => srcPaths.map(srcPath => path.join(linkRi.repo,linkRi.entry,packageName,srcPath))).flat();
};

const publishSetConfig = async (packagePath: string,packageStorePath: string, entry: string[]) => {
  await fs.ensureDir(packageStorePath);
  const { name } = await getPackageData(workDir());
  if(!fs.existsSync(path.join(storeDir(),publishConfigJsonName))){
    await fs.outputJson(path.join(storeDir(),publishConfigJsonName),{ [name]: { path: packagePath ,entry, links: [] } },{ spaces: 2 });
  }else{
    const config = await fs.readJson(path.join(storeDir(),publishConfigJsonName));
    config[name] = { path: packagePath, entry, links: [] };
    await fs.writeJson(path.join(storeDir(),publishConfigJsonName),config,{ spaces: 2 });
  }
}

const publishCallback = async (packagePath: string,packageStorePath: string, entry: string) => {
  const publishFiles: string[] = await getSrcFiles(packagePath,entry);
  await Promise.all(publishFiles.map(async (publishFile: string) =>  writeFile(path.join(packagePath,entry,publishFile),path.join(packageStorePath,entry,publishFile))));
  await Promise.all([
    fs.copy(path.join(packagePath,packageJsonName),path.join(packageStorePath,packageJsonName)),
  ]);
};

const linkCallback = async (packageName: string,packageStorePath: string, entry: string) => {
  const [ config, packageJson] = await Promise.all([
    fs.readJson(path.join(storeDir(), publishConfigJsonName)),
    fs.readJson(path.join(packageStorePath,packageJsonName)),
    fs.remove(path.join(workDir(),entry,packageName)),
  ]);
  if(!config[packageName]){
    return log(colors.yellow(`${packageName} is not publish!`));
  }
  const entryDirNames: string[] = config[packageName].entry;
  const entryDirs: string[] = entryDirNames.map((entryDirName: string) => path.join(packageStorePath,entryDirName));
  if(!(config[packageName].links.find((link: Link) => link.repo === workDir()))){
    config[packageName].links.push({ repo: workDir(), entry });
  }
  const waitingPromise: Promise<any>[] = [
    fs.outputJson(path.join(workDir(),entry,packageName,packageJsonName),packageJson),
    fs.writeJson(path.join(storeDir(), publishConfigJsonName),config,{ spaces: 2 }),
  ];
  await Promise.all(waitingPromise);
  const srcPromises = entryDirs.map(async (entryDir,index) => {
    return (await getSrcFiles(entryDir)).map(async (srcPath) => await writeFile(path.join(entryDir,srcPath),path.join(workDir(),entry,packageName,entryDirNames[index],srcPath)))
  });
  await Promise.all(srcPromises);
};

yargs(process.argv.slice(2))
.command({
  command: 'publish',
  describe: 'publish package to file store',
  handler: async (argv) => {
    log(colors.yellow('publishing...'));
    let entries = (argv.entry || 'src') as string | string[];
    if(typeof(entries) === 'string'){
      entries = [entries];
    }
    const folder: string = (argv._[1] || '') as string;
    const packageStorePath: string = await getPackageStorePath(path.join(workDir(),folder));
    await publishSetConfig(path.join(workDir(),folder),packageStorePath, entries);
    await Promise.all(entries.map(async(entry: string) => await publishCallback(path.join(workDir(),folder),packageStorePath, entry)));
    log(colors.green('publish success!'));
  },
})
.command({
  command: 'link',
  describe: 'link package in local repo',
  handler: async (argv) => {
    log(colors.yellow('linking...'));
    const entry: string = (argv.entry || 'src') as string;
    const packageName: string = argv._[1] as string;
    if(!packageName){
      return log(colors.red('must have packageName!'));
    };
    const packageStorePath = path.join(storeDir(),packageName);
    if(!fs.existsSync(packageStorePath)){
      return log(colors.red(`${packageStorePath} is not exist,are you sure it has been publish?`));
    }
    await linkCallback(packageName,packageStorePath,entry);
    log(colors.green('link success!'));
  },
})
.command({
  command: 'add',
  describe: 'add/change files in local repo',
  handler: async (argv) => {
    const { name } = await getPackageData(workDir());
    const entry = await getEntry(name);
    const files = argv._.slice(1) as string[];
    log(colors.yellow(`add paths:${files[0]}...`));
    const srcPaths: string[] = await getSrcPath(files, entry);
    const storePaths: string[] = await getStorePath(srcPaths);
    const repoPaths: string[] = await getRepoPath(srcPaths,name);
    if(storePaths.length !== files.length) return;
    const updateRepoPromise:Promise<void | Error>[] = [];
    files.forEach(async (file: string) =>  {
      repoPaths.forEach(repo => {
        updateRepoPromise.push(writeFile(file,repo));
      });
    });
    await Promise.all(files.map(async (file: string,index: number) =>  writeFile(file,storePaths[index])));
    await Promise.all(updateRepoPromise);
    await Promise.all(files.map(async (file: string,index: number) =>  {
      return repoPaths.map(repo => writeFile(file,repo));
    }));
    log(colors.green('success!'));
  }, 
})
.command({
  command: 'delete',
  describe: 'delete files in local repo',
  handler: async (argv) => {
    log(colors.yellow(`delete paths:${argv._.slice(1)[0]}...`));
    const { name } = await getPackageData(workDir());
    const entry = await getEntry(name);
    const srcPaths: string[] = await getSrcPath(argv._.slice(1) as string[],entry);
    const storePaths: string[] = await getStorePath(srcPaths);
    const repoPaths: string[] = await getRepoPath(srcPaths,name);
    await Promise.all(storePaths.map((storePath: string) => fs.remove(storePath)));
    await Promise.all(repoPaths.map((repoPath: string) => fs.remove(repoPath)));
    log(colors.green('success!'));
  }, 
})
.command({
  command: 'unlink',
  describe: 'unlink package in local repo',
  handler: async (argv) => {
    log(colors.green('unlinking...'));
    const packageName = argv._[1] as string;
    if(!packageName){
      return log(colors.red('must input packageName'));
    }
    const packageConfig = await fs.readJson(path.join(storeDir(),publishConfigJsonName));
    if(!packageConfig[packageName]){
      return log(colors.red(`${packageName} is not link!`))
    }
    const linkIndex = packageConfig[packageName].links.findIndex((link: Link) => link.repo === workDir());
    if(linkIndex < 0){
      return log(colors.red(`unlink ${packageName}`));
    }
    const linkInfo = (packageConfig[packageName].links)[linkIndex];
    await fs.remove(path.join(workDir(),linkInfo.entry,packageName));
    packageConfig[packageName].links = packageConfig[packageName].links.filter((_: Link, index: number) => index !== linkIndex);
    await fs.writeJson(path.join(path.join(storeDir(),publishConfigJsonName)),packageConfig,{ spaces: 2 });
    log(colors.green(`unlink ${packageName} success!`));
  }
})
.command({
  command: 'unpublish',
  describe: 'remove package in file store',
  handler: async (argv) => {
    log(colors.yellow('unpublishing...'));
    const folder: string = (argv._[1] || '') as string;
    const packageStorePath: string = await getPackageStorePath(path.join(workDir(),folder));
    const { name } = await getPackageData(workDir());
    const packageConfig = (await fs.readJson(path.join(storeDir(),publishConfigJsonName)))
    if(!packageConfig[name]){
      return log(colors.yellow('package is not published'));
    }
    delete packageConfig[name];
    await Promise.all([
      fs.writeJson(path.join(storeDir(),publishConfigJsonName),packageConfig),
      fs.remove(packageStorePath)
    ]);
  }
})
.argv;




