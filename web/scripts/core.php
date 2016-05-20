<?php
/**
 * Core functions for all scripts
 * @author Steven Hermans
 */

// declare global variables
$_SETTINGS = getSettings();


/**
 * Load settings.json
 * @return settings
 * @throws Exception
 */
function getSettings()
{
    $settingsFile = "settings.json";
    $json = file_get_contents($settingsFile);
    if ($json === false) {
        throw new Exception("Could not find settings.json");
    }
    $settings = json_decode($json, true);
    if ($settings == NULL) {
        throw new Exception("Could not decode settings.json");
    }
    return $settings;
}

/**
 * Find all projectGroups in the project folder
 * @return array list of project groups
 * @throws Exception
 */
function getProjectGroups()
{
    global $_SETTINGS;
    $rootFolder = "../" . $_SETTINGS['links']['folder'];
    if (is_dir($rootFolder)) {
        $folders = scandir($rootFolder);
        $projectGroups = array();
        foreach ($folders as $folder) {
            if ($folder != "." && $folder != ".." && is_dir($rootFolder . "/" . $folder)) {
                array_push($projectGroups, $folder);
            }
        }
        return $projectGroups;
    } else {
        throw new Exception("Could not find project folder: " + $rootFolder);
    }
}

/**
 * Find all projects for a project group
 * @return array list of projects
 * @throws Exception
 */
function getProjects($projectGroup)
{
    global $_SETTINGS;
    if (!isset($projectGroup) || empty($projectGroup)) {
        throw new Exception("Project group is missing");
    }

    $rootFolder = "../" . $_SETTINGS['links']['folder'];
    $projectGroupFolder = "$rootFolder/$projectGroup";
    if (is_dir($projectGroupFolder)) {
        $folders = scandir($projectGroupFolder);
        $projects = array();
        foreach ($folders as $folder) {
            if ($folder != "." && $folder != ".." && is_dir($projectGroupFolder . "/" . $folder)) {
                array_push($projects, array("name" => $folder, "group" => $projectGroup));
            }
        }
        return $projects;
    } else {
        throw new Exception("Could not find project folder: " + $rootFolder);
    }
}

/**
 * Find project by name
 * @param $projectName
 * @return project|null
 */
function getProjectByName($projectName)
{
    $projects = getAllProjects();
    foreach ($projects as $project) {
        if ($project['name'] == $projectName) {
            return $project;
        }
    }
    return null;
}

/**
 * Find all projects
 * @return array list of projects
 * @throws Exception
 */
function getAllProjects()
{
    $projects = array();
    $projectGroups = getProjectGroups();
    foreach ($projectGroups as $projectGroup) {
        $projects = array_merge($projects, getProjects($projectGroup));
    }
    return $projects;
}

/**
 * Find all versions for a project
 * @param $project
 * @return array list of versions
 * @throws Exception
 */
function getVersions($project)
{
    global $_SETTINGS;
    if (!isset($project) || empty($project) || !isset($project['group']) || empty($project['group']) || !isset($project['name']) || empty($project['name'])) {
        throw new Exception("Project is missing");
    }

    $rootFolder = "../" . $_SETTINGS['links']['folder'];
    $project = $rootFolder . "/" . $project['group'] . "/" . $project['name'];
    if (is_dir($project)) {
        $folders = scandir($project);
        $versions = array();
        foreach ($folders as $folder) {
            if ($folder != "." && $folder != ".." && is_dir($project . "/" . $folder)) {
                array_push($versions, $folder);
            }
        }
        return $versions;
    } else {
        throw new Exception("Could not find project folder: " + $rootFolder);
    }
}

/**
 * Find latest version of a project
 * @param $project
 * @return latest version
 */
function getLatestVersion($project)
{
    $versions = getVersions($project);
    sort($versions);
    return $versions[count($versions) - 1];
}

/**
 * Load project data from the project.json
 * @param $project
 * @param $version
 * @return mixed|null
 * @throws Exception
 */
function getProjectData($project, $version = null)
{
    global $_SETTINGS;
    if (!isset($project) || empty($project) || !isset($project['group']) || empty($project['group']) || !isset($project['name']) || empty($project['name'])) {
        throw new Exception("Project is missing");
    }
    if (!isset($version) || empty($version) || $version == null) {
        $version = getLatestVersion($project);
    }

    $rootFolder = "../" . $_SETTINGS['links']['folder'];
    $projectFolder = $rootFolder . "/" . $project['group'] . "/" . $project['name'] . "/" . $version;
    $projectFile = $projectFolder . "/project.json";
    $json = array();
    if (is_file($projectFile)) {
        // load and decode project.json
        $string = file_get_contents($projectFile);
        if ($string === false) {
            throw new Exception("Could not read file: " + $projectFile);
        }
        $json = json_decode($string, true);
        if ($json == null) {
            throw new Exception("Could not decode file: " + $projectFile);
        }
    }

    // find links
    $links = array();
    $folders = scandir($projectFolder);
    foreach ($folders as $folder) {
        if ($folder != "." && $folder != ".." && is_dir($projectFolder . "/" . $folder)) {
            array_push($links, array("rel" => basename($folder), "href" => substr($projectFolder, 2) . "/" . $folder));
        }
    }

    // merge links with existing links
    if (!empty($links)) {
        if (isset($json['links'])) {
            $existingLinks = $json['links'];
            $links = array_merge($links, $existingLinks);
        }
        $json['links'] = $links;
    }

    // add info
    $json['name'] = $project['name'];
    $json['group'] = $project['group'];
    $json['version'] = $version;
    $json['versions'] = getVersions($project);

    return $json;
}

