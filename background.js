var enabled = new Object();
var tabId = 0;

var toggleEnabled = function () {
	enabled[tabId] = !isEnabled();
	updateTabs();
};

var updateTabs = function () {
	var icon = "/logo19.png";

	if (!isEnabled()) {
		icon = "/bwlogo19.png";
	}	
	chrome.browserAction.setIcon({ path: icon })
}

var isEnabled = function () {
	if (enabled[tabId] === null || enabled[tabId] === undefined)
	{
		return true;
	}
	return enabled[tabId];
};

chrome.browserAction.onClicked.addListener(function () {
	toggleEnabled();
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
	tabId = activeInfo.tabId;
	updateTabs();	
});

chrome.webRequest.onBeforeRequest.addListener(
	function(info) {
		if (!isEnabled()) {
			return {};
		}

		var response = {redirectUrl: info.url};

		request(info.url, function(xhr) {
			try {
				var singleImageSrc = getSingleImage(xhr);

				return {redirectUrl: singleImageSrc};
			} catch(e) {
				console.log(e);
			}
		});
		return {};
	},
	// filters
	{
		urls: [
			"http://*/*.gif",
			"https://*/*.gif",
			"http://*/*.gif?*",
			"https://*/*.gif?*"
		],
		types: ["image"]
	},
	// extraInfoSpec
	["blocking"]);

function request(url, callback) {
	var xhr = new XMLHttpRequest;
	xhr.open('GET', url, false);
	
	//XHR binary charset opt by Marcus Granado 2006 [http://mgran.blogspot.com]
	xhr.overrideMimeType('text/plain; charset=x-user-defined');
	
	// console.log("Sending XHR for " + url);
	xhr.send(null);
	
	if (200 <= xhr.status && xhr.status <= 300) {
		callback && callback(xhr); 
	}
}

function getSingleImage(xhr) {
	var type = xhr.getResponseHeader('Content-Type');
	var body = xhr.responseText.replace(/[\u0100-\uffff]/g, function(c) { 
		return String.fromCharCode(c.charCodeAt(0) & 0xff);
	});

	if (type === 'image/gif' || type === 'text/plain; charset=x-user-defined') {
		var parser = new GifParser(body);
		var image = parser.parse();
		
		if (image.Header === null
		|| image.Image.length === 0) {
			throw new Error('ERROR: gif is broken.');
		}
		
		if (image.Image.length !== 0) {
			throw new Error('Image is not animated, throw so we dont interfer with other plugins...');	
		}

		var nonAnimatedGif = [
				image.Header,
				image.GraphicControlExtension.length !== 0 ? image.GraphicControlExtension[0] : "",
				image.Image[0],
				image.Tail
			].join('');
		var dataURL = 'data:image/gif;base64,' + btoa(nonAnimatedGif);
		
		//console.log(dataURL);
		return dataURL;      
	}
	throw new Error('ERROR: Image is not an animatable format.');
}

var GifImage = function () {
	this.Header = null;
	this.ApplicationExtension = null;
	this.CommentExtension = null;
	this.Image = [];
	this.GraphicControlExtension = [];
	this.Tail = ";";
};
