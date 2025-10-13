#!/usr/bin/env python3
"""
Integration Example for Roof Adjustment Engine

This script demonstrates how to integrate the roof adjustment engine
with your web application's data structures.
"""

import json
import sys
import os
from roof_adjustment_engine import RoofAdjustmentEngine, LineItem, RoofMeasurements


def convert_webapp_data_to_engine_format(webapp_data):
    """
    Convert data from your web application format to the engine format.
    
    Args:
        webapp_data: Dictionary containing 'claim' and 'roofReport' data
        
    Returns:
        Tuple of (line_items, roof_measurements)
    """
    
    # Extract line items from claim data
    claim_data = webapp_data.get('claim', {}).get('extractedData', {})
    line_items_data = claim_data.get('lineItems', [])
    
    line_items = []
    for item_data in line_items_data:
        line_item = LineItem(
            line_number=str(item_data.get('line_number', '')),
            description=item_data.get('description', ''),
            quantity=float(item_data.get('quantity', 0)),
            unit=item_data.get('unit', ''),
            unit_price=float(item_data.get('unit_price', 0)),
            RCV=float(item_data.get('RCV', 0)),
            age_life=item_data.get('age_life', ''),
            condition=item_data.get('condition', ''),
            dep_percent=item_data.get('dep_percent'),
            depreciation_amount=float(item_data.get('depreciation_amount', 0)),
            ACV=float(item_data.get('ACV', 0)),
            location_room=item_data.get('location_room'),
            category=item_data.get('category', ''),
            page_number=int(item_data.get('page_number', 1))
        )
        line_items.append(line_item)
    
    # Extract roof measurements from roof report data
    roof_data = webapp_data.get('roofReport', {}).get('extractedData', {}).get('roofMeasurements', {})
    
    roof_measurements = RoofMeasurements(
        total_area=float(roof_data.get('totalArea', roof_data.get('total_area', 0))),
        net_area=float(roof_data.get('netArea', roof_data.get('net_area', 0))),
        gross_area=float(roof_data.get('grossArea', roof_data.get('gross_area', 0))),
        total_eaves_length=float(roof_data.get('eaveLength', roof_data.get('total_eaves_length', 0))),
        total_rakes_length=float(roof_data.get('rakeLength', roof_data.get('total_rakes_length', 0))),
        total_ridges_length=float(roof_data.get('ridgeLength', roof_data.get('total_ridges_length', 0))),
        total_hips_length=float(roof_data.get('hipLength', roof_data.get('total_hips_length', 0))),
        total_valleys_length=float(roof_data.get('valleyLength', roof_data.get('total_valleys_length', 0))),
        total_step_flashing_length=float(roof_data.get('stepFlashingLength', roof_data.get('total_step_flashing_length', 0))),
        total_flashing_length=float(roof_data.get('flashingLength', roof_data.get('total_flashing_length', 0))),
        area_pitch_7_12=float(roof_data.get('areaPitch7_12', roof_data.get('area_pitch_7_12', 0))),
        area_pitch_8_12=float(roof_data.get('areaPitch8_12', roof_data.get('area_pitch_8_12', 0))),
        area_pitch_9_12=float(roof_data.get('areaPitch9_12', roof_data.get('area_pitch_9_12', 0))),
        area_pitch_10_12=float(roof_data.get('areaPitch10_12', roof_data.get('area_pitch_10_12', 0))),
        area_pitch_11_12=float(roof_data.get('areaPitch11_12', roof_data.get('area_pitch_11_12', 0))),
        area_pitch_12_12=float(roof_data.get('areaPitch12_12', roof_data.get('area_pitch_12_12', 0))),
        area_pitch_12_12_plus=float(roof_data.get('areaPitch12_12Plus', roof_data.get('area_pitch_12_12_plus', 0)))
    )
    
    return line_items, roof_measurements


