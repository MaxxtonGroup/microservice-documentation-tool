package com.maxxton.microdocs.crawler.gradle.tasks

import com.maxxton.microdocs.crawler.gradle.VersionUtil
import org.gradle.api.tasks.javadoc.Javadoc

/**
 * @author Steven Hermans
 */
class MicroDocs extends Javadoc{

    @Override
    protected void generate() {
        String version = VersionUtil.getVersion(project);
        if(project.name != null)
            options.addStringOption("projectName", project.name);
        if(version != null)
            options.addStringOption("version", version);
        super.generate()
    }
}
