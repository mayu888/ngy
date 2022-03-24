## 历史背景

在传统的前端开发中，web端可以非常便利的利用webpack等打包工具启动一个静态服务，并实现热更新。但是对于多端应用，如web端、桌面端（electron）所展现的业务全部一样的情况下，业务代码就不能单纯的放在web端repo或者桌面端repo下，需要单独提出来作为第三方组件使用，每次更新代码需要npm安装。

这种使用方式极大的降低了开发效率，若是应用中package.json使用“file:../../package.tgz”的方式本地链接，那么需要经历3个步骤：

1. 第三方包目录下 npm pack package（包名）
2. 应用目录下 npm install package（包名）
3. 应用重启

若是使用npm仓库的形式那么会更加繁琐，除以上三步外，还需要修改package.json中version的版本号，然后提交到repo仓库中，再npm publish发布。

长期以往，开发效率都会被这种流程降低大约50%。

## API

- ngy  add  path   增加/修改 某个文件
- ngy  delete  path   删除文件/文件夹
- ngy publish[--entry=*]   推送某个包名到文件集合中
- ngy unpublish  删除文件集合中的某个包
- ngy  link ${packageName}   应用链接某个包
- ngy  unlink  ${packageName}  应用取消链接某个包
- ngy -version  查看ngy的版本
- ngy -help  获取ngy的提示信息

## ngy的基本原理 

**不论是上边提到的npm pack方式还是npm仓库的方式，我们保持package.json中引用的方式不变**。

ngy将我们的第三方包publish到系统home目录下.ngy下，我们称之为文件集合，在web端或者桌面端使用时，使用ngy link的方式连接到本地应用中，同时修改webpack中dev下配置的alise，.gitignore中增加我们链接后的目录，启动后代码就可以使用link过来的包。而我们本地包修改后怎么做呢？可以使用ngy add path（修改文件的路径）这个脚本将我们的文件更新到文件集合中，ngy内部会根据link的应用路径同步修改应用下的文件，这样应用下监控到文件改变，会启动热更新。

ngy add path（修改文件的路径）这个脚本可以根据自己的代码结构书写一个监听的脚本，监听到文件变化自动add。ngy内部也集成了watch脚本，可以直接使用。

## 使用范例

如图，brainbrowser为我们要publish的包，我们使用`ngy publish`脚本将其推送到文件集合中

![image-20220323142332589](/README/image-20220323142332589.png)

查看brainbrowser包中package.json的name 为 *@ngiq/brainbrowser*

然后打开home目录，显示隐藏文件，点开.ngy

![image-20220323143423643](/README/image-20220323143423643.png)

已经有了这个包

同时，config.json文件是关于.ngy所有包的配置信息

![image-20220323143545015](/README/image-20220323143545015.png)

**entry**是包的入口，默认是src，**links**是link的应用路径

接下来我们在某个应用中link brainbrowser这个包

![image-20220323143250539](/README/image-20220323143250539.png)

此时config.json文件中对应的包配置已经更新

![image-20220323143649893](/README/image-20220323143649893.png)

**repo**为我们的应用路劲，**entry**为我们应用的入口。ngiq-research-client src目录下已经有了这个包

![image-20220323143945514](/README/image-20220323143945514.png)

同时，webpack dev的配置中增加alias

![image-20220323144224579](/README/image-20220323144224579.png)

这样我们就完成了最终配置，直接启动应用就ok了。

## 为什么不是npm link

尝试使用npm link所遇到的问题：

1. 第三方包和应用有自己的node_modules，如果双方使用了同一个包，它们会在自己的node_modules下寻找，如果这个依赖不支持多例，应用就会抛出异常。（例如reacthooks）
2. link之后由于package.json中包的名称存在，依旧会在应用node_modules下寻找第三方包，link失效。
3. 删除package.json中包名，项目lint抛异常（lint无法寻找软链的路径）。