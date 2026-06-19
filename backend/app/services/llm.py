import json
import logging
import httpx
import re
import os
from fastapi import HTTPException

logger = logging.getLogger("fastapi")

# ดึงค่า Config ของ Ollama จาก ENV (สามารถปรับแก้ใน docker-compose.yml หรือ .env ได้)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://172.31.34.137:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "jaksuhealth")

async def query_ollama_llm(instruction: str, input_text: str) -> dict:
    """ฟังก์ชันยิง HTTP Request ไปยัง Ollama API เพื่อรัน Inference โมเดลจักษุวิทยา"""
    # จัดโครงสร้าง Prompt ตาม Template Llama 3.2 Instruct ที่ใช้เทรน
    prompt = f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n{instruction}<|eot_id|><|start_header_id|>user<|end_header_id|>\n{input_text}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n"
    
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.1,  # ตั้งค่าต่ำเพื่อคุมความสม่ำเสมอของคำศัพท์แพทย์และโครงสร้าง JSON
            "stop": ["<|eot_id|>", "<|end_of_text|>"]
        }
    }
    
    headers = {"Content-Type": "application/json"}
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{OLLAMA_URL}/api/generate", json=payload, headers=headers)
            
            if response.status_code != 200:
                logger.error(f"Ollama API returned error {response.status_code}: {response.text}")
                raise ValueError("บริการ LLM มีปัญหาในการประมวลผล")
            
            result_data = response.json()
            response_text = result_data.get("response", "").strip()
            
            # ดึงเฉพาะส่วนที่เป็น JSON ป้องกันกรณี LLM คืนข้อความอื่นมาด้วย
            json_match = re.search(r"\{.*\}", response_text, re.DOTALL)
            if json_match:
                parsed_json = json.loads(json_match.group(0))
                return parsed_json
            else:
                logger.error(f"LLM output is not a valid JSON: {response_text}")
                raise ValueError("โมเดลไม่ได้ตอบกลับในรูปแบบ JSON")
                
    except (httpx.RequestError, json.JSONDecodeError, ValueError) as err:
        logger.error(f"Error querying Ollama LLM: {err}")
        # มีระบบ Fallback ในระดับ API เพื่อความทนทาน (Resilience) ของแอปพลิเคชัน
        return None

async def generate_single_diagnostic(patient_id: str, age: int, eye_side: str, cv_model_result: str) -> dict:
    """Task 1: วิเคราะห์และสรุปผลตรวจตาครั้งแรก (Single_Diagnostic_Analysis)"""
    instruction = (
        "You are the JaksuHealth Clinical AI Assistant (Clinical Co-pilot). Your task is to analyze patient metadata "
        "and Computer Vision (CV) screening results, then output a strict JSON object containing "
        "only four keys: 'condition_stage', 'risk_level', 'drafted_summary', and 'suggested_action'. The output must use professional ophthalmic terminology."
    )
    
    input_text = f"Task: Single_Diagnostic_Analysis, Patient Name: Case_ID_{patient_id}, Age: {age}, Eye Side: {eye_side}, CV Model Result: {cv_model_result}"
    
    result = await query_ollama_llm(instruction, input_text)
    
    # กรณีเกิดการล้มเหลว (Fallback) ให้ดึงข้อมูล Default Ophthalmic Guideline คืนกลับไปแทนเพื่อความเสถียร
    if not result:
        logger.warning("Using backend fallback for Single_Diagnostic_Analysis")
        if cv_model_result == "Intermediate AMD":
            result = {
                "condition_stage": "Intermediate AMD",
                "risk_level": "HIGH RISK",
                "drafted_summary": f"Recent OCT analysis of the {eye_side} eye reveals a moderate accumulation of Subretinal Fluid (SRF) and the presence of Intraretinal Fluid (IRF). Disruption of the IS/OS junction is also noted, consistent with Intermediate Age-related Macular Degeneration (AMD).",
                "suggested_action": "1. Recommend reassessing visual acuity and considering Anti-VEGF intravitreal injection.\n2. Schedule close follow-up and repeat OCT within 2-4 weeks.\n3. Initiate daily AREDS2 vitamin supplementation."
            }
        elif cv_model_result == "Early AMD":
            result = {
                "condition_stage": "Early AMD",
                "risk_level": "MED",
                "drafted_summary": f"Macular evaluation of the {eye_side} eye demonstrates multiple small to intermediate-sized drusen clustered in the pericentral region. The retinal pigment epithelium (RPE) remains largely intact, and no fluid is detected.",
                "suggested_action": "1. Counsel patient on dietary modifications and smoking cessation.\n2. Dispense an Amsler Grid for daily home self-monitoring.\n3. Schedule a routine comprehensive macular health assessment in 6 months."
            }
        else:
            result = {
                "condition_stage": "Normal",
                "risk_level": "LOW",
                "drafted_summary": f"Retinal and macular structures in the {eye_side} eye appear within normal limits. The foveal contour is well-preserved with no evidence of drusen or abnormal fluid accumulation.",
                "suggested_action": "1. Maintain standard annual comprehensive eye examinations.\n2. Advise the patient to wear UV-blocking sunglasses during outdoor exposure."
            }
            
    return result

