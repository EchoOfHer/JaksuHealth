import os
import json
import time
import asyncio
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path=env_path)

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    print('Error: GEMINI_API_KEY not found in .env')
    exit(1)

client = genai.Client(api_key=GEMINI_API_KEY)

class SingleDiagnosticSchema(BaseModel):
    condition_stage: str
    risk_level: str
    ai_trend: str
    drafted_summary: str
    suggested_action: str

class ProgressionSchema(BaseModel):
    condition_stage: str
    risk_level: str
    progression_trend: str
    progression_summary: str
    suggested_action: str

def get_system_instruction(task_type: str) -> str:
    if task_type == 'SingleDiagnostic':
        return 'You are an expert AI Ophthalmologist analyzing an Optical Coherence Tomography (OCT) scan.\nYour task is to review the quantitative pixel data for macular lesions (Drusen, SRF, IRF, SHRM) and IS/OS disruption.\nGenerate a structured clinical report in JSON format following the provided schema.\nAlways provide realistic, medically accurate summaries and actionable suggestions.'
    else:
        return 'You are an expert AI Ophthalmologist analyzing the progression of AMD between two Optical Coherence Tomography (OCT) scans.\nCompare the previous status to the current status based on the provided quantitative pixel data.\nGenerate a structured progression report in JSON format following the provided schema.\nDetermine if the disease is Stable, Improving, or Worsening, and provide a clear clinical summary.'

async def call_gemini(instruction: str, prompt: str, schema: type[BaseModel]):
    max_retries = 10
    models = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.5-pro']
    
    for attempt in range(max_retries):
        for model in models:
            try:
                print(f'Calling {model}...')
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=instruction,
                        response_mime_type='application/json',
                        response_schema=schema,
                        temperature=0.2,
                    )
                )
                return json.loads(response.text)
            except Exception as e:
                err_str = str(e)
                if '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str:
                    print(f'[{model}] Rate limit exceeded. Trying next model...')
                    continue
                else:
                    print(f'[{model}] Error: {e}')
                    continue
        
        wait_time = 20 + (attempt * 5)
        print(f'All models failed. Waiting {wait_time} seconds before retrying...')
        time.sleep(wait_time)
        
    print('Failed to get response after all retries.')
    return None

