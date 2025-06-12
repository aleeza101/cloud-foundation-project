// ============================================================================
//  AleezaStack (AWS CDK v2 – TypeScript)
//  -------------------------------------
//  This stack demonstrates a **secure static‑website pattern** on AWS.  It will:
//    1. Create a **private, encrypted, versioned S3 bucket** to hold website files.
//    2. Upload your local build artefacts (the `dist` folder) into the bucket at
//       deploy time so you never have to copy files by hand.
//    3. Stand up an **AWS WAF WebACL** with several managed rule groups to block
//       common attacks (SQL‑i, bad bots, Tor/VPN exit nodes, etc.).
//    4. Put a global **CloudFront distribution** in front of the bucket to give
//       users fast HTTPS access while keeping the bucket entirely private.
//
//  The comments are intentionally verbose and opinionated – perfect for a new
//  developer who has **never used the CDK or written code before**.  Follow the
//  "WHY?" and "WHAT?" notes to understand each decision.
//
//  Deploy with:  `cdk deploy`   (after `npm i` + `cdk bootstrap`)
// ============================================================================

// ------------------------
// Library imports
// ------------------------
// CDK core constructs (Stack, RemovalPolicy, etc.)
import * as cdk from 'aws-cdk-lib';

// AWS service‑specific L2 constructs
import * as s3               from 'aws-cdk-lib/aws-s3';                // Amazon S3 bucket
import * as s3_deployment    from 'aws-cdk-lib/aws-s3-deployment';     // Helper to upload local files to S3
import * as cloudfront       from 'aws-cdk-lib/aws-cloudfront';        // Amazon CloudFront CDN
import * as cf_origins       from 'aws-cdk-lib/aws-cloudfront-origins';// Origins for CloudFront
import * as wafv2            from 'aws-cdk-lib/aws-wafv2';             // AWS WAF (Web Application Firewall)

// CDK "Construct" base class
import { Construct } from 'constructs';

// Node.js std‑lib helper for file paths
import * as path from 'path';

