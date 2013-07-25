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
