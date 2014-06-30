function Play() {
	this.abort = function () {
		return true;
	};

	this.icon = function () {
		return "/play.png";
	}

	this.once = function () {
		return false;
	}
};

function Stop() {
	this.abort = function () {
		return false;
	};

	this.icon = function () {
		return "/stop.png";
	}	

	this.once = function () {
		return false;
	}
};

function Once() {
	this.abort = function () {
		return false;
	};

	this.icon = function () {
		return "/once.png";
	}	

	this.once = function () {
		return true;
	}	
}; 
