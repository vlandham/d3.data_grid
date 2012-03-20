(function(){var data_grid, root;

root = typeof exports !== "undefined" && exports !== null ? exports : this;

data_grid = root.data_grid = {};

data_grid.version = "0.2.0";

var picnet = {};
picnet.ui = {};
picnet.ui.filter = {};

/**
 * @constructor
 */
picnet.ui.filter.SearchEngine = function() {
  /**
   * @private
   * @type {Object.<number>}
   */
  this.precedences_ = {
    'or' :1,
    'and':2,
    'not':3
  };
};
 
/**  
 * @param {string} textToMatch
 * @param {Array.<string>} postFixTokens   
 * @param {boolean} exactMatch
 * @return {boolean}
 */
picnet.ui.filter.SearchEngine.prototype.doesTextMatchTokens = function (textToMatch, postFixTokens, exactMatch) {
    if (!postFixTokens) return true;
    textToMatch = exactMatch ? textToMatch : textToMatch.toLowerCase();
    var stackResult = [];
    var stackResult1;
    var stackResult2;
 
    for (var i = 0; i < postFixTokens.length; i++) {
        var token = postFixTokens[i];
        if (token !== 'and' && token !== 'or' && token !== 'not') {
            if (token.indexOf('>') === 0 || token.indexOf('<') === 0 || token.indexOf('=') === 0 || token.indexOf('!=') === 0) {
                stackResult.push(this.doesNumberMatchToken(token, textToMatch));
            } else {
                stackResult.push(exactMatch ? textToMatch === token : textToMatch.indexOf(token) >= 0);
            }
        }
        else {
 
            if (token === 'and') {
                stackResult1 = stackResult.pop();
                stackResult2 = stackResult.pop();
                stackResult.push(stackResult1 && stackResult2);
            }
            else if (token === 'or') {
                stackResult1 = stackResult.pop();
                stackResult2 = stackResult.pop();
 
                stackResult.push(stackResult1 || stackResult2);
            }
            else if (token === 'not') {
                stackResult1 = stackResult.pop();
                stackResult.push(!stackResult1);
            }               
        }
    }
    return stackResult.length === 1 && stackResult.pop();
};
 
/**  
 * @param {string} text
 * @return {Array.<string>}
 */
picnet.ui.filter.SearchEngine.prototype.parseSearchTokens = function(text) {
    if (!text) { return null; }     
    text = text.toLowerCase();
    var normalisedTokens = this.normaliseExpression(text);
    normalisedTokens = this.allowFriendlySearchTerms(normalisedTokens);
    var asPostFix = this.convertExpressionToPostFix(normalisedTokens);
    var postFixTokens = asPostFix.split('|');
    return postFixTokens;
};
     
/**
 * @private
 * @param {string} token
 * @param {string} text
 * @return {boolean}
 */
picnet.ui.filter.SearchEngine.prototype.doesNumberMatchToken = function(token, text) {
    var op,exp,actual = this.getNumberFrom(text);   
    if (token.indexOf('=') === 0) {
        op = '=';
        exp = parseFloat(token.substring(1));
    } else if (token.indexOf('!=') === 0) {
        op = '!=';
        exp = parseFloat(token.substring(2));
    } else if (token.indexOf('>=') === 0) {
        op = '>=';
        exp = parseFloat(token.substring(2));
    } else if (token.indexOf('>') === 0) {
        op = '>';
        exp = parseFloat(token.substring(1));
    } else if (token.indexOf('<=') === 0) {
        op = '<=';
        exp = parseFloat(token.substring(2));
    } else if (token.indexOf('<') === 0) {
        op = '<';
        exp = parseFloat(token.substring(1));
    } else {
        return true;
    }
 
    switch (op) {
        case '!=': return actual !== exp;
        case '=': return actual === exp;
        case '>=': return actual >= exp;
        case '>': return actual > exp;
        case '<=': return actual <= exp;
        case '<': return actual < exp;
    }
    throw new Error('Could not find a number operation: ' + op);
};
 
/** 
 * @private
 * @param {string} txt
 * @return {number}
 */
picnet.ui.filter.SearchEngine.prototype.getNumberFrom = function(txt) {
    if (txt.charAt(0) === '$') {
        txt = txt.substring(1);
    }
    return parseFloat(txt);
};
         
/**  
 * @private
 * @param {string} text
 * @return {!Array.<string>}
 */
picnet.ui.filter.SearchEngine.prototype.normaliseExpression = function(text) {
    var textTokens = this.getTokensFromExpression(text);
    var normalisedTokens = [];
 
    for (var i = 0; i < textTokens.length; i++) {
        var token = textTokens[i];
        token = this.normaliseTerm(normalisedTokens, token, '(');
        token = this.normaliseTerm(normalisedTokens, token, ')');
 
        if (token.length > 0) { normalisedTokens.push(token); }
    }
    return normalisedTokens;
};
 
/**
 * @private
 * @param {!Array.<string>} tokens
 * @param {string} token
 * @param {string} term
 */
picnet.ui.filter.SearchEngine.prototype.normaliseTerm = function(tokens, token, term) {
    var idx = token.indexOf(term);
    while (idx !== -1) {
        if (idx > 0) { tokens.push(token.substring(0, idx)); }
 
        tokens.push(term);
        token = token.substring(idx + 1);
        idx = token.indexOf(term);
    }
    return token;
};
 
/**
 * @private
 * @param {string} exp
 * @return {!Array.<string>}
 */
picnet.ui.filter.SearchEngine.prototype.getTokensFromExpression = function(exp) {       
    exp = exp.replace('>= ', '>=').replace('> ', '>').replace('<= ', '<=').replace('< ', '<').replace('!= ', '!=').replace('= ', '=');
    var regex = /([^"^\s]+)\s*|"([^"]+)"\s*/g;      
    var matches = [];
    var match = null;
    while (match = regex.exec(exp)) { matches.push(match[1] || match[2]); }
    return matches;
};
 
/**  
 * @private
 * @param {!Array.<string>} tokens
 * @return {!Array.<string>}
 */
picnet.ui.filter.SearchEngine.prototype.allowFriendlySearchTerms = function(tokens) {
    var newTokens = [];
    var lastToken;
 
    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        if (!token || token.length === 0) { continue; }
        if (token.indexOf('-') === 0) {
            token = 'not';
            tokens[i] = tokens[i].substring(1);
            i--;
        }
        if (!lastToken) {
            newTokens.push(token);
        } else {
            if (lastToken !== '(' && lastToken !== 'not' && lastToken !== 'and' && lastToken !== 'or' && token !== 'and' && token !== 'or' && token !== ')') {
                newTokens.push('and');
            }
            newTokens.push(token);
        }
        lastToken = token;
    }
    return newTokens;
};
 
/**  
 * @private
 * @param {!Array.<string>} normalisedTokens
 * @return {string}
 */
picnet.ui.filter.SearchEngine.prototype.convertExpressionToPostFix = function(normalisedTokens) {
    var postFix = '';
    var stackOps = [];
    var stackOperator;
    for (var i = 0; i < normalisedTokens.length; i++) {
        var token = normalisedTokens[i];
        if (token.length === 0) continue;
        if (token !== 'and' && token !== 'or' && token !== 'not' && token !== '(' && token !== ')') {
            postFix = postFix + '|' + token;
        }
        else {
            if (stackOps.length === 0 || token === '(') {
                stackOps.push(token);
            }
            else {
                if (token === ')') {
                    stackOperator = stackOps.pop();
                    while (stackOperator !== '(' && stackOps.length > 0) {
                        postFix = postFix + '|' + stackOperator;
                        stackOperator = stackOps.pop();
                    }
                }
                else if (stackOps[stackOps.length - 1] === '(') {
                    stackOps.push(token);
                } else {
                    while (stackOps.length !== 0) {
                        if (stackOps[stackOps.length - 1] === '(') { break; }
                        if (this.precedences_[stackOps[stackOps.length - 1]] > this.precedences_[token]) {
                            stackOperator = stackOps.pop();
                            postFix = postFix + '|' + stackOperator;
                        }
                        else { break; }
                    }
                    stackOps.push(token);
                }
            }
        }
    }
    while (stackOps.length > 0) { postFix = postFix + '|' + stackOps.pop(); }
    return postFix.substring(1);
};

/**
 * @constructor
 * @param {string} id
 * @param {string} value
 * @param {number} idx
 * @param {string} type
 */
picnet.ui.filter.FilterState = function(id, value, idx, type) {
    /** 
     * @type {string}
     */
    this.id = id;
    /** 
     * @type {string}
     */
    this.value = value;
    /** 
     * @type {number}
     */
    this.idx = idx;
    /** 
     * @type {string}
     */
    this.type = type;   
};
 
/** 
 * @override
 * @return {string}
 */
picnet.ui.filter.FilterState.prototype.toString = function() { return 'id[' + this.id + '] value[' + this.value + '] idx[' + this.idx + '] type[' + this.type + ']'; };

var DataGrid,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

DataGrid = (function() {

  function DataGrid(id, options) {
    if (options == null) options = {};
    this.end_refresh_timer = __bind(this.end_refresh_timer, this);
    this.start_refresh_timer = __bind(this.start_refresh_timer, this);
    this.refresh = __bind(this.refresh, this);
    this.show = __bind(this.show, this);
    this.error_no_data = __bind(this.error_no_data, this);
    this.header = __bind(this.header, this);
    this.limit = __bind(this.limit, this);
    this.filter = __bind(this.filter, this);
    this.filter_states = __bind(this.filter_states, this);
    this.filter_state_for = __bind(this.filter_state_for, this);
    this.sort_decending = __bind(this.sort_decending, this);
    this.sort = __bind(this.sort, this);
    this.create_view_pagination = __bind(this.create_view_pagination, this);
    this.refresh_view = __bind(this.refresh_view, this);
    this.create_view = __bind(this.create_view, this);
    this.change_column_display = __bind(this.change_column_display, this);
    this.set_column_display = __bind(this.set_column_display, this);
    this.column_display = __bind(this.column_display, this);
    this.id = id;
    this.filters = [];
    this.search = new picnet.ui.filter.SearchEngine();
    this.timer = null;
    this.column_displays = {};
    this.options = this.default_options(options);
  }

  DataGrid.prototype.default_options = function(options) {
    if (options.filename == null) options.filename = null;
    if (options.page == null) options.page = 1;
    if (options.limit == null) options.limit = 100;
    if (options.sort == null) options.sort = null;
    if (options.page_top == null) options.page_top = false;
    if (options.page_bottom == null) options.page_bottom = true;
    if (options.time_interval == null) options.time_interval = 800;
    if (options.chart_display == null) options.chart_display = true;
    return options;
  };

  DataGrid.prototype.column_display = function(column_id) {
    return this.column_displays[column_id];
  };

  DataGrid.prototype.set_column_display = function(column_id, display_type) {
    return this.column_displays[column_id] = display_type;
  };

  DataGrid.prototype.change_column_display = function(column_id) {
    var column_extent, current_display, grid_rows, new_display, w;
    current_display = this.column_display(column_id);
    new_display = current_display === "num" ? "chart" : "num";
    grid_rows = this.grid_body.selectAll("tr");
    column_extent = d3.extent(this.filtered_data, function(d) {
      return parseFloat(d3.values(d)[column_id]);
    });
    w = d3.scale.linear().domain(column_extent).range(["2px", "30px"]);
    grid_rows.each(function(d) {
      var new_html, raw_value, value;
      raw_value = d3.values(d)[column_id];
      new_html = raw_value;
      if (current_display === "num") {
        value = parseFloat(d3.values(d)[column_id]);
        if (value) {
          new_html = "<div title=\"" + raw_value + "\"class=\"data_grid_bar\" style=\"width:" + (w(value)) + ";background-color:steelBlue;height:16px;\"></div>";
        }
      }
      return d3.select(this).selectAll("td").filter(function(d, i) {
        return i === column_id;
      }).html(new_html);
    });
    this.set_column_display(column_id, new_display);
    return this.display_controls.filter(function(d, i) {
      return i === column_id;
    }).text(current_display).classed(new_display, false).classed(current_display, true);
  };

  DataGrid.prototype.create_view = function(id, data, options) {
    var grid, grid_filters, grid_header, grid_titles, grid_views, header_data,
      _this = this;
    grid = d3.select(id).append("table").attr("id", "data_grid_table");
    header_data = this.header(data);
    grid_header = grid.append("thead");
    grid_titles = grid_header.append("tr");
    grid_views = null;
    if (this.options.chart_display) {
      grid_views = grid_header.append("tr").attr("class", "grid_views");
    }
    grid_filters = grid_header.append("tr").attr("class", "filters");
    grid_titles.selectAll("th").data(header_data).enter().append("th").attr("class", function(d) {
      return "sortable";
    }).on("click", function(d, i) {
      return _this.sort_decending(i);
    }).text(function(d) {
      return d;
    });
    if (grid_views) {
      this.display_controls = grid_views.selectAll("td").data(header_data).enter().append("td").attr("class", "data_grid_data_display_cell").append("a").attr("href", "#").on("click", function(d, i) {
        return _this.change_column_display(i);
      }).text("chart").classed("data_grid_data_display chart", true).text("chart");
      this.display_controls.each(function(d, i) {
        return _this.set_column_display(i, "num");
      });
    }
    this.filters = grid_filters.selectAll("td").data(header_data).enter().append("td").append("input").attr("id", function(d, i) {
      return "filter_" + i;
    }).attr("type", "text").style("width", "95%").on("input", function(d) {
      return _this.start_refresh_timer();
    });
    return this.grid_body = grid.append("tbody");
  };

  DataGrid.prototype.refresh_view = function(data, options) {
    var grid_row, grid_rows, header, header_data, _i, _len, _results;
    header_data = this.header(data);
    this.grid_body.selectAll("tr").remove();
    grid_rows = this.grid_body.selectAll("tr").data(data);
    grid_row = grid_rows.enter().append("tr");
    _results = [];
    for (_i = 0, _len = header_data.length; _i < _len; _i++) {
      header = header_data[_i];
      _results.push(grid_row.append("td").text(function(d) {
        return d[header];
      }));
    }
    return _results;
  };

  DataGrid.prototype.create_view_pagination = function(id, data, options) {
    var current_page, max_pages, min_pages, page_range, pages, pagination, _i, _results,
      _this = this;
    page_range = 20;
    current_page = options.page;
    min_pages = 1;
    max_pages = data.length === 0 ? 1 : Math.ceil(data.length / options.limit);
    pagination = d3.select(id).attr("class", "data_grid_page_links");
    pages = pagination.selectAll("a").remove();
    pages = pagination.selectAll("a").data((function() {
      _results = [];
      for (var _i = min_pages; min_pages <= max_pages ? _i <= max_pages : _i >= max_pages; min_pages <= max_pages ? _i++ : _i--){ _results.push(_i); }
      return _results;
    }).apply(this));
    pages.enter().append("a").attr("id", function(d) {
      return "data_grid_page_link_" + d;
    }).attr("data-page", function(d) {
      return d;
    }).attr("href", "#").attr("class", function(d) {
      if (d === current_page) {
        return "data_grid_page_link current";
      } else {
        return "data_grid_page_link";
      }
    }).text(function(d) {
      return "" + d;
    }).on("click", function(d) {
      _this.options.page = d;
      return _this.refresh();
    });
    return pages.exit().remove();
  };

  DataGrid.prototype.sort = function(data, options) {
    if (!options.sort) return;
    return data;
  };

  DataGrid.prototype.sort_decending = function(column_id) {
    return console.log("sort descending");
  };

  DataGrid.prototype.filter_state_for = function(filter, index) {
    var type, value;
    type = filter.type;
    value = filter.value;
    if (!value) {
      return null;
    } else {
      return new picnet.ui.filter.FilterState(filter.getAttribute('id'), value, index, type);
    }
  };

  DataGrid.prototype.filter_states = function() {
    var filter_index, filter_states;
    filter_states = [];
    filter_index = 0;
    this.filters.each(function(filter) {
      var filter_state;
      filter_state = DataGrid.prototype.filter_state_for(this, filter_index);
      if (filter_state) filter_states.push(filter_state);
      return filter_index += 1;
    });
    return filter_states;
  };

  DataGrid.prototype.filter = function(data, options) {
    var filter_state, filter_states, _i, _len,
      _this = this;
    filter_states = this.filter_states();
    for (_i = 0, _len = filter_states.length; _i < _len; _i++) {
      filter_state = filter_states[_i];
      filter_state.tokens = this.search.parseSearchTokens(filter_state.value);
    }
    if (filter_states && filter_states.length > 0) {
      data = data.filter(function(d) {
        var d_values, filter_state, keep, _j, _len2;
        d_values = d3.values(d);
        keep = true;
        for (_j = 0, _len2 = filter_states.length; _j < _len2; _j++) {
          filter_state = filter_states[_j];
          if (!_this.search.doesTextMatchTokens(d_values[filter_state.idx], filter_state.tokens, false)) {
            keep = false;
            break;
          }
        }
        return keep;
      });
    }
    return data;
  };

  DataGrid.prototype.limit = function(data, options) {
    var current_page, limit_end, limit_start, max_pages;
    max_pages = Math.ceil(data.length / options.limit);
    current_page = Math.max(options.page, 0);
    current_page = Math.min(current_page, max_pages);
    limit_start = (current_page - 1) * options.limit;
    limit_end = Math.min(current_page * options.limit, data.length) - 1;
    return data.slice(limit_start, limit_end + 1 || 9e9);
  };

  DataGrid.prototype.header = function(data) {
    return d3.keys(data[0]);
  };

  DataGrid.prototype.error_no_data = function() {
    return d3.select("#" + this.id).html("<div class=\"data_grid_error\">ERROR: file cannot be loaded</div>");
  };

  DataGrid.prototype.show = function(data) {
    var options;
    if (!data) {
      return this.error_no_data();
    } else {
      this.original_data = data;
      d3.select("#" + this.id).html("<div id=\"data_grid_pagination_top\"></div><div id=\"data_grid_data\"></div><div id=\"data_grid_pagination_bottom\"></div>");
      options = this.options;
      this.create_view("#data_grid_data", data, options);
      return this.refresh();
    }
  };

  DataGrid.prototype.refresh = function() {
    var data, options, page_data;
    options = this.options;
    data = this.original_data;
    this.filtered_data = this.filter(data, options);
    this.sort(this.filtered_data, options);
    if (options.page_top) {
      this.create_view_pagination("#data_grid_pagination_top", this.filtered_data, options);
    }
    if (options.page_bottom) {
      this.create_view_pagination("#data_grid_pagination_bottom", this.filtered_data, options);
    }
    page_data = this.limit(this.filtered_data, options);
    return this.refresh_view(page_data, options);
  };

  DataGrid.prototype.start_refresh_timer = function() {
    if (this.timer) clearTimeout(this.timer);
    return this.timer = setTimeout(this.end_refresh_timer, this.options.timer_interval);
  };

  DataGrid.prototype.end_refresh_timer = function() {
    this.timer = null;
    return this.refresh();
  };

  return DataGrid;

})();

data_grid.DataGrid = DataGrid;
}).call(this);
