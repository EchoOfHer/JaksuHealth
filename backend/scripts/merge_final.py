import json

existing_file = r'D:\JaksuHealth\backend\JaksuHealth_Mock_Data_Generated.json'
final_file = r'D:\JaksuHealth\backend\app\services\JaksuHealth_Mock_Data.json'

chatgpt_data = {
  'Item 13': {
    'condition_stage': 'Active Wet AMD',
    'risk_level': 'High',
    'progression_trend': 'Severe Worsening',
    'progression_summary': 'Drastic disease progression. Transitioned from early AMD to active exudative disease with massive intraretinal and subretinal fluid accumulation, newly formed subretinal hyperreflective material, and severe disruption of the IS/OS junction.',
    'suggested_action': 'Emergency referral to a retina specialist for immediate anti-VEGF therapy.'
  },
  'Item 14': {
    'condition_stage': 'Active Wet AMD',
    'risk_level': 'High',
    'progression_trend': 'Severe Worsening',
    'progression_summary': 'Severe deterioration from a normal baseline. Scan now demonstrates widespread pathological changes including extensive intraretinal and subretinal fluid, drusen, subretinal hyperreflective material, and marked IS/OS junction disruption.',
    'suggested_action': 'Urgent retinal consultation and initiation of anti-VEGF treatment protocol.'
  },
  'Item 15': {
    'condition_stage': 'Early/Intermediate AMD',
    'risk_level': 'Medium',
    'progression_trend': 'Mild Progression',
    'progression_summary': 'Mild progression from baseline with the new appearance of drusen. There is no evidence of fluid accumulation or structural disruption.',
    'suggested_action': 'Routine monitoring in 6 months and consider AREDS2 supplementation.'
  },
  'Item 16': {
    'condition_stage': 'Active Wet AMD',
    'risk_level': 'High',
    'ai_trend': 'Critical',
    'drafted_summary': 'Significant subretinal and intraretinal fluid detected. Subretinal hyperreflective material is present alongside marked disruption of the IS/OS junction.',
    'suggested_action': 'Urgent referral to ophthalmology for evaluation and potential anti-VEGF injection.'
  },
  'Item 17': {
    'condition_stage': 'Normal',
    'risk_level': 'Low',
    'ai_trend': 'Stable',
    'drafted_summary': 'Normal macular architecture. No evidence of drusen, fluid accumulation, or disruption of the IS/OS junction.',
    'suggested_action': 'Routine annual eye examination.'
  },
  'Item 18': {
    'condition_stage': 'Active Wet AMD',
    'risk_level': 'High',
    'progression_trend': 'Significant Worsening',
    'progression_summary': 'Rapid pathological progression from a normal baseline. The current scan reveals substantial intraretinal and subretinal fluid, hyperreflective material, and IS/OS layer disruption.',
    'suggested_action': 'Immediate clinical management required to address active fluid leakage.'
  },
  'Item 19': {
    'condition_stage': 'Normal',
    'risk_level': 'Low',
    'ai_trend': 'Stable',
    'drafted_summary': 'Retinal layers are perfectly intact with no pathological lesions. No subretinal or intraretinal fluid, drusen, or structural anomalies detected.',
    'suggested_action': 'Continue with regular annual screenings.'
  },
  'Item 20': {
    'condition_stage': 'Normal',
    'risk_level': 'Low',
    'progression_trend': 'Stable',
    'progression_summary': 'No pathological changes observed over time. The macular structure remains completely stable and healthy.',
    'suggested_action': 'Maintain routine annual follow-up.'
  },
  'Item 21': {
    'condition_stage': 'Normal',
    'risk_level': 'Low',
    'ai_trend': 'Stable',
    'drafted_summary': 'Normal OCT scan. Free of drusen, intraretinal fluid, and subretinal fluid. The IS/OS junction is well preserved.',
    'suggested_action': 'Routine preventive eye care.'
  },
  'Item 22': {
    'condition_stage': 'Normal',
    'risk_level': 'Low',
    'progression_trend': 'Stable',
    'progression_summary': 'Stable findings with no evidence of disease progression. Retinal anatomy remains perfectly intact since the baseline scan.',
    'suggested_action': 'Routine annual monitoring.'
  }
}

mapping = {
    'Item 13': ('P-2605-012', 'OS', 'progression_trends', 'latest_vs_previous'),
    'Item 14': ('P-2605-012', 'OS', 'progression_trends', 'latest_vs_baseline'),
    'Item 15': ('P-2605-012', 'OS', 'progression_trends', 'previous_vs_baseline'),
    'Item 16': ('P-2605-012', 'OD', 'single_diagnostics', 'latest_2026-05-18'),
    'Item 17': ('P-2605-012', 'OD', 'single_diagnostics', 'baseline_2023-10-05'),
    'Item 18': ('P-2605-012', 'OD', 'progression_trends', 'latest_vs_baseline'),
    'Item 19': ('P-2605-037', 'OS', 'single_diagnostics', 'latest_2026-05-12'),
    'Item 20': ('P-2605-037', 'OS', 'progression_trends', 'latest_vs_baseline'),
    'Item 21': ('P-2605-037', 'OD', 'single_diagnostics', 'latest_2026-05-12'),
    'Item 22': ('P-2605-037', 'OD', 'progression_trends', 'latest_vs_baseline'),
}

with open(existing_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

for item_key, item_data in chatgpt_data.items():
    patient, eye, category, key = mapping[item_key]
    data[patient][eye][category][key] = item_data

with open(final_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print('Merged successfully to', final_file)
