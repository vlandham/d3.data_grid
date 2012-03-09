root ?= exports ? this

init_options =  () ->
  options = {}
  options.filename = getURLParameter('file') || null
  options.page = parseInt(getURLParameter('page')) || 1
  options.limit = parseInt(getURLParameter('limit')) || 100
  options.sort = getURLParameter('sort') || null
  options.page_top = getURLParameter('page_top') == 'true'
  options.page_bottom = !(getURLParameter('page_bottom') == 'false')
  options.timer_interval = getURLParameter('timer_interval') || 800
  options.chart_display = !(getURLParameter('chart_display') == 'false')
  options

$ ->
  options = init_options()
  options.filename = "demo/data/movies_2011.csv"
  console.log(options)

  data_grid = new root.data_grid.DataGrid(options)

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


