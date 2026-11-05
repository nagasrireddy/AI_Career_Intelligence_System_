# Testing report

Executed in the build environment on 2026-10-22 (Linux, Python 3.12.3, Node 22). Results below are copied from real runs.

## Summary
| Check | Command | Result |
|---|---|---|
| Backend tests | `cd backend && python -m pytest -q` | **34 passed**, 0 failed |
| Frontend tests | `cd frontend && npm test` | **26 passed** in 5 files, 0 failed |
| Frontend lint | `npm run lint` | 0 errors, 0 warnings |
| Frontend production build | `npm run build` | succeeded (Vite 6) |
| DB init + seed twice | `python -m app.db.seed` ×2 | 1st: 12 roles / 164 role-skills / 99 resources; 2nd: 0 created (idempotent) |
| Live smoke test (real uvicorn + fresh SQLite) | curl: health → register → login → upload DOCX → gap analysis → roadmap → dashboard → /docs | all succeeded (9 skills detected; Data Analyst score 51.2, 4/12 matched; 8-item roadmap) |

## Not executed (cannot claim they pass)
PowerShell scripts, shell scripts end-to-end, Docker/Compose, Windows/macOS runs, PostgreSQL, a real browser session, resource link checking. See `KNOWN_LIMITATIONS.md`.

## Coverage map
Backend: registration/login, password hashing, auth failures, expired token, protected endpoints, ownership (404 on every cross-user access), PDF/DOCX parsing, unsupported/empty/oversized/encrypted/blank files, skill extraction + ambiguity handling, normalization, manual correction surviving re-analysis, replace resume, scoring formula (exact values), partial matches, priorities, roadmap ordering/prerequisites/regeneration preserving progress, progress consistency rules, dashboard values from DB, role search/compare, seed idempotency, account deletion cascade (incl. files), rate limiting.
Frontend: login/register forms and validation, upload states (idle/invalid/uploading/error/success), skill-gap rendering, roadmap item status/progress/notes changes, empty/error/confirm/pagination states, 404 page, error-message mapping.

## Backend test log (`pytest -v`)
```
tests/test_auth.py::test_password_hashing_is_not_plaintext_and_verifies PASSED
tests/test_auth.py::test_register_login_me_and_no_hash_leak PASSED      
tests/test_auth.py::test_duplicate_email_rejected PASSED                
tests/test_auth.py::test_weak_password_and_invalid_email_rejected PASSED
tests/test_auth.py::test_login_failures PASSED                          
tests/test_auth.py::test_protected_endpoints_require_token PASSED       
tests/test_auth.py::test_expired_token_rejected PASSED                  
tests/test_auth.py::test_profile_update_and_target_role PASSED          
tests/test_auth.py::test_health_and_security_headers PASSED             
tests/test_authorization.py::test_users_cannot_access_each_others_records PASSED
tests/test_authorization.py::test_delete_account_removes_all_data PASSED
tests/test_authorization.py::test_rate_limit_on_auth PASSED             
tests/test_gap_roadmap.py::test_score_formula_exact PASSED              
tests/test_gap_roadmap.py::test_partial_match_and_priority_labels PASSED
tests/test_gap_roadmap.py::test_roadmap_prerequisite_order_and_no_owned_skills PASSED
tests/test_gap_roadmap.py::test_gap_api_and_history PASSED              
tests/test_gap_roadmap.py::test_roles_catalogue_search_compare PASSED   
tests/test_gap_roadmap.py::test_seed_is_idempotent PASSED               
tests/test_gap_roadmap.py::test_roadmap_generation_and_regeneration_preserves_progress PASSED
tests/test_gap_roadmap.py::test_roadmap_patch_delete PASSED             
tests/test_progress_dashboard.py::test_progress_status_pct_consistency PASSED
tests/test_progress_dashboard.py::test_dashboard_values_come_from_database PASSED
tests/test_progress_dashboard.py::test_progress_items_listing_filters PASSED
tests/test_resume_ai.py::test_normalization_aliases PASSED              
tests/test_resume_ai.py::test_skill_extraction_and_no_invention PASSED  
tests/test_resume_ai.py::test_ambiguous_short_tokens_not_false_positive PASSED
tests/test_resume_ai.py::test_section_split PASSED                      
tests/test_resume_ai.py::test_parse_pdf_and_docx PASSED                 
tests/test_resume_ai.py::test_validation_errors PASSED                  
tests/test_resume_ai.py::test_encrypted_and_blank_pdf_rejected PASSED   
tests/test_resume_ai.py::test_upload_flow_persists_and_lists PASSED     
tests/test_resume_ai.py::test_upload_rejections_via_api PASSED          
tests/test_resume_ai.py::test_manual_skill_correction_survives_reanalysis PASSED
tests/test_resume_ai.py::test_replace_resume_and_delete PASSED          
============================= 34 passed in 20.52s ==============================
```

