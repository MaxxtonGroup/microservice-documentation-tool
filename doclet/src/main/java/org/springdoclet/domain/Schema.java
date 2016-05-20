
package org.springdoclet.domain;

/**
 *
 * @author hermans.s
 */
public class Schema {
    
    public static final String OBJECT = "object";
    public static final String ARRAY = "array";
    public static final String ENUM = "enum";
    public static final String STRING = "string";
    public static final String NUMBER = "number";
    public static final String BOOLEAN = "boolean";

    private final String type;
    private String description;
    private final ClassType classType;
    private boolean required;

    public Schema(String type, ClassType classType) {
        this.type = type;
        this.classType = classType;
    }

    public Schema(String type, ClassType classType, boolean required) {
        this.type = type;
        this.required = required;
        this.classType = classType;
    }

    public String getType() {
        return type;
    }

    public boolean isRequired() {
        return required;
    }

    public void setRequired(boolean required) {
        this.required = required;
    }

    public ClassType getClassType() {
        return classType;
    }

    public String getDescription(){
        return description;
    }

    public void setDescription(String description){
        this.description = description;
    }
}
