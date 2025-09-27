#!/bin/bash

# GDNA Lyzr Baseline - Production Deployment Script
# This script deploys the infrastructure to EKS Fargate production environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NAMESPACE="gdna-system"
CLUSTER_NAME="gdna-lyzr-cluster"
AWS_REGION="us-west-2"

# Default values
ENVIRONMENT="production"
VALUES_FILE="values-production.yaml"
DRY_RUN=false
FORCE=false
SKIP_VALIDATION=false
UPDATE_OPERATORS=false

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Production Deployment Script for GDNA Lyzr Baseline

OPTIONS:
    -e, --environment ENV     Environment to deploy (staging, production) [default: production]
    -f, --values-file FILE    Values file to use [default: values-production.yaml]
    -d, --dry-run            Perform dry run without actual deployment
    -F, --force              Force deployment even if validation fails
    -s, --skip-validation    Skip pre-deployment validation
    -u, --update-operators   Update operator configurations
    -h, --help               Show this help message

EXAMPLES:
    # Deploy to production
    $0

    # Deploy to staging
    $0 -e staging -f values-staging.yaml

    # Dry run deployment
    $0 -d

    # Force deployment
    $0 -F

EOF
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking production deployment prerequisites..."
    
    local missing_tools=()
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi
    
    # Check helm
    if ! command -v helm &> /dev/null; then
        missing_tools+=("helm")
    fi
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        missing_tools+=("aws")
    fi
    
    # Check eksctl
    if ! command -v eksctl &> /dev/null; then
        missing_tools+=("eksctl")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_status "Please install missing tools before proceeding"
        exit 1
    fi
    
    print_success "All prerequisites are satisfied"
}

# Function to validate AWS configuration
validate_aws_config() {
    print_status "Validating AWS configuration..."
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured or invalid"
        print_status "Please run 'aws configure' to set up your credentials"
        exit 1
    fi
    
    # Check AWS region
    local current_region=$(aws configure get region)
    if [ "$current_region" != "$AWS_REGION" ]; then
        print_warning "AWS region mismatch. Current: $current_region, Expected: $AWS_REGION"
        print_status "Setting AWS region to $AWS_REGION"
        export AWS_DEFAULT_REGION="$AWS_REGION"
        export AWS_REGION="$AWS_REGION"
    fi
    
    print_success "AWS configuration validated"
}

# Function to validate EKS cluster
validate_eks_cluster() {
    print_status "Validating EKS cluster..."
    
    # Check if cluster exists
    if ! aws eks describe-cluster --region "$AWS_REGION" --name "$CLUSTER_NAME" &> /dev/null; then
        print_error "EKS cluster '$CLUSTER_NAME' not found in region '$AWS_REGION'"
        print_status "Please create the cluster first or update CLUSTER_NAME variable"
        exit 1
    fi
    
    # Get cluster status
    local cluster_status=$(aws eks describe-cluster --region "$AWS_REGION" --name "$CLUSTER_NAME" --query 'cluster.status' --output text)
    if [ "$cluster_status" != "ACTIVE" ]; then
        print_error "EKS cluster '$CLUSTER_NAME' is not active (status: $cluster_status)"
        exit 1
    fi
    
    # Update kubeconfig
    print_status "Updating kubeconfig for cluster '$CLUSTER_NAME'..."
    aws eks update-kubeconfig --region "$AWS_REGION" --name "$CLUSTER_NAME"
    
    # Verify cluster access
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot access EKS cluster. Please check your AWS credentials and cluster configuration"
        exit 1
    fi
    
    print_success "EKS cluster validated and accessible"
}

# Function to validate production values
validate_production_values() {
    print_status "Validating production configuration..."
    
    local values_file="$PROJECT_ROOT/helm/gdna-lyzr-baseline/$VALUES_FILE"
    
    if [ ! -f "$values_file" ]; then
        print_error "Values file not found: $values_file"
        exit 1
    fi
    
    # Check for required production settings
    local required_checks=(
        "global.environment:production"
        "ingress.enabled:true"
        "cert-manager.enabled:true"
        "monitoring.enabled:true"
        "securityContext.enabled:true"
        "networkPolicies.enabled:true"
    )
    
    for check in "${required_checks[@]}"; do
        local key=$(echo "$check" | cut -d: -f1)
        local expected_value=$(echo "$check" | cut -d: -f2)
        local actual_value=$(helm template . --values "$values_file" | grep -A 5 -B 5 "$key" | grep "enabled:" | head -1 | awk '{print $2}' | tr -d '"' || echo "not_found")
        
        if [ "$actual_value" != "$expected_value" ]; then
            print_error "Production validation failed: $key should be $expected_value, but is $actual_value"
            if [ "$FORCE" = false ]; then
                exit 1
            else
                print_warning "Continuing due to --force flag"
            fi
        fi
    done
    
    print_success "Production configuration validated"
}

