#!/usr/bin/env node

const path = require('path');
const chokidar = require('chokidar');
const spawn = require('cross-spawn');
const debounce = require('debounce');
const clearConsole = require('react-dev-utils/clearConsole');

export const watch = (watchPath?: string, ignored?:string[]) => {
  clearConsole();
  console.log('start watch...');
  let init = true;
  let store: { path: string, event: string }[] = [];
  const shell = debounce(() => {
    if (init) {
      init = false;
      store.length = 0;
      return;
    }
    const changes_add = store.filter(file => ['change', 'add'].includes(file.event)).map(file => file.path);
    let unlink = store.filter(file => ['unlink', 'unlinkDir'].includes(file.event)).map(file => file.path);
    if (changes_add.length) {
      const child = spawn('ngy', ['add', ...changes_add], { stdio: 'inherit' });
      child.on('close', (code: number) => {
        if (code !== 0) {
          throw Error('error')
        }
      })
    }
    if (unlink.length) {
      const unlinkDir = unlink.filter(unlinkPath => !(path.parse(unlinkPath).ext)).sort();
      unlink = unlink.filter(file => !(unlinkDir.find(dir => file.includes(dir))));
      const allPath = unlinkDir.concat(unlink);
      const child = spawn('ngy', ['delete', ...allPath], { stdio: 'inherit' });
      child.on('close', (code: number) => {
        if (code !== 0) {
          throw Error('error')
        }
      })
    }
    store.length = 0;
  }, 500);

  chokidar
    .watch(watchPath || path.join(process.cwd(),'src'),
      {
        ignored: ignored || [],
      })
    .unwatch()
    .on('all', (event: string, path: string) => {
      store.push({ event, path });
      shell();
    });
};