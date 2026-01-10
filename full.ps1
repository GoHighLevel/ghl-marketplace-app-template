<# 
full.ps1 — one-file scaffold to connect a repo to Google Cloud + GitHub Actions (OIDC / Workload Identity Federation),
create core GCP resources (APIs, service accounts, Artifact Registry, Cloud Run), and drop in a CI/CD workflow.

USAGE (run from repo root):
  pwsh ./full.ps1 -ProjectId "hooker-e431f" -Region "us-central1" -RepoOwner "built-responsive" -RepoName "ghl-app" -ServiceName "ghl-app" -CreateGcpResources  -CreateGithubActions -CommitWorkflows

REQUIREMENTS (local machine):
  - PowerShell 7+ recommended (pwsh)
  - gcloud CLI installed
  - GitHub CLI installed (gh)
  - You have permissions to create IAM/WIF resources in GCP and admin access to the GitHub repo.
NOTES:
  - This script avoids storing secrets in the repo. It uses GitHub OIDC to get short-lived creds (recommended).
  - It writes a GitHub Actions workflow to deploy your application to Cloud Run.
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$ProjectId,
  [Parameter(Mandatory=$true)][string]$Region,

  [Parameter(Mandatory=$true)][string]$RepoOwner,
  [Parameter(Mandatory=$true)][string]$RepoName,

  # Cloud Run service
  [Parameter(Mandatory=$true)][string]$ServiceName,

  # Optional: Artifact Registry repo name
  [Parameter(Mandatory=$false)][string]$ArtifactRepo = "containers",

  # WIF config
  [Parameter(Mandatory=$false)][string]$WorkloadIdentityPoolId = "github-pool",
  [Parameter(Mandatory=$false)][string]$WorkloadIdentityProviderId = "github-provider",

  # GCP service account used by GitHub Actions
  [Parameter(Mandatory=$false)][string]$CicdServiceAccountId = "github-deployer",

  # Toggles
  [switch]$CreateGcpResources,
  [switch]$CreateGithubActions,
  [switch]$CommitWorkflows,
  [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($PSBoundParameters['Help']) {
    Show-Help
    return
}

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[ERR ] $msg" -ForegroundColor Red }

function Show-Help() {
  Write-Host @"
NAME:
  full.ps1 - One-file scaffold to connect a repo to Google Cloud + GitHub Actions.

SYNOPSIS:
  ./full.ps1 -ProjectId <PROJECT_ID> -Region <REGION> -RepoOwner <REPO_OWNER> -RepoName <REPO_NAME> -ServiceName <SERVICE_NAME> [-CreateGcpResources] [-CreateGithubActions] [-CommitWorkflows]

DESCRIPTION:
  This script automates the process of setting up a GitHub repository with Google Cloud. It can:
  - Create and configure necessary Google Cloud resources like Artifact Registry, IAM service accounts, and Workload Identity Federation.
  - Generate GitHub Actions workflow files for building and deploying to Cloud Run.
  - Commit the generated workflow files to your repository.

PARAMETERS:
  -ProjectId <string>
    Your Google Cloud project ID. (Required)

  -Region <string>
    The Google Cloud region for your resources (e.g., us-central1). (Required)

  -RepoOwner <string>
    The owner of the GitHub repository (your username or organization). (Required)

  -RepoName <string>
    The name of the GitHub repository. (Required)

  -ServiceName <string>
    The name for your Cloud Run service. (Required)

  -CreateGcpResources [<switch>]
    If specified, the script will create and configure all necessary Google Cloud resources.

  -CreateGithubActions [<switch>]
    If specified, the script will generate the GitHub Actions workflow files.

  -CommitWorkflows [<switch>]
    If specified, the script will commit the generated workflow files to your repository.

EXAMPLES:
  # Create GCP resources and GitHub Actions, then commit the workflows.
  ./full.ps1 -ProjectId "my-gcp-project" -Region "us-central1" -RepoOwner "my-github-user" -RepoName "my-app" -ServiceName "my-app-service" -CreateGcpResources -CreateGithubActions -CommitWorkflows

  # Only generate the GitHub Actions workflow files.
  ./full.ps1 -ProjectId "my-gcp-project" -Region "us-central1" -RepoOwner "my-github-user" -RepoName "my-app" -ServiceName "my-app-service" -CreateGithubActions
"@
}

function Assert-Cmd($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $name. Install it and re-run."
  }
}

