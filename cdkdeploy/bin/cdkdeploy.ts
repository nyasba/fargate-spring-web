#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AlbFargateStack } from '../lib/alb-fargate-stack';
import { config as configDotEnv } from 'dotenv-safe'
import { resolve } from 'path'

const app = new cdk.App();

const envKey = app.node.tryGetContext('env');
if (!envKey) {
    throw new Error('context value \'env\' is not defined.')
}
configDotEnv({
    path: resolve(__dirname, `../env/.env.${envKey}`),
    example: resolve(__dirname, `../env/.env.example`)
})

const stack = new AlbFargateStack(app, `${process.env.PROJECT_NAME}-${envKey}`, {
    projectName: process.env.PROJECT_NAME!,
    profile: envKey,
    stackName: `${process.env.PROJECT_NAME}-${envKey}`,
    ecrRepositoryName: process.env.ECR_REPOSITORY_NAME!,
    vpcId: process.env.VPC_ID!,
    env: { account: process.env.ACCOUNT_ID, region: process.env.REGION },
    logGroupName: `${process.env.PROJECT_NAME}-${envKey}-log-group`,
    taskExecutionRoleName: process.env.TASK_EXECTUION_ROLE!,
    containerRoleName: process.env.TASK_CONTAINER_ROLE!,
    autoscalingRoleName: process.env.AUTOSCALING_ROLE!
});
app.synth();