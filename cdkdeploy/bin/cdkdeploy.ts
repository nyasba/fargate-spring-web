#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AlbFargateStack } from '../lib/alb-fargate-stack';
import devProps from '../env/nyasba-dev.json'

const app = new cdk.App();

const stack = new AlbFargateStack(app, devProps.projectName, devProps);
app.synth();