data_combinations = [
    # ---- KHANATIP OS ----
    {'patient': 'P-2605-016', 'eye': 'OS', 'type': 'single', 'key': 'latest_2026-05-22', 'prompt': 'Patient: P-2605-016\nAge: 65\nEye Side: OS\nDrusen: 1200px, SRF: 53792px, IRF: 12194px, SHRM: 0px, IS/OS: 79459px\nWrite a clinical summary.'},
    {'patient': 'P-2605-016', 'eye': 'OS', 'type': 'single', 'key': 'previous_2024-01-15', 'prompt': 'Patient: P-2605-016\nAge: 65\nEye Side: OS\nDrusen: 600px, SRF: 0px, IRF: 0px, SHRM: 0px, IS/OS: 0px\nWrite a clinical summary.'},
    {'patient': 'P-2605-016', 'eye': 'OS', 'type': 'single', 'key': 'baseline_2023-07-22', 'prompt': 'Patient: P-2605-016\nAge: 65\nEye Side: OS\nDrusen: 0px, SRF: 0px, IRF: 0px, SHRM: 0px, IS/OS: 0px\nWrite a clinical summary.'},
    {'patient': 'P-2605-016', 'eye': 'OS', 'type': 'progression', 'key': 'latest_vs_previous', 'prompt': 'Compare Previous: Drusen: 600px, SRF: 0px, IRF: 0px, SHRM: 0px, IS/OS: 0px\nto Current: Drusen: 1200px, SRF: 53792px, IRF: 12194px, SHRM: 0px, IS/OS: 79459px'},
    {'patient': 'P-2605-016', 'eye': 'OS', 'type': 'progression', 'key': 'latest_vs_baseline', 'prompt': 'Compare Baseline: Drusen: 0px, SRF: 0px, IRF: 0px, SHRM: 0px, IS/OS: 0px\nto Current: Drusen: 1200px, SRF: 53792px, IRF: 12194px, SHRM: 0px, IS/OS: 79459px'},
    {'patient': 'P-2605-016', 'eye': 'OS', 'type': 'progression', 'key': 'previous_vs_baseline', 'prompt': 'Compare Baseline: Drusen: 0px, SRF: 0px, IRF: 0px, SHRM: 0px, IS/OS: 0px\nto Current: Drusen: 600px, SRF: 0px, IRF: 0px, SHRM: 0px, IS/OS: 0px'},

    # ---- KHANATIP OD ----
    {'patient': 'P-2605-016', 'eye': 'OD', 'type': 'single', 'key': 'latest_2026-05-22', 'prompt': 'Patient: P-2605-016\nAge: 65\nEye Side: OD\nDrusen: 450px, SRF: 11305px, IRF: 31689px, SHRM: 0px, IS/OS: 23098px\nWrite a clinical summary.'},
    {'patient': 'P-2605-016', 'eye': 'OD', 'type': 'single', 'key': 'baseline_2024-01-15', 'prompt': 'Patient: P-2605-016\nAge: 65\nEye Side: OD\nDrusen: 0px, SRF: 0px, IRF: 0px, SHRM: 0px, IS/OS: 0px\nWrite a clinical summary.'},
    {'patient': 'P-2605-016', 'eye': 'OD', 'type': 'progression', 'key': 'latest_vs_baseline', 'prompt': 'Compare Baseline: Drusen: 0px, SRF: 0px, IRF: 0px, SHRM: 0px, IS/OS: 0px\nto Current: Drusen: 450px, SRF: 11305px, IRF: 31689px, SHRM: 0px, IS/OS: 23098px'},

    # ---- JIRAWAT OS ----
    {'patient': 'P-2605-012', 'eye': 'OS', 'type': 'single', 'key': 'latest_2026-05-18', 'prompt': 'Patient: P-2605-012\nAge: 65\nEye Side: OS\nDrusen: 350px, SRF: 27055px, IRF: 478400px, SHRM: 925px, IS/OS: 112203px\nWrite a clinical summary.'},
    {'patient': 'P-2605-012', 'eye': 'OS', 'type': 'single', 'key': 'previous_2023-12-10', 'prompt': 'Patient: P-2605-012\nAge: 65\nEye Side: OS\nDrusen: 150px, SRF: 0px, IRF: 0px, SHRM: 0px, IS/OS: 0px\nWrite a clinical summary.'},
    {'patient': 'P-2605-012', 'eye': 'OS', 'type': 'single', 'key': 'baseline_2023-10-05', 'prompt': 'Patient: P-2605-012\nAge: 65\nEye Side: OS\nDrusen: 0px, SRF: 0px, IRF: 0px, SHRM: 0px, IS/OS: 0px\nWrite a clinical summary.'},
    {'patient': 'P-2605-012', 'eye': 'OS', 'type': 'progression', 'key': 'latest_vs_previous', 'prompt': 'Compare Previous: Drusen: 150px, SRF: 0px, IRF: 0px, SHRM: 0px, IS/OS: 0px\nto Current: Drusen: 350px, SRF: 27055px, IRF: 478400px, SHRM: 925px, IS/OS: 112203px'},
    {'patient': 'P-2605-012', 'eye': 'OS', 'type': 'progression', 'key': 'latest_vs_baseline', 'prompt': 'Compare Baseline: Drusen: 0px, SRF: 0px, IRF: 0px, SHRM: 0px, IS/OS: 0px\nto Current: Drusen: 350px, SRF: 27055px, IRF: 478400px, SHRM: 925px, IS/OS: 112203px'},
    {'patient': 'P-2605-012', 'eye': 'OS', 'type': 'progression', 'key': 'previous_vs_baseline', 'prompt': 'Compare Baseline: Drusen: 0px, SRF: 0px, IRF: 0px, SHRM: 0px, IS/OS: 0px\nto Current: Drusen: 150px, SRF: 0px, IRF: 0px, SHRM: 0px, IS/OS: 0px'},

    # ---- JIRAWAT OD ----
    {'patient': 'P-2605-012', 'eye': 'OD', 'type': 'single', 'key': 'latest_2026-05-18', 'prompt': 'Patient: P-2605-012\nAge: 65\nEye Side: OD\nDrusen: 0px, SRF: 24408px, IRF: 25734px, SHRM: 6067px, IS/OS: 83358px\nWrite a clinical summary.'},
    {'patient': 'P-2605-012', 'eye': 'OD', 'type': 'single', 'key': 'baseline_2023-10-05', 'prompt': 'Patient: P-2605-012\nAge: 65\nEye Side: OD\nDrusen: 0px, SRF: 0px, IRF: 0px, SHRM: 0px, IS/OS: 0px\nWrite a clinical summary.'},
    {'patient': 'P-2605-012', 'eye': 'OD', 'type': 'progression', 'key': 'latest_vs_baseline', 'prompt': 'Compare Baseline: Drusen: 0px, SRF: 0px, IRF: 0px, SHRM: 0px, IS/OS: 0px\nto Current: Drusen: 0px, SRF: 24408px, IRF: 25734px, SHRM: 6067px, IS/OS: 83358px'},

    # ---- NATTHAWUT OS & OD ----
    {'patient': 'P-2605-037', 'eye': 'OS', 'type': 'single', 'key': 'latest_2026-05-12', 'prompt': 'Patient: P-2605-037\nAge: 65\nEye Side: OS\nDrusen: 0px, SRF: 0px, IRF: 0px, SHRM: 0px, IS/OS: 0px\nWrite a clinical summary.'},
    {'patient': 'P-2605-037', 'eye': 'OS', 'type': 'progression', 'key': 'latest_vs_baseline', 'prompt': 'Compare Baseline: Drusen: 0px, SRF: 0px, IRF: 0px, SHRM: 0px, IS/OS: 0px\nto Current: Drusen: 0px, SRF: 0px, IRF: 0px, SHRM: 0px, IS/OS: 0px'},
    
    {'patient': 'P-2605-037', 'eye': 'OD', 'type': 'single', 'key': 'latest_2026-05-12', 'prompt': 'Patient: P-2605-037\nAge: 65\nEye Side: OD\nDrusen: 0px, SRF: 0px, IRF: 0px, SHRM: 0px, IS/OS: 0px\nWrite a clinical summary.'},
    {'patient': 'P-2605-037', 'eye': 'OD', 'type': 'progression', 'key': 'latest_vs_baseline', 'prompt': 'Compare Baseline: Drusen: 0px, SRF: 0px, IRF: 0px, SHRM: 0px, IS/OS: 0px\nto Current: Drusen: 0px, SRF: 0px, IRF: 0px, SHRM: 0px, IS/OS: 0px'},
]

