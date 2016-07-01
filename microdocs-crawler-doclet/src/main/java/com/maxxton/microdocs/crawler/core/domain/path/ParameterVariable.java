package com.maxxton.microdocs.crawler.core.domain.path;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.maxxton.microdocs.crawler.core.domain.schema.SchemaArray;

/**
 * @author Steven Hermans
 */
public class ParameterVariable extends SchemaArray implements Parameter {

    private String name;
    private ParameterPlacing in;
    @JsonInclude(JsonInclude.Include.NON_DEFAULT)
    private boolean allowEmptyValue = false;

    @Override
    public String getName() {
        return name;
    }

    @Override
    public void setName(String name) {
        this.name = name;
    }

    @Override
    public ParameterPlacing getIn() {
        return in;
    }

    @Override
    public void setIn(ParameterPlacing in) {
        this.in = in;
    }

    public boolean isAllowEmptyValue() {
        return allowEmptyValue;
    }

    public void setAllowEmptyValue(boolean allowEmptyValue) {
        this.allowEmptyValue = allowEmptyValue;
    }
}