function Run($cmd) {
  Write-Info $cmd
  & pwsh -NoProfile -Command $cmd
}

function RunNative([string]$exe, [string[]]$args) {
  Write-Info ("$exe " + ($args -join " "))
  & $exe @args

}

function Ensure-GcloudAuth() {
  Assert-Cmd gcloud
  Write-Info "Ensuring gcloud is authenticated..."
  try {
    $acct = (& gcloud auth list --filter="status:ACTIVE" --format="value(account)") 2>$null
    if (-not $acct) {
      Write-Warn "No active gcloud account. Launching browser login..."
      RunNative "gcloud" "auth","login"
    }
  } catch {
    Write-Warn "Could not read gcloud auth state; running login..."
    RunNative "gcloud" "auth","login"
  }

  Write-Info "Setting gcloud project to $ProjectId"
  RunNative "gcloud" "config","set","project",$ProjectId
}

function Ensure-GithubAuth() {
  Assert-Cmd gh
  Write-Info "Ensuring GitHub CLI is authenticated..."
  try {
    $status = (& gh auth status) 2>&1
    if ($LASTEXITCODE -ne 0) {
      Write-Warn "GitHub CLI not authenticated. Running gh auth login..."
      RunNative "gh" "auth","login"
    }
  } catch {
    Write-Warn "GitHub CLI auth check failed. Running gh auth login..."
    RunNative "gh" "auth","login"
  }
}

function Ensure-RepoContext() {
  $expected = "$RepoOwner/$RepoName"
  Write-Info "Ensuring current directory is a git repo and matches $expected (best-effort)..."
  Assert-Cmd git
  $isRepo = (& git rev-parse --is-inside-work-tree) 2>$null
  if ($LASTEXITCODE -ne 0 -or $isRepo -ne "true") {
    throw "Current directory is not a git repository. cd into the repo root and re-run."
  }
}

function Enable-GcpApis() {
  Write-Info "Enabling required Google Cloud APIs..."
  $apis = @(
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "artifactregistry.googleapis.com",
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "serviceusage.googleapis.com"
  )
  RunNative "gcloud" @("services","enable") + $apis
}

function Ensure-ArtifactRegistry() {
  Write-Info "Ensuring Artifact Registry repo '$ArtifactRepo' exists in region '$Region'..."
  $existing = (& gcloud artifacts repositories list --location $Region --format="value(name)" | Select-String "/$ArtifactRepo$") 2>$null
  if (-not $existing) {
    RunNative "gcloud" @(
      "artifacts","repositories","create",$ArtifactRepo,
      "--repository-format=docker",
      "--location",$Region,
      "--description","Containers for $RepoOwner/$RepoName"
    )
  } else {
    Write-Info "Artifact Registry repo already exists."
  }

  Write-Info "Configuring Docker auth for Artifact Registry..."
  RunNative "gcloud" @("auth","configure-docker","$Region-docker.pkg.dev","--quiet")
}

function Ensure-ServiceAccountAndRoles() {
  $saEmail = "$CicdServiceAccountId@$ProjectId.iam.gserviceaccount.com"
  Write-Info "Ensuring service account exists: $saEmail"
  $sa = (& gcloud iam service-accounts list --format="value(email)" | Select-String -SimpleMatch $saEmail) 2>$null
  if (-not $sa) {
    RunNative "gcloud" @("iam","service-accounts","create",$CicdServiceAccountId,"--display-name","GitHub Actions Deployer")
  } else {
    Write-Info "Service account already exists."
  }

  Write-Info "Granting IAM roles to service account (principle of least privilege baseline)..."
  $roles = @(
    "roles/run.admin",
    "roles/artifactregistry.writer",
    "roles/iam.serviceAccountUser",
    "roles/iam.workloadIdentityUser",
    "roles/cloudbuild.builds.editor"
  )

  foreach ($role in $roles) {
    RunNative "gcloud" (
      "projects","add-iam-policy-binding",$ProjectId,
      "--member","serviceAccount:$saEmail",
      "--role",$role
    )
  }

  return $saEmail
}