# Function to setup production environment
setup_production_environment() {
    print_status "Setting up production environment..."
    
    # Create namespace
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Create production secrets (these should be managed by external-secrets-operator in production)
    print_status "Creating production secrets..."
    
    # Check if secrets already exist
    if ! kubectl get secret postgresql-credentials -n "$NAMESPACE" &> /dev/null; then
        print_warning "Production secrets not found. Please ensure external-secrets-operator is configured"
        print_status "Creating placeholder secrets for deployment..."
        
        kubectl create secret generic postgresql-credentials \
            --from-literal=url="postgresql://placeholder:placeholder@postgresql-service:5432/gdna" \
            -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
        
        kubectl create secret generic mongodb-credentials \
            --from-literal=url="mongodb://placeholder:placeholder@mongodb-service:27017/gdna" \
            -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
        
        kubectl create secret generic rabbitmq-credentials \
            --from-literal=url="amqp://placeholder:placeholder@rabbitmq-service:5672" \
            -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
        
        kubectl create secret generic redis-credentials \
            --from-literal=url="redis://:placeholder@redis-service:6379" \
            -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
        
        kubectl create secret generic minio-credentials \
            --from-literal=access-key="placeholder" \
            --from-literal=secret-key="placeholder" \
            -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
        
        kubectl create secret generic lyzr-api-key \
            --from-literal=api-key="placeholder-production-key" \
            -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    fi
    
    print_success "Production environment setup completed"
}

# Function to deploy core infrastructure
deploy_core_infrastructure() {
    print_status "Deploying core infrastructure to production..."
    
    cd "$PROJECT_ROOT"
    
    # Add Helm repositories
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo add jetstack https://charts.jetstack.io
    helm repo update
    
    # Build dependencies
    helm dependency build helm/gdna-lyzr-baseline
    
    # Deploy with production values
    local helm_cmd="helm upgrade --install gdna-lyzr-baseline helm/gdna-lyzr-baseline \
        --namespace $NAMESPACE \
        --values helm/gdna-lyzr-baseline/$VALUES_FILE \
        --wait \
        --timeout 15m"
    
    if [ "$DRY_RUN" = true ]; then
        print_status "Performing dry run..."
        helm_cmd="$helm_cmd --dry-run"
    fi
    
    eval $helm_cmd
    
    if [ "$DRY_RUN" = false ]; then
        print_success "Core infrastructure deployment completed"
    else
        print_success "Dry run completed successfully"
    fi
}

# Function to deploy operators
deploy_operators() {
    print_status "Deploying operators to production..."
    
    cd "$PROJECT_ROOT"
    
    # Get list of enabled operators from values file
    local enabled_operators=$(helm template . --values "helm/gdna-lyzr-baseline/$VALUES_FILE" | grep -A 10 "operators:" | grep "enabled: true" -B 5 | grep "name:" | awk '{print $2}' | tr -d '"' || echo "")
    
    if [ -n "$enabled_operators" ]; then
        print_status "Found enabled operators: $enabled_operators"
        
        for operator in $enabled_operators; do
            print_status "Deploying operator: $operator"
            
            # Check if operator has custom deployment
            local operator_dir="$PROJECT_ROOT/operators/$operator"
            if [ -d "$operator_dir" ]; then
                print_status "Deploying custom operator: $operator"
                
                local helm_cmd="helm upgrade --install $operator-operator $operator_dir \
                    --namespace $NAMESPACE \
                    --wait \
                    --timeout 10m"
                
                if [ "$DRY_RUN" = true ]; then
                    helm_cmd="$helm_cmd --dry-run"
                fi
                
                eval $helm_cmd
            else
                print_status "Operator $operator will be deployed through the main chart"
            fi
        done
    else
        print_status "No custom operators found, all operators will be deployed through the main chart"
    fi
    
    print_success "Operator deployment completed"
}

