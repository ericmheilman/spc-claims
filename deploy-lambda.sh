#!/bin/bash

# Create deployment package for Lambda function
echo "Creating Lambda deployment package..."

# Create temp directory
mkdir -p lambda-deployment
cd lambda-deployment

# Copy Python files
cp ../roof_adjustment_engine.py .
cp ../roof_master_macro.csv .

# Create Lambda handler
cat > index.py << 'EOF'
import json
import csv
import os
import sys
import subprocess

def handler(event, context):
    try:
        print(f"Lambda event: {json.dumps(event)}")
        
        # Parse the request body
        if 'body' in event:
            body = json.loads(event['body'])
        else:
            body = event
            
        line_items = body.get('line_items', [])
        roof_measurements = body.get('roof_measurements', {})
        
        # Load Roof Master Macro data
        roof_master_macro_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'roof_master_macro.csv')
        roof_master_macro_data = {}
        
        try:
            with open(roof_master_macro_path, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    roof_master_macro_data[row['description']] = {
                        'description': row['description'],
                        'unit': row['unit'],
                        'unit_price': float(row['unit_price'])
                    }
            print(f"Loaded Roof Master Macro data: {len(roof_master_macro_data)} items")
        except FileNotFoundError:
            print(f"Warning: roof_master_macro.csv not found at {roof_master_macro_path}")
        except Exception as e:
            print(f"Error loading Roof Master Macro: {e}")
        
        # Prepare input for the Python script
        python_input = {
            'line_items': line_items,
            'roof_measurements': roof_measurements,
            'roof_master_macro': roof_master_macro_data
        }
        
        # Write input to a temporary file
        input_file_path = "/tmp/input.json"
        with open(input_file_path, "w") as f:
            json.dump(python_input, f)
        
        output_file_path = "/tmp/output.json"
        
        # Execute the Python script
        script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'roof_adjustment_engine.py')
        print(f"Executing Python script: {script_path}")
        
        command = [
            sys.executable,
            script_path,
            '--input', input_file_path,
            '--output', output_file_path
        ]
        
        process = subprocess.run(command, capture_output=True, text=True, check=True)
        print(f"Python script stdout:\n{process.stdout}")
        if process.stderr:
            print(f"Python script stderr:\n{process.stderr}")
        
        # Read output from the temporary file
        with open(output_file_path, "r") as f:
            results = json.load(f)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'success': True, 'data': results})
        }
        
    except subprocess.CalledProcessError as e:
        print(f"Python script failed with exit code {e.returncode}")
        print(f"Stdout: {e.stdout}")
        print(f"Stderr: {e.stderr}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'success': False, 'error': f"Python script execution failed: {e.stderr}"})
        }
    except Exception as e:
        print(f"Error in Lambda handler: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'success': False, 'error': str(e)})
        }
EOF

# Create deployment zip
zip -r roof-adjustment-lambda.zip .

echo "✅ Lambda deployment package created: roof-adjustment-lambda.zip"
echo ""
echo "Next steps:"
echo "1. Go to AWS Lambda console"
echo "2. Create a new function with Python 3.9 runtime"
echo "3. Upload roof-adjustment-lambda.zip"
echo "4. Set handler to 'index.handler'"
echo "5. Create a Function URL"
echo "6. Update ROOF_ADJUSTMENT_LAMBDA_URL environment variable in Amplify"

cd ..