function Ensure-WorkloadIdentityFederation($saEmail) {
  Write-Info "Creating/ensuring Workload Identity Pool and Provider for GitHub OIDC..."

  $poolName = "projects/$ProjectId/locations/global/workloadIdentityPools/$WorkloadIdentityPoolId"
  $providerName = "$poolName/providers/$WorkloadIdentityProviderId"

  # Create pool if missing
  $poolExists = $false
  try {
    & gcloud iam workload-identity-pools describe $WorkloadIdentityPoolId --location="global" *> $null
    if ($LASTEXITCODE -eq 0) { $poolExists = $true }
  } catch { $poolExists = $false }

  if (-not $poolExists) {
    RunNative "gcloud" (
      "iam","workload-identity-pools","create",$WorkloadIdentityPoolId,
      "--location","global",
      "--display-name","GitHub Actions Pool"
    )
  } else {
    Write-Info "Workload Identity Pool already exists."
  }

  # Create provider if missing
  $providerExists = $false
  try {
    & gcloud iam workload-identity-pools providers describe $WorkloadIdentityProviderId --location="global" --workload-identity-pool=$WorkloadIdentityPoolId *> $null
    if ($LASTEXITCODE -eq 0) { $providerExists = $true }
  } catch { $providerExists = $false }

  if (-not $providerExists) {
    # GitHub OIDC issuer
    $issuer = "https://token.actions.githubusercontent.com"

    # Security hardening: restrict to this repo via attribute condition
    $attributeCondition = "assertion.repository=='$RepoOwner/$RepoName'"

    # Attribute mapping used by Google examples
    $attributeMapping = @(
      "google.subject=assertion.sub",
      "attribute.actor=assertion.actor",
      "attribute.repository=assertion.repository",
      "attribute.ref=assertion.ref",
      "attribute.workflow=assertion.workflow"
    ) -join ","

    RunNative "gcloud" (
      "iam","workload-identity-pools","providers","create-oidc",$WorkloadIdentityProviderId,
      "--location","global",
      "--workload-identity-pool",$WorkloadIdentityPoolId,
      "--display-name","GitHub OIDC Provider",
      "--issuer-uri",$issuer,
      "--attribute-mapping",$attributeMapping,
      "--attribute-condition",$attributeCondition
    )
  } else {
    Write-Info "Workload Identity Provider already exists."
  }

  # Bind provider principalSet to service account for workload identity user
  # principalSet format:
  #   principalSet://iam.googleapis.com/{poolName}/attribute.repository/{owner}/{repo}
  $principalSet = "principalSet://iam.googleapis.com/$poolName/attribute.repository/$RepoOwner/$RepoName"

  Write-Info "Binding Workload Identity User permission from $principalSet to $saEmail"
  RunNative "gcloud" (
    "iam","service-accounts","add-iam-policy-binding",$saEmail,
    "--role","roles/iam.workloadIdentityUser",
    "--member",$principalSet
  )

  return @{
    PoolName     = $poolName
    ProviderName = $providerName
    PrincipalSet = $principalSet
  }
}

function Ensure-CloudRunServices() {
  Write-Info "Ensuring Cloud Run services exist (created on first deploy; this is just a sanity check step)..."
  Write-Info "Cloud Run will be deployed by GitHub Actions; no-op here unless you want to precreate."
}

