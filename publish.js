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
// pathReplace 是本地HTML页面上静态资源的替换规则，其中：
//             example是示意，build是线上地址，public是本地检测类名压缩是否正常的地址
// share       表示微信分享，如果img_url缺省，则不使用微信分享；
// domain      表示活动页使用的域名，会使用对应的ta统计代码，如果缺省，就不使用ta统计；
// pingjs      表示是否使用基础统计（PV、UV）等
/*
config.json: {
	"server":  {
		"port": "2017"
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
	"pathReplace": {
		// example是build使用的示意，起注释作用
		"example": ["./", "//qidian.gtimg.com/acts/2017/tapdid/"],

		"build": ["./", "http://localhost:2017/svn/"],
		"public": ["./", "../../src/"],
	},
	"share": {
		"img_url": "",
	    "desc": "描述",
	    "title": "标题"
	},
	"ta": {
		"acts.book.qq.com": "500148454",
		"acts.qidian.com": "500148453"
	},
	"domain": "acts.qidian.com",
	"pingjs": true
}

config_svn.json: {
	"svn": {
		"html": "./svn/html/",
		"css": "./svn/css/",
		"js": "./svn/js/",
		"images": "./svn/images/"
	}
}
*/

// 首先，加载配置数据
var config = require('./config.json');
var configSVN = require('./config_svn.json');

// 首先，当前任务
console.log('\n开始任务');

var task = config;
var taskSVN = configSVN;

// svn目录
var svn = configSVN.svn;

// 自动末尾加斜杠
['theme', 'build', 'svn'].forEach(function(key) {
	var data = task[key];
	if (key == 'svn') {
		data = taskSVN[key];
	}

	for (var keyPath in data) {
		if (data[keyPath] && typeof data[keyPath] == 'string' && data[keyPath].slice(-1) !== '/') {
			console.log(key + '.' + keyPath + '路径应以/结尾，已补全');
			data[keyPath] = data[keyPath] + '/';
		}
	}
});

// 类名压缩递增方法
var seedClassName = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];
var indexClassName = 0;
var getClassName = function() {
	var length = seedClassName.length;

	var left = indexClassName % length, loop = Math.floor(indexClassName / length), repeat = loop % length;

	var className = '';

	var char1 = seedClassName[repeat], char2 = seedClassName[left];

	if (loop >= length) {
		char1 = char1.toUpperCase();

	} 
	if (loop >= length * 2) {
		char2 = char1.toUpperCase();
	}
	if (loop >= length * 3) {
		console.log('超出2027数目限制，增加数字支持');
		char2 = char2 + (indexClassName - 2027);
	}

	indexClassName++;

	return char1 + char2;
};

// 类名压缩名称映射对象
var hashClassName = {};

