波波-静态页面发布辅助工具
======================

为什么叫波波？
------------------
感谢波波童鞋帮忙测试~

波波用来干嘛的？
--------------------
波波主要在静态页面完成之后的发布流程中使用。

功能包括：

* 自动静态资源版本号递增；
* 自动SVN或Git目录文件同步；
* 自动添加统计代码和微信分享；
* 自动压缩HTML和className；

以及支持静态页面在上线之前就可以被其他同事访问。

波波该如何使用？
-----------------
1. 首先安装：
   <pre>node install</pre>
2. （可选）如果希望页面上线之前就可以在内网被其他人访问，则需要走http协议，执行：
	<pre>node run</pre>
3. 开发完了之后准备上线的时候，先配置config.json文件，然后执行：
	<pre>node publish</pre>

config.json中的配置参数
--------------------
1. <code>server</code>中值为http协议访问的一些参数，目前仅提供了端口号配置，默认是2017，虽然今年是2016年；
2. <code>theme</code>为开发时候的静态资源目录路径，其中最重要的是<code>arrFile</code>，数组，值为需要递增和类名压缩的CSS或者JS的文件名，例如：
	<pre>"arrFile": ["style.css", "common.js"]</pre>
3. <code>build</code>为发布时候编译出来新的HTML页面和静态资源目录，一般情况下无需重新设置；
4. <del><code>svn</code>为需要上线或者同步的SVN或者Git文件夹地址，如果文件夹不存在，波波会自动创建之~，支持相对地址和绝对地址，兼容windows和OS X系统。</del><strong>注意：现在开始SVN参数独立在config_svn.</strong>json文件中配置，因为不同开发人员的SVN目录地址是不一样的；
5. <code>pathReplace</code>为替换规则，最终的HTML页面中的相对地址会被替换成线上的绝对地址，默认的绝对地址是localhost，主要是为了本地演示方便。目前分'build', 'public'两个选项，原来/build/public/目录下的index.html也是使用线上地址，发现意义不大，先改为使用本地相对路径地址，可以用来方便测试类名压缩功能是否正常；
6. <code>share</code>为微信分享的一些参数，<code>img_url</code>为线上绝对地址图片，如果<code>img_url</code>缺省，则不使用微信分享；
7. <code>ta</code>为统计代码，根据不同的域名会放置不同的统计<code>id</code>；
8. <code>domain</code>当前活动使用的域名，如果使用的域名不在默认数据之列，请自己添加（含对应id），例如yuewen.com；
9. <code>pingjs</code>表示是否使用基础统计（PV、UV）等"，默认<code>true</code>，表示开启统计；
10. <code>compress</code>为压缩需要的一些配置参数。其中<code>html</code>表示是否开启HTML压缩，默认开启；<code>className</code>表示是否开启类名压缩，默认开启；<code>classIgnore</code>表示不参与压缩的类名们，格式为数组。


config_svn.json中的配置参数
--------------------
原来config.json中的<code>svn</code>参数，独立出来是因为，多人协作开发的时候，大家的SVN的目录是不一样的，为了避免混乱，独立出来，开始的时候不提交。


其他一些说明
------------------
1. 发布后，若要有样式要修改，直接在你原来编辑的css上面修改，然后再node pulish一次，波波会自动生成新的版本号，并将html里面引用的css改成bobo最新生成的css的地址，js同样。（注：图片没有自动生成版本号，毕竟一般图片改动的可能性很小）；
2. bobo是将./的路径替换成你线上的地址，所以你的html里面引入图片，css和js路径前别忘了加./；
3. bobo可以运用在多个不同的项目上，本地想同时运行多个项目并且查看时，别忘了在config.json里面改一下端口号，一个端口号对应一个项目；
4. 波波目前只适用于静态页面，理论上dev环境和显示环境的代码完全是一样的，区别在于一个外网可以访问，一个不可以；
5. 有任何使用疑问或者需求建议可RTX联系zhangxinxu。