def convert_engine_results_to_webapp_format(engine_results):
    """
    Convert engine results back to your web application format.
    
    Args:
        engine_results: Results from the roof adjustment engine
        
    Returns:
        Dictionary in web application format
    """
    
    # Convert adjusted line items back to webapp format
    adjusted_line_items = []
    for item_dict in engine_results['adjusted_line_items']:
        adjusted_line_items.append({
            'line_number': item_dict['line_number'],
            'description': item_dict['description'],
            'quantity': item_dict['quantity'],
            'unit': item_dict['unit'],
            'unit_price': item_dict['unit_price'],
            'RCV': item_dict['RCV'],
            'age_life': item_dict['age_life'],
            'condition': item_dict['condition'],
            'dep_percent': item_dict['dep_percent'],
            'depreciation_amount': item_dict['depreciation_amount'],
            'ACV': item_dict['ACV'],
            'location_room': item_dict['location_room'],
            'category': item_dict['category'],
            'page_number': item_dict['page_number']
        })
    
    # Create results in webapp format
    webapp_results = {
        'success': True,
        'data': {
            'claim': {
                'extractedData': {
                    'lineItems': adjusted_line_items,
                    'totals': {
                        'subtotal': sum(item['RCV'] for item in adjusted_line_items),
                        'tax': 0,
                        'total': sum(item['ACV'] for item in adjusted_line_items),
                        'overhead': 0,
                        'profit': 0
                    }
                }
            },
            'roofReport': {
                'extractedData': {
                    'roofMeasurements': engine_results['roof_measurements']
                }
            },
            'adjustmentResults': {
                'adjustments': engine_results['adjustment_results']['adjustments'],
                'additions': engine_results['adjustment_results']['additions'],
                'warnings': engine_results['adjustment_results']['warnings'],
                'summary': engine_results['adjustment_results']['summary']
            },
            'processingMode': 'rule_engine',
            'message': 'Processed using roof adjustment rule engine'
        }
    }
    
    return webapp_results


def process_claim_with_rule_engine(webapp_data):
    """
    Process a claim using the roof adjustment rule engine.
    
    Args:
        webapp_data: Data in your web application format
        
    Returns:
        Processed results in web application format
    """
    
    try:
        # Convert to engine format
        line_items, roof_measurements = convert_webapp_data_to_engine_format(webapp_data)
        
        # Process with engine
        engine = RoofAdjustmentEngine()
        engine_results = engine.process_claim(line_items, roof_measurements)
        
        # Convert back to webapp format
        webapp_results = convert_engine_results_to_webapp_format(engine_results)
        
        return webapp_results
        
    except Exception as e:
        return {
            'success': False,
            'error': f'Rule engine processing failed: {str(e)}',
            'data': None
        }


def main():
    """Example usage of the integration functions."""
    
    # Example webapp data structure (similar to what your app produces)
    example_webapp_data = {
        'claim': {
            'extractedData': {
                'lineItems': [
                    {
                        'line_number': '1',
                        'description': 'Remove 3 tab - 25 yr. composition shingle roofing incl. felt',
                        'quantity': 19.67,
                        'unit': 'SQ',
                        'unit_price': 65.04,
                        'RCV': 1279.34,
                        'age_life': '14/25 yrs',
                        'condition': 'Avg.',
                        'dep_percent': None,
                        'depreciation_amount': 0,
                        'ACV': 1279.34,
                        'location_room': 'Dwelling Roof',
                        'category': 'Roof',
                        'page_number': 1
                    }
                ]
            }
        },
        'roofReport': {
            'extractedData': {
                'roofMeasurements': {
                    'totalArea': 2500,
                    'eaveLength': 120,
                    'rakeLength': 80,
                    'ridgeLength': 40,
                    'hipLength': 20,
                    'valleyLength': 30,
                    'areaPitch7_12': 500,
                    'areaPitch8_12': 300,
                    'areaPitch9_12': 200
                }
            }
        }
    }
    
    print("Processing claim with rule engine...")
    results = process_claim_with_rule_engine(example_webapp_data)
    
    if results['success']:
        print("✅ Processing successful!")
        print(f"Adjustments made: {results['data']['adjustmentResults']['summary']['total_adjustments']}")
        print(f"Items added: {results['data']['adjustmentResults']['summary']['total_additions']}")
        print(f"Estimated savings: ${results['data']['adjustmentResults']['summary']['estimated_savings']:,.2f}")
    else:
        print(f"❌ Processing failed: {results['error']}")


if __name__ == '__main__':
    main()
