import json
import os
import re

MOCK_DATA_PATH = os.path.join(os.path.dirname(__file__), 'JaksuHealth_Mock_Data.json')

def load_mock_data():
    if os.path.exists(MOCK_DATA_PATH):
        with open(MOCK_DATA_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def get_visit_key_by_pixels(p_id: str, eye: str, drusen: int, irf: int) -> str:
    if '016' in p_id:
        if eye == 'OS':
            if drusen >= 1000: return 'latest'
            if drusen > 0: return 'previous'
            return 'baseline'
        elif eye == 'OD':
            if drusen > 0: return 'latest'
            return 'baseline'
    elif '012' in p_id:
        if eye == 'OS':
            if drusen >= 300: return 'latest'
            if drusen > 0: return 'previous'
            return 'baseline'
        elif eye == 'OD':
            if irf > 1000: return 'latest'
            return 'baseline'
    return 'latest'

async def generate_single_diagnostic(patient_id: str, age: int, eye_side: str, cv_model_result: str, drusen: int, srf: int, irf: int, shrm: int, is_os: int) -> dict:
    data = load_mock_data()
    
    short_id = patient_id
    if '016' in patient_id: short_id = 'P-2605-016'
    elif '012' in patient_id: short_id = 'P-2605-012'
    elif '037' in patient_id: short_id = 'P-2605-037'

    if short_id not in data or eye_side not in data[short_id]:
        return {'condition_stage': 'Unknown', 'risk_level': 'Low', 'ai_trend': 'Normal', 'drafted_summary': 'Data not found.', 'suggested_action': '-'}

    visit_type = get_visit_key_by_pixels(patient_id, eye_side, drusen, irf)
    if '037' in patient_id:
        visit_type = 'latest'

    single_diags = data[short_id][eye_side].get('single_diagnostics', {})
    
    matching_key = None
    for k in single_diags.keys():
        if k.startswith(visit_type):
            matching_key = k
            break
            
    if matching_key and matching_key in single_diags:
        return single_diags[matching_key]
        
    return {'condition_stage': 'Unknown', 'risk_level': 'Low', 'ai_trend': 'Normal', 'drafted_summary': 'Data not found.', 'suggested_action': '-'}

async def generate_progression_trend(patient_id: str, age: int, eye_side: str, prev_status: str, curr_status: str) -> dict:
    data = load_mock_data()
    
    short_id = patient_id
    if '016' in patient_id: short_id = 'P-2605-016'
    elif '012' in patient_id: short_id = 'P-2605-012'
    elif '037' in patient_id: short_id = 'P-2605-037'
    
    if short_id not in data or eye_side not in data[short_id]:
        return {'condition_stage': 'Unknown', 'risk_level': 'Low', 'progression_trend': 'Unknown', 'progression_summary': 'Data not found.', 'suggested_action': '-'}

    def extract_pixels(status_str):
        pixels = {'Drusen': 0, 'SRF': 0, 'IRF': 0, 'SHRM': 0, 'IS/OS': 0}
        for match in re.finditer(r'([A-Za-z/]+):\s*(\d+)px', status_str):
            key = match.group(1).upper()
            if key == 'DRUSEN': pixels['Drusen'] = int(match.group(2))
            elif key in pixels: pixels[key] = int(match.group(2))
        return pixels

    def get_visit_type(status_str, force_fallback=None):
        if "2023" in status_str:
            if "Jul" in status_str or "Oct" in status_str:
                return "baseline"
            return "previous"
        if "2024" in status_str:
            return "previous"
        if "2026" in status_str:
            return "latest"
        
        # Fallback if dates are identical or missing
        return force_fallback

    prev = extract_pixels(prev_status)
    curr = extract_pixels(curr_status)
    
    v1_type = get_visit_type(curr_status, force_fallback="latest") or get_visit_key_by_pixels(patient_id, eye_side, curr['Drusen'], curr['IRF'])
    v2_type = get_visit_type(prev_status, force_fallback="baseline") or get_visit_key_by_pixels(patient_id, eye_side, prev['Drusen'], prev['IRF'])
    
    # Ensure they aren't identical mapping
    if v1_type == v2_type:
        v1_type = "latest"
        v2_type = "baseline"
    
    if '037' in patient_id:
        trend_key = 'latest_vs_baseline'
    else:
        trend_key = f'{v1_type}_vs_{v2_type}'
        
    prog_trends = data[short_id][eye_side].get('progression_trends', {})
    if trend_key in prog_trends:
        return prog_trends[trend_key]
        
    rev_key = f'{v2_type}_vs_{v1_type}'
    if rev_key in prog_trends:
        return prog_trends[rev_key]

    return {'condition_stage': 'Unknown', 'risk_level': 'Low', 'progression_trend': 'Unknown', 'progression_summary': f'Could not map trend {trend_key}', 'suggested_action': '-'}

