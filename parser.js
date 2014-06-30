 
var GifParser = function (data) {
	this._data = data;
	this._offset = 0;
	this._image = null;
	
	this.symbol = function () {
		return this._data.charCodeAt(this._offset);
	};
	
	this.readSymbol = function () {
		if (this._offset >= this._data.length) {
			throw new Error('readSymbol(): Out of range');
		}
		++this._offset;
	};
	
	this.accept = function (argC) {
		return this.symbol() === argC.charCodeAt(0);
	};
	
	this.expect = function (argC) {
		if (!this.accept(argC)) {
			throw new Error('Expected(): Unexpected symbol');
		}
		return true;
	};
	
	this.parse = function () {
		this._image = new GifImage();
		this.parseHeader();
		this._image.Header = this.readRange(0, this._offset);
		this.parseBlocks();
		return this._image;
	}

	this.expectString = function (argBytes) {
        if (argBytes.length > this._data.length) {
            throw new Error('ExpectString(): Unexpected data1');
        }

        for (var i = 0; i < argBytes.length; ++i) {
            if (argBytes.charCodeAt(i) !== this._data.charCodeAt(this._offset + i)) {
                throw new Error('ExpectString(): Unexpected data2');
            }
        }
        this._offset += argBytes.length;
        return true;
    };
	
    this.readBytes = function (argNo) {
        var result = [];
        var index = 0;

        while (argNo-- != 0) {
            result.push(this.symbol());
            this.readSymbol();
        }
        return result;
    };

    this.readRange = function (argStart, argEnd) {
    	var result = "";
        var index = 0;

        for (var i = argStart; i < argEnd; ++i) {
            result += this._data[i];
        }
        return result;
    };
	
    this.parseBlocks = function () {
        while (true) {
            var begin = this._offset;
			//console.log("state: " + this._data[this._offset].charCodeAt(0));

            if (this.accept('\x21')) {
                this.readSymbol();
                if (this.accept('\xff')) {
                    this.readApplicationExtensionBlock();
                    this._image.ApplicationExtension = this.readRange(begin, this._offset);
                }
                else if (this.accept('\xf9')) {
                    this.readGraphicControlExtensionBlock();
                    this._image.GraphicControlExtension.push(this.readRange(begin, this._offset));
                }
                else if (this.expect('\xfe')) {
                    this.readCommentExtensionBlock();
                    this._image.CommentExtension = this.readRange(begin, this._offset);
                }
            }
            else if (this.accept('\x2c')) {
                this.readImageBlock();
                this._image.Image.push(this.readRange(begin, this._offset));
			    //stop parsing after we got first frame
			    return;
            }
            else {
				//work around for broken images...
				return;
			}
/*                
            else if (this.expect('\x3b')) {
                break;
            }
*/                
        }
    };

    this.readImageBlock = function () {
        this.readSymbol();
        this.readBytes(2);
        this.readBytes(2);
        this.readBytes(2);
        this.readBytes(2);
    
        var packedField = this.readBytes(1)[0];
        var tableSize = 3 * (1 << (1 + (packedField & 0x7)));
        if (packedField >> 7 !== 0)
        {
            this.readBytes(tableSize);
        }

        this.readBytes(1);
        this.readContinuousBlocks();
        this.expect('\x00');
        this.readSymbol();	    
    };

    this.readCommentExtensionBlock = function () {
        this.readSymbol();
        this.readContinuousBlocks();
        this.expect('\x00');
        this.readSymbol();
    };

    this.readContinuousBlocks = function () {
		while (this.symbol() !== 0) {
			var blockSize = this.symbol();
			
			this.readBytes(blockSize);
			this.readBytes(1);
		}
		this.expect('\x00');
    };

    this.readGraphicControlExtensionBlock = function () {
        this.readBytes(1);
        this.expect('\x04');
        this.readSymbol();
        this.readBytes(2);
        this.readBytes(1);
        this.readBytes(1);
        this.expect('\x00');
        this.readSymbol();
    };

    this.readApplicationExtensionBlock = function () {
        this.readBytes(1); //0x0b
        this.expect('\x0b');
        this.readSymbol();
    	this.readBytes(11); //this.expectString("NETSCAPE2.0");
        this.readContinuousBlocks();
        this.expect('\x00');
        this.readBytes(1);
    };

    this.parseHeader = function () {
        var mul = 0;

        this.expectString("GIF");
    	this.readBytes(3); //GIF VERSION
        this.readBytes(2); // width
        this.readBytes(2); // height
        var readByte = this.readBytes(1)[0];
        if (readByte >> 7 !== 0)
        {
            mul = 3;
        }
        var tableSize = 1 << (1 + (readByte & 0x7)); // flag, resolution, table, size
        this.readBytes(1); // background color index
        this.readBytes(1); // pixel aspect ratio
        this.readBytes(tableSize * mul);
    };
};
