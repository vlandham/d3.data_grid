# root = exports ? this

$ ->
  data_grid = new data_grid.DataGrid
  options = data_grid.get_options()

  data_loaded = (data) ->
    console.log("loaded")
    if data
      data_grid.show("data_grid",data)
    else
      error_bad_load()

  error_bad_load = () ->
    d3.select("#data_grid").html("<h2 class=\"error\">ERROR: #{options.filename} cannot be loaded</h2>")
  error_no_file = () ->
    d3.select("#data_grid").html("<h2 class=\"error\">ERROR: no file provided</h2>")

  error_bad_extension = () ->
    d3.select("#data_grid").html("<h2 class=\"error\">ERROR: #{options.filename} wrong extension. Can be .tsv or .csv</h2>")

  if options.filename
    ext = options.filename.split('.').pop()
    if(ext == "csv")
      d3.csv options.filename, data_loaded
    else if(ext == "tsv")
      d3.tsv options.filename, data_loaded
    else
      error_bad_extension()
  else
    error_no_file()


