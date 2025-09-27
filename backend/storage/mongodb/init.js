// GDNA Baseline MongoDB Initialization
// Creates basic collections and indexes for development

// Switch to gdna_baseline database
db = db.getSiblingDB('gdna_baseline');

// Create collections
db.createCollection('health_checks');
db.createCollection('metrics');
db.createCollection('configurations');
db.createCollection('logs');

// Create indexes for performance
db.health_checks.createIndex({ "service_name": 1 });
db.health_checks.createIndex({ "status": 1 });
db.health_checks.createIndex({ "checked_at": -1 });

db.metrics.createIndex({ "service_name": 1 });
db.metrics.createIndex({ "metric_name": 1 });
db.metrics.createIndex({ "recorded_at": -1 });

db.configurations.createIndex({ "component": 1, "config_key": 1, "environment": 1 }, { unique: true });

db.logs.createIndex({ "timestamp": -1 });
db.logs.createIndex({ "level": 1 });
db.logs.createIndex({ "service": 1 });

// Insert initial data
db.health_checks.insertOne({
    service_name: "mongodb",
    status: "healthy",
    checked_at: new Date(),
    details: { message: "MongoDB initialized successfully" }
});

db.configurations.insertMany([
    {
        component: "mongodb",
        config_key: "max_connections",
        config_value: "1000",
        environment: "development",
        created_at: new Date()
    },
    {
        component: "mongodb", 
        config_key: "cache_size",
        config_value: "256MB",
        environment: "development",
        created_at: new Date()
    }
]);

// Create user for application
db.createUser({
    user: "gdna_user",
    pwd: "dev_password",
    roles: [
        { role: "readWrite", db: "gdna_baseline" },
        { role: "dbAdmin", db: "gdna_baseline" }
    ]
});

print("GDNA Baseline MongoDB initialization complete!");