/**
 * Check clientProject against the producerEndpoint
 * @param $clientProject
 * @param $projects
 * @throws Exception
 */
function checkProject(&$clientProject, $projects)
{
    // find clients in project
    $errorCount = 0;
    if (isset($clientProject['clients']) && !empty($clientProject['clients'])) {
        $clients = &$clientProject['clients'];
        foreach ($clients as &$client) {
            $clientName = $client['name'];
            $clientEndpoints = &$client['endpoints'];
            $producerEndpoints = null;
            // find producer endpoints of this client
            foreach ($projects as $producerProject) {
                if ($producerProject['name'] == $clientName) {
                    $producerEndpoints = $producerProject['endpoints'];
                    break;
                }
            }
            if ($producerEndpoints != null) {
                // check compatible
                $client['latestVersion'] = $producerProject['version'];
                foreach ($clientEndpoints as &$clientEndpoint) {
                    $endpointErrors = checkEndpoint($clientEndpoint, $producerEndpoints);
                    if (!empty($endpointErrors)) {
                        $errorCount += count($endpointErrors);
                        $clientEndpoint['errors'] = $endpointErrors;
                    }
                }
                if($errorCount == 0){
                    $client['version'] = $producerProject['version'];
                }else{
                    // find latest compatible version
                    $availableVersions = $producerProject['versions'];
                    echo "client $clientName has errors, find older version: ";
                    print_r($availableVersions);
                    for($i = count($availableVersions) -1; $i >= 0 ; $i--){
                        $availableVersion = $availableVersions[$i];
                        $producerData = getProjectData($producerProject, $availableVersion);
                        $compatible = true;
                        foreach ($clientEndpoints as $clientEndpoint) {
                            $endpointErrors = checkEndpoint($clientEndpoint, $producerData['endpoints']);
                            if (!empty($endpointErrors)) {
                                $compatible = false;
                            }
                        }
                        if($compatible){
                            echo "version: " . $availableVersion . " is compatible!\n";
                            $client['version'] = $availableVersion;
                            break;
                        }else{
                            echo "version: " . $availableVersion . " is not compatible\n";
                        }
                    }
                    if(!isset($client['version'])){
                        $client['version'] = null;
                    }
                }
            } else {
                $errorCount++;
                $client['errors'] = array("Missing project: $clientName");
            }
        }
    }
    $clientProject['errors'] = $errorCount;
}

/**
 * Check client endpoints against the producer endpoints
 * @param $clientEndpoint
 * @param $producerEndpoints
 * @return array list of errors
 */
function checkEndpoint($clientEndpoint, $producerEndpoints)
{
    global $_SETTINGS;
    $errors = array();
    foreach ($producerEndpoints as $producerEndpoint) {
        //compare mapping
        if ($producerEndpoint['path'] == $clientEndpoint['path'] &&
            strtolower($producerEndpoint['method']) == strtolower($clientEndpoint['method'])
        ) {

            // check RequestParams
            if ($_SETTINGS['check']['requestParam'] == true) {
                $producerParams = isset($producerEndpoint['requestParam']) ? $producerEndpoint['requestParam'] : array();
                $clientParams = isset($clientEndpoint['requestParam']) ? $clientEndpoint['requestParam'] : array();
                foreach ($producerParams as $producerParam) {
                    $exists = false;
                    foreach ($clientParams as $clientParam) {
                        if ($clientParam['name'] == $producerParam['name']) {
                            // check type
                            if ($clientParam['type'] != $producerParam['type']) {
                                $errors[] = "Incompatible type for request param " . $clientParam['name'] . ": " . $clientParam['type'] . " and " . $producerParam['type'];
                            }
                        }
                    }
                    // Log if it was required and missing
                    if ($exists == false && isset($producerParam['required']) && $producerParam['required'] == false) {
                        $errors[] = "Missing request param " . $producerParam['name'];
                    }
                }
            }

            // check RequestBody
            if ($_SETTINGS['check']['requestBody'] == true) {
                if (isset($producerEndpoint['requestBody']) && !empty($producerEndpoint['requestBody'])) {
                    if (isset($clientEndpoint['requestBody']) && !empty($clientEndpoint['requestBody'])) {
                        if ($producerEndpoint['requestBody'] != $clientEndpoint['requestBody']) {
                            $errors[] = "Incompatible type for the request body";
                        }
                    } else {
                        $errors[] = "Missing RequestBody";
                    }
                }
            }

            // check ResponseBody
            if ($_SETTINGS['check']['responseBody'] == true) {
                if (isset($producerEndpoint['responseBody']) && !empty($producerEndpoint['responseBody'])) {
                    if (isset($clientEndpoint['responseBody']) && !empty($clientEndpoint['responseBody'])) {
                        if ($producerEndpoint['responseBody'] != $clientEndpoint['responseBody']) {
                            $errors[] = "Incompatible type for the response body";
                        }
                    }
                }
            }

            return $errors;
        }
    }
    if ($_SETTINGS['check']['mapping'] == true)
        $errors[] = "No mapping for " . strtoupper($clientEndpoint['method']) . " " . $clientEndpoint['path'];
    return $errors;
}

