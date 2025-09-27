#!/bin/bash

# GDNA Lyzr Baseline - Development Setup Script
# This script sets up a complete local development environment for testing
# infrastructure changes and new operators before deploying to EKS Fargate

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
CLUSTER_NAME="gdna-local"

# Default values
ENVIRONMENT="local"
OPERATOR_NAME=""
SKIP_INFRA=false
SKIP_OPERATORS=false
SKIP_TESTS=false
CLEANUP=false

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

Development Setup Script for GDNA Lyzr Baseline

OPTIONS:
    -e, --environment ENV     Environment to setup (local, staging, production) [default: local]
    -o, --operator NAME       Specific operator to test (optional)
    -s, --skip-infra         Skip infrastructure setup
    -S, --skip-operators     Skip operator deployment
    -t, --skip-tests         Skip integration tests
    -c, --cleanup            Clean up local resources after setup
    -h, --help               Show this help message

EXAMPLES:
    # Full local development setup
    $0

    # Setup with specific operator testing
    $0 -o pinecone

    # Setup without infrastructure (reuse existing)
    $0 -s

    # Clean setup with cleanup
    $0 -c

EOF
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing_tools=()
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi
    
    # Check helm
    if ! command -v helm &> /dev/null; then
        missing_tools+=("helm")
    fi
    
    # Check docker
    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi
    
    # Check for local Kubernetes cluster
    if ! kubectl cluster-info &> /dev/null; then
        missing_tools+=("local-kubernetes-cluster")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_status "Please install missing tools and ensure a local Kubernetes cluster is running"
        exit 1
    fi
    
    print_success "All prerequisites are satisfied"
}

# Function to setup local Kubernetes cluster
setup_local_cluster() {
    print_status "Setting up local Kubernetes cluster..."
    
    if kubectl cluster-info &> /dev/null; then
        print_warning "Kubernetes cluster already running, checking if it's suitable..."
        
        # Check if it's our development cluster
        if kubectl get nodes -o jsonpath='{.items[*].metadata.labels}' | grep -q "gdna-local"; then
            print_success "Using existing gdna-local cluster"
            return 0
        else
            print_warning "Different cluster detected. Consider using --skip-infra if you want to reuse it"
        fi
    fi
    
    # Try to start minikube
    if command -v minikube &> /dev/null; then
        print_status "Starting minikube cluster..."
        minikube start \
            --driver=docker \
            --cpus=4 \
            --memory=8192 \
            --disk-size=20g \
            --addons=ingress \
            --addons=metrics-server \
            --profile="$CLUSTER_NAME"
        
        # Enable ingress addon
        minikube addons enable ingress --profile="$CLUSTER_NAME"
        
    # Try to start kind
    elif command -v kind &> /dev/null; then
        print_status "Starting kind cluster..."
        
        # Create kind cluster configuration
        cat << EOF > "$PROJECT_ROOT/kind-cluster.yaml"
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: $CLUSTER_NAME
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true,cluster=gdna-local"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
- role: worker
- role: worker
EOF
        
        kind create cluster --config "$PROJECT_ROOT/kind-cluster.yaml"
        
        # Install nginx-ingress
        kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
        
        # Wait for ingress controller
        kubectl wait --namespace ingress-nginx \
            --for=condition=ready pod \
            --selector=app.kubernetes.io/component=controller \
            --timeout=120s
            
    else
        print_error "Neither minikube nor kind found. Please install one of them."
        exit 1
    fi
    
    print_success "Local Kubernetes cluster setup completed"
}

# Function to setup development namespace and secrets
setup_development_environment() {
    print_status "Setting up development environment..."
    
    # Create namespace
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Create development secrets
    kubectl create secret generic postgresql-credentials \
        --from-literal=url="postgresql://gdna_user:dev-password@postgresql-service:5432/gdna" \
        -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    kubectl create secret generic mongodb-credentials \
        --from-literal=url="mongodb://gdna_user:dev-password@mongodb-service:27017/gdna" \
        -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    kubectl create secret generic rabbitmq-credentials \
        --from-literal=url="amqp://gdna_user:dev-password@rabbitmq-service:5672" \
        -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    kubectl create secret generic redis-credentials \
        --from-literal=url="redis://:dev-password@redis-service:6379" \
        -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    kubectl create secret generic minio-credentials \
        --from-literal=access-key="minioadmin" \
        --from-literal=secret-key="dev-password" \
        -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    kubectl create secret generic lyzr-api-key \
        --from-literal=api-key="dev-api-key-$(date +%s)" \
        -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    print_success "Development environment setup completed"
}

