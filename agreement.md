================================================================================
  GIT RULES — Team Standards
================================================================================

BRANCH NAMING
─────────────────────────────────────────────────────────────────────────────

Format:
  type/ticket-id_short-description

Examples:
  feat/CV-12_add-yolo-detector
  fix/LLM-7_fix-token-overflow
  chore/WEB-3_upgrade-deps

Branch types:
  feat        ฟีเจอร์ใหม่
  fix         แก้บัค
  chore       งาน maintenance ไม่เกี่ยวกับ logic
  refactor    ปรับโครงสร้างโค้ดโดยไม่เปลี่ยน behavior
  experiment  ทดลอง model หรือ approach ใหม่ (สำหรับ CV/LLM)


COMMIT MESSAGE FORMAT  (Conventional Commits)
─────────────────────────────────────────────────────────────────────────────

Format:
  type(scope): short description

  [optional body — อธิบายว่าทำไม ไม่ใช่ทำอะไร]
  [optional footer — ref ticket / breaking change]

Good examples:
  feat(cv): add person re-identification model
  fix(llm): handle empty token response from OpenAI
  chore(web): upgrade Next.js to 14.2
  refactor(api): split inference route into service layer

Bad examples (ห้ามใช้):
  fix bug
  update
  WIP
  asdfgh

Rules:
  - Subject ไม่เกิน 72 ตัวอักษร
  - ใช้ present tense: "add" ไม่ใช่ "added"
  - 1 commit = 1 เรื่อง อย่ายัดหลายเรื่องใน commit เดียว
  - Experiment / WIP commit ให้ใส่ prefix [WIP] และ squash ก่อน PR


GIT RULES (ข้อบังคับ)
─────────────────────────────────────────────────────────────────────────────

  [1]  ห้าม push ตรง main — ต้องผ่าน PR เสมอ
  [2]  PR ต้องมีคนรีวิวอย่างน้อย 1 คน ก่อน merge
  [3]  ใช้ "Squash and merge" เพื่อให้ history สะอาด
  [4]  ก่อนเปิด PR ให้ rebase กับ main ล่าสุดก่อนเสมอ
  [5]  ลบ branch หลัง merge แล้วทุกครั้ง
  [6]  ห้าม commit .env หรือ credentials ลง repo ทุกกรณี


WORKFLOW SUMMARY
─────────────────────────────────────────────────────────────────────────────

  1. สร้าง branch จาก main
       git checkout -b feat/CV-12_add-yolo-detector

  2. ทำงาน + commit ตาม format
       git commit -m "feat(cv): add yolo detector base class"

  3. rebase กับ main ก่อนเปิด PR
       git fetch origin
       git rebase origin/main

  4. เปิด PR → ขอ review 1 คน → Squash and merge

  5. ลบ branch หลัง merge
       git branch -d feat/CV-12_add-yolo-detector


================================================================================