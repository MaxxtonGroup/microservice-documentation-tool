"use strict";
function getProblemsInProject(project) {
    var problems = [];
    //crawl project
    if (project.problems != undefined && project.problems != null) {
        project.problems.forEach(function (problem) { return problems.push(problem); });
    }
    //crawl endpoint
    if (project.paths != undefined && project.paths != undefined) {
        getProblemsInPaths(project.paths).forEach(function (problem) { return problems.push(problem); });
    }
    //crawl dependencies
    if (project.dependencies != undefined && project.dependencies != undefined) {
        for (var title in project.dependencies) {
            var dependency = project.dependencies[title];
            getProblemsInDependency(dependency).forEach(function (problem) { return problems.push(problem); });
        }
    }
    //crawl components
    if (project.components != undefined && project.components != undefined) {
        for (var name in project.components) {
            var component = project.components[name];
            if (component.problems != undefined && component.problems != null) {
                component.problems.forEach(function (problem) { return problems.push(problem); });
            }
        }
    }
    return problems;
}
exports.getProblemsInProject = getProblemsInProject;
function getProblemsInDependency(dependency) {
    var problems = [];
    if (dependency.problems != undefined && dependency.problems != null) {
        dependency.problems.forEach(function (problem) { return problems.push(problem); });
    }
    if (dependency.paths != undefined && dependency.paths != undefined) {
        getProblemsInPaths(dependency.paths).forEach(function (problem) { return problems.push(problem); });
    }
    return problems;
}
exports.getProblemsInDependency = getProblemsInDependency;
function getProblemsInPaths(paths) {
    var problems = [];
    for (var path in paths) {
        for (var method in paths[path]) {
            var endpoint = paths[path][method];
            if (endpoint.problems != undefined && endpoint.problems != null) {
                endpoint.problems.forEach(function (problem) { return problems.push(problem); });
            }
        }
    }
    return problems;
}
exports.getProblemsInPaths = getProblemsInPaths;