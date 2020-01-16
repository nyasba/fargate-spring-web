import { StackProps } from "@aws-cdk/core";

export interface StackPropsBase extends StackProps{
    profile: string,
    projectName: string,
}

export interface StackExportsBase {
}
