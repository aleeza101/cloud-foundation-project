# Cloud Foundation Project

A secure, production-ready single-page application hosting solution built with AWS CDK v2 and TypeScript. This project demonstrates best practices for deploying static websites on AWS with comprehensive security measures and automatic deployment.

## 🏗️ Architecture Overview

This CDK stack creates a complete static website hosting infrastructure with the following components:

```
Internet → AWS WAF → CloudFront Distribution → S3 Bucket (Private)
                                           ↗
                                    Origin Access Control (OAC)
```

### What Gets Created

- **Private S3 Bucket**: Encrypted, versioned storage for your website files
- **CloudFront Distribution**: Global CDN with HTTPS termination and caching
- **AWS WAF Web ACL**: Protection against common web attacks using free AWS managed rules
- **Origin Access Control (OAC)**: Secure access from CloudFront to S3 (replaces legacy OAI)
- **Automatic File Deployment**: Your `dist/` folder contents are uploaded during every deployment
- **CloudWatch Logging**: Access logs and WAF metrics for monitoring

## 🔒 Security Features

The infrastructure includes multiple layers of security at **zero additional cost**:

### AWS WAF Managed Rule Groups (All Free)
- **AWSManagedRulesCommonRuleSet**: Protection against OWASP Top 10 vulnerabilities (XSS, bad headers, etc.)
- **AWSManagedRulesAnonymousIpList**: Blocks traffic from known VPNs, proxies, and Tor exit nodes
- **AWSManagedRulesAmazonIpReputationList**: Blocks IPs with poor reputation according to Amazon threat intelligence
- **AWSManagedRulesKnownBadInputsRuleSet**: Catches obviously malicious request patterns
- **AWSManagedRulesSQLiRuleSet**: Prevents SQL injection attacks

### S3 Security
- Private bucket with no public access
- Server-side encryption (SSE-S3)
- HTTPS-only access policy
- Object versioning enabled for rollback capability
- Block all public ACLs and bucket policies

### CloudFront Security
- Origin Access Control (OAC) prevents direct S3 access
- WAF integration filters malicious requests
- Access logging enabled for audit trails
- HTTPS termination at the edge

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** (version 18+ recommended)
- **AWS CLI** configured with appropriate permissions
- **AWS CDK CLI** installed globally: `npm install -g aws-cdk`
- **AWS Account** with programmatic access
- A `dist/` folder containing your built single-page application files

### Required AWS Permissions

Your AWS credentials need the following permissions:
- CloudFormation (full access)
- S3 (create/manage buckets and objects)
- CloudFront (create/manage distributions)
- WAF v2 (create/manage web ACLs)
- IAM (create/manage service roles)

## 🚀 Quick Start

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd cloud-foundation-project
npm install
```

### 2. Prepare Your Website Files

Place your built single-page application files in a `dist/` folder at the project root:

```
cloud-foundation-project/
├── dist/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── ... (other assets)
├── lib/
├── bin/
└── package.json
```

### 3. Bootstrap CDK (First Time Only)

If this is your first time using CDK in your AWS account/region:

```bash
cdk bootstrap
```

### 4. Deploy the Stack

```bash
cdk deploy
```

The deployment will:
- Create all AWS resources
- Upload your `dist/` folder contents to S3
- Configure WAF rules
- Set up CloudFront distribution
- Output the CloudFront URL where your site is accessible

## 📝 Project Structure

```
cloud-foundation-project/
├── bin/
│   └── cloud-foundation-project.ts    # CDK app entry point
├── lib/
│   └── cloud-foundation-project-stack.ts  # Stack definition with all resources
├── dist/                              # Your built website files (you create this)
│   ├── index.html
│   └── ... (other files)
├── cdk.json                          # CDK configuration
└── package.json                      # Dependencies and scripts
```

## 🛠️ Development Workflow

### Making Changes

1. **Update your website**: Modify files in your `dist/` folder
2. **Deploy changes**: Run `cdk deploy` to sync changes to AWS
3. **Monitor**: Check CloudWatch metrics and WAF logs

### Useful CDK Commands

```bash
# See what resources will be created/changed
cdk diff

