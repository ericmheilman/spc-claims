-- GDNA Baseline PostgreSQL Initialization
-- Creates basic database structure for development

-- Create database if not exists (handled by POSTGRES_DB)

-- Create basic tables for GDNA Baseline
CREATE TABLE IF NOT EXISTS health_checks (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details JSONB
);

CREATE TABLE IF NOT EXISTS metrics (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    labels JSONB
);

CREATE TABLE IF NOT EXISTS configurations (
    id SERIAL PRIMARY KEY,
    component VARCHAR(100) NOT NULL,
    config_key VARCHAR(200) NOT NULL,
    config_value TEXT,
    environment VARCHAR(50) DEFAULT 'development',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(component, config_key, environment)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_checks_service ON health_checks(service_name);
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON health_checks(status);
CREATE INDEX IF NOT EXISTS idx_metrics_service ON metrics(service_name);
CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_configurations_component ON configurations(component);

-- Insert initial data
INSERT INTO health_checks (service_name, status, details) 
VALUES ('postgresql', 'healthy', '{"message": "PostgreSQL initialized successfully"}')
ON CONFLICT DO NOTHING;

INSERT INTO configurations (component, config_key, config_value, environment)
VALUES 
    ('postgresql', 'max_connections', '200', 'development'),
    ('postgresql', 'shared_buffers', '128MB', 'development'),
    ('postgresql', 'effective_cache_size', '512MB', 'development')
ON CONFLICT (component, config_key, environment) DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gdna_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gdna_user;

-- Success message
SELECT 'GDNA Baseline PostgreSQL initialization complete!' as message;
