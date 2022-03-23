# ngy 
1. 全局安装 ngy（生成ngy 的命令行）
```
  npm install  -g ngy
```
### compoment目录下配置
2. component package.json dev下添加 ngy
3. component目录下，npm run ngy-publish-watch
```javascript
// package.json
"ngy-publish-watch": "ngy publish && npm run ngy-watch",
"ngy-watch": "node node_modules/ngy"
```


### client或desktop 端的配置
1. webpack.dev.config.js
```javascript
const setNgiqAlias = (aliasName,repo) => {
  if(!repo || !aliasName) return {};
  const ngPath = path.join(process.cwd(), 'src', repo);
  try {
    const isDirectory = fs.statSync(ngPath).isDirectory();
    if (!isDirectory) return {};
    return { [aliasName]: ngPath };
  } catch (err) {
    return {};
  }
}
// 在aliax中添加需要重命名的包, 包与依赖的包package.json上publish的包相同。
...setNgiqAlias('ngiq-point-component','ngiq-point-component'),
```
2. client或者desktop目录下，npm run ngy-link-component
``` 
// package.json
"ngy-link-component": "ngy link ngiq-point-component"
```  
3. client 目录下 npm start

3. desktop目录下，start-render-dev