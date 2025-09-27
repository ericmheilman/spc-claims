#!/bin/bash

# GDNA Lyzr Baseline - Customer Deployment Script
# This script deploys the infrastructure to customer-specific environments

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
BASE_NAMESPACE="gdna-system"
AWS_REGION="us-west-2"

# Default values
CUSTOMER_NAME=""
ENVIRONMENT="production"
CLUSTER_NAME=""
VALUES_FILE=""
DRY_RUN=false
FORCE=false
SKIP_VALIDATION=false
UPDATE_OPERATORS=false
CUSTOM_CONFIG=""

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
Usage: $0 [OPTIONS] CUSTOMER_NAME

Customer Deployment Script for GDNA Lyzr Baseline

ARGUMENTS:
    CUSTOMER_NAME              Name of the customer to deploy to

OPTIONS:
    -e, --environment ENV     Environment to deploy (staging, production) [default: production]
    -c, --cluster CLUSTER     EKS cluster name [default: gdna-{customer}-cluster]
    -f, --values-file FILE    Custom values file to use
    -C, --config CONFIG       Custom configuration file
    -d, --dry-run            Perform dry run without actual deployment
    -F, --force              Force deployment even if validation fails
    -s, --skip-validation    Skip pre-deployment validation
    -u, --update-operators   Update operator configurations
    -h, --help               Show this help message

EXAMPLES:
    # Deploy to customer 'acme-corp'
    $0 acme-corp

    # Deploy to customer 'tech-startup' with custom cluster
    $0 -c my-custom-cluster tech-startup

    # Deploy to customer 'enterprise' with custom values
    $0 -f values-enterprise.yaml enterprise

    # Dry run deployment to customer 'startup'
    $0 -d startup

EOF
}