# Function to deploy core infrastructure
deploy_core_infrastructure() {
    print_status "Deploying core infrastructure..."
    
    cd "$PROJECT_ROOT"
    
    # Add Helm repositories
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo add jetstack https://charts.jetstack.io
    helm repo update
    
    # Build dependencies
    helm dependency build helm/gdna-lyzr-baseline
    
    # Deploy with development values
    helm upgrade --install gdna-lyzr-baseline helm/gdna-lyzr-baseline \
        --namespace "$NAMESPACE" \
        --values helm/gdna-lyzr-baseline/values-dev.yaml \
        --wait \
        --timeout 10m
    
    print_success "Core infrastructure deployment completed"
}

# Function to deploy and test operators
deploy_operators() {
    print_status "Deploying and testing operators..."
    
    cd "$PROJECT_ROOT"
    
    if [ -n "$OPERATOR_NAME" ]; then
        print_status "Testing specific operator: $OPERATOR_NAME"
        test_specific_operator "$OPERATOR_NAME"
    else
        print_status "Testing all enabled operators..."
        test_all_operators
    fi
    
    print_success "Operator testing completed"
}

# Function to test specific operator
test_specific_operator() {
    local operator_name="$1"
    
    print_status "Testing operator: $operator_name"
    
    # Check if operator is deployed
    if ! kubectl get deployment -n "$NAMESPACE" | grep -q "$operator_name"; then
        print_warning "Operator $operator_name not found. Deploying..."
        deploy_custom_operator "$operator_name"
    fi
    
    # Wait for operator to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/"$operator_name"-operator -n "$NAMESPACE"
    
    # Test operator health
    test_operator_health "$operator_name"
    
    # Run operator-specific tests
    run_operator_tests "$operator_name"
}

# Function to test all operators
test_all_operators() {
    print_status "Testing all deployed operators..."
    
    # Get list of deployed operators
    local operators=$(kubectl get deployments -n "$NAMESPACE" -l app.kubernetes.io/component -o jsonpath='{.items[*].metadata.labels.app\.kubernetes\.io/component}' | tr ' ' '\n' | grep -E '.*-operator$' | sed 's/-operator$//')
    
    for operator in $operators; do
        print_status "Testing operator: $operator"
        test_operator_health "$operator"
        run_operator_tests "$operator"
    done
}

# Function to test operator health
test_operator_health() {
    local operator_name="$1"
    
    print_status "Testing health endpoints for $operator_name..."
    
    # Get operator service
    local service_name="$operator_name-operator"
    
    # Test health endpoint
    if kubectl get service -n "$NAMESPACE" "$service_name" &> /dev/null; then
        # Port forward to test locally
        kubectl port-forward -n "$NAMESPACE" svc/"$service_name" 8080:8080 &
        local port_forward_pid=$!
        
        # Wait for port forward
        sleep 5
        
        # Test health endpoint
        if curl -f http://localhost:8080/health &> /dev/null; then
            print_success "$operator_name health check passed"
        else
            print_warning "$operator_name health check failed"
        fi
        
        # Kill port forward
        kill $port_forward_pid 2>/dev/null || true
    else
        print_warning "Service for $operator_name not found"
    fi
}

# Function to run operator-specific tests
run_operator_tests() {
    local operator_name="$1"
    
    print_status "Running tests for $operator_name..."
    
    # Check if test script exists
    local test_script="$PROJECT_ROOT/tests/test-$operator_name.sh"
    if [ -f "$test_script" ]; then
        print_status "Running custom tests for $operator_name..."
        bash "$test_script"
    else
        print_status "No custom tests found for $operator_name, running basic tests..."
        run_basic_operator_tests "$operator_name"
    fi
}