function checkModels($modelA, $modelB){

}

function traceClients(&$project, &$projectList){
    if (isset($project['clients']) && !empty($project['clients'])) {
        foreach($project['clients'] as &$client){
            if(isset($client['version']) && !empty($client['version'])){
                $exists = false;
                foreach($projectList as $loadedProject){
                    if($client['name'] == $loadedProject['name'] && $client['version'] == $loadedProject['version']){
                        $exists = true;
                    }
                }
                if($exists == false){
                    echo "don't loaded yet: " . $client['name'] . ":" . $client['version'] . "\n";
                    $clientProjectInfo = getProjectByName($client['name']);
                    try {
                        $clientProject = getProjectData($clientProjectInfo, $client['version']);
                        checkProject($clientProject, $projectList);
                        array_push($projectList, $clientProject);
                        echo "load: " . $clientProject['name'] . ":" . $clientProject['version'] . "\n";
                    }catch(Exception $e){
                        if(isset($client['errors'])){
                            array_push($client['errors'], $e->getMessage());
                        }else{
                            $client['errors'] = array($e->getMessage());
                        }
                    }
                }
            }
        }
    }
}

/**
 * Get aggregated projects from: ../{links.folder}/projects.json
 * @param bool $asJson
 * @return mixed content of projects.json as json
 * @throws Exception
 */
function getAggregatedProjects($asJson = true){
    global $_SETTINGS;
    $projectsFile = "../" . $_SETTINGS['links']['folder'] . "/projects.json";

    if(!file_exists($projectsFile)){
        http_response_code(404);
        exit("Run reindex.php first");
    }

    $string = file_get_contents($projectsFile);
    if ($string === false) {
        throw new Exception("Could not read file: " + $projectsFile);
    }
    if($asJson) {
        $json = json_decode($string, true);
        if ($json == null) {
            throw new Exception("Could not decode file: " + $projectsFile);
        }
        return $json;
    }else{
        return $string;
    }
}

/**
 * Get aggregated project from ../{links.folder}/{group}/{projectMame}/{version}/_project.json
 * @param $project project object
 * @param $version version to load
 * @param bool $asJson
 * @return mixed content of _project.json as json
 * @throws Exception
 */
function getAggregatedProject($project, $version, $asJson = true){
    global $_SETTINGS;
    $projectFile = "../" . $_SETTINGS['links']['folder'] . "/" . $project['group'] . "/" . $project['name'] . "/" . $version . "/_project.json";

    $string = file_get_contents($projectFile);
    if ($string === false) {
        throw new Exception("Could not read file: " + $projectFile);
    }
    if($asJson) {
        $json = json_decode($string, true);
        if ($json == null) {
            throw new Exception("Could not decode file: " + $projectFile);
        }
        return $json;
    }else{
        return $string;
    }
}

/**
 * Render model schema according to http://json-schema.org/draft-04/schema
 * @param $schema json-schema
 * @param $spaces spacing in front of the schema
 * @return string
 */
function renderSchema($schema, $spaces){
    $spacing = "";
    for($i = 0; $i < $spaces; $i++){
        $spacing .= " ";
    }
    $schema['$schema'] = "http://json-schema.org/draft-04/schema#";
    $json = json_encode($schema, JSON_PRETTY_PRINT + JSON_UNESCAPED_SLASHES);
    return $spacing . str_replace(array("\r\n", "\n"), PHP_EOL . $spacing, $json);
}

/**
 * Render preview of a schema with fake data
 * @param $schema json-schema
 * @param $spaces spacing in front of the schema
 * @return string
 */
function renderModel($schema, $spaces){
    $spacing = "";
    for($i = 0; $i < $spaces; $i++){
        $spacing .= " ";
    }
    $json = json_encode(getModel($schema), JSON_PRETTY_PRINT + JSON_UNESCAPED_SLASHES);
    return $spacing .  str_replace(array("\r\n", "\n"), PHP_EOL . $spacing, $json);
}

/**
 * Get model described in the json-schema
 * @param $schema json-schema
 * @return array|bool|int|null|string
 */
function getModel($schema, $name = null){
    if($schema['type'] == "array"){
        $node = array();
        array_push($node, getModel($schema['items'], $name));
        return $node;
    }else if($schema['type'] == "object"){
        $properties = $schema['properties'];
        $node = array();
        foreach ($properties as $key => $value){
            $node[$key] = getModel($value, $key);
        }
        return $node;
    }else if($schema['type'] == "string"){
        return "string";
    }else if($schema['type'] == "number"){
        return rand(1,99);
    }else if($schema['type'] == "boolean"){
        return (bool)rand(0, 1);
    }
    return null;
}