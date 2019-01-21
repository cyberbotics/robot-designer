// Source: https://gist.github.com/dsamarin/3050311

function UndoItem (perform, data) {
	this.perform = perform;
	this.data = data;
}

/**
 * UndoStack:
 * Easy undo-redo in JavaScript.
 **/

function UndoStack(self) {
	this.stack = [];
	this.current = -1;
	this.self = self;
}

/**
 * UndoStack#push (action, data);
 * perform(true, data)  -> Function which performs redo based on previous state
 * perform(false, data) -> Function which performs undo based on current state
 * data -> Argument passed to undo/redo functions
 **/
UndoStack.prototype.push = function (perform, data) {
	this.current++;

	// We need to invalidate all undo items after this new one
	// or people are going to be very confused.
	this.stack.splice(this.current);
	this.stack.push(new UndoItem(perform, data));
};

UndoStack.prototype.undo = function () {
	var item;

	if (this.current >= 0) {
		item = this.stack[this.current];
		item.perform.call(this.self, false, item.data);
		this.current--;
	} else {
		throw new Error("Already at oldest change");
	}
};

UndoStack.prototype.redo = function () {
	var item;

	item = this.stack[this.current + 1];
	if (item) {
		item.perform.call(this.self, true, item.data);
		this.current++;
	} else {
		throw new Error("Already at newest change");
	}
};

UndoStack.prototype.canUndo = function () {
	return this.current >= 0;
}

UndoStack.prototype.canRedo = function () {
	return this.stack[this.current + 1] !== undefined;
}

UndoStack.prototype.invalidateAll = function () {
	this.stack = [];
	this.current = -1;
};