async def main():
    output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'JaksuHealth_Mock_Data_Generated.json')
    
    final_output = {
        'P-2605-016': {'OS': {'single_diagnostics': {}, 'progression_trends': {}}, 'OD': {'single_diagnostics': {}, 'progression_trends': {}}},
        'P-2605-012': {'OS': {'single_diagnostics': {}, 'progression_trends': {}}, 'OD': {'single_diagnostics': {}, 'progression_trends': {}}},
        'P-2605-037': {'OS': {'single_diagnostics': {}, 'progression_trends': {}}, 'OD': {'single_diagnostics': {}, 'progression_trends': {}}}
    }

    if os.path.exists(output_path):
        try:
            with open(output_path, 'r', encoding='utf-8') as f:
                saved_data = json.load(f)
                # Merge saved data
                for p_id in saved_data:
                    if p_id in final_output:
                        for eye in saved_data[p_id]:
                            if eye in final_output[p_id]:
                                final_output[p_id][eye]['single_diagnostics'].update(saved_data[p_id][eye].get('single_diagnostics', {}))
                                final_output[p_id][eye]['progression_trends'].update(saved_data[p_id][eye].get('progression_trends', {}))
            print("Loaded existing progress. Resuming...")
        except Exception as e:
            print("Failed to load existing progress:", e)

    print(f'Starting generation of {len(data_combinations)} items...')
    print(f'Results will be saved to: {output_path}')
    
    for i, item in enumerate(data_combinations):
        target_dict = 'single_diagnostics' if item['type'] == 'single' else 'progression_trends'
        # Check if already done
        if item['key'] in final_output[item['patient']][item['eye']][target_dict]:
            print(f'\n[{i+1}/{len(data_combinations)}] Skipping {item["patient"]} {item["eye"]} {item["type"]} {item["key"]} (Already generated)')
            continue

        print(f'\n[{i+1}/{len(data_combinations)}] Processing {item["patient"]} {item["eye"]} {item["type"]} {item["key"]}')
        
        schema = SingleDiagnosticSchema if item['type'] == 'single' else ProgressionSchema
        instruction = get_system_instruction('SingleDiagnostic' if item['type'] == 'single' else 'ProgressionTrend')
        
        result = await call_gemini(instruction, item['prompt'], schema)
        if result:
            final_output[item['patient']][item['eye']][target_dict][item['key']] = result
            print(f'Success. Saving progress...')
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(final_output, f, indent=2, ensure_ascii=False)
                
            time.sleep(2) 
        else:
            print('Failed to generate item.')

    print('\n[DONE] Finished generating all items. Ready to replace JaksuHealth_Mock_Data.json')

if __name__ == '__main__':
    asyncio.run(main())
