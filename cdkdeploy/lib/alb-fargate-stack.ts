import * as cdk from '@aws-cdk/core';
import ec2 = require("@aws-cdk/aws-ec2");
import ecs = require("@aws-cdk/aws-ecs");
import ecr = require("@aws-cdk/aws-ecr");
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import applicationautoscaling = require('@aws-cdk/aws-applicationautoscaling')
import iam = require('@aws-cdk/aws-iam')
import logs = require("@aws-cdk/aws-logs");
import { Duration, Tag } from '@aws-cdk/core';
import { StackPropsBase, StackExportsBase } from './stack-base';
import { SubnetSelection } from '@aws-cdk/aws-ec2';

interface AlbFargateStackProps extends StackPropsBase {
  ecrRepositoryName: string,
  vpcId: string,
  albSubnetSelection?: SubnetSelection,
  ecsSubnetSelection?: SubnetSelection,
  logGroupName: string,
  taskExecutionRoleName: string,
  containerRoleName: string,
  autoscalingRoleName: string
}

interface AlbFargateStackExports extends StackExportsBase {
  endpointUrl: string
}

export class AlbFargateStack extends cdk.Stack {

  readonly props: AlbFargateStackProps
  readonly exports: AlbFargateStackExports

  constructor(scope: cdk.Construct, id: string, props: AlbFargateStackProps) {
    super(scope, id, props)
    this.props = props

    // vpc  (既存リソースを参照する)
    const appVpc = ec2.Vpc.fromLookup(this, 'VPC', {
      vpcId: this.props.vpcId
    })

    // role　(既存リソースを参照する)
    const appTaskExecutionRole = iam.Role.fromRoleArn(this, 'task-exec-role',
      `arn:aws:iam::${this.account}:role/${this.props.taskExecutionRoleName}`)
    const appContainerRole = iam.Role.fromRoleArn(this, 'task-role',
      `arn:aws:iam::${this.account}:role/${this.props.containerRoleName}`)
    const appAutoscalingRole = iam.Role.fromRoleArn(this, 'autoscaling-role',
      `arn:aws:iam::${this.account}:role/${this.props.autoscalingRoleName}`)

    // tagの設定 全般に適用される
    Tag.add(this, 'project', this.props.projectName)

    // sg for alb
    const albSecurityGroup = new ec2.SecurityGroup(this, this.createResourceName('alb-sg'), {
      securityGroupName: this.createResourceName('alb-sg'),
      vpc: appVpc
    })
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80))
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(8080))
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443))

    // sg for ecs serivce
    const ecsSecurityGroup = new ec2.SecurityGroup(this, this.createResourceName('ecs-sg'), {
      securityGroupName: this.createResourceName('ecs-sg'),
      vpc: appVpc
    })
    ecsSecurityGroup.addIngressRule(albSecurityGroup, ec2.Port.tcp(80))

    // alb target group
    const albTargetGroupBlue = new elbv2.ApplicationTargetGroup(this, this.createResourceName('tg-bule'), {
      vpc: appVpc,
      targetGroupName: this.createResourceName('tg-bule'),
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: 80,
      healthCheck: { path: "/healthcheck" }
    })
    const albTargetGroupGreen = new elbv2.ApplicationTargetGroup(this, this.createResourceName('tg-green'), {
      vpc: appVpc,
      targetGroupName: this.createResourceName('tg-green'),
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: 80,
      healthCheck: { path: "/healthcheck" }
    })

    // alb
    const appAlb = new elbv2.ApplicationLoadBalancer(this, this.createResourceName('alb'), {
      vpc: appVpc,
      vpcSubnets: appVpc.selectSubnets(this.props.albSubnetSelection || { subnetType: ec2.SubnetType.PUBLIC }),
      loadBalancerName: this.createResourceName('alb'),
      internetFacing: true,
      securityGroup: albSecurityGroup
    })
    appAlb.addListener(this.createResourceName('alb-listener-blue'), {
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: 80,
      defaultTargetGroups: [albTargetGroupBlue]
    })
    appAlb.addListener(this.createResourceName('alb-listener-green'), {
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: 8080,
      defaultTargetGroups: [albTargetGroupGreen]
    })

    // ecs cluster
    const appCluster = new ecs.Cluster(this, this.createResourceName('cluster'), {
      vpc: appVpc,
      clusterName: this.createResourceName('cluster')
    })

    // log group for ecs
    const appLogGroup = logs.LogGroup.fromLogGroupName(this,
      this.createResourceName('log-group'), this.props.logGroupName)

    // ecr repository (import)
    const appEcrRepository = ecr.Repository.fromRepositoryName(this,
      this.createResourceName('repository'), this.props.ecrRepositoryName)

    // task definition
    const appTaskDefinition = new ecs.TaskDefinition(this, this.createResourceName('task'), {
      family: this.createResourceName('task'),
      executionRole: appTaskExecutionRole,
      taskRole: appContainerRole,
      networkMode: ecs.NetworkMode.AWS_VPC,
      compatibility: ecs.Compatibility.FARGATE,
      cpu: '512',
      memoryMiB: '1024'
    })

    // container definition
    const appContainerDefinition = new ecs.ContainerDefinition(this, this.createResourceName('container'), {
      image: ecs.ContainerImage.fromEcrRepository(appEcrRepository, 'latest'),
      environment: { "Key": "Test" },
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: this.createResourceName(''),
        logGroup: appLogGroup
      }),
      taskDefinition: appTaskDefinition
    })
    appContainerDefinition.addPortMappings({
      containerPort: 80,
      hostPort: 80,
      protocol: ecs.Protocol.TCP
    })

    // service
    const appService = new ecs.FargateService(this, this.createResourceName('service'), {
      cluster: appCluster,
      assignPublicIp: false,
      desiredCount: 1,
      serviceName: this.createResourceName('service'),
      taskDefinition: appTaskDefinition,
      vpcSubnets: appVpc.selectSubnets(this.props.ecsSubnetSelection || { subnetType: ec2.SubnetType.PRIVATE }),
      securityGroup: ecsSecurityGroup,
      healthCheckGracePeriod: Duration.minutes(2),
      deploymentController: { type: ecs.DeploymentControllerType.CODE_DEPLOY }
    })
    albTargetGroupBlue.addTarget(appService.loadBalancerTarget({
      containerName: appContainerDefinition.containerName,
      containerPort: appContainerDefinition.containerPort
    }))

    // auto scaling
    const appAutoScaling = new applicationautoscaling.ScalableTarget(this, this.createResourceName('scalabletarget'), {
      minCapacity: 1,
      maxCapacity: 2,
      resourceId: `service/${appCluster.clusterName}/${appService.serviceName}`,
      role: appAutoscalingRole,
      scalableDimension: "ecs:service:DesiredCount",
      serviceNamespace: applicationautoscaling.ServiceNamespace.ECS
    })

    new applicationautoscaling.TargetTrackingScalingPolicy(this, this.createResourceName('policy'), {
      policyName: this.createResourceName('policy'),
      scalingTarget: appAutoScaling,
      targetValue: 80,
      predefinedMetric: applicationautoscaling.PredefinedMetric.ECS_SERVICE_AVERAGE_CPU_UTILIZATION,
      disableScaleIn: false,
      scaleInCooldown: Duration.minutes(5),
      scaleOutCooldown: Duration.minutes(5),
    })

    // output設定
    new cdk.CfnOutput(this, 'output', { exportName: 'endpointUrl', value: `http://${appAlb.loadBalancerDnsName}/` })
  }

  private createResourceName(suffix: string): string {
    return `${this.props.projectName}-${this.props.profile}-${suffix}`
  }
}