# Function to validate customer name
validate_customer_name() {
    if [ -z "$CUSTOMER_NAME" ]; then
        print_error "Customer name is required"
        show_usage
        exit 1
    fi
    
    # Validate customer name format (alphanumeric and hyphens only)
    if [[ ! "$CUSTOMER_NAME" =~ ^[a-z0-9-]+$ ]]; then
        print_error "Customer name must contain only lowercase letters, numbers, and hyphens"
        exit 1
    fi
    
    # Set default cluster name if not provided
    if [ -z "$CLUSTER_NAME" ]; then
        CLUSTER_NAME="gdna-${CUSTOMER_NAME}-cluster"
    fi
    
    # Set default namespace
    NAMESPACE="${BASE_NAMESPACE}-${CUSTOMER_NAME}"
    
    print_success "Customer deployment configured for: $CUSTOMER_NAME"
    print_status "Cluster: $CLUSTER_NAME"
    print_status "Namespace: $NAMESPACE"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking customer deployment prerequisites..."
    
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
    print_status "Validating EKS cluster for customer: $CUSTOMER_NAME..."
    
    # Check if cluster exists
    if ! aws eks describe-cluster --region "$AWS_REGION" --name "$CLUSTER_NAME" &> /dev/null; then
        print_error "EKS cluster '$CLUSTER_NAME' not found in region '$AWS_REGION'"
        print_status "Please create the cluster first or update the cluster name"
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

# Function to setup customer environment
setup_customer_environment() {
    print_status "Setting up customer environment: $CUSTOMER_NAME..."
    
    # Create customer namespace
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Create customer-specific secrets
    print_status "Creating customer secrets..."
    
    # Check if secrets already exist
    if ! kubectl get secret postgresql-credentials -n "$NAMESPACE" &> /dev/null; then
        print_warning "Customer secrets not found. Creating placeholder secrets..."
        
        kubectl create secret generic postgresql-credentials \
            --from-literal=url="postgresql://${CUSTOMER_NAME}_user:${CUSTOMER_NAME}-password@postgresql-service:5432/${CUSTOMER_NAME}_db" \
            -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
        
        kubectl create secret generic mongodb-credentials \
            --from-literal=url="mongodb://${CUSTOMER_NAME}_user:${CUSTOMER_NAME}-password@mongodb-service:27017/${CUSTOMER_NAME}_db" \
            -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
        
        kubectl create secret generic rabbitmq-credentials \
            --from-literal=url="amqp://${CUSTOMER_NAME}_user:${CUSTOMER_NAME}-password@rabbitmq-service:5672" \
            -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
        
        kubectl create secret generic redis-credentials \
            --from-literal=url="redis://:${CUSTOMER_NAME}-password@redis-service:6379" \
            -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
        
        kubectl create secret generic minio-credentials \
            --from-literal=access-key="${CUSTOMER_NAME}-access" \
            --from-literal=secret-key="${CUSTOMER_NAME}-secret-key" \
            -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
        
        kubectl create secret generic lyzr-api-key \
            --from-literal=api-key="${CUSTOMER_NAME}-api-key-$(date +%s)" \
            -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
        
        # Create customer-specific OpenSearch credentials
        kubectl create secret generic opensearch-credentials \
            --from-literal=username="${CUSTOMER_NAME}_admin" \
            --from-literal=password="${CUSTOMER_NAME}-opensearch-password" \
            -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    fi
    
    print_success "Customer environment setup completed"
}

# Function to create customer-specific values
create_customer_values() {
    print_status "Creating customer-specific values for: $CUSTOMER_NAME..."
    
    # Create customer values directory
    local customer_values_dir="$PROJECT_ROOT/customers/$CUSTOMER_NAME"
    mkdir -p "$customer_values_dir"
    
    # Create customer values file
    local customer_values_file="$customer_values_dir/values.yaml"
    
    # Start with base production values
    if [ -n "$VALUES_FILE" ] && [ -f "$VALUES_FILE" ]; then
        cp "$VALUES_FILE" "$customer_values_file"
    else
        cp "$PROJECT_ROOT/helm/gdna-lyzr-baseline/values-production.yaml" "$customer_values_file"
    fi
    
    # Apply customer-specific overrides
    cat << EOF >> "$customer_values_file"

# Customer-specific overrides for $CUSTOMER_NAME
global:
  customer: "$CUSTOMER_NAME"
  environment: "$ENVIRONMENT"

# Customer-specific namespace
namespace: "$NAMESPACE"

# Customer-specific ingress configuration
ingress:
  hosts:
    - host: "${CUSTOMER_NAME}.gdna.lyzr.ai"
      paths:
        - path: /
          pathType: Prefix

# Customer-specific resource limits
lyzrService:
  resources:
    limits:
      cpu: 1000m
      memory: 2Gi
    requests:
      cpu: 500m
      memory: 1Gi

workerServices:
  resources:
    limits:
      cpu: 2000m
      memory: 4Gi
    requests:
      cpu: 1000m
      memory: 2Gi

# Customer-specific operator configuration
operators:
  # Enable only required operators for this customer
  pinecone:
    enabled: true
    config:
      customer: "$CUSTOMER_NAME"
      environment: "$ENVIRONMENT"
  
  neo4j:
    enabled: true
    config:
      customer: "$CUSTOMER_NAME"
      environment: "$ENVIRONMENT"
  
  # Disable unused operators
  weaviate:
    enabled: false
  
  qdrant:
    enabled: false
  
  arangodb:
    enabled: false
  
  milvus:
    enabled: false

# Customer-specific monitoring
monitoring:
  grafana:
    adminPassword: "${CUSTOMER_NAME}-grafana-password"
  
  prometheus:
    retention: "30d"

# Customer-specific security
securityContext:
  runAsUser: 1000
  runAsGroup: 1000
  fsGroup: 1000

# Customer-specific network policies
networkPolicies:
  enabled: true
  allowedNamespaces:
    - "$NAMESPACE"
    - "kube-system"
EOF
    
    # Apply custom configuration if provided
    if [ -n "$CUSTOM_CONFIG" ] && [ -f "$CUSTOM_CONFIG" ]; then
        print_status "Applying custom configuration from: $CUSTOM_CONFIG"
        cat "$CUSTOM_CONFIG" >> "$customer_values_file"
    fi
    
    print_success "Customer values created: $customer_values_file"
    VALUES_FILE="$customer_values_file"
}

# Function to deploy customer infrastructure
deploy_customer_infrastructure() {
    print_status "Deploying infrastructure to customer: $CUSTOMER_NAME..."
    
    cd "$PROJECT_ROOT"
    
    # Add Helm repositories
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo add jetstack https://charts.jetstack.io
    helm repo update
    
    # Build dependencies
    helm dependency build helm/gdna-lyzr-baseline
    
    # Deploy with customer values
    local helm_cmd="helm upgrade --install gdna-lyzr-baseline-${CUSTOMER_NAME} helm/gdna-lyzr-baseline \
        --namespace $NAMESPACE \
        --values $VALUES_FILE \
        --wait \
        --timeout 15m"
    
    if [ "$DRY_RUN" = true ]; then
        print_status "Performing dry run..."
        helm_cmd="$helm_cmd --dry-run"
    fi
    
    eval $helm_cmd
    
    if [ "$DRY_RUN" = false ]; then
        print_success "Customer infrastructure deployment completed"
    else
        print_success "Dry run completed successfully"
    fi
}

# Function to deploy customer operators
deploy_customer_operators() {
    print_status "Deploying operators for customer: $CUSTOMER_NAME..."
    
    cd "$PROJECT_ROOT"
    
    # Get list of enabled operators from customer values
    local enabled_operators=$(helm template . --values "$VALUES_FILE" | grep -A 10 "operators:" | grep "enabled: true" -B 5 | grep "name:" | awk '{print $2}' | tr -d '"' || echo "")
    
    if [ -n "$enabled_operators" ]; then
        print_status "Found enabled operators for $CUSTOMER_NAME: $enabled_operators"
        
        for operator in $enabled_operators; do
            print_status "Deploying operator: $operator"
            
            # Check if operator has custom deployment
            local operator_dir="$PROJECT_ROOT/operators/$operator"
            if [ -d "$operator_dir" ]; then
                print_status "Deploying custom operator: $operator"
                
                local helm_cmd="helm upgrade --install $operator-operator-${CUSTOMER_NAME} $operator_dir \
                    --namespace $NAMESPACE \
                    --values $VALUES_FILE \
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
        print_status "No custom operators found for $CUSTOMER_NAME"
    fi
    
    print_success "Customer operator deployment completed"
}

# Function to validate customer deployment
validate_customer_deployment() {
    print_status "Validating customer deployment: $CUSTOMER_NAME..."
    
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
    
    # Run customer-specific health checks
    print_status "Running customer health checks..."
    run_customer_health_checks
    
    print_success "Customer deployment validation completed"
}

# Function to run customer health checks
run_customer_health_checks() {
    # Check if services are responding
    local services=("lyzr-service" "worker-service")
    
    for service in "${services[@]}"; do
        if kubectl get service -n "$NAMESPACE" "$service" &> /dev/null; then
            print_status "Testing health endpoint for $service..."
            
            # Create a test pod to check service health
            kubectl run health-check-"$service"-"$CUSTOMER_NAME" --image=curlimages/curl -i --rm --restart=Never -- \
                curl -f http://"$service":8080/health || print_warning "Health check failed for $service"
        fi
    done
    
    # Check customer-specific operators
    local enabled_operators=$(helm template . --values "$VALUES_FILE" | grep -A 10 "operators:" | grep "enabled: true" -B 5 | grep "name:" | awk '{print $2}' | tr -d '"' || echo "")
    
    for operator in $enabled_operators; do
        if kubectl get service -n "$NAMESPACE" "$operator-operator" &> /dev/null; then
            print_status "Testing operator: $operator"
            
            # Test operator health endpoint
            kubectl run health-check-"$operator"-"$CUSTOMER_NAME" --image=curlimages/curl -i --rm --restart=Never -- \
                curl -f http://"$operator-operator":8080/health || print_warning "Health check failed for operator $operator"
        fi
    done
}

# Function to show customer deployment summary
show_customer_deployment_summary() {
    print_success "Customer deployment completed successfully!"
    echo
    echo "Customer Deployment Summary:"
    echo "============================"
    echo "Customer: $CUSTOMER_NAME"
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
    echo "3. Access customer monitoring:"
    echo "   kubectl port-forward -n $NAMESPACE svc/grafana 3000:80"
    echo
    echo "4. Test customer ingress:"
    echo "   curl -H 'Host: ${CUSTOMER_NAME}.gdna.lyzr.ai' http://localhost"
    echo
    echo "5. Monitor customer deployment:"
    echo "   kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=gdna-lyzr-baseline"
    echo
    echo "6. Deploy to another customer:"
    echo "   ./scripts/deploy-customer.sh <another-customer-name>"
}

# Function to cleanup on failure
cleanup_on_failure() {
    print_error "Customer deployment failed. Cleaning up..."
    
    # Keep the deployment for debugging
    print_warning "Keeping failed deployment for debugging purposes"
    print_status "To clean up manually, run:"
    echo "  helm uninstall gdna-lyzr-baseline-${CUSTOMER_NAME} -n $NAMESPACE"
    echo "  kubectl delete namespace $NAMESPACE"
}

# Main execution
main() {
    print_status "Starting GDNA Lyzr Baseline customer deployment..."
    print_status "Customer: $CUSTOMER_NAME"
    print_status "Environment: $ENVIRONMENT"
    print_status "Cluster: $CLUSTER_NAME"
    print_status "Namespace: $NAMESPACE"
    
    # Set trap for cleanup on failure
    trap cleanup_on_failure ERR
    
    # Validate customer name
    validate_customer_name
    
    # Check prerequisites
    check_prerequisites
    
    # Validate AWS configuration
    validate_aws_config
    
    # Validate EKS cluster
    validate_eks_cluster
    
    # Setup customer environment
    setup_customer_environment
    
    # Create customer-specific values
    create_customer_values
    
    # Deploy customer infrastructure
    deploy_customer_infrastructure
    
    # Deploy customer operators (if requested)
    if [ "$UPDATE_OPERATORS" = true ]; then
        deploy_customer_operators
    fi
    
    # Validate deployment (if not dry run)
    if [ "$DRY_RUN" = false ]; then
        validate_customer_deployment
    fi
    
    # Show deployment summary
    show_customer_deployment_summary
    
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
        -c|--cluster)
            CLUSTER_NAME="$2"
            shift 2
            ;;
        -f|--values-file)
            VALUES_FILE="$2"
            shift 2
            ;;
        -C|--config)
            CUSTOM_CONFIG="$2"
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
        -*)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
        *)
            if [ -z "$CUSTOMER_NAME" ]; then
                CUSTOMER_NAME="$1"
            else
                print_error "Multiple customer names specified: $CUSTOMER_NAME and $1"
                exit 1
            fi
            shift
            ;;
    esac
done

# Execute main function
main "$@"