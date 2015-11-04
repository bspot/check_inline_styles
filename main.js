"use strict";

var Promise = require("bluebird");
var request = Promise.promisifyAll(require("request"));
var fs = Promise.promisifyAll(require('fs'));
var path = require('path');
var domtosource = require('domtosource');
var handlebars = require('handlebars');
var escape_html = require('escape-html');

var tools = require('./tools');


/******************************************************************************
 * File paths
 *****************************************************************************/
var url_fn = path.join(__dirname, 'urls.txt');
var data_dir = path.join(__dirname, 'data');
var report_fn = path.join(__dirname, 'report.html');


/******************************************************************************
 * Load URLS from url.txt
 *****************************************************************************/
var load_urls = function(fn) {
  return Promise.resolve(fn)
    .then(function(fn) { return fs.readFileAsync(fn, {encoding: 'utf-8'}); })
    .then(function(content) { return content.split("\n"); })
    .filter(function(url) {return url;})
    .map(function(url) {return {url: url, datafn: path.join(data_dir, url.replace(/\//g, "-"))};})
};


/******************************************************************************
 * Load page data
 *****************************************************************************/
var load_data = function(page) {
  return Promise.resolve(page)
    .then(function(page) {
      return fs.readFileAsync(page.datafn, {encoding: 'utf-8'});
    })
    .then(function(source) {
      page.source = source;
      return page;
    })
    .catch(function() {
      return page;
    })
};


/******************************************************************************
 * Fetch URLS to data dir.
 *****************************************************************************/
var fetch = function(pages) {

  var progress = tools.Progress("Fetching", pages.length);

  return Promise.resolve(pages)
    .map(function(page) {
      var done = progress();
      return Promise.resolve(page.url)
        .then(request.getAsync)
        .then(function(response) {
          return fs.writeFileAsync(page.datafn, response.body, {encoding: 'utf-8'});
        })
        .tap(function() {
          done();
        });
    }, {concurrency: 20})

    .tap(function() {console.log("");})
    .then(function() {return pages;});
};


/******************************************************************************
 * Find inline styles
 *****************************************************************************/
var find_inline_styles = function(page) {
  page.inline_style_elements = domtosource.find(page.source, '[style]');
  return page;
};


/******************************************************************************
 * Report
 *****************************************************************************/
var report_page = function(page) {

  var data = {
    page: page
  };

  data.occurences = page.inline_style_elements.map(function(o) {
    var source_lines = page.source.split("\n");

    var start = Math.max(0, o.line - 10);
    var end = start + 20;

    var source_frag = source_lines.slice(start, end).join("\n");

    return {
      line: o.line,
      column: o.column,
      fragment: escape_html(source_frag)
        .replace(/style=&quot.*?&quot/, '<span style="color: red;">$&</span>')
        .replace(/style=&#39;.*?&39;/, '<span style="color: red;">$&</span>')
    }
  });

  return data;
};

var report = function(pages) {

  var data = {
    pages: pages.map(report_page)
  };

  var template = handlebars.compile(fs.readFileSync('./report.handlebars', {encoding: 'utf-8'}));


  return template(data);
};


/******************************************************************************
 * Main
 *****************************************************************************/
load_urls(url_fn)
  .then(function(pages) {
    if (process.argv[2] == 'fetch') {
      return fetch(pages);
    }
    return pages;
  })
  .map(load_data)
  .filter(function(page) {return page.source;})
  .map(find_inline_styles, {concurrency: 1})
  .filter(function(page) {return page.inline_style_elements.length})
  .then(report)
  .then(function(r) { fs.writeFileSync(report_fn, r); });
