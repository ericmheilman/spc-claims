import json
import os
import sys
import subprocess
import tempfile
import shutil

def handler(event, context):
    """
    AWS Lambda handler for Python roof adjustment engine
    """
    try:
        print(f"Received event: {json.dumps(event)}")
        
        # Parse the request body
        if 'body' in event:
            body = json.loads(event['body'])
        else:
            body = event
            
        line_items = body.get('line_items', [])
        roof_measurements = body.get('roof_measurements', {})
        
        print(f"Processing {len(line_items)} line items")
        print(f"Roof measurements: {roof_measurements}")
        
        # Load Roof Master Macro data
        roof_master_macro = {}
        try:
            # In Lambda, the CSV file should be in the same directory as the Lambda function
            csv_path = os.path.join(os.path.dirname(__file__), 'roof_master_macro.csv')
            if os.path.exists(csv_path):
                with open(csv_path, 'r') as f:
                    lines = f.readlines()
                    headers = lines[0].strip().split('\t')
                    
                    for i in range(1, len(lines)):
                        values = lines[i].strip().split('\t')
                        if len(values) >= 3:
                            roof_master_macro[values[0]] = {
                                'description': values[0],
                                'unit': values[1],
                                'unit_price': float(values[2]) if values[2] else 0
                            }
                print(f"Loaded Roof Master Macro data: {len(roof_master_macro)} items")
        except Exception as e:
            print(f"Could not load Roof Master Macro CSV: {e}")
        
        # Prepare input data for the roof adjustment engine
        input_data = {
            'line_items': line_items,
            'roof_measurements': roof_measurements,
            'roof_master_macro': roof_master_macro
        }
        
        # Create temporary files
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as input_file:
            json.dump(input_data, input_file, indent=2)
            input_path = input_file.name
            
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as output_file:
            output_path = output_file.name
        
        try:
            # Execute the roof adjustment engine
            script_path = os.path.join(os.path.dirname(__file__), 'roof_adjustment_engine.py')
            
            if not os.path.exists(script_path):
                raise Exception(f"Python script not found at {script_path}")
            
            print(f"Executing Python script: {script_path}")
            print(f"Input file: {input_path}")
            print(f"Output file: {output_path}")
            
            # Run the Python script
            result = subprocess.run([
                sys.executable, script_path,
                '--input', input_path,
                '--output', output_path
            ], capture_output=True, text=True, timeout=30)
            
            print(f"Python script stdout: {result.stdout}")
            if result.stderr:
                print(f"Python script stderr: {result.stderr}")
            
            if result.returncode != 0:
                raise Exception(f"Python script failed with return code {result.returncode}: {result.stderr}")
            
            # Read the results
            with open(output_path, 'r') as f:
                results = json.load(f)
            
            print("Python script executed successfully")
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'success': True,
                    'data': {
                        **results,
                        'debug_output': {
                            'execution_time': context.aws_request_id,
                            'stdout': result.stdout,
                            'stderr': result.stderr,
                            'engine_type': 'Python',
                            'processing_method': 'AWS Lambda Python runtime'
                        }
                    }
                })
            }
            
        finally:
            # Clean up temporary files
            try:
                os.unlink(input_path)
                os.unlink(output_path)
            except:
                pass
                
    except Exception as e:
        print(f"Error in Lambda handler: {str(e)}")
        
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'success': False,
                'error': f'Python Lambda function failed: {str(e)}',
                'debug': {
                    'message': str(e),
                    'engine_type': 'Python',
                    'processing_method': 'AWS Lambda Python runtime'
                }
            })
        }




