package com.maxxton.microdocs.publisher;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.ObjectMapper;
import com.mashape.unirest.http.Unirest;
import com.mashape.unirest.http.exceptions.UnirestException;
import com.mashape.unirest.http.utils.URLParamEncoder;
import com.mashape.unirest.request.HttpRequestWithBody;
import com.mashape.unirest.request.body.RequestBodyEntity;
import com.maxxton.microdocs.core.domain.check.CheckResponse;
import com.maxxton.microdocs.crawler.ErrorReporter;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;

/**
 * Publish or check reports to the MicroDocs server
 *
 * @author Steven Hermans
 */
public class MicroDocsPublisher {

    /**
     * Publish report on the MicroDocs server
     * @param microDocsReport
     * @param projectName
     * @param groupName
     * @param version
     * @param configuration
     * @return check response
     * @throws IOException
     */
    public static CheckResponse publishProject(ServerConfiguration configuration, File microDocsReport, String projectName, String groupName, String version, boolean failOnProblems) throws IOException {
        String report = loadReport(microDocsReport);

        String url = configuration.getUrl() + "/api/v1/projects/" + URLParamEncoder.encode(projectName);
        ErrorReporter.get().printNotice("PUT " + url);
        initObjectMapper();
        HttpResponse<CheckResponse> response = null;
        try {
            HttpRequestWithBody request = Unirest.put(configuration.getUrl() + "/api/v1/projects/" + URLParamEncoder.encode(projectName))
                    .queryString("failOnProblems", failOnProblems)
                    .header("content-type", "application/json")
                    .header("accept", "application/json");
            if(groupName != null && !groupName.trim().isEmpty()){
                request = request.queryString("group", groupName);
            }
            if(version != null && !version.trim().isEmpty()){
                request = request.queryString("version", version);
            }

            response = request
                    .body(report)
                    .asObject(CheckResponse.class);
            if (response.getStatus() != 200) {
                throw new IOException("Wrong response status " + response.getStatus() + ", expected 200");
            }
        } catch (UnirestException e) {
            throw new IOException("Failed to send http request: POST " + url, e);
        }
        return response.getBody();
    }

    /**
     * Check report at the MicroDocs server for problems
     *
     * @param microDocsReport
     * @param configuration
     * @return check response
     */
    public static CheckResponse checkProject(ServerConfiguration configuration, File microDocsReport, String projectName) throws IOException {
        String report = loadReport(microDocsReport);

        String url = configuration.getUrl() + "/api/v1/check";
        ErrorReporter.get().printNotice("POST " + url);
        initObjectMapper();
        HttpResponse<CheckResponse> response = null;
        try {
            response = Unirest.post(configuration.getUrl() + "/api/v1/check")
                    .queryString("project", projectName)
                    .header("content-type", "application/json")
                    .header("accept", "application/json")
                    .body(report)
                    .asObject(CheckResponse.class);
            if (response.getStatus() != 200) {
                throw new IOException("Wrong response status " + response.getStatus() + ", expected 200");
            }
        } catch (UnirestException e) {
            throw new IOException("Failed to send http request: POST " + url, e);
        }
        return response.getBody();
    }

    /**
     * Load MicroDocs report as string
     *
     * @param microDocsReport microdocs.json
     * @return content of the report as string
     */
    private static String loadReport(File microDocsReport) throws IOException {
        ErrorReporter.get().printNotice("Load " + microDocsReport.getAbsolutePath());
        byte[] encoded = Files.readAllBytes(Paths.get(microDocsReport.toURI()));
        return new String(encoded);
    }

    private static void initObjectMapper(){
        // Only one time
        Unirest.setObjectMapper(new ObjectMapper() {
            private com.fasterxml.jackson.databind.ObjectMapper jacksonObjectMapper
                    = new com.fasterxml.jackson.databind.ObjectMapper();

            public <T> T readValue(String value, Class<T> valueType) {
                try {
                    return jacksonObjectMapper.readValue(value, valueType);
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
            }

            public String writeValue(Object value) {
                try {
                    return jacksonObjectMapper.writeValueAsString(value);
                } catch (JsonProcessingException e) {
                    throw new RuntimeException(e);
                }
            }
        });
    }

}
