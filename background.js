chrome.webRequest.onBeforeRequest.addListener(
  function(info) {
    console.log(info.url);
    var response = {redirectUrl: info.url};
    
    request(info.url, function(xhr) { // callback
	try {
	  var singleImageSrc = getSingleImage(xhr);
	  response.redirectUrl = singleImageSrc;
	} catch(e) {
	  console.log(e);
	}
      }
    );
    //console.log(response);
    return response;
    //return {redirectUrl: "https://upload.wikimedia.org/wikipedia/commons/c/ce/Transparent.gif"};
  },
  // filters
  {
    urls: [
      "http://*/*.gif",
      "https://*/*.gif"
    ],
    types: ["image"]
  },
  // extraInfoSpec
  ["blocking"]);
//adam
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
  var body = xhr.responseText.replace(/[\u0100-\uffff]/g, function(c){ 
    return String.fromCharCode(c.charCodeAt(0) & 0xff);
  });
  
  if (type === 'image/gif' || type === 'text/plain; charset=x-user-defined') {
    // http://www.tohoho-web.com/wwwgif.htm
    // Animated GIF goes like
    //  - Gif Header starts with 'GIF89a', then follows 7-775 Bytes
    //  - Application Extension starts with 0x21 0xff 0x0b 
    //    then 'NETSCAPE2.0'
    //    then the Block Size #2 (1 Byte)
    //    then 0x01 
    //    then number of loops (2 Bytes)
    //    then the Block Terminator 0x00
    //  - Graphic Control starts with 0x21 0xf9, then 5 Bytes, then 0x00
    //    Image Block starts with 0x2c, then ends with 0x00
    //  - Graphic Control and Image Block repeats
    //  - Trailer 0x3b
    //
    // Normal GIF have neither the Application Extension nor the repeating part
    
	try {
		console.log("trace1");
		var parser = new GifParser(new Stream(body));
		console.log("trace2");
	} catch(e) {
		console.log("exception:" + e.message);
	}	  
	
	  
    if (/^(GIF8[79]a[\s\S]{7,775})(\x21\xf9[\s\S]{5}\0)*([\s\S]*?)(\x21\xff\x0bNETSCAPE2\.0[\s\S]\x01[\s\S]{2}\0)([\s\S]*?)(\x21\xf9[\s\S]{5}\0)(\x2c[\s\S]*?\0)(\x21\xf9)/.test(body)) {
      var nonAnimatedGif = [
        RegExp.$1, // Gif Header
        RegExp.$2, // Possible graphic control
        RegExp.$6, // Graphic Control
        RegExp.$7, // Image Block
        ';'
      ].join('');

      var dataURL = 'data:image/gif;base64,' + btoa(nonAnimatedGif);
      //console.log(dataURL);
      return dataURL;      
    } else {
      console.log("The GIF image is not animated."); // :-D
      throw new Error('The GIF image is not animated.');
    }
  }
  throw new Error('ERROR: Image is not an animatable format.');
}

var GifParser = function (stream) {
	this.stream = stream;
	this.result = null;
	
	this.parseFile = function () {
		this.expectedData("GIF89a");
		this.stream.readUntil("\x21\xff\x0bNETSCAPE2.0");
		this.stream.readByte();
		this.expectedData("\x01");
		this.stream.readBytes(2); // loops
		this.expectedData("\x00");
		this.readBlocks();
	};
	
	
    //  - Graphic Control starts with 0x21 0xf9, then 5 Bytes, then 0x00
    //    Image Block starts with 0x2c, then ends with 0x00
    //  - Graphic Control and Image Block repeats
    //  - Trailer 0x3b	
	
	this.readBlocks = function () {
		while (this.stream.accept("\x21")) {
			this.stream.readByte();
			this.expectedData("\xf9");
			var buffer = this.stream.readBytes(5);
			this.stream.expect("\x00");
			this.stream.readByte();
			this.readImageBlock();
		}
		//this.stream.expect("\x3b");
	};
	
	this.readImageBlock = function () {
		this.stream.expect("\x2c");
		var buffer = this.stream.readUntil("\x00\x21\xf9");
		console.log(buffer);
		console.log(this.stream.data[this.stream.pos]);
		this.stream.readByte();
		this.stream.readByte();
		this.stream.readByte();
		console.log(this.stream.data[this.stream.pos]);
	};
	
	this.expectedData = function (data) {
		var read = this.stream.readString(data.length);
		
		if (data !== read) {
			console.log("unexpected data: " + read + ", wanted: " + data);
			throw new Error('Unexpected data.' + read);
		}
	};
	
	this.parseFile();
};

var Stream = function (data) {
	this.data = data;
	this.len = this.data.length;
	this.pos = 0;

	this.readUntil = function (end) {
		var inputLength = end.length;
		//var result = "";
		var result = [];
		
		for (var i = this.pos; i < this.len - inputLength; ++i) {
			if (this.matchSubstring(this.data, end, i, inputLength)) {
				for (var j = this.pos; j < i; ++j) {
					//result += this.data[this.pos + j];
					result.push(this.data.charCodeAt(j) & 0xFF);
				}
				this.pos = i + inputLength;
				return result;
			}
		}
		throw new Error('Unable to seek to expected data.');
	};
	
	this.accept = function (c) {
		return this.data[this.pos] === c;
	};
	
	this.expect = function (c) {
		if (this.data[this.pos] !== c) {
			throw new Error('Unexpected value got: ' + this.data[this.pos] + ", expected: " + c);
		}
	};	
	
	this.matchSubstring = function (array, substring, offset, length) {
		for (var i = 0; i < length; ++i) {
			if (substring[i] !== this.data[offset + i]) {
				return false;
			}
		}
		return true;
	};
	
	this.readByte = function () {
		if (this.pos >= this.data.length) {
			throw new Error('Attempted to read past end of stream.');
		}
		return data.charCodeAt(this.pos++) & 0xFF;
	};
	
	this.readString = function (n) {
		var array = this.readBytes(n);
		var result = "";
		
		for (var i = 0; i < array.length; i++) {
			result += String.fromCharCode(array[i]);
		}
		return result;
	};

	this.readBytes = function (n) {
		var bytes = [];
		for (var i = 0; i < n; i++) {
			bytes.push(this.readByte());
		}
		return bytes;
	};

	this.read = function (n) {
		var s = '';
		for (var i = 0; i < n; i++) {
			s += String.fromCharCode(this.readByte());
		}
		return s;
	};

	this.readUnsigned = function () { // Little-endian.
		var a = this.readBytes(2);
		return (a[1] << 8) + a[0];
	};
};