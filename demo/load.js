(function() {

  if (typeof root === "undefined" || root === null) {
    root = typeof exports !== "undefined" && exports !== null ? exports : this;
  }

  $(function() {
    var data_grid, data_loaded, error_bad_extension, error_bad_load, error_no_file, ext, options;
    data_grid = new root.data_grid.DataGrid;
    options = data_grid.get_options();
    data_loaded = function(data) {
      console.log("loaded");
      if (data) {
        return data_grid.show("data_grid", data);
      } else {
        return error_bad_load();
      }
    };
    error_bad_load = function() {
      return d3.select("#data_grid").html("<h2 class=\"error\">ERROR: " + options.filename + " cannot be loaded</h2>");
    };
    error_no_file = function() {
      return d3.select("#data_grid").html("<h2 class=\"error\">ERROR: no file provided</h2>");
    };
    error_bad_extension = function() {
      return d3.select("#data_grid").html("<h2 class=\"error\">ERROR: " + options.filename + " wrong extension. Can be .tsv or .csv</h2>");
    };
    if (options.filename) {
      ext = options.filename.split('.').pop();
      if (ext === "csv") {
        return d3.csv(options.filename, data_loaded);
      } else if (ext === "tsv") {
        return d3.tsv(options.filename, data_loaded);
      } else {
        return error_bad_extension();
      }
    } else {
      return error_no_file();
    }
  });

}).call(this);