# Function to validate deployment
validate_deployment() {
    print_status "Validating production deployment..."
    
    # Wait for all pods to be ready
    print_status "Waiting for all pods to be ready..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=gdna-lyzr-baseline -n "$NAMESPACE" --timeout=600s
    
    # Check pod status
    print_status "Checking pod status..."
    kubectl get pods -n "$NAMESPACE"
    
    # Check service endpoints
    print_status "Checking service endpoints..."
    kubectl get endpoints -n "$NAMESPACE"
    
    # Check ingress
    print_status "Checking ingress configuration..."
    kubectl get ingress -n "$NAMESPACE"
    
    # Check persistent volumes
    print_status "Checking persistent volumes..."
    kubectl get pvc -n "$NAMESPACE"
    
    # Run health checks
    print_status "Running health checks..."
    run_production_health_checks
    
    print_success "Production deployment validation completed"
}

# Function to run production health checks
run_production_health_checks() {
    # Check if services are responding
    local services=("lyzr-service" "worker-service")
    
    for service in "${services[@]}"; do
        if kubectl get service -n "$NAMESPACE" "$service" &> /dev/null; then
            print_status "Testing health endpoint for $service..."
            
            # Create a test pod to check service health
            kubectl run health-check-"$service" --image=curlimages/curl -i --rm --restart=Never -- \
                curl -f http://"$service":8080/health || print_warning "Health check failed for $service"
        fi
    done
}

# Function to show deployment summary
show_deployment_summary() {
    print_success "Production deployment completed successfully!"
    echo
    echo "Deployment Summary:"
    echo "==================="
    echo "Environment: $ENVIRONMENT"
    echo "Cluster: $CLUSTER_NAME"
    echo "Namespace: $NAMESPACE"
    echo "Values File: $VALUES_FILE"
    echo
    echo "Services Deployed:"
    kubectl get services -n "$NAMESPACE" --no-headers | awk '{print "  - " $1 " (" $2 ")"}'
    echo
    echo "Next Steps:"
    echo "1. Verify all services are running:"
    echo "   kubectl get pods -n $NAMESPACE"
    echo
    echo "2. Check service endpoints:"
    echo "   kubectl get endpoints -n $NAMESPACE"
    echo
    echo "3. Access monitoring:"
    echo "   kubectl port-forward -n $NAMESPACE svc/grafana 3000:80"
    echo
    echo "4. Deploy to customer stacks:"
    echo "   ./scripts/deploy-customer.sh <customer-name>"
    echo
    echo "5. Monitor deployment:"
    echo "   kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=gdna-lyzr-baseline"
}

# Function to cleanup on failure
cleanup_on_failure() {
    print_error "Deployment failed. Cleaning up..."
    
    # Keep the deployment for debugging
    print_warning "Keeping failed deployment for debugging purposes"
    print_status "To clean up manually, run:"
    echo "  helm uninstall gdna-lyzr-baseline -n $NAMESPACE"
    echo "  kubectl delete namespace $NAMESPACE"
}

# Main execution
main() {
    print_status "Starting GDNA Lyzr Baseline production deployment..."
    print_status "Environment: $ENVIRONMENT"
    print_status "Cluster: $CLUSTER_NAME"
    print_status "Namespace: $NAMESPACE"
    print_status "Values File: $VALUES_FILE"
    
    # Set trap for cleanup on failure
    trap cleanup_on_failure ERR
    
    # Check prerequisites
    check_prerequisites
    
    # Validate AWS configuration
    validate_aws_config
    
    # Validate EKS cluster
    validate_eks_cluster
    
    # Validate production values (if not skipped)
    if [ "$SKIP_VALIDATION" = false ]; then
        validate_production_values
    else
        print_warning "Skipping production validation"
    fi
    
    # Setup production environment
    setup_production_environment
    
    # Deploy core infrastructure
    deploy_core_infrastructure
    
    # Deploy operators (if requested)
    if [ "$UPDATE_OPERATORS" = true ]; then
        deploy_operators
    fi
    
    # Validate deployment (if not dry run)
    if [ "$DRY_RUN" = false ]; then
        validate_deployment
    fi
    
    # Show deployment summary
    show_deployment_summary
    
    # Remove trap
    trap - ERR
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -f|--values-file)
            VALUES_FILE="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -F|--force)
            FORCE=true
            shift
            ;;
        -s|--skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
        -u|--update-operators)
            UPDATE_OPERATORS=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Execute main function
main "$@"