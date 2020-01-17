# Fargate deploy CDK

## プロジェクト構成

```
├── README.md
├── bin                     コマンド実行時のエンドポイントとなるtsファイル
├── cdk.context.json        cdkのcontextで参照したデータの保存ファイル（VPC内のネットワーク構成など次回のStack作成時に変更すべきでないリソースの情報を保存する）
├── cdk.json                cdk実行時のapp引数のデフォルト設定ファイル
├── cdk.out                 cdkの出力ファイル
├── jest.config.js          テスト用の設定ファイル
├── lib                     cdkのコード
├── node_modules
├── package.json
├── test
├── tsconfig.json
└── yarn.lock               yarnのlockファイル
```

※cdk.context.jsonはデプロイした環境が保存されるので本来はGit管理下においておくべきものです
https://docs.aws.amazon.com/cdk/latest/guide/context.html

## 開発時のコマンド

```
# ライブラリダウンロード
yarn install

# ライブラリ追加
yarn add xxx
```

## デプロイ

### 事前準備

* プロファイルおよびインプットパラメータの設定を行っておくこと
* VPCにはPublic/Privateサブネットを用意しておくこと
* LogGroupを作成しておくこと
* 設定ファイルに指定したIAMロールを事前に作っておくこと
* 設定ファイルに指定したECRリポジトリを事前に作り、アプリケーションをpushしておくこと

### 設定（プロファイル）

https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/cli-configure-profiles.html

### 設定

`env/xxx.json`で管理し、cdkdeploy.tsで直接importする


### テスト

3種類のテストがあるが、いずれもあまりテストを書くほどの効果が見込めないのでテストは書かない

* snapshotテスト：cdkのバージョンアップに伴うテンプレートの出力内容の差分チェックができるのはよいが、そこまではしないとして不採用
* full-grainedテスト：固定値を設定するところばかりのため、ユニットテストが有効な部分が見当たらず不採用
* validationテスト：カスタムでバリデーション実装していないとあまり意味がないと思い不採用

### コンテキストのクリア

複数環境を管理するならクリアしないといけないと思われる（まだ試していないが）

```
cdk context --clear
```

### cloudformationのテンプレート出力

```
cdk synth --profile xxx
```

### 実施

