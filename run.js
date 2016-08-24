// 一些设置
var config = require('./config.json');

// 需要先安装http-server
// npm install http-server
var server = require('http-server');


server.createServer().listen(config.server.port);

console.log('服务已启动，端口是：' + config.server.port);


