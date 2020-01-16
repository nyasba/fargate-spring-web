export interface IProcessEnv {
    ACCOUNT_ID: string,
    REGION: string,
    PROJECT_NAME: string,
    ECR_REPOSITORY_NAME: string,
    VPC_ID: string,
    TASK_EXECTUION_ROLE: string,
    TASK_CONTAINER_ROLE: string,
    AUTOSCALING_ROLE: string
}

declare global {
    namespace NodeJS {
        interface ProcessEnv extends IProcessEnv {}
    }
}