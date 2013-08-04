if (window.DEVELOPMENT) {
  chrome = {};
  chrome.devtools = {};
  chrome.devtools.inspectedWindow = {
    tabId: 1,
    eval: function(str, cb) {
      cb(eval(str));
    }
  };
}

Backbone.ajax = function(request) {
  var msg = {};

  msg.path  = request.type + ' ' + request.url;
  msg.tabId = chrome.devtools.inspectedWindow.tabId;
  msg.data  = request.data;

  var onMessage = function(response) {
    try {
      request.success(response);
    } catch(e) {
      request.error(e);
    }
  };

  chrome.extension.sendMessage(msg, onMessage);
};

var ci = {

  resizers: {},

  Models: {},

  Collections: {},

  Views: {},

  run: function() {
    var self = this;

    chrome.devtools.inspectedWindow.eval('window.document.domain', function(result) {
      self.url = result;

      self._listenToWindowResize();
      self._listenToResizerDrag();

      self.cookies = new ci.Collections.Cookies();

      var headerView = new ci.Views.Header({cookies: self.cookies});
      $(document.body).append(headerView.render().el);

      var contentView = new ci.Views.Content({cookies: self.cookies});
      $(document.body).append(contentView.render().el);

      var footerView = new ci.Views.Footer();
      $(document.body).append(footerView.render().el);

      // Add the resizers
      var $resizers = $('#header table th');
      for (var i = 1; i < $resizers.length; i += 1) {
        var view = new ci.Views.Resizer({$column: $resizers.eq(i)});
        view.$el.attr('data-index', i - 1);
        self.resizers[i] = view;
        $(document.body).append(view.render().el);
      }

      if (window.DEVELOPMENT) {
        self.cookies.reset(COOKIES);
      } else {
        self.cookies.fetch({reset: true});
      }
    });
  },

  _listenToResizerDrag: function() {
    document.body.addEventListener('drag', this._onResizerDrag.bind(this), false);
  },

  _listenToWindowResize: function() {
    // window resize is said to be inefficient but in
    // this use case its alright ;)
    window.onresize = this._onWindowResize.bind(this);
  },

  _onWindowResize: function(val) {
    this.trigger('resize');
  },

  _onResizerDrag: function(e) {
    if (e.x === 0 && e.y === 0) { return; }

    var index = parseInt($(e.target).attr('data-index'));
    var thWidth = $('#header table th').eq(index)[0].offsetLeft + $('#header table th').eq(index)[0].offsetWidth;
    var difference = thWidth - e.x;
    var percentage = (difference / $('#header table').width()) * 100;

    // Resize the column
    var $headerCols = $('#header table col');
    var $contentCols = $('#content table col');

    var prevColWidth = $headerCols.eq(index).width() - percentage;
    var nextColWidth = $headerCols.eq(index + 1).width() + percentage;

    if (prevColWidth > 3 && nextColWidth > 3) {
      $headerCols.eq(index).css('width', prevColWidth + '%');
      $contentCols.eq(index).css('width', prevColWidth + '%');

      $headerCols.eq(index + 1).css('width', nextColWidth + '%');
      $contentCols.eq(index + 1).css('width', nextColWidth + '%');

      this.trigger('resize');
    }
  }
};

// Make sure we get Backbone events on our
// literal object.
_.extend(ci, Backbone.Events);

// Main entry point
$(document).ready(function() {

  ci.run();

});