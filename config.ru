require 'rubygems'
require 'open-uri'
require 'sinatra'

mime_type :coffee, "text/coffeescript"

set :public, File.dirname(__FILE__) + '/'

get '/' do
  open(File.dirname(__FILE__) + '/demo/demo.html').read
end

run Sinatra::Application
