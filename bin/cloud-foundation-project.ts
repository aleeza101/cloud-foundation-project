#!/usr/bin/env node

// =============================================================================
// CDK APPLICATION ENTRY POINT
// =============================================================================
// This file is the main entry point for your AWS CDK (Cloud Development Kit) application.
// CDK is a framework that lets you define cloud infrastructure using familiar programming languages.
// When you run "cdk deploy", this file gets executed to create your AWS resources.

// Import the core AWS CDK library
// This gives us access to the main CDK classes like App, Stack, etc.
import * as cdk from 'aws-cdk-lib';

// Import our custom stack definition
// This is where we define what AWS resources we want to create (EC2, S3, Lambda, etc.)
// The actual infrastructure code lives in the '../lib/cloud-foundation-project-stack' file
import { CloudFoundationProjectStack } from '../lib/cloud-foundation-project-stack';

// =============================================================================
// CREATE THE CDK APPLICATION
// =============================================================================

// Create a new CDK App instance
// Think of this as the "container" that holds all your infrastructure stacks
// An app can contain multiple stacks, but we're only creating one here
const app = new cdk.App();

// =============================================================================
// INSTANTIATE AND DEPLOY THE STACK
// =============================================================================

// Create a new instance of our CloudFoundationProjectStack
// This is where we tell CDK: "Hey, create all the infrastructure defined in that stack"
// 
// Parameters explained:
// - app: The CDK app we created above (this stack belongs to this app)
// - 'CloudFoundationProjectStack': The name that will appear in AWS CloudFormation
//   (this is what you'll see in the AWS console)
// - {}: Additional configuration options (empty for now, but you could add things like:
//   - env: { account: '123456789', region: 'us-east-1' } to specify AWS account/region
//   - tags: { Environment: 'dev', Team: 'backend' } to add tags to all resources
//   - stackName: 'my-custom-name' to override the stack name
new CloudFoundationProjectStack(app, 'CloudFoundationProjectStack', {
  // Currently no additional options, but here's where you'd add them:
  
  // Uncomment and modify these examples as needed:
  // env: { 
  //   account: process.env.CDK_DEFAULT_ACCOUNT, 
  //   region: process.env.CDK_DEFAULT_REGION 
  // },
  // tags: {
  //   Environment: 'development',
  //   Project: 'cloud-foundation',
  //   Team: 'infrastructure'
  // }
});

// =============================================================================
// WHAT HAPPENS NEXT?
// =============================================================================
// After this code runs:
// 1. CDK reads the stack definition from '../lib/cloud-foundation-project-stack'
// 2. CDK converts your TypeScript code into CloudFormation templates (AWS's infrastructure language)
// 3. When you run "cdk deploy", these templates get sent to AWS
// 4. AWS CloudFormation creates the actual resources (servers, databases, etc.)
// 5. You can see the created resources in the AWS Console under CloudFormation

// =============================================================================
// COMMON CDK COMMANDS (run these in your terminal):
// =============================================================================
// cdk list          - Shows all stacks in this app
// cdk synth         - Generates CloudFormation templates (doesn't deploy)
// cdk deploy        - Deploys the stack to AWS (creates real resources)
// cdk diff          - Shows what changes would be made
// cdk destroy       - Deletes all resources created by this stack
// cdk bootstrap     - Sets up CDK in your AWS account (run once per account/region)