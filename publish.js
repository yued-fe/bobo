var fs = require('fs');
stat = fs.stat;

/* 
* 模板页发布
* 实现功能：
* 1. CSS，JS静态资源版本递增；
* 2. HTML页面静态资源相对地址变为绝对地址
* 3. 资源直接到SVN目录
* 4. 自动插入微信分享和数据统计代码

*如何运行？
 1. 安装node和npm;
 2. 安装HTML压缩的工具；
*/
 // https://github.com/kangax/html-minifier
 // 使用：
 // cd 到trunk目录，
 // 先安装html-minifier
 // npm install html-minifier
 // 然后 node htmlmin
var minify = require('html-minifier').minify;
/*
* 3. 运行publish.js   --本JS目录下，node publish即可！
*
* 有疑问了联系zhangxinxu
*/

// 下面是某活动配置示意：
// 其中
// pathReplace 是本地HTML页面上静态资源的替换规则，
// share       表示微信分享，如果img_url缺省，则不使用微信分享；
// domain      表示活动页使用的域名，会使用对应的ta统计代码，如果缺省，就不使用ta统计；
// pingjs      表示是否使用基础统计（PV、UV）等
/*
{
	"server":  {
		"port": "2016"
	},
	"theme": {
		"pathHTML": "./",
		"pathJS": "./js/",
		"pathCSS": "./css/",
		"pathImages": "./images/",
		"arrFile": ["style.css", "common.js"]
	},
	"build": {
		"pathHTML": "build/"
	},
	"svn": {
		"html": "./svn/html/",
		"css": "./svn/css/",
		"js": "./svn/js/",
		"images": "./svn/images/"
	},
	"pathReplace": ["./", "https://qidian.gtimg.com/acts/2016/5660165/"],
	"share": {
		"img_url": "",
	    "desc": "描述",
	    "title": "标题"
	},
	"ta": {
		"activity.book.qq.com": "57186307",
		"activity.qidian.com": "57186280",
		"acts.book.qq.com": "57186204",
		"acts.qidian.com": "57186166"
	},
	"domain": "acts.qidian.com",
	"pingjs": true
}
*/

// 首先，加载配置数据
var config = require('./config.json');


// 首先，当前任务
console.log('\n开始任务');

var task = config;

// svn目录
var svn = task.svn;

// 自动末尾加斜杠
['theme', 'build', 'svn'].forEach(function(key) {
	var data = task[key];
	for (var keyPath in data) {
		if (data[keyPath] && typeof data[keyPath] == 'string' && data[keyPath].slice(-1) !== '/') {
			console.log(key + '.' + keyPath + '路径应以/结尾，已补全');
			data[keyPath] = data[keyPath] + '/';
		}
	}
});


// 静态资源版本递增的逻辑实现
// 首先，所有JS和CSS进入storeStatic进行统一的管理
// 默认都认为是没有修改的
var storeStatic = task.theme.arrFile.map(function(filename) {
	return {
		isModify: false,
		filename: filename
	};
});