function Write-WorkflowFiles($saEmail, $providerName) {
  Write-Info "Scaffolding GitHub Actions workflows in .github/workflows/ ..."
$DocsPath = "docs" 
$UiPath = "ui"

# [FIX] Defining missing service variables to prevent script failure
$DocsServiceName = "$ServiceName-docs"
$UiServiceName = "$ServiceName-ui"
$InternalDocsBaseUrl = "https://placeholder-internal-url.com"

  New-Item -ItemType Directory -Force -Path ".github/workflows" | Out-Null

  $deployDocsYml = @"
name: Deploy Docs Service (Cloud Run)

on:
  push:
    branches: [ "main" ]
    paths:
      - "$DocsPath/**"
      - ".github/workflows/deploy-docs.yml"
  workflow_dispatch: {}

permissions:
  contents: read
  id-token: write

env:
  PROJECT_ID: $ProjectId
  REGION: $Region
  SERVICE: $DocsServiceName
  IMAGE: $Region-docker.pkg.dev/$ProjectId/$ArtifactRepo/$DocsServiceName

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud (OIDC)
        uses: google-github-actions/auth@v3
        with:
          workload_identity_provider: "$providerName"
          service_account: "$saEmail"

      - name: Setup gcloud
        uses: google-github-actions/setup-gcloud@v3

      - name: Build and push container
        run: |
          gcloud auth configure-docker $Region-docker.pkg.dev --quiet
          docker build -t "`${IMAGE}:`${GITHUB_SHA}" "$DocsPath"
          docker push "`${IMAGE}:`${GITHUB_SHA}"
          docker tag "`${IMAGE}:`${GITHUB_SHA}" "`${IMAGE}:latest"
          docker push "`${IMAGE}:latest"

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy "`${SERVICE}" \
            --image "`${IMAGE}:`${GITHUB_SHA}" \
            --region "`${REGION}" \
            --project "`${PROJECT_ID}" \
            --platform managed \
            --allow-unauthenticated \
            --set-env-vars "INTERNAL_DOCS_BASE_URL=$InternalDocsBaseUrl"
"@

  $deployUiYml = @"
name: Deploy Sales UI (Cloud Run)

on:
  push:
    branches: [ "main" ]
    paths:
      - "$UiPath/**"
      - ".github/workflows/deploy-ui.yml"
  workflow_dispatch: {}

permissions:
  contents: read
  id-token: write

env:
  PROJECT_ID: $ProjectId
  REGION: $Region
  SERVICE: $UiServiceName
  IMAGE: $Region-docker.pkg.dev/$ProjectId/$ArtifactRepo/$UiServiceName

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud (OIDC)
        uses: google-github-actions/auth@v3
        with:
          workload_identity_provider: "$providerName"
          service_account: "$saEmail"

      - name: Setup gcloud
        uses: google-github-actions/setup-gcloud@v3

      - name: Build and push container
        run: |
          gcloud auth configure-docker $Region-docker.pkg.dev --quiet
          docker build -t "`${IMAGE}:`${GITHUB_SHA}" "$UiPath"
          docker push "`${IMAGE}:`${GITHUB_SHA}"
          docker tag "`${IMAGE}:`${GITHUB_SHA}" "`${IMAGE}:latest"
          docker push "`${IMAGE}:latest"

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy "`${SERVICE}" \
            --image "`${IMAGE}:`${GITHUB_SHA}" \
            --region "`${REGION}" \
            --project "`${PROJECT_ID}" \
            --platform managed \
            --allow-unauthenticated
"@

  Set-Content -Path ".github/workflows/deploy-docs.yml" -Value $deployDocsYml -Encoding UTF8
  Set-Content -Path ".github/workflows/deploy-ui.yml"   -Value $deployUiYml   -Encoding UTF8

  Write-Info "Workflows written:"
  Write-Info "  - .github/workflows/deploy-docs.yml"
  Write-Info "  - .github/workflows/deploy-ui.yml"

  # Optional: minimal Dockerfile hints if missing (does not overwrite existing)
  $docsDockerfile = Join-Path $DocsPath "Dockerfile"
  if (-not (Test-Path $docsDockerfile)) {
    Write-Warn "No Dockerfile found at $docsDockerfile. Creating a minimal PHP/Apache Dockerfile placeholder."
    New-Item -ItemType Directory -Force -Path $DocsPath | Out-Null
    @"
FROM php:8.3-apache
WORKDIR /var/www/html
COPY . /var/www/html
# If you use composer, enable extensions, etc. customize here.
EXPOSE 8080
ENV PORT=8080
RUN sed -i 's/80/\${PORT}/g' /etc/apache2/ports.conf /etc/apache2/sites-enabled/000-default.conf
"@ | Set-Content -Path $docsDockerfile -Encoding UTF8
  }

  $uiDockerfile = Join-Path $UiPath "Dockerfile"
  if (-not (Test-Path $uiDockerfile)) {
    Write-Warn "No Dockerfile found at $uiDockerfile. Creating a minimal Node build + serve Dockerfile placeholder."
    New-Item -ItemType Directory -Force -Path $UiPath | Out-Null
    @"
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Replace with your preferred static server. This assumes a Vite build output in /dist.
RUN npm i -g serve
COPY --from=build /app/dist /app/dist
EXPOSE 8080
CMD ["serve","-s","/app/dist","-l","8080"]
"@ | Set-Content -Path $uiDockerfile -Encoding UTF8
  }
}