# Function to run basic operator tests
run_basic_operator_tests() {
    local operator_name="$1"
    
    # Basic connectivity test
    kubectl run test-"$operator_name" --image=curlimages/curl -i --rm --restart=Never -- \
        curl -f http://"$operator_name"-operator:8080/health || print_warning "Basic connectivity test failed for $operator_name"
    
    # Resource usage check
    kubectl top pod -l app.kubernetes.io/component="$operator_name"-operator -n "$NAMESPACE" 2>/dev/null || print_warning "Resource monitoring not available for $operator_name"
}

# Function to deploy custom operator
deploy_custom_operator() {
    local operator_name="$1"
    
    print_status "Deploying custom operator: $operator_name"
    
    # Check if operator configuration exists
    local operator_config="$PROJECT_ROOT/operators/$operator_name/values.yaml"
    if [ -f "$operator_config" ]; then
        # Deploy custom operator
        helm upgrade --install "$operator_name"-operator "$PROJECT_ROOT/operators/$operator_name" \
            --namespace "$NAMESPACE" \
            --values "$operator_config" \
            --wait \
            --timeout 5m
    else
        print_warning "No configuration found for operator $operator_name"
        print_status "Creating basic operator configuration..."
        create_basic_operator_config "$operator_name"
    fi
}

# Function to create basic operator configuration
create_basic_operator_config() {
    local operator_name="$1"
    
    # Create operator directory
    mkdir -p "$PROJECT_ROOT/operators/$operator_name"
    
    # Create basic values.yaml
    cat << EOF > "$PROJECT_ROOT/operators/$operator_name/values.yaml"
# Basic configuration for $operator_name operator
replicaCount: 1

image:
  repository: "your-registry/$operator_name"
  tag: "latest"
  pullPolicy: "Always"

resources:
  limits:
    cpu: 500m
    memory: 1Gi
  requests:
    cpu: 250m
    memory: 512Mi

service:
  port: 8080
  type: ClusterIP

config:
  operator_name: "$operator_name"
  environment: "development"
EOF
    
    # Create basic Chart.yaml
    cat << EOF > "$PROJECT_ROOT/operators/$operator_name/Chart.yaml"
apiVersion: v2
name: $operator_name-operator
description: Custom operator for $operator_name
type: application
version: 0.1.0
appVersion: "1.0.0"
EOF
    
    # Create basic deployment template
    mkdir -p "$PROJECT_ROOT/operators/$operator_name/templates"
    cat << EOF > "$PROJECT_ROOT/operators/$operator_name/templates/deployment.yaml"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "$operator_name-operator.fullname" . }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ include "$operator_name-operator.name" . }}
  template:
    metadata:
      labels:
        app: {{ include "$operator_name-operator.name" . }}
    spec:
      containers:
        - name: $operator_name
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.service.port }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          env:
            - name: OPERATOR_NAME
              value: "{{ .Values.config.operator_name }}"
            - name: ENVIRONMENT
              value: "{{ .Values.config.environment }}"
          livenessProbe:
            httpGet:
              path: /health
              port: {{ .Values.service.port }}
          readinessProbe:
            httpGet:
              path: /ready
              port: {{ .Values.service.port }}
EOF
    
    # Create basic service template
    cat << EOF > "$PROJECT_ROOT/operators/$operator_name/templates/service.yaml"
apiVersion: v1
kind: Service
metadata:
  name: {{ include "$operator_name-operator.fullname" . }}
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: {{ .Values.service.port }}
      protocol: TCP
  selector:
    app: {{ include "$operator_name-operator.name" . }}
EOF
    
    print_success "Basic operator configuration created for $operator_name"
    print_status "Please customize the configuration and rebuild the operator image"
}

# Function to run integration tests
run_integration_tests() {
    print_status "Running integration tests..."
    
    cd "$PROJECT_ROOT"
    
    # Check if test directory exists
    if [ -d "tests" ]; then
        # Run all test scripts
        for test_script in tests/test-*.sh; do
            if [ -f "$test_script" ]; then
                print_status "Running $test_script..."
                bash "$test_script"
            fi
        done
    else
        print_warning "No tests directory found, creating basic tests..."
        create_basic_tests
    fi
    
    print_success "Integration tests completed"
}

