var Proxy = require('browsermob-proxy').Proxy;

function run(url, browserWidth, browserHeight, display, cb) {
    var proxy = new Proxy({port: 8080});
    var generate_traffic = function (proxyAddr, done) {
        startBrowser(url, browserWidth, browserHeight, display, cb, proxyAddr, done);
    };

    proxy.cbHAR({name: url, captureHeaders: true}, generate_traffic, function (err, har) {
        if (err) {
            console.log(err);
        } else {
            try {
                var data = JSON.parse(har);
            } catch (e) {
                console.log(err);
            }
            cb('har', data);
        }
        cb('close');
    });
};

function startBrowser(url, browserWidth, browserHeight, display, cb, proxyAddr, done) {

//Dependencies
var webdriver = require('selenium-webdriver')
,	fs = require('fs')
,	metaparser = require('./metaviewport-parser')
,       chromedriver = require('chromedriver');
;

function setViewPort (driver) {
	var metaTags = new Array();
	var metaNames = new Array();
	var viewports = new Array();
	var contentAttr;
	var renderingData;
	driver.findElements(webdriver.By.css('meta[name="viewport"]')).then(function(viewportDecls){
                // return all the metaviewports found
                webdriver.promise.map(
                    viewportDecls,
                    function (el) {  return el.getAttribute("content");}
                ).then(
                    function (contentAttrs) {
                        cb('metaviewports', contentAttrs);
                        contentAttr = contentAttrs[contentAttrs.length - 1];
                    }
                );
	}).then(function(){
		if(contentAttr) {
			var viewportProps = metaparser.parseMetaViewPortContent(contentAttr);

			renderingData = metaparser.getRenderingDataFromViewport(viewportProps.validProperties, browserWidth, browserHeight, 4, 0.25 );
			cb('viewport', renderingData);
		} else {
        	renderingData = { zoom: null, width: browserWidth*3, height: browserHeight*3 };
        	cb('viewport', renderingData);
    	        }
    	        driver.manage().window().setSize(renderingData.width, renderingData.height);
	});
}

var chrome = require("selenium-webdriver/chrome");
var proxy = require('selenium-webdriver/proxy');
var capabilities = webdriver.Capabilities.chrome();
var proxyPrefs = proxy.manual({http: proxyAddr, https: proxyAddr});
capabilities.set(webdriver.Capability.PROXY, proxyPrefs);

// enabling metaviewport
var options = new chrome.Options();
options.addArguments(["--enable-viewport-meta"]);
options.addArguments(['--user-agent=Mozilla/5.0 (Linux; Android 4.4.4; Galaxy Nexus Build/IMM76B) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/36.0.1025.133 Mobile Safari/535.19']);
capabilities.merge(options.toCapabilities());

// enabling metaviewport
var options = new chrome.Options();
options.addArguments(["--enable-viewport-meta"]);
options.addArguments(['--user-agent=Mozilla/5.0 (Linux; Android 4.4.4; Galaxy Nexus Build/IMM76B) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/36.0.1025.133 Mobile Safari/535.19']);
options.addArguments(['--disable-bundled-ppapi-flash']);
capabilities.merge(options.toCapabilities());
var chromeservicebuilder = new chrome.ServiceBuilder(chromedriver.path).withEnvironment({DISPLAY:':' + display}).build();
var driver = chrome.createDriver(capabilities, chromeservicebuilder);

var time = Date.now();
driver.get(url).then(function(){
	time = Date.now() - time;
	cb('pageSpeed', time);
}).then(setViewPort(driver));
driver.findElement(webdriver.By.tagName('head')).then(function(head){
	head.getInnerHtml().then(function(innerHtml){
		cb('head', innerHtml);
	});
});
driver.executeScript(function () {
	return document.documentElement.innerHTML; 
}).then(function(html){
	cb('html', html);
});
driver.executeScript(function () {
	return document.documentElement.clientWidth; //document.width not supported by chrome driver or selenium.
}).then(function(width){
	console.log(width);
	cb('documentWidth', width);
});
var tags = [
	"html"
,	"body"
,	"header"
,	"div"
,	"section"
,	"p"
,	"button"
,	"input"
,	"h1"
,	"h2"
,	"h3"
,	"h4" 
,	"h5"
,	"h6"	
];
var fontSizes = new Array();
var tagFontSize = {
	tagName : new Array ()
,	fontSize : new Array()
,	location : new Array()
};
//for index in tagList
//	get tagElements
//	then for each
//		get CSS font size -> object
//		get name -> object
//		get localisation -> object
//		then push object in array
//	then send to cb object array
for(var index in tags){
	driver.executeScript(function (tag) {
		return document.documentElement.getElementsByTagName(tag);
	}, tags[index]).then(function(tag, index){
		for (var index in tag){
			tag[index].getCssValue("font-size").then(function(ftSize){
				tagFontSize.fontSize.push(ftSize);
			});
			tag[index].getTagName().then(function(tagName){
				tagFontSize.tagName.push(tagName);
			});
			tag[index].getLocation().then(function(location){
				tagFontSize.location.push(location);
			});
		}
	}).then(function(){
		cb('tagFonts', tagFontSize);
	});
}
driver.takeScreenshot().then(function(data){
    var base64Data = data.replace(/^data:image\/png;base64,/,"")
    fs.writeFile("public/screenshot.png", base64Data, 'base64', function(err) {
        if(err) cb('error', err);
    });
}).then(function() {
    driver.quit();
    done();
});
}

exports.run = run;