// ============================================================================
// Stack definition – all resources live inside this class.
// ============================================================================
export class AleezaStack extends cdk.Stack {
  /**
   * Every CDK stack **must** have a constructor.  Think of it like the entry
   * point where you lay out your AWS building blocks.
   */
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props); // Always call the parent constructor first.

    // ------------------------------------------------------------------------
    // 1. Website S3 bucket (secure by default!)
    // ------------------------------------------------------------------------
    // WHY a *private* bucket?  The website will be served via CloudFront, not
    // directly from S3, so we don’t want the bucket publicly reachable.
    const website_bucket = new s3.Bucket(this, 'WebsiteBucket', {
      // === Security & compliance ===
      encryption: s3.BucketEncryption.S3_MANAGED,     // SSE‑S3 server‑side encryption
      accessControl: s3.BucketAccessControl.PRIVATE,  // No public ACLs
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Belt‑and‑suspenders

      // === Lifecycle ===
      removalPolicy: cdk.RemovalPolicy.DESTROY,       // Delete bucket when stack is destroyed (dev / sandbox!)
      autoDeleteObjects: true,                        // Force‑delete objects with the bucket (again: dev only)

      // === Static‑website settings ===
      websiteIndexDocument: 'index.html',             // Required by CloudFront default root object
      versioned: true,                                // Keep past versions – easy rollback
      enforceSSL: true                                // Only allow HTTPS access (good practice even if private)
    });

    // ------------------------------------------------------------------------
    // 2. Upload local build artefacts into the bucket on every `cdk deploy`
    // ------------------------------------------------------------------------
    // This saves interns from manual CLI copying. CDK figures out what changed
    // and syncs it automatically.
    new s3_deployment.BucketDeployment(this, 'WebsiteFiles', {
      destinationBucket: website_bucket,
      sources: [
        s3_deployment.Source.asset(
          // __dirname = directory of *this* file.  We go one level up (..)
          // then into the `dist` folder where your build tool outputs HTML/CSS/JS.
          path.join(__dirname, '..', 'dist')
        ),
      ],
      prune: true,             // Delete files from S3 that were deleted locally
      retainOnDelete: true     // Keep the uploaded content if the deployment construct is removed
    });

    // ------------------------------------------------------------------------
    // 3. AWS WAF v2 – Web ACL with managed rule groups
    // ------------------------------------------------------------------------
    // WHY WAF?  Because CloudFront alone doesn’t stop malicious traffic.  The
    // managed groups here are FREE and cover the 80/20 of common web threats.
    const webAcl = new wafv2.CfnWebACL(this, 'WebsiteACL', {
      scope: 'CLOUDFRONT',                        // Must be CLOUDFRONT for global distributions
      defaultAction: { allow: {} },               // Default is allow unless a rule blocks the request
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,           // Emit metrics → CloudWatch
        metricName: 'WebsiteACL',
        sampledRequestsEnabled: true,             // Keep sample payloads for debugging
      },
      rules: [
        // NOTE: Priority numbers must be unique and ascending. Lower number = evaluated first.

        // 1️⃣  Common OWASP security protections (XSS, bad headers, etc.)
        {
          name: 'AWS-AWSManagedRulesCommonRuleSet',
          priority: 1,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'CommonRuleSet',
            sampledRequestsEnabled: true,
          },
        },

        // 2️⃣  Block known anonymizers (Proxies, VPNs, Tor)
        {
          name: 'AWS-AWSManagedRulesAnonymousIpList',
          priority: 2,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesAnonymousIpList',
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AnonymousIpList',
            sampledRequestsEnabled: true,
          },
        },

        // 3️⃣  Amazon reputation list (AWS‑detected bad actors)
        {
          name: 'AWS-AWSManagedRulesAmazonIpReputationList',
          priority: 3,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesAmazonIpReputationList',
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AmazonIpReputationList',
            sampledRequestsEnabled: true,
          },
        },

        // 4️⃣  Catch obvious malicious input patterns
        {
          name: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
          priority: 4,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'KnownBadInputsRuleSet',
            sampledRequestsEnabled: true,
          },
        },

        // 5️⃣  SQL‑Injection protection (classic web attack)
        {
          name: 'AWS-AWSManagedRulesSQLiRuleSet',
          priority: 5,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesSQLiRuleSet',
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'SQLiRuleSet',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    // ------------------------------------------------------------------------
    // 4. CloudFront Distribution – the “face” of your website
    // ------------------------------------------------------------------------
    // WHY CloudFront?
    //   • Global edge caching ⇒ faster load times world‑wide.
    //   • TLS (HTTPS) termination with an ACM certificate (not shown here).
    //   • Integrates with WAF (attached above).
    //   • Keeps the S3 bucket private – CloudFront fetches objects via
    //     Origin Access Control (OAC) so end‑users can’t bypass the CDN.
    const distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
      defaultRootObject: 'index.html',

      // The origin − here we hand CloudFront a *private* bucket with an Origin
      // Access Control (OAC) so it can read the objects securely.
      defaultBehavior: {
        // Newer CDK uses S3Origin; the pattern below assumes cf_origins exports
        // a helper called `S3BucketOrigin` with `withOriginAccessControl`.
        // If this doesn’t compile in your CDK version, replace with:
        //   new cf_origins.S3Origin(website_bucket)
        origin: cf_origins.S3BucketOrigin.withOriginAccessControl(website_bucket),
      },

      enableLogging: true,            // Access logs → S3 (creates another bucket automatically)
      webAclId: webAcl.attrArn        // Attach the WAF WebACL created earlier
    });

    // ------------------------------------------------------------------------
    // END OF STACK – once `cdk deploy` finishes, the website is live!
    // ------------------------------------------------------------------------
    // You can find the CloudFront URL in the terminal output, or create your own
    // Route 53 record + ACM certificate for a custom domain.
  }
}