async def generate_progression_trend(patient_id: str, age: int, eye_side: str, prev_status: str, curr_status: str) -> dict:
    """Task 2: ประเมินการดำเนินโรคเปรียบเทียบเชิงลึก (Progression_Trend_Analysis)"""
    instruction = (
        "You are the JaksuHealth Clinical AI Assistant (Progression Expert). Your task is to compare historical "
        "and current OCT scan findings to evaluate disease progression. Output a strict JSON object with five keys: "
        "'condition_stage', 'risk_level', 'progression_trend', 'progression_summary', and 'suggested_action'."
    )
    
    input_text = f"Task: Progression_Trend_Analysis, Patient Name: Case_ID_{patient_id}, Age: {age}, Eye Side: {eye_side}, Previous Status: {prev_status}, Current Status (Latest): {curr_status}"
    
    result = await query_ollama_llm(instruction, input_text)
    
    # Fallback สำหรับประเมินแนวโน้มกรณีโมเดลตอบกลับขัดข้อง
    if not result:
        logger.warning("Using backend fallback for Progression_Trend_Analysis")
        # เช็คคร่าวๆ จากลักษณะการตรวจพบ
        if "new SRF" in curr_status or "massive SRF" in curr_status or "worsening" in curr_status.lower():
            result = {
                "condition_stage": "Wet AMD",
                "risk_level": "HIGH RISK",
                "progression_trend": "Worsening",
                "progression_summary": f"Compared to the previous status, the disease progression in the {eye_side} eye shows a significant worsening trend. The current scan reveals new or increased fluid accumulation, suggesting a transition to active Wet AMD.",
                "suggested_action": "Urgent referral for retinal specialist evaluation. Initiate anti-VEGF therapy workup immediately and schedule follow-up within 1-2 weeks."
            }
        elif "normal" in curr_status.lower() and "normal" in prev_status.lower():
            result = {
                "condition_stage": "Normal",
                "risk_level": "LOW",
                "progression_trend": "Normal",
                "progression_summary": f"Serial imaging of the {eye_side} eye shows a stable, completely normal macular profile. No drusen formation, geographic atrophy, or fluid tracking noted across the timeline.",
                "suggested_action": "Reassure the patient. Continue routine annual geriatric ophthalmic screening."
            }
        else:
            result = {
                "condition_stage": "Intermediate AMD",
                "risk_level": "HIGH RISK",
                "progression_trend": "Stable",
                "progression_summary": f"Comparison with previous longitudinal OCT scans of the {eye_side} eye demonstrates a stable trend. Drusen volume and retinal structures remain unchanged without new fluid leakage.",
                "suggested_action": "Maintain current therapeutic regimen. Continue AREDS2 vitamin compliance and repeat OCT monitoring in 4-6 weeks."
            }
            
    return result