// 类名替换方法
// 
var arrClassNameIgnore = config.compress.classIgnore || [];
var fnCSSclassNameReplace = function(data) {
	if (config.compress.className == true) {
		console.log('CSS中压缩类名缓存中...');
		return data.replace(/\.[a-z][a-z0-9]*(?:\-\w+)*/gi, function(matchs) {
			matchs = matchs.replace('.', '');

			//console.log(matchs);

			if (hashClassName[matchs]) {
				return '.' + hashClassName[matchs];
			} else if (arrClassNameIgnore.indexOf(matchs) === -1) {
				var shortName = getClassName();
				hashClassName[matchs] = shortName;
				return '.' + shortName;
			}
			return '.' + matchs;
		});
	} else {
		return data;
	}
};


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

			if (fnCSSclassNameReplace(fs.readFileSync(pathOrigin, {
		    	encoding: 'utf8'
		    })) != fs.readFileSync(pathVersion, {
		    	encoding: 'utf8'
		    })) {
		    	obj.isModify = true;
		    	obj.version = +obj.version + 1;
		    }
		} else if (/js$/.test(obj.filename)) {
			pathOrigin = task.theme.pathJS + obj.filename;
			pathVersion = task.theme.pathJS + obj.filename.replace('.js', '.' + obj.version + '.js');

			if (fs.readFileSync(pathOrigin, {
		    	encoding: 'utf8'
		    }) != fs.readFileSync(pathVersion, {
		    	encoding: 'utf8'
		    })) {
		    	obj.isModify = true;
		    	obj.version = +obj.version + 1;
		    }
		}	
	});

	funCreateNewfile();
}, funCreateNewfile = function() {
	var createIndex = 0, createLength = storeStatic.length;

	var step = function() {
		var obj = storeStatic[createIndex];

		// 不使用循环是为了保证顺序
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
				svnOrigin = taskSVN.svn.css + obj.filename;
				svnVersion = svnOrigin.replace('.css', '.' + obj.version + '.css');
			} else if (/js$/.test(obj.filename)) {
				pathOrigin = task.theme.pathJS + obj.filename;
				pathVersion = pathOrigin.replace('.js', '.' + obj.version + '.js');
				// svn地址
				svnOrigin = taskSVN.svn.js + obj.filename;
				svnVersion = svnOrigin.replace('.js', '.' + obj.version + '.js');
			}

			// 如果文件有修改
			// 在同目录下创建，同时SVN复制一份
			fs.readFile(pathOrigin, 'utf8', function(err, data) {
				// 类名压缩CSS处理
				if (/css$/.test(obj.filename)) {
					data = fnCSSclassNameReplace(data);
				}

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

				    if (storeStatic.length) {
				    	console.log(filename + ': css/js文件名替换中...');

					    storeStatic.forEach(function(obj) {
				    		var replacedFilename = obj.filename.replace(/\.(js|css)$/, function(matchs, $1) {
					    		return '.' + obj.version + '.' + $1;
					    	});
					    	data = data.replace('/' + obj.filename, '/' + replacedFilename);
					    	console.log(obj.filename + '替换成了' + replacedFilename);
					    });
				    }

				    // 类名压缩
					if (config.compress.className == true) {
						console.log(filename + ': 类名替换中...');
						data = data.replace(/class="(.*?)"/g, function(matchs, $1) {
							//console.log($1);
							return 'class="' + $1.split(' ').map(function(className) {
								if (hashClassName[className]) {
									return hashClassName[className];
								}
								return className;
							}).join(' ') + '"';
						})
					}

				    // 这里build/public和build下HTML并联进行，之前是串联
				    var pathReplace = task.pathReplace;
				    // 先是public替换
				    var pathReplacePublic = pathReplace.public;
				    // build下index.html替换
				    var pathReplaceBuild = pathReplace.build;

				    // 数据也分开
				    var dataPublic = data;

				    // public下的HTML页面非压缩版本
				    var dirPublic = task.build.pathHTML + 'public';
				    if(!fs.existsSync(dirPublic)) {
				    	console.log('public文件夹不存在，新建之');
						fs.mkdirSync(dirPublic);
					}

				    // public/index.html相对地址替换
				    console.log(dirPublic + '/' + filename + ': 相对地址更换中');
				    var regPublic = new RegExp(pathReplacePublic[0].replace(/\./g, '\\.').replace(/\//g, '\\/'), 'g');
				    dataPublic = dataPublic.replace(regPublic, pathReplacePublic[1]);

				    // 写入public页面
				    fs.writeFile(dirPublic + '/' + filename, dataPublic, function() {
				        console.log(filename + ': 生成成功，文件存放于：' + dirPublic + '/' + filename);
				    });
				    

				    // 下面是两位的分支，使用线上地址，写入统计，并压缩HTML
				    var reg = new RegExp(pathReplaceBuild[0].replace(/\./g, '\\.').replace(/\//g, '\\/'), 'g');
				    data = data.replace(reg, pathReplaceBuild[1]);

				    var insertHTML = '';

				    if (task.share.img_url) {
				    	console.log(filename + ': 正在写入微信分享...');
				    	// 微信分享
				    	insertHTML = insertHTML + 
				    	'<script src="'+ task.protocol +'//qidian.gtimg.com/lbf/2.0.0/LBF.js"></script><script>' +
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
				    	console.log(filename + ': 正在写入ta统计...');
				    	insertHTML = insertHTML + '<script>var _mtac = {};(function() {var mta = document.createElement("script");mta.src = "'+ task.protocol +'//pingjs.qq.com/h5/stats.js?v2.0.4";mta.setAttribute("name", "MTAH5");mta.setAttribute("sid", "'+ task.ta[task.domain] +'");var s = document.getElementsByTagName("script")[0];s.parentNode.insertBefore(mta, s);})();</script>';
				    }

				    // pingjs
				    if (task.pingjs) {
				    	console.log(filename + ': 正在写入pingjs统计...');
				    	insertHTML = insertHTML + '<script src="'+ task.protocol +'//pingjs.qq.com/ping.js"></script><script>if(typeof(pgvMain) == "function"){  pgvMain(); }</script>';
				    }

				    // 插入在页面底部
				    data = data.replace('</body>', insertHTML + '</body>');

				    // 开始压缩
				    if (config.compress.html) {
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
					        if (taskSVN.svn.html) {
					        	fs.writeFile(taskSVN.svn.html + filename, minidata, function() {
					        		console.log('成功到SVN目录：' + taskSVN.svn.html + filename);
					        		
					        		console.log('任务完成！\n\n');
					        	});
					        } else {
					        	console.log('任务完成！\n\n');
					        }				        
					    });
			        }
				});
	    	}
	    });
	});
};

// 创建路径（如果不存在）
var createPath = function(path) {
	// 路径有下面这几种
	// 1. /User/...      OS X
	// 2. E:/mydir/...   window
	// 3. a/b/...        下面3个相对地址，与系统无关
	// 4. ./a/b/...
	// 5. ../../a/b/...  

	var pathHTML = '.';
	if (path.slice(0,1) == '/') {
		pathHTML = '/';
	} else if (/:/.test(path)) {
		pathHTML = '';
	}

	path.split('/').forEach(function(filename) {
		if (filename) {
			// 如果是数据盘地址，忽略
			if (/:/.test(filename) == false) {
				pathHTML = pathHTML + '/' + filename;
				// 如果文件不存在
				if(!fs.existsSync(pathHTML)) {
					console.log('路径' + pathHTML + '不存在，新建之');
					fs.mkdirSync(pathHTML);
				}
			} else {
				pathHTML = filename;
			}
		}
	});
};

/*
 * 复制目录中的所有文件包括子目录
 * @param{ String } 需要复制的目录
 * @param{ String } 复制到指定的目录
 */
var copy = function (src, dst) {
	if (!fs.existsSync(src)) {
		return;
	}
    // 读取目录中的所有文件/目录
    fs.readdir(src, function (err, paths) {
        if (err) {
            throw err;
        }

        paths.forEach(function (path) {
            var _src = src + path,
                _dst = dst + path,
                readable, writable;        

            stat(_src, function (err, st) {
                if (err){
                    throw err;
                }

                // 判断是否为文件
                if (st.isFile()) {
                    // 创建读取流
                    readable = fs.createReadStream(_src);
                    // 创建写入流
                    writable = fs.createWriteStream(_dst);   
                    // 通过管道来传输流
                    readable.pipe(writable);
                } else {
                	// 作为文件夹处理
                	createPath(_dst);
                	copy(_src + '/', _dst + '/');
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
if (storeStatic.length) {
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
} else {
	// 如果没有外联的js, css
	funHTMLbuild();
}