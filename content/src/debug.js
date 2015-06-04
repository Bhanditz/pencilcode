//////////////////////////////////////////////////////////////////////////r
// DEBUGGER SUPPORT
///////////////////////////////////////////////////////////////////////////
var traceEvents = []; //list of event location objects created by tracing events      

define([
  'jquery',
  'view',
  'see'
 ],
function($, view, see) {

eval(see.scope('debug'));

var targetWindow = null;    // window object of the frame being debugged.
var currentEventIndex = 0;
var currentDebugId = 0;
var currentEventIndex = 0;
var debugRecords = {};


Error.stackTraceLimit = 20;


// Resets the debugger state:
// Remembers the targetWindow, and clears all logged debug records.
// Calling bindframe also resets firstSessionId, so that callbacks
// having to do with previous sessions are ignored.
function bindframe(w) {
  if (!targetWindow && !w || targetWindow === w) return;
  targetWindow = w;  
  view.clearPaneEditorMarks(view.paneid('left'));
  view.notePaneEditorCleanLineCount(view.paneid('left'));
}

// Exported functions from the edit-debug module are exposed
// as the top frame's "ide" global variable.
var debug = window.ide = {
  nextId: function() {
    // The following line of code is hot under profile and is optimized:
    // By avoiding using createError()'s thrown exception when we can get
    // a call stack with a simple Error() constructor, we nearly double
    // speed of a fractal program.
	//return currentEventIndex;
	return currentDebugId;
  },
  bindframe: bindframe,
  interruptable: function() {
    if (targetWindow && targetWindow.jQuery && targetWindow.jQuery.turtle &&
        typeof(targetWindow.jQuery.turtle.interrupt) == 'function') {
      return targetWindow.jQuery.turtle.interrupt('test');
    }
    return false;
  },
  reportEvent: function(name, data) {
    if (!targetWindow) {
      return;
	  }

    console.log("reportEvent", name, data);

	  if(name === "appear"){
      var debugId = data[1];
      var record = debugRecords[debugId];
      var index = record.eventIndex;
      var location = traceEvents[index].location.first_line
      var coordId = data[3];
      var elem = data[4];
      record.startCoords[coordId] = collectCoords(elem);
		  traceLine(location);
  	}
  	if(name === "resolve"){
      var debugId = data[1];
      var record = debugRecords[debugId];
      var index = record.eventIndex;
      var location = traceEvents[index].location.first_line
      var coordId = data[3];
      var elem = data[4];
      record.endCoords[coordId] = collectCoords(elem);
  		untraceLine(location);

  	}

  
   // come back and update this reportEvent	
   
   console.log("currentdebugid:", currentDebugId)
  },
  stopButton: function(){
	  console.log("stopButton");
  },
  getEditorText: function() {
    var doc = view.getPaneEditorData(view.paneid('left'));
    if (doc) {
      return doc.data;
    }
    return '';
  },
  setEditorText: function(text) {
    view.changePaneEditorText(view.paneid('left'), text);
  },
  getOptions: function() {
    // To reduce clutter, do not show 'Test panel' UI within the run
    // frame when the whole IDE is framed.
    var embedded = /^frame\./.test(location.hostname);
    return {
      panel: embedded ? 'auto' : true
    };
  },
  trace: function(event,data) {
    // This receives events for the new debugger to use.
	var record = {eventIndex: null, startCoords: [], endCoords: []};
  console.log("trace");
	console.log(traceEvents);
  traceEvents.push(event);
  currentEventIndex = traceEvents.length - 1;
	currentDebugId = Math.floor(Math.random()*1000); 
  record.eventIndex = currentEventIndex;
  debugRecords[currentDebugId] = record;
	console.log(data)
  }
};


//////////////////////////////////////////////////////////////////////
// ERROR MESSAGE HINT SUPPORT
//////////////////////////////////////////////////////////////////////
function getTextOnLine(text, line) {
  var lines = text.split('\n'), index = line - 1;
  if (index >= 0 && index < lines.length) return lines[index];
  return '';
}

var showPopupErrorMessage = function (msg) {
  var center = document.getElementById('error-advice') ||
      document.createElement('center');
  center.id = "error-advice";
  document.body.insertBefore(center, document.body.firstChild);
  center.style.background = 'rgba(240,240,240,0.8)';
  center.style.position = 'absolute';
  center.style.top = 0;
  center.style.right = 0;
  center.style.left = 0;
  center.style.fontFamily = 'Arial';
  center.style.margin = '5px 15%';
  center.style.padding = '8px';
  center.style.borderRadius = '8px';
  center.style.boxShadow = '0 0 5px dimgray';
  center.innerHTML = msg;
}

function errorAdvice(msg, text) {
  var advice, m, msg;
  advice = '<p>Oops, the computer got confused.';
  if (msg) {
    msg = msg.replace(/^Uncaught [a-z]*Error: /i, '');
    if (msg !== "Cannot read property '0' of null") {
      advice += '<p>It says: "' + msg + '"';
    }
  }
  m = /(\w+) is not defined/.exec(msg);
  if (m) {
    if (/^[a-z]{2,}[0-9]+$/i.test(m[1])) {
      advice += "<p>Is there a missing space in '<b>" + m[1] + "</b>'?";
    } else if (/[A-Z]/.test(m[1]) && (m[1].toLowerCase() in {
        'dot':1, 'pen':1, 'fd':1, 'bk':1, 'lt':1, 'rt':1, 'write':1,
        'type':1, 'menu':1, 'play':1, 'speed':1, 'ht':1, 'st':1,
        'cs':1, 'cg':1, 'ct':1, 'fill':1, 'rgb':1, 'rgba':1, 'hsl':1,
        'hsla':1, 'red':1, 'blue':1, 'black':1, 'green':1, 'gray':1,
        'orange':1, 'purple':1, 'pink':1, 'yellow':1, 'gold':1,
        'aqua':1, 'tan':1, 'white':1, 'violet':1, 'snow':1, 'true':1,
        'false':1, 'null':1, 'for':1, 'if':1, 'else':1, 'do':1, 'in':1,
        'return':1})) {
      advice += ("<p>Did you mean '<b>" + (m[1].toLowerCase()) + "</b>' ") +
                ("instead of '<b>" + m[1] + "</b>'?");
    } else if (m[1].toLowerCase().substring(0, 3) == "inf") {
      advice += "<p><b>Infinity</b> is spelled like this with a capital I.";
    } else {
      if (m[1].length > 3) {
        advice += "<p>Is <b>" + m[1] + "</b> spelled right?";
      } else {
        advice += ("<p>Is '<b>" + m[1] + " = </b><em>something</em>' ") +
                  "needed first?";
      }
      advice += "<p>Or are quotes needed around <b>\"" + m[1] + "\"</b>?";
    }
  } else if (/object is not a function/.test(msg)) {
    advice += "<p>Is there missing punctuation like a dot?";
  } else if (/undefined is not a function/.test(msg)) {
    advice += "<p>Is a command misspelled here?";
  } else if (/indentation/.test(msg)) {
    advice += "<p>Is the code lined up neatly?";
    advice += "<p>Or is something unfinished before this?";
  } else if (/not a function/.test(msg)) {
    advice += "<p>Is there a missing comma?";
  } else if (/octal literal/.test(msg)) {
    advice += "<p>Avoid extra 0 digits before a number.";
  } else if (/unexpected when/.test(msg)) {
    advice += "<p>Is the 'when' indented correctly?";
  } else if (/unexpected newline/.test(msg)) {
    advice += "<p>Is something missing on the previous line?";
  } else if (/unexpected ,/.test(msg)) {
    m = /^.*?\b(\w+)\s+\((?:[^()]|\((?:[^()]|\([^()]*\))*\))+,.+\)/.exec(text);
    if (m) {
      advice += '<p>You might need to remove the space after ' +
                '<b>' + m[1] + '</b>.';
    } else if (/(^[^'"]*,\s*['"])|(['"],[^'"]*$)/.test(text)) {
      advice += '<p>You might want to use <b>+</b> instead of <b>,</b> ' +
                'to combine strings.';
    } else {
      advice += "<p>You might not need a comma here.";
    }
  } else if (/unexpected ->/.test(msg)) {
    advice += "<p>Is a comma or '=' missing before the arrow?";
  } else if (/unexpected end of input/.test(msg)) {
    advice += "<p>Is there some unfinished code around here?";
  } else if ((m = /unexpected (\S+)/.exec(msg))) {
    advice += "<p>Is something missing before " + m[1] + "?";
  } else if (/missing ["']/.test(msg) ||
      (msg === "Cannot read property '0' of null")) {
    advice += "<p>Is there a string with an unmatched quote?";
    advice += "<p>It might be on an higher line.";
  } else if (/missing [\])}]/.test(msg)) {
    advice += "<p>It might be missing on an higher line.";
  } else if ((m = /unexpected (\w+)$/.exec(msg))) {
    advice += "<p>You might try removing '" + m[1] + "'";
  } else if (/interrupt\('hung'\)/.test(msg)) {
    advice = '<p>Oops, the computer got stuck in calculations.' +
             '<p>The program was stopped so you can edit it.' +
             '<p>Maybe reduce the number of repeats?';
  }
  return advice;
}


// The error event is triggered when an uncaught exception occurs.
// The err object is an exception or an Event object corresponding
// to the error.
function debugError(err) {
  var line = editorLineNumberForError(err);
  view.markPaneEditorLine(view.paneid('left'), line, 'debugerror');
  var m = view.getPaneEditorData(view.paneid('left'));
  var text = getTextOnLine(m && m.data || '', line);
  var advice = errorAdvice(err.message, text);
  showDebugMessage(advice);
}

function showDebugMessage(m) {
  var script = (
    '(' + showPopupErrorMessage.toString() + '(' + JSON.stringify(m) + '));');
  view.evalInRunningPane(view.paneid('right'), script, true);
}


function collectCoords(elem) {
 try {
   // TODO: when the element is not a turtle with the standard
   // parent element positioning, we should do a slower operation to
   // grab the absolute position and direction.
   return {
     transform: elem.style[targetWindow.jQuery.support.transform]
   };
 } catch (e) {
   return null;
 }
}



// Highlights the given line number as a line being traced.
function traceLine(line) {
	console.log("traceLine output:", line)
  view.markPaneEditorLine(
      view.paneid('left'), line, 'guttermouseable', true);
  view.markPaneEditorLine(view.paneid('left'), line, 'debugtrace');
}

// Unhighlights the given line number as a line no longer being traced.
function untraceLine(line) {
  view.clearPaneEditorLine(view.paneid('left'), line, 'debugtrace');
}




// Returns the (1-based) line number for an error object, if any;
// or returns null if none can be figured out.
function editorLineNumberForError(error) {
  if (!error || !targetWindow) return null;
  if (!(error instanceof targetWindow.Error)) {
    // As of 2013-07-24, the HTML5 standard specifies that ErrorEvents
    // contain an "error" property.  This test allows such objects
    // (and any objects with an error property) to be passed and unwrapped.
    // http://html5.org/tools/web-apps-tracker?from=8085&to=8086
    if (error.error) {
      error = error.error;
    }
    // If we have a syntax error that doesn't get passed through the
    // event object, then try to pull it from the CoffeeScript.
    if (targetWindow.CoffeeScript && targetWindow.CoffeeScript.code) {
      for (var anyfile in targetWindow.CoffeeScript.code) {
        if (targetWindow.CoffeeScript.code[anyfile].syntaxError) {
          error = targetWindow.CoffeeScript.code[anyfile].syntaxError;
          break;
        }
      }
    }
  }
  var parsed = parsestack(error);
  if (!parsed) return null;
  if (!targetWindow || !targetWindow.CoffeeScript ||
      !targetWindow.CoffeeScript.code) return null;
  // Find the innermost call that corresponds to compiled CoffeeScript
  // or inline Javascript.
  var ownurl = targetWindow.location.href;
  var inline = false;
  var frame = null;
  for (var j = 0; j < parsed.length; ++j) {
    if (parsed[j].file == ownurl) {
      frame = parsed[j];
      inline = true;
      break;
    }
    if (parsed[j].file in targetWindow.CoffeeScript.code) {
      frame = parsed[j];
      break;
    }
  }
  // For debugging:
  // console.log(JSON.stringify(parsed), '>>>>', JSON.stringify(frame));
  if (!frame) {
    if (error instanceof targetWindow.SyntaxError) {
      if (error.location) {
        return error.location.first_line - lineNumberOffset;
      }
    }
    return null;
  }

  if (inline) {
    return frame.line - lineNumberOffset;
  }

  var smc = sourceMapConsumerForFile(frame.file);
  var mapped = smc.originalPositionFor({
    line: frame.line + 1, // Coffeescript adds a line to our js.
    column: frame.column - 1
  });
  if (mapped.line == null) return null;

  // Subtract a few lines of boilerplate from the top of the script.
  var result = mapped.line - lineNumberOffset;
  return result;
}

//////////////////////////////////////////////////////////////////////
// PARSE ERROR HIGHLIGHTING
//////////////////////////////////////////////////////////////////////

view.on('parseerror', function(pane, err) {
  if (err.loc) {
    // The markPaneEditorLine function uses 1-based line numbering.
    var line = err.loc.line + 1;
    view.markPaneEditorLine(pane, line, 'debugerror');
  }
  if (err.message){
    showDebugMessage(
      "<p>Oops, the computer could not show blocks." +
      "<p>It says:" + err.message.replace(/^.*Error:/i, ''));
  }
});

//////////////////////////////////////////////////////////////////////
// GUTTER HIGHLIGHTING SUPPORT
//////////////////////////////////////////////////////////////////////
view.on('entergutter', function(pane, lineno) {
	console.log("Got entergutter:", pane, lineno);
});

view.on('leavegutter', function(pane, lineno) {
	console.log("Got leavegutter:", pane, lineno);
});

view.on('icehover', function(pane, ev) {
	console.log("Got icehover:", pane, ev);
});





view.on('stop', function() {
	console.log("Got stop:");
});

///////////////////////////////////////////////////////////////////////////
// DEBUG EXPORT
///////////////////////////////////////////////////////////////////////////

return debug;

});
