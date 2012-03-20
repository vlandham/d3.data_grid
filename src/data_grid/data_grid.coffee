
class DataGrid
  constructor: (id, options = {}) ->
    @id = id
    @filters = []
    @search  = new picnet.ui.filter.SearchEngine()
    @timer = null
    @column_displays = {}
    @options = this.default_options(options)

  default_options: (options) ->
    options.filename ?= null
    options.page ?= 1
    options.limit ?= 100
    options.sort ?= null
    options.page_top ?= false
    options.page_bottom ?= true
    options.time_interval ?= 800
    options.chart_display ?= true
    options

  # TODO: lots of column display stuff in our data_grid
  # move out to separate class?
  column_display: (column_id) =>
    @column_displays[column_id]

  set_column_display: (column_id, display_type) =>
    @column_displays[column_id] = display_type

  # TODO: hardcoding image paths not portable. 
  # investigate css only approach
  column_display_icon: (display_type) =>
    if display_type == "num"
      "/imgs/data_grid/eye.png"
    else
      "/imgs/data_grid/chart.png"

  change_column_display: (column_id) =>
    current_display = this.column_display(column_id)
    new_display = if current_display == "num" then "chart" else "num"
    grid_rows = @grid_body.selectAll("tr")
    column_extent = d3.extent(@filtered_data, (d) -> parseFloat(d3.values(d)[column_id]))
    w = d3.scale.linear().domain(column_extent).range(["2px", "30px"])
    grid_rows.each (d) ->
      raw_value = d3.values(d)[column_id]
      new_html = raw_value
      if current_display == "num"
        value = parseFloat(d3.values(d)[column_id])
        if value
          new_html = "<div title=\"#{raw_value}\"class=\"data_grid_bar\" style=\"width:#{w(value)};background-color:steelBlue;height:16px;\"></div>"
      d3.select(this).selectAll("td").filter((d,i) -> i == column_id).html(new_html)
    this.set_column_display(column_id, new_display)
    @display_controls.filter((d,i) -> i == column_id)
      .text(current_display)
      .classed(new_display, false)
      .classed(current_display, true)
      
  create_view: (id, data, options) =>
    grid = d3.select(id).append("table")
      .attr("id", "data_grid_table")

    header_data = this.header(data)

    grid_header = grid.append("thead")
    grid_titles = grid_header.append("tr")
    grid_views = null
    if @options.chart_display
      grid_views = grid_header.append("tr").attr("class", "grid_views")

    grid_filters = grid_header.append("tr").attr("class", "filters")

    grid_titles.selectAll("th")
      .data(header_data).enter()
      .append("th").attr("class", (d) =>
        "sortable"
      ).on("click", (d,i) => this.sort_decending(i)).text((d) -> d)

    if grid_views
      @display_controls = grid_views.selectAll("td")
        .data(header_data).enter()
      .append("td").attr("class", "data_grid_data_display_cell").append("a")
        .attr("href", "#")
        .on("click", (d,i) => this.change_column_display(i))
        .text("chart")
        .classed("data_grid_data_display chart", true)
        .text("chart")

      @display_controls.each((d,i) => this.set_column_display(i, "num"))

    @filters = grid_filters.selectAll("td")
      .data(header_data).enter()
    .append("td").append("input")
      .attr("id", (d,i) -> "filter_#{i}")
      .attr("type", "text")
      .style("width", "95%")
      .on("input", (d) => this.start_refresh_timer())

    @grid_body = grid.append("tbody")

  refresh_view: (data, options) =>
    header_data = this.header(data)

    @grid_body.selectAll("tr").remove()

    grid_rows = @grid_body.selectAll("tr")
      .data(data)

    grid_row = grid_rows.enter()
      .append("tr")

    for header in header_data
      grid_row.append("td")
        .text((d) -> d[header])

  # TODO: Looks Bad when lots of pages. fix
  create_view_pagination: (id, data, options) =>
    page_range = 20
    current_page = options.page
    min_pages = 1
    max_pages = if data.length == 0 then 1 else Math.ceil(data.length / options.limit)

    # min_pages = Math.max(min_all_pages, if current_page < page_range then 1 else Math.abs(current_page - 25) )
    # max_pages = Math.min(max_all_pages, current_page + page_range)

    pagination = d3.select(id).attr("class", "data_grid_page_links")

    pages = pagination.selectAll("a").remove()

    pages = pagination.selectAll("a")
      .data([min_pages..max_pages])

    pages.enter().append("a")
      .attr("id", (d) -> "data_grid_page_link_#{d}")
      .attr("data-page", (d) -> d)
      .attr("href", "#")
      .attr("class", (d) -> if d == current_page then "data_grid_page_link current" else "data_grid_page_link")
      .text((d) -> "#{d}")
      .on "click", (d) =>
        @options.page = d
        this.refresh()

    pages.exit().remove()

  # Currently does nothing. 
  # TODO: add sorting to columns
  sort: (data, options) =>
    return if !options.sort
    data

  sort_decending: (column_id) =>
    console.log("sort descending")

  # Given a filter element and the index of the
  # filter, this will return a FilterState
  # representing this filter
  filter_state_for: (filter, index) =>
    type = filter.type
    value = filter.value
    if !value
      null
    else
      new picnet.ui.filter.FilterState(filter.getAttribute('id'), value, index, type)

  # Returns Array of all FilterStates, one for each active filter
  # an filter is considered 'active' if its text is not empty 
  filter_states: () =>
    filter_states = []
    filter_index = 0
    # here, 'this' is the html element and 'filter' is the data associated with
    # the filter
    # TODO: best way to do this?
    @filters.each (filter) ->
      filter_state = DataGrid::filter_state_for(this, filter_index)
      filter_states.push filter_state if filter_state
      filter_index += 1
    filter_states


  # Performs filtering on input data
  # returns new filtered data
  filter: (data, options) =>
    filter_states = this.filter_states()
    # Just put tokens inside corresponding filter_state
    for filter_state in filter_states
      filter_state.tokens = @search.parseSearchTokens(filter_state.value)

    if filter_states and filter_states.length > 0
      data = data.filter (d) =>
        d_values = d3.values(d)
        keep = true
        for filter_state in filter_states
          unless @search.doesTextMatchTokens(d_values[filter_state.idx], filter_state.tokens, false)
            keep = false
            break
        keep
    data

  # Performs pagination on data.
  # Returns data for options.page
  limit:  (data, options) =>
    max_pages = Math.ceil(data.length / options.limit)
    current_page = Math.max(options.page, 0)
    current_page = Math.min(current_page, max_pages)
    limit_start = (current_page - 1) * options.limit
    limit_end = Math.min((current_page) * options.limit, data.length) - 1
    data[limit_start..limit_end]

  # Returns array of header values used in data
  header: (data) =>
    d3.keys(data[0])


  error_no_data: () =>
    d3.select("##{@id}").html("<div class=\"data_grid_error\">ERROR: file cannot be loaded</div>")

  # Sets up initial DataGrid view
  # id is the html id of the element to insert DataGrid into
  # Example: "data_grid"
  # data is the Array of Objects to display
  show: (data) =>
    if !data
      this.error_no_data()
    else
      @original_data = data
      d3.select("##{@id}").html("<div id=\"data_grid_pagination_top\"></div><div id=\"data_grid_data\"></div><div id=\"data_grid_pagination_bottom\"></div>")

      options = @options

      this.create_view("#data_grid_data", data, options)
      this.refresh()

  # Refreshes the display of the data given the current
  # options and filters set
  refresh: () =>
    options = @options
    data = @original_data
    @filtered_data = this.filter(data,options)
    this.sort(@filtered_data,options)
    if options.page_top
      this.create_view_pagination("#data_grid_pagination_top", @filtered_data, options)
    if options.page_bottom
      this.create_view_pagination("#data_grid_pagination_bottom", @filtered_data, options)
    page_data = this.limit(@filtered_data, options)
    this.refresh_view(page_data, options)

  start_refresh_timer: () =>
    if @timer
      clearTimeout(@timer)
    @timer = setTimeout(this.end_refresh_timer, @options.timer_interval)

  end_refresh_timer: () =>
    @timer = null
    this.refresh()

data_grid.DataGrid = DataGrid
