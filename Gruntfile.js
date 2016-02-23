/**
 * Created by gmena on 01-05-16.
 */
var path = require ('path');

module.exports = function (grunt) {

	// Load the plugin that provides the "uglify" task.
	grunt.loadNpmTasks ('grunt-webpack');


	// Project configuration.
	grunt.initConfig ({
		webpack       : {
			syrup: {
				entry : './system/include/init.js',
				output: {
					path      : path.join (__dirname, './dist'),
					filename  : 'init.js', // or [name]
					publicPath: '/'
				},
				stats : {
					// Configure the console output
					colors : true,
					modules: true,
					reasons: true
				},
				// stats: false disables the stats output
				watch : true, // use webpacks watcher
				// You need to keep the grunt process alive

				keepalive  : true, // don't finish the grunt task
				// Use this in combination with the watch option
				inline     : true,  // embed the webpack-dev-server runtime into the bundle
				// Defaults to false
				failOnError: false, // don't report error to grunt if webpack find errors
				// Use this if webpack errors are tolerable and grunt should continue
				module     : {
					loaders: [
						{
							test   : /\.js?$/,
							exclude: /node_modules/,
							loader : 'babel-loader',
							query  : {
								presets: [
									'es2015'
								]
							}
						}
					]
				},
				resolve    : {
					modulesDirectories: [
						'node_modules'
					]
				}
			}
		}
	});

	// Default task(s).
	grunt.registerTask ('default', ['webpack']);

};