# Function to create basic tests
create_basic_tests() {
    mkdir -p "$PROJECT_ROOT/tests"
    
    # Create basic health check test
    cat << 'EOF' > "$PROJECT_ROOT/tests/test-health.sh"
#!/bin/bash
# Basic health check test

set -e

NAMESPACE="gdna-system"

echo "Running basic health checks..."

# Check if all pods are running
echo "Checking pod status..."
kubectl get pods -n "$NAMESPACE"

# Check if all services are available
echo "Checking service endpoints..."
kubectl get endpoints -n "$NAMESPACE"

# Check if all deployments are available
echo "Checking deployment status..."
kubectl get deployments -n "$NAMESPACE"

echo "Basic health checks completed"
EOF
    
    chmod +x "$PROJECT_ROOT/tests/test-health.sh"
    
    print_success "Basic tests created"
}

# Function to cleanup local resources
cleanup_local_resources() {
    print_status "Cleaning up local resources..."
    
    if [ "$CLEANUP" = true ]; then
        # Delete Helm release
        helm uninstall gdna-lyzr-baseline -n "$NAMESPACE" 2>/dev/null || true
        
        # Delete namespace
        kubectl delete namespace "$NAMESPACE" 2>/dev/null || true
        
        # Stop minikube if it was started
        if command -v minikube &> /dev/null; then
            minikube stop --profile="$CLUSTER_NAME" 2>/dev/null || true
        fi
        
        # Delete kind cluster if it was created
        if command -v kind &> /dev/null; then
            kind delete cluster --name="$CLUSTER_NAME" 2>/dev/null || true
        fi
        
        print_success "Local resources cleaned up"
    else
        print_status "Skipping cleanup (use --cleanup to enable)"
    fi
}

# Function to show next steps
show_next_steps() {
    print_success "Development setup completed successfully!"
    echo
    echo "Next steps:"
    echo "1. Test your operators locally:"
    echo "   kubectl get pods -n $NAMESPACE"
    echo "   kubectl logs -n $NAMESPACE -l app.kubernetes.io/component=lyzr-service"
    echo
    echo "2. Access services locally:"
    echo "   kubectl port-forward -n $NAMESPACE svc/lyzr-service 8080:8080"
    echo "   curl http://localhost:8080/health"
    echo
    echo "3. Deploy to production:"
    echo "   ./scripts/deploy-production.sh"
    echo
    echo "4. Deploy to customer stacks:"
    echo "   ./scripts/deploy-customer.sh <customer-name>"
    echo
    echo "5. Clean up when done:"
    echo "   ./scripts/dev-setup.sh --cleanup"
}

# Main execution
main() {
    print_status "Starting GDNA Lyzr Baseline development setup..."
    print_status "Environment: $ENVIRONMENT"
    print_status "Namespace: $NAMESPACE"
    
    # Check prerequisites
    check_prerequisites
    
    # Setup local cluster (if not skipped)
    if [ "$SKIP_INFRA" = false ]; then
        setup_local_cluster
        setup_development_environment
        deploy_core_infrastructure
    else
        print_status "Skipping infrastructure setup"
    fi
    
    # Deploy and test operators (if not skipped)
    if [ "$SKIP_OPERATORS" = false ]; then
        deploy_operators
    else
        print_status "Skipping operator deployment"
    fi
    
    # Run integration tests (if not skipped)
    if [ "$SKIP_TESTS" = false ]; then
        run_integration_tests
    else
        print_status "Skipping integration tests"
    fi
    
    # Cleanup if requested
    cleanup_local_resources
    
    # Show next steps
    show_next_steps
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -o|--operator)
            OPERATOR_NAME="$2"
            shift 2
            ;;
        -s|--skip-infra)
            SKIP_INFRA=true
            shift
            ;;
        -S|--skip-operators)
            SKIP_OPERATORS=true
            shift
            ;;
        -t|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -c|--cleanup)
            CLEANUP=true
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