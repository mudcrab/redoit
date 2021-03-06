var db = require('../db.js');
var appRoot = require('app-root-path');
var helper = require('./helpers.js');
var Promise_ = require('bluebird');
var Moment = require('moment-timezone');

var Build = function(project) {
	var self = this;
	this.id = 0;
	this.task_id = null;

	this.project = project;
	this.task = null;
	this.build = null;
	this.project_id = project.get('id');

	return new Promise_(function(resolve) {
		db.models.Task.forge({
			project_id: self.project_id,
			active: true
		})
		.fetch()
		.then(function(task) {
			if(task)
			{
				self.task_id = task.get('id');
				self.task = task;

				db.models.Build.forge({
					task_id: task.get('id'),
					project_id: 1
				})
				.query(function(qb) {
					qb.orderBy('build_nr', 'DESC')
					.limit(1);
				})
				.fetch()
				.then(function(build) {
					if(build)
					{
						self.build = build;
						self.id = parseInt(build.get('build_nr')) + 1;
					}
					resolve(self);
				});
			}
			else
				resolve(null);
		});
	});
};

Build.prototype.start = function()
{
	var self = this;

	return new Promise_(function(resolve) {
		db.models.Build.forge({
			task_id: self.task_id,
			project_id: self.project_id,
			build_nr: self.id,
			start_time: Moment.tz("Europe/Tallinn").format("YYYY-MM-DD HH:MM:ss")
		})
		.save()
		.then(function(build) {
			var builder = helper.getBuilder();
			
			if(typeof builder === 'undefined')
				resolve({ status: false });
			else
			{
				builder.build(self.project, self.task, build)
				.then(function(status) {
					resolve({
						status: status,
						id: self.build.get('id')
					});
				});
			}
		});
	});
};

module.exports = Build;