// 检测文件是否有变更
var funFileIsChanged = function() {
	storeStatic.forEach(function(obj) {
		var pathOrigin = '', pathVersion = '';

		if (!obj.version) {
			obj.isModify = true;
			obj.version = 1;
			return;
		}

		// 两个文件的文件路径
		if (/css$/.test(obj.filename)) {
			pathOrigin = task.theme.pathCSS + obj.filename;
			pathVersion = task.theme.pathCSS + obj.filename.replace('.css', '.' + obj.version + '.css');
		} else if (/js$/.test(obj.filename)) {
			pathOrigin = task.theme.pathJS + obj.filename;
			pathVersion = task.theme.pathJS + obj.filename.replace('.js', '.' + obj.version + '.js');
		}

		if (fs.readFileSync(pathOrigin, {
	    	encoding: 'utf8'
	    }) != fs.readFileSync(pathVersion, {
	    	encoding: 'utf8'
	    })) {
	    	obj.isModify = true;
	    	obj.version = +obj.version + 1;
	    }
	});

	funCreateNewfile();
}, funCreateNewfile = function() {
	var createIndex = 0, createLength = storeStatic.length;

	var step = function() {
		var obj = storeStatic[createIndex];

		var next = function() {
			createIndex++;
			if (createIndex >= createLength) {
				// 全部遍历结束，数据存储，以及开始HTML的替换
				funFileDataSql();
				funHTMLbuild();
			} else {
				step();
			}
		};

		if (obj.isModify == true) {
			// 当前CSS文件地址
			var pathOrigin = '', pathVersion = '';
			// svn地址
			var svnOrigin = '', svnVersion = '';

			if (/css$/.test(obj.filename)) {
				pathOrigin = task.theme.pathCSS + obj.filename;
				pathVersion = pathOrigin.replace('.css', '.' + obj.version + '.css');

				// svn地址
				svnOrigin = task.svn.css + obj.filename;
				svnVersion = svnOrigin.replace('.css', '.' + obj.version + '.css');
			} else if (/js$/.test(obj.filename)) {
				pathOrigin = task.theme.pathJS + obj.filename;
				pathVersion = pathOrigin.replace('.js', '.' + obj.version + '.js');
				// svn地址
				svnOrigin = task.svn.js + obj.filename;
				svnVersion = svnOrigin.replace('.js', '.' + obj.version + '.js');
			}

			// 如果文件有修改
			// 在同目录下创建，同时SVN复制一份
			fs.readFile(pathOrigin, function(err, data) {
				// 以新名称重写CSS文件
				fs.writeFile(pathVersion, data, function() {
					console.log(pathVersion.split('/').slice(-1).join('') + '创建成功！');

					next();
				});

				// CSS和JS SVN存储
				// fs.writeFile(svnOrigin, data, function() {
				// 	console.log('成功到SVN目录：' + svnOrigin);
				// });
				// 新生产静态资源也到SVN目录
				fs.writeFile(svnVersion, data, function() {
					console.log('成功到SVN目录：' + svnVersion);
				});
			});
		} else {
			console.log(obj.filename + '没有修改');
			next();
		}
	};

	step();
}, funFileDataSql = function(callback) {
	var sql = storeStatic.map(function(obj) {
		return obj.filename + ':' + obj.version;
	}).join('|');
	// sql数据重写
	fs.writeFile(task.build.pathHTML + 'sql.txt', sql, function() {
		console.log('sql.txt: 新的版本数据存储成功！文件存放于：' + task.build.pathHTML + 'sql.txt');
		if (typeof callback == 'function') {
			callback();
		}
	});
}, funHTMLbuild = function() {
	// 1. 静态资源地址替换
	// 2. url路径替换
	// 3. html压缩
	var dirHTML = task.theme.pathHTML.replace(/\/$/, '');
	fs.readdir(dirHTML, function (err, files) {
	    if (err) {
	        throw err;
	    }
	    // files 是一个存储目录中所包含的文件名称的数组，数组中不包括 '.' 和 '..'
	    files.forEach(function(filename) {
	    	if (/\.html$/.test(filename)) {
	    		fs.readFile(dirHTML + '/' + filename, 'utf8', function (err, data) {
				    if (err) {
				        throw err;
				    }

				    console.log(filename + ': css/js文件名替换中...');

				    storeStatic.forEach(function(obj) {
			    		var replacedFilename = obj.filename.replace(/\.(js|css)$/, function(matchs, $1) {
				    		return '.' + obj.version + '.' + $1;
				    	});
				    	data = data.replace('/' + obj.filename, '/' + replacedFilename);
				    	console.log(obj.filename + '替换成了' + replacedFilename);
				    });

				    console.log(filename + ': 相对地址替换中...');

				    var pathReplace = task.pathReplace;
				    var reg = new RegExp(pathReplace[0].replace(/\./g, '\\.').replace(/\//g, '\\/'), 'g');

				    data = data.replace(reg, pathReplace[1]);

				    console.log(filename + ': 正在写入微信分享和统计脚本...');

				    var insertHTML = '';

				    if (task.share.img_url) {
				    	// 微信分享
				    	insertHTML = insertHTML + 
				    	'<script src="http://qidian.gtimg.com/lbf/2.0.0/LBF.js"></script><script>' +
				    	'var config_share = {\
    img_url: "'+ task.share.img_url +'",\
    link: location.href,\
    desc: "'+ task.share.desc +'",\
    title: "'+ task.share.title +'"\
};' +	
						'LBF.use(["qidian.wxShare"],function(weixin){weixin.setWeiXinShareConfig("qidianzhongwenwang", config_share.title, location.href,config_share.img_url,config_share.desc);});' +
						'</script>';
				    }

				    // ta统计
				    if (task.domain && task.ta[task.domain]) {
				    	insertHTML = insertHTML + '<script type="text/javascript" src="http://tajs.qq.com/stats?sId='+ task.ta[task.domain] +'" charset="UTF-8"></script>';
				    }

				    // pingjs
				    if (task.pingjs) {
				    	insertHTML = insertHTML + '<script src="http://pingjs.qq.com/ping.js"></script><script>if(typeof(pgvMain) == "function"){  pgvMain(); }</script>'
				    }

				    // 插入在页面底部
				    data = data.replace('</body>', insertHTML + '</body>');

				    // public下的HTML页面非压缩版本
				    var dirPublic = task.build.pathHTML + 'public';
				    if(!fs.existsSync(dirPublic)) {
				    	console.log('public文件夹不存在，新建之');
						fs.mkdirSync(dirPublic);
					}

				    fs.writeFile(dirPublic + '/' + filename, data, function() {
				        console.log(filename + ': 生成成功，文件存放于：' + dirPublic + '/' + filename);

				        console.log(filename + ': 开始创建压缩版本');

				        var minidata = minify(data, {
					    	removeComments: true,
					    	collapseWhitespace: true,
					    	minifyJS:true, 
					    	minifyCSS:true
					    });

				        // 根目录最终发布HTML生成
					    fs.writeFile(task.build.pathHTML + filename, minidata, function() {
					        console.log(filename + ': 压缩成功，文件存放于：' + task.build.pathHTML + filename);
					        // svn目录转移
					        if (task.svn.html) {
					        	fs.writeFile(task.svn.html + filename, minidata, function() {
					        		console.log('成功到SVN目录：' + task.svn.html + filename);
					        		
					        		console.log('任务完成！\n\n');
					        	});
					        } else {
					        	console.log('任务完成！\n\n');
					        }				        
					    });
				    });
				});
	    	}
	    });
	});
};


var createPath = function(path) {
	var pathHTML = '.';
	if (path.slice(0,1) == '/') {
		pathHTML = '/';
	}
	
	path.split('/').forEach(function(filename) {
		if (filename) {
			pathHTML = pathHTML + '/' + filename;
			if(!fs.existsSync(pathHTML)) {
				console.log('路径' + pathHTML + '不存在，新建之');
				fs.mkdirSync(pathHTML);
			}
		}
	});
};

/*
 * 复制目录中的所有文件包括子目录
 * @param{ String } 需要复制的目录
 * @param{ String } 复制到指定的目录
 */
var copy = function( src, dst ){
    // 读取目录中的所有文件/目录
    fs.readdir( src, function( err, paths ){
        if( err ){
            throw err;
        }

        paths.forEach(function( path ){
            var _src = src +path,
                _dst = dst + path,
                readable, writable;        

            stat( _src, function( err, st ){
                if( err ){
                    throw err;
                }

                // 判断是否为文件
                if( st.isFile() ){
                    // 创建读取流
                    readable = fs.createReadStream( _src );
                    // 创建写入流
                    writable = fs.createWriteStream( _dst );   
                    // 通过管道来传输流
                    readable.pipe( writable );
                }
            });
        });
    });
};



// 根据pathHTML新建文件目录（如果没有）
createPath(task.build.pathHTML);
// svn目录创建
for (type in svn) {
	createPath(svn[type]);
}

// 静态资源SVN转移
var arrPath = ['pathJS', 'pathCSS', 'pathImages'];
['js', 'css', 'images'].forEach(function(type, index) {
	var dirSVN = svn[type], dirTheme = task.theme[arrPath[index]];
	if (dirSVN && dirTheme) {
		console.log(type + '资源copy到SVN');
		copy(dirTheme, dirSVN);
	}
});

// get 存储的最新的递增的文件版本
var pathSql = task.build.pathHTML + 'sql.txt';
if (fs.existsSync(pathSql)) {
	// sql文件数据的存储格式是：文件名:最新版本号，使用管道符进行分隔
	// a.js:1|b.css:2
	fs.readFile(pathSql, 'utf8', function(err, data) {
		var arrData = data.split('|');
		arrData.forEach(function(filename_version) {
			var arrFn_vs = filename_version.split(':');
			if (arrFn_vs.length == 2) {
				// 补充静态资源的版本数据
				storeStatic.forEach(function(obj) {
					if (obj.filename == arrFn_vs[0]) {
						obj.version = arrFn_vs[1];
					}
				});
			}
		});

		// 检测文件是否有变更
		funFileIsChanged();
	});
} else {
	console.log('没有找到sql.txt，首次编译，JS/CSS认为最新');

	funFileIsChanged();
}