## Frontend test log (`vitest --reporter=verbose`)
```
 ✓ src/test/AuthForms.test.jsx > Login form > shows validation errors for empty and invalid input
 ✓ src/test/AuthForms.test.jsx > Login form > submits credentials and shows a server error on failure
 ✓ src/test/AuthForms.test.jsx > Register form > validates password rules and confirmation
 ✓ src/test/AuthForms.test.jsx > Register form > requires a letter and a number
 ✓ src/test/AuthForms.test.jsx > Register form > registers then logs in on success, and shows duplicate-email errors
 ✓ src/test/AuthForms.test.jsx > Register form > shows the server error when the email already exists
 ✓ src/test/SkillGapView.test.jsx > SkillGapView > renders score, summary cards, formula explanation and lists
 ✓ src/test/SkillGapView.test.jsx > SkillGapView > ranks priority gaps in order
 ✓ src/test/SkillGapView.test.jsx > SkillGapView > shows friendly empty messages when nothing is missing
 ✓ src/test/states.test.jsx > shared states > EmptyState renders title, description and action
 ✓ src/test/states.test.jsx > shared states > ErrorState is announced and retry works
 ✓ src/test/states.test.jsx > shared states > ConfirmDialog confirms, cancels, and closes on Escape
 ✓ src/test/states.test.jsx > shared states > ProgressBar clamps values
 ✓ src/test/states.test.jsx > shared states > Pagination hides for one page and moves between pages
 ✓ src/test/states.test.jsx > shared states > NotFound page links home
 ✓ src/test/states.test.jsx > shared states > getErrorMessage maps API errors to friendly text
 ✓ src/test/RoadmapItemCard.test.jsx > RoadmapItemCard > renders item details and a safe external link
 ✓ src/test/RoadmapItemCard.test.jsx > RoadmapItemCard > calls onUpdate when the status changes
 ✓ src/test/RoadmapItemCard.test.jsx > RoadmapItemCard > calls onUpdate when progress changes and when notes are saved
 ✓ src/test/RoadmapItemCard.test.jsx > RoadmapItemCard > shows a completed state, hides the slider, and disables controls while busy
 ✓ src/test/RoadmapItemCard.test.jsx > RoadmapItemCard > shows a helpful fallback when no resource is available
 ✓ src/test/ResumeUploader.test.jsx > validateFile > accepts pdf/docx and rejects bad files
 ✓ src/test/ResumeUploader.test.jsx > ResumeUploader states > starts with the submit button disabled (idle state)
 ✓ src/test/ResumeUploader.test.jsx > ResumeUploader states > shows an error for an unsupported file and keeps submit disabled
 ✓ src/test/ResumeUploader.test.jsx > ResumeUploader states > shows loading while uploading, then calls onUploaded
 ✓ src/test/ResumeUploader.test.jsx > ResumeUploader states > shows the server error message when the upload fails
 Test Files  5 passed (5)
      Tests  26 passed (26)
```
