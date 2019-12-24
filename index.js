var fs = require('fs');
var Multiprogress = require('multi-progress');
var chalk = require('chalk')
const url = require('url')
var https = require('http');
const { exec } = require('child_process');

let input = JSON.parse(require('fs').readFileSync("input.json"))
let spawncount = input.spawncount

function length() {
	return new Promise(function(resolve){
		exec(`curl -I ${input.href} -s | grep content-length: -i`, (err, stdout, stderr) => {

		  	if (err) {
		    	console.log("node couldn't execute the command")
		    	return;
			  }
			  stdout.toLowerCase()
			resolve(stdout)
		});		
	})
}

function str(a) {
	a = a.replace("\r\n", "")
	let array = Array.from(a)
	var push = false
	var string = ""
	array.forEach(char => {
		if(push) string += char
		if(char == " ") push = true;
	})
	return Number(string)
}
var multi = new Multiprogress(process.stderr);

function request(name, range) {
	return new Promise(function(resolve) {
		 // let myurl = url.parse(fs.readFileSync("href").toString())
		let myurl = url.parse(input.href)

		var req = https.request({
			host: myurl.host,
			path: myurl.path,
			headers: {
				'Range': 'bytes=' + range
			}
		});
		var recieved = 0
		var bodyparts = []
		 
		req.on('response', function(res){
			var len = parseInt(res.headers['content-length'], 10);
			var bar = multi.newBar(chalk.hex("#00ff00")(name + ' [:bar] :recieved/:total :percent :etas'), {
				complete: '#',
				incomplete: '*',
				total: len
			});
			res.on('data', function (chunk) {
				recieved += chunk.length
				bar.tick(chunk.length, { 'recieved': recieved });
				bodyparts.push(chunk)
			});
			res.on('end', function () {
				var body = Buffer.alloc(recieved)
				var bodyPos=0;
				for (var i=0; i < bodyparts.length; i++) {
				  bodyparts[i].copy(body, bodyPos, 0, bodyparts[i].length);
				  bodyPos += bodyparts[i].length;
				}
				resolve(body);
			});
		});
		req.end();		
	})
	
};

(async function main() {

	let a = await length()
	let number = str(a)

	let prefix = number % spawncount
	let number2 = number - prefix
	let spawn = number2 / spawncount

	let current = 0
	let promises = []
	for(i=0; i<spawncount; i++){
		let local = current + spawn - 1
		if(i == spawncount - 1) local += prefix + 1

		let string = (i + 1)
		if(i + 1 > 9) string + " "
		promises.push(request("processing request" + string, current + "-" + local))
		current += spawn
	}

	Promise.all(promises).then((a) => {
		var newBuffer = Buffer.concat(a);
		fs.writeFileSync(input.outputName, newBuffer)
	})

})()