```
# tsファイルのコンパイル（できてないと違うものがデプロイされるので要注意）
yarn build

# 実行
cdk deploy --profile xxx
This deployment will make potentially sensitive changes according to your current security approval level (--require-approval broadening).
Please confirm you intend to make the following modifications:

IAM Statement Changes
┌───┬────────────────────────────────────────────────────────────────────────┬────────┬─────────────────────────────────────────────────────────────────────────┬──────────────────────────┬───────────┐
│   │ Resource                                                               │ Effect │ Action                                                                  │ Principal                │ Condition │
├───┼────────────────────────────────────────────────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────┼──────────────────────────┼───────────┤
│ + │ *                                                                      │ Allow  │ ecr:GetAuthorizationToken                                               │ AWS:ecsTaskExecutionRole │           │
├───┼────────────────────────────────────────────────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────┼──────────────────────────┼───────────┤
│ + │ arn:${AWS::Partition}:ecr:ap-northeast-1:xxxxxxxxxxxx:repository/webap │ Allow  │ ecr:BatchCheckLayerAvailability                                         │ AWS:ecsTaskExecutionRole │           │
│   │ p                                                                      │        │ ecr:BatchGetImage                                                       │                          │           │
│   │                                                                        │        │ ecr:GetDownloadUrlForLayer                                              │                          │           │
├───┼────────────────────────────────────────────────────────────────────────┼────────┼─────────────────────────────────────────────────────────────────────────┼──────────────────────────┼───────────┤
│ + │ arn:${AWS::Partition}:logs:ap-northeast-1:xxxxxxxxxxxx:log-group:farga │ Allow  │ logs:CreateLogStream                                                    │ AWS:ecsTaskExecutionRole │           │
│   │ te-webapp-dev-log-group                                                │        │ logs:PutLogEvents                                                       │                          │           │
└───┴────────────────────────────────────────────────────────────────────────┴────────┴─────────────────────────────────────────────────────────────────────────┴──────────────────────────┴───────────┘
Security Group Changes
┌───┬──────────────────────────────────────┬─────┬────────────┬──────────────────────────────────────┐
│   │ Group                                │ Dir │ Protocol   │ Peer                                 │
├───┼──────────────────────────────────────┼─────┼────────────┼──────────────────────────────────────┤
│ + │ ${fargate-webapp-dev-alb-sg.GroupId} │ In  │ TCP 80     │ Everyone (IPv4)                      │
│ + │ ${fargate-webapp-dev-alb-sg.GroupId} │ In  │ TCP 443    │ Everyone (IPv4)                      │
│ + │ ${fargate-webapp-dev-alb-sg.GroupId} │ Out │ Everything │ Everyone (IPv4)                      │
├───┼──────────────────────────────────────┼─────┼────────────┼──────────────────────────────────────┤
│ + │ ${fargate-webapp-dev-ecs-sg.GroupId} │ In  │ TCP 80     │ ${fargate-webapp-dev-alb-sg.GroupId} │
│ + │ ${fargate-webapp-dev-ecs-sg.GroupId} │ Out │ Everything │ Everyone (IPv4)                      │
└───┴──────────────────────────────────────┴─────┴────────────┴──────────────────────────────────────┘
(NOTE: There may be security-related changes not in this list. See https://github.com/aws/aws-cdk/issues/1299)

Do you wish to deploy these changes (y/n)? y
fargate-webapp-dev: deploying...
fargate-webapp-dev: creating CloudFormation changeset...
  0/14 | 16:08:31 | CREATE_IN_PROGRESS   | AWS::EC2::SecurityGroup                     | fargate-webapp-dev-alb-sg (fargatewebappdevalbsg) 
  0/14 | 16:08:31 | CREATE_IN_PROGRESS   | AWS::IAM::Policy                            | task-exec-role/Policy (taskexecrolePolicy) 
  0/14 | 16:08:32 | CREATE_IN_PROGRESS   | AWS::ElasticLoadBalancingV2::TargetGroup    | fargate-webapp-dev-tg (fargatewebappdevtg) 
  0/14 | 16:08:32 | CREATE_IN_PROGRESS   | AWS::CDK::Metadata                          | CDKMetadata 
  0/14 | 16:08:32 | CREATE_IN_PROGRESS   | AWS::ECS::TaskDefinition                    | fargate-webapp-dev-task (fargatewebappdevtask) 
  0/14 | 16:08:32 | CREATE_IN_PROGRESS   | AWS::ECS::Cluster                           | fargate-webapp-dev-cluster (fargatewebappdevcluster) 
  0/14 | 16:08:32 | CREATE_IN_PROGRESS   | AWS::EC2::SecurityGroup                     | fargate-webapp-dev-ecs-sg (fargatewebappdevecssg) 
  0/14 | 16:08:32 | CREATE_IN_PROGRESS   | AWS::ECS::TaskDefinition                    | fargate-webapp-dev-task (fargatewebappdevtask) Resource creation Initiated
  0/14 | 16:08:32 | CREATE_IN_PROGRESS   | AWS::ECS::Cluster                           | fargate-webapp-dev-cluster (fargatewebappdevcluster) Resource creation Initiated
  1/14 | 16:08:32 | CREATE_COMPLETE      | AWS::ECS::TaskDefinition                    | fargate-webapp-dev-task (fargatewebappdevtask) 
  1/14 | 16:08:33 | CREATE_IN_PROGRESS   | AWS::ElasticLoadBalancingV2::TargetGroup    | fargate-webapp-dev-tg (fargatewebappdevtg) Resource creation Initiated
  2/14 | 16:08:33 | CREATE_COMPLETE      | AWS::ElasticLoadBalancingV2::TargetGroup    | fargate-webapp-dev-tg (fargatewebappdevtg) 
  3/14 | 16:08:33 | CREATE_COMPLETE      | AWS::ECS::Cluster                           | fargate-webapp-dev-cluster (fargatewebappdevcluster) 
  3/14 | 16:08:33 | CREATE_IN_PROGRESS   | AWS::IAM::Policy                            | task-exec-role/Policy (taskexecrolePolicy) Resource creation Initiated
  3/14 | 16:08:34 | CREATE_IN_PROGRESS   | AWS::CDK::Metadata                          | CDKMetadata Resource creation Initiated
  4/14 | 16:08:34 | CREATE_COMPLETE      | AWS::CDK::Metadata                          | CDKMetadata 
  4/14 | 16:08:37 | CREATE_IN_PROGRESS   | AWS::EC2::SecurityGroup                     | fargate-webapp-dev-alb-sg (fargatewebappdevalbsg) Resource creation Initiated
  4/14 | 16:08:37 | CREATE_IN_PROGRESS   | AWS::EC2::SecurityGroup                     | fargate-webapp-dev-ecs-sg (fargatewebappdevecssg) Resource creation Initiated
  5/14 | 16:08:39 | CREATE_COMPLETE      | AWS::EC2::SecurityGroup                     | fargate-webapp-dev-alb-sg (fargatewebappdevalbsg) 
  6/14 | 16:08:39 | CREATE_COMPLETE      | AWS::EC2::SecurityGroup                     | fargate-webapp-dev-ecs-sg (fargatewebappdevecssg) 
  6/14 | 16:08:41 | CREATE_IN_PROGRESS   | AWS::EC2::SecurityGroupIngress              | fargate-webapp-dev-ecs-sg/from fargatewebappdevfargatewebappdevalbsg:80 (fargatewebappdevecssgfromfargatewebappdevfargatewebappdevalbsg) 
  6/14 | 16:08:41 | CREATE_IN_PROGRESS   | AWS::ElasticLoadBalancingV2::LoadBalancer   | fargate-webapp-dev-alb (fargatewebappdevalb) 
  6/14 | 16:08:41 | CREATE_IN_PROGRESS   | AWS::EC2::SecurityGroupIngress              | fargate-webapp-dev-ecs-sg/from fargatewebappdevfargatewebappdevalbsg:80 (fargatewebappdevecssgfromfargatewebappdevfargatewebappdevalbsg) Resource creation Initiated
  7/14 | 16:08:42 | CREATE_COMPLETE      | AWS::EC2::SecurityGroupIngress              | fargate-webapp-dev-ecs-sg/from fargatewebappdevfargatewebappdevalbsg:80 (fargatewebappdevecssgfromfargatewebappdevfargatewebappdevalbsg) 
  7/14 | 16:08:42 | CREATE_IN_PROGRESS   | AWS::ElasticLoadBalancingV2::LoadBalancer   | fargate-webapp-dev-alb (fargatewebappdevalb) Resource creation Initiated
  8/14 | 16:08:50 | CREATE_COMPLETE      | AWS::IAM::Policy                            | task-exec-role/Policy (taskexecrolePolicy) 
 8/14 Currently in progress: fargatewebappdevalb
  9/14 | 16:10:44 | CREATE_COMPLETE      | AWS::ElasticLoadBalancingV2::LoadBalancer   | fargate-webapp-dev-alb (fargatewebappdevalb) 
  9/14 | 16:10:46 | CREATE_IN_PROGRESS   | AWS::ElasticLoadBalancingV2::Listener       | fargate-webapp-dev-alb/fargate-webapp-dev-alb-listener (fargatewebappdevalbfargatewebappdevalblistene) 
  9/14 | 16:10:47 | CREATE_IN_PROGRESS   | AWS::ElasticLoadBalancingV2::Listener       | fargate-webapp-dev-alb/fargate-webapp-dev-alb-listener (fargatewebappdevalbfargatewebappdevalblistene) Resource creation Initiated
 10/14 | 16:10:47 | CREATE_COMPLETE      | AWS::ElasticLoadBalancingV2::Listener       | fargate-webapp-dev-alb/fargate-webapp-dev-alb-listener (fargatewebappdevalbfargatewebappdevalblistene) 
 10/14 | 16:11:01 | CREATE_IN_PROGRESS   | AWS::ECS::Service                           | fargate-webapp-dev-service/Service (fargatewebappdevserviceService) 
 10/14 | 16:11:02 | CREATE_IN_PROGRESS   | AWS::ECS::Service                           | fargate-webapp-dev-service/Service (fargatewebappdevserviceService) Resource creation Initiated
10/14 Currently in progress: fargatewebappdevserviceService
 11/14 | 16:12:03 | CREATE_COMPLETE      | AWS::ECS::Service                           | fargate-webapp-dev-service/Service (fargatewebappdevserviceService) 
 11/14 | 16:12:05 | CREATE_IN_PROGRESS   | AWS::ApplicationAutoScaling::ScalableTarget | fargate-webapp-dev-scalabletarget (fargatewebappdevscalabletarget) 
 11/14 | 16:12:06 | CREATE_IN_PROGRESS   | AWS::ApplicationAutoScaling::ScalableTarget | fargate-webapp-dev-scalabletarget (fargatewebappdevscalabletarget) Resource creation Initiated
 12/14 | 16:12:06 | CREATE_COMPLETE      | AWS::ApplicationAutoScaling::ScalableTarget | fargate-webapp-dev-scalabletarget (fargatewebappdevscalabletarget) 

 ✅  fargate-webapp-dev

Outputs:
fargate-webapp-dev.output = http://fargate-webapp-dev-alb-xxxxxxx.ap-northeast-1.elb.amazonaws.com/

Stack ARN:
arn:aws:cloudformation:ap-northeast-1:xxxxxxxxxxxx:stack/fargate-webapp-dev/xxxxx


# 環境削除
cdk destroy --profile xxx
```