# Generate CloudFormation templates without deploying
cdk synth

# List all stacks in the app
cdk list

# Destroy all resources (careful!)
cdk destroy
```

### Local Development

This stack only handles AWS infrastructure. For local development of your single-page app:

1. Use your preferred development server (webpack-dev-server, Vite, etc.)
2. Build your app to the `dist/` folder when ready to deploy
3. Run `cdk deploy` to push changes to AWS

## 💰 Cost Estimation

This infrastructure is designed to be cost-effective:

### Free Tier Eligible
- **S3**: 5GB storage, 20,000 GET requests, 2,000 PUT requests/month
- **CloudFront**: 1TB data transfer, 10,000,000 requests/month
- **AWS WAF**: All managed rule groups used are free

### Ongoing Costs (after free tier)
- **S3**: ~$0.023/GB/month for storage
- **CloudFront**: ~$0.085/GB for data transfer (varies by region)
- **WAF**: $1.00/month per Web ACL + $0.60 per million requests

For a typical small website, expect $1-5/month in costs.

## 🔧 Customization

### Environment-Specific Deployments

Uncomment and modify the environment configuration in `bin/cloud-foundation-project.ts`:

```typescript
new CloudFoundationProjectStack(app, 'CloudFoundationProjectStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: 'us-east-1' // Specify your preferred region
  },
  tags: {
    Environment: 'production',
    Project: 'my-website',
    Team: 'frontend'
  }
});
```

### Adding Custom Domain

To use your own domain:

1. Register a domain in Route 53 or transfer DNS management to Route 53
2. Request an SSL certificate in AWS Certificate Manager (ACM)
3. Modify the CloudFront distribution in the stack to use your domain and certificate

### WAF Rule Customization

The current WAF configuration blocks potentially legitimate traffic (VPNs, etc.). To customize:

1. Remove or modify rules in the `webAcl.rules` array
2. Add custom rate limiting rules
3. Implement geo-blocking if needed

## 🚨 Important Notes

### Development vs Production

The current configuration includes these **development-friendly** settings:

```typescript
removalPolicy: cdk.RemovalPolicy.DESTROY,  // Resources get deleted with stack
autoDeleteObjects: true,                   // S3 bucket contents get deleted
```

For **production environments**, consider:
- Changing `removalPolicy` to `RETAIN`
- Setting `autoDeleteObjects` to `false`
- Adding backup policies
- Implementing proper logging and monitoring

### WAF Rule Considerations

The included WAF rules may block legitimate traffic in some scenarios:
- **Anonymous IP List**: Blocks VPN users (may affect legitimate users)
- **Common Rule Set**: May have false positives for complex web applications
- **Reputation List**: Generally safe but can block shared IP addresses

Monitor CloudWatch metrics and adjust rules based on your specific needs.

## 📊 Monitoring and Troubleshooting

### CloudWatch Metrics

Monitor your deployment through:
- **CloudFront**: Request count, error rates, cache hit ratio
- **WAF**: Blocked requests, rule matches
- **S3**: Request metrics, error rates

### Common Issues

1. **Deployment fails**: Check AWS credentials and permissions
2. **Website not loading**: Verify `index.html` exists in `dist/` folder
3. **WAF blocking legitimate traffic**: Review WAF metrics and adjust rules
4. **Files not updating**: CloudFront caching - wait for TTL or create invalidation

### Getting Help

- Check CDK documentation: https://docs.aws.amazon.com/cdk/
- Review AWS service documentation for specific components
- Monitor AWS CloudFormation events in the console for deployment issues

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test deployment in a development environment
5. Submit a pull request

## 📄 License

[Add your license information here]

---

**Ready to deploy?** Make sure your `dist/` folder contains your website files, then run `cdk deploy`!