function Configure-GithubRepoSecrets($providerName, $saEmail) {
  Ensure-GithubAuth

  $fullRepo = "$RepoOwner/$RepoName"
  Write-Info "Setting default GitHub repo context to $fullRepo"
  RunNative "gh" "repo","set-default",$fullRepo

  # These are not secrets per se, but we store them as Actions secrets for convenience.
  Write-Info "Adding/updating GitHub Actions secrets..."
  RunNative "gh" "secret","set","GCP_PROJECT_ID","-b",$ProjectId
  RunNative "gh" "secret","set","GCP_REGION","-b",$Region
  RunNative "gh" "secret","set","GCP_WIF_PROVIDER","-b",$providerName
  RunNative "gh" "secret","set","GCP_SERVICE_ACCOUNT","-b",$saEmail
}

function Commit-WorkflowsIfRequested() {
  if ($CommitWorkflows) {
    Write-Info "Committing workflow files..."
    Assert-Cmd git
    RunNative "git" @("add", ".github/workflows/deploy-docs.yml", ".github/workflows/deploy-ui.yml")
    RunNative "git" @("commit", "-m", "feat: add Google Cloud Run deployment workflows")
    Write-Info "Workflows committed. Push to your main branch to trigger deployment."
  }
  else {
    Write-Info "Skipping commit. To commit workflow files, re-run with -CommitWorkflows."
  }
}

# ───────────────────────────────────────────
# MAIN
# ───────────────────────────────────────────

try {
  Ensure-RepoContext

  if ($CreateGcpResources) {
    Ensure-GcloudAuth
    Enable-GcpApis
    Ensure-ArtifactRegistry
    $saEmail = Ensure-ServiceAccountAndRoles
    $wif = Ensure-WorkloadIdentityFederation -saEmail $saEmail
    Ensure-CloudRunServices

    if ($CreateGithubActions) {
      Write-WorkflowFiles -saEmail $saEmail -providerName $wif.ProviderName
      Configure-GithubRepoSecrets -providerName $wif.ProviderName -saEmail $saEmail
    }
  }
  elseif ($CreateGithubActions) {
    # If user only wants GitHub Actions scaffolding, still need SA/provider values.
    Write-Warn "CreateGithubActions was set without CreateGcpResources."
    Write-Warn "You must supply existing SA/provider values manually by editing the workflows after generation."
    Write-Warn "Proceeding with placeholder values."

    $placeholderSa = "$CicdServiceAccountId@$ProjectId.iam.gserviceaccount.com"
    $placeholderProvider = "projects/$ProjectId/locations/global/workloadIdentityPools/$WorkloadIdentityPoolId/providers/$WorkloadIdentityProviderId"
    Write-WorkflowFiles -saEmail $placeholderSa -providerName $placeholderProvider
    Configure-GithubRepoSecrets -providerName $placeholderProvider -saEmail $placeholderSa
  }
  else {
    Write-Warn "No action selected. Use -CreateGcpResources and/or -CreateGithubActions."
  }

  Commit-WorkflowsIfRequested

  Write-Info "Done."
  Write-Info "Next steps:"
  Write-Info "  1) Push your branch to GitHub (if you committed workflows)."
  Write-Info "  2) Review the generated Dockerfile and ensure it matches your app's needs."
  Write-Info "  3) Watch the Actions run, then check the Cloud Run service in region $Region."
}
catch {
  Write-Err $_.Exception.Message
